// ============================================================================
// STATE.JS — Global state: load, migrate, save (authoritative)
// Loaded before every other script.
// ============================================================================

window.STATE_KEY = 'giappone2027_state_v1';

// ── Load + guard against corrupt localStorage fields ─────────────────────────
(function _initState() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(window.STATE_KEY) || '{}');
    // JSON valido ma non un oggetto piatto (es. la stringa letterale "null",
    // o un array/primitivo) non lancia in JSON.parse ma rompe ogni raw[k] sotto
    // — fuori dal try/catch, quindi window.state non verrebbe mai assegnato.
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  } catch (e) {
    console.warn('[State] Parse error — starting fresh:', e.message);
    raw = {};
  }

  // Reset any field whose type is wrong (corrupted by old code / crash)
  const arrays  = ['savedPOIs', 'itinerary', 'customEvents', 'customPOIs', 'gpsTraces', 'knownMembers'];
  const objects = ['notes', 'gfReports', 'userCategoryOverrides', 'itinerarySharing', 'groupItineraries', 'itineraryByDay', 'bookings', 'tripProfile', 'ai', 'gpsRemoteMarkers', 'itineraryTombstones'];
  arrays.forEach(k => {
    if (raw[k] !== undefined && !Array.isArray(raw[k])) { console.warn('[State] Corrupt array reset:', k); delete raw[k]; }
  });
  objects.forEach(k => {
    if (raw[k] !== undefined && (typeof raw[k] !== 'object' || Array.isArray(raw[k]) || raw[k] === null)) { console.warn('[State] Corrupt object reset:', k); delete raw[k]; }
  });
  if (raw.group !== undefined && (typeof raw.group !== 'object' || Array.isArray(raw.group) || raw.group === null)) {
    console.warn('[State] Corrupt group reset'); delete raw.group;
  }
  // itineraryByDay è un oggetto piatto ma i SUOI valori (un array per giorno)
  // non erano validati singolarmente: un giorno con null/non-array (scrittura
  // parziale, tampering, bug futuro) mandava in eccezione non gestita quasi
  // ogni mutazione dell'itinerario (removePOI, updateTime/Notes/Duration/Cost,
  // normalizeAllEntries — tutte fanno .forEach/.find/.map diretto sul giorno).
  // Fix una volta qui invece che in ogni call site sparso in itinerary.js.
  if (raw.itineraryByDay && typeof raw.itineraryByDay === 'object') {
    Object.keys(raw.itineraryByDay).forEach(day => {
      if (!Array.isArray(raw.itineraryByDay[day])) {
        console.warn('[State] Corrupt itineraryByDay day reset:', day);
        raw.itineraryByDay[day] = [];
      }
    });
  }

  window.state = Object.assign({
    activeCat: 'all', onlyGF: false, onlyLocal: false, showGFPlaces: false,
    savedPOIs: [], notes: {}, customEvents: [], customPOIs: [], gfReports: {}, dismissInstall: false,
    itinerary: [],
    itineraryByDay: {},
    userCategoryOverrides: {},
    group: { name: 'Giappone 2027', members: [], myAvatar: null, myName: '', createdBy: null, createdByName: null, isCreator: false },
    itinerarySharing: {},
    groupItineraries: {},
    undoRedo: { stack: [], currentIndex: -1, maxSize: 100 },
    ai: {}, aiQuotaDate: null, aiCallsToday: 0,
    gpsEnabled: false, gpsCurrentLat: 35.6762, gpsCurrentLng: 139.6503,
    gpsRemoteMarkers: {}, wakeLockEnabled: false,
    knownMembers: [],
    bookings: {}, tripProfile: {}, itineraryTombstones: {}
  }, raw);
})();

// ── Schema versioning & migration ─────────────────────────────────────────────
window.STATE_VERSION = 2;
(function migrateState() {
  const s = window.state;
  const from = s._schemaVersion || 1;
  if (from === window.STATE_VERSION) return;
  try {
    if (from < 2) {
      if (!s.itineraryByDay || typeof s.itineraryByDay !== 'object' || Array.isArray(s.itineraryByDay)) s.itineraryByDay = {};
      if (!Array.isArray(s.savedPOIs)) s.savedPOIs = [];
      if (!s.notes || typeof s.notes !== 'object') s.notes = {};
      if (s.group && !Array.isArray(s.group.messages)) s.group.messages = s.group.messages || [];
    }
    s._schemaVersion = window.STATE_VERSION;
    console.log('[State] Schema migrated', from, '→', window.STATE_VERSION);
  } catch (e) {
    console.error('[State] Migration error:', e);
  }
})();

