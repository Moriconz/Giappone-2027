// ============================================================================
// itinerary-phase4.js — cleanupSoftDeletedPOIs, describeAction,
//   getMergeConflictInfo, recordMergeConflict
// Extracted from app-core.js. Deps (all window.*): state, saveState
// (ponytail: rimosse softDeletePOI/getItineraryVersionHistory/getPOIFieldHistory,
//  morte — 0 chiamanti. Storia versioni reale: js/views/itinerary-version-history.js)
// ============================================================================
(function () {
  'use strict';

  function cleanupSoftDeletedPOIs(itineraryId) {
    console.log('[Cleanup] Running soft delete cleanup for:', itineraryId);

    if (!window.state.groupItineraries?.[itineraryId]) {
      console.warn('[Cleanup] Itinerary not found');
      return 0;
    }

    const itinerary = window.state.groupItineraries[itineraryId];
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const initialCount = itinerary.pois.length;

    itinerary.pois = itinerary.pois.filter(poi => {
      const isOldDeleted = poi.deletionTimestamp && poi.deletionTimestamp < thirtyDaysAgo;
      if (isOldDeleted) {
        console.log('[Cleanup] Removing permanently deleted POI:', poi.googlePlaceId);
      }
      return !isOldDeleted;
    });

    const removed = initialCount - itinerary.pois.length;
    if (removed > 0) {
      itinerary.version++;
      window.state.groupItineraries[itineraryId] = itinerary;
      window.saveState?.();
      console.log('[Cleanup] ✓ Removed', removed, 'permanently deleted POIs');
    }

    return removed;
  }

  function describeAction(action, poiId) {
    const descriptions = {
      'add_poi': '➕ Tappa aggiunta',
      'delete_poi': '🗑️ Tappa rimossa',
      'soft_delete_poi': '⬜ Tappa cancellata (morbida)',
      'modify_field': '✏️ Campo modificato',
      'modify_opening_hours': '🕐 Orari aggiornati',
      'merge': '🔄 Conflitto risolto'
    };
    return descriptions[action] || '❓ Azione sconosciuta';
  }

  function getMergeConflictInfo(itineraryId) {
    const itinerary = window.state.groupItineraries?.[itineraryId];
    if (!itinerary) return null;

    if (!itinerary.lastMergeConflicts) {
      return null;
    }

    return {
      timestamp: itinerary.lastMergeConflicts?.timestamp || Date.now(),
      resolvedCount: itinerary.lastMergeConflicts?.resolvedCount || 0,
      details: itinerary.lastMergeConflicts?.details || []
    };
  }

  function recordMergeConflict(itineraryId, conflicts) {
    if (!window.state.groupItineraries?.[itineraryId]) return;

    const itinerary = window.state.groupItineraries[itineraryId];
    itinerary.lastMergeConflicts = {
      timestamp: Date.now(),
      resolvedCount: conflicts?.length || 0,
      details: conflicts || []
    };

    window.saveState?.();
  }

  window.cleanupSoftDeletedPOIs = cleanupSoftDeletedPOIs;
  window.describeAction = describeAction;
  window.getMergeConflictInfo = getMergeConflictInfo;
  window.recordMergeConflict = recordMergeConflict;
})();
