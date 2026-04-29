/**
 * GOOGLE PLACES LOADER — Smart POI loading from Google Places API
 *
 * - GPS-based loading with progressive radius expansion
 * - Automatic viewport-based discovery
 * - Cache integration (1 month TTL)
 * - Minimizes API calls within quota
 * - Auto-expands radius if needed
 */

const RADIUS_TIERS = [1000, 2000, 5000, 10000, 20000, 50000]; // meters: 1km, 2km, 5km, 10km, 20km, 50km
const GPS_UPDATE_INTERVAL = 30000; // Check GPS every 30s
const LOAD_TIMEOUT = 10000; // 10s timeout per request

let currentGPS = null;
let loadedRadii = new Set();
let loadInProgress = new Set();

// Wait for GPS coordinates to be available
async function waitForGPS(maxWaitMs = 25000, pollIntervalMs = 500) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (window.state?.gpsCurrentLat && window.state?.gpsCurrentLng) {
      console.log(`[GooglePlacesLoader] GPS coordinates found: ${window.state.gpsCurrentLat.toFixed(4)}, ${window.state.gpsCurrentLng.toFixed(4)}`);
      return { lat: window.state.gpsCurrentLat, lng: window.state.gpsCurrentLng };
    }
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  console.warn(`[GooglePlacesLoader] GPS coordinates not available after ${maxWaitMs}ms`);
  return null;
}

