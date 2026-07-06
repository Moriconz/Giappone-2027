/**
 * GF Places Database Loader
 * Loads seed data on first run, merges with user additions
 */

const GF_DB_KEY = 'safeEats_gf_places_v1';
// Prima puntava a ./data/gf-places-seed.json, che non è mai esistito: il seed
// non si è mai caricato, il DB curato GF partiva sempre vuoto. Il file reale
// coi 17 locali curati (safety_level, certificazioni) è alla radice.
const GF_SEED_URL = './fmgf_japan_restaurants.json';

/**
 * Initialize GF places database with seed
 */
async function initGFPlacesDatabase() {
  try {
    // Check if seed already loaded
    const existing = localStorage.getItem(GF_DB_KEY);
    if (existing) {
      console.log('[GFPlaces] Database already initialized');
      return JSON.parse(existing);
    }

    // Fetch seed data
    const response = await fetch(GF_SEED_URL);
    if (!response.ok) {
      console.warn('[GFPlaces] Could not fetch seed data');
      return [];
    }

    const seedData = await response.json();
    // fmgf_japan_restaurants.json è un array nudo, non {places:[...]}
    const places = Array.isArray(seedData) ? seedData : (seedData.places || []);

    // Save to localStorage
    localStorage.setItem(GF_DB_KEY, JSON.stringify(places));
    console.log(`[GFPlaces] ✓ Loaded ${places.length} GF places from seed`);

    return places;
  } catch (err) {
    console.error('[GFPlaces] Error loading seed:', err);
    return [];
  }
}

/**
 * Get all GF places
 */
function getGFPlaces() {
  const data = localStorage.getItem(GF_DB_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Get GF place by ID
 */
function getGFPlaceById(placeId) {
  const places = getGFPlaces();
  return places.find(p => p.id === placeId);
}

/**
 * Get GF places by city
 */
function getGFPlacesByCity(city) {
  const places = getGFPlaces();
  return places.filter(p => p.city.toLowerCase() === city.toLowerCase());
}

/**
 * Get GF places by safety level
 */
function getGFPlacesBySafetyLevel(level) {
  const places = getGFPlaces();
  return places.filter(p => p.safety_level === level.toUpperCase());
}

/**
 * Add new GF place (user-contributed)
 */
function addGFPlace(place) {
  const places = getGFPlaces();
  const newPlace = {
    id: `gf_user_${Date.now()}`,
    added_at: new Date().toISOString(),
    ...place
  };
  places.push(newPlace);
  localStorage.setItem(GF_DB_KEY, JSON.stringify(places));
  console.log('[GFPlaces] ✓ Place added:', newPlace.id);
  return newPlace;
}

/**
 * Search GF places by name/area
 */
function searchGFPlaces(query) {
  const places = getGFPlaces();
  const q = query.toLowerCase();
  return places.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.area.toLowerCase().includes(q) ||
    p.city.toLowerCase().includes(q) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
  );
}

/**
 * Get places within distance (km)
 */
function getGFPlacesNearby(lat, lng, radiusKm = 5) {
  const places = getGFPlaces();
  const R = 6371; // Earth radius in km

  return places.filter(p => {
    const dLat = (p.lat - lat) * Math.PI / 180;
    const dLng = (p.lng - lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radiusKm;
  }).sort((a, b) => {
    const distA = Math.hypot(a.lat - lat, a.lng - lng);
    const distB = Math.hypot(b.lat - lat, b.lng - lng);
    return distA - distB;
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGFPlacesDatabase);
} else {
  initGFPlacesDatabase();
}

// Expose to global
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
