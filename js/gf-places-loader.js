/**
 * GF Places Database — derivata da dati LIVE, nessun seed statico.
 *
 * Prima caricava fmgf_japan_restaurants.json (17 locali scritti a mano):
 * dato hardcoded che invecchia (locali chiudono, cambiano gestione, il
 * "senza glutine" di un menu può sparire da un giorno all'altro) e che non
 * scala oltre il Giappone. Rimosso per policy: niente dati editoriali statici
 * sul tema gluten-free, solo segnali live.
 *
 * La lista ora si ricostruisce da:
 * 1. window.allPOIs() — POI già caricati via Google Places API (live, con
 *    lat/lng/nome/città reali, zero costo aggiuntivo: sono già in memoria).
 * 2. La cache di js/services/gfDetector.js (localStorage `gf_status_<id>`,
 *    TTL 30gg) — scritta dal review-scan live che gira già quando l'utente
 *    apre il dettaglio di un POI. Nessuna chiamata API nuova: si riusa solo
 *    ciò che il detector ha già verificato per davvero.
 * 3. Aggiunte manuali dell'utente/gruppo (addGFPlace), persistite a parte.
 *
 * Risultato: "GF Places" è sempre e solo l'incrocio fra POI reali e stato
 * gluten-free realmente rilevato — mai un elenco scritto a priori.
 */

const GF_USER_ADDED_KEY = 'safeEats_gf_places_user_v1';
const GF_DETECTOR_CACHE_PREFIX = 'gf_status_'; // deve combaciare con gfDetector.js

/**
 * Nessun seed da caricare più. Mantenuta per compatibilità con i chiamanti
 * esistenti (index.html la invoca su DOMContentLoaded).
 */
async function initGFPlacesDatabase() {
  return getGFPlaces();
}

function _userAdded() {
  try {
    const data = localStorage.getItem(GF_USER_ADDED_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[GFPlaces] Errore lettura aggiunte utente:', err);
    return [];
  }
}

/**
 * Deriva i posti GF dai POI live la cui cache del detector dice 'likely'.
 * Nessuna rete: legge solo POI e cache già in memoria/localStorage.
 */
function _fromLiveDetection() {
  const pois = (typeof window.allPOIs === 'function') ? window.allPOIs() : [];
  const out = [];
  for (const poi of pois) {
    const placeId = poi.place_id || poi.id;
    if (!placeId) continue;
    let cached;
    try {
      cached = JSON.parse(localStorage.getItem(GF_DETECTOR_CACHE_PREFIX + placeId) || 'null');
    } catch (_) { continue; }
    if (!cached || cached.status !== 'likely') continue;
    if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number') continue;
    out.push({
      id: placeId,
      name: poi.name || '',
      city: poi.city || '',
      area: poi.city || '',
      lat: poi.lat,
      lng: poi.lng,
      safety_level: 'YELLOW', // review-scan = indizio, non verifica sul posto
      geo_precision: 'live_poi',
      source: 'live_detector',
      detected_at: cached.timestamp || null,
    });
  }
  return out;
}

/**
 * Get all GF places: unione di rilevamento live + aggiunte utente.
 */
function getGFPlaces() {
  return [..._fromLiveDetection(), ..._userAdded()];
}

function getGFPlaceById(placeId) {
  return getGFPlaces().find(p => p.id === placeId);
}

function getGFPlacesByCity(city) {
  const q = (city || '').toLowerCase();
  return getGFPlaces().filter(p => (p.city || '').toLowerCase() === q);
}

function getGFPlacesBySafetyLevel(level) {
  const q = (level || '').toUpperCase();
  return getGFPlaces().filter(p => p.safety_level === q);
}

/**
 * Aggiunge un posto GF segnalato manualmente dall'utente/gruppo — dato reale
 * inserito da una persona in tempo reale, non editoriale precompilato.
 */
function addGFPlace(place) {
  const places = _userAdded();
  const newPlace = {
    id: `gf_user_${Date.now()}`,
    added_at: new Date().toISOString(),
    source: 'user',
    ...place
  };
  places.push(newPlace);
  localStorage.setItem(GF_USER_ADDED_KEY, JSON.stringify(places));
  console.log('[GFPlaces] ✓ Posto aggiunto:', newPlace.id);
  return newPlace;
}

function searchGFPlaces(query) {
  const q = (query || '').toLowerCase();
  return getGFPlaces().filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.area || '').toLowerCase().includes(q) ||
    (p.city || '').toLowerCase().includes(q) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
  );
}

/**
 * Posti entro una distanza (km), via formula haversine.
 */
function getGFPlacesNearby(lat, lng, radiusKm = 5) {
  const R = 6371;
  return getGFPlaces().filter(p => {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;
    const dLat = (p.lat - lat) * Math.PI / 180;
    const dLng = (p.lng - lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c <= radiusKm;
  }).sort((a, b) => {
    const distA = Math.hypot(a.lat - lat, a.lng - lng);
    const distB = Math.hypot(b.lat - lat, b.lng - lng);
    return distA - distB;
  });
}

// Inizializzazione: non fa più fetch, resta per compatibilità coi chiamanti.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGFPlacesDatabase);
} else {
  initGFPlacesDatabase();
}

window.GFPlaces = {
  init: initGFPlacesDatabase,
  getAll: getGFPlaces,
  getById: getGFPlaceById,
  getByCity: getGFPlacesByCity,
  getBySafetyLevel: getGFPlacesBySafetyLevel,
  add: addGFPlace,
  search: searchGFPlaces,
  nearby: getGFPlacesNearby
};
