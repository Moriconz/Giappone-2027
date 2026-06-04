// ============================================================================
// group-share-view.js — showNoGroupModal, showShareItineraryModal,
//   sharePersonalItineraryToGroup, escapeHtml, editGroupItinerary,
//   showGroupItineraryEditor, attachEditorEvents, addPoiToEditor
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, toast, openSheet, closeSheet, renderGroupView,
//   markItinerarySharedWithGroup, syncPersonalToSharedGroups, broadcastItinerary,
//   peerGPS, ITINERARY
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

function showNoGroupModal() {
  console.log('[NoGroupModal] Showing modal for no group');

  const html = `
    <div style="padding: 0; min-width: 300px;">
      <div style="background:linear-gradient(135deg,rgba(255,107,53,.15),rgba(255,20,147,.1));border:1px solid var(--m-accent);border-radius:10px;padding:16px;margin:12px;">
        <h3 style="margin:0 0 12px 0;color:var(--m-accent);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">⚠️ Non sei in nessun gruppo</h3>

        <p style="margin:0 0 16px 0;color:#fff;font-size:13px;line-height:1.5;">
          Per condividere il tuo itinerario con altri, devi prima entrare in un gruppo oppure crearne uno nuovo.
        </p>

        <div style="display:flex;gap:8px">
          <button id="btn-go-groups" style="flex:1;background:linear-gradient(180deg,var(--m-accent),#FF8C42);border:2px solid var(--m-accent);color:white;border-radius:8px;padding:11px;font-weight:600;cursor:pointer;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif">
            👥 Gruppami
          </button>
          <button id="btn-close-no-group" style="flex:1;background:rgba(255,107,53,.2);border:2px solid rgba(255,107,53,.5);color:#fff;border-radius:8px;padding:11px;font-weight:600;cursor:pointer;">
            ❌ Chiudi
          </button>
        </div>
      </div>
    </div>
  `;

  window.y2kWindows.open('no-group-modal', 'Non sei in nessun gruppo', html);

  // Attach event listeners
  setTimeout(() => {
    const goGroupsBtn = document.getElementById('btn-go-groups');
    const closeBtn = document.getElementById('btn-close-no-group');

    if (goGroupsBtn) {
      goGroupsBtn.addEventListener('click', () => {
        console.log('[NoGroupModal] Navigating to groups tab');
        console.log('[NoGroupModal] Setting pendingShareItinerary flag');
        window.state.pendingShareItinerary = true;
        window.y2kWindows.close('no-group-modal');

        setTimeout(() => {
          window.renderGroupView();
        }, 200);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('[NoGroupModal] Closing modal');
        window.y2kWindows.close('no-group-modal');
      });
    }
  }, 0);
}

/**
 * Show modal to select which group to share itinerary with
 */
