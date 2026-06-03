// ============================================================================
// opening-hours.js — fetchOpeningHoursFromGooglePlaces, parseOpeningHoursString,
//   formatOpeningHoursArray, setPOIOpeningHours, getPOIOpeningHours, isPOICurrentlyOpen
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, makePeerId, pushUndoState, broadcastItinerary
// ============================================================================
(function () {
  'use strict';

  function fetchOpeningHoursFromGooglePlaces(poi) {
    if (!poi) return null;

    const openingHours =
      poi.openingHours ||
      poi.hours ||
      poi.opening_hours ||
      poi.businessHours ||
      null;

    if (!openingHours) return null;

    if (typeof openingHours === 'string') {
      return parseOpeningHoursString(openingHours);
    }

    if (Array.isArray(openingHours)) {
      return formatOpeningHoursArray(openingHours);
    }

    if (typeof openingHours === 'object') {
      return openingHours;
    }

    return null;
  }

  function parseOpeningHoursString(str) {
    if (!str) return null;

    return {
      raw: str,
      format: 'string',
      parsed: str,
      source: 'manual'
    };
  }

  function formatOpeningHoursArray(arr) {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const formatted = {};

    arr.forEach((entry, idx) => {
      if (entry.open && entry.close) {
        const dayName = days[idx] || `Giorno ${idx}`;
        formatted[dayName] = `${entry.open.time} - ${entry.close.time}`;
      }
    });

    return {
      raw: arr,
      format: 'array',
      parsed: formatted,
      source: 'google_places'
    };
  }

  function setPOIOpeningHours(itineraryId, googlePlaceId, openingHoursData) {
    console.log('[OpeningHours] Setting hours for POI:', googlePlaceId);

    if (!window.state.groupItineraries?.[itineraryId]) {
      console.warn('[OpeningHours] Itinerary not found');
      return;
    }

    const itinerary = window.state.groupItineraries[itineraryId];
    const poi = itinerary.pois.find(p => p.googlePlaceId === googlePlaceId);

    if (!poi) {
      console.warn('[OpeningHours] POI not found');
      return;
    }

    let myPeerId = window.makePeerId?.(itinerary.roomId, window.state.group.myName);
    if (!myPeerId) {
      myPeerId = `${itinerary.roomId}_${window.state.group.myName}`;
    }

    poi.openingHours = {
      value: openingHoursData,
      timestamp: Date.now(),
      peerId: myPeerId,
      source: openingHoursData.source || 'manual'
    };

    itinerary.version++;
    window.pushUndoState?.('modify_opening_hours', itineraryId, googlePlaceId, { openingHours: openingHoursData });

    window.state.groupItineraries[itineraryId] = itinerary;
    window.saveState();

    console.log('[OpeningHours] ✓ Hours set. Source:', openingHoursData.source);

    window.broadcastItinerary?.(itineraryId);
    window.dispatchEvent(new CustomEvent('itinerary_updated', {
      detail: { itineraryId, itinerary }
    }));
  }

  function getPOIOpeningHours(itineraryId, googlePlaceId) {
    if (!window.state.groupItineraries?.[itineraryId]) return null;

    const itinerary = window.state.groupItineraries[itineraryId];
    const poi = itinerary.pois.find(p => p.googlePlaceId === googlePlaceId);

    if (!poi || !poi.openingHours) return null;

    const hours = poi.openingHours;
    const value = hours.value || hours;

    if (typeof value === 'string') {
      return value;
    }

    if (value.parsed) {
      return typeof value.parsed === 'string'
        ? value.parsed
        : JSON.stringify(value.parsed);
    }

    return JSON.stringify(value);
  }

  function isPOICurrentlyOpen(itineraryId, googlePlaceId) {
    const hours = getPOIOpeningHours(itineraryId, googlePlaceId);
    if (!hours) return null;

    const now = new Date();
    const dayName = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (hours.includes(dayName)) {
      const dayMatch = hours.match(new RegExp(`${dayName}[^a-zA-Z]*(\\d{1,2}:\\d{2})\\s*-\\s*(\\d{1,2}:\\d{2})`));
      if (dayMatch) {
        const [, openTime, closeTime] = dayMatch;
        return currentTime >= openTime && currentTime < closeTime;
      }
    }

    return null;
  }

  window.fetchOpeningHoursFromGooglePlaces = fetchOpeningHoursFromGooglePlaces;
  window.parseOpeningHoursString = parseOpeningHoursString;
  window.formatOpeningHoursArray = formatOpeningHoursArray;
  window.setPOIOpeningHours = setPOIOpeningHours;
  window.getPOIOpeningHours = getPOIOpeningHours;
  window.isPOICurrentlyOpen = isPOICurrentlyOpen;
})();
