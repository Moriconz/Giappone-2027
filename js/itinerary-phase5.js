// ============================================================================
// itinerary-phase5.js — computeItineraryDelta, queueSyncMessage,
//   replayOfflineQueue, batchItinerarySync, flushBatchSync,
//   notifyItineraryChange, getAverageSyncLatency, getSyncMetrics
// Extracted from app-core.js. Deps (all window.*):
//   state, cloneItinerary, toast, makePeerId, makeHubId, rtdbBroadcast, peer
// ============================================================================
(function () {
  'use strict';

  const syncState = {
    offlineQueue: [],
    lastSyncVersion: {},
    metrics: {
      totalSynced: 0,
      totalBytesSaved: 0,
      syncLatencies: [],
      queueDepth: 0
    },
    batchPending: {},
    batchTimeout: null
  };
  window.syncState = syncState;

  function computeItineraryDelta(itineraryId) {
    const itinerary = window.state.groupItineraries?.[itineraryId];
    if (!itinerary) return null;

    const lastVersion = syncState.lastSyncVersion[itineraryId] || { pois: [] };
    const currentVersion = itinerary;

    const lastPoiMap = new Map(lastVersion.pois.map(p => [p.googlePlaceId, p]));
    const currentPoiMap = new Map(currentVersion.pois.map(p => [p.googlePlaceId, p]));

    const delta = {
      id: itineraryId,
      version: currentVersion.version,
      changedPOIs: [],
      removedPOIs: [],
      metadata: {
        computedAt: Date.now(),
        baseVersion: lastVersion.version || 0
      }
    };

    currentPoiMap.forEach((poi, id) => {
      const lastPoi = lastPoiMap.get(id);
      if (!lastPoi) {
        delta.changedPOIs.push({ type: 'add', poi });
      } else {
        const changes = {};
        Object.keys(poi).forEach(key => {
          if (JSON.stringify(poi[key]) !== JSON.stringify(lastPoi[key])) {
            changes[key] = poi[key];
          }
        });

        if (Object.keys(changes).length > 0) {
          delta.changedPOIs.push({ type: 'update', googlePlaceId: id, changes });
        }
      }
    });

    lastPoiMap.forEach((poi, id) => {
      if (!currentPoiMap.has(id)) {
        delta.removedPOIs.push(id);
      }
    });

    return delta;
  }

  function queueSyncMessage(message) {
    syncState.offlineQueue.push({
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      timestamp: Date.now(),
      retries: 0
    });

    syncState.metrics.queueDepth = syncState.offlineQueue.length;
    console.log('[OfflineQueue] Message queued. Queue depth:', syncState.metrics.queueDepth);

    window.dispatchEvent(new CustomEvent('queue_status_changed', {
      detail: { queueDepth: syncState.metrics.queueDepth }
    }));
  }

  function replayOfflineQueue() {
    console.log('[OfflineQueue] Replaying', syncState.offlineQueue.length, 'queued messages');

    const myPeerId = window.makePeerId?.(window.state.group.roomId, window.state.group.myName) ||
                     `${window.state.group.roomId}_${window.state.group.myName}`;
    const hubId = window.makeHubId?.(window.state.group.roomId);

    let sent = 0;
    const failed = [];

    syncState.offlineQueue.forEach(queued => {
      try {
        const message = queued.message;

        if (window.rtdbBroadcast) {
          window.rtdbBroadcast(message);
          sent++;
        } else if (window.peer?.connections?.[hubId]) {
          window.peer.connections[hubId][0].send(message);
          sent++;
        }
      } catch (e) {
        failed.push(queued.id);
      }
    });

    syncState.offlineQueue = syncState.offlineQueue.filter(q => !failed.includes(q.id) === false);
    syncState.metrics.queueDepth = syncState.offlineQueue.length;

    console.log('[OfflineQueue] Replayed:', sent, 'messages');

    if (syncState.offlineQueue.length === 0) {
      window.dispatchEvent(new CustomEvent('queue_status_changed', {
        detail: { queueDepth: 0, status: 'online' }
      }));
    }
  }

  function batchItinerarySync(itineraryId) {
    console.log('[Batch] Batching sync for:', itineraryId);

    if (syncState.batchTimeout) {
      clearTimeout(syncState.batchTimeout);
    }

    syncState.batchPending[itineraryId] = true;

    syncState.batchTimeout = setTimeout(() => {
      flushBatchSync(itineraryId);
    }, 2000);
  }

  function flushBatchSync(itineraryId) {
    if (!syncState.batchPending[itineraryId]) return;

    const startTime = Date.now();
    const itinerary = window.state.groupItineraries?.[itineraryId];

    if (!itinerary) return;

    const delta = computeItineraryDelta(itineraryId);

    if (!delta || (delta.changedPOIs.length === 0 && delta.removedPOIs.length === 0)) {
      console.log('[Batch] No changes to sync');
      delete syncState.batchPending[itineraryId];
      return;
    }

    const myPeerId = window.makePeerId?.(window.state.group.roomId, window.state.group.myName) ||
                     `${window.state.group.roomId}_${window.state.group.myName}`;
    const hubId = window.makeHubId?.(window.state.group.roomId);
    const isHub = window.state.group.myName === window.state.group.createdByName;

    const message = {
      type: 'itinerary_delta',
      from: myPeerId,
      roomId: window.state.group.roomId,
      itineraryId: itineraryId,
      timestamp: Date.now(),
      delta: delta
    };

    if (window.rtdbBroadcast) {
      window.rtdbBroadcast(message);
      console.log('[Batch] Delta broadcast via RTDB:', itineraryId, 'Changes:', delta.changedPOIs.length);
    } else if (window.peer?.connections?.[hubId]) {
      window.peer.connections[hubId][0].send(message);
    }

    const latency = Date.now() - startTime;
    syncState.metrics.syncLatencies.push(latency);
    if (syncState.metrics.syncLatencies.length > 100) {
      syncState.metrics.syncLatencies.shift();
    }

    syncState.lastSyncVersion[itineraryId] = window.cloneItinerary?.(itinerary);
    syncState.metrics.totalSynced++;

    delete syncState.batchPending[itineraryId];

    console.log('[Batch] ✓ Synced delta in', latency, 'ms |', delta.changedPOIs.length, 'changes');
  }

  function notifyItineraryChange(itineraryId, action, poiId, actor) {
    const myName = window.state.group?.myName;
    if (actor === myName) return;

    const descriptions = {
      'add_poi': '➕ ha aggiunto una tappa',
      'delete_poi': '🗑️ ha rimosso una tappa',
      'modify_field': '✏️ ha modificato'
    };

    const desc = descriptions[action] || 'ha modificato';
    const message = `${actor} ${desc}`;

    console.log('[Notify]', message);

    if (typeof window.toast === 'function') {
      window.toast(message);
    }

    window.dispatchEvent(new CustomEvent('itinerary_change_notification', {
      detail: { itineraryId, action, poiId, actor, message, timestamp: Date.now() }
    }));
  }

  function getAverageSyncLatency() {
    if (syncState.metrics.syncLatencies.length === 0) return 0;
    const sum = syncState.metrics.syncLatencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / syncState.metrics.syncLatencies.length);
  }

  function getSyncMetrics() {
    return {
      totalSynced: syncState.metrics.totalSynced,
      totalBytesSaved: syncState.metrics.totalBytesSaved,
      averageLatency: getAverageSyncLatency(),
      queueDepth: syncState.metrics.queueDepth,
      lastSyncVersions: Object.keys(syncState.lastSyncVersion).length
    };
  }

  window.computeItineraryDelta = computeItineraryDelta;
  window.queueSyncMessage = queueSyncMessage;
  window.replayOfflineQueue = replayOfflineQueue;
  window.batchItinerarySync = batchItinerarySync;
  window.flushBatchSync = flushBatchSync;
  window.notifyItineraryChange = notifyItineraryChange;
  window.getSyncMetrics = getSyncMetrics;
  window.getAverageSyncLatency = getAverageSyncLatency;
})();
