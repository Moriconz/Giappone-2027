/**
 * ITINERARY VALIDATION — Input validation with user-friendly messages
 *
 * Validates:
 * - Time format (HH:MM)
 * - Duration (positive number, 1-480 min reasonable range)
 * - Cost (non-negative number)
 * - Notes (any text, no validation needed)
 * - Duplicate POI detection in same day
 *
 * Returns: { valid: boolean, errors: [...], warnings: [...] }
 */

const ITINERARY_VALIDATION = {
  /**
   * Validate time format HH:MM
   * Returns: { valid: boolean, error?: string }
   */
  validateTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      return { valid: false, error: 'Orario non fornito' };
    }

    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return { valid: false, error: 'Formato orario non valido. Usa HH:MM (es: 14:30)' };
    }

    const hours = parseInt(match[1]);
    const mins = parseInt(match[2]);

    if (hours < 0 || hours > 23) {
      return { valid: false, error: 'Ore devono essere tra 00 e 23' };
    }
    if (mins < 0 || mins > 59) {
      return { valid: false, error: 'Minuti devono essere tra 00 e 59' };
    }

    return { valid: true };
  },

  /**
   * Validate duration in minutes
   * Reasonable range: 1-480 minutes (8 hours max per POI)
   */
  validateDuration(duration) {
    const dur = parseInt(duration);

    if (isNaN(dur)) {
      return { valid: false, error: 'Durata deve essere un numero' };
    }
    if (dur < 1) {
      return { valid: false, error: 'Durata minima: 1 minuto' };
    }
    if (dur > 480) {
      return { valid: false, error: 'Durata massima: 480 minuti (8 ore)' };
    }

    return { valid: true };
  },

  /**
   * Validate cost (non-negative, reasonable max)
   */
  validateCost(cost) {
    const c = parseInt(cost || 0);

    if (isNaN(c)) {
      return { valid: false, error: 'Costo deve essere un numero' };
    }
    if (c < 0) {
      return { valid: false, error: 'Costo non può essere negativo' };
    }
    if (c > 500000) {
      return { valid: false, error: 'Costo sembra troppo alto (> ¥500k)' };
    }

    return { valid: true };
  },

  /**
   * Validate a complete POI entry
   * Returns: { valid: boolean, errors: [...] }
   */
  validateEntry(entry) {
    const errors = [];

    // Time
    const timeValidation = this.validateTime(entry.time);
    if (!timeValidation.valid) errors.push(timeValidation.error);

    // Duration
    const durationValidation = this.validateDuration(entry.duration);
    if (!durationValidation.valid) errors.push(durationValidation.error);

    // Cost
    const costValidation = this.validateCost(entry.cost);
    if (!costValidation.valid) errors.push(costValidation.error);

    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Check for duplicate POI in same day
   * Returns: { isDuplicate: boolean, message?: string }
   */
  checkDuplicatePOI(poiId, dayIndex) {
    if (!window.state?.itineraryByDay?.[dayIndex]) {
      return { isDuplicate: false };
    }

    const dayPOIs = window.state.itineraryByDay[dayIndex];
    const alreadyExists = dayPOIs.some(e => e.poi_id === poiId);

    if (alreadyExists) {
      return {
        isDuplicate: true,
        message: 'Questo luogo è già stato aggiunto a questo giorno'
      };
    }

    return { isDuplicate: false };
  },

  /**
   * Validate all entries in a day
   * Returns: { valid: boolean, errors: { [poiId]: [...] } }
   */
  validateDay(dayIndex) {
    const dayPOIs = window.state?.itineraryByDay?.[dayIndex] || [];
    const errors = {};

    dayPOIs.forEach(entry => {
      const validation = this.validateEntry(entry);
      if (!validation.valid) {
        errors[entry.poi_id] = validation.errors;
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  },

  /**
   * Get user-friendly fallback message for missing data
   */
  getFallbackMessage(fieldName) {
    const messages = {
      opening_hours: 'Orari non disponibili',
      price_level: 'Fascia prezzo non disponibile',
      ticket_cost: 'Costo ticket non disponibile',
      route_from_prev: 'Rotta non calcolata',
      notes: 'Nessuna nota'
    };
    return messages[fieldName] || 'Dato non disponibile';
  }
};

window.ITINERARY_VALIDATION = ITINERARY_VALIDATION;
