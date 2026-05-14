/**
 * GOOGLE PLACES DETAILS — Client-side integration
 *
 * - Fetches full POI details from Google Places Details API
 * - Fallback strategy for editorialSummary (Places → Reviews → Wikipedia)
 * - Dynamic photo URLs generation
 * - Enriches POI data in-memory without modifying cache
 */

class GooglePlacesDetailsClient {
  constructor() {
    this.detailsCache = new Map(); // In-memory cache for details
    this.photosCache = new Map(); // Cache for photo URLs (3-day TTL)
  }

  /**
   * Fetch full details for a POI via Google Places Details API
   */
  async fetchDetails(placeId) {
    if (!placeId) {
      console.warn('[PlacesDetails] No placeId provided');
      return null;
    }

    // Check in-memory cache
    if (this.detailsCache.has(placeId)) {
      const cached = this.detailsCache.get(placeId);
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24h cache
        console.log('[PlacesDetails] Using cached details for:', placeId);
        return cached.data;
      }
    }

    try {
      console.log('[PlacesDetails] Fetching details for:', placeId);
      const response = await fetch('/api/googlePlacesDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[PlacesDetails] API error:', error);
        return null;
      }

      const details = await response.json();

      // Cache in-memory
      this.detailsCache.set(placeId, {
        data: details,
        timestamp: Date.now()
      });

      console.log('[PlacesDetails] Fetched:', {
        name: details.displayName,
        rating: details.rating,
        photos: details.photos?.length,
        reviews: details.reviews?.length
      });

      return details;
    } catch (err) {
      console.error('[PlacesDetails] Fetch error:', err);
      return null;
    }
  }

  /**
   * Get a dynamic photo URL from photo.name
   * Photo URLs expire in 3 days, so we regenerate on each use
   */
  async getPhotoUrl(photoName, maxWidth = 800, maxHeight = 600) {
    if (!photoName) return null;

    try {
      const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxHeight}&maxWidthPx=${maxWidth}&key=${window.__GOOGLE_API_KEY || ''}`;

      // This endpoint redirects to actual image URL
      // For security, fetch via our backend instead
      const response = await fetch(`/api/placePhoto?photoName=${encodeURIComponent(photoName)}&maxwidth=${maxWidth}&maxheight=${maxHeight}`, {
        method: 'GET'
      });

      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.error('[PlacesDetails] Photo URL error:', err);
    }

    return null;
  }

  /**
   * Fallback strategy for description:
   * 1. Try editorialSummary from Places
   * 2. If missing → use top 2 reviews (rating ≥ 4)
   * 3. If no reviews → fetch from Wikipedia
   * 4. If none → show only attributes
   */
  async getDescription(details, poiName, poiCity) {
    // Priority 1: editorialSummary da Google Places
    if (details?.editorialSummary) {
      return {
        source: 'google_places',
        text: details.editorialSummary
      };
    }

    // Priority 2: Top reviews
    const goodReviews = (details?.reviews || [])
      .filter(r => r.rating >= 4)
      .slice(0, 2);

    if (goodReviews.length > 0) {
      return {
        source: 'reviews',
        text: `Cosa dicono i visitatori: "${goodReviews[0].text.substring(0, 150)}..."`,
        reviews: goodReviews
      };
    }

    // Priority 3: Wikipedia
    if (poiName && poiCity) {
      try {
        console.log('[PlacesDetails] Trying Wikipedia for:', poiName);
        const wikiUrl = `https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(poiName)}`;
        const wikiRes = await fetch(wikiUrl);

        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.extract) {
            return {
              source: 'wikipedia',
              text: wikiData.extract.substring(0, 200) + '...'
            };
          }
        }
      } catch (err) {
        console.warn('[PlacesDetails] Wikipedia fetch failed:', err);
      }
    }

    // Priority 4: None available
    return {
      source: 'none',
      text: null
    };
  }

  /**
   * Enricher function: enhance POI with full Details API data
   */
  async enrichPOI(poi) {
    if (!poi.googlePlaceId) {
      console.log('[PlacesDetails] POI has no googlePlaceId, skipping enrichment');
      return poi;
    }

    const details = await this.fetchDetails(poi.googlePlaceId);
    if (!details) {
      console.warn('[PlacesDetails] Could not fetch details, using basic data');
      return poi;
    }

    // Get description via fallback strategy
    const description = await this.getDescription(details, poi.name, poi.city);

    // Enrich POI object (non-destructive)
    return {
      ...poi,
      // Details API data
      _details: details,
      _description: description,

      // Convenience fields for template
      editorialSummary: details.editorialSummary,
      currentOpeningHours: details.currentOpeningHours,
      priceLevel: details.priceLevel,
      reviews: details.reviews || [],

      // Restaurant attributes
      servesLunch: details.servesLunch,
      servesDinner: details.servesDinner,
      reservable: details.reservable,
      takeout: details.takeout,
      servesBeer: details.servesBeer,
      servesVegetarianFood: details.servesVegetarianFood,

      // Accessibility
      accessibilityOptions: details.accessibilityOptions || {},

      // Photos (note: these are photo.name, not URLs yet)
      _photoNames: details.photos || []
    };
  }
}

// Singleton
window.GooglePlacesDetailsClient = new GooglePlacesDetailsClient();
console.log('[GooglePlacesDetailsClient] Module loaded');
