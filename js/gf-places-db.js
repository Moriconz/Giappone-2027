// ============================================================================
// gf-places-db.js — GFSuggestionsDB e GFPlacesDB (storage localStorage)
// Estratto da gf-places-panel.js (nessun cambio di comportamento).
// Deps (window.*): broadcastToPeers. Espone: window.GFSuggestionsDB, window.GFPlacesDB
// ============================================================================
(function () {
  'use strict';

/* ================= GF PLACES DATABASE ================= */

function _makeLocalDB(storeKey) {
  return {
    STORE_KEY: storeKey,
    getAll() {
      try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { return []; }
    },
    _save(items) { localStorage.setItem(storeKey, JSON.stringify(items)); },
    delete(id) {
      try {
        this._save(this.getAll().filter(x => x.id !== id));
        return true;
      } catch (err) { console.error('[LocalDB.delete]', err); return false; }
    }
  };
}

const GFSuggestionsDB = Object.assign(_makeLocalDB('gf_suggestions_submitted'), {
  add(suggestion) {
    try {
      const list = this.getAll();
      suggestion.id = 'gfs_' + Date.now();
      suggestion.submittedAt = new Date().toISOString();
      suggestion.status = 'pending';
      list.push(suggestion);
      this._save(list);
      window.broadcastToPeers?.({ type: 'gf_suggestion_add', suggestion });
      return suggestion;
    } catch (err) { console.error('[GFSuggestionsDB.add]', err); return null; }
  }
});

const GFPlacesDB = Object.assign(_makeLocalDB('gf_custom_places'), {
  add(place) {
    try {
      const places = this.getAll();
      place.id = 'gf_' + Date.now();
      place.createdAt = new Date().toISOString();
      places.push(place);
      this._save(places);
      window.broadcastToPeers?.({ type: 'gf_place_add', place });
      return place;
    } catch (err) { console.error('[GFPlacesDB.add]', err); return null; }
  },
  edit(id, updates) {
    try {
      const places = this.getAll();
      const idx = places.findIndex(p => p.id === id);
      if (idx < 0) return null;
      places[idx] = { ...places[idx], ...updates, updatedAt: new Date().toISOString() };
      this._save(places);
      window.broadcastToPeers?.({ type: 'gf_place_edit', id, updates });
      return places[idx];
    } catch (err) { console.error('[GFPlacesDB.edit]', err); return null; }
  },
  delete(id) {
    try {
      const places = this.getAll().filter(p => p.id !== id);
      this._save(places);
      window.broadcastToPeers?.({ type: 'gf_place_delete', id });
      return true;
    } catch (err) { console.error('[GFPlacesDB.delete]', err); return false; }
  },
  sync(incoming) {
    try {
      const merged = [...this.getAll()];
      for (const item of incoming) {
        const ex = merged.find(p => p.id === item.id);
        if (!ex) merged.push(item);
        else if (new Date(item.updatedAt) > new Date(ex.updatedAt)) Object.assign(ex, item);
      }
      this._save(merged);
      return merged;
    } catch (err) { console.error('[GFPlacesDB.sync]', err); return this.getAll(); }
  }
});

  window.GFSuggestionsDB = GFSuggestionsDB;
  window.GFPlacesDB = GFPlacesDB;
})();
