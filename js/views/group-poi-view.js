// ============================================================================
// group-poi-view.js — showGroupSelectionModal, addPOIToGroupItinerary,
//   removePOIFromGroupItinerary, updatePOIFieldInGroupItinerary
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, toast, escapeHtml,
//   y2kWindows, makePeerId, pushUndoState, broadcastItinerary
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  /**
   * Show modal to select which group to add POI to
   * Called when user clicks "Aggiungi" from a POI card
   */
  function showGroupSelectionModal(poi) {
    console.log('[UI] showGroupSelectionModal for POI:', poi.name);

    if (!window.state.group || !window.state.group.roomId) {
      window.toast(T('toast.noGroup', '⚠️ Non sei in nessun gruppo. Crea o unisciti a un gruppo per condividere.'));
      return;
    }

    const roomId = window.state.group.roomId;
    const itineraryId = `group_itin_${roomId}`;

    // Build modal HTML
    const html = `
      <div style="padding: 0; min-width: 300px;">
        <div style="background:linear-gradient(135deg,rgba(74,124,89,.08),rgba(224,65,78,.06));border:1px solid rgba(20,30,60,.12);border-radius:10px;padding:14px;margin:12px;">
          <h3 style="margin:0 0 12px 0;color:var(--l-accent);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">📍 ${T('groupPoi.title','Aggiungi a Itinerario di Gruppo')}</h3>

          <div style="background:var(--l-btn-bg);border:2px solid var(--m-success);border-radius:8px;padding:12px;margin-bottom:12px;">
            <p style="margin:0 0 6px 0;color:var(--l-ink);font-weight:600;font-size:16px">${T('groupPoi.room','Stanza')}: ${window.escapeHtml(roomId)}</p>
            <p style="margin:0;color:var(--l-muted);font-size:14px">${T('groupPoi.addHint','Aggiungi <strong>{name}</strong> all\'itinerario di gruppo').replace('{name}', window.escapeHtml(poi.name))}</p>
          </div>

          <div style="display:flex;gap:8px">
            <button id="confirm-add-poi" class="btn-plain" style="flex:1;background-image:linear-gradient(180deg,var(--l-accent),var(--l-accent-600));border:2px solid var(--l-accent-600);color:white;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif">
              ✅ ${T('common.add','Aggiungi')}
            </button>
            <button id="cancel-add-poi" class="btn-plain" style="flex:1;background:var(--l-btn-bg);border:2px solid var(--l-hair);color:var(--l-ink);border-radius:8px;padding:10px;font-weight:600;cursor:pointer;">
              ❌ ${T('common.cancel','Annulla')}
            </button>
          </div>
        </div>
      </div>
    `;

    window.y2kWindows.open('group-selection-modal', T('groupPoi.windowTitle','Aggiungi al Gruppo'), html);

    // Attach event listeners
    setTimeout(() => {
      const confirmBtn = document.getElementById('confirm-add-poi');
      const cancelBtn = document.getElementById('cancel-add-poi');

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          addPOIToGroupItinerary(poi, roomId, itineraryId);
          window.y2kWindows.close('group-selection-modal');
          window.toast(T('toast.groupAdded', '✅ Tappa aggiunta all\'itinerario di gruppo!'));
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          window.y2kWindows.close('group-selection-modal');
        });
      }
    }, 0);
  }

  /**
   * Add POI to group itinerary and broadcast
   */
  function addPOIToGroupItinerary(poi, roomId, itineraryId) {
    console.log('[GroupItin] Adding POI to itinerary:', itineraryId);

    // Fallback for peerId if makePeerId not available
    let myPeerId = window.makePeerId?.(roomId, window.state.group.myName);
    if (!myPeerId) {
      myPeerId = `${roomId}_${window.state.group.myName}`;
    }

    // Initialize itineraries if needed
    if (!window.state.groupItineraries) window.state.groupItineraries = {};

    // Get or create itinerary
    let itinerary = window.state.groupItineraries[itineraryId];
    if (!itinerary) {
      itinerary = {
        id: itineraryId,
        roomId: roomId,
        name: { value: `Itinerario - ${window.state.group.myName}`, timestamp: Date.now(), peerId: myPeerId },
        version: 1,
        pois: [],
        createdAt: Date.now(),
        createdBy: window.state.group.myName
      };
    }

    // Check if POI already exists
    const poiExists = itinerary.pois.some(p => p.googlePlaceId === poi.id);
    if (poiExists) {
      console.log('[GroupItin] POI already in itinerary');
      window.toast(T('toast.stopAlready', '⚠️ Questa tappa è già nell\'itinerario'));
      return;
    }

    // Create POI entry with field metadata
    const poiEntry = {
      googlePlaceId: poi.id,
      name: { value: poi.name, timestamp: Date.now(), peerId: myPeerId },
      category: { value: poi.type || 'poi', timestamp: Date.now(), peerId: myPeerId },
      notes: { value: '', timestamp: Date.now(), peerId: myPeerId },
      lat: poi.lat,
      lng: poi.lng,
      // Position fields so the POI round-trips into the day-by-day personal view.
      // New group POIs default to the last existing day (or day 0).
      day: Number.isInteger(poi.day) ? poi.day : itinerary.pois.reduce((m, p) => Math.max(m, Number.isInteger(p.day) ? p.day : 0), 0),
      time: poi.time || '10:00',
      duration: poi.duration || 60,
      cost: poi.cost || 0,
      timestamp: Date.now(),
      addedByPeerId: myPeerId,
      addedAt: Date.now()
    };

    // Add to itinerary
    itinerary.pois.push(poiEntry);
    itinerary.version++;

    // Push to undo stack
    window.pushUndoState?.('add_poi', itineraryId, poi.id, { poi: poiEntry });

    // Update state
    window.state.groupItineraries[itineraryId] = itinerary;
    window.saveState?.();

    console.log('[GroupItin] ✓ POI added. Version:', itinerary.version, '| POIs:', itinerary.pois.length);

    // Broadcast to group
    window.broadcastItinerary?.(itineraryId);

    // Emit event for UI refresh
    window.dispatchEvent(new CustomEvent('itinerary_updated', {
      detail: { itineraryId, itinerary }
    }));
  }

  /**
   * Remove POI from group itinerary
   */
  function removePOIFromGroupItinerary(itineraryId, googlePlaceId) {
    console.log('[GroupItin] Removing POI from itinerary:', itineraryId, googlePlaceId);

    if (!window.state.groupItineraries?.[itineraryId]) {
      console.warn('[GroupItin] Itinerary not found');
      return;
    }

    const itinerary = window.state.groupItineraries[itineraryId];
    const poiIndex = itinerary.pois.findIndex(p => p.googlePlaceId === googlePlaceId);

    if (poiIndex === -1) {
      console.warn('[GroupItin] POI not found');
      return;
    }

    const removedPOI = itinerary.pois[poiIndex];
    itinerary.pois.splice(poiIndex, 1);
    itinerary.version++;

    // Push to undo stack
    window.pushUndoState?.('delete_poi', itineraryId, googlePlaceId, { poi: removedPOI });

    window.state.groupItineraries[itineraryId] = itinerary;
    window.saveState?.();

    console.log('[GroupItin] ✓ POI removed. Version:', itinerary.version);

    // Broadcast to group
    window.broadcastItinerary?.(itineraryId);

    // Emit event for UI refresh
    window.dispatchEvent(new CustomEvent('itinerary_updated', {
      detail: { itineraryId, itinerary }
    }));

    window.toast(T('toast.stopRemoved', '🗑️ Tappa rimossa'));
  }

  /**
   * Update POI field in group itinerary
   */
  function updatePOIFieldInGroupItinerary(itineraryId, googlePlaceId, fieldName, newValue) {
    console.log('[GroupItin] Updating field:', fieldName, 'in POI:', googlePlaceId);

    if (!window.state.groupItineraries?.[itineraryId]) {
      console.warn('[GroupItin] Itinerary not found');
      return;
    }

    const itinerary = window.state.groupItineraries[itineraryId];
    const poi = itinerary.pois.find(p => p.googlePlaceId === googlePlaceId);

    if (!poi) {
      console.warn('[GroupItin] POI not found');
      return;
    }

    // Fallback for peerId if makePeerId not available
    let myPeerId = window.makePeerId?.(itinerary.roomId, window.state.group.myName);
    if (!myPeerId) {
      myPeerId = `${itinerary.roomId}_${window.state.group.myName}`;
    }

    const oldValue = poi[fieldName];

    // Update field with metadata
    poi[fieldName] = {
      value: newValue,
      timestamp: Date.now(),
      peerId: myPeerId
    };

    itinerary.version++;

    // Push to undo stack
    window.pushUndoState?.('modify_field', itineraryId, googlePlaceId, {
      field: fieldName,
      oldValue,
      newValue
    });

    window.state.groupItineraries[itineraryId] = itinerary;
    window.saveState?.();

    console.log('[GroupItin] ✓ Field updated. Version:', itinerary.version);

    // Broadcast to group
    window.broadcastItinerary?.(itineraryId);

    // Emit event for UI refresh
    window.dispatchEvent(new CustomEvent('itinerary_updated', {
      detail: { itineraryId, itinerary }
    }));
  }

  window.showGroupSelectionModal = showGroupSelectionModal;
  window.addPOIToGroupItinerary = addPOIToGroupItinerary;
  window.removePOIFromGroupItinerary = removePOIFromGroupItinerary;
  window.updatePOIFieldInGroupItinerary = updatePOIFieldInGroupItinerary;
})();
