/**
 * GOOGLE PLACES LOADER — Smart POI loading from Google Places API
 *
 * - GPS-based loading with progressive radius expansion
 * - Automatic viewport-based discovery
 * - Cache integration (1 month TTL)
 * - Minimizes API calls within quota
 * - Auto-expands radius if needed
 */

// 3 tiers instead of 6 — cuts Nearby Search calls by ~50%
const RADIUS_TIERS = [1000, 5000, 20000]; // meters: 1km, 5km, 20km
const GPS_UPDATE_INTERVAL = 30000; // Check GPS every 30s
const LOAD_TIMEOUT = 10000; // 10s timeout per request

let currentGPS = null;
let loadedRadii = new Set();
let loadInProgress = new Set();

// Debounce caricamento POI su pan/zoom mappa: coalesce gli eventi moveend ravvicinati
let _poiLoadDebounce = null;
function debouncedLoadNearbyPOIs(lat, lng, delay = 500) {
  clearTimeout(_poiLoadDebounce);
  _poiLoadDebounce = setTimeout(() => loadNearbyPOIs(lat, lng), delay);
}

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

  // FALLBACK: If no GPS, use Tokyo center for testing
  if (!gpsCoords) {
    console.warn('[GooglePlacesLoader] No GPS available. Using Tokyo fallback for testing.');
    gpsCoords = { lat: 35.6762, lng: 139.6503 }; // Tokyo center
  }

  if (gpsCoords) {
    currentGPS = gpsCoords;
    console.log(`[GooglePlacesLoader] Starting with coordinates: ${currentGPS.lat.toFixed(4)}, ${currentGPS.lng.toFixed(4)}`);
    loadNearbyPOIs(currentGPS.lat, currentGPS.lng);
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
  // Wait for map to be properly initialized before attaching event listener
  if (window.map && typeof window.map.on === 'function') {
    try {
      window.map.on('moveend', () => {
        try {
          const view = window.map.getView();
          const center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
          const newLat = center[1];
          const newLng = center[0];

          // Load POIs from new map center if moved significantly (1500m threshold to reduce API calls)
          const distance = currentGPS ? getDistance(currentGPS.lat, currentGPS.lng, newLat, newLng) : Infinity;
          if (distance > 1500) {
            currentGPS = { lat: newLat, lng: newLng };
            console.log(`[GooglePlacesLoader] Map moved ${distance.toFixed(0)}m, loading POIs from: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
            debouncedLoadNearbyPOIs(newLat, newLng);
          } else {
            console.log(`[GooglePlacesLoader] Map moved ${distance.toFixed(0)}m (threshold 300m) - skipped load`);
          }
        } catch (err) {
          console.error('[GooglePlacesLoader] Error in moveend handler:', err);
        }
      });
      console.log('[GooglePlacesLoader] Map moveend listener attached');
    } catch (err) {
      console.error('[GooglePlacesLoader] Could not attach moveend listener:', err);
    }
  } else {
    console.warn('[GooglePlacesLoader] window.map not ready or does not have .on() method - will retry');
    // Retry in 500ms
    setTimeout(() => {
      if (window.map && typeof window.map.on === 'function') {
        window.map.on('moveend', () => {
          try {
            const view = window.map.getView();
            const center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
            const newLat = center[1];
            const newLng = center[0];
            const distance = currentGPS ? getDistance(currentGPS.lat, currentGPS.lng, newLat, newLng) : Infinity;
            if (distance > 1500) {
              currentGPS = { lat: newLat, lng: newLng };
              debouncedLoadNearbyPOIs(newLat, newLng);
            }
          } catch (err) {
            console.error('[GooglePlacesLoader] Error in moveend handler (retry):', err);
          }
        });
        console.log('[GooglePlacesLoader] Map moveend listener attached (retry)');
      }
    }, 500);
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

  // Determina la città della ricerca tramite reverse-geocoding
  let searchCity = null;
  try {
    searchCity = await getCityFromCoordinates(lat, lng);
    if (searchCity) {
      console.log(`🏙️ Search city determined: ${searchCity}`);
    }
  } catch (err) {
    console.warn('[GooglePlacesLoader] Failed to determine search city:', err);
  }

  // Salva la città della ricerca in una variabile globale per usarla nella trasformazione
  window.__searchCity = searchCity;

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
      try {
        // Add zone to all POIs based on their coordinates
        const poisWithZone = pois.map(poi => ({
          ...poi,
          searchCity: getZoneFromCoordinates(poi.geometry.location.lat, poi.geometry.location.lng) || undefined
        }));

        // Save POIs with zone to cache
        console.log(`[GooglePlacesLoader] Saving ${poisWithZone.length} POIs to cache (zones determined by coordinates)...`);
        await window.GooglePlacesCache.savePOIs(lat, lng, radiusM, poisWithZone);
        console.log(`[GooglePlacesLoader] Cache save complete`);

        // Then transform for display
        console.log(`[GooglePlacesLoader] About to transform ${pois.length} POIs...`);
        await renderMarkersFromGoogle(pois);
        console.log(`[GooglePlacesLoader] Rendering complete`);
      } catch (err) {
        console.error(`[GooglePlacesLoader] ERROR at ${radiusM}m:`, err);
      }
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
// Tipi Google generici/amministrativi: non determinano la categoria (si cerca un tipo più specifico)
const GENERIC_GOOGLE_TYPES = new Set([
  'point_of_interest', 'establishment', 'premise', 'subpremise', 'geocode',
  'political', 'plus_code', 'route', 'street_address', 'intersection',
  'locality', 'sublocality', 'postal_code', 'food', 'store', 'health'
]);

// Mappa COMPLETA tipi Google Places (legacy + nuova API) → categorie specifiche dell'app
// (le chiavi target esistono in CAT_EMOJI/CAT_COLORS, così ogni POI ha marker dedicato)
const GOOGLE_TYPE_MAP = {
  // ── Cibo & ristorazione ───────────────────────────────
  restaurant: 'restaurant', japanese_restaurant: 'restaurant', sushi_restaurant: 'restaurant',
  ramen_restaurant: 'restaurant', tempura_restaurant: 'restaurant', italian_restaurant: 'restaurant',
  chinese_restaurant: 'restaurant', french_restaurant: 'restaurant', indian_restaurant: 'restaurant',
  korean_restaurant: 'restaurant', thai_restaurant: 'restaurant', seafood_restaurant: 'restaurant',
  steak_house: 'restaurant', pizza_restaurant: 'restaurant', hamburger_restaurant: 'restaurant',
  fast_food_restaurant: 'restaurant', vegetarian_restaurant: 'restaurant', vegan_restaurant: 'restaurant',
  barbecue_restaurant: 'restaurant', breakfast_restaurant: 'restaurant', brunch_restaurant: 'restaurant',
  meal_delivery: 'meal_delivery', meal_takeaway: 'meal_takeaway',
  cafe: 'cafe', coffee_shop: 'cafe', cat_cafe: 'cafe', tea_house: 'cafe', ice_cream_shop: 'cafe', dessert_shop: 'cafe',
  bakery: 'bakery', bar: 'bar', pub: 'bar', wine_bar: 'bar', night_club: 'bar', liquor_store: 'bar', drinking_bar: 'bar',
  // ── Culto ─────────────────────────────────────────────
  shinto_shrine: 'shrine', shrine: 'shrine',
  buddhist_temple: 'temple', hindu_temple: 'temple', temple: 'temple',
  church: 'church', mosque: 'mosque', synagogue: 'synagogue', place_of_worship: 'temple',
  // ── Cultura & landmark ───────────────────────────────
  museum: 'museum', art_gallery: 'gallery', library: 'library',
  historical_landmark: 'historical_landmark', historical_place: 'historical_landmark',
  monument: 'monument', cultural_landmark: 'culture', cultural_institution: 'culture',
  tourist_attraction: 'landmark', landmark: 'landmark', observation_deck: 'viewpoint',
  performing_arts_theater: 'theatre', concert_hall: 'theatre', movie_theater: 'movie_theater', casino: 'entertainment',
  // ── Natura & parchi ──────────────────────────────────
  park: 'park', national_park: 'park', state_park: 'park', dog_park: 'park',
  garden: 'garden', botanical_garden: 'botanical_garden', zoo: 'zoo', aquarium: 'aquarium',
  amusement_park: 'amusement_park', theme_park: 'amusement_park', water_park: 'amusement_park',
  natural_feature: 'natural_feature', hiking_area: 'hiking_area', beach: 'natural_feature',
  scenic_spot: 'scenic_spot', viewpoint: 'viewpoint', marina: 'water',
  // ── Shopping ─────────────────────────────────────────
  shopping_mall: 'shopping_mall', department_store: 'department_store', supermarket: 'supermarket',
  grocery_store: 'supermarket', convenience_store: 'convenience_store', clothing_store: 'clothing_store',
  shoe_store: 'shoe_store', book_store: 'book_store', jewelry_store: 'jewelry_store',
  electronics_store: 'electronics_store', cell_phone_store: 'electronics_store', furniture_store: 'furniture_store',
  home_goods_store: 'home_goods_store', hardware_store: 'home_goods_store', florist: 'florist',
  toy_store: 'toy_store', pet_store: 'shop', sporting_goods_store: 'shop', gift_shop: 'shop',
  market: 'market', pharmacy: 'pharmacy', drugstore: 'pharmacy', store: 'shop', shop: 'shop',
  // ── Alloggio ─────────────────────────────────────────
  hotel: 'hotel', lodging: 'hotel', inn: 'hotel', motel: 'hotel', resort_hotel: 'hotel',
  hostel: 'hostel', guest_house: 'guest_house', bed_and_breakfast: 'guest_house',
  campground: 'campground', rv_park: 'campground', apartment_building: 'apartment_building', apartment_complex: 'apartment_building',
  // ── Benessere & salute ───────────────────────────────
  spa: 'spa', public_bath: 'onsen', sauna: 'onsen', gym: 'gym', fitness_center: 'gym', yoga_studio: 'yoga_studio',
  hospital: 'hospital', clinic: 'clinic', doctor: 'doctor', dentist: 'dentist',
  physiotherapist: 'physiotherapist', beauty_salon: 'beauty_salon', hair_care: 'hair_care', hair_salon: 'hair_care', massage: 'massage',
  // ── Trasporti ────────────────────────────────────────
  train_station: 'train_station', subway_station: 'train_station', light_rail_station: 'train_station',
  transit_station: 'station', bus_station: 'bus_station', bus_stop: 'bus_station',
  airport: 'airport', international_airport: 'airport', parking: 'parking', parking_lot: 'parking',
  taxi_stand: 'taxi_stand', car_rental: 'car_rental', gas_station: 'gas_station', ferry_terminal: 'transport',
  // ── Servizi ──────────────────────────────────────────
  bank: 'bank', atm: 'atm', post_office: 'post_office', real_estate_agency: 'real_estate_agency',
  travel_agency: 'travel_agency', insurance_agency: 'insurance_agency', accounting: 'accounting',
  lawyer: 'attorney', attorney: 'attorney', car_repair: 'car_repair', car_wash: 'car_wash',
  laundry: 'laundry', dry_cleaner: 'dry_cleaner', locksmith: 'locksmith', electrician: 'electrician',
  plumber: 'plumber', police: 'services', fire_station: 'services', city_hall: 'services',
  local_government_office: 'services', embassy: 'services', courthouse: 'services', internet_cafe: 'internet_cafe',
  // ── Istruzione / sport / intrattenimento ─────────────
  school: 'school', primary_school: 'school', secondary_school: 'school', university: 'school',
  stadium: 'sports', sports_complex: 'sports', sports_club: 'sports', bowling_alley: 'entertainment',
  // ── Quartieri ────────────────────────────────────────
  neighborhood: 'neighborhood'
};

function mapGoogleTypesToCategory(types) {
  if (!types || !Array.isArray(types) || !types.length) return 'poi';

  // 1ª passata: primo tipo SPECIFICO mappato (salta i generici)
  for (const type of types) {
    if (GENERIC_GOOGLE_TYPES.has(type)) continue;
    if (GOOGLE_TYPE_MAP[type]) return GOOGLE_TYPE_MAP[type];
  }
  // 2ª passata: tipi generici "morbidi" che comunque danno un'idea
  if (types.includes('food')) return 'restaurant';
  if (types.includes('store')) return 'shop';
  if (types.includes('health')) return 'wellness';

  console.warn(`[GooglePlacesLoader] Unmapped types: ${types.join(', ')}`);
  return 'poi';
}

// Zone geografiche giapponesi con bounding box (min_lat, max_lat, min_lng, max_lng)
// Expanded to cover gaps between zones
const JAPAN_ZONES = [
  { name: 'Hokkaido', min_lat: 41.4, max_lat: 45.5, min_lng: 139.2, max_lng: 148.6 },
  { name: 'Tokyo', min_lat: 35.3, max_lat: 36.1, min_lng: 139.2, max_lng: 140.5 },
  { name: 'Nagano', min_lat: 36.1, max_lat: 37.2, min_lng: 137.0, max_lng: 138.6 },
  { name: 'Kyoto', min_lat: 34.8, max_lat: 35.4, min_lng: 135.4, max_lng: 136.2 },
  { name: 'Osaka', min_lat: 34.3, max_lat: 35.0, min_lng: 135.2, max_lng: 135.9 },
  { name: 'Kobe', min_lat: 34.2, max_lat: 34.8, min_lng: 134.9, max_lng: 135.5 },
  { name: 'Okayama', min_lat: 34.4, max_lat: 35.1, min_lng: 133.8, max_lng: 134.5 },
  { name: 'Hiroshima', min_lat: 34.1, max_lat: 34.8, min_lng: 131.8, max_lng: 133.2 },
  { name: 'Fukuoka', min_lat: 32.5, max_lat: 33.8, min_lng: 129.9, max_lng: 131.4 },
  { name: 'Kitakyushu', min_lat: 33.7, max_lat: 34.2, min_lng: 130.7, max_lng: 131.1 }
];

// Determina la zona basata sulle coordinate
function getZoneFromCoordinates(lat, lng) {
  for (const zone of JAPAN_ZONES) {
    if (lat >= zone.min_lat && lat <= zone.max_lat &&
        lng >= zone.min_lng && lng <= zone.max_lng) {
      return zone.name;
    }
  }
  return null;
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

// Transform raw Google Places POI data to standard format
function transformGooglePlacesPOIs(pois) {
  if (!pois || pois.length === 0) return [];

  // Helper: estrai città dall'indirizzo (formato: "Name, City, Prefecture, Country")
  function extractCity(address) {
    if (!address) return undefined;
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) return parts[1];  // Ritorna City/Prefecture
    return parts.length > 0 ? parts[0] : undefined;
  }

  return pois.map((poi, idx) => {
    try {
      // Verifica che poi sia valido
      if (!poi || typeof poi !== 'object') {
        console.warn(`[GooglePlacesLoader] Skipping invalid POI at index ${idx}`);
        return null;
      }

      // Se è già trasformato, restituiscilo — ri-categorizzando i POI legacy
      // finiti in 'poi' con la mappa aggiornata (es. cache IndexedDB pre-fix).
      if (poi.lat !== undefined && poi.lng !== undefined && poi.id) {
        if ((!poi.cat || poi.cat === 'poi') && Array.isArray(poi.types) && poi.types.length) {
          poi.cat = mapGoogleTypesToCategory(poi.types);
        }
        return poi;
      }

      // Altrimenti, trasformalo da Google Places API format
      if (!poi.geometry?.location?.lat || !poi.geometry?.location?.lng) {
        console.warn(`[GooglePlacesLoader] Skipping POI without valid coordinates:`, poi.name);
        return null;
      }

      return {
        // Generate unique ID for Google Places POI
        id: `gp_${poi.place_id || `poi_${Date.now()}_${idx}`}`,
        googlePlaceId: poi.place_id,
        name: poi.name,
        lat: poi.geometry.location.lat,
        lng: poi.geometry.location.lng,
        address: poi.vicinity || poi.formatted_address || '',
        city: window.__searchCity || extractCity(poi.vicinity || poi.formatted_address || ''),
        rating: poi.rating || null,
        ratingCount: poi.user_ratings_total || 0,
        types: poi.types || [],
        cat: mapGoogleTypesToCategory(poi.types),
        businessStatus: poi.business_status || 'OPERATIONAL',
        icon: poi.icon || null,
        photos: (poi.photos || []).map((p) => ({
          url: `/api/placePhoto?reference=${encodeURIComponent(p.photo_reference)}&maxwidth=800`,
          reference: p.photo_reference,
          height: p.height,
          width: p.width,
          attribution: p.html_attributions || []
        })),
        openNow: poi.opening_hours?.open_now || null,
        fromGooglePlaces: true
      };
    } catch (err) {
      console.error(`[GooglePlacesLoader] Error transforming POI at index ${idx}:`, err, poi);
      return null;
    }
  }).filter(p => p !== null);
}

// Render markers from Google Places POI data
async function renderMarkersFromGoogle(pois) {
  if (!pois || pois.length === 0) return [];

  console.log(`[GooglePlacesLoader] Rendering ${pois.length} markers from Google Places`);

  // Transform POIs to standard format
  const transformedPois = transformGooglePlacesPOIs(pois);
  console.log(`[GooglePlacesLoader] Transformed ${transformedPois.length} POIs with IDs and categories`);

  // Dispatch event for main app to render markers
  window.dispatchEvent(new CustomEvent('google-places-pois-loaded', {
    detail: { pois: transformedPois }
  }));

  // Enrichisci POI con cities via reverse-geocoding (in background, non blocca UI)
  // Disabilitato temporaneamente per debugging
  // enrichPOIsWithCities(transformedPois)...

  // Restituisci i POI trasformati per salvarli in cache
  return transformedPois;
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
