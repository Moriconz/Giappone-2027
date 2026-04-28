/**
 * GOOGLE PLACES LOADER — Smart POI loading from Google Places API
 *
 * - GPS-based loading with progressive radius expansion
 * - Automatic viewport-based discovery
 * - Cache integration (1 month TTL)
 * - Minimizes API calls within quota
 * - Auto-expands radius if needed
 */

const RADIUS_TIERS = [1000, 2000, 5000, 10000, 20000]; // meters: 1km, 2km, 5km, 10km, 20km
const GPS_UPDATE_INTERVAL = 30000; // Check GPS every 30s
const LOAD_TIMEOUT = 10000; // 10s timeout per request

let currentGPS = null;
let loadedRadii = new Set();
let loadInProgress = new Set();

// Initialize loader
async function initGooglePlacesLoader() {
  console.log('[GooglePlacesLoader] Initializing...');

  await window.GooglePlacesCache.initDB();

  // Monitor GPS for changes
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;

        // Check if GPS moved significantly
        if (!currentGPS ||
            getDistance(currentGPS.lat, currentGPS.lng, newLat, newLng) > 500) {
          currentGPS = { lat: newLat, lng: newLng };
          console.log(`[GooglePlacesLoader] GPS updated: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
          loadNearbyPOIs(newLat, newLng);
        }
      },
      (err) => console.warn('[GooglePlacesLoader] GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  // Also try to get initial GPS position
  if (window.state?.gpsCurrentLat && window.state?.gpsCurrentLng) {
    currentGPS = { lat: window.state.gpsCurrentLat, lng: window.state.gpsCurrentLng };
    loadNearbyPOIs(currentGPS.lat, currentGPS.lng);
  }

  console.log('[GooglePlacesLoader] Initialized');
}

// Haversine distance
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const toRad = (deg) => deg * (Math.PI / 180);

// Load POIs progressively from GPS
async function loadNearbyPOIs(lat, lng) {
  console.log(`[GooglePlacesLoader] Loading nearby POIs from ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

  for (const radiusM of RADIUS_TIERS) {
    // Skip if already loaded this radius from this GPS
    const key = `${Math.round(lat * 100)}_${Math.round(lng * 100)}_${radiusM}`;
    if (loadedRadii.has(key)) {
      console.log(`[GooglePlacesLoader] Radius ${radiusM}m already loaded`);
      continue;
    }

    // Check cache first
    const cached = await window.GooglePlacesCache.getCachedPOIs(lat, lng, radiusM);
    if (cached) {
      console.log(`[GooglePlacesLoader] Using cache for ${radiusM}m: ${cached.length} POIs`);
      loadedRadii.add(key);
      await renderMarkersFromGoogle(cached);
      continue;
    }

    // Load from API
    console.log(`[GooglePlacesLoader] Fetching from API: ${radiusM}m`);
    const pois = await fetchGooglePlacesPOIs(lat, lng, radiusM);

    if (pois && pois.length > 0) {
      loadedRadii.add(key);
      await window.GooglePlacesCache.savePOIs(lat, lng, radiusM, pois);
      await renderMarkersFromGoogle(pois);
      console.log(`[GooglePlacesLoader] Loaded ${pois.length} POIs at ${radiusM}m`);
    } else if (pois === null) {
      // API error or rate limited, stop expanding
      console.warn(`[GooglePlacesLoader] API error at ${radiusM}m, stopping expansion`);
      break;
    }

    // Small delay between radius tiers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Fetch from Google Places API
async function fetchGooglePlacesPOIs(lat, lng, radiusM) {
  try {
    const url = '/api/googlePlacesNearby';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, radiusM })
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[GooglePlacesLoader] Rate limited (429)');
        return null; // Stop expansion
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('[GooglePlacesLoader] API error:', data.error);
      return data.error.includes('ZERO_RESULTS') ? [] : null;
    }

    return data.results || [];
  } catch (err) {
    console.error('[GooglePlacesLoader] Fetch error:', err);
    return null;
  }
}

// Render markers from Google Places POI data
async function renderMarkersFromGoogle(pois) {
  if (!pois || pois.length === 0) return;

  console.log(`[GooglePlacesLoader] Rendering ${pois.length} markers from Google Places`);

  // Transform POIs to standard format (extract lat/lng from geometry)
  const transformedPois = pois.map(poi => ({
    // Core Google Places data
    googlePlaceId: poi.place_id,
    name: poi.name,
    lat: poi.geometry.location.lat,
    lng: poi.geometry.location.lng,
    address: poi.vicinity || poi.formatted_address || '',
    rating: poi.rating || null,
    ratingCount: poi.user_ratings_total || 0,
    types: poi.types || [],
    businessStatus: poi.business_status || 'OPERATIONAL',
    icon: poi.icon || null,
    photos: (poi.photos || []).map(p => ({
      reference: p.photo_reference,
      height: p.height,
      width: p.width,
      attribution: p.html_attributions || []
    })),
    openNow: poi.opening_hours?.open_now || null,
    // Mark as Google Places POI
    fromGooglePlaces: true
  }));

  // Dispatch event for main app to render markers
  window.dispatchEvent(new CustomEvent('google-places-pois-loaded', {
    detail: { pois: transformedPois }
  }));
}

// Get all loaded POIs from cache
async function getAllGooglePOIs() {
  return await window.GooglePlacesCache.getAllCached();
}

// Get loader stats
async function getLoaderStats() {
  const allPOIs = await getAllGooglePOIs();
  return {
    totalPOIs: allPOIs.length,
    loadedRadii: loadedRadii.size,
    currentGPS: currentGPS,
    loadInProgress: loadInProgress.size
  };
}

// Reload area (force refresh even if cached)
async function reloadArea(lat, lng) {
  console.log(`[GooglePlacesLoader] Force reload at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  loadedRadii.clear();
  await loadNearbyPOIs(lat, lng);
}

// Export
window.GooglePlacesLoader = {
  initGooglePlacesLoader,
  loadNearbyPOIs,
  getAllGooglePOIs,
  getLoaderStats,
  reloadArea,
  RADIUS_TIERS
};

console.log('[GooglePlacesLoader] Module loaded');

// Auto-init when document ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGooglePlacesLoader);
} else {
  setTimeout(initGooglePlacesLoader, 1000);
}
