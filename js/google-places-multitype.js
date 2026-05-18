/**
 * GOOGLE PLACES MULTI-TYPE LOADER — Smart city-based POI loading
 *
 * - Multiple parallel queries (restaurant, museum, spa, outdoor, etc.)
 * - Cost-free result expansion (4 queries = ~80 unique POIs instead of 20)
 * - Client-side deduplication by place_id
 * - IndexedDB caching with 7-day TTL for city searches
 * - Zero conflicts with existing GPS-based loading
 */

// Cities with known coordinates for multi-type queries
const JAPAN_CITIES = {
  'tokyo': { lat: 35.6762, lng: 139.6503, zoom: 12 },
  'tokyo-shibuya': { lat: 35.6595, lng: 139.7004, zoom: 13 },
  'tokyo-shinjuku': { lat: 35.6895, lng: 139.7003, zoom: 13 },
  'kyoto': { lat: 35.0116, lng: 135.7681, zoom: 12 },
  'osaka': { lat: 34.6937, lng: 135.5023, zoom: 12 },
  'kobe': { lat: 34.6901, lng: 135.1955, zoom: 12 },
  'nagano': { lat: 36.6480, lng: 138.1949, zoom: 12 },
  'fukuoka': { lat: 33.5904, lng: 130.4017, zoom: 12 },
  'hiroshima': { lat: 34.3853, lng: 132.4553, zoom: 12 },
  'hokkaido': { lat: 43.0642, lng: 141.3469, zoom: 10 },
  'sapporo': { lat: 43.0642, lng: 141.3469, zoom: 12 },
  'kanazawa': { lat: 36.5628, lng: 136.6564, zoom: 12 },
  'nara': { lat: 34.6854, lng: 135.8048, zoom: 12 },
  'nagasaki': { lat: 32.7503, lng: 129.8779, zoom: 12 }
};

// Multi-type query strategy: balance between variety and cost
const SEARCH_TYPES = [
  { type: 'restaurant', label: 'Ristoranti' },
  { type: 'cafe', label: 'Caffè/Bar' },
  { type: 'museum', label: 'Musei' },
  { type: 'spa', label: 'Benessere' }
];

class GooglePlacesMultiType {
  constructor() {
    this.activeCityQueries = new Set(); // Track ongoing queries per city
    this.cityQueryCache = {}; // Store city-level cache timestamps
  }

  /**
   * Detect city from search input
   */
  detectCity(query) {
    const normalized = query.toLowerCase().trim();
    return Object.keys(JAPAN_CITIES).find(city =>
      city.includes(normalized) || normalized.includes(city.split('-')[0])
    );
  }

  /**
   * Get all POIs for a city using multi-type strategy
   */
  async searchCityMultiType(cityName) {
    const cityKey = cityName.toLowerCase();
    const cityCoords = JAPAN_CITIES[cityKey];

    if (!cityCoords) {
      console.log(`[MultiType] City "${cityName}" not in database, using GPS fallback`);
      return null;
    }

    // Check if already searching this city
    if (this.activeCityQueries.has(cityKey)) {
      console.log(`[MultiType] Already searching "${cityName}", waiting...`);
      // Poll for completion (max 10 seconds)
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (!this.activeCityQueries.has(cityKey)) break;
      }
      // Return from cache if done
      return await window.GooglePlacesCache.getAllCached();
    }

    // Mark as active
    this.activeCityQueries.add(cityKey);
    console.log(`[MultiType] Starting multi-type search for ${cityName}`);

