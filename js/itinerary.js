/**
 * ITINERARY SYSTEM — Day-by-day POI management with drag-drop
 *
 * Data structure:
 * state.itineraryByDay = {
 *   0: [{ poi_id, poi_name, time: "10:00", duration: 30, notes: "", status: "proposed|approved|done" }],
 *   1: [...]
 * }
 */

const ITINERARY_SYSTEM = {
  /**
   * Initialize itinerary state if not present
   */
  initState() {
    if (!window.state) {
      console.warn('[Itinerary] state not available');
      return;
    }

    if (!window.state.itineraryByDay) {
      const tripProfile = window.state.tripProfile || {};
      const days = tripProfile.days || 8;

      window.state.itineraryByDay = {};
      for (let i = 0; i < days; i++) {
        window.state.itineraryByDay[i] = [];
      }

      console.log('[Itinerary] Initialized itineraryByDay for', days, 'days');
    }
  },

  /**
   * Add POI to a specific day
   * @param {string} poiId
   * @param {string} poiName
   * @param {number} dayIndex
   * @param {string} time - Time in HH:MM format (default "10:00")
   * @param {number} duration - Duration in minutes (default 60)
   * @param {string} notes - Notes about the POI (default "")
   * @param {number} cost - Cost in local currency (default 0)
   */
  addPOIToDay(poiId, poiName, dayIndex, time = "10:00", duration = 60, notes = "", cost = 0) {
    if (!window.state?.itineraryByDay) {
      this.initState();
    }

    if (dayIndex < 0 || dayIndex >= Object.keys(window.state.itineraryByDay).length) {
      console.warn('[Itinerary] Invalid day index:', dayIndex);
      return false;
    }

    // Check if already in that day
    const already = window.state.itineraryByDay[dayIndex].some(e => e.poi_id === poiId);
    if (already) {
      console.log('[Itinerary] POI already in day', dayIndex);
      return false;
    }

    const entry = {
      poi_id: poiId,
      poi_name: poiName,
      time: time,
      duration: duration,
      notes: notes,
      cost: cost,
      status: "proposed",
      opening_hours: null,
      price_level: null,
      ticket_cost: null,
      ticket_currency: 'JPY',
      source_meta: {
        source: null,
        place_id: null,
        verified: false,
        last_verified_at: null
      },
      route_from_prev: null,
      manual_overrides: {
        time: false,
        duration: false,
        cost: false,
        notes: false
      }
    };

    window.state.itineraryByDay[dayIndex].push(entry);
    console.log('[Itinerary] Added', poiName, 'to day', dayIndex, 'at', time, 'duration:', duration, 'min');

    window.saveState?.();
    return true;
  },

  /**
   * Remove POI from itinerary
   */
  removePOI(poiId) {
    if (!window.state?.itineraryByDay) return false;

    let removed = false;
    Object.values(window.state.itineraryByDay).forEach(day => {
      const idx = day.findIndex(e => e.poi_id === poiId);
      if (idx !== -1) {
        day.splice(idx, 1);
        removed = true;
      }
    });

    if (removed) {
      console.log('[Itinerary] Removed POI:', poiId);
      window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
    }
    return removed;
  },

  /**
   * Update time for a POI
   */
  updateTime(poiId, newTime) {
    if (!window.state?.itineraryByDay) return false;

    for (const day of Object.values(window.state.itineraryByDay)) {
      const entry = day.find(e => e.poi_id === poiId);
      if (entry) {
        entry.time = newTime;
        console.log('[Itinerary] Updated time for', poiId, 'to', newTime);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        return true;
      }
    }
    return false;
  },

  /**
   * Update notes for a POI
   */
  updateNotes(poiId, notes) {
    if (!window.state?.itineraryByDay) return false;

    for (const day of Object.values(window.state.itineraryByDay)) {
      const entry = day.find(e => e.poi_id === poiId);
      if (entry) {
        entry.notes = notes;
        console.log('[Itinerary] Updated notes for', poiId);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        return true;
      }
    }
    return false;
  },

  /**
   * Update duration for a POI
   */
  updateDuration(poiId, duration) {
    if (!window.state?.itineraryByDay) return false;

    for (const day of Object.values(window.state.itineraryByDay)) {
      const entry = day.find(e => e.poi_id === poiId);
      if (entry) {
        entry.duration = duration;
        console.log('[Itinerary] Updated duration for', poiId, 'to', duration, 'min');
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        return true;
      }
    }
    return false;
  },

  /**
   * Update cost for a POI
   */
  updateCost(poiId, cost) {
    if (!window.state?.itineraryByDay) return false;

    for (const day of Object.values(window.state.itineraryByDay)) {
      const entry = day.find(e => e.poi_id === poiId);
      if (entry) {
        entry.cost = cost;
        console.log('[Itinerary] Updated cost for', poiId, 'to', cost);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        return true;
      }
    }
    return false;
  },

  /**
   * Move POI to another day
   */
  moveToDay(poiId, toDayIndex) {
    if (!window.state?.itineraryByDay) return false;

    let entry = null;
    let fromDayIndex = null;

    // Find and remove from current day
    for (const [dayIdx, day] of Object.entries(window.state.itineraryByDay)) {
      const idx = day.findIndex(e => e.poi_id === poiId);
      if (idx !== -1) {
        entry = day[idx];
        fromDayIndex = parseInt(dayIdx);
        day.splice(idx, 1);
        break;
      }
    }

    if (!entry) {
      console.warn('[Itinerary] POI not found:', poiId);
      return false;
    }

    // Add to new day
    window.state.itineraryByDay[toDayIndex].push(entry);
    console.log('[Itinerary] Moved', poiId, 'from day', fromDayIndex, 'to', toDayIndex);

    window.saveState?.();
    return true;
  },

  /**
   * Get total budget spent in itinerary
   */
  calculateBudgetSpent() {
    // TODO: Implement when POI data includes cost
    return 0;
  },

  /**
   * Get total duration for a day
   */
  getDayDuration(dayIndex) {
    if (!window.state?.itineraryByDay[dayIndex]) return 0;
    return window.state.itineraryByDay[dayIndex].reduce((sum, e) => sum + (e.duration || 60), 0);
  },

  /**
   * Normalize old entries to new schema (backward-compatible migration)
   * Call this when loading state from localStorage to fill in missing fields
   */
  normalizeEntry(entry) {
    if (!entry) return entry;
    return {
      poi_id: entry.poi_id,
      poi_name: entry.poi_name,
      time: entry.time || '10:00',
      duration: entry.duration || 60,
      notes: entry.notes || '',
      cost: entry.cost || 0,
      status: entry.status || 'proposed',
      opening_hours: entry.opening_hours ?? null,
      price_level: entry.price_level ?? null,
      ticket_cost: entry.ticket_cost ?? null,
      ticket_currency: entry.ticket_currency ?? 'JPY',
      source_meta: entry.source_meta ?? {
        source: null,
        place_id: null,
        verified: false,
        last_verified_at: null
      },
      route_from_prev: entry.route_from_prev ?? null,
      manual_overrides: entry.manual_overrides ?? {
        time: false,
        duration: false,
        cost: false,
        notes: false
      }
    };
  },

  /**
   * Normalize all entries in itineraryByDay
   */
  normalizeAllEntries() {
    if (!window.state?.itineraryByDay) return;
    for (const dayIdx in window.state.itineraryByDay) {
      window.state.itineraryByDay[dayIdx] = window.state.itineraryByDay[dayIdx].map(e => this.normalizeEntry(e));
    }
    console.log('[Itinerary] ✓ All entries normalized to new schema');
  },

  /**
   * Enrich entry with real POI data (opening hours, pricing, etc.)
   * Can accept optional placeId, or find from source_meta
   */
  async enrichEntry(poiId, placeId = null) {
    if (!window.POI_ENRICHMENT) {
      console.warn('[Itinerary] POI_ENRICHMENT not available');
      return false;
    }

    // If no placeId provided, try to get from entry.source_meta
    if (!placeId) {
      for (const dayPOIs of Object.values(window.state?.itineraryByDay || {})) {
        const entry = dayPOIs.find(e => e.poi_id === poiId);
        if (entry?.source_meta?.place_id) {
          placeId = entry.source_meta.place_id;
          break;
        }
      }
    }

    return await window.POI_ENRICHMENT.enrichEntryAsync(poiId, placeId);
  },

  /**
   * Enrich all entries in background
   */
  enrichAllEntries() {
    if (!window.POI_ENRICHMENT) {
      console.warn('[Itinerary] POI_ENRICHMENT not available');
      return;
    }
    window.POI_ENRICHMENT.enrichAllEntriesAsync();
  },

  /**
   * Calculate routing for a specific day
   */
  async calculateDayRouting(dayIndex) {
    if (!window.ROUTING) {
      console.warn('[Itinerary] ROUTING not available');
      return;
    }
    await window.ROUTING.calculateDayRouting(dayIndex);
  },

  /**
   * Calculate routing for all days (background)
   */
  calculateAllRouting() {
    if (!window.ROUTING) {
      console.warn('[Itinerary] ROUTING not available');
      return;
    }
    window.ROUTING.calculateAllRouting();
  },

  /**
   * Calculate budget breakdown for a specific day
   * Returns: { poi_cost, ticket_cost, transport_cost, total }
   */
  calculateDayBudget(dayIndex) {
    if (!window.state?.itineraryByDay?.[dayIndex]) {
      return { poi_cost: 0, ticket_cost: 0, transport_cost: 0, total: 0 };
    }

    const dayPOIs = window.state.itineraryByDay[dayIndex];
    let poiCost = 0;
    let ticketCost = 0;
    let transportCost = 0;

    dayPOIs.forEach(entry => {
      poiCost += entry.cost || 0;
      ticketCost += entry.ticket_cost || 0;
      if (entry.route_from_prev?.duration_min) {
        // Estimate transport cost: ~50 yen per 10km (Japan transit average)
        const estimatedTransportCost = Math.round((entry.route_from_prev.distance_km / 10) * 50);
        transportCost += estimatedTransportCost;
      }
    });

    return {
      poi_cost: Math.round(poiCost),
      ticket_cost: Math.round(ticketCost),
      transport_cost: Math.round(transportCost),
      total: Math.round(poiCost + ticketCost + transportCost)
    };
  },

  /**
   * Calculate total budget for entire trip
   * Returns: { poi_cost, ticket_cost, transport_cost, total, by_day: {...} }
   */
  calculateTotalBudget() {
    const tripProfile = window.state?.tripProfile || {};
    const days = tripProfile.days || 8;
    let totalPoiCost = 0;
    let totalTicketCost = 0;
    let totalTransportCost = 0;
    const byDay = {};

    for (let d = 0; d < days; d++) {
      const dayBudget = this.calculateDayBudget(d);
      byDay[d] = dayBudget;
      totalPoiCost += dayBudget.poi_cost;
      totalTicketCost += dayBudget.ticket_cost;
      totalTransportCost += dayBudget.transport_cost;
    }

    return {
      poi_cost: Math.round(totalPoiCost),
      ticket_cost: Math.round(totalTicketCost),
      transport_cost: Math.round(totalTransportCost),
      total: Math.round(totalPoiCost + totalTicketCost + totalTransportCost),
      by_day: byDay
    };
  },

  /**
   * Validate entry and return user-friendly errors
   */
  validateEntry(entry) {
    if (!window.ITINERARY_VALIDATION) {
      console.warn('[Itinerary] ITINERARY_VALIDATION not available');
      return { valid: true };
    }
    return window.ITINERARY_VALIDATION.validateEntry(entry);
  },

  /**
   * Check if POI already exists in day
   */
  hasDuplicatePOI(poiId, dayIndex) {
    if (!window.ITINERARY_VALIDATION) return false;
    return window.ITINERARY_VALIDATION.checkDuplicatePOI(poiId, dayIndex).isDuplicate;
  }
};

// Expose to window
window.ITINERARY = ITINERARY_SYSTEM;

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    ITINERARY_SYSTEM.initState();
  }, 500);
});