function showShareItineraryModal() {
  console.log('[ShareItin] ========== FUNCTION CALLED ==========');
  console.log('[ShareItin] window.state.group:', window.state.group);
  console.log('[ShareItin] window.state.itinerary length:', window.state.itinerary?.length);

  if (!window.state.group || !window.state.group.roomId) {
    console.error('[ShareItin] ERROR: Non sei in nessun gruppo');
    showNoGroupModal();
    return;
  }

  if (!window.state.itinerary || window.state.itinerary.length === 0) {
    console.error('[ShareItin] ERROR: L\'itinerario personale è vuoto');
    window.toast(T('toast.itinEmpty', '⚠️ L\'itinerario personale è vuoto'));
    return;
  }

  console.log('[ShareItin] Proceeding to show modal...');

  // Initialize groupItineraries if needed
  if (!window.state.groupItineraries) {
    window.state.groupItineraries = {};
  }

  const roomId = window.state.group.roomId;
  const html = `
    <div style="padding: 0; min-width: 300px;">
      <div style="background:linear-gradient(135deg,rgba(74,124,89,.15),rgba(201,76,76,.1));border:1px solid #00FF88;border-radius:10px;padding:14px;margin:12px;">
        <h3 style="margin:0 0 12px 0;color:#FF1493;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">📤 Condividi Itinerario</h3>

        <div style="background:#E8F4FF;border:2px solid #00FF88;border-radius:8px;padding:12px;margin-bottom:12px;">
          <p style="margin:0 0 6px 0;color:#2D3B7D;font-weight:600;font-size:14px">Stanza: ${escapeHtml(roomId)}</p>
          <p style="margin:0;color:#666;font-size:12px">Tappe: <strong>${window.state.itinerary.length}</strong></p>
        </div>

        <div style="display:flex;gap:8px">
          <button id="confirm-share-itin" style="flex:1;background:linear-gradient(180deg,#FF1493,#FF69B4);border:2px solid #FF1493;color:white;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif">
            ✅ Condividi
          </button>
          <button id="cancel-share-itin" style="flex:1;background:#FFE5B4;border:2px solid #FFD700;color:#2D3B7D;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;">
            ❌ Annulla
          </button>
        </div>
      </div>
    </div>
  `;

  window.y2kWindows.open('share-itinerary-modal', 'Condividi Itinerario', html);

  // Attach event listeners
  setTimeout(() => {
    const confirmBtn = document.getElementById('confirm-share-itin');
    const cancelBtn = document.getElementById('cancel-share-itin');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        sharePersonalItineraryToGroup(roomId);
        window.y2kWindows.close('share-itinerary-modal');
        window.toast(T('toast.itinShared', '✅ Itinerario condiviso con il gruppo!'));
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        window.y2kWindows.close('share-itinerary-modal');
      });
    }
  }, 0);
}

/**
 * Copy personal itinerary to group itinerary
 */
function sharePersonalItineraryToGroup(roomId) {
  console.log('[ShareItin] Sharing personal itinerary to group:', roomId);

  if (!window.state.itinerary || window.state.itinerary.length === 0) {
    console.warn('[ShareItin] Personal itinerary is empty');
    return;
  }

  const itineraryId = `group_itin_${roomId}`;
  const myPeerId = window.makePeerId?.(roomId, window.state.group.myName) ||
                   `${roomId}_${window.state.group.myName}`;

  // Create group itinerary from personal itinerary
  const groupItinerary = {
    id: itineraryId,
    roomId: roomId,
    name: { value: `Itinerario - ${window.state.group.myName}`, timestamp: Date.now(), peerId: myPeerId },
    version: 1,
    pois: window.state.itinerary.map(entry => ({
      googlePlaceId: entry.id,
      // Use poi_name if available (from itineraryByDay entries), fallback to name
      name: { value: entry.poi_name || entry.name || 'Luogo', timestamp: Date.now(), peerId: myPeerId },
      category: { value: entry.type || 'poi', timestamp: Date.now(), peerId: myPeerId },
      notes: { value: entry.notes || '', timestamp: Date.now(), peerId: myPeerId },
      lat: entry.lat,
      lng: entry.lng,
      timestamp: Date.now(),
      addedByPeerId: myPeerId,
      addedAt: Date.now()
    })),
    createdAt: Date.now(),
    createdBy: window.state.group.myName
  };

  // Save to state
  if (!window.state.groupItineraries) window.state.groupItineraries = {};
  window.state.groupItineraries[itineraryId] = groupItinerary;
  window.saveState?.();

  console.log('[ShareItin] ✓ Shared. POIs:', groupItinerary.pois.length);

  // Broadcast to group via peerGPS (MQTT)
  window.peerGPS?.broadcastItinerary?.(itineraryId);
  console.log('[ShareItin] ✓ Broadcasted to group');

  // Mark as shared with the group
  window.markItinerarySharedWithGroup('personal_itinerary', roomId);

  // Emit event for UI refresh
  window.dispatchEvent(new CustomEvent('itinerary_updated', {
    detail: { itineraryId, itinerary: groupItinerary }
  }));

  // Show success message
  window.toast(T('toast.itinShared', '✅ Itinerario condiviso con il gruppo!'));
}

