// ============================================================================
// itinerary-delete.js — deletePersonalItinerary, requestUnshare, acceptUnshareRequest
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, toast, getSharedGroups, unmarkItinerarySharedWithGroup,
//   rtdbBroadcast, peerGPS, modalConfirm
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  // ═════════════════════════════════════════════════════════════════
  // PHASE 6: DELETE & UNSHARE FUNCTIONALITY
  // ═════════════════════════════════════════════════════════════════

  /**
   * Delete personal itinerary with confirmation if it's shared (Option C)
   * If shared: asks "Itinerario condiviso con N gruppi. Eliminare ovunque?"
   */
  async function deletePersonalItinerary() {
    const sharedGroups = window.getSharedGroups?.('personal_itinerary') || [];

    if (sharedGroups.length > 0) {
      // Shared itinerary: ask for confirmation
      const message = sharedGroups.length === 1
        ? `⚠️ Itinerario condiviso con 1 gruppo (${sharedGroups[0].groupId}). Eliminare ovunque?`
        : `⚠️ Itinerario condiviso con ${sharedGroups.length} gruppi. Eliminare ovunque?`;

      const confirmed = await (window.modalConfirm || confirm)(message, { danger: true, confirmText: 'Elimina' });
      if (!confirmed) {
        return false; // User cancelled
      }

      // Delete from all shared groups
      sharedGroups.forEach(share => {
        const groupItinId = `group_${share.groupId}_shared`;
        if (window.state.groupItineraries?.[groupItinId]) {
          delete window.state.groupItineraries[groupItinId];
        }
        window.unmarkItinerarySharedWithGroup?.('personal_itinerary', share.groupId);

        // Broadcast deletion to group
        if (window.peerGPS && window.rtdbBroadcast) {
          window.rtdbBroadcast({
            type: 'itinerary_deleted',
            payload: {
              itineraryId: groupItinId,
              groupId: share.groupId,
              deletedBy: window.state.group?.myName || 'Unknown'
            }
          });
        }
      });

      console.log('[Delete] Deleted shared itinerary from all groups');
    }

    // Delete personal itinerary
    window.state.itinerary = [];
    window.saveState?.();
    console.log('[Delete] Deleted personal itinerary');
    window.toast(T('toast.itinDeleted', '🗑️ Itinerario eliminato'));
    return true;
  }

  /**
   * Request unshare of itinerary from a specific group (for non-owners)
   * Owner receives: "Marco ha richiesto di smettere di condividere l'itinerario"
   */
  function requestUnshare(itineraryId, groupId) {
    const myName = window.state.group?.myName || 'Unknown';
    const owner = window.state.groupItineraries?.[`group_${groupId}_shared`]?.owner;

    if (!owner) {
      window.toast('⚠️ Impossibile trovare il proprietario dell\'itinerario'); // rare internal error, no i18n key needed
      return;
    }

    // Send request to owner
    if (window.rtdbBroadcast) {
      window.rtdbBroadcast({
        type: 'itinerary_unshare_request',
        payload: {
          itineraryId: itineraryId,
          groupId: groupId,
          requestedBy: myName,
          requestedAt: Date.now()
        }
      });
    }

    window.toast(`📨 Richiesta inviata a ${owner} per smettere di condividere`);
    console.log('[Unshare] Requested unshare from', owner);
  }

  /**
   * Accept unshare request and remove itinerary from group
   */
  function acceptUnshareRequest(groupId, requestedBy) {
    window.unmarkItinerarySharedWithGroup?.('personal_itinerary', groupId);
    const groupItinId = `group_${groupId}_shared`;
    if (window.state.groupItineraries?.[groupItinId]) {
      delete window.state.groupItineraries[groupItinId];
    }

    window.saveState?.();

    // Notify group
    if (window.rtdbBroadcast) {
      window.rtdbBroadcast({
        type: 'itinerary_unshared',
        payload: {
          groupId: groupId,
          unsharedBy: window.state.group?.myName || 'Unknown',
          unsharedAt: Date.now()
        }
      });
    }

    window.toast(`✅ Non più condiviso con ${groupId}`);
    console.log('[Unshare] Accepted unshare request from', requestedBy);
  }

  // Make delete/unshare functions globally accessible
  window.deletePersonalItinerary = deletePersonalItinerary;
  window.requestUnshare = requestUnshare;
  window.acceptUnshareRequest = acceptUnshareRequest;
})();
