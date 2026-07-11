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
   * @param {string} tag - Budget category: "cibo", "trasporti", "ingressi", "shopping", "altro" (default "altro")
   */
  addPOIToDay(poiId, poiName, dayIndex, time = "10:00", duration = 60, notes = "", cost = 0, tag = "altro", lat = null, lng = null) {
    if (!window.state?.itineraryByDay) {
      this.initState();
    }

    if (dayIndex < 0) {
      console.warn('[Itinerary] Invalid day index:', dayIndex);
      return false;
    }

    // Auto-estende i giorni se itineraryByDay è desincronizzato da tripProfile.days
    // (es. itineraryByDay creato a 8 giorni prima dell'onboarding, poi tripProfile.days aumentato).
    const tripDays = window.state?.tripProfile?.days || 0;
    const targetDays = Math.max(Object.keys(window.state.itineraryByDay).length, tripDays, dayIndex + 1);
    for (let i = 0; i < targetDays; i++) {
      if (!Array.isArray(window.state.itineraryByDay[i])) window.state.itineraryByDay[i] = [];
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
      tag: tag,
      lat: lat,
      lng: lng,
      status: "proposed",
      addedBy: window.state?.group?.myName || 'Sconosciuto',
      lastModified: Date.now(),
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

    ITINERARY_SYSTEM.autoSortDayByTime(dayIndex);
    window.saveState?.();
    window.GROUP_SYNC?.broadcastItinerary?.();
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
      // Tombstone: evita che un sync da un altro tab (GROUP_SYNC, last-write-wins
      // su lastModified) faccia resuscitare questa tappa da uno stato più vecchio.
      // ponytail: mappa non pota mai (nessun TTL/cap) — ok per un itinerario
      // personale (decine di tappe), da limitare se un giorno diventa enorme.
      if (!window.state.itineraryTombstones) window.state.itineraryTombstones = {};
      window.state.itineraryTombstones[poiId] = Date.now();
      console.log('[Itinerary] Removed POI:', poiId);
      window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
      window.GROUP_SYNC?.broadcastItinerary?.();
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
        entry.lastModified = Date.now();
        console.log('[Itinerary] Updated time for', poiId, 'to', newTime);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        window.GROUP_SYNC?.broadcastItinerary?.();
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
        entry.lastModified = Date.now();
        console.log('[Itinerary] Updated notes for', poiId);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        window.GROUP_SYNC?.broadcastItinerary?.();
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
        entry.lastModified = Date.now();
        console.log('[Itinerary] Updated duration for', poiId, 'to', duration, 'min');
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        window.GROUP_SYNC?.broadcastItinerary?.();
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
        entry.lastModified = Date.now();
        console.log('[Itinerary] Updated cost for', poiId, 'to', cost);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        window.GROUP_SYNC?.broadcastItinerary?.();
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

    // Add to new day. ponytail: itineraryByDay può non avere ancora l'indice
    // toDayIndex (es. onboarding rifatto con più giorni senza mai toccare
    // itineraryByDay già esistente) — senza questa guardia si perdeva la
    // tappa (già rimossa dal giorno sorgente) con un TypeError non gestito.
    if (!Array.isArray(window.state.itineraryByDay[toDayIndex])) window.state.itineraryByDay[toDayIndex] = [];
    entry.lastModified = Date.now();
    window.state.itineraryByDay[toDayIndex].push(entry);
    console.log('[Itinerary] Moved', poiId, 'from day', fromDayIndex, 'to', toDayIndex);

    window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
    window.GROUP_SYNC?.broadcastItinerary?.();
    return true;
  },

  /**
   * Get total budget spent in itinerary (sum of all POI costs)
   */
  calculateBudgetSpent() {
    if (!window.state?.itineraryByDay) return 0;

    let totalSpent = 0;
    for (const day of Object.values(window.state.itineraryByDay)) {
      if (Array.isArray(day)) {
        for (const entry of day) {
          if (entry && entry.cost && typeof entry.cost === 'number') {
            totalSpent += entry.cost;
          }
        }
      }
    }
    return Math.round(totalSpent);
  },

  /**
   * Get total duration for a day
   */
  getDayDuration(dayIndex) {
    if (!window.state?.itineraryByDay[dayIndex]) return 0;
    return window.state.itineraryByDay[dayIndex].reduce((sum, e) => sum + (e.duration || 60), 0);
  },

  /**
   * Auto-sort POIs in a day by time if all have time set
   */
  autoSortDayByTime(dayIdx) {
    const entries = window.state.itineraryByDay[dayIdx];
    if (!entries || entries.length < 2) return;
    const allHaveTime = entries.every(e => e.time && e.time.length === 5);
    if (!allHaveTime) return;
    entries.sort((a, b) => parseInt(a.time.replace(':', ''), 10) - parseInt(b.time.replace(':', ''), 10));
  },

  /**
   * Ottimizza l'ordine delle tappe di un giorno minimizzando gli spostamenti
   * (nearest-neighbor sulle coordinate) e riassegna gli orari in sequenza.
   * Le coordinate si leggono dall'entry o, in fallback, da allPOIs(). Le tappe
   * senza coordinate restano in coda.
   */
  // ── Base del giorno (hotel/alloggio) ──────────────────────────────────
  // La giornata reale parte dall'alloggio, non dalla prima tappa: la base è
  // il seed del nearest-neighbor in optimizeDay. Storage: state.dayBases.
  setDayBase(dayIdx, base) {
    if (!window.state) return false;
    if (!window.state.dayBases || typeof window.state.dayBases !== 'object') window.state.dayBases = {};
    if (!base || typeof base.lat !== 'number' || typeof base.lng !== 'number') return false;
    window.state.dayBases[dayIdx] = { name: String(base.name || 'Base').slice(0, 60), lat: base.lat, lng: base.lng };
    window.saveState?.();
    return true;
  },

  clearDayBase(dayIdx) {
    if (window.state?.dayBases) { delete window.state.dayBases[dayIdx]; window.saveState?.(); }
  },

  getDayBase(dayIdx) {
    return window.state?.dayBases?.[dayIdx] || null;
  },

  optimizeDay(dayIdx) {
    const day = window.state?.itineraryByDay?.[dayIdx];
    if (!day || day.length < 3) return false;
    const R = window.ROUTING;
    if (!R) return false;
    const pois = (typeof window.allPOIs === 'function') ? window.allPOIs() : [];
    const coordOf = (e) => {
      if (typeof e.lat === 'number' && typeof e.lng === 'number') return [e.lat, e.lng];
      const p = pois.find(x => x.id === e.poi_id);
      return (p && typeof p.lat === 'number' && typeof p.lng === 'number') ? [p.lat, p.lng] : null;
    };
    const withCoords = day.filter(e => coordOf(e));
    const withoutCoords = day.filter(e => !coordOf(e));
    if (withCoords.length < 2) return false;

    // Nearest-neighbor. Seed: la base del giorno (hotel) se impostata —
    // il giro reale parte da lì — altrimenti la prima tappa.
    const base = this.getDayBase(dayIdx);
    let remaining, ordered;
    if (base) {
      remaining = withCoords.slice();
      ordered = [];
      let bi = 0, bd = Infinity;
      remaining.forEach((e, i) => {
        const c = coordOf(e);
        const d = R.estimateDistanceHaversine(base.lat, base.lng, c[0], c[1]);
        if (d < bd) { bd = d; bi = i; }
      });
      ordered.push(remaining.splice(bi, 1)[0]);
    } else {
      remaining = withCoords.slice(1);
      ordered = [withCoords[0]];
    }
    while (remaining.length) {
      const last = coordOf(ordered[ordered.length - 1]);
      let bi = 0, bd = Infinity;
      remaining.forEach((e, i) => {
        const c = coordOf(e);
        const d = R.estimateDistanceHaversine(last[0], last[1], c[0], c[1]);
        if (d < bd) { bd = d; bi = i; }
      });
      ordered.push(remaining.splice(bi, 1)[0]);
    }

    // Riassegna orari sequenziali (start = orario della prima tappa)
    const toMin = s => { const [h, m] = (s || '10:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const toStr = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    let cur = toMin(ordered[0].time);
    for (let i = 0; i < ordered.length; i++) {
      ordered[i].time = toStr(cur);
      ordered[i].lastModified = Date.now();
      const dur = ordered[i].duration || 60;
      let travel = 0;
      if (i < ordered.length - 1) {
        const a = coordOf(ordered[i]), b = coordOf(ordered[i + 1]);
        const dist = R.estimateDistanceHaversine(a[0], a[1], b[0], b[1]);
        travel = R.estimateDuration(dist, R.suggestMode(dist));
      }
      cur += dur + travel;
    }

    // Auto-snapshot before reordering (recoverable via Snapshots panel)
    window.ItinerarySnapshots?.saveAuto?.('optimize-day-' + dayIdx);
    window.state.itineraryByDay[dayIdx] = [...ordered, ...withoutCoords];
    window.saveState?.();
    window.GROUP_SYNC?.broadcastItinerary?.();
    return true;
  },

  /**
   * Mark POI as visited
   */
  markVisited(poiId) {
    if (!window.state?.itineraryByDay) return false;
    for (const day of Object.values(window.state.itineraryByDay)) {
      const entry = day.find(e => e.poi_id === poiId);
      if (entry) {
        const wasVisited = entry.status === 'visited';
        entry.status = wasVisited ? 'proposed' : 'visited';
        entry.lastModified = Date.now();
        console.log('[Itinerary] Toggled visited status for', poiId, '→', entry.status);

        // When marking as visited without cost, prompt for actual cost
        if (!wasVisited && entry.status === 'visited' && (!entry.cost || entry.cost === 0)) {
          (window.modalPrompt || ((msg, o) => Promise.resolve(prompt(msg, o?.defaultValue || ''))))(
            `💰 Costo effettivo di "${entry.poi_name}" in ¥`,
            { defaultValue: '0', placeholder: '0', label: 'Inserisci 0 se gratuito' }
          ).then(costInput => {
            if (costInput !== null) {
              const actualCost = parseFloat(costInput) || 0;
              if (actualCost >= 0) {
                entry.cost = actualCost;
                window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
                window.renderItineraryUnified?.();
              }
            }
          });
        }

        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        window.GROUP_SYNC?.broadcastItinerary?.();
        window.renderItineraryUnified?.();

        // Update budget tab if POI has cost
        if (entry.cost > 0) {
          console.log('[Itinerary] Auto-updating budget view, cost:', entry.cost);
          window.renderBudgetView?.();
        }

        return true;
      }
    }
    return false;
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
      tag: entry.tag || 'altro',
      status: entry.status || 'proposed',
      addedBy: entry.addedBy || 'Sconosciuto',
      lastModified: entry.lastModified ?? Date.now(),
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
   * Calcola route_from_prev (distanza, durata, modo, costo ¥) per ogni tappa del
   * giorno a partire dalla precedente. Coordinate da entry.lat/lng o da allPOIs().
   * Alimenta sia il rendering delle tratte sia il budget trasporti.
   */
  computeDayRouting(dayIndex) {
    const day = window.state?.itineraryByDay?.[dayIndex];
    if (!day || !window.ROUTING) return;
    const pois = (typeof window.allPOIs === 'function') ? window.allPOIs() : [];
    const coordOf = (e) => {
      if (typeof e.lat === 'number' && typeof e.lng === 'number') return [e.lat, e.lng];
      const p = pois.find(x => x.id === e.poi_id);
      return (p && typeof p.lat === 'number' && typeof p.lng === 'number') ? [p.lat, p.lng] : null;
    };
    for (let i = 0; i < day.length; i++) {
      if (i === 0) { day[i].route_from_prev = null; continue; }
      const a = coordOf(day[i - 1]), b = coordOf(day[i]);
      if (!a || !b) { day[i].route_from_prev = null; continue; }
      const dist = window.ROUTING.estimateDistanceHaversine(a[0], a[1], b[0], b[1]);
      const mode = window.ROUTING.suggestMode(dist);
      day[i].route_from_prev = {
        distance_km: Math.round(dist * 10) / 10,
        duration_min: window.ROUTING.estimateDuration(dist, mode),
        mode,
        cost: window.ROUTING.estimateFare(dist, mode)
      };
    }
  },

  /**
   * Calculate budget breakdown for a specific day
   * Returns: { poi_cost, ticket_cost, transport_cost, total }
   */
  calculateDayBudget(dayIndex) {
    if (!window.state?.itineraryByDay?.[dayIndex]) {
      return { poi_cost: 0, ticket_cost: 0, transport_cost: 0, total: 0 };
    }

    // Assicura che le tratte (e i relativi costi) siano calcolate anche se
    // l'itinerario non è stato ancora renderizzato (es. apertura diretta del Budget)
    this.computeDayRouting(dayIndex);

    const dayPOIs = window.state.itineraryByDay[dayIndex];
    let poiCost = 0;
    let ticketCost = 0;
    let transportCost = 0;

    dayPOIs.forEach(entry => {
      poiCost += entry.cost || 0;
      ticketCost += entry.ticket_cost || 0;
      if (entry.route_from_prev) {
        // Usa il fare stimato (estimateFare); fallback alla vecchia stima se assente
        transportCost += (entry.route_from_prev.cost != null)
          ? entry.route_from_prev.cost
          : Math.round((entry.route_from_prev.distance_km / 10) * 50);
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
