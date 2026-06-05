// ============================================================================
// itinerary-sharing.js — addTappaAuditEntry, getSharedGroups,
//   isItinerarySharedWithGroup, markItinerarySharedWithGroup,
//   unmarkItinerarySharedWithGroup, formatAuditLog, getTimeAgo,
//   getLastModifiedInfo, syncPersonalToSharedGroups, syncGroupToPersonal,
//   setupSyncEventListeners
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, mergeGroupItinerary, peerGPS
// ============================================================================
(function () {
  'use strict';

  function addTappaAuditEntry(tappa, action, memberName, extra = {}) {
    if (!tappa) return;
    const now = Date.now();

    // Initialize audit trail if needed
    if (!tappa.audit) {
      tappa.audit = {
        createdAt: now,
        createdBy: memberName || window.state.group?.myName || 'Unknown',
        lastModifiedAt: now,
        lastModifiedBy: memberName || window.state.group?.myName || 'Unknown',
        modificationHistory: []
      };
    }

    // Update modification timestamps
    tappa.audit.lastModifiedAt = now;
    tappa.audit.lastModifiedBy = memberName || window.state.group?.myName || 'Unknown';

    // Add to history (full history, no pruning per user request)
    tappa.audit.modificationHistory.push({
      action,
      by: memberName || window.state.group?.myName || 'Unknown',
      at: now,
      ...extra
    });

    console.log('[Audit] Added entry to tappa:', { id: tappa.id, action, by: memberName, at: new Date(now).toISOString() });
  }

  /**
   * Get all groups that an itinerary is shared with
   */
  function getSharedGroups(itineraryId) {
    if (!window.state.itinerarySharing || !window.state.itinerarySharing[itineraryId]) {
      return [];
    }
    return window.state.itinerarySharing[itineraryId].sharedWith || [];
  }

  /**
   * Check if itinerary is shared with a specific group
   */
  function isItinerarySharedWithGroup(itineraryId, groupId) {
    const shared = getSharedGroups(itineraryId);
    return shared.some(s => s.groupId === groupId);
  }

  /**
   * Mark itinerary as shared with a group (call before sharing)
   */
  function markItinerarySharedWithGroup(itineraryId, groupId) {
    if (!window.state.itinerarySharing) window.state.itinerarySharing = {};
    if (!window.state.itinerarySharing[itineraryId]) {
      window.state.itinerarySharing[itineraryId] = {
        owner: window.state.group?.myName || 'Unknown',
        sharedWith: []
      };
    }

    // Check if already shared
    const alreadyShared = window.state.itinerarySharing[itineraryId].sharedWith.some(s => s.groupId === groupId);
    if (!alreadyShared) {
      window.state.itinerarySharing[itineraryId].sharedWith.push({
        groupId: groupId,
        sharedAt: Date.now(),
        sharedBy: window.state.group?.myName || 'Unknown'
      });
      console.log('[Sharing] Marked itinerary shared:', { itineraryId, groupId });
    }
  }

  /**
   * Unmark itinerary as shared with a group
   */
  function unmarkItinerarySharedWithGroup(itineraryId, groupId) {
    if (!window.state.itinerarySharing || !window.state.itinerarySharing[itineraryId]) return;

    const idx = window.state.itinerarySharing[itineraryId].sharedWith.findIndex(s => s.groupId === groupId);
    if (idx !== -1) {
      window.state.itinerarySharing[itineraryId].sharedWith.splice(idx, 1);
      console.log('[Sharing] Unmarked itinerary shared:', { itineraryId, groupId });
    }
  }

  /**
   * Get formatted audit log for a tappa (for UI display)
   */
  function formatAuditLog(tappa) {
    if (!tappa?.audit?.modificationHistory) return [];

    return tappa.audit.modificationHistory.map(entry => {
      const date = new Date(entry.at);
      const timeAgo = getTimeAgo(entry.at);

      let action_text = '';
      switch(entry.action) {
        case 'added': action_text = `Aggiunto da ${entry.by} ${timeAgo}`; break;
        case 'removed': action_text = `Rimosso da ${entry.by} ${timeAgo}`; break;
        case 'reordered': action_text = `Riordinato da ${entry.by} ${timeAgo}`; break;
        case 'note_updated': action_text = `Nota aggiornata da ${entry.by} ${timeAgo}`; break;
        default: action_text = `${entry.action} da ${entry.by} ${timeAgo}`;
      }

      return {
        action: entry.action,
        by: entry.by,
        at: entry.at,
        text: action_text,
        extra: entry
      };
    });
  }

  /**
   * Get human-readable time ago string
   */
  function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}g fa`;
    if (hours > 0) return `${hours}h fa`;
    if (minutes > 0) return `${minutes}m fa`;
    if (seconds > 0) return `${seconds}s fa`;
    return 'proprio adesso';
  }

  /**
   * Get the most recent edit information for a tappa
   */
  function getLastModifiedInfo(tappa) {
    if (!tappa?.audit) return null;
    return {
      by: tappa.audit.lastModifiedBy,
      at: tappa.audit.lastModifiedAt,
      text: `Modificato da ${tappa.audit.lastModifiedBy} ${getTimeAgo(tappa.audit.lastModifiedAt)}`
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // BIDIRECTIONAL SYNC LOGIC — Phase 5
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Sync personal itinerary to all shared groups
   * Call this after editing personal itinerary
   */
  function syncPersonalToSharedGroups() {
    const _personalPOIs = Object.values(window.state?.itineraryByDay || {}).flat();
    if (!_personalPOIs.length) return;

    const sharedGroups = getSharedGroups('personal_itinerary') || [];
    if (sharedGroups.length === 0) return;

    console.log('[Sync] Syncing personal itinerary to', sharedGroups.length, 'groups');

    sharedGroups.forEach(share => {
      const groupId = share.groupId;
      const groupItinId = `group_${groupId}_shared`;

      // Update the group's itinerary
      if (!window.state.groupItineraries) window.state.groupItineraries = {};
      window.state.groupItineraries[groupItinId] = {
        id: groupItinId,
        groupId: groupId,
        owner: window.state.group?.myName || 'Unknown',
        originItineraryId: 'personal_itinerary',
        pois: JSON.parse(JSON.stringify(_personalPOIs)), // Deep copy from itineraryByDay
        syncStatus: 'syncing',
        lastSyncAt: Date.now(),
        lastSyncedBy: window.state.group?.myName || 'Unknown',
        vectorClock: { [window.state.group?.myName || 'Unknown']: (Date.now() % 10000) }
      };

      // Broadcast to MQTT
      if (window.peerGPS?.broadcastItineraryShare) {
        window.peerGPS.broadcastItineraryShare('personal_itinerary', groupId);
      }

      console.log('[Sync] ✅ Synced personal itinerary to group:', groupId);
    });

    window.saveState?.();
  }

  /**
   * Convert a group itinerary's pois (CRDT-ish, with day/time/duration/cost)
   * back into the personal `itineraryByDay` shape ({ dayIndex: [entry, …] }).
   * Skips soft-deleted POIs. Used by the group→personal sync-back.
   */
  function groupPoisToItineraryByDay(pois) {
    const ibd = {};
    (pois || []).forEach(poi => {
      if (poi._deleted || poi.deletionTimestamp) return; // skip soft-deleted
      const day = Number.isInteger(poi.day) ? poi.day : 0;
      if (!ibd[day]) ibd[day] = [];
      const val = (f) => (f && typeof f === 'object' && 'value' in f) ? f.value : f;
      ibd[day].push({
        poi_id: poi.googlePlaceId || poi.poi_id || poi.id,
        poi_name: val(poi.name) || poi.poi_name || 'Luogo',
        time: poi.time || '10:00',
        duration: poi.duration || 60,
        cost: poi.cost || 0,
        notes: val(poi.notes) || '',
        tag: val(poi.category) || poi.tag || 'altro',
        lat: poi.lat ?? null,
        lng: poi.lng ?? null,
        status: 'proposed',
        addedBy: poi.addedByPeerId || 'Gruppo',
        lastModified: poi.timestamp || Date.now()
      });
    });
    // Sort each day by time for a clean view
    Object.keys(ibd).forEach(d => ibd[d].sort((a, b) => (a.time || '').localeCompare(b.time || '')));
    return ibd;
  }
  window.groupPoisToItineraryByDay = groupPoisToItineraryByDay;

  /**
   * Sync group itinerary back to personal (call this when group members edit).
   * Rebuilds `state.itineraryByDay` from the group pois so the owner sees the
   * group's additions/edits in their own day-by-day view.
   */
  function syncGroupToPersonal(originItineraryId, groupId) {
    if (originItineraryId !== 'personal_itinerary') return; // Only sync if origin is personal

    // Find the group itinerary robustly: there are two historical id schemes
    // (`group_${groupId}_shared` and `group_itin_${roomId}`). Try both, then
    // fall back to any group itinerary owned by me in the current room.
    const gis = window.state.groupItineraries || {};
    const roomId = window.state?.group?.roomId;
    const myName = window.state?.group?.myName;
    let groupItin = gis[`group_${groupId}_shared`]
      || gis[`group_itin_${roomId}`]
      || Object.values(gis).find(g => g && Array.isArray(g.pois) && (g.roomId === roomId) && (g.createdBy === myName || g.owner === myName));
    if (!groupItin || !groupItin.pois) return;

    console.log('[Sync] Syncing group itinerary back to personal from group:', groupId);

    // Auto-snapshot before overwriting the personal itinerary (recoverable)
    window.ItinerarySnapshots?.saveAuto?.('group-sync-' + groupId);

    window.state.itineraryByDay = groupPoisToItineraryByDay(groupItin.pois);
    window.saveState?.();
    window.renderItineraryUnified?.();
    console.log('[Sync] ✅ Synced group changes back to personal day-by-day itinerary');

    // Notify UI
    window.dispatchEvent(new CustomEvent('personal_itinerary_updated', {
      detail: { source: 'group', groupId: groupId }
    }));
  }

  /**
   * Handle document events for itinerary edits and broadcast
   */
  function setupSyncEventListeners() {
    // When group itinerary is edited
    document.addEventListener('itinerary_edited', (e) => {
      const { groupId, itineraryId, from } = e.detail;
      console.log('[Sync Event] Itinerary edited by', from, 'in group', groupId);

      // If this is a shared itinerary, sync back to personal
      const groupItin = window.state.groupItineraries?.[itineraryId];
      if (groupItin?.originItineraryId === 'personal_itinerary' && window.state.group?.myName === groupItin.owner) {
        syncGroupToPersonal('personal_itinerary', groupId);
      }
    });

    // When personal itinerary is shared (broadcasts to group)
    document.addEventListener('itinerary_shared', (e) => {
      const { itineraryId, groupId } = e.detail;
      console.log('[Sync Event] Itinerary shared:', itineraryId, '→', groupId);
      syncPersonalToSharedGroups();
    });

    // When sync back happens (owner receives group updates)
    document.addEventListener('sync_group_to_personal', (e) => {
      const { originItineraryId, groupId } = e.detail;
      console.log('[Sync Event] Syncing group back to personal');
      syncGroupToPersonal(originItineraryId, groupId);
    });

    // When personal itinerary changes
    document.addEventListener('personal_itinerary_changed', (e) => {
      console.log('[Sync Event] Personal itinerary changed');
      // Debounce the sync
      clearTimeout(window._syncDebounceTimer);
      window._syncDebounceTimer = setTimeout(() => {
        syncPersonalToSharedGroups();
      }, 500);
    });
  }

  // Initialize sync listeners
  setupSyncEventListeners();

  // Make helpers globally accessible
  window.addTappaAuditEntry = addTappaAuditEntry;
  window.getSharedGroups = getSharedGroups;
  window.isItinerarySharedWithGroup = isItinerarySharedWithGroup;
  window.markItinerarySharedWithGroup = markItinerarySharedWithGroup;
  window.unmarkItinerarySharedWithGroup = unmarkItinerarySharedWithGroup;
  window.formatAuditLog = formatAuditLog;
  window.getLastModifiedInfo = getLastModifiedInfo;
  window.syncPersonalToSharedGroups = syncPersonalToSharedGroups;
  window.syncGroupToPersonal = syncGroupToPersonal;
})();
