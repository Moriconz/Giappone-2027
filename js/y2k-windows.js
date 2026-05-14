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

  console.log('%c[Y2K] Y2K-WINDOWS.JS LOADED', 'background: #FF1493; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
  console.log('[Y2K] document.readyState:', document.readyState);
  console.log('[Y2K] window.openSheet exists?', typeof window.openSheet);

  /* ── CSS FINESTRE — GLASSMORPHISM ──────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    .y2k-win {
      position: fixed;
      backdrop-filter: blur(20px);
      background: rgba(26, 31, 46, 0.6);
      border: 1px solid rgba(255, 107, 53, 0.2);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2000;
      min-width: 280px;
      min-height: 200px;
      max-height: 85vh;
      width: 90vw;
      max-width: 950px;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .y2k-win::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: rgba(255, 107, 53, 0.2);
      border-radius: 12px 12px 0 0;
      z-index: 1;
    }

    .y2k-win-title {
      backdrop-filter: blur(15px) !important;
      background: rgba(255, 107, 53, 0.1) !important;
      padding: 8px 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      cursor: move !important;
      user-select: none !important;
      flex-shrink: 0 !important;
      border-bottom: 1px solid rgba(255, 107, 53, 0.15) !important;
      gap: 12px !important;
    }

    .y2k-win-title span {
      color: #fff !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
      flex: 1 !important;
      padding-left: 10px !important;
      text-align: left !important;
    }

    .y2k-win-close {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      min-height: 28px !important;
      max-width: 28px !important;
      max-height: 28px !important;
      backdrop-filter: blur(8px) !important;
      background: rgba(239, 68, 68, 0.4) !important;
      border: none !important;
      border-radius: 50% !important;
      font-size: 16px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-weight: 700 !important;
      color: rgba(239, 68, 68, 1) !important;
      box-shadow: none !important;
      transition: all 0.15s ease !important;
      padding: 0 !important;
      margin: 0 !important;
      line-height: 1 !important;
      flex-shrink: 0 !important;
    }

    .y2k-win-close:hover {
      background: rgba(239, 68, 68, 0.6) !important;
    }

    .y2k-win-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 14px !important;
      color: #fff;
      -webkit-overflow-scrolling: touch;
      width: 100%;
      box-sizing: border-box !important;
    }

    /* Garantisce padding interno per elementi */
    .y2k-win-body > * {
      margin-bottom: 12px !important;
    }

    .y2k-win-body > *:last-child {
      margin-bottom: 0 !important;
    }

    /* Padding per elementi cliccabili */
    .y2k-win-body button,
    .y2k-win-body a,
    .y2k-win-body [role="button"] {
      padding: 10px 12px !important;
      margin: 6px 0 !important;
      display: block !important;
      width: 100% !important;
      text-align: left !important;
      box-sizing: border-box !important;
    }

    /* Padding per list items */
    .y2k-win-body li,
    .y2k-win-body .poi-row,
    .y2k-win-body .item,
    .y2k-win-body [class*="row"] {
      padding: 10px 12px !important;
      margin: 6px 0 !important;
      border-radius: 6px !important;
      box-sizing: border-box !important;
    }

    .y2k-win-body::-webkit-scrollbar { width: 10px; }
    .y2k-win-body::-webkit-scrollbar-track { background: rgba(255, 107, 53, 0.1); border-radius: 10px; }
    .y2k-win-body::-webkit-scrollbar-thumb { background: rgba(255, 107, 53, 0.4); border-radius: 10px; }

    .y2k-win-resize {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: se-resize;
      background: rgba(255, 107, 53, 0.25);
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

    /* Mobile: limita larghezza windows */
    @media (max-width: 480px) {
      .y2k-win {
        width: 90vw !important;
        max-width: 320px !important;
        max-height: 50vh !important;
        min-width: 280px !important;
      }

      .y2k-win-title span {
        font-size: 13px !important;
        font-weight: 700 !important;
      }

      .y2k-win-body {
        padding: 12px !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
      }

      .y2k-win-body h1 {
        font-size: 16px !important;
        line-height: 1.3 !important;
        margin-bottom: 10px !important;
      }
      .y2k-win-body h2 {
        font-size: 15px !important;
        line-height: 1.3 !important;
        margin-bottom: 8px !important;
      }
      .y2k-win-body h3 {
        font-size: 14px !important;
        line-height: 1.3 !important;
        margin-bottom: 6px !important;
      }
      .y2k-win-body p {
        line-height: 1.5 !important;
        margin-bottom: 10px !important;
      }
    }

    /* Sticky header per liste */
    .y2k-win-body [style*="position:sticky"] {
      position: sticky !important;
      top: 0 !important;
      z-index: 300 !important;
      backdrop-filter: blur(10px) !important;
      background: rgba(255, 107, 53, 0.1) !important;
      padding: 12px !important;
      border-bottom: 1px solid rgba(255, 107, 53, 0.2) !important;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2) !important;
    }

    /* Adatta contenuto sheet dentro la finestra */
    .y2k-win-body .sheet-handle { display: none !important; }
    .y2k-win-body .sheet-header { display: none !important; }
    .y2k-win-body .sheet-body { padding: 0 !important; color: #fff !important; }
    /* ══ TYPOGRAPHY ══════════════════════════════════── */
    .y2k-win-body h1 { color: #fff !important; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 18px !important; font-weight: 700 !important; }
    .y2k-win-body h2 { color: #fff !important; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 16px !important; font-weight: 700 !important; }
    .y2k-win-body h3 { color: rgba(255, 107, 53, 0.95) !important; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 14px !important; font-weight: 700 !important; }
    .y2k-win-body h4 { color: rgba(255, 107, 53, 0.9) !important; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 13px !important; font-weight: 700 !important; }
    .y2k-win-body p { color: rgba(255, 255, 255, 0.85) !important; line-height: 1.4 !important; }
    .y2k-win-body strong { color: #fff !important; font-weight: 700 !important; }
    .y2k-win-body label { color: rgba(255, 255, 255, 0.8) !important; }
    .y2k-win-body div { color: rgba(255, 255, 255, 0.85) !important; }
    .y2k-win-body span { color: rgba(255, 255, 255, 0.85) !important; }

    /* ══ SECTIONS ════════════════════════════════════ */
    .y2k-win-body .section {
      backdrop-filter: blur(15px) !important;
      background: rgba(255, 107, 53, 0.25) !important;
      border: 1px solid rgba(255, 107, 53, 0.4) !important;
      border-radius: 10px !important;
      padding: 14px !important;
      margin-bottom: 16px !important;
    }

    /* Override inline styles per renderli visibili */
    .y2k-win-body .section[style*="background:linear-gradient"] {
      backdrop-filter: blur(15px) !important;
      background: rgba(255, 107, 53, 0.25) !important;
      border: 1px solid rgba(255, 107, 53, 0.4) !important;
    }

    .y2k-win-body .section[style*="border:2px"] {
      backdrop-filter: blur(15px) !important;
      background: rgba(255, 107, 53, 0.25) !important;
      border: 1px solid rgba(255, 107, 53, 0.4) !important;
    }

    .y2k-win-body div[style*="background:linear-gradient"] {
      backdrop-filter: blur(15px) !important;
      background: rgba(255, 107, 53, 0.2) !important;
      border: 1px solid rgba(255, 107, 53, 0.3) !important;
      border-radius: 8px !important;
      padding: 12px !important;
    }

    .y2k-win-body div[style*="border:2px solid"] {
      backdrop-filter: blur(15px) !important;
      background: rgba(255, 107, 53, 0.25) !important;
      border: 1px solid rgba(255, 107, 53, 0.4) !important;
    }

    /* ══ BUTTONS ═════════════════════════════════════ */
    .y2k-win-body .btn {
      border-radius: 8px !important;
      padding: 10px 12px !important;
      font-weight: 600 !important;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      border: 1px solid !important;
    }
    .y2k-win-body .btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    }
    .y2k-win-body .btn.primary {
      backdrop-filter: blur(10px) !important;
      background: rgba(255, 107, 53, 0.35) !important;
      color: #fff !important;
      border-color: rgba(255, 107, 53, 0.6) !important;
      box-shadow: 0 0 12px rgba(255, 107, 53, 0.2) !important;
    }
    .y2k-win-body .btn.success {
      backdrop-filter: blur(10px) !important;
      background: rgba(0, 255, 136, 0.25) !important;
      color: #fff !important;
      border-color: rgba(0, 255, 136, 0.5) !important;
    }
    .y2k-win-body .btn.warning {
      backdrop-filter: blur(10px) !important;
      background: rgba(255, 215, 0, 0.25) !important;
      color: #fff !important;
      border-color: rgba(255, 215, 0, 0.5) !important;
    }
    .y2k-win-body .btn.danger {
      backdrop-filter: blur(10px) !important;
      background: rgba(255, 107, 53, 0.4) !important;
      color: #fff !important;
      border-color: rgba(255, 107, 53, 0.6) !important;
    }
    /* ══ FORM ELEMENTS ══════════════════════════════ */
    .y2k-win-body input[type="text"],
    .y2k-win-body input[type="number"],
    .y2k-win-body input[type="email"],
    .y2k-win-body input[type="password"],
    .y2k-win-body textarea,
    .y2k-win-body select {
      backdrop-filter: blur(10px) !important;
      background: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid rgba(255, 107, 53, 0.3) !important;
      color: #fff !important;
      border-radius: 6px !important;
      padding: 8px 10px !important;
      font-size: 13px !important;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
    }
    .y2k-win-body input::placeholder,
    .y2k-win-body textarea::placeholder {
      color: rgba(255, 255, 255, 0.5) !important;
    }
    .y2k-win-body input:focus,
    .y2k-win-body textarea:focus,
    .y2k-win-body select:focus {
      border-color: rgba(255, 107, 53, 0.6) !important;
      box-shadow: 0 0 12px rgba(255, 107, 53, 0.2) !important;
    }
    .y2k-win-body label {
      color: rgba(255, 255, 255, 0.85) !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      display: block !important;
      margin-bottom: 6px !important;
    }

    /* Buttons in sticky header */
    .y2k-win-body [style*="position:sticky"] button {
      backdrop-filter: blur(10px) !important;
      background: rgba(255, 107, 53, 0.35) !important;
      color: #fff !important;
      border: 1px solid rgba(255, 107, 53, 0.5) !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
    }
    .y2k-win-body [style*="position:sticky"] button:hover {
      box-shadow: 0 0 12px rgba(255, 107, 53, 0.3) !important;
      transform: scale(1.02) !important;
      background: rgba(255, 107, 53, 0.45) !important;
    }

    .y2k-win-body .category-section { margin-bottom: 16px !important; }
    .y2k-win-body .category-section h4 { color: rgba(255, 107, 53, 0.95) !important; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 14px !important; font-weight: 700 !important; margin: 12px 0 8px 0 !important; display: flex !important; gap: 8px !important; align-items: center !important; }
    .y2k-win-body .category-section h4 .count { backdrop-filter: blur(10px) !important; background: rgba(255, 107, 53, 0.25) !important; color: #fff !important; padding: 2px 8px !important; border-radius: 12px !important; font-size: 12px !important; font-weight: 600 !important; border: 1px solid rgba(255, 107, 53, 0.4) !important; }
    /* ══ LISTS & CARDS ══════════════════════════════ */
    .y2k-win-body .action-row {
      display: flex !important;
      gap: 10px !important;
      flex-wrap: wrap !important;
      margin: 12px 0 !important;
    }
    .y2k-win-body .action-row .btn {
      flex: 1 !important;
      min-width: 120px !important;
    }
    .y2k-win-body ul, .y2k-win-body ol {
      color: rgba(255, 255, 255, 0.85) !important;
      padding-left: 20px !important;
    }
    .y2k-win-body li {
      margin-bottom: 6px !important;
      line-height: 1.4 !important;
    }

    /* ══ POI ROWS — WARM DARK MODE CARD DESIGN ════════════════════ */
    .y2k-win-body .poi-row { display: flex !important; align-items: stretch !important; gap: 12px !important; background: linear-gradient(135deg, rgba(60, 40, 30, 0.25), rgba(50, 35, 25, 0.15)) !important; border: 1px solid rgba(255, 140, 80, 0.2) !important; border-radius: 10px !important; padding: 8px !important; min-height: 76px !important; transition: all 0.2s ease !important; overflow: hidden !important; }
    .y2k-win-body .poi-row:hover { background: linear-gradient(135deg, rgba(60, 45, 35, 0.35), rgba(50, 40, 30, 0.25)) !important; border-color: rgba(255, 140, 80, 0.4) !important; box-shadow: 0 6px 16px rgba(232, 124, 62, 0.15) !important; transform: translateY(-2px) !important; }
    .y2k-win-body .poi-row img { flex-shrink: 0; width: 56px; height: 56px; border-radius: 8px; object-fit: cover; order: 1; }
    .y2k-win-body .poi-row .icon { display: none; }
    .y2k-win-body .poi-row .body { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; gap: 3px; order: 2; padding: 2px 4px; }
    .y2k-win-body .poi-row .body .name { color: #fff !important; font-weight: 600 !important; font-size: 15px !important; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .y2k-win-body .poi-row .body .sub { color: rgba(255, 200, 150, 0.75) !important; font-size: 13px !important; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .y2k-win-body .poi-row .btn { flex-shrink: 0; order: 3; min-width: 48px; min-height: 44px; padding: 6px 12px; background: linear-gradient(135deg, #e87c3e, #d96a2e); border: 1px solid rgba(232, 124, 62, 0.5); border-radius: 6px; color: #fff; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
    .y2k-win-body .poi-row .btn:hover { background: linear-gradient(135deg, #f08d50, #e07a38) !important; border-color: rgba(232, 124, 62, 0.8) !important; box-shadow: 0 4px 12px rgba(232, 124, 62, 0.25) !important; transform: translateY(-1px) !important; }
    .y2k-win-body .btn { backdrop-filter: blur(10px) !important; background: rgba(255, 107, 53, 0.25) !important; border: 1px solid rgba(255, 107, 53, 0.4) !important; color: #fff !important; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important; }
    .y2k-win-body .btn.primary { backdrop-filter: blur(10px) !important; background: rgba(255, 107, 53, 0.35) !important; border-color: rgba(255, 107, 53, 0.6) !important; color: white !important; }
  `;
  document.head.appendChild(style);
  console.log('[Y2K] CSS INJECTED. Checking rules:');
  console.log('[Y2K] .y2k-win-title span padding-left should be: 24px');
  console.log('[Y2K] .y2k-win-close width should be: 8px');
  console.log('[Y2K] .y2k-win-close height should be: 8px');
  console.log('[Y2K] .y2k-win-close font-size should be: 6px');

  /* ── WINDOW MANAGER ─────────────────────────────────────────────── */
  const wins = {};
  const winViews = {}; // Traccia il dataView per ogni finestra
  let topZ = 2000;

  function openWin(id, title, html, dataView) {
    console.log('%c[Y2K] openWin called', 'background: #FF1493; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold', 'id:', id, 'title:', title, 'view:', dataView);

    // Se già aperta, AGGIORNA il contenuto e porta in foreground
    if (wins[id]) {
      console.log('[Y2K] Window already open, updating content and bringing to front');
      const body = wins[id].querySelector('.y2k-win-body');
      if (body) {
        body.innerHTML = html;
        console.log('[Y2K] ✅ Content updated');
      }
      wins[id].style.zIndex = ++topZ;
      return;
    }

    console.log('[Y2K] Creating new window element');
    const win = document.createElement('div');
    win.className = 'y2k-win';
    win.id = 'y2kwin-' + id;
    console.log('[Y2K] Window element created:', win);

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

    console.log('[Y2K] Appending to body');

    // DEBUG: Check for grid container after insertion
    setTimeout(() => {
      const gridContainers = win.querySelectorAll('[style*="display:grid"]');
      console.log(`[Y2K DEBUG] Found ${gridContainers.length} grid containers`);
      if (gridContainers.length > 0) {
        gridContainers.forEach((grid, idx) => {
          const computedDisplay = window.getComputedStyle(grid).display;
          const computedWidth = window.getComputedStyle(grid).width;
          console.log(`[Y2K DEBUG] Grid ${idx}: display=${computedDisplay}, width=${computedWidth}`);
          console.log(`[Y2K DEBUG] Grid ${idx} children:`, grid.children.length);
          Array.from(grid.children).forEach((child, cidx) => {
            const childDisplay = window.getComputedStyle(child).display;
            const childWidth = window.getComputedStyle(child).width;
            console.log(`  [Child ${cidx}] display=${childDisplay}, width=${childWidth}, minWidth=${window.getComputedStyle(child).minWidth}`);
          });
        });
      }
    }, 100);
    document.body.appendChild(win);
    wins[id] = win;
    winViews[id] = dataView; // Salva il dataView per questa finestra
    console.log('[Y2K] ✅ Window added to DOM, id:', id, 'view:', dataView);
    console.log('[Y2K] Window position - left:', win.style.left, 'top:', win.style.top);
    console.log('[Y2K] Window in DOM?', document.getElementById('y2kwin-' + id) ? 'YES' : 'NO');

    // Hide weather widget when opening window
    const weatherWidget = document.getElementById('weather-floating');
    if (weatherWidget) {
      weatherWidget.classList.remove('show');
      console.log('[Y2K] openWin: 🔴 Removed .show from weather widget');
    }

    // Activate the tab button corresponding to this window's view
    console.log('[Y2K] openWin: dataView parameter:', dataView, 'activeTabView:', window.activeTabView);
    if (dataView) {
      const bottomNav = document.querySelector('nav.bottom');
      if (bottomNav) {
        bottomNav.querySelectorAll('button').forEach(b => {
          b.classList.toggle('active', b.dataset.view === dataView);
        });
        console.log('[Y2K] openWin: ✅ Activated tab button for view:', dataView);
      }
    } else {
      console.warn('[Y2K] openWin: ⚠️ dataView is undefined!');
    }

    // Blur mappa
    updateMapBlur();

    // Porta in primo piano al click e aggiorna il bottone attivo
    win.addEventListener('mousedown', () => {
      win.style.zIndex = ++topZ;
      // Activate tab button when window is brought to front
      const view = winViews[id];
      if (view) {
        const bottomNav = document.querySelector('nav.bottom');
        if (bottomNav) {
          bottomNav.querySelectorAll('button').forEach(b => {
            b.classList.toggle('active', b.dataset.view === view);
          });
          console.log('[Y2K] mousedown: ✅ Activated tab button for view:', view);
        }
      }
    });
    win.addEventListener('touchstart', () => {
      win.style.zIndex = ++topZ;
      // Activate tab button when window is brought to front
      const view = winViews[id];
      if (view) {
        const bottomNav = document.querySelector('nav.bottom');
        if (bottomNav) {
          bottomNav.querySelectorAll('button').forEach(b => {
            b.classList.toggle('active', b.dataset.view === view);
          });
          console.log('[Y2K] touchstart: ✅ Activated tab button for view:', view);
        }
      }
    }, { passive: true });

    // Close button
    const closeBtn = win.querySelector('.y2k-win-close');
    closeBtn.onclick = () => closeWin(id);

    // DEBUG: Check actual computed styles
    setTimeout(() => {
      const titleSpan = win.querySelector('.y2k-win-title span');
      const btnComputed = window.getComputedStyle(closeBtn);
      const titleComputed = window.getComputedStyle(titleSpan);
      console.log(`[Y2K] WINDOW "${id}" ACTUAL STYLES:`);
      console.log(`  Title span padding-left: ${titleComputed.paddingLeft}`);
      console.log(`  Close btn width: ${btnComputed.width}`);
      console.log(`  Close btn height: ${btnComputed.height}`);
      console.log(`  Close btn font-size: ${btnComputed.fontSize}`);
    }, 50);

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
    delete winViews[id]; // Pulisci il dataView tracciato
    updateMapBlur();

    // Emit event so other modules know the window closed
    document.dispatchEvent(new CustomEvent('y2kwin_closed', {
      detail: { id }
    }));

    // Reset tab button to map ONLY if no other windows are open
    if (Object.keys(wins).length === 0) {
      // Reset activeTabView to 'map' so next openWin gets the correct view
      window.activeTabView = 'map';
      console.log('[Y2K] closeWin: Reset activeTabView to map');

      const bottomNav = document.querySelector('nav.bottom');
      if (bottomNav) {
        bottomNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        const mapBtn = bottomNav.querySelector('button[data-view="map"]');
        if (mapBtn) {
          mapBtn.classList.add('active');
          console.log('[Y2K] closeWin: Reset button to map (no other windows open)');
        }
      }

      // Show weather widget when ALL windows are closed (returning to map)
      const weatherWidget = document.getElementById('weather-floating');
      if (weatherWidget) {
        weatherWidget.classList.add('show');
        console.log('[Y2K] closeWin: ✅ Added .show to weather widget (all windows closed)');
      }
    } else {
      // Find the window with the highest z-index (frontmost) and activate its tab button
      let frontmostId = null;
      let maxZ = -Infinity;
      for (const [wid, win] of Object.entries(wins)) {
        const z = parseInt(win.style.zIndex) || 0;
        if (z > maxZ) {
          maxZ = z;
          frontmostId = wid;
        }
      }

      if (frontmostId) {
        const view = winViews[frontmostId];
        if (view) {
          const bottomNav = document.querySelector('nav.bottom');
          if (bottomNav) {
            bottomNav.querySelectorAll('button').forEach(b => {
              b.classList.toggle('active', b.dataset.view === view);
            });
            console.log('[Y2K] closeWin: ✅ Activated tab button for frontmost window:', view);
          }
        }
      }
    }
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
      // Boundary constraints RIGOROSI
      const winWidth = win.offsetWidth;
      const winHeight = win.offsetHeight;

      // Aree NO-DRAG: Top filters + Bottom tabs
      const minTop = 145; // 145px min (header ~70px + filters ~75px, prevents overlap)
      const maxTop = window.innerHeight - winHeight - 150; // 150px min per tab area
      const minLeft = 20;
      const maxLeft = window.innerWidth - winWidth - 20;

      let newLeft = cx - ox;
      let newTop = cy - oy;

      // Constraint STRETTO
      newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
      newTop = Math.max(minTop, Math.min(newTop, maxTop));

      // Ensure window stays visible (non può andare fuori)
      if (newTop < minTop) newTop = minTop;
      if (newTop > maxTop) newTop = maxTop;
      if (newLeft < minLeft) newLeft = minLeft;
      if (newLeft > maxLeft) newLeft = maxLeft;

      win.style.left = newLeft + 'px';
      win.style.top  = newTop + 'px';
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

      // Get window's current position
      const currentLeft = parseInt(win.style.left) || win.offsetLeft;
      const currentTop = parseInt(win.style.top) || win.offsetTop;

      // Calculate max dimensions based on position + safety margins
      // Horizontal: must fit within screen leaving 20px margin on both sides
      const maxWidthForPosition = Math.max(260, window.innerWidth - currentLeft - 20);
      const maxAllowedWidth = Math.min(950, maxWidthForPosition);

      // Vertical: symmetric padding (145px top = 145px bottom from nav)
      // Top: windows start at 145px minimum
      // Bottom: windows must stop 145px before bottom (same padding as top)
      const minBottomPosition = window.innerHeight - 145;
      const maxHeightForPosition = Math.max(180, minBottomPosition - currentTop);
      const maxAllowedHeight = maxHeightForPosition;

      const limitedWidth = Math.max(260, Math.min(sw + cx - sx, maxAllowedWidth));
      const limitedHeight = Math.max(180, Math.min(sh + cy - sy, maxAllowedHeight));

      const newWidth = limitedWidth + 'px';
      const newHeight = limitedHeight + 'px';
      win.style.setProperty('width', newWidth, 'important');
      win.style.setProperty('height', newHeight, 'important');
      win.style.setProperty('max-width', maxAllowedWidth + 'px', 'important');
      win.style.setProperty('max-height', maxAllowedHeight + 'px', 'important');
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
    console.log('%c[Y2K] patchSheets called', 'background: #FF1493; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    // Attendi che openSheet sia definita
    const origOpen  = window.openSheet;
    const origClose = window.closeSheet;

    console.log('[Y2K] origOpen type:', typeof origOpen);
    console.log('[Y2K] origClose type:', typeof origClose);

    if (typeof origOpen === 'function') {
      console.log('[Y2K] ✅ Patching openSheet');
      window.openSheet = function(title, html, onClose) {
        console.log('[Y2K] ✅ NEW openSheet called with title:', title);
        // Genera id dall'iniziale del titolo
        const id = title.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20) || 'win';
        console.log('[Y2K] Generated id:', id);
        // Passa activeTabView per attivare il bottone corretto
        const view = window.activeTabView || 'map';
        openWin(id, title, html, view);
      };
    } else {
      console.error('[Y2K] ❌ origOpen is not a function!');
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

  // Patcha dopo che openSheet è definita
  console.log('[Y2K] Waiting for openSheet to be defined...');

  function waitForOpenSheet() {
    if (typeof window.openSheet === 'function') {
      console.log('[Y2K] ✅ openSheet found! Patching now...');
      patchSheets();
    } else {
      console.log('[Y2K] openSheet not found yet, retrying in 100ms...');
      setTimeout(waitForOpenSheet, 100);
    }
  }

  // Inizia ad aspettare
  waitForOpenSheet();

})();
