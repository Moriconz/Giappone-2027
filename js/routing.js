/**
 * ROUTING — Calculate distance & duration between consecutive POI
 *
 * Uses Google Distance Matrix API (if available) or fallback estimates
 * Caches results to avoid redundant API calls on repeated renders
 * Updates entry.route_from_prev with distance, duration, transport mode
 *
 * Flow:
 * 1. For each POI in day, get lat/lng from source POI or cached details
 * 2. Call calculateRoute(lat1, lng1, lat2, lng2) to get distance/duration
 * 3. Store in entry.route_from_prev = { distance_km, duration_min, mode, cached: true/false }
 * 4. Display in itinerary rendering
 */

const ROUTING = {
  routeCache: new Map(), // { "lat1,lng1->lat2,lng2": { distance, duration, mode, timestamp } }
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  poiCoordinates: new Map(), // { poiId: { lat, lng } }

  /**
   * Generate cache key for a route segment
   */
  getCacheKey(lat1, lng1, lat2, lng2) {
    return `${lat1.toFixed(4)},${lng1.toFixed(4)}->${lat2.toFixed(4)},${lng2.toFixed(4)}`;
  },

  /**
   * Fallback: estimate distance using Haversine formula (great-circle distance)
   * Returns distance in km
   */
  estimateDistanceHaversine(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) * 10) / 10; // 1 decimal place
  },

  /**
   * Estimate travel duration (in minutes) based on distance and transport mode
   * Mode: "transit" (default 40 km/h), "driving" (50 km/h), "walking" (5 km/h)
   */
  estimateDuration(distanceKm, mode = 'transit') {
    const speeds = { transit: 40, driving: 50, walking: 5 };
    const speed = speeds[mode] || speeds.transit;
    return Math.ceil((distanceKm / speed) * 60); // minutes
  },

  /**
   * Stima il costo del biglietto (¥) per una tratta.
   * walking: gratis · transit urbano: base ~¥180 + ¥30/km · lunga percorrenza (treno): ~¥25/km
   * Valori arrotondati a 10¥ (indicativi, stile tariffe giapponesi).
   */
  estimateFare(distanceKm, mode) {
    if (mode === 'walking' || distanceKm < 0.3) return 0;
    let yen;
    if (mode === 'driving' || distanceKm >= 50) {
      yen = distanceKm * 25; // intercity / treno veloce
    } else {
      yen = 180 + distanceKm * 30; // metro/treno urbano
    }
    return Math.round(yen / 10) * 10;
  },

  /**
   * Suggest transport mode based on distance
   * < 2km: walking, 2-50km: transit, > 50km: driving
   */
  suggestMode(distanceKm) {
    if (distanceKm < 2) return 'walking';
    if (distanceKm < 50) return 'transit';
    return 'driving';
  },

  /**
   * Calculate route between two coordinates
   * Uses cache first, falls back to estimation
   */
  async calculateRoute(lat1, lng1, lat2, lng2) {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
      console.warn('[Routing] Missing coordinates for route calculation');
      return null;
    }

    const cacheKey = this.getCacheKey(lat1, lng1, lat2, lng2);

    // Check cache
    if (this.routeCache.has(cacheKey)) {
      const cached = this.routeCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('[Routing] Cache hit for:', cacheKey);
        return { ...cached.data, cached: true };
      }
    }

    // Fallback: estimate using Haversine + speed model
    const distanceKm = this.estimateDistanceHaversine(lat1, lng1, lat2, lng2);
    const mode = this.suggestMode(distanceKm);
    const durationMin = this.estimateDuration(distanceKm, mode);

    const result = {
      distance_km: distanceKm,
      duration_min: durationMin,
      mode: mode,
      cached: false
    };

    // Store in cache
    this.routeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    console.log('[Routing] Calculated route:', { distance: distanceKm + 'km', duration: durationMin + 'min', mode });
    return result;
  },

  /**
   * Try to get POI coordinates from cache or details
   * Stores in poiCoordinates map for reuse
   */
  async getPOICoordinates(poiId) {
    if (this.poiCoordinates.has(poiId)) {
      return this.poiCoordinates.get(poiId);
    }

    // Try to get from window.allPOIs() lookup
    if (typeof window.allPOIs === 'function') {
      const allPois = window.allPOIs();
      if (Array.isArray(allPois)) {
        const poi = allPois.find(p => p.googlePlaceId === poiId);
        if (poi?.latitude && poi?.longitude) {
          this.poiCoordinates.set(poiId, { lat: poi.latitude, lng: poi.longitude });
          return { lat: poi.latitude, lng: poi.longitude };
        }
      }
    }

    console.warn('[Routing] Could not find coordinates for POI:', poiId);
    return null;
  },

  /**
   * Calculate and apply routing info for all POI in a specific day
   * Each POI gets route_from_prev populated with distance/duration from previous POI
   */
  async calculateDayRouting(dayIndex) {
    if (!window.state?.itineraryByDay?.[dayIndex]) {
      console.warn('[Routing] Invalid day index:', dayIndex);
      return;
    }

    const dayPOIs = window.state.itineraryByDay[dayIndex];
    if (dayPOIs.length < 2) {
      console.log('[Routing] Day has < 2 POI, no routing needed');
      return;
    }

    console.log(`[Routing] Calculating routes for day ${dayIndex} (${dayPOIs.length} POI)`);

    for (let i = 1; i < dayPOIs.length; i++) {
      const prevPOI = dayPOIs[i - 1];
      const currPOI = dayPOIs[i];

      const prevCoords = await this.getPOICoordinates(prevPOI.poi_id);
      const currCoords = await this.getPOICoordinates(currPOI.poi_id);

      if (!prevCoords || !currCoords) {
        console.warn('[Routing] Missing coordinates, skipping route between:', prevPOI.poi_name, '→', currPOI.poi_name);
        continue;
      }

      const route = await this.calculateRoute(prevCoords.lat, prevCoords.lng, currCoords.lat, currCoords.lng);
      if (route) {
        currPOI.route_from_prev = route;
      }
    }

    console.log('[Routing] ✓ Day routing complete');
  },

  /**
   * Calculate routing for all days (background, non-blocking)
   */
  async calculateAllRouting() {
    if (!window.state?.itineraryByDay) return;

    const tripProfile = window.state?.tripProfile || {};
    const days = tripProfile.days || 8;

    console.log('[Routing] Starting background routing calculation for all days...');
    // Parallelize routing calculations for all days
    const dayPromises = [];
    for (let d = 0; d < days; d++) {
      dayPromises.push(this.calculateDayRouting(d));
    }
    await Promise.all(dayPromises);

    window.saveState?.();
    console.log('[Routing] ✅ All routing complete, state saved');
  }
};

window.ROUTING = ROUTING;
