// ============================================================================
// JS/FEATURES-PHOTOS.JS — Unsplash photo search + reverse geocoding integration
// ============================================================================

console.log('[Photos] Loading...');

window.photosFeature = (() => {
  const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
  // Unsplash API key - stored in Vercel env, fallback to public (rate limited)
  const UNSPLASH_KEY = 'demo'; // Vercel function intercepts and adds real key

  // =========================================================================
  // Unsplash Photo Search
  // =========================================================================
  async function searchPlacePhotos(placeName, city) {
    if (!placeName) return [];

    try {
      const query = `${placeName} ${city || 'Japan'}`;
      const url = new URL(UNSPLASH_API_URL);
      url.searchParams.append('query', query);
      url.searchParams.append('per_page', '5');
      url.searchParams.append('order_by', 'relevant');

      // Chiama Vercel function che aggiunge la vera API key nel backend
      const resp = await fetch(`/api/searchUnsplash?query=${encodeURIComponent(query)}`);

      if (!resp.ok) {
        console.warn('[Photos] API error:', resp.status);
        return [];
      }

      const data = await resp.json();
      return (data.results || []).map(photo => ({
        url: photo.urls.regular,
        thumb: photo.urls.thumb,
        attr: photo.user.name,
        link: photo.links.html
      }));
    } catch (err) {
      console.warn('[Photos] Search error:', err.message);
      return [];
    }
  }

  // =========================================================================
  // Reverse Geocoding + Photos
  // =========================================================================
  async function reverseGeocodeAndGetPhotos(lat, lng, city) {
    try {
      // 1. Reverse geocode per ottenere nome corretto
      const geoResp = await fetch(`/api/reverseGeocode?lat=${lat}&lng=${lng}`);
      if (!geoResp.ok) {
        console.warn('[ReverseGeo] API error:', geoResp.status);
        return [];
      }

      const geoData = await geoResp.json();
      const placeName = geoData.name || null;

      if (!placeName) return [];

      // 2. Cerca foto usando il nome corretto
      return await searchPlacePhotos(placeName, city);
    } catch (err) {
      console.warn('[ReverseGeo] Error:', err.message);
      return [];
    }
  }

  return {
    searchPlacePhotos,
    reverseGeocodeAndGetPhotos
  };
})();

// Export to window
window.searchPlacePhotos = window.photosFeature.searchPlacePhotos;
window.reverseGeocodeAndGetPhotos = window.photosFeature.reverseGeocodeAndGetPhotos;

console.log('[Photos] Loaded ✓');
