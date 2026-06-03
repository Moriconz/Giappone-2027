/**
 * BUDGET WIDGET HELPER — Progressive disclosure for budget UI
 *
 * Implements 3 levels of budget widget sophistication:
 *
 * LEVEL 1 (Current): Manual POI costs only
 * LEVEL 2 (Future): Real POI data (opening hours, verified prices)
 * LEVEL 3 (Future): Full routing + dynamic budget
 *
 * Each level is correct for its data maturity. No fake data, no ¥0 for "not implemented".
 */

const BUDGET_WIDGET_HELPER = {
  /**
   * Get realistic manual POI costs only (data available TODAY)
   * Never includes transport or ticket costs (not yet supported)
   */
  getManualPOICostData() {
    if (!window.state?.itineraryByDay) {
      return { total: 0, count: 0, entries: [] };
    }

    let totalManualCost = 0;
    let costedPOICount = 0;
    const entries = [];

    const days = window.state.tripProfile?.days || 8;
    for (let d = 0; d < days; d++) {
      const dayPOIs = window.state.itineraryByDay[d] || [];
      dayPOIs.forEach(entry => {
        if (entry.cost > 0) {
          totalManualCost += entry.cost;
          costedPOICount += 1;
          entries.push({
            day: d,
            poi_name: entry.poi_name,
            cost: entry.cost,
            source: 'manual'
          });
        }
      });
    }

    return {
      total: Math.round(totalManualCost),
      count: costedPOICount,
      entries: entries
    };
  },

  /**
   * Check if budget_total is realistic (user actually set a budget)
   * Returns null if budget is not real or is just a default fallback
   */
  getRealisticBudgetTotal() {
    const tripProfile = window.state?.tripProfile || {};
    const budget = tripProfile.budget_total || 0;

    // If budget is 0 or not set explicitly, treat as "no budget"
    // This prevents false "Rimasto" calculations
    if (!budget || budget === 0) {
      return null;
    }

    return budget;
  },

  /**
   * Get total POI count across all days
   * Used for context in budget display
   */
  getTotalPOICount() {
    if (!window.state?.itineraryByDay) return 0;

    const days = window.state.tripProfile?.days || 8;
    let total = 0;
    for (let d = 0; d < days; d++) {
      total += (window.state.itineraryByDay[d] || []).length;
    }
    return total;
  },

  /**
   * Build the UI model for budget widget header
   * Returns a configuration object that tells the UI what to render
   *
   * @returns {Object} UI model with mode, title, values, visibility flags
   */
  getBudgetHeaderModel() {
    const manualCostData = this.getManualPOICostData();
    const budgetTotal = this.getRealisticBudgetTotal();
    const totalPOIs = this.getTotalPOICount();

    // LEVEL 1: Manual costs only (current state)
    // This is the ONLY mode until transport + ticket are real
    return {
      // Mode identifies which feature set is active
      mode: 'manual-only',

      // UI strings
      title: 'Costi tappe',
      primaryLabel: 'Totale inserito',
      primaryValue: `¥${manualCostData.total}`,

      // Context
      secondaryLabel: manualCostData.count > 0
        ? `${manualCostData.count}/${totalPOIs} POI con costo`
        : `${totalPOIs} POI senza costo`,

      // Info note (always visible)
      infoText: 'Trasporti non ancora inclusi',

      // Visibility flags for future features
      showBudgetComparison: false,  // Don't show Pianificato/Speso/Rimasto
      showRemainingBudget: false,   // Don't show "Rimasto"
      showProgressBar: false,       // Don't show % allocato
      showTransportBreakdown: false, // Don't show 🚌 Trasporti

      // Raw data for future upgrades
      manualCostTotal: manualCostData.total,
      costedPOICount: manualCostData.count,
      totalPOICount: totalPOIs,
      budgetTotal: budgetTotal, // null if not real

      // Debug
      debugInfo: {
        hasExplicitBudget: budgetTotal !== null,
        manualEntries: manualCostData.entries.length,
        dataMaturity: 'manual-only'
      }
    };
  },

  /**
   * Format currency value
   */
  formatYen(value) {
    return `¥${Math.round(value)}`;
  },

  /**
   * Check if we have enough data to show any metrics
   */
  hasAnyData() {
    return this.getTotalPOICount() > 0 || this.getManualPOICostData().total > 0;
  },

  /**
   * Prepare for LEVEL 2 (future: real POI data)
   * This function is a placeholder for when opening_hours/price verification arrives
   * It will NOT be used until those features are actually implemented
   */
  getBudgetHeaderModel_Level2_POIEnriched() {
    // NOTE: This is NOT active. Placeholder for future implementation.
    // Will be called when:
    // - opening_hours are fetched and verified from Google Places
    // - price_level is fetched and verified from Google Places
    // - ticket_cost is properly populated per POI
    return {
      mode: 'poi-enriched', // Future mode
      title: 'Costi POI',
      sections: [
        { label: 'Manuali', value: 0 },
        { label: 'Verificati', value: 0 },
        { label: 'Mancanti (stima)', value: 0 }
      ],
      infoText: 'Prezzi importati da Google Places',
      showBreakdown: true,
      debugInfo: { dataMaturity: 'poi-enriched' }
    };
  },

  /**
   * Get budget breakdown by category
   * Returns object with category totals (only includes categories with cost > 0)
   */
  getBudgetByCategory() {
    if (!window.state?.itineraryByDay) {
      return { cibo: 0, trasporti: 0, ingressi: 0, shopping: 0, altro: 0 };
    }

    const categories = { cibo: 0, trasporti: 0, ingressi: 0, shopping: 0, altro: 0 };
    const days = window.state.tripProfile?.days || 8;

    for (let d = 0; d < days; d++) {
      const dayPOIs = window.state.itineraryByDay[d] || [];
      dayPOIs.forEach(entry => {
        const tag = entry.tag || 'altro';
        if (categories.hasOwnProperty(tag)) {
          categories[tag] += (entry.cost || 0);
        }
      });
    }

    return categories;
  },

  /**
   * Prepare for LEVEL 3 (future: full routing + dynamic budget)
   * Will ONLY be used when:
   * - routing between consecutive POI is reliable
   * - transport costs are real (not estimates)
   * - budget_total is always set and reflects reality
   */
  getBudgetHeaderModel_Level3_FullBudget() {
    // NOTE: This is NOT active. Placeholder for future implementation.
    return {
      mode: 'full-budget', // Future mode
      title: 'Budget Viaggio',
      sections: [
        { label: 'Pianificato', value: 0, color: '#FF6B35' },
        { label: 'Stimato', value: 0, color: '#4ade80' },
        { label: 'Rimasto', value: 0, color: '#4ade80' }
      ],
      breakdown: [
        { label: '🏪 POI & Ticket', value: 0 },
        { label: '🚌 Trasporti', value: 0 },
        { label: '✈️ Voli/Alberghi', value: 0 }
      ],
      progressBar: { percent: 0, color: '#4ade80' },
      infoText: 'Budget completo con trasporti e verifiche',
      debugInfo: { dataMaturity: 'full-budget' }
    };
  }
};
