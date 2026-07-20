// ============================================================================
// GAME-EVENTS.JS — bus eventi del layer gioco (V2 «Voxel Quest», F1)
// Ledger event-sourced append-only in state.game.ledger = fonte di verità:
// XP/badge/quest (F3+) si derivano da qui, mai scritti direttamente.
// Aggancio: wrapper post-load su API globali — stesso pattern collaudato di
// itinerary-undo-redo.js (_installWrappers) — zero modifiche alla logica V1.
// Toggle «Modalità gioco» OFF = nessun evento emesso, planner identico.
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  const LEDGER_CAP = 5000; // ponytail: cap FIFO semplice, compattazione snapshot+tail in F5

  // ── Schema game.* (riempie i buchi, non sovrascrive mai dati esistenti) ────
  function ensureGame() {
    const s = window.state;
    if (!s) return null;
    if (!s.game || typeof s.game !== 'object' || Array.isArray(s.game)) s.game = {};
    const g = s.game;
    if (typeof g.enabled !== 'boolean') g.enabled = true;
    if (!g.avatar || typeof g.avatar !== 'object') g.avatar = { parts: {}, colors: {} };
    if (!g.profile || typeof g.profile !== 'object') g.profile = { xp: 0, level: 1, koban: 0, mascotState: 'idle', createdAt: Date.now() };
    if (!g.steps || typeof g.steps !== 'object') g.steps = { byDay: {}, provider: null };
    if (!g.streaks || typeof g.streaks !== 'object') g.streaks = { current: 0, best: 0, lastActiveDay: null, freezeTokens: 0 };
    if (!g.badges || typeof g.badges !== 'object') g.badges = {};
    if (!g.souvenirs || typeof g.souvenirs !== 'object') g.souvenirs = {};
    if (!g.checkins || typeof g.checkins !== 'object') g.checkins = {};
    if (!g.stamps || typeof g.stamps !== 'object') g.stamps = {};
    if (!g.words || typeof g.words !== 'object') g.words = { byLang: {}, lastShownDay: null };
    if (!g.quests || typeof g.quests !== 'object') g.quests = { daily: [], trip: [], coop: [], completed: [] };
    if (!Array.isArray(g.ledger)) g.ledger = [];
    return g;
  }

  function isOn() { const g = ensureGame(); return !!(g && g.enabled); }

  function setOn(v) {
    const g = ensureGame();
    if (!g) return;
    g.enabled = !!v;
    window.saveState?.();
    document.dispatchEvent(new CustomEvent('game_mode_changed', { detail: { enabled: g.enabled }, bubbles: true }));
  }

  // ── Emissione evento → ledger ──────────────────────────────────────────────
  function emit(event, meta) {
    const g = ensureGame();
    if (!g || !g.enabled) return null;
    const entry = { ts: Date.now(), event, xp: 0, koban: 0, meta: meta || {} };
    g.ledger.push(entry);
    if (g.ledger.length > LEDGER_CAP) g.ledger.splice(0, g.ledger.length - LEDGER_CAP);
    window.saveState?.();
    document.dispatchEvent(new CustomEvent('game_event', { detail: entry, bubbles: true }));
    return entry;
  }

  // ── Wrapper generico: emette DOPO l'originale (stato già aggiornato); ──────
  // se l'originale è async, emette solo a promise risolta.
  function wrap(obj, method, fn) {
    const original = obj && obj[method];
    if (typeof original !== 'function' || original.__gameWrapped) return false;
    const wrapped = function () {
      const args = arguments;
      const r = original.apply(this, args);
      if (r && typeof r.then === 'function') {
        r.then(() => { try { fn.apply(null, args); } catch (_) {} }, () => {});
      } else {
        try { fn.apply(null, args); } catch (_) {}
      }
      return r;
    };
    wrapped.__gameWrapped = true;
    obj[method] = wrapped;
    return true;
  }

  // ── Aggancio ai punti mappati in Fase 0 (vedi V2_PLAN.md §2) ───────────────
  function _installWrappers() {
    const IT = window.ITINERARY;
    if (!IT || typeof IT.addPOIToDay !== 'function') return false;
    if (IT.__gameEventsWrapped) return true;

    wrap(IT, 'addPOIToDay',    () => emit('plan.stop_added'));
    wrap(IT, 'removePOI',      () => emit('plan.stop_removed'));
    wrap(IT, 'moveToDay',      () => emit('plan.stop_moved'));
    wrap(IT, 'reorderDay',     () => emit('plan.day_reordered'));
    wrap(IT, 'optimizeDay',    () => emit('plan.day_reordered'));
    wrap(IT, 'updateTime',     () => emit('plan.stop_edited'));
    wrap(IT, 'updateNotes',    () => emit('plan.stop_edited'));
    wrap(IT, 'updateDuration', () => emit('plan.stop_edited'));
    wrap(IT, 'updateCost',     () => emit('plan.stop_edited'));
    wrap(IT, 'markVisited',    () => emit('field.visited'));
    IT.__gameEventsWrapped = true;
    console.log('[game-events] wrappers installati su window.ITINERARY');
    return true;
  }

  // Questi vivono su globali diversi con timing proprio: installi indipendenti.
  function _installAuxWrappers() {
    // XP per l'ATTO di registrare una spesa, mai per l'importo (regola prompt):
    // meta volutamente vuoto, niente amount nel ledger.
    if (window.GroupExpenses) wrap(window.GroupExpenses, 'add', () => emit('expense.logged'));
    if (window.ITINERARY_TICKETS) wrap(window.ITINERARY_TICKETS, 'addTicket', () => emit('ticket.linked'));
    if (typeof window.analyzeGlutenFreeStatus === 'function' && !window.analyzeGlutenFreeStatus.__gameWrapped) {
      wrap(window, 'analyzeGlutenFreeStatus', () => emit('gf.analysis')); // solo contatore: GF fuori dalle meccaniche
    }
  }

  // ── Listener su eventi già esistenti (nessun wrap necessario) ──────────────
  let _lastSyncEmit = 0;
  function _installListeners() {
    window.addEventListener('itinerary_updated', () => {
      const now = Date.now(); // throttle: i burst di sync MQTT non riempiono il ledger
      if (now - _lastSyncEmit < 60000) return;
      _lastSyncEmit = now;
      emit('sync.received');
    });
    document.addEventListener('photo_added', () => emit('photo.saved'));
  }

  // ── Boot: subito (defer garantisce l'ordine), poi retry per i ritardatari ──
  function _boot() {
    ensureGame();
    _installListeners();
    _installAuxWrappers();
    if (_installWrappers()) { _installAuxWrappers(); return; }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      _installAuxWrappers();
      if (_installWrappers() || tries > 40) clearInterval(iv);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();

  window.GameEvents = {
    emit,
    isOn,
    setOn,
    ensureGame,
    ledger: () => (ensureGame() || {}).ledger || []
  };
})();
