/**
 * POI VIEWPORT SYNC — Show only verified (real) POIs
 *
 * - Monitors map viewport
 * - Auto-syncs POIs in visible area
 * - Filters map to show only verified POIs
 * - Removes fake/not-found POIs
 */

let mapInstance = null;
let syncingViewport = false;
const syncedViewports = new Set();

// Initialize viewport sync
async function initViewportSync() {
  console.log('[POI-ViewportSync] Initializing viewport sync');

  // Wait for map to be available
  const checkMap = setInterval(() => {
    mapInstance = window.map || window.olMap;
    if (mapInstance) {
      clearInterval(checkMap);
      setupViewportListener();
      syncCurrentViewport();
    }
  }, 500);
}

// Setup viewport change listener
function setupViewportListener() {
  if (!mapInstance) return;

  console.log('[POI-ViewportSync] Setting up viewport listener');

  // For OpenLayers
  if (mapInstance.on) {
    mapInstance.on('moveend', debounce(syncCurrentViewport, 500));
  }

  // Fallback: monitor window resize
  window.addEventListener('resize', debounce(syncCurrentViewport, 500));
}

// Get viewport bounds
function getViewportBounds() {
  if (!mapInstance) return null;

  try {
    // OpenLayers map
    if (mapInstance.getView && mapInstance.getView().calculateExtent) {
      const extent = mapInstance.getView().calculateExtent(mapInstance.getSize());
      const [minLng, minLat, maxLng, maxLat] = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
      return { minLat, minLng, maxLat, maxLng };
    }
  } catch (err) {
    console.warn('[POI-ViewportSync] Could not get viewport bounds:', err);
  }

  return null;
}

// Check if POI is in viewport
function isPOIInViewport(poi, bounds) {
  if (!bounds) return true;
  return poi.lat >= bounds.minLat &&
         poi.lat <= bounds.maxLat &&
         poi.lng >= bounds.minLng &&
         poi.lng <= bounds.maxLng;
}

// Sync POIs in current viewport
async function syncCurrentViewport() {
  if (syncingViewport) {
    console.log('[POI-ViewportSync] Already syncing viewport');
    return;
  }

  const bounds = getViewportBounds();
  if (!bounds) {
    console.warn('[POI-ViewportSync] Could not get viewport bounds');
    return;
  }

  const viewportKey = `${bounds.minLat.toFixed(2)}_${bounds.minLng.toFixed(2)}_${bounds.maxLat.toFixed(2)}_${bounds.maxLng.toFixed(2)}`;

  if (syncedViewports.has(viewportKey)) {
    console.log('[POI-ViewportSync] Viewport already synced');
    return;
  }

  syncingViewport = true;
  syncedViewports.add(viewportKey);

  try {
    console.log('[POI-ViewportSync] Syncing viewport:', bounds);

    const allPOIs = window.allPOIs?.() || window.allPOIs?.() || [];
    const poiInViewport = allPOIs.filter(poi => isPOIInViewport(poi, bounds));

    if (poiInViewport.length === 0) {
      console.log('[POI-ViewportSync] No POIs in viewport');
      return;
    }

    console.log(`[POI-ViewportSync] Found ${poiInViewport.length} POIs in viewport, verifying...`);

    // Sync in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < poiInViewport.length; i += BATCH_SIZE) {
      const batch = poiInViewport.slice(i, i + BATCH_SIZE);
      const unverified = await Promise.all(
        batch.map(async (poi) => {
          const verified = await window.POIVerifiedDB?.isPOIVerified?.(poi.id);
          return verified ? null : poi;
        })
      );

      const toSync = unverified.filter(Boolean);
      if (toSync.length > 0) {
        console.log(`[POI-ViewportSync] Syncing batch of ${toSync.length} POIs`);
        await window.POISync?.batchVerifyPOIs?.(toSync, 1);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[POI-ViewportSync] Viewport sync complete');
    updateMapMarkers();

  } catch (err) {
    console.error('[POI-ViewportSync] Error:', err);
  } finally {
    syncingViewport = false;
  }
}

// Filter and update map markers
async function updateMapMarkers() {
  console.log('[POI-ViewportSync] Updating map markers');

  const allPOIs = window.allPOIs?.() || window.allPOIs?.() || [];

  // Get all verified POI IDs
  const verifiedPOIs = await window.POIVerifiedDB?.getAllVerifiedPOIs?.() || [];
  const verifiedIds = new Set(verifiedPOIs.map(p => p.localId));

  // Get all not-found POIs
  const notFoundPOIs = new Set();
  const allStatuses = await Promise.all(
    allPOIs.map(async (poi) => ({
      id: poi.id,
      status: await window.POIVerifiedDB?.getVerificationStatus?.(poi.id)
    }))
  );
  allStatuses.forEach(({ id, status }) => {
    if (status === 'failed') notFoundPOIs.add(id);
  });

  console.log(`[POI-ViewportSync] Verified: ${verifiedIds.size}, Not found: ${notFoundPOIs.size}`);

  // Find and hide/remove fake markers
  if (window.markerClusterGroup) {
    // Leaflet
    const markers = window.markerClusterGroup.getLayers?.() || [];
    markers.forEach(marker => {
      const poiId = marker.poiId || marker.options?.poiId;
      if (notFoundPOIs.has(poiId)) {
        console.log(`[POI-ViewportSync] Removing fake POI: ${poiId}`);
        window.markerClusterGroup.removeLayer(marker);
      }
    });
  }

  // Dispatch event for custom marker handling
  window.dispatchEvent(new CustomEvent('poi-markers-update', {
    detail: {
      verified: Array.from(verifiedIds),
      notFound: Array.from(notFoundPOIs)
    }
  }));
}

// Debounce helper
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Get viewport sync stats
async function getViewportStats() {
  const allPOIs = window.allPOIs?.() || window.allPOIs?.() || [];
  const verified = await window.POIVerifiedDB?.getAllVerifiedPOIs?.() || [];

  return {
    totalPOIs: allPOIs.length,
    verifiedPOIs: verified.length,
    fakePercentage: (((allPOIs.length - verified.length) / allPOIs.length) * 100).toFixed(2),
    syncsCompleted: syncedViewports.size
  };
}

// Export
window.POIViewportSync = {
  initViewportSync,
  syncCurrentViewport,
  updateMapMarkers,
  getViewportStats
};

console.log('[POI-ViewportSync] Module loaded');

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initViewportSync);
} else {
  setTimeout(initViewportSync, 1000);
}
