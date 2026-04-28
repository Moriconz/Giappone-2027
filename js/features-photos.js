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
        const actualPlaceName = data.place?.name || placeName;
        const actualAddress = data.place?.formatted_address || 'N/A';
        console.log('%c[GooglePlaces] ✅ FOUND', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
        console.log(`📍 Searched for: "${placeName}"`);
        console.log(`📍 Found: "${actualPlaceName}"`);
        console.log(`📍 Address: ${actualAddress}`);
        console.log(`📸 Photos: ${data.photos.length} found`);

        // Verifica se il luogo trovato è simile a quello cercato (primo 5 caratteri)
        const searchBase = placeName.toLowerCase().substring(0, 5);
        const foundBase = actualPlaceName.toLowerCase().substring(0, 5);
        if (searchBase !== foundBase) {
          console.warn('%c⚠️ NOME MISMATCH DETECTED', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px');
          console.warn(`Searched: "${placeName}" (${searchBase}...)`);
          console.warn(`Found: "${actualPlaceName}" (${foundBase}...)`);
          console.warn('❌ Foto potrebbero essere di un luogo diverso!');
          return []; // Non mostrare foto se è un nome diverso
        }

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
    console.log('%c[Photos] 📷 START (coordinate-first)', 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px', { lat, lng, city, fallbackName });
    const photoStartTime = Date.now();

    // PRIMA: Prova ricerca per coordinate (più affidabile)
    if (lat && lng) {
      console.log('[Photos] 🎯 Primary search: by coordinates', { lat, lng });
      const nearbyPhotos = await searchGooglePlacePhotos(`restaurant near ${lat},${lng}`, city, lat, lng);
      if (nearbyPhotos.length) {
        const photoTime = Date.now() - photoStartTime;
        console.log(`%c[Photos] ✅ Found via coordinates (${photoTime}ms)`, 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
        return nearbyPhotos;
      }
    }

    // FALLBACK: Se coordinate non trovano nulla, prova con nome
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

    console.log('[Photos] ⚠️ Coordinates search failed, trying names:', candidates);
    for (const candidate of candidates) {
      console.log('[Photos] Trying Google Places search for:', candidate);
      const googlePhotos = await searchGooglePlacePhotos(candidate, city, lat, lng);
      if (googlePhotos.length) return googlePhotos;
    }

    const photoTime = Date.now() - photoStartTime;
    console.log(`%c[Photos] ❌ ZERO photos found (${photoTime}ms)`, 'background: #D9534F; color: white; padding: 4px 8px; border-radius: 3px');
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