// Initialize loader
async function initGooglePlacesLoader() {
  console.log('[GooglePlacesLoader] Initializing...');

  await window.GooglePlacesCache.initDB();

  // Wait for GPS coordinates (from window.state for testing, or navigator.geolocation for production)
  let gpsCoords = await waitForGPS();

  if (gpsCoords) {
    currentGPS = gpsCoords;
    console.log(`[GooglePlacesLoader] Starting with GPS: ${currentGPS.lat.toFixed(4)}, ${currentGPS.lng.toFixed(4)}`);
    loadNearbyPOIs(currentGPS.lat, currentGPS.lng);
  } else {
    console.warn('[GooglePlacesLoader] No GPS coordinates available');
  }

  // Monitor GPS for changes (optional: use navigator.geolocation if available)
  if (navigator.geolocation && false) { // Disabled for now - using window.state GPS
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

  // Listen for map movements and load POIs accordingly
  if (window.map) {
    window.map.on('moveend', () => {
      const view = window.map.getView();
      const center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
      const newLat = center[1];
      const newLng = center[0];

      // Load POIs from new map center if moved significantly (300m threshold for responsive updates)
      const distance = currentGPS ? getDistance(currentGPS.lat, currentGPS.lng, newLat, newLng) : Infinity;
      if (distance > 300) {
        currentGPS = { lat: newLat, lng: newLng };
        console.log(`[GooglePlacesLoader] Map moved ${distance.toFixed(0)}m, loading POIs from: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
        loadNearbyPOIs(newLat, newLng);
      } else {
        console.log(`[GooglePlacesLoader] Map moved ${distance.toFixed(0)}m (threshold 300m) - skipped load`);
      }
    });
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
  console.log(`%c[GooglePlacesLoader] Starting loadNearbyPOIs`, 'background: #4A7C59; color: white; font-weight: bold');
  console.log(`📍 Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  console.log(`📊 Will check ${RADIUS_TIERS.length} radius tiers`);

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

// Map Google Places types to app categories
function mapGoogleTypesToCategory(types) {
  if (!types || !Array.isArray(types)) return 'poi';

  const typeMap = {
    // FOOD & DINING
    'restaurant': 'food', 'cafe': 'food', 'bakery': 'food', 'bar': 'food',
    'night_club': 'food', 'meal_delivery': 'food', 'meal_takeaway': 'food',
    'food': 'food', 'drinking_bar': 'food', 'liquor_store': 'food',
    // ACCOMMODATION
    'hotel': 'accommodation', 'lodging': 'accommodation', 'hostel': 'accommodation',
    'apartment_building': 'accommodation', 'guest_house': 'accommodation',
    'campground': 'accommodation', 'rv_park': 'accommodation',
    // CULTURE & LANDMARKS
    'museum': 'culture', 'library': 'culture', 'art_gallery': 'culture',
    'temple': 'culture', 'church': 'culture', 'mosque': 'culture',
    'tourist_attraction': 'culture', 'landmark': 'culture', 'synagogue': 'culture',
    'buddhist_temple': 'culture', 'hindu_temple': 'culture', 'point_of_interest': 'culture',
    // SHOPPING
    'shopping_mall': 'shopping', 'store': 'shopping', 'supermarket': 'shopping',
    'clothing_store': 'shopping', 'shoe_store': 'shopping', 'pharmacy': 'shopping',
    'department_store': 'shopping', 'home_goods_store': 'shopping', 'jewelry_store': 'shopping',
    'book_store': 'shopping', 'electronics_store': 'shopping', 'furniture_store': 'shopping',
    // NATURE & PARKS
    'park': 'nature', 'natural_feature': 'nature', 'amusement_park': 'nature',
    'zoo': 'nature', 'botanical_garden': 'nature', 'aquarium': 'nature',
    // WELLNESS & HEALTH
    'spa': 'wellness', 'gym': 'wellness', 'health': 'wellness', 'dentist': 'wellness',
    'hospital': 'wellness', 'doctor': 'wellness', 'physiotherapist': 'wellness',
    'beauty_salon': 'wellness', 'hair_care': 'wellness',
    // SERVICES
    'fire_station': 'services', 'police': 'services', 'post_office': 'services',
    'bank': 'services', 'atm': 'services', 'movie_rental': 'services',
    // TRANSPORT
    'train_station': 'transport', 'bus_station': 'transport', 'airport': 'transport',
    'parking': 'transport', 'car_rental': 'transport', 'taxi_stand': 'transport',
    // FALLBACK
    'establishment': 'poi', 'place_of_worship': 'culture'
  };

  for (const type of types) {
    if (typeMap[type]) return typeMap[type];
  }

  // Log unmapped types for debugging
  console.warn(`[GooglePlacesLoader] Unmapped types: ${types.join(', ')}`);
  return 'poi';
}

// Reverse-geocode coordinates to get city name
async function getCityFromCoordinates(lat, lng) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    if (!response.ok) return null;

    const data = await response.json();
    const address = data.address || {};

    // Priorizza city > town > village > county
    return address.city || address.town || address.village || address.county || null;
  } catch (err) {
    console.warn(`[GooglePlacesLoader] Reverse-geo error at ${lat}, ${lng}:`, err);
    return null;
  }
}

// Enrichisci POI con city da reverse-geocoding (in background)
async function enrichPOIsWithCities(pois) {
  const geoCache = {};
  let enriched = 0;

  for (const poi of pois) {
    if (poi.city) continue; // Ha già city, skip

    const cacheKey = `${Math.round(poi.lat * 1000)}_${Math.round(poi.lng * 1000)}`;

    if (geoCache[cacheKey]) {
      poi.city = geoCache[cacheKey];
      enriched++;
      continue;
    }

    const city = await getCityFromCoordinates(poi.lat, poi.lng);
    if (city) {
      geoCache[cacheKey] = city;
      poi.city = city;
      enriched++;

      // Delay per evitare rate limiting di Nominatim (1 richiesta ogni 100ms)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[GooglePlacesLoader] Enriched ${enriched} POIs with cities via reverse-geocoding`);
  return pois;
}

// Render markers from Google Places POI data
async function renderMarkersFromGoogle(pois) {
  if (!pois || pois.length === 0) return;

  console.log(`[GooglePlacesLoader] Rendering ${pois.length} markers from Google Places`);

  // Helper: estrai città dall'indirizzo (formato: "Name, City, Prefecture, Country")
  function extractCity(address) {
    if (!address) return undefined;
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) return parts[1];  // Ritorna City/Prefecture
    return parts.length > 0 ? parts[0] : undefined;
  }

  // Transform POIs to standard format (extract lat/lng from geometry)
  // Handle both raw Google Places data and already-transformed cache data
  const transformedPois = pois.map((poi, idx) => {
    // Check if POI is already transformed (from cache) or raw (from API)
    const isAlreadyTransformed = poi.lat !== undefined && poi.lng !== undefined && !poi.geometry;

    return {
      // Generate unique ID for Google Places POI
      id: poi.id || `gp_${poi.place_id || poi.googlePlaceId || `poi_${Date.now()}_${idx}`}`,
      googlePlaceId: poi.googlePlaceId || poi.place_id,
      name: poi.name,
      lat: isAlreadyTransformed ? poi.lat : poi.geometry.location.lat,
      lng: isAlreadyTransformed ? poi.lng : poi.geometry.location.lng,
      address: poi.address || poi.vicinity || poi.formatted_address || '',
      city: poi.city || extractCity(poi.vicinity || poi.formatted_address || ''),
      rating: poi.rating || null,
      ratingCount: poi.ratingCount || poi.user_ratings_total || 0,
      types: poi.types || [],
      cat: poi.cat || mapGoogleTypesToCategory(poi.types),
      businessStatus: poi.businessStatus || poi.business_status || 'OPERATIONAL',
      icon: poi.icon || null,
      photos: (poi.photos || []).map((p, photoIdx) => {
        // Handle both raw and transformed photo data
        if (p.url) return p; // Already transformed
        return {
          url: `/api/placePhoto?reference=${encodeURIComponent(p.photo_reference)}&maxwidth=800`,
          reference: p.photo_reference,
          height: p.height,
          width: p.width,
          attribution: p.html_attributions || []
        };
      }),
      openNow: poi.openNow !== undefined ? poi.openNow : (poi.opening_hours?.open_now || null),
      // Mark as Google Places POI
      fromGooglePlaces: poi.fromGooglePlaces !== undefined ? poi.fromGooglePlaces : true
    };
  });

  console.log(`[GooglePlacesLoader] Transformed ${transformedPois.length} POIs with IDs and categories`);

  // Dispatch event for main app to render markers
  window.dispatchEvent(new CustomEvent('google-places-pois-loaded', {
    detail: { pois: transformedPois }
  }));

  // Enrichisci POI con cities via reverse-geocoding (in background, non blocca UI)
  enrichPOIsWithCities(transformedPois).then(async (enrichedPois) => {
    console.log('[GooglePlacesLoader] Enrichment complete, updating cache...');
    // Aggiorna il database cache con i POI arricchiti
    for (const poi of enrichedPois) {
      if (poi.city && !poi.city.includes('Unknown')) {
        // Salva il POI aggiornato (la cache lo aggiorna)
        await window.GooglePlacesCache.savePOIs(poi.lat, poi.lng, 1000, [poi]);
      }
    }
  }).catch(err => console.warn('[GooglePlacesLoader] Enrichment error:', err));
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
  fetchGooglePlacesPOIs,
  mapGoogleTypesToCategory,
  RADIUS_TIERS
};

// Make functions globally available for use in main app
window.fetchGooglePlacesPOIs = fetchGooglePlacesPOIs;
window.mapGoogleTypesToCategory = mapGoogleTypesToCategory;

console.log('[GooglePlacesLoader] Module loaded');

// Auto-init when document ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGooglePlacesLoader);
} else {
  setTimeout(initGooglePlacesLoader, 1000);
}
