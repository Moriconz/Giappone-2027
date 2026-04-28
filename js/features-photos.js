// ============================================================================
// JS/FEATURES-PHOTOS.JS — Place photo search with multiple official sources
//   - Google Places
//   - Google Custom Search Image (optional)
//   - Google Street View / Static Map fallback
//   - Wikimedia / Wikipedia fallback
// ============================================================================

console.log('[Photos] Loading...');

window.photosFeature = (() => {
  // =========================================================================
  // 1. REVERSE GEOCODING — Convert lat/lng to place name
  // =========================================================================
  async function reverseGeocode(lat, lng) {
    if (!lat || !lng) return null;

    try {
      const resp = await fetch(`/api/reverseGeocode?lat=${lat}&lng=${lng}`);
      if (!resp.ok) {
        console.warn('[ReverseGeo] HTTP error:', resp.status);
        return null;
      }
      const data = await resp.json();
      if (data.status === 'OK' && data.name) {
        console.log('[ReverseGeo] Found:', data.name);
        return data.name;
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
  // 2. GOOGLE PLACES PHOTO SEARCH — Primary source
  // =========================================================================
  async function searchGooglePlacePhotos(placeName, city, lat, lng) {
    if (!placeName) return [];

    try {
      const params = new URLSearchParams({
        query: placeName,
      });
      if (city) params.set('city', city);
      if (lat) params.set('lat', String(lat));
      if (lng) params.set('lng', String(lng));

      const resp = await fetch(`/api/searchGooglePlacesPhotos?${params.toString()}`);
      if (!resp.ok) {
        console.warn('[GooglePlaces] HTTP error:', resp.status);
        return [];
      }

      const data = await resp.json();
      if (Array.isArray(data.photos) && data.photos.length) {
        console.log('[GooglePlaces] Found', data.photos.length, 'photos for', placeName);
        return data.photos;
      }

      console.warn('[GooglePlaces] No photos found for:', placeName);
      return [];
    } catch (err) {
      console.error('[GooglePlaces] Error:', err.message);
      return [];
    }
  }

  // =========================================================================
  // 3. COMPLETE FLOW: Get photos (Google Places only)
  // =========================================================================
  async function getPhotosForLocation(lat, lng, city, fallbackName) {
    const candidates = [];
    let placeName = null;
    console.log('[Photos] getPhotosForLocation start', { lat, lng, city, fallbackName });

    if (fallbackName && fallbackName.trim()) {
      candidates.push(fallbackName.trim());
    }

    try {
      placeName = await reverseGeocode(lat, lng);
      if (placeName) {
        if (!candidates.includes(placeName)) {
          candidates.push(placeName);
        }
        console.log('[Photos] Reverse geocode name:', placeName);
      }
    } catch (err) {
      console.warn('[Photos] Reverse geocode failed, will use fallback name');
    }

    for (const candidate of candidates) {
      console.log('[Photos] Trying Google Places search for:', candidate);
      const googlePhotos = await searchGooglePlacePhotos(candidate, city, lat, lng);
      if (googlePhotos.length) return googlePhotos;
    }

    console.warn('[Photos] No Google Places photos found for any candidate');
    return [];
  }

  return {
    reverseGeocode,
    searchGooglePlacePhotos,
    getPhotosForLocation
  };
})();

window.reverseGeocode = window.photosFeature.reverseGeocode;
window.searchGooglePlacePhotos = window.photosFeature.searchGooglePlacePhotos;
window.getPhotosForLocation = window.photosFeature.getPhotosForLocation;

console.log('[Photos] Loaded ✓');
