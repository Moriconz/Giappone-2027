// ============================================================================
// JS/FEATURES-PHOTOS.JS — Google Places photo search, Unsplash fallback, reverse geocoding
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
  // 3. UNSPLASH PHOTO SEARCH — Fallback
  // =========================================================================
  async function searchPlacePhotos(placeName, city) {
    if (!placeName) return [];

    try {
      const query = city ? `${placeName} ${city} Japan` : `${placeName} Japan`;
      const resp = await fetch(`/api/searchUnsplash?query=${encodeURIComponent(query)}`);
      if (!resp.ok) {
        console.warn('[Unsplash] HTTP error:', resp.status);
        return [];
      }
      const data = await resp.json();
      if (data.results && Array.isArray(data.results)) {
        console.log('[Unsplash] Found', data.results.length, 'photos for', query);
        return data.results.slice(0, 5).map(photo => ({
          url: photo.urls.regular,
          thumb: photo.urls.thumb,
          author: photo.user?.name,
          link: photo.user?.links?.html,
          source: 'unsplash'
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
  // 4. COMPLETE FLOW: Get photos (Google Places first, Unsplash fallback)
  // =========================================================================
  async function getPhotosForLocation(lat, lng, city, fallbackName) {
    const candidates = [];
    let placeName = null;

    try {
      placeName = await reverseGeocode(lat, lng);
      if (placeName) {
        candidates.push(placeName);
        console.log('[Photos] Reverse geocode name:', placeName);
      }
    } catch (err) {
      console.warn('[Photos] Reverse geocode failed, will use fallback name');
    }

    if (fallbackName && fallbackName.trim()) {
      const normalizedFallback = fallbackName.trim();
      if (!candidates.includes(normalizedFallback)) {
        candidates.push(normalizedFallback);
      }
    }

    for (const candidate of candidates) {
      const googlePhotos = await searchGooglePlacePhotos(candidate, city, lat, lng);
      if (googlePhotos.length) return googlePhotos;
    }

    const searchName = candidates[0] || null;
    if (searchName) {
      return await searchPlacePhotos(searchName, city);
    }

    console.warn('[Photos] No place name available for photos');
    return [];
  }

  return {
    reverseGeocode,
    searchGooglePlacePhotos,
    searchPlacePhotos,
    getPhotosForLocation
  };
})();

window.reverseGeocode = window.photosFeature.reverseGeocode;
window.searchGooglePlacePhotos = window.photosFeature.searchGooglePlacePhotos;
window.searchPlacePhotos = window.photosFeature.searchPlacePhotos;
window.getPhotosForLocation = window.photosFeature.getPhotosForLocation;

console.log('[Photos] Loaded ✓');