/**
 * Escape HTML for XSS protection
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Edit group itinerary - open editor for modifying POIs
 */
function editGroupItinerary(itineraryId) {
  console.log('[EditItin] Opening editor for:', itineraryId);

  const itinerary = window.state.groupItineraries?.[itineraryId];
  if (!itinerary) {
    window.toast(T('itin.notFound', '⚠️ Itinerario non trovato'));
    return;
  }

  showGroupItineraryEditor(itineraryId, itinerary);
}

/**
 * Show itinerary editor UI
 */
function showGroupItineraryEditor(itineraryId, itinerary) {
  console.log('[Editor] Showing editor for itinerary:', itineraryId);

  const pois = itinerary.pois || [];
  const itinName = itinerary.name?.value || itinerary.name || 'Itinerario';

  // Render POI list
  const poisHtml = pois.map((poi, idx) => `
    <div style="background:#FFF;border:1px solid #00FF88;border-radius:6px;padding:10px;margin-bottom:8px">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <div style="flex:1">
          <input type="text" class="poi-name-edit" data-poi-idx="${idx}" value="${escapeHtml(poi.name?.value || poi.name || '')}"
            style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px">
        </div>
        <button class="poi-delete-btn" data-poi-idx="${idx}" aria-label="Elimina POI"
          style="background:#FF6B6B;border:none;color:white;border-radius:4px;padding:4px 8px;cursor:pointer;font-weight:600;flex-shrink:0">
          🗑️
        </button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <select class="poi-cat-edit" data-poi-idx="${idx}" style="flex:1;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:11px">
          ${Object.keys(CATS).map(catKey => {
            const catData = CATS[catKey];
            const emoji = CAT_EMOJI[catKey] || '📍';
            const isSelected = (poi.category?.value || poi.category) === catKey ? 'selected' : '';
            return `<option value="${catKey}" ${isSelected}>${emoji} ${catData.label}</option>`;
          }).join('')}
        </select>
      </div>
      <textarea class="poi-notes-edit" data-poi-idx="${idx}" placeholder="Note..."
        style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:11px;resize:vertical;min-height:40px">${escapeHtml(poi.notes?.value || poi.notes || '')}</textarea>
      <div style="font-size:12px;color:#999;margin-top:4px">📍 ${poi.lat?.toFixed(4)}, ${poi.lng?.toFixed(4)}</div>
    </div>
  `).join('');

  const html = `
    <div style="padding: 0; display: flex; flex-direction: column; height: 100%; gap: 10px;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,rgba(74,124,89,.15),rgba(201,76,76,.1));border:1px solid #00FF88;border-radius:10px;padding:12px;margin:12px 12px 0">
        <input type="text" id="itin-name-input" value="${escapeHtml(itinName)}"
          style="width:100%;padding:8px;border:2px solid #FF1493;border-radius:6px;font-weight:600;color:#FF1493;font-size:14px">
        <div style="font-size:11px;color:#666;margin-top:6px">📍 ${pois.length} tappe • v${itinerary.version || 1}</div>
      </div>

      <!-- POIs List -->
      <div style="flex:1;overflow-y:auto;padding:0 12px;margin:0">
        <div id="pois-editor-list">
          ${poisHtml || '<p style="color:#999;font-size:12px">Nessun POI. Aggiungi uno nuovo con il bottone qui sotto.</p>'}
        </div>
      </div>

      <!-- Add POI Button -->
      <div style="padding:0 12px;margin:0">
        <button id="add-poi-to-itin" style="width:100%;padding:10px;background:linear-gradient(180deg,#00FF88,#00DD77);border:2px solid #00FF88;color:#2D3B7D;border-radius:8px;font-weight:600;cursor:pointer;margin-bottom:8px">
          ➕ Aggiungi POI da Google Places
        </button>
      </div>

      <!-- Save Button -->
      <div style="padding:0 12px 12px;display:flex;gap:8px;margin:0">
        <button id="save-itin-changes" style="flex:1;padding:10px;background:linear-gradient(180deg,#FF1493,#FF69B4);border:2px solid #FF1493;color:white;border-radius:8px;font-weight:600;cursor:pointer;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif">
          💾 Salva Modifiche
        </button>
        <button id="cancel-itin-edit" style="flex:1;padding:10px;background:#FFE5B4;border:2px solid #FFD700;color:#2D3B7D;border-radius:8px;font-weight:600;cursor:pointer;">
          ❌ Annulla
        </button>
      </div>
    </div>
  `;

  window.y2kWindows.open('edit-itinerary-modal', `✏️ Modifica: ${itinName}`, html);

  // Attach event handlers
  setTimeout(() => attachEditorEvents(itineraryId, itinerary), 100);
}

