// ============================================================================
// itinerary-phase4.js — softDeletePOI, cleanupSoftDeletedPOIs,
//   getItineraryVersionHistory, getPOIFieldHistory, describeAction,
//   getMergeConflictInfo, recordMergeConflict
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, makePeerId, pushUndoState, broadcastItinerary
// ============================================================================
(function () {
  'use strict';

  function softDeletePOI(itineraryId, googlePlaceId) {
    console.log('[SoftDelete] Soft-deleting POI:', googlePlaceId);

    if (!window.state.groupItineraries?.[itineraryId]) {
      console.warn('[SoftDelete] Itinerary not found');
      return;
    }

    const itinerary = window.state.groupItineraries[itineraryId];
    const poi = itinerary.pois.find(p => p.googlePlaceId === googlePlaceId);

    if (!poi) {
      console.warn('[SoftDelete] POI not found');
      return;
    }

    let myPeerId = window.makePeerId?.(itinerary.roomId, window.state.group.myName);
    if (!myPeerId) {
      myPeerId = `${itinerary.roomId}_${window.state.group.myName}`;
    }

    poi.deleted = {
      value: true,
      timestamp: Date.now(),
      peerId: myPeerId
    };
    poi.deletionTimestamp = Date.now();

    itinerary.version++;
    window.pushUndoState?.('soft_delete_poi', itineraryId, googlePlaceId, { poi });

    window.state.groupItineraries[itineraryId] = itinerary;
    window.saveState?.();

    console.log('[SoftDelete] ✓ POI marked as deleted. Version:', itinerary.version);

    window.broadcastItinerary?.(itineraryId);
    window.dispatchEvent(new CustomEvent('itinerary_updated', {
      detail: { itineraryId, itinerary }
    }));
  }

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

  function getItineraryVersionHistory(itineraryId) {
    const undoRedo = window.state.undoRedo;
    if (!undoRedo) return [];

    return undoRedo.stack
      .filter(entry => entry.itineraryId === itineraryId)
      .map((entry, index) => ({
        index,
        action: entry.action,
        timestamp: entry.timestamp,
        peerId: entry.peerId,
        poiId: entry.poiId,
        description: describeAction(entry.action, entry.poiId)
      }));
  }

  function getPOIFieldHistory(itineraryId, googlePlaceId) {
    const itinerary = window.state.groupItineraries?.[itineraryId];
    if (!itinerary) return {};

    const poi = itinerary.pois.find(p => p.googlePlaceId === googlePlaceId);
    if (!poi) return {};

    const fieldHistory = {};
    Object.keys(poi).forEach(key => {
      if (key === 'googlePlaceId' || key === 'fields') return;
      const val = poi[key];

      if (val && typeof val === 'object' && 'timestamp' in val && 'peerId' in val) {
        fieldHistory[key] = {
          value: val.value,
          timestamp: val.timestamp,
          peerId: val.peerId,
          lastModified: new Date(val.timestamp).toLocaleString()
        };
      }
    });

    return fieldHistory;
  }

  function describeAction(action, poiId) {
    const descriptions = {
      'add_poi': '➕ Tappa aggiunta',
      'delete_poi': '🗑️ Tappa rimossa',
      'soft_delete_poi': '⬜ Tappa cancellata (morbida)',
      'modify_field': '✏️ Campo modificato',
      'merge': '🔄 Merge risolvere'
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

  window.softDeletePOI = softDeletePOI;
  window.cleanupSoftDeletedPOIs = cleanupSoftDeletedPOIs;
  window.getItineraryVersionHistory = getItineraryVersionHistory;
  window.getPOIFieldHistory = getPOIFieldHistory;
  window.describeAction = describeAction;
  window.getMergeConflictInfo = getMergeConflictInfo;
  window.recordMergeConflict = recordMergeConflict;
})();
