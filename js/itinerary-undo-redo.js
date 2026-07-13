/**
 * itinerary-undo-redo.js — Undo/Redo per l'itinerario personale
 *
 * Chiude l'ultimo gap UI documentato in STATO_APP.md §8.3: l'undo/redo
 * esisteva solo per gli itinerari di GRUPPO (CRDT undo-stack in app-core,
 * bottoni in group-panel.js). L'itinerario PERSONALE (state.itineraryByDay)
 * non aveva alcun "annulla".
 *
 * Implementazione non-invasiva (stesso pattern di group-invite / conflict-resolver):
 * wrappa i metodi mutator di window.ITINERARY così che, PRIMA di ogni modifica,
 * spinga uno snapshot di state.itineraryByDay nello stack undo. L'undo ripristina
 * lo snapshot precedente; il redo ri-applica.
 *
 * Lo stack è VOLATILE (in memoria, non localStorage): è un "annulla di sessione",
 * concettualmente diverso dagli snapshot persistenti di itinerary-snapshots.js.
 *
 * Esposto:
 *   - window.ItineraryUndoRedo = { undo, redo, canUndo, canRedo, peekUndo, peekRedo, clear }
 *   - window.itineraryUndo() / window.itineraryRedo()
 *
 * Dipendenze esterne (tutte su window):
 *   - window.ITINERARY (metodi wrappati)
 *   - window.state.itineraryByDay
 *   - window.saveState, window.renderItineraryUnified, window.toast, window.t
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const MAX_STACK = 30;

  let undoStack = []; // [{ snapshot, label, ts }]
  let redoStack = [];
  let suspended = false; // evita push durante undo/redo

  function _clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function _snapshot() {
    return _clone(window.state?.itineraryByDay || {});
  }

  function _pushUndo(label) {
    if (suspended) return;
    undoStack.push({ snapshot: _snapshot(), label: label || T('undo.genericChange', 'Modifica'), ts: Date.now() });
    while (undoStack.length > MAX_STACK) undoStack.shift();
    redoStack = []; // nuova azione invalida il redo
    _refreshButtons();
  }

  function _applySnapshot(snap) {
    if (!window.state) return;
    window.state.itineraryByDay = _clone(snap);
    window.saveState?.();
    window.renderItineraryUnified?.();
  }

  function undo() {
    if (undoStack.length === 0) {
      if (typeof window.toast === 'function') window.toast(T('undo.nothingUndo', 'Niente da annullare'));
      return false;
    }
    const entry = undoStack.pop();
    // Salva lo stato corrente nel redo prima di ripristinare
    redoStack.push({ snapshot: _snapshot(), label: entry.label, ts: Date.now() });
    while (redoStack.length > MAX_STACK) redoStack.shift();

    suspended = true;
    try {
      _applySnapshot(entry.snapshot);
      if (typeof window.toast === 'function') window.toast('↩️ ' + T('undo.undone', 'Annullato') + ': ' + entry.label);
    } finally {
      suspended = false;
    }
    _refreshButtons();
    return true;
  }

  function redo() {
    if (redoStack.length === 0) {
      if (typeof window.toast === 'function') window.toast(T('undo.nothingRedo', 'Niente da rifare'));
      return false;
    }
    const entry = redoStack.pop();
    undoStack.push({ snapshot: _snapshot(), label: entry.label, ts: Date.now() });
    while (undoStack.length > MAX_STACK) undoStack.shift();

    suspended = true;
    try {
      _applySnapshot(entry.snapshot);
      if (typeof window.toast === 'function') window.toast('↪️ ' + T('undo.redone', 'Rifatto') + ': ' + entry.label);
    } finally {
      suspended = false;
    }
    _refreshButtons();
    return true;
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }
  function peekUndo() { return undoStack.length ? undoStack[undoStack.length - 1].label : null; }
  function peekRedo() { return redoStack.length ? redoStack[redoStack.length - 1].label : null; }
  function clear() { undoStack = []; redoStack = []; _refreshButtons(); }

  // ─── Wrapper sui mutator di window.ITINERARY ─────────────────────────

  // Mappa metodo → label i18n
  const MUTATOR_LABELS = {
    addPOIToDay:    () => T('undo.addPOI', 'Aggiunta tappa'),
    removePOI:      () => T('undo.removePOI', 'Rimozione tappa'),
    updateTime:     () => T('undo.updateTime', 'Modifica orario'),
    updateNotes:    () => T('undo.updateNotes', 'Modifica note'),
    updateDuration: () => T('undo.updateDuration', 'Modifica durata'),
    updateCost:     () => T('undo.updateCost', 'Modifica costo'),
    moveToDay:      () => T('undo.moveToDay', 'Spostamento giorno'),
    optimizeDay:    () => T('undo.optimizeDay', 'Ottimizzazione giorno'),
    reorderDay:     () => T('undo.reorderDay', 'Riordino per orari'),
    markVisited:    () => T('undo.markVisited', 'Segna visitato')
  };

  function _installWrappers() {
    const IT = window.ITINERARY;
    if (!IT || typeof IT.addPOIToDay !== 'function') return false;
    if (IT.__undoWrapped) return true;

    Object.keys(MUTATOR_LABELS).forEach(method => {
      const original = IT[method];
      if (typeof original !== 'function') return;
      IT[method] = function () {
        // Push snapshot PRIMA della modifica (se non siamo in undo/redo)
        if (!suspended) {
          try { _pushUndo(MUTATOR_LABELS[method]()); } catch (_) {}
        }
        return original.apply(this, arguments);
      };
    });

    IT.__undoWrapped = true;
    console.log('[undo-redo] wrappers installati su window.ITINERARY');
    return true;
  }

  // ─── UI buttons sync ─────────────────────────────────────────────────

  function _refreshButtons() {
    const undoBtn = document.getElementById('itinerary-undo-btn');
    const redoBtn = document.getElementById('itinerary-redo-btn');
    if (undoBtn) {
      const can = canUndo();
      undoBtn.disabled = !can;
      undoBtn.style.opacity = can ? '1' : '0.4';
      undoBtn.style.cursor = can ? 'pointer' : 'not-allowed';
      undoBtn.title = can ? (T('undo.undo', 'Annulla') + ': ' + peekUndo()) : T('undo.nothingUndo', 'Niente da annullare');
    }
    if (redoBtn) {
      const can = canRedo();
      redoBtn.disabled = !can;
      redoBtn.style.opacity = can ? '1' : '0.4';
      redoBtn.style.cursor = can ? 'pointer' : 'not-allowed';
      redoBtn.title = can ? (T('undo.redo', 'Rifai') + ': ' + peekRedo()) : T('undo.nothingRedo', 'Niente da rifare');
    }
  }

  // HTML dei bottoni — chiamato da itinerary-unified.js
  function renderButtonsHTML() {
    return `
      <div style="display:flex;gap:8px;">
        <button id="itinerary-undo-btn" onclick="itineraryUndo()" disabled style="
          flex:1;padding:9px 12px;
          background:rgba(20,30,60,0.03);border:1.5px solid var(--l-hair);
          border-radius:8px;color:var(--l-ink);font-weight:600;font-size:15px;
          opacity:0.4;cursor:not-allowed;transition:all 0.15s;">
          ⬅️ ${T('undo.undo', 'Annulla')}
        </button>
        <button id="itinerary-redo-btn" onclick="itineraryRedo()" disabled style="
          flex:1;padding:9px 12px;
          background:rgba(20,30,60,0.03);border:1.5px solid var(--l-hair);
          border-radius:8px;color:var(--l-ink);font-weight:600;font-size:15px;
          opacity:0.4;cursor:not-allowed;transition:all 0.15s;">
          ${T('undo.redo', 'Rifai')} ➡️
        </button>
      </div>
    `;
  }

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo
  function _installKeyboard() {
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      // Solo se la vista itinerario è quella attiva
      if (window.activeTabView && window.activeTabView !== 'itinerary' && window.activeTabView !== 'list') return;
      // Non interferire con input/textarea
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    });
  }

  // ─── Boot ────────────────────────────────────────────────────────────

  function _boot() {
    if (_installWrappers()) {
      _installKeyboard();
      // refresh buttons quando si (ri)renderizza l'itinerario
      setTimeout(_refreshButtons, 300);
      return;
    }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (_installWrappers() || tries > 40) {
        clearInterval(iv);
        _installKeyboard();
        _refreshButtons();
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  window.ItineraryUndoRedo = {
    undo, redo, canUndo, canRedo, peekUndo, peekRedo, clear,
    renderButtonsHTML, refreshButtons: _refreshButtons,
    _stats: () => ({ undo: undoStack.length, redo: redoStack.length })
  };
  window.itineraryUndo = undo;
  window.itineraryRedo = redo;
})();
