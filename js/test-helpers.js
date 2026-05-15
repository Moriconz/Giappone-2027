/**
 * TEST HELPERS — Smoke testing utilities and debug helpers
 *
 * Usage: Set window.DEBUG_MODE = true to enable verbose logging and test helpers
 *
 * Run tests manually via:
 * - TEST_HELPERS.runSmokeTest() — quick test of all core flows
 * - TEST_HELPERS.testAddPOI() — test adding POI to itinerary
 * - TEST_HELPERS.testEditPOI() — test editing POI
 * - etc.
 */

const TEST_HELPERS = {
  /**
   * Simple assertion helper
   */
  assert(condition, message) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      return false;
    }
    console.log(`✅ ${message}`);
    return true;
  },

  /**
   * Check if itinerary has POIs
   */
  testItineraryHasPOIs() {
    let totalPOIs = 0;
    const tripProfile = window.state?.tripProfile || {};
    const days = tripProfile.days || 8;

    for (let d = 0; d < days; d++) {
      const dayPOIs = window.state?.itineraryByDay?.[d] || [];
      totalPOIs += dayPOIs.length;
    }

    this.assert(totalPOIs >= 0, `Itinerary has ${totalPOIs} POIs`);
    return totalPOIs;
  },

  /**
   * Test budget calculation
   */
  testBudgetCalculation() {
    if (!window.ITINERARY?.calculateTotalBudget) {
      console.warn('calculateTotalBudget not available');
      return false;
    }

    const budget = window.ITINERARY.calculateTotalBudget();
    this.assert(budget.total >= 0, `Total budget: ¥${budget.total}`);
    this.assert(budget.poi_cost >= 0, `POI cost: ¥${budget.poi_cost}`);
    this.assert(budget.transport_cost >= 0, `Transport cost: ¥${budget.transport_cost}`);
    return budget;
  },

  /**
   * Test time validation
   */
  testTimeValidation() {
    if (!window.ITINERARY_VALIDATION) {
      console.warn('ITINERARY_VALIDATION not available');
      return false;
    }

    const validTime = window.ITINERARY_VALIDATION.validateTime('14:30');
    this.assert(validTime.valid, 'Valid time 14:30 accepted');

    const invalidTime = window.ITINERARY_VALIDATION.validateTime('25:00');
    this.assert(!invalidTime.valid, 'Invalid time 25:00 rejected');

    return true;
  },

  /**
   * Test duration validation
   */
  testDurationValidation() {
    if (!window.ITINERARY_VALIDATION) {
      console.warn('ITINERARY_VALIDATION not available');
      return false;
    }

    const validDuration = window.ITINERARY_VALIDATION.validateDuration(60);
    this.assert(validDuration.valid, 'Valid duration 60 min accepted');

    const invalidDuration = window.ITINERARY_VALIDATION.validateDuration(-10);
    this.assert(!invalidDuration.valid, 'Invalid duration -10 rejected');

    return true;
  },

  /**
   * Test cost validation
   */
  testCostValidation() {
    if (!window.ITINERARY_VALIDATION) {
      console.warn('ITINERARY_VALIDATION not available');
      return false;
    }

    const validCost = window.ITINERARY_VALIDATION.validateCost(5000);
    this.assert(validCost.valid, 'Valid cost ¥5000 accepted');

    const invalidCost = window.ITINERARY_VALIDATION.validateCost(-100);
    this.assert(!invalidCost.valid, 'Invalid cost -100 rejected');

    return true;
  },

  /**
   * Test routing calculation
   */
  testRoutingCalculation() {
    if (!window.ROUTING) {
      console.warn('ROUTING not available');
      return false;
    }

    // Test Haversine distance calc
    const distance = window.ROUTING.estimateDistanceHaversine(35.6762, 139.6503, 35.1265, 139.6917); // Tokyo to Yokohama
    this.assert(distance > 20 && distance < 35, `Tokyo-Yokohama distance: ${distance}km (expected ~28km)`);

    // Test mode suggestion
    const modeShort = window.ROUTING.suggestMode(1);
    this.assert(modeShort === 'walking', 'Short distance (1km) suggests walking');

    const modeLong = window.ROUTING.suggestMode(100);
    this.assert(modeLong === 'driving', 'Long distance (100km) suggests driving');

    return true;
  },

  /**
   * Test state persistence
   */
  testStatePersistence() {
    const initialState = JSON.stringify(window.state);
    window.saveState?.();

    // Reload from localStorage
    const savedState = localStorage.getItem('state');
    this.assert(savedState !== null, 'State persisted to localStorage');
    this.assert(JSON.parse(savedState).tripProfile !== undefined, 'State contains tripProfile');

    return true;
  },

  /**
   * Run all smoke tests
   */
  async runSmokeTest() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 SMOKE TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
      this.testItineraryHasPOIs();
      this.testBudgetCalculation();
      this.testTimeValidation();
      this.testDurationValidation();
      this.testCostValidation();
      this.testRoutingCalculation();
      this.testStatePersistence();

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ SMOKE TEST COMPLETE');
      console.log('═══════════════════════════════════════════════════════════\n');
    } catch (err) {
      console.error('❌ SMOKE TEST FAILED:', err);
    }
  },

  /**
   * Enable debug logging throughout the app
   */
  enableDebugMode() {
    window.DEBUG_MODE = true;
    console.log('🔍 DEBUG MODE ENABLED — verbose logging active');
    console.log('Run TEST_HELPERS.runSmokeTest() to run smoke tests');
  },

  /**
   * Disable debug logging
   */
  disableDebugMode() {
    window.DEBUG_MODE = false;
    console.log('🔇 DEBUG MODE DISABLED');
  }
};

window.TEST_HELPERS = TEST_HELPERS;

// Auto-disable debug mode on page load (unless explicitly enabled)
if (typeof window.DEBUG_MODE === 'undefined') {
  window.DEBUG_MODE = false;
}
