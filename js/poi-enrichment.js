/**
 * POI ENRICHMENT — Background fetching of real opening hours, pricing from Google Places
 *
 * Flow:
 * 1. entryId exists but opening_hours/price_level are null
 * 2. Call enrichEntryAsync(poiId, placeId) in background
 * 3. Fetch details from Google Places via existing GooglePlacesDetailsClient
 * 4. Update entry.source_meta, entry.opening_hours, entry.price_level
 * 5. Re-render if visible
 *
 * Cache: 1-hour TTL per POI to avoid excessive API calls
 */

const POI_ENRICHMENT = {
  enrichmentCache: new Map(), // { placeId: { data, timestamp } }
  CACHE_TTL: 60 * 60 * 1000, // 1 hour

  /**
   * Extract opening hours and pricing from Google Places details
   * Returns: { opening_hours, price_level, ticket_cost }
   */
  parseGooglePlacesDetails(details) {
    if (!details) return null;

    const extracted = {
      opening_hours: null,
      opening_periods: null,
      price_level: null,
      ticket_cost: null
    };

    // Opening hours: businessHours non è mai restituito dall'endpoint (vedi api/googlePlacesDetails.js
    // fieldMask, che chiede solo currentOpeningHours) — tenuto per compatibilità se l'API cambia in futuro.
    if (details.businessHours && Array.isArray(details.businessHours)) {
      const hours = details.businessHours.map(h => ({
        day: h.day,
        open: h.openTime?.hours + ':' + String(h.openTime?.minutes || 0).padStart(2, '0'),
        close: h.closeTime?.hours + ':' + String(h.closeTime?.minutes || 0).padStart(2, '0')
      }));
      if (hours.length > 0) {
        extracted.opening_hours = hours;
      }
    } else if (details.currentOpeningHours?.weekdayDescriptions) {
      extracted.opening_hours = details.currentOpeningHours.weekdayDescriptions.join(' | ');
    }

    // Dati strutturati per confronto programmatico (giorno/ora), es. warning "arrivo a chiuso"
    if (Array.isArray(details.currentOpeningHours?.periods)) {
      extracted.opening_periods = details.currentOpeningHours.periods;
    }

    // Price level: Google uses 1-4 scale, we normalize to string
    if (details.priceLevel) {
      const levels = { PRICE_LEVEL_INEXPENSIVE: '¥', PRICE_LEVEL_MODERATE: '¥¥', PRICE_LEVEL_EXPENSIVE: '¥¥¥', PRICE_LEVEL_VERY_EXPENSIVE: '¥¥¥¥' };
      extracted.price_level = levels[details.priceLevel] || null;
    }

    // Ticket cost: if place has entryFee field, use it
    if (details.entryFee) {
      extracted.ticket_cost = details.entryFee;
    }

    return extracted;
  },

  /**
   * Enrich a single entry with real data from Google Places
   * Runs in background, updates state if successful
   */
  async enrichEntryAsync(poiId, placeId) {
    if (!placeId) {
      console.log('[POIEnrichment] No placeId, skipping enrichment for:', poiId);
      return false;
    }

    // Check local cache first
    if (this.enrichmentCache.has(placeId)) {
      const cached = this.enrichmentCache.get(placeId);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('[POIEnrichment] Using cached enrichment for:', placeId);
        this.applyEnrichmentToEntry(poiId, cached.data);
        return true;
      }
    }

    // Fetch fresh details
    if (!window.GooglePlacesDetailsClient) {
      console.warn('[POIEnrichment] GooglePlacesDetailsClient not available');
      return false;
    }

    try {
      console.log('[POIEnrichment] Fetching details for:', placeId);
      const details = await window.GooglePlacesDetailsClient.fetchDetails(placeId);
      if (!details) {
        console.warn('[POIEnrichment] No details returned for:', placeId);
        return false;
      }

      const extracted = this.parseGooglePlacesDetails(details);
      this.enrichmentCache.set(placeId, {
        data: extracted,
        timestamp: Date.now()
      });

      this.applyEnrichmentToEntry(poiId, extracted);
      console.log('[POIEnrichment] ✓ Enriched:', poiId, extracted);
      return true;
    } catch (err) {
      console.error('[POIEnrichment] Error:', err);
      return false;
    }
  },

  /**
   * Apply extracted data to itinerary entry
   */
  applyEnrichmentToEntry(poiId, enrichedData) {
    if (!window.state?.itineraryByDay) return;

    let found = false;
    for (const dayPOIs of Object.values(window.state.itineraryByDay)) {
      const entry = dayPOIs.find(e => e.poi_id === poiId);
      if (entry) {
        entry.opening_hours = enrichedData.opening_hours;
        entry.opening_periods = enrichedData.opening_periods;
        entry.price_level = enrichedData.price_level;
        entry.ticket_cost = enrichedData.ticket_cost;
        entry.source_meta.source = 'google_places';
        entry.source_meta.verified = true;
        entry.source_meta.last_verified_at = new Date().toISOString();
        found = true;
        break;
      }
    }

    if (found) {
      window.saveState?.();
      window.renderItineraryUnified?.();
    }
  },

  /**
   * Enrich all entries in itinerary (background, non-blocking)
   * Call this after rendering itinerary to batch-fetch missing data
   */
  enrichAllEntriesAsync() {
    if (!window.state?.itineraryByDay) return;

    const toEnrich = [];
    for (const dayPOIs of Object.values(window.state.itineraryByDay)) {
      for (const entry of dayPOIs) {
        // Only enrich if opening_hours/price_level missing AND we have a place_id
        if ((!entry.opening_hours || !entry.price_level) && entry.source_meta?.place_id) {
          toEnrich.push({ poiId: entry.poi_id, placeId: entry.source_meta.place_id });
        }
      }
    }

    if (toEnrich.length === 0) {
      console.log('[POIEnrichment] All entries already enriched');
      return;
    }

    console.log(`[POIEnrichment] Starting background enrichment of ${toEnrich.length} entries`);
    toEnrich.forEach((item, idx) => {
      // Stagger requests to avoid overwhelming the API (100ms between each)
      setTimeout(() => {
        this.enrichEntryAsync(item.poiId, item.placeId);
      }, idx * 100);
    });
  }
};

window.POI_ENRICHMENT = POI_ENRICHMENT;
