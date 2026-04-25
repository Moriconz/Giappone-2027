// ============================================================================
// STATE.JS — Global state initialization
// DEVE essere caricato PRIMA di ogni altro script
// ============================================================================

window.STATE_KEY = 'giappone2027_state_v1';

// Create global state object from localStorage
window.state = Object.assign({
  activeCat: 'all',
  onlyGF: false,
  onlyLocal: false,
  savedPOIs: [],
  notes: {},
  customEvents: [],
  dismissInstall: false,
  group: { name: 'Giappone 2027', members: [], myAvatar: null, myName: '' },
  // AI Features
  ai: {},
  aiQuotaDate: null,
  aiCallsToday: 0,
  // GPS Features
  gpsEnabled: false,
  gpsCurrentLat: undefined,
  gpsCurrentLng: undefined,
  gpsRemoteMarkers: {},
  wakeLockEnabled: false,
  // Group sync
  knownMembers: []
}, JSON.parse(localStorage.getItem(window.STATE_KEY) || '{}'));

// Global save function
window.saveState = function() {
  try {
    const serialized = JSON.stringify(window.state);
    if (serialized.length > 4_500_000) {
      console.warn('[State] localStorage quota warning: ' + Math.round(serialized.length / 1024) + 'KB');
      if (window.toast) window.toast('⚠️ Dati quasi al limite (4.3MB).');
    }
    localStorage.setItem(window.STATE_KEY, serialized);
  } catch (e) {
    console.error('[State] Save error:', e);
    if (window.toast) window.toast('⚠️ Impossibile salvare: storage pieno.');
  }
};

// Helper: Initialize sub-objects if missing
function ensureStateObject(path) {
  const parts = path.split('.');
  let obj = window.state;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!obj[part] || typeof obj[part] !== 'object') {
      obj[part] = {};
    }
    obj = obj[part];
  }
  return obj;
}

window.ensureStateObject = ensureStateObject;

console.log('[State] Initialized. Keys:', Object.keys(window.state).length);
