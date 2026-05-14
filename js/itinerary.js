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
   */
  addPOIToDay(poiId, poiName, dayIndex, time = "10:00") {
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
      duration: 60,
      notes: "",
      status: "proposed"
    };

    window.state.itineraryByDay[dayIndex].push(entry);
    console.log('[Itinerary] Added', poiName, 'to day', dayIndex);

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
      window.saveState?.();
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
        window.saveState?.();
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
        window.saveState?.();
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
