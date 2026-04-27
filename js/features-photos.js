// ============================================================================
// JS/FEATURES-PHOTOS.JS — Unsplash photo search + reverse geocoding
// ============================================================================

console.log('[Photos] Loading...');

window.photosFeature = (() => {
  // =========================================================================
  // 1. REVERSE GEOCODING — Convert lat/lng to place name
  // =========================================================================
  async function reverseGeocode(lat, lng) {
    if (!lat || !lng) return null;

    try {
      // Call Vercel function: /api/reverseGeocode
      // Server uses GOOGLE_MAPS_API_KEY from env (secure)
      const resp = await fetch(`/api/reverseGeocode?lat=${lat}&lng=${lng}`);

      if (!resp.ok) {
        console.warn('[ReverseGeo] HTTP error:', resp.status);
        return null;
      }

      const data = await resp.json();

      // Google API returns: { name: "...", status: "OK" } or { name: null, status: "ZERO_RESULTS" }
      if (data.status === 'OK' && data.name) {
        console.log('[ReverseGeo] Found:', data.name);
        return data.name; // e.g., "Senso-ji Temple"
      } else if (data.name) {
        return data.name;
      }

      console.warn('[ReverseGeo] No result for', lat, lng);
      return null;
    } catch (err) {
      console.error('[ReverseGeo] Error:', err.message);
      return null;
    }
  }

  // =========================================================================
  // 2. UNSPLASH PHOTO SEARCH — Get photos by place name
  // =========================================================================
  async function searchPlacePhotos(placeName, city) {
    if (!placeName) return [];

    try {
      // Build query: "Senso-ji Temple Tokyo, Japan"
      const query = city ? `${placeName} ${city}` : placeName;

      // Call Vercel function: /api/searchUnsplash
      // Server uses UNSPLASH_API_KEY from env (secure)
      const resp = await fetch(`/api/searchUnsplash?query=${encodeURIComponent(query)}`);

      if (!resp.ok) {
        console.warn('[Unsplash] HTTP error:', resp.status);
        return [];
      }

      const data = await resp.json();

      // Unsplash returns: { results: [{ urls: { regular: "..." }, user: { name: "..." }, links: { html: "..." } }] }
      if (data.results && Array.isArray(data.results)) {
        return data.results.slice(0, 5).map(photo => ({
          url: photo.urls.regular,
          thumb: photo.urls.thumb,
          author: photo.user.name,
          link: photo.user.links.html
        }));
      }

      console.warn('[Unsplash] No results for:', query);
      return [];
    } catch (err) {
      console.error('[Unsplash] Error:', err.message);
      return [];
    }
  }

  // =========================================================================
  // 3. COMPLETE FLOW: Get photos (with optional reverse geocoding)
  // =========================================================================
  async function getPhotosForLocation(lat, lng, city, fallbackName) {
    let placeName = null;

    // Step 1: Try reverse geocoding FIRST (get REAL name from coordinates)
    console.log('[Photos] Attempting reverse geocode for:', lat, lng);
    try {
      placeName = await reverseGeocode(lat, lng);
      if (placeName) {
        console.log('[Photos] Got real name from reverse geo:', placeName);
      }
    } catch (err) {
      console.warn('[Photos] Reverse geocoding failed, using fallback');
    }

    // Step 2: If reverse geocoding failed, use fallback name
    if (!placeName && fallbackName) {
      console.log('[Photos] Using fallback name:', fallbackName);
      placeName = fallbackName;
    }

    // Step 3: Search Unsplash with the place name
    if (placeName) {
      console.log('[Photos] Searching Unsplash for:', placeName, 'in', city);
      return await searchPlacePhotos(placeName, city);
    }

    console.warn('[Photos] No place name available for photos');
    return [];
  }

  return {
    reverseGeocode,
    searchPlacePhotos,
    getPhotosForLocation
  };
})();

// Export to window
window.reverseGeocode = window.photosFeature.reverseGeocode;
window.searchPlacePhotos = window.photosFeature.searchPlacePhotos;
window.getPhotosForLocation = window.photosFeature.getPhotosForLocation;

console.log('[Photos] Loaded ✓');
