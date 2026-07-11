// ============================================================================
// itinerary-crdt.js — mergePOIFields, mergeGroupItinerary,
//   pushUndoState, undo, redo
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, cloneItinerary, peerGPS
// ============================================================================
(function () {
  'use strict';

  // ===== CRDT MERGE FUNCTIONS (Phase 1: Foundation) =====
  // ═════════════════════════════════════════════════════════════════

  /**
   * Merge a single POI field using Last-Write-Wins strategy
   * Input: { value, timestamp, peerId } from both local and remote
   * Returns: winning field value
   */
  function mergePOIFields(localField, remoteField) {
    if (!localField) return remoteField;
    if (!remoteField) return localField;

    // 1. Compare timestamps (higher wins)
    if (remoteField.timestamp > localField.timestamp) {
      return remoteField;
    }
    if (localField.timestamp > remoteField.timestamp) {
      return localField;
    }

    // 2. Timestamps equal: use peerId as tiebreaker (lexicographically later wins)
    if (remoteField.peerId > localField.peerId) {
      return remoteField;
    }
    return localField;
  }

  /**
   * Merge two group itineraries using CRDT Last-Write-Wins with tiebreaker
   * Resolves conflicts at the field level for each POI
   */
  function mergeGroupItinerary(localItinerary, remoteItinerary) {
    console.log('[CRDT] mergeGroupItinerary START', {
      localVersion: localItinerary?.version || 0,
      remoteVersion: remoteItinerary?.version || 0,
      localPOIs: localItinerary?.pois?.length || 0,
      remotePOIs: remoteItinerary?.pois?.length || 0
    });

    if (!localItinerary) return remoteItinerary;
    if (!remoteItinerary) return localItinerary;

    const merged = { ...localItinerary };

    // 1. Merge itinerary-level metadata
    merged.version = Math.max(localItinerary.version || 0, remoteItinerary.version || 0) + 1;

    // Merge name by timestamp
    if (remoteItinerary.name?.timestamp > (localItinerary.name?.timestamp || 0)) {
      merged.name = remoteItinerary.name;
    }

    // 2. Build map of POIs by googlePlaceId
    const poiMap = new Map();

    // Load local POIs
    (localItinerary.pois || []).forEach(poi => {
      poiMap.set(poi.googlePlaceId, { local: poi, remote: null });
    });

    // Load remote POIs
    (remoteItinerary.pois || []).forEach(remotePoi => {
      const key = remotePoi.googlePlaceId;
      const entry = poiMap.get(key) || { local: null, remote: null };
      entry.remote = remotePoi;
      poiMap.set(key, entry);
    });

    // Helper: Normalize POI fields (extract values from field metadata objects)
    function normalizePOI(poi) {
      const normalized = { googlePlaceId: poi.googlePlaceId };
      Object.keys(poi).forEach(key => {
        if (key === 'googlePlaceId' || key === 'fields') return;
        const val = poi[key];
        // Special handling: preserve audit trail as-is
        if (key === 'audit') {
          normalized[key] = val;
        }
        // If value is a field metadata object, extract the value
        else if (val && typeof val === 'object' && 'value' in val && 'timestamp' in val) {
          normalized[key] = val.value;
        } else {
          normalized[key] = val;
        }
      });
      return normalized;
    }

    // 3. Merge each POI
    merged.pois = Array.from(poiMap.values()).map(({ local, remote }) => {
      if (!local) {
        console.log('[CRDT] POI only in remote:', remote.googlePlaceId);
        return normalizePOI(remote);
      }
      if (!remote) {
        console.log('[CRDT] POI only in local:', local.googlePlaceId);
        return normalizePOI(local);
      }

      // Both exist: merge field-by-field
      console.log('[CRDT] Merging POI:', local.googlePlaceId);
      const mergedPoi = { googlePlaceId: local.googlePlaceId };

      // Collect all field names
      const fieldNames = new Set([
        ...Object.keys(local),
        ...Object.keys(remote)
      ]);

      fieldNames.forEach(fieldName => {
        if (fieldName === 'googlePlaceId' || fieldName === 'fields' || fieldName === 'deleted' || fieldName === 'deletionTimestamp' || fieldName === 'audit') return;
        // Note: 'audit' is handled separately below to preserve full history

        // Get local field metadata
        let localFieldMeta = local.fields?.[fieldName];
        if (!localFieldMeta) {
          const localValue = local[fieldName];
          // Check if value is already a field metadata object
          if (localValue && typeof localValue === 'object' && 'value' in localValue && 'timestamp' in localValue) {
            localFieldMeta = localValue;
          } else {
            localFieldMeta = {
              value: localValue,
              timestamp: local.timestamp || 0,
              peerId: local.addedByPeerId || 'unknown'
            };
          }
        }

        // Get remote field metadata
        let remoteFieldMeta = remote.fields?.[fieldName];
        if (!remoteFieldMeta) {
          const remoteValue = remote[fieldName];
          // Check if value is already a field metadata object
          if (remoteValue && typeof remoteValue === 'object' && 'value' in remoteValue && 'timestamp' in remoteValue) {
            remoteFieldMeta = remoteValue;
          } else {
            remoteFieldMeta = {
              value: remoteValue,
              timestamp: remote.timestamp || 0,
              peerId: remote.addedByPeerId || 'unknown'
            };
          }
        }

        const winner = mergePOIFields(localFieldMeta, remoteFieldMeta);
        mergedPoi[fieldName] = winner.value;
      });

      // 4. Handle soft deletes
      // ponytail: clamp anti-forgia — un timestamp remoto oltre la tolleranza di
      // skew orologio viene ignorato (trattato come nessuna cancellazione),
      // altrimenti un peer potrebbe forgiare un deletionTimestamp a decenni nel
      // futuro e cancellare la tappa per sempre per tutti (vince ogni merge
      // successivo). Tolleranza larga per non rompere client con orologio
      // leggermente sfasato.
      const CLOCK_SKEW_MS = 5 * 60 * 1000;
      const now = Date.now();
      const localDeleted = local.deleted || false;
      const remoteDeleted = remote.deleted || false;
      const localDeleteTime = local.deletionTimestamp || 0;
      const remoteDeleteTimeRaw = remote.deletionTimestamp || 0;
      const remoteDeleteTime = remoteDeleteTimeRaw > now + CLOCK_SKEW_MS ? 0 : remoteDeleteTimeRaw;

      if (remoteDeleteTime > localDeleteTime) {
        mergedPoi.deleted = remoteDeleted;
        mergedPoi.deletionTimestamp = remoteDeleteTime;
      } else {
        mergedPoi.deleted = localDeleted;
        mergedPoi.deletionTimestamp = localDeleteTime;
      }

      mergedPoi.timestamp = Math.max(local.timestamp || 0, remote.timestamp || 0);

      // PRESERVE AUDIT TRAIL: Merge audit information from both sides
      if (local.audit || remote.audit) {
        const localAudit = local.audit || { modificationHistory: [] };
        const remoteAudit = remote.audit || { modificationHistory: [] };

        // Merge modification histories (deduplicate by timestamp + action + by)
        const mergedHistory = [];
        const seen = new Set();

        const combinedHistory = [
          ...(localAudit.modificationHistory || []),
          ...(remoteAudit.modificationHistory || [])
        ];

        // Sort by timestamp and deduplicate
        combinedHistory.sort((a, b) => a.at - b.at);
        combinedHistory.forEach(entry => {
          const key = `${entry.at}|${entry.action}|${entry.by}`;
          if (!seen.has(key)) {
            seen.add(key);
            mergedHistory.push(entry);
          }
        });

        mergedPoi.audit = {
          createdAt: Math.min(localAudit.createdAt || Date.now(), remoteAudit.createdAt || Date.now()),
          createdBy: localAudit.createdBy || remoteAudit.createdBy || 'Unknown',
          lastModifiedAt: Math.max(localAudit.lastModifiedAt || 0, remoteAudit.lastModifiedAt || 0),
          lastModifiedBy: (localAudit.lastModifiedAt || 0) > (remoteAudit.lastModifiedAt || 0)
            ? localAudit.lastModifiedBy
            : remoteAudit.lastModifiedBy,
          modificationHistory: mergedHistory
        };
      }

      return mergedPoi;
    }).filter(poi => !poi.deleted);  // Hide soft-deleted items

    console.log('[CRDT] mergeGroupItinerary COMPLETE', {
      resultVersion: merged.version,
      resultPOIs: merged.pois.length
    });

    return merged;
  }

  /**
   * Push a state change to undo stack
   */
  function pushUndoState(action, itineraryId, poiId, changeSet) {
    if (!window.state.undoRedo) {
      window.state.undoRedo = { stack: [], currentIndex: -1, maxSize: 100 };
    }

    const undoRedo = window.state.undoRedo;
    const myPeerId = window.peerGPS?.getMyPeerId?.() || 'local';

    // Trim redo stack (can no longer redo after new change)
    undoRedo.stack = undoRedo.stack.slice(0, undoRedo.currentIndex + 1);

    // Add new undo state
    undoRedo.stack.push({
      id: `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      peerId: myPeerId,
      action: action,  // "add_poi" | "modify_field" | "delete_poi"
      itineraryId: itineraryId,
      poiId: poiId,
      changeSet: changeSet,
      snapshot: window.cloneItinerary?.(window.state.groupItineraries[itineraryId])
    });

    // Trim if over limit
    if (undoRedo.stack.length > undoRedo.maxSize) {
      undoRedo.stack.shift();
    } else {
      undoRedo.currentIndex++;
    }

    console.log('[Undo] Pushed:', action, '| Stack size:', undoRedo.stack.length, '| Index:', undoRedo.currentIndex);

    window.saveState?.();
  }

  /**
   * Undo last change
   */
  function undo() {
    const undoRedo = window.state.undoRedo;
    if (!undoRedo || undoRedo.currentIndex <= 0) {
      console.log('[Undo] Cannot undo (at start or no stack)');
      return false;
    }

    undoRedo.currentIndex--;
    const targetState = undoRedo.stack[undoRedo.currentIndex];

    if (targetState?.snapshot) {
      const itineraryId = targetState.itineraryId;
      window.state.groupItineraries[itineraryId] = JSON.parse(JSON.stringify(targetState.snapshot));
      console.log('[Undo] Restored to index:', undoRedo.currentIndex);
      window.saveState?.();
      return true;
    }
    return false;
  }

  /**
   * Redo last undone change
   */
  function redo() {
    const undoRedo = window.state.undoRedo;
    if (!undoRedo || undoRedo.currentIndex >= undoRedo.stack.length - 1) {
      console.log('[Redo] Cannot redo (at end or no stack)');
      return false;
    }

    undoRedo.currentIndex++;
    const targetState = undoRedo.stack[undoRedo.currentIndex];

    if (targetState?.snapshot) {
      const itineraryId = targetState.itineraryId;
      window.state.groupItineraries[itineraryId] = JSON.parse(JSON.stringify(targetState.snapshot));
      console.log('[Redo] Restored to index:', undoRedo.currentIndex);
      window.saveState?.();
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Export CRDT functions globally for testing and WebRTC handlers
  window.mergePOIFields = mergePOIFields;
  window.mergeGroupItinerary = mergeGroupItinerary;
  window.pushUndoState = pushUndoState;
  window.undo = undo;
  window.redo = redo;
})();
