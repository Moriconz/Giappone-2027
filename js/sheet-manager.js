// ============================================================================
// sheet-manager.js — openSheet, closeSheet + focus-trap + sheet event handlers
// Extracted from app-core.js. No external deps (uses DOM directly).
// ============================================================================
(function () {
  'use strict';

  let _sheetPrevFocus = null;
  let _sheetTrapHandler = null;

  function openSheet(title, html){
    const sheet = document.getElementById('sheet');
    const sheetTitle = document.getElementById('sheet-title');
    const sheetBody = document.getElementById('sheet-body');
    console.log('[openSheet] Starting, title:', title);
    console.log('[openSheet] sheetTitle:', sheetTitle, 'sheetBody:', sheetBody, 'sheet:', sheet);
    if (!sheetTitle || !sheetBody || !sheet) {
      console.error('[openSheet] ❌ Elements not found!', {sheetTitle: !!sheetTitle, sheetBody: !!sheetBody, sheet: !!sheet});
      return;
    }
    sheetTitle.textContent = title;
    sheetBody.innerHTML = html;
    sheet.classList.add('open');
    // Hide weather widget when sheet opens
    const weatherWidget = document.getElementById('weather-floating');
    if (weatherWidget) weatherWidget.classList.remove('show');
    console.log('[openSheet] ✅ Sheet opened, class added');

    // Focus trap: save previous focus, move focus into sheet
    _sheetPrevFocus = document.activeElement;
    const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    if (_sheetTrapHandler) document.removeEventListener('keydown', _sheetTrapHandler);
    _sheetTrapHandler = (ev) => {
      if (ev.key !== 'Tab') return;
      const els = Array.from(sheet.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (ev.shiftKey) { if (document.activeElement === first) { ev.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { ev.preventDefault(); first.focus(); } }
    };
    document.addEventListener('keydown', _sheetTrapHandler);
    requestAnimationFrame(() => {
      const closeBtn = document.getElementById('sheet-close');
      const firstEl = sheet.querySelector(FOCUSABLE);
      (closeBtn || firstEl)?.focus();
    });
  }

  function closeSheet(){
    const sheet = document.getElementById('sheet');
    console.log('[closeSheet] 🔴 closeSheet called');
    sheet.classList.remove('open');
    // Release focus trap and restore prior focus
    if (_sheetTrapHandler) { document.removeEventListener('keydown', _sheetTrapHandler); _sheetTrapHandler = null; }
    if (_sheetPrevFocus && typeof _sheetPrevFocus.focus === 'function') { try { _sheetPrevFocus.focus(); } catch (_) {} }
    _sheetPrevFocus = null;

    // Remove wizard listeners when sheet closes
    if (window._wizardClickListener) {
      document.removeEventListener('click', window._wizardClickListener, { capture: true });
      window._wizardClickListener = null;
      window._wizardClickListenerAttached = false;
      console.log('[closeSheet] ✅ Removed wizard click listener');
    }

    if (window._wizardChangeListener) {
      document.removeEventListener('change', window._wizardChangeListener, { capture: true });
      window._wizardChangeListener = null;
      window._wizardChangeListenerAttached = false;
      console.log('[closeSheet] ✅ Removed wizard change listener');
    }

    // Show weather widget again when sheet closes
    const weatherWidget = document.getElementById('weather-floating');
    if (weatherWidget) {
      weatherWidget.classList.add('show');
      console.log('[closeSheet] ✅ Added .show to weather widget');
    } else {
      console.error('[closeSheet] ❌ Weather widget element not found!');
    }
    // Always reset tab buttons to "Mappa" when closing any sheet
    const bottomNav = document.querySelector('nav.bottom');
    if (bottomNav) {
      console.log('[closeSheet] Resetting all buttons to blue, activating map button');
      bottomNav.querySelectorAll('button').forEach(b => {
        const wasActive = b.classList.contains('active');
        b.classList.remove('active');
        if (wasActive) {
          console.log('[closeSheet] Removed .active from button:', b.dataset.view);
        }
      });
      const mapBtn = bottomNav.querySelector('button[data-view="map"]');
      if (mapBtn) {
        mapBtn.classList.add('active');
        console.log('[closeSheet] ✅ Added .active to map button');
      }
    } else {
      console.warn('[closeSheet] bottomNav element not found');
    }
    // Double-check: wait a frame and verify state
    requestAnimationFrame(() => {
      const bottomNav = document.querySelector('nav.bottom');
      if (bottomNav) {
        const activeButtons = Array.from(bottomNav.querySelectorAll('button.active'));
        console.log('[closeSheet] Verification: active buttons count:', activeButtons.length,
          'Map button active?', activeButtons.some(b => b.dataset.view === 'map'));
      }
    });
  }

  window.openSheet = openSheet;
  window.closeSheet = closeSheet;

  function _setupSheetHandlers() {
    const sheetClose = document.getElementById('sheet-close');
    const sheet = document.getElementById('sheet');
    if (sheetClose) sheetClose.onclick = closeSheet;
    if (sheet) sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
    window.sheetBody = document.getElementById('sheet-body');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _setupSheetHandlers);
  } else {
    _setupSheetHandlers();
  }
})();
