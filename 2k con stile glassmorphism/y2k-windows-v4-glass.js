/**
 * Y2K × GLASS FLOATING WINDOWS — Giappone 2027  ·  v4
 *
 * Stile aggiornato: frosted glass + neon pink + bordo iridescente
 * sulla titlebar. Logica invariata (drag, resize, multi-finestra).
 *
 * HOW TO USE:
 * <script src="./y2k-windows.js"></script>
 */

(function() {
  'use strict';

  console.log('%c[Y2K-GLASS] Floating windows loaded', 'background:linear-gradient(90deg,#FF1493,#9D4EDD);color:#fff;padding:4px 10px;border-radius:4px;font-weight:700');

  /* ── CSS FINESTRE GLASS ────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=Share+Tech+Mono&display=swap');

    .y2k-win {
      position: fixed;
      background: rgba(20, 15, 50, 0.55);
      backdrop-filter: blur(22px) saturate(170%);
      -webkit-backdrop-filter: blur(22px) saturate(170%);
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      border-radius: 16px;
      box-shadow:
        0 12px 48px rgba(255, 20, 147, 0.35),
        0 0 30px rgba(0, 212, 255, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.45);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2000;
      min-width: 280px;
      min-height: 200px;
      max-height: 80vh;
      width: 360px;
      font-family: 'Share Tech Mono', 'Courier New', monospace;
      color: #fff;
    }

    /* Bordo iridescente animato in alto */
    .y2k-win::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg,
        #FF1493 0%, #FFD700 25%, #00FF88 50%,
        #00D4FF 75%, #9D4EDD 100%);
      background-size: 200% 100%;
      animation: y2kIridescent 3s linear infinite;
      border-radius: 16px 16px 0 0;
      z-index: 2;
    }

    @keyframes y2kIridescent {
      0%   { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }

    .y2k-win-title {
      background: linear-gradient(180deg,
        rgba(255, 20, 147, 0.85) 0%,
        rgba(157, 78, 221, 0.75) 100%);
      backdrop-filter: blur(8px);
      padding: 9px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
    }

    .y2k-win-title span {
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      font-family: 'Comic Neue', 'Comic Sans MS', cursive;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      letter-spacing: -0.2px;
    }

    .y2k-win-close {
      width: 26px;
      height: 26px;
      background: rgba(255, 255, 255, 0.20);
      backdrop-filter: blur(8px);
      border: 1.5px solid #00FF88;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
      box-shadow:
        0 0 12px rgba(0, 255, 136, 0.55),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
      transition: all 0.15s ease;
      padding: 0;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .y2k-win-close:hover {
      box-shadow:
        0 0 18px rgba(0, 255, 136, 0.85),
        inset 0 1px 0 rgba(255, 255, 255, 0.5);
      transform: scale(1.1);
      background: rgba(255, 255, 255, 0.30);
    }

    .y2k-win-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 14px 16px;
      color: #fff;
      -webkit-overflow-scrolling: touch;
    }

    .y2k-win-body::-webkit-scrollbar { width: 8px; }
    .y2k-win-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.06);
      border-radius: 8px;
    }
    .y2k-win-body::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #FF1493, #9D4EDD);
      border-radius: 8px;
    }

    .y2k-win-resize {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 22px;
      height: 22px;
      cursor: se-resize;
      background:
        linear-gradient(135deg, transparent 50%, rgba(255, 20, 147, 0.85) 50%);
      border-radius: 0 0 14px 0;
      z-index: 10;
      touch-action: none;
      box-shadow: -1px -1px 0 rgba(255, 255, 255, 0.2) inset;
    }

    /* Animazione apertura */
    @keyframes y2kWinIn {
      from { opacity: 0; transform: translate(-50%, -48%) scale(0.88); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    .y2k-win { animation: y2kWinIn 0.32s cubic-bezier(0.34,1.56,0.64,1); }

    /* ── Contenuto sheet dentro la finestra glass ──────────────── */
    .y2k-win-body .sheet-handle,
    .y2k-win-body .sheet-header { display: none !important; }
    .y2k-win-body .sheet-body { padding: 0 !important; }

    .y2k-win-body h2,
    .y2k-win-body h3,
    .y2k-win-body h4 {
      color: #fff !important;
      text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4) !important;
    }
    .y2k-win-body .section h3 {
      color: #00D4FF !important;
      font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
      font-size: 12px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.10em !important;
      text-shadow: 0 0 10px rgba(0, 212, 255, 0.5) !important;
    }
    .y2k-win-body .section p,
    .y2k-win-body p { color: rgba(255, 255, 255, 0.92) !important; }

    .y2k-win-body .poi-row {
      background: rgba(255, 255, 255, 0.10) !important;
      backdrop-filter: blur(10px) !important;
      border: 1.5px solid rgba(255, 255, 255, 0.20) !important;
      border-radius: 12px !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
    }
    .y2k-win-body .poi-row .name { color: #fff !important; }
    .y2k-win-body .poi-row .sub  { color: rgba(255, 255, 255, 0.65) !important; }
    .y2k-win-body .poi-row .icon {
      background: linear-gradient(135deg, #FF1493, #FF69B4) !important;
      box-shadow: 0 0 14px rgba(255, 20, 147, 0.45),
                  inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
    }

    .y2k-win-body .btn {
      background: rgba(255, 255, 255, 0.16) !important;
      backdrop-filter: blur(10px) !important;
      border: 1.5px solid rgba(255, 255, 255, 0.25) !important;
      color: #fff !important;
      font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
    }
    .y2k-win-body .btn.primary {
      background: linear-gradient(135deg,
        rgba(255, 20, 147, 0.9), rgba(255, 105, 180, 0.9)) !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      box-shadow: 0 0 18px rgba(255, 20, 147, 0.45),
                  inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
    }

    /* Tag dentro le finestre glass */
    .y2k-win-body .tag {
      background: rgba(255, 255, 255, 0.16) !important;
      border: 1px solid rgba(255, 255, 255, 0.25) !important;
      color: #fff !important;
    }
    .y2k-win-body .tag.cat {
      background: linear-gradient(135deg, #FF1493, #FF69B4) !important;
      box-shadow: 0 0 12px rgba(255, 20, 147, 0.4) !important;
    }
    .y2k-win-body .tag.gf-full {
      background: linear-gradient(135deg, rgba(0,255,136,0.9), rgba(0,212,255,0.7)) !important;
      color: #0F0A30 !important;
      box-shadow: 0 0 12px rgba(0, 255, 136, 0.4) !important;
    }
  `;
  document.head.appendChild(style);

  /* ── WINDOW MANAGER ─────────────────────────────────────────────── */
  const wins = {};
  let topZ = 2000;

  function openWin(id, title, html) {
    if (wins[id]) {
      wins[id].style.zIndex = ++topZ;
      return;
    }

    const win = document.createElement('div');
    win.className = 'y2k-win';
    win.id = 'y2kwin-' + id;

    const ox = (Math.random() - 0.5) * 80;
    const oy = (Math.random() - 0.5) * 60;
    win.style.left = `calc(50% + ${ox}px)`;
    win.style.top  = `calc(50% + ${oy}px)`;
    win.style.transform = 'translate(-50%, -50%)';
    win.style.zIndex = ++topZ;

    win.innerHTML = `
      <div class="y2k-win-title">
        <span>${title}</span>
        <button class="y2k-win-close" type="button">✕</button>
      </div>
      <div class="y2k-win-body">${html}</div>
      <div class="y2k-win-resize"></div>
    `;

    document.body.appendChild(win);
    wins[id] = win;
    updateMapBlur();

    win.addEventListener('mousedown', () => { win.style.zIndex = ++topZ; });
    win.addEventListener('touchstart', () => { win.style.zIndex = ++topZ; }, { passive: true });
    win.querySelector('.y2k-win-close').onclick = () => closeWin(id);

    makeDraggable(win, win.querySelector('.y2k-win-title'));
    makeResizable(win, win.querySelector('.y2k-win-resize'));
  }

  function closeWin(id) {
    const win = wins[id];
    if (!win) return;
    win.remove();
    delete wins[id];
    updateMapBlur();

    // Reset tab to map quando si chiude qualsiasi finestra
    const bottomNav = document.querySelector('nav.bottom');
    if (bottomNav) {
      bottomNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      const mapBtn = bottomNav.querySelector('button[data-view="map"]');
      if (mapBtn) mapBtn.classList.add('active');
    }
  }

  function closeAll() { Object.keys(wins).forEach(closeWin); }

  function updateMapBlur() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    const hasOpen = Object.keys(wins).length > 0;
    mapEl.classList.toggle('blur', hasOpen);
  }

  /* ── DRAG ───────────────────────────────────────────────────────── */
  function makeDraggable(win, handle) {
    let dragging = false, ox = 0, oy = 0;
    const start = (cx, cy) => {
      dragging = true;
      const r = win.getBoundingClientRect();
      ox = cx - r.left; oy = cy - r.top;
    };
    const move = (cx, cy) => {
      if (!dragging) return;
      win.style.left = (cx - ox) + 'px';
      win.style.top  = (cy - oy) + 'px';
      win.style.transform = 'none';
    };
    const end = () => { dragging = false; };

    handle.addEventListener('mousedown', e => { if (e.target.closest('.y2k-win-close')) return; start(e.clientX, e.clientY); });
    document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', e => { if (e.target.closest('.y2k-win-close')) return; start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    document.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    document.addEventListener('touchend', end);
  }

  /* ── RESIZE ─────────────────────────────────────────────────────── */
  function makeResizable(win, handle) {
    let resizing = false, sx = 0, sy = 0, sw = 0, sh = 0;
    const start = (cx, cy) => {
      resizing = true;
      sx = cx; sy = cy;
      sw = win.offsetWidth; sh = win.offsetHeight;
    };
    const move = (cx, cy) => {
      if (!resizing) return;
      win.style.width  = Math.max(280, sw + cx - sx) + 'px';
      win.style.height = Math.max(200, sh + cy - sy) + 'px';
    };
    const end = () => { resizing = false; };

    handle.addEventListener('mousedown', e => { e.preventDefault(); start(e.clientX, e.clientY); });
    document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    document.addEventListener('touchmove', e => { if (resizing) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    document.addEventListener('touchend', end);
  }

  /* ── INTERCETTA openSheet / closeSheet ───────────────────────────── */
  function patchSheets() {
    const origOpen  = window.openSheet;
    const origClose = window.closeSheet;

    if (typeof origOpen === 'function') {
      window.openSheet = function(title, html, onClose) {
        const id = title.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20) || 'win';
        openWin(id, title, html);
      };
    }
    if (typeof origClose === 'function') {
      window.closeSheet = function() {
        const last = Object.entries(wins).sort((a,b) => parseInt(b[1].style.zIndex) - parseInt(a[1].style.zIndex))[0];
        if (last) closeWin(last[0]);
      };
    }
    document.querySelectorAll('.sheet').forEach(s => { s.style.display = 'none'; });
  }

  window.y2kWindows = { open: openWin, close: closeWin, closeAll };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

  function waitForOpenSheet() {
    if (typeof window.openSheet === 'function') {
      patchSheets();
    } else {
      setTimeout(waitForOpenSheet, 100);
    }
  }
  waitForOpenSheet();

})();
