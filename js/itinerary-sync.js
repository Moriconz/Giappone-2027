// ============================================================================
// itinerary-sync.js — computeItineraryHash, simpleHash, broadcastItinerary
// Extracted from app-core.js. Deps (all window.*):
//   state, makePeerId, makeHubId, peerBroadcast, peer
// ============================================================================
(function () {
  'use strict';

  function computeItineraryHash(itinerary) {
    if (!itinerary) return '';

    const canonical = JSON.stringify({
      id: itinerary.id,
      roomId: itinerary.roomId,
      version: itinerary.version,
      pois: (itinerary.pois || []).map(poi => ({
        googlePlaceId: poi.googlePlaceId,
        name: poi.name?.value || poi.name,
        notes: poi.notes?.value || poi.notes,
        category: poi.category?.value || poi.category,
        timestamp: poi.timestamp
      })).sort((a, b) => a.googlePlaceId.localeCompare(b.googlePlaceId))
    });

    return simpleHash(canonical);
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  function broadcastItinerary(itineraryId) {
    if (!window.state.group || !window.state.group.roomId) {
      console.warn('[SYNC] Cannot broadcast: not in a group');
      return;
    }

    const itinerary = window.state.groupItineraries?.[itineraryId];
    if (!itinerary) {
      console.warn('[SYNC] Itinerary not found:', itineraryId);
      return;
    }

    const myPeerId = window.makePeerId?.(window.state.group.roomId, window.state.group.myName);
    const isHub = (window.state.group.myName === window.state.group.createdByName);

    const hash = computeItineraryHash(itinerary);

    const message = {
      type: "itinerary_sync",
      from: myPeerId,
      roomId: window.state.group.roomId,
      itineraryId: itineraryId,
      timestamp: Date.now(),
      payload: itinerary,
      hash: hash
    };

    console.log('[SYNC] Broadcasting itinerary:', itineraryId, '| Hash:', hash, '| POIs:', itinerary.pois?.length);

    if (window.peerBroadcast) {
      window.peerBroadcast(message);
      console.log('[SYNC] Broadcast itinerary via Firebase RTDB:', itineraryId);
    } else if (window.peer?.connections) {
      Object.values(window.peer.connections).forEach(conns => {
        if (conns && conns.length > 0) conns[0].send(message);
      });
    }
  }

  window.computeItineraryHash = computeItineraryHash;
  window.simpleHash = simpleHash;
  window.broadcastItinerary = broadcastItinerary;
})();
