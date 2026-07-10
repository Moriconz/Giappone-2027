/**
 * group-panel.js
 * Renderizza pannello Gruppo con:
 * - Lista membri connessi
 * - Toggle GPS sharing
 * - Exit/Delete room
 * - Chat gruppo (integrato)
 */

window.groupPanel = (() => {
  const FORCE_FAKE_GPS = false; // Phase 6: rimosso debug flag
  
  /**
   * Renderizza pannello gruppo
   */
  function renderGroupPanel() {
    const group = window.state?.group;
    console.log('[GroupPanel] renderGroupPanel', { group });
    if (!group || !group.roomId) {
      return '<p>Non sei in nessun gruppo.</p>';
    }
    
    const isCreator = group.isCreator;
    const members = group.members ? [...group.members] : [];
    const gpsEnabled = window.state?.gpsEnabled;
    if (group.myName && !members.some(m => m.name === group.myName)) {
      members.unshift({ name: group.myName, avatar: group.myAvatar || window.createAvatarDataUrl?.(group.myName), peerId: window.peerGPS?.getMyPeerId?.() });
    }
    
    const now = Date.now();
    const T = window.t || ((k, f) => f || k);
    // Stato connessione realtime (MQTT) — mostrato nel box stanza, aggiornato dal refresh live
    const connStatus = (() => {
      const st = window.peerGPS?.getStatus?.() || 'disconnected';
      const peers = window.peerGPS?.getPeerCount?.() ?? 0;
      const lock = window.RoomCrypto?.ready?.() ? ` <span style="color:#16a34a;font-weight:700" title="${T('group.encrypted', 'Messaggi cifrati end-to-end col codice stanza')}">🔒 ${T('group.e2ee', 'E2EE')}</span>` : '';
      if (st === 'connected') return `<span style="color:#16a34a;font-weight:700">🟢 Connesso</span> <span style="color:var(--l-muted)">· ${peers} ${peers === 1 ? 'membro' : 'membri'} online</span>${lock}`;
      if (st === 'connecting') return `<span style="color:#b45309;font-weight:700">🟡 Connessione in corso…</span>${lock}`;
      return `<span style="color:#dc2626;font-weight:700">🔴 Non connesso</span>`;
    })();
    const membersList = members.map(m => {
      const avatarHtml = m.avatar ? `
        <img src="${m.avatar}" loading="lazy" decoding="async" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: var(--primary);" />
      ` : `
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">
          ${escapeHtml((m.name || '?').charAt(0).toUpperCase())}
        </div>
      `;
      // Online se: è se stessi, oppure ha un heartbeat recente (< 90s)
      const isSelf   = m.name === group.myName;
      const isOnline = isSelf || m.peerId || (m.lastHeartbeat && (now - m.lastHeartbeat) < 90000);

      // NUOVO: Rendi i membri cliccabili (solo se online e non è se stesso)
      const hasGPS = window.state?.gpsRemoteMarkers?.[m.name];
      const isClickable = isOnline && !isSelf && hasGPS;

      return `
      <div class="group-member-card" data-member-name="${escapeHtml(m.name)}" style="display:flex;gap:10px;align-items:center;padding:10px;background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:10px;margin-bottom:8px;transition:all 0.3s" data-clickable="${isClickable}">
        ${avatarHtml}
        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <div style="font-weight:700;font-size:16px;color:var(--l-ink)">${escapeHtml(m.name || 'Unnamed')}${isSelf ? ' <span style="font-size:12px;color:var(--l-muted)">(tu)</span>' : ''}</div>
          <div style="font-size:13px;color:var(--l-muted)">${isOnline ? '🟢 ' + T('common.online', 'Online') : '🔴 ' + T('common.offline', 'Offline')}${hasGPS && !isSelf ? ' 📍 GPS' : ''}</div>
        </div>
      </div>
    `;
    }).join('');
    
    const html = `
      <div style="padding: 0;">

        <!-- STANZA INFO -->
        <div style="background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:14px;padding:14px;margin:12px;margin-bottom:20px;">
          <h3 style="margin:0 0 6px 0;color:var(--l-ink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">🏠 ${T('group.room', 'Stanza')}: <strong>${escapeHtml(group.roomId)}</strong></h3>
          <p style="font-size:14px;color:var(--l-muted);margin:0 0 6px 0;">Creata da: <strong style="color:var(--l-ink)">${escapeHtml(group.createdBy || 'Sconosciuto')}</strong></p>
          <p id="group-conn-status" style="font-size:14px;margin:0;">${connStatus}</p>
        </div>

        <!-- MEMBRI -->
        <div style="background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:14px;padding:14px;margin:12px;margin-bottom:20px;">
          <h3 style="margin:0 0 12px 0;color:var(--l-ink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">👥 ${T('group.members', 'Membri')} (${members.length})</h3>
          ${membersList ? `<div style="display:flex;flex-direction:column;gap:8px">${membersList}</div>` : '<p style="color:var(--l-muted);font-size:15px;margin:0">Nessun membro.</p>'}
        </div>

        <!-- GPS SHARING -->
        <div style="background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:14px;padding:14px;margin:12px;margin-bottom:20px;">
          <h3 style="margin:0 0 10px 0;color:var(--l-ink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">📍 ${T('group.gpsSharing', 'Condivisione GPS')}</h3>
          <div style="display:flex;gap:10px;align-items:center;padding:10px;background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:10px">
            <input type="checkbox" id="gps-share-toggle" ${gpsEnabled ? 'checked' : ''}
              style="width:18px;height:18px;cursor:pointer;accent-color:var(--l-accent)">
            <label for="gps-share-toggle" style="flex:1;cursor:pointer;margin:0">
              <strong style="color:var(--l-ink)">${gpsEnabled ? '✅ Posizione in diretta' : '⬜ Posizione inattiva'}</strong>
              <div style="font-size:13px;color:var(--l-muted);margin-top:2px">
                ${FORCE_FAKE_GPS ? '📍 Usando Tokyo (test mode)' : '📍 Usando posizione reale'}
              </div>
            </label>
          </div>
          <p style="font-size:13px;color:var(--l-muted);margin-top:8px;margin-bottom:0">
            La tua posizione è visibile ai membri del gruppo solo se attiva.
          </p>
        </div>

        <!-- ITINERARI DI GRUPPO (Phase 3) -->
        <div style="background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:14px;padding:14px;margin:12px;margin-bottom:20px;">
          <h3 style="margin:0 0 10px 0;color:var(--l-ink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">📋 Itinerari di Gruppo</h3>
          <div id="group-itineraries-list" style="margin-bottom:10px;max-height:200px;overflow-y:auto">
            <p style="font-size:14px;color:var(--l-muted);margin:0;padding:8px">Nessun itinerario condiviso.</p>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:10px">
            <button id="undo-group-btn" style="flex:1;background:rgba(20,30,60,0.06);border:1.5px solid rgba(20,30,60,0.18);color:var(--l-ink);border-radius:6px;padding:8px;font-weight:600;cursor:pointer;font-size:14px;opacity:0.6" disabled title="Annulla ultimo cambio">
              ⬅️ Annulla
            </button>
            <button id="redo-group-btn" style="flex:1;background:rgba(20,30,60,0.06);border:1.5px solid rgba(20,30,60,0.18);color:var(--l-ink);border-radius:6px;padding:8px;font-weight:600;cursor:pointer;font-size:14px;opacity:0.6" disabled title="Rifai ultimo cambio">
              ➡️ Rifai
            </button>
          </div>
          <p style="font-size:13px;color:var(--l-muted);margin:0">
            Modifica condivisa e sincronizzazione in tempo reale.
          </p>
        </div>

        <!-- CHAT -->
        <div style="background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:14px;padding:14px;margin:12px;margin-bottom:20px;">
          <h3 style="margin:0 0 10px 0;color:var(--l-ink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">💬 Chat Gruppo</h3>
          <button class="btn primary" id="open-group-chat" style="width:100%;margin-bottom:8px;background:linear-gradient(180deg,var(--l-accent),var(--l-accent-600));border:2px solid var(--l-accent-600);color:white;border-radius:8px;padding:10px;font-weight:600;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;box-shadow:0 0 12px var(--l-accent-soft)">
            💬 Apri chat stanza
          </button>
          <button class="btn" id="clear-group-chat" style="width:100%;margin-bottom:10px;background:rgba(20,30,60,0.06);border:1.5px solid rgba(20,30,60,0.18);color:var(--l-ink);border-radius:8px;padding:10px;font-weight:600;cursor:pointer;">
            🧹 Pulisci chat
          </button>
          <p style="font-size:13px;color:var(--l-muted);margin:0">
            Comunica con i membri della stanza (messaggi P2P).
          </p>
        </div>

        <!-- INVITA MEMBRO -->
        <div style="background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:14px;padding:14px;margin:12px;margin-bottom:20px;">
          <h3 style="margin:0 0 10px 0;color:var(--l-ink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">🔗 Invita</h3>
          <button class="btn" id="btn-copy-invite-link" style="width:100%;margin-bottom:8px;background:rgba(20,30,60,0.06);border:1.5px solid rgba(20,30,60,0.18);color:var(--l-ink);border-radius:8px;padding:10px;font-weight:600;cursor:pointer;">
            🔗 Copia link invito
          </button>
          <button class="btn" id="btn-open-audit-log" style="width:100%;background:rgba(20,30,60,0.04);border:1.5px solid rgba(20,30,60,0.12);color:var(--l-muted);border-radius:8px;padding:10px;font-weight:600;cursor:pointer;font-size:14px;">
            📜 Cronologia modifiche
          </button>
        </div>

        <!-- GESTIONE STANZA -->
        <div style="background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:14px;padding:14px;margin:12px;margin-bottom:20px;">
          <h3 style="margin:0 0 10px 0;color:var(--l-ink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">⚙️ Gestione Stanza</h3>
          ${isCreator ? `
            <button class="btn" id="delete-room" style="width:100%;margin-bottom:8px;background:#FF6B6B;border:2px solid #FF6B6B;color:white;border-radius:8px;padding:10px;font-weight:600;cursor:pointer">
              🗑️ Elimina stanza (solo creatore)
            </button>
          ` : ''}
          <button class="btn" id="exit-room" style="width:100%;background:rgba(255,107,53,0.14);border:1.5px solid rgba(255,107,53,0.4);color:#c2410c;border-radius:8px;padding:10px;font-weight:600;cursor:pointer">
            ❌ Esci dalla stanza
          </button>
          <p style="font-size:13px;color:var(--l-muted);margin-top:8px;margin-bottom:0">
            Esci dal gruppo. Non riceverai più messaggi.
          </p>
        </div>
      </div>
    `;

    // Event listeners verranno attaccati da index.html tramite groupPanel.attachEvents()
    return html;
  }
  
  /**
   * Attacca event listener al pannello
   */
  function attachGroupPanelEvents() {
    // GPS toggle
    const gpsToggle = document.getElementById('gps-share-toggle');
    if (gpsToggle) {
      gpsToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          window.startGPS?.();
        } else {
          window.stopGPS?.();
        }
      });
    }

    // NUOVO: Click su membro per mostrare opzioni "Mostra su mappa" e "Raggiungi"
    const memberCards = document.querySelectorAll('.group-member-card');
    memberCards.forEach(card => {
      const memberName = card.dataset.memberName;
      const hasGPS = window.state?.gpsRemoteMarkers?.[memberName];

      if (hasGPS && memberName !== window.state?.group?.myName) {
        card.addEventListener('click', () => {
          window.showMemberOptions?.(memberName);
        });
      }
    });

    // Phase 3: Update itineraries list and undo/redo buttons
    updateGroupItinerariesList();
    updateUndoRedoButtons();

    // Invite link + audit log
    const inviteLinkBtn = document.getElementById('btn-copy-invite-link');
    if (inviteLinkBtn) inviteLinkBtn.onclick = () => window.copyGroupInviteLink?.();

    const auditLogBtn = document.getElementById('btn-open-audit-log');
    if (auditLogBtn) auditLogBtn.onclick = () =>
      window.loadScript('./js/audit-log-viewer.js').then(() => window.openGroupAuditLog?.());

    // Chat gruppo
    const chatBtn = document.getElementById('open-group-chat');
    if (chatBtn) {
      chatBtn.addEventListener('click', () => {
        window.groupChat?.openChatPanel();
      });
    }

    const clearChatBtn = document.getElementById('clear-group-chat');
    if (clearChatBtn) {
      clearChatBtn.addEventListener('click', () => {
        const roomId = window.state?.group?.roomId;
        if (!roomId) return;
        window.groupChat?.clearHistory(roomId);
        window.toast?.(T('chat.cleared', '🧹 Cronologia chat cancellata.'));
      });
    }

    // Phase 3: Undo/Redo buttons
    const undoBtn = document.getElementById('undo-group-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        const success = window.undo?.();
        if (success) {
          updateGroupItinerariesList();
          updateUndoRedoButtons();
          window.toast?.(T('undo.undone', '⬅️ Cambio annullato'));
        }
      });
    }

    const redoBtn = document.getElementById('redo-group-btn');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => {
        const success = window.redo?.();
        if (success) {
          updateGroupItinerariesList();
          updateUndoRedoButtons();
          window.toast?.(T('undo.redone', '➡️ Cambio ripetuto'));
        }
      });
    }

    // Exit room
    const exitBtn = document.getElementById('exit-room');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        window.exitGroup?.();
      });
    }

    // Delete room (solo creator)
    const deleteBtn = document.getElementById('delete-room');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        const ok = await (window.modalConfirm || confirm)('Sei sicuro di voler eliminare la stanza? Tutti i membri verranno disconnessi.', { danger: true, confirmText: 'Elimina stanza' });
        if (ok) {
          window.deleteGroup?.();
        }
      });
    }

    // Listen for itinerary updates (Phase 3)
    window.addEventListener('itinerary_updated', () => {
      updateGroupItinerariesList();
      updateUndoRedoButtons();
    });

    // Listen for group member updates and re-render panel if open
    window.addEventListener('group_members_updated', () => {
      const groupWin = document.getElementById('y2kwin-gruppo');
      if (!groupWin) return; // Panel not open, state already updated

      // Re-render panel with updated members
      const html = window.groupPanel.render();
      const body = groupWin.querySelector('.y2k-win-body');
      if (body) {
        body.innerHTML = html;
        window.groupPanel.attachEvents();
        console.log('[GroupPanel] ✅ Panel updated via event');
      }
    });
  }

  /**
   * Update the list of group itineraries (Phase 3)
   */
  function updateGroupItinerariesList() {
    const listDiv = document.getElementById('group-itineraries-list');
    if (!listDiv) return;

    const roomId = window.state?.group?.roomId;
    if (!roomId) {
      listDiv.innerHTML = '<p style="font-size:14px;color:var(--l-muted);margin:0;padding:8px">Non sei in un gruppo.</p>';
      return;
    }

    const itineraries = window.state?.groupItineraries || {};
    const itineraryIds = Object.keys(itineraries);

    if (itineraryIds.length === 0) {
      listDiv.innerHTML = '<p style="font-size:14px;color:var(--l-muted);margin:0;padding:8px">Nessun itinerario condiviso.</p>';
      return;
    }

    const itinerariesList = itineraryIds.map(itinId => {
      const itin = itineraries[itinId];
      const poiCount = itin.pois?.length || 0;
      const owner = itin.owner || 'Sconosciuto';
      const lastModBy = itin.lastSyncedBy || itin.owner || 'Sconosciuto';
      const lastModTime = itin.lastSyncAt ? window.getTimeAgo?.(itin.lastSyncAt) : 'mai';
      const isShared = itinId.includes('shared');

      // Build tappe list with member attribution
      const tappeListHTML = (itin.pois || []).slice(0, 3).map((poi, idx) => {
        const lastMod = poi.audit?.lastModifiedBy || poi.addedByPeerId || 'Sconosciuto';
        const modTime = poi.audit?.lastModifiedAt ? window.getTimeAgo?.(poi.audit.lastModifiedAt) : '';
        // Handle both { value: ... } format and plain string format
        const poiName = typeof poi.name === 'object' ? (poi.name?.value || '?') : (poi.name || '?');
        return `<div style="font-size:13px;color:var(--l-muted);padding:4px 0;border-bottom:1px solid rgba(20,30,60,0.08)">
          ${idx + 1}. ${escapeHtml(poiName)} <span style="color:var(--l-faint)">via ${escapeHtml(lastMod)}</span>
        </div>`;
      }).join('');

      const moreText = poiCount > 3 ? `<div style="font-size:13px;color:var(--l-faint);padding:4px 0">+${poiCount - 3} altre tappe</div>` : '';

      return `
        <div style="background:rgba(20,30,60,0.04);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(20,30,60,0.1);border-radius:12px;padding:14px;margin-bottom:12px;font-size:16px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px">
            <div style="flex:1;min-width:0">
              <div style="color:var(--l-ink);font-weight:700;font-size:15px;line-height:1.4;margin-bottom:4px">
                📋 ${escapeHtml(itin.name?.value || itin.name || 'Itinerario')}
              </div>
              <div style="color:var(--l-muted);font-size:13px;line-height:1.3;margin-bottom:4px">
                ${isShared ? '📤 Condiviso da ' : '👤 Creato da '}<strong>${escapeHtml(owner)}</strong>
              </div>
              <div style="color:var(--l-faint);font-size:13px">
                Ultimo aggiornamento: <strong>${escapeHtml(lastModBy)}</strong> ${lastModTime}
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button data-edit-itinerary="${itinId}" title="Modifica itinerario" style="background:rgba(20,30,60,0.08);backdrop-filter:blur(15px);border:1px solid rgba(20,30,60,0.2);color:var(--l-ink);border-radius:8px;padding:8px 12px;cursor:pointer;font-size:15px;font-weight:600;transition:all 0.2s;display:flex;align-items:center;justify-content:center;min-width:32px;height:32px;white-space:nowrap">
                ✏️ Modifica
              </button>
              <button data-delete-itinerary="${itinId}" title="Elimina itinerario" style="background:var(--l-accent-soft);backdrop-filter:blur(15px);border:1px solid var(--l-accent-brd);color:var(--l-accent-600);border-radius:8px;padding:8px 12px;cursor:pointer;font-size:15px;font-weight:600;transition:all 0.2s;display:flex;align-items:center;justify-content:center;min-width:32px;height:32px;white-space:nowrap">
                🗑️ Elimina
              </button>
            </div>
          </div>

          <!-- Tappe preview with member info -->
          <div style="background:rgba(20,30,60,0.05);border-radius:8px;padding:8px;margin-top:8px;border-left:2px solid rgba(255,107,53,0.4)">
            <div style="font-size:14px;color:var(--l-muted);font-weight:600;margin-bottom:4px">📍 ${poiCount} tappe</div>
            ${tappeListHTML}
            ${moreText}
          </div>
        </div>
      `;
    }).join('');

    listDiv.innerHTML = itinerariesList;

    // Attach edit handlers
    listDiv.querySelectorAll('[data-edit-itinerary]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itinId = btn.getAttribute('data-edit-itinerary');
        if (window.editGroupItinerary) {
          window.editGroupItinerary(itinId);
        }
      });
    });

    // Attach delete handlers
    listDiv.querySelectorAll('[data-delete-itinerary]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const itinId = btn.getAttribute('data-delete-itinerary');
        const ok = await (window.modalConfirm || confirm)('Eliminare questo itinerario?', { danger: true, confirmText: 'Elimina' });
        if (ok) {
          if (window.state.groupItineraries[itinId]) {
            // "Elimina" locale-soltanto non bastava: nessun broadcast, nessuna
            // pulizia del tracking condivisione → gli altri membri continuavano
            // a vederlo, e state.itinerarySharing restava incoerente (bug reale,
            // itinerary-delete.js aveva già la funzione giusta, mai collegata).
            const m = /^group_(.+)_shared$/.exec(itinId);
            if (m && typeof window.acceptUnshareRequest === 'function') {
              window.acceptUnshareRequest(m[1], window.state.group?.myName || 'Unknown');
            } else {
              delete window.state.groupItineraries[itinId];
              window.saveState?.();
              window.toast?.(T('toast.itinDeleted', '🗑️ Itinerario eliminato'));
            }
            updateGroupItinerariesList();
          }
        }
      });
    });
  }

  /**
   * Update undo/redo button states (Phase 3)
   */
  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-group-btn');
    const redoBtn = document.getElementById('redo-group-btn');

    const undoRedo = window.state?.undoRedo;
    if (!undoBtn || !redoBtn || !undoRedo) return;

    // Enable undo if not at start
    const canUndo = undoRedo.currentIndex > 0;
    undoBtn.disabled = !canUndo;
    undoBtn.style.opacity = canUndo ? '1' : '0.6';
    undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';

    // Enable redo if not at end
    const canRedo = undoRedo.currentIndex < undoRedo.stack.length - 1;
    redoBtn.disabled = !canRedo;
    redoBtn.style.opacity = canRedo ? '1' : '0.6';
    redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
  }
  
  /**
   * Escapa HTML per XSS protection (senza DOM)
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
  
  return {
    render: renderGroupPanel,
    attachEvents: attachGroupPanelEvents,
    getForceFakeGPS: () => FORCE_FAKE_GPS,
    updateItinerariesList: updateGroupItinerariesList,
    updateUndoRedoButtons: updateUndoRedoButtons
  };
})();