/**
 * Attach event handlers to itinerary editor
 */
function attachEditorEvents(itineraryId, originalItinerary) {
  console.log('[Editor] Attaching event handlers');

  // Delete POI
  document.querySelectorAll('.poi-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-poi-idx'), 10);
      const container = btn.closest('#pois-editor-list') || document.getElementById('pois-editor-list');
      if (container) {
        container.querySelectorAll('[data-poi-idx]').forEach((el, i) => {
          if (i === idx) el.closest('[style*="border:1px"]').remove();
        });
      }
    });
  });

  // Save changes
  const saveBtn = document.getElementById('save-itin-changes');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const newName = document.getElementById('itin-name-input')?.value || 'Itinerario';
      const myPeerId = window.makePeerId?.(window.state.group.roomId, window.state.group.myName) ||
                       `${window.state.group.roomId}_${window.state.group.myName}`;

      // Collect edited POIs
      const editedPois = [];
      const poisContainer = document.getElementById('pois-editor-list');
      const poiRows = poisContainer?.querySelectorAll('[data-poi-idx]') || [];

      poiRows.forEach((row) => {
        const idx = parseInt(row.getAttribute('data-poi-idx'), 10);
        const originalPoi = originalItinerary.pois[idx];
        if (!originalPoi) return;

        const nameInput = row.querySelector('.poi-name-edit');
        const catSelect = row.querySelector('.poi-cat-edit');
        const notesTA = row.querySelector('.poi-notes-edit');

        const updatedPoi = {
          ...originalPoi,
          name: { value: nameInput?.value || originalPoi.name?.value, timestamp: Date.now(), peerId: myPeerId },
          category: { value: catSelect?.value || originalPoi.category?.value, timestamp: Date.now(), peerId: myPeerId },
          notes: { value: notesTA?.value || originalPoi.notes?.value, timestamp: Date.now(), peerId: myPeerId }
        };

        editedPois.push(updatedPoi);
      });

      // Update itinerary
      const updatedItin = {
        ...originalItinerary,
        name: { value: newName, timestamp: Date.now(), peerId: myPeerId },
        pois: editedPois,
        version: (originalItinerary.version || 1) + 1,
        lastEditedBy: window.state.group.myName,
        lastEditedAt: Date.now()
      };

      window.state.groupItineraries[itineraryId] = updatedItin;
      window.saveState?.();

      // Broadcast changes
      window.broadcastItinerary?.(itineraryId);

      // Emit event
      window.dispatchEvent(new CustomEvent('itinerary_updated', {
        detail: { itineraryId, itinerary: updatedItin }
      }));

      window.y2kWindows.close('edit-itinerary-modal');
      window.toast(T('toast.savedShared', '✅ Modifiche salvate e condivise!'));

      console.log('[Editor] ✓ Changes saved and broadcasted');
    });
  }

  // Cancel button
  const cancelBtn = document.getElementById('cancel-itin-edit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.y2kWindows.close('edit-itinerary-modal');
    });
  }

  // Add POI button
  const addPoiBtn = document.getElementById('add-poi-to-itin');
  if (addPoiBtn) {
    addPoiBtn.addEventListener('click', async () => {
      const query = await (window.modalPrompt || ((msg, o) => Promise.resolve(prompt(msg))))(
        'Scrivi il nome del luogo:', { placeholder: 'Es: Senso-ji Temple Tokyo' }
      );
      if (!query) return;

      window.searchGooglePlaces?.(query, (results) => {
        if (!results || results.length === 0) {
          window.toast(T('toast.noResults', '❌ Nessun risultato trovato'));
          return;
        }

        if (results.length === 1) {
          addPoiToEditor(results[0], originalItinerary);
        } else {
          showGooglePlacesResults?.(results);
        }
      });
    });
  }
}

