/**
 * CORE — State management + Utilities
 * Extracted from index.html inline JS
 */

// ============================================================================
// STATE INITIALIZATION
// ============================================================================

const STATE_KEY = 'giappone2027_state_v1';

export const state = Object.assign(
  {
    activeCat: 'all',
    onlyGF: false,
    onlyLocal: false,
    savedPOIs: [],
    notes: {},
    customEvents: [],
    dismissInstall: false,
    itinerary: [],
    userCategoryOverrides: {},
    group: { name: 'Giappone 2027', members: [], myAvatar: null, myName: '', createdBy: null, createdByName: null, isCreator: false },
    gpsTraces: [],
    gpsEnabled: false
  },
  JSON.parse(localStorage.getItem(STATE_KEY) || '{}')
);

// Expose globally
window.state = state;

// ============================================================================
// STATE PERSISTENCE
// ============================================================================

export function saveState() {
  try {
    cleanupGPSTraces();
    const serialized = JSON.stringify(state);
    localStorage.setItem(STATE_KEY, serialized);
  } catch (err) {
    console.error('[State] Save error:', err);
  }
}

export function cleanupGPSTraces() {
  if (state.gpsTraces && Array.isArray(state.gpsTraces)) {
    if (state.gpsTraces.length > 500) {
      const removed = state.gpsTraces.length - 500;
      state.gpsTraces = state.gpsTraces.slice(-500);
      console.log('[GPS] Cleaned up', removed, 'old GPS points. Remaining:', state.gpsTraces.length);
    }
  }
}

window.saveState = saveState;

// ============================================================================
// CATEGORIES (POI TYPES)
// ============================================================================

export const CATS = {
  all: { label: 'Tutti', icon: '📍' },
  poi: { label: 'Luoghi', icon: '📍' },
  unclassified: { label: 'Da categorizzare', icon: '❓' },
  shrine: { label: 'Santuari', icon: '⛩️' },
  temple: { label: 'Templi', icon: '🏯' },
  church: { label: 'Chiese', icon: '⛪' },
  restaurant: { label: 'Ristoranti', icon: '🍜' },
  cafe: { label: 'Caffè', icon: '☕' },
  hotel: { label: 'Hotel', icon: '🏨' },
  park: { label: 'Parchi', icon: '🌳' },
  museum: { label: 'Musei', icon: '🏛️' },
  station: { label: 'Stazioni', icon: '🚉' },
  hospital: { label: 'Ospedali', icon: '🏥' },
  shop: { label: 'Negozi', icon: '🛒' },
  nature: { label: 'Natura', icon: '🌿' },
  food: { label: 'Cibo', icon: '🍽️' }
};

export const CITIES = [
  'Sapporo', 'Nikko', 'Tokyo', 'Kamakura', 'Shirakawa-go', 'Kyoto',
  'Osaka', 'Tottori', 'Beppu', 'Okinawa', 'Hiroshima', 'Nara',
  'Hakone', 'Kanazawa', 'Nagasaki', 'Fukuoka', 'Matsuyama',
  'Naoshima', 'Yakushima', 'Takayama', 'Kumamoto', 'Kagoshima',
  'Sendai', 'Aomori', 'Toyama', 'Tokushima', 'Yamaguchi', 'Shimane',
  'Ise', 'Gifu', 'Nagano', 'Fuji', 'Izu', 'Nagoya', 'Takamatsu', 'Kobe', 'Yokohama'
];

export const CITY_COORDS = {
  Sapporo: [43.06, 141.35],
  Nikko: [36.75, 139.6],
  Tokyo: [35.68, 139.76],
  Kamakura: [35.32, 139.55],
  'Shirakawa-go': [36.26, 136.91],
  Kyoto: [35.01, 135.77],
  Osaka: [34.68, 135.5],
  Tottori: [35.5, 134.23],
  Beppu: [33.3, 131.5],
  Okinawa: [26.2, 127.69],
  Hiroshima: [34.39, 132.45],
  Nara: [34.68, 135.83],
  Hakone: [35.23, 139.03],
  Kanazawa: [36.56, 136.66],
  Nagasaki: [32.74, 129.87],
  Fukuoka: [33.59, 130.4],
  Matsuyama: [33.84, 132.77],
  Naoshima: [34.46, 133.99],
  Yakushima: [30.33, 130.55],
  Takayama: [36.14, 137.25],
  Kumamoto: [32.8, 130.71],
  Kagoshima: [31.59, 130.56],
  Sendai: [38.27, 140.87],
  Aomori: [40.82, 140.75],
  Toyama: [36.7, 137.21],
  Tokushima: [34.07, 134.55],
  Yamaguchi: [34.18, 131.47],
  Shimane: [35.47, 133.05],
  Ise: [34.49, 136.71],
  Gifu: [35.42, 136.76],
  Nagano: [36.65, 138.19],
  Fuji: [35.36, 138.73],
  Izu: [34.97, 138.95],
  Nagoya: [35.18, 136.91],
  Takamatsu: [34.34, 134.04],
  Kobe: [34.69, 135.19],
  Yokohama: [35.45, 139.64],
  Akita: [39.72, 140.1]
};

