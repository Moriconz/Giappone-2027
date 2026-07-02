/**
 * PANEL MANAGER — Giappone 2027 (modern 2026)
 *
 * Storicamente "Y2K floating windows": ora un gestore di pannelli MODERNO.
 * Mantiene invariato il contratto pubblico usato in tutta l'app:
 *   - window.y2kWindows = { open, close, closeAll }
 *   - patch di window.openSheet / window.closeSheet
 *   - DOM: .y2k-win / .y2k-win-title / .y2k-win-body, id "y2kwin-<slug>"
 *   - eventi: document 'y2kwin_closed' { detail:{ id } }
 *   - window.activeTabView per attivare il bottone nav corretto
 *
 * Rendering: bottom-sheet su mobile, modal centrato su schermi larghi.
 * Niente drag/resize retro, niente glassmorphism pesante, niente debug spam.
 * Lo stile vero vive in css/modern-2026.css (.y2k-win*). Qui solo il minimo.
 */
(function () {
  'use strict';

  const DEBUG = !!window.DEBUG;
  const log = (...a) => { if (DEBUG) console.log('[Panels]', ...a); };

  const wins = {};       // id -> element
  const winViews = {};   // id -> dataView (per nav)
  let topZ = 2000;
  let backdrop = null;

  /* ── Backdrop condiviso ─────────────────────────────────────────── */
  function ensureBackdrop() {
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.className = 'panel-backdrop';
    backdrop.addEventListener('click', () => {
      // chiude il pannello frontmost
      const front = frontmostId();
      if (front) closeWin(front);
    });
    document.body.appendChild(backdrop);
    return backdrop;
  }
  function updateBackdrop() {
    const any = Object.keys(wins).length > 0;
    ensureBackdrop().classList.toggle('show', any);
    document.body.classList.toggle('panel-open', any);
  }
  function frontmostId() {
    let id = null, max = -Infinity;
    for (const [wid, el] of Object.entries(wins)) {
      const z = parseInt(el.style.zIndex) || 0;
      if (z > max) { max = z; id = wid; }
    }
    return id;
  }

  /* ── Apertura / aggiornamento pannello ──────────────────────────── */
  function openWin(id, title, html, dataView) {
    if (wins[id]) {
      const body = wins[id].querySelector('.y2k-win-body');
      if (body) body.innerHTML = html;
      wins[id].style.zIndex = ++topZ;
      activateNav(dataView || winViews[id]);
      return;
    }

    const win = document.createElement('div');
    win.className = 'y2k-win';
    win.id = 'y2kwin-' + id;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'true');
    win.style.zIndex = ++topZ;
    win.innerHTML =
      '<div class="y2k-win-title">' +
        '<span>' + (title || '') + '</span>' +
        '<button class="y2k-win-close" type="button" aria-label="Chiudi">✕</button>' +
      '</div>' +
      '<div class="y2k-win-body">' + html + '</div>';

    document.body.appendChild(win);
    wins[id] = win;
    winViews[id] = dataView;

    // Hide weather widget mentre un pannello è aperto
    const weather = document.getElementById('weather-floating');
    if (weather) weather.classList.remove('show');

    activateNav(dataView);
    updateMapBlur();
    updateBackdrop();

    // porta in primo piano al tocco
    const toFront = () => { win.style.zIndex = ++topZ; activateNav(winViews[id]); };
    win.addEventListener('mousedown', toFront);
    win.addEventListener('touchstart', toFront, { passive: true });

    win.querySelector('.y2k-win-close').addEventListener('click', () => closeWin(id));
    log('open', id);
  }

  function closeWin(id) {
    const win = wins[id];
    if (!win) return;
    delete wins[id];
    delete winViews[id];
    // Uscita animata (simmetrica all'entrata m-sheet-up, invertita via CSS):
    // rinominare l'id evita collisioni se l'utente riapre subito lo stesso pannello
    // mentre quello vecchio sta ancora sparendo. remove() dopo l'animazione;
    // il setTimeout è solo una rete di sicurezza se animationend non scatta.
    win.id = win.id + '-closing';
    win.classList.add('y2k-win-closing');
    const finish = () => win.remove();
    win.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 260);
    updateMapBlur();
    updateBackdrop();

    document.dispatchEvent(new CustomEvent('y2kwin_closed', { detail: { id } }));

    if (Object.keys(wins).length === 0) {
      window.activeTabView = 'map';
      const nav = document.querySelector('nav.bottom');
      if (nav) {
        nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        const mapBtn = nav.querySelector('button[data-view="map"]');
        if (mapBtn) mapBtn.classList.add('active');
      }
      const weather = document.getElementById('weather-floating');
      if (weather) weather.classList.add('show');
    } else {
      activateNav(winViews[frontmostId()]);
    }
    log('close', id);
  }

  function closeAll() { Object.keys(wins).forEach(closeWin); }

  function activateNav(view) {
    if (!view) return;
    const nav = document.querySelector('nav.bottom');
    if (!nav) return;
    nav.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
  }

  function updateMapBlur() {
    const mapEl = document.getElementById('map');
    if (mapEl) mapEl.classList.toggle('blur', Object.keys(wins).length > 0);
  }

  /* ── Patch openSheet / closeSheet ───────────────────────────────── */
  function patchSheets() {
    const origOpen = window.openSheet;
    if (typeof origOpen === 'function') {
      window.openSheet = function (title, html) {
        const id = String(title).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20) || 'win';
        // Single-panel mode: close any OTHER open panel first so navigating
        // between views (itinerario → GF → menu) replaces instead of stacking.
        Object.keys(wins).forEach(k => { if (k !== id) closeWin(k); });
        openWin(id, title, html, window.activeTabView || 'map');
      };
    }
    if (typeof window.closeSheet === 'function') {
      window.closeSheet = function () {
        const front = frontmostId();
        if (front) closeWin(front);
      };
    }
    // nasconde eventuali bottom-sheet native (sostituite dai pannelli)
    document.querySelectorAll('.sheet').forEach(s => { s.style.display = 'none'; });
  }

  // API globale (contratto invariato)
  window.y2kWindows = { open: openWin, close: closeWin, closeAll };

  // ESC chiude il pannello frontmost
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { const f = frontmostId(); if (f) closeWin(f); }
  });

  // patcha appena openSheet è definita
  (function wait() {
    if (typeof window.openSheet === 'function') patchSheets();
    else setTimeout(wait, 100);
  })();
})();