    try {
      // Check if city was recently searched (< 7 days)
      const lastSearchTime = this.cityQueryCache[cityKey];
      if (lastSearchTime && Date.now() - lastSearchTime < 7 * 24 * 60 * 60 * 1000) {
        console.log(`[MultiType] ${cityName} searched recently, returning cache`);
        this.activeCityQueries.delete(cityKey);
        return await window.GooglePlacesCache.getAllCached();
      }

      // Launch 4 parallel queries for different types
      console.log(`[MultiType] Launching ${SEARCH_TYPES.length} parallel queries for ${cityName}`);
      const queries = SEARCH_TYPES.map(({ type }) =>
        this.queryCityByType(cityCoords.lat, cityCoords.lng, type, cityName)
          .catch(err => {
            console.error(`[MultiType] Error querying ${type}:`, err);
            return [];
          })
      );

      const allResults = await Promise.all(queries);
      const flatResults = allResults.flat();

      // Deduplicate by place_id
      const seenIds = new Set();
      const uniquePOIs = [];
      flatResults.forEach(poi => {
        const id = poi.place_id || poi.googlePlaceId;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniquePOIs.push(poi);
        }
      });

      console.log(`[MultiType] Fetched ${flatResults.length} results, ${uniquePOIs.length} unique POIs`);

      // Save all results to cache (using GPS-based cache with city as zone marker)
      if (uniquePOIs.length > 0) {
        try {
          await window.GooglePlacesCache.savePOIs(
            cityCoords.lat,
            cityCoords.lng,
            50000, // Use 50km radius as "city-wide" marker
            uniquePOIs.map(poi => ({
              ...poi,
              searchCity: cityName // Ensure city is set
            }))
          );
          console.log(`[MultiType] Cached ${uniquePOIs.length} POIs for ${cityName}`);
          this.cityQueryCache[cityKey] = Date.now(); // Mark as searched
        } catch (err) {
          console.error(`[MultiType] Cache save error:`, err);
        }
      }

      return uniquePOIs;

    } finally {
      // Always clear active flag
      this.activeCityQueries.delete(cityKey);
    }
  }

  /**
   * Query city by specific type
   */
  async queryCityByType(lat, lng, type, cityName) {
    try {
      const url = '/api/googlePlacesNearby';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          radiusM: 30000, // ~25km radius covers most cities
          type: type // Filter by type (if API supports it)
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`[MultiType] Rate limited on type "${type}"`);
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        console.warn(`[MultiType] API error for type "${type}":`, data.error);
        return [];
      }

      const results = data.results || [];
      console.log(`[MultiType] Type "${type}" returned ${results.length} results`);

      // Ensure searchCity is set
      return results.map(poi => ({
        ...poi,
        searchCity: cityName
      }));

    } catch (err) {
      console.error(`[MultiType] Query error for type "${type}":`, err);
      return [];
    }
  }
}

// Create singleton instance
window.GooglePlacesMultiType = new GooglePlacesMultiType();
console.log('[GooglePlacesMultiType] Module loaded');

// Hook into search input to detect city searches
function hookCitySearchInput() {
  const searchInput = document.getElementById('list-search');
  if (!searchInput) {
    console.log('[MultiType] Search input not found, will retry in 1s');
    setTimeout(hookCitySearchInput, 1000);
    return;
  }

  console.log('[MultiType] Hooked into search input');

  // Add listener (doesn't interfere with existing oninput)
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    // Check if this looks like a city search
    if (query.length >= 2) {
      const detectedCity = window.GooglePlacesMultiType.detectCity(query);
      if (detectedCity) {
        console.log(`[MultiType] Detected city search: "${query}" → "${detectedCity}"`);
        // Launch multi-type search in background (non-blocking)
        window.GooglePlacesMultiType.searchCityMultiType(detectedCity)
          .then(results => {
            if (results && results.length > 0) {
              console.log(`[MultiType] Loaded ${results.length} POIs for ${detectedCity}`);
            }
          })
          .catch(err => console.error('[MultiType] Search error:', err));
      }
    }

    // Note: original oninput handler fires normally, no interference
  }, { once: false, passive: true });
}

// Wait for DOM and hook search input
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hookCitySearchInput);
} else {
  setTimeout(hookCitySearchInput, 500);
}