// ============================================================================
// DEVICE DETECTION
// ============================================================================

export const deviceInfo = (() => {
  const ua = navigator.userAgent.toLowerCase();
  return {
    isIOS: /iphone|ipad|ipod|macintosh|mac os/.test(ua),
    isAndroid: /android|aarch64|arm64/.test(ua),
    isMobile: (navigator.maxTouchPoints > 1 || /mobile|android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua)) && !/macintosh|mac os/.test(ua),
    isChrome: /chrome|crios/.test(ua) && !/edg/.test(ua),
    isEdge: /edg/.test(ua),
    isFirefox: /firefox|fxios/.test(ua),
    isSafari: /safari|version.*mobile/.test(ua) && !/chrome/.test(ua) && !/edg/.test(ua),
    isStandalone: window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  };
})();

export const tier = (() => {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 2 || cores <= 2) {
    document.body.classList.add('low-tier');
    return 'low';
  }
  if (mem <= 4 || cores <= 4) return 'mid';
  return 'high';
})();

// ============================================================================
// DEBUG PANEL
// ============================================================================

export const debugLogs = [];
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;

export function addDebugLog(msg, type = 'log') {
  if (debugLogs.length > 20) debugLogs.shift();
  debugLogs.push({
    msg,
    type,
    time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  });
  updateDebugPanel();
}

export function updateDebugPanel() {
  const panel = document.getElementById('debug-panel');
  const contentEl = document.getElementById('debug-content');
  if (!panel || !contentEl) return;

  const hasErrors = debugLogs.some(l => l.type === 'error');
  const hasRelevant = debugLogs.some(l =>
    l.msg.includes('[RTDB]') || l.msg.includes('[Group]') ||
    l.msg.includes('[FirebaseRTDB]') || l.msg.includes('[GPS]')
  );
  const gpsActive = window.state?.gpsEnabled || window.state?.group;
  panel.style.display = (hasErrors || hasRelevant || gpsActive) ? 'block' : 'none';

  contentEl.innerHTML = debugLogs
    .filter(l =>
      l.msg.includes('[RTDB]') || l.msg.includes('[Group]') ||
      l.msg.includes('[FirebaseRTDB]') || l.msg.includes('[GPS]') ||
      l.type === 'error'
    )
    .map(l => `<div style="color:${l.type === 'error' ? '#FF6B6B' : '#00FF88'};margin:2px 0;word-break:break-all">[${l.time}] ${l.msg.substring(0, 150)}</div>`)
    .join('');
}

// Override console
console.log = function (...args) { origLog(...args); addDebugLog(args.join(' ')); };
console.error = function (...args) { origError(...args); addDebugLog(args.join(' '), 'error'); };
console.warn = function (...args) { origWarn(...args); addDebugLog(args.join(' '), 'warn'); };

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${type === 'error' ? '#FF5252' : type === 'success' ? '#4CAF50' : '#2196F3'};
    color: white;
    padding: 16px;
    margin: 8px;
    border-radius: 8px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ============================================================================
// GPS UTILITIES
// ============================================================================

export function getGpsRadiusKm(zoom) {
  if (zoom < 5) return 25;
  if (zoom < 8) return 15;
  if (zoom < 10) return 8;
  if (zoom < 12) return 5;
  if (zoom < 14) return 3;
  return 2;
}

// ============================================================================
// INIT LOG
// ============================================================================

console.log('[Core] ✓ Core module loaded');
console.log('[Device] Tier:', tier, 'Mobile:', deviceInfo.isMobile, 'Standalone:', deviceInfo.isStandalone);