// ── Save helpers ──────────────────────────────────────────────────────────────
function _cleanupGPSTraces() {
  const s = window.state;
  if (Array.isArray(s.gpsTraces) && s.gpsTraces.length > 500) {
    s.gpsTraces = s.gpsTraces.slice(-500);
  }
}

function _trimStateForQuota(s) {
  if (s.group?.members) {
    s.group.members = s.group.members.map(m => m.avatar?.startsWith('data:') ? { ...m, avatar: null } : m);
  }
  if (s.group?.myAvatar?.startsWith('data:')) s.group.myAvatar = null;
  if (s.gpsTraces?.length > 100) s.gpsTraces = s.gpsTraces.slice(-100);
}

window.saveState = function () {
  try {
    _cleanupGPSTraces();
    let serialized = JSON.stringify(window.state);
    if (serialized.length > 4_500_000) {
      console.warn('[State] Quota warning:', Math.round(serialized.length / 1024) + 'KB — trimming');
      const trimmed = JSON.parse(serialized);
      _trimStateForQuota(trimmed);
      serialized = JSON.stringify(trimmed);
      _trimStateForQuota(window.state);
      window.toast?.(window.t?.('toast.storageWarning', '⚠️ Dati quasi al limite (4.3MB).'));
    }
    localStorage.setItem(window.STATE_KEY, serialized);
  } catch (e) {
    console.error('[State] Save error:', e);
    window.toast?.(window.t?.('toast.storageFull', '⚠️ Impossibile salvare: storage pieno.'));
  }
};

// ── Utility: ensure nested sub-objects exist ─────────────────────────────────
window.ensureStateObject = function (path) {
  const parts = path.split('.');
  let obj = window.state;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!obj[p] || typeof obj[p] !== 'object') obj[p] = {};
    obj = obj[p];
  }
  return obj;
};

// ── GF layer toggle: gluten-free is a kept-but-optional layer (global planner) ─
// ponytail: default ON preserves current behavior; users who don't need GF can hide it
window.isGFEnabled = function () {
  try { const v = localStorage.getItem('gfEnabled'); return v === null ? true : v === '1'; } catch (_) { return true; }
};
window.applyGFVisibility = function () {
  const on = window.isGFEnabled();
  const navBtn = document.querySelector('nav.bottom button[data-view="gf"]');
  if (navBtn) navBtn.style.display = on ? '' : 'none';
  if (window.gfPlacesLayer) window.gfPlacesLayer.setVisible(on);
};
window.setGFEnabled = function (on) {
  try { localStorage.setItem('gfEnabled', on ? '1' : '0'); } catch (_) {}
  window.applyGFVisibility();
  // if the GF tab was active and we just hid it, fall back to the map
  if (!on) document.querySelector('nav.bottom button[data-view="map"]')?.click?.();
};

// ── Rilevamento "viaggio in Giappone" per i plugin destinazione (JR Pass,
// calendario festività). Non c'è un campo destinazione esplicito in
// tripProfile: si riusa la stessa bounding-box già presente in
// google-places-loader.js (getZoneFromCoordinates/JAPAN_ZONES), applicata
// alle tappe già in itinerario o, in mancanza, all'ultima vista mappa. ─
window.isJapanTrip = function () {
  try {
    const ibd = window.state?.itineraryByDay || {};
    const stops = Object.values(ibd).flat().filter(e => typeof e.lat === 'number' && typeof e.lng === 'number');
    if (stops.length && typeof window.getZoneFromCoordinates === 'function') {
      return stops.some(s => !!window.getZoneFromCoordinates(s.lat, s.lng));
    }
    // Nessuna tappa con coordinate ancora: guarda l'ultima vista mappa
    const mv = JSON.parse(localStorage.getItem('gj2027_map_view') || 'null');
    if (mv && typeof mv.lat === 'number' && typeof mv.lng === 'number') {
      return mv.lat >= 24 && mv.lat <= 46 && mv.lng >= 122 && mv.lng <= 146;
    }
    return true; // nessun segnale: default storico dell'app (Giappone)
  } catch (_) { return true; }
};

console.log('[State] Initialized. Keys:', Object.keys(window.state).length);
