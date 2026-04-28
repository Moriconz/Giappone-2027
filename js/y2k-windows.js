/**
 * Y2K FLOATING WINDOWS — Giappone 2027
 * 
 * Sostituisce le bottom sheet con finestre floating draggabili + resizable.
 * 
 * HOW TO USE:
 * Aggiungi nel tuo index.html prima di </body>, DOPO tutti gli altri script:
 * <script src="./y2k-windows.js"></script>
 * 
 * Non tocca nulla della struttura HTML o della logica JS esistente.
 * Intercetta openSheet() e closeSheet() e le converte in finestre floating.
 */

(function() {
  'use strict';

  /* ── CSS FINESTRE ──────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    .y2k-win {
      position: fixed;
      background: linear-gradient(180deg, #FFFACD, #FFF8DC);
      border: 3px solid #FF1493;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(255,20,147,0.4), 0 0 30px rgba(0,255,136,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2000;
      min-width: 260px;
      min-height: 180px;
      max-height: 80vh;
      width: 340px;
      font-family: 'Courier New', monospace;
    }

    .y2k-win::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #FF1493, #00FF88, #FFD700);
      border-radius: 12px 12px 0 0;
      z-index: 1;
    }

    .y2k-win-title {
      background: linear-gradient(90deg, #FF1493, #FF69B4);
      padding: 8px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    }

    .y2k-win-title span {
      color: white;
      font-size: 13px;
      font-weight: 700;
      font-family: 'Comic Sans MS', cursive;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .y2k-win-close {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #E0D5FF, #D8CCFF);
      border: 2px solid #00FF88;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #2D3B7D;
      box-shadow: 0 0 8px rgba(0,255,136,0.5);
      transition: all 0.15s;
      padding: 0;
      line-height: 1;
    }

    .y2k-win-close:hover {
      box-shadow: 0 0 16px rgba(0,255,136,0.8);
      transform: scale(1.15);
    }

    .y2k-win-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px;
      color: #2D3B7D;
      -webkit-overflow-scrolling: touch;
    }

    .y2k-win-body::-webkit-scrollbar { width: 10px; }
    .y2k-win-body::-webkit-scrollbar-track { background: #E0D5FF; border-radius: 10px; }
    .y2k-win-body::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#FF1493,#FF69B4); border-radius: 10px; }

    .y2k-win-resize {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: se-resize;
      background: linear-gradient(135deg, transparent 50%, #FF1493 50%);
      border-radius: 0 0 10px 0;
      z-index: 10;
      touch-action: none;
    }

    /* Animazione apertura */
    @keyframes y2kWinIn {
      from { opacity: 0; transform: translate(-50%, -48%) scale(0.88); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    .y2k-win { animation: y2kWinIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }

    /* Adatta contenuto sheet dentro la finestra */
    .y2k-win-body .sheet-handle { display: none !important; }
    .y2k-win-body .sheet-header { display: none !important; }
    .y2k-win-body .sheet-body { padding: 0 !important; }
    .y2k-win-body h2 { color: #2D3B7D !important; font-size: 15px !important; }
    .y2k-win-body .section h3 { color: #FF1493 !important; }
    .y2k-win-body .poi-row { background: linear-gradient(135deg,#E8F4FF,#F0EDFF) !important; border: 2px solid #00FF88 !important; color: #2D3B7D !important; }
    .y2k-win-body .poi-row .name { color: #2D3B7D !important; }
    .y2k-win-body .poi-row .sub { color: #555 !important; }
    .y2k-win-body .btn { background: linear-gradient(180deg,#E0D5FF,#F0E5FF) !important; border: 2px solid #E0D5FF !important; color: #2D3B7D !important; font-family: 'Courier New',monospace !important; }
    .y2k-win-body .btn.primary { background: linear-gradient(180deg,#FF1493,#FF69B4) !important; border-color: #00FF88 !important; color: white !important; }
  `;
  document.head.appendChild(style);

  /* ── WINDOW MANAGER ─────────────────────────────────────────────── */
  const wins = {};
  let topZ = 2000;

  function openWin(id, title, html) {
    // Se già aperta, porta in foreground
    if (wins[id]) {
      wins[id].style.zIndex = ++topZ;
      return;
    }

    const win = document.createElement('div');
    win.className = 'y2k-win';
    win.id = 'y2kwin-' + id;

    // Posizione centrata con offset casuale
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

    // Blur mappa
    updateMapBlur();

    // Porta in primo piano al click
    win.addEventListener('mousedown', () => { win.style.zIndex = ++topZ; });
    win.addEventListener('touchstart', () => { win.style.zIndex = ++topZ; }, { passive: true });

    // Close button
    win.querySelector('.y2k-win-close').onclick = () => closeWin(id);

    // Drag
    makeDraggable(win, win.querySelector('.y2k-win-title'));

    // Resize
    makeResizable(win, win.querySelector('.y2k-win-resize'));
  }

  function closeWin(id) {
    const win = wins[id];
    if (!win) return;
    win.remove();
    delete wins[id];
    updateMapBlur();
  }

  function closeAll() {
    Object.keys(wins).forEach(closeWin);
  }

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
      ox = cx - r.left;
      oy = cy - r.top;
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
      win.style.width  = Math.max(260, sw + cx - sx) + 'px';
      win.style.height = Math.max(180, sh + cy - sy) + 'px';
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
    // Attendi che openSheet sia definita
    const origOpen  = window.openSheet;
    const origClose = window.closeSheet;

    if (typeof origOpen === 'function') {
      window.openSheet = function(title, html, onClose) {
        // Genera id dall'iniziale del titolo
        const id = title.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20) || 'win';
        openWin(id, title, html);
      };
    }

    if (typeof origClose === 'function') {
      window.closeSheet = function() {
        // Chiude la finestra più recente (ultimo z-index)
        const last = Object.entries(wins).sort((a,b) => parseInt(b[1].style.zIndex) - parseInt(a[1].style.zIndex))[0];
        if (last) closeWin(last[0]);
      };
    }

    // Nascondi le sheet originali (nel caso siano già aperte)
    document.querySelectorAll('.sheet').forEach(s => {
      s.style.display = 'none';
    });
  }

  // Esponi API globale
  window.y2kWindows = { open: openWin, close: closeWin, closeAll };

  // Keyboard: ESC chiude l'ultima finestra
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });

  // Patcha dopo che tutto il DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchSheets);
  } else {
    // Aspetta un tick per dare tempo agli altri script di definire openSheet
    setTimeout(patchSheets, 100);
  }

})();