/**
 * Add POI to editor (helper function)
 */
function addPoiToEditor(googlePlace, itinerary) {
  const myPeerId = window.makePeerId?.(window.state.group.roomId, window.state.group.myName) ||
                   `${window.state.group.roomId}_${window.state.group.myName}`;

  const newPoi = {
    googlePlaceId: googlePlace.id || googlePlace.googlePlaceId,
    name: { value: googlePlace.name, timestamp: Date.now(), peerId: myPeerId },
    category: { value: 'poi', timestamp: Date.now(), peerId: myPeerId },
    notes: { value: '', timestamp: Date.now(), peerId: myPeerId },
    lat: googlePlace.lat,
    lng: googlePlace.lng,
    timestamp: Date.now(),
    addedByPeerId: myPeerId,
    addedAt: Date.now()
  };

  // Add to container
  const poisList = document.getElementById('pois-editor-list');
  if (poisList) {
    const newIdx = itinerary.pois?.length || 0;
    const newRow = document.createElement('div');
    newRow.style.cssText = 'background:#FFF;border:1px solid #00FF88;border-radius:6px;padding:10px;margin-bottom:8px';
    newRow.setAttribute('data-poi-idx', newIdx);
    newRow.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <div style="flex:1">
          <input type="text" class="poi-name-edit" data-poi-idx="${newIdx}" value="${escapeHtml(newPoi.name.value)}"
            style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px">
        </div>
        <button class="poi-delete-btn" data-poi-idx="${newIdx}"
          style="background:#FF6B6B;border:none;color:white;border-radius:4px;padding:4px 8px;cursor:pointer;font-weight:600;flex-shrink:0">
          🗑️
        </button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <select class="poi-cat-edit" data-poi-idx="${newIdx}" style="flex:1;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:11px">
          <option value="poi" selected>📍 POI</option>
          <option value="albergo">🏨 Albergo</option>
          <option value="ristorante">🍜 Ristorante</option>
          <option value="museo">🎨 Museo</option>
          <option value="parco">🌳 Parco</option>
        </select>
      </div>
      <textarea class="poi-notes-edit" data-poi-idx="${newIdx}" placeholder="Note..."
        style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:11px;resize:vertical;min-height:40px"></textarea>
      <div style="font-size:12px;color:#999;margin-top:4px">📍 ${newPoi.lat.toFixed(4)}, ${newPoi.lng.toFixed(4)}</div>
    `;

    poisList.appendChild(newRow);

    // Attach delete handler to new row
    newRow.querySelector('.poi-delete-btn')?.addEventListener('click', function() {
      newRow.remove();
    });
  }

  window.toast('✅ POI aggiunto all\'editor');
}



  window.showNoGroupModal = showNoGroupModal;
  window.showShareItineraryModal = showShareItineraryModal;
  window.sharePersonalItineraryToGroup = sharePersonalItineraryToGroup;
  window.editGroupItinerary = editGroupItinerary;
  window.showGroupItineraryEditor = showGroupItineraryEditor;
})();
