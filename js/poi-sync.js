/**
 * POI SYNC ENGINE — On-demand synchronization with GPS priority
 *
 * Orchestrates verification of POIs with Google Places
 * - GPS proximity first
 * - Batch processing (max 50 per request)
 * - Error handling & retry
 * - Progress tracking
 */

const SYNC_BATCH_SIZE = 50;
const SYNC_RADIUS_INITIAL = 5; // km
const SYNC_RADIUS_EXPAND = [5, 10, 20, 50]; // km tiers

let syncInProgress = new Set();
let expandedRadii = new Set();

// Initialize sync engine
async function initSyncEngine() {
  await window.POIVerifiedDB.initDB();
  console.log('[POI-Sync] Engine initialized');

  // Auto-expand sync radius when GPS moves
  if (navigator.geolocation) {
    const originalStartGPS = window.startGPS;
    if (originalStartGPS) {
      window.startGPS = async function() {
        await originalStartGPS.call(this);
        // After GPS starts, schedule radius expansion
        scheduleRadiusExpansion();
      };
    }
  }
}

// Schedule progressive radius expansion
function scheduleRadiusExpansion() {
  // Expand radius every 30 seconds if GPS is active
  setInterval(() => {
    if (window.state?.gpsCurrentLat && window.state?.gpsCurrentLng && !syncInProgress.size) {
      expandSyncRadius();
    }
  }, 30000);
}

// Expand sync radius progressively
async function expandSyncRadius() {
  if (!window.state?.gpsCurrentLat || !window.state?.gpsCurrentLng) return;

  for (const radius of SYNC_RADIUS_EXPAND) {
    if (expandedRadii.has(radius)) continue;
    expandedRadii.add(radius);

    console.log(`[POI-Sync] Expanding radius to ${radius}km`);
    await syncNearbyPOIs(window.state.gpsCurrentLat, window.state.gpsCurrentLng, radius);
  }
}

// Sync nearby POIs (GPS priority)
async function syncNearbyPOIs(lat, lng, radiusKm = SYNC_RADIUS_INITIAL) {
  console.log(`[POI-Sync] Syncing nearby POIs: ${radiusKm}km radius`);

  try {
    const allPOIs = window.allPOIs?.() || window.allPOIs?.() || [];
    const needingVerification = await window.POIVerifiedDB.getPOIsNeedingVerificationNearby(
      allPOIs,
      lat,
      lng,
      radiusKm
    );

    if (needingVerification.length === 0) {
      console.log('[POI-Sync] All nearby POIs already verified');
      return { verified: 0, errors: 0 };
    }

    console.log(`[POI-Sync] Found ${needingVerification.length} POIs to verify`);
    return await batchVerifyPOIs(needingVerification, radiusKm);
  } catch (err) {
    console.error('[POI-Sync] Error syncing nearby POIs:', err);
    return { verified: 0, errors: 1, error: err.message };
  }
}

// Sync specific POI (on-demand, e.g., when marker clicked)
async function syncSinglePOI(poi) {
  if (syncInProgress.has(poi.id)) {
    console.log(`[POI-Sync] Already syncing POI: ${poi.id}`);
    return null;
  }

  const isVerified = await window.POIVerifiedDB.isPOIVerified(poi.id);
  if (isVerified) {
    console.log(`[POI-Sync] POI already verified: ${poi.id}`);
    return await window.POIVerifiedDB.getVerifiedPOI(poi.id);
  }

  syncInProgress.add(poi.id);
  try {
    const result = await batchVerifyPOIs([poi], 1);
    if (result.verified > 0) {
      return await window.POIVerifiedDB.getVerifiedPOI(poi.id);
    }
    return null;
  } finally {
    syncInProgress.delete(poi.id);
  }
}

// Batch verify POIs
async function batchVerifyPOIs(pois, radiusKm = 1) {
  const batches = [];
  for (let i = 0; i < pois.length; i += SYNC_BATCH_SIZE) {
    batches.push(pois.slice(i, i + SYNC_BATCH_SIZE));
  }

  let totalVerified = 0;
  let totalErrors = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchNum = batchIndex + 1;
    const totalBatches = batches.length;

    console.log(`[POI-Sync] Processing batch ${batchNum}/${totalBatches} (${batch.length} POIs)`);

    // Mark as processing
    batch.forEach(poi => {
      window.POIVerifiedDB.updateSyncStatus(poi.id, 'processing');
      syncInProgress.add(poi.id);
    });

    try {
      const response = await fetch('/api/verifyPOIs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pois: batch,
          radiusM: radiusKm * 1000
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      // Save verified POIs
      if (result.verified?.length > 0) {
        await window.POIVerifiedDB.saveVerifiedPOIs(result.verified);
        totalVerified += result.verified.length;
        console.log(`[POI-Sync] Batch ${batchNum}: ${result.verified.length} verified`);
      }

      // Log errors
      if (result.errors?.length > 0) {
        totalErrors += result.errors.length;
        result.errors.forEach(err => {
          console.warn(`[POI-Sync] Error: ${err.poiName} - ${err.error}`);
          window.POIVerifiedDB.updateSyncStatus(err.poiId, 'not_found', err.error);
        });
      }

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('poi-sync-progress', {
        detail: {
          batch: batchNum,
          totalBatches,
          verified: totalVerified,
          errors: totalErrors
        }
      }));

      // Rate limiting between batches
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error(`[POI-Sync] Batch ${batchNum} failed:`, err);
      totalErrors += batch.length;
      batch.forEach(poi => {
        window.POIVerifiedDB.updateSyncStatus(poi.id, 'not_found', err.message);
        syncInProgress.delete(poi.id);
      });
    }
  }

  console.log(`[POI-Sync] Batch sync complete: ${totalVerified} verified, ${totalErrors} errors`);
  return { verified: totalVerified, errors: totalErrors };
}

// Sync POI before opening detail
async function ensurePOIVerified(poi) {
  const isVerified = await window.POIVerifiedDB.isPOIVerified(poi.id);

  if (isVerified) {
    return await window.POIVerifiedDB.getVerifiedPOI(poi.id);
  }

  console.log(`[POI-Sync] Syncing on-demand: ${poi.name}`);
  const verified = await syncSinglePOI(poi);

  if (!verified) {
    console.error(`[POI-Sync] Failed to verify POI: ${poi.id}`);
    toast('⚠️ Impossibile verificare il luogo con Google Places');
    return null;
  }

  return verified;
}

// Get verified data for POI (with fallback)
async function getPOIData(poi) {
  const verified = await window.POIVerifiedDB.getVerifiedPOI(poi.id);

  if (verified) {
    // Merge with local POI data
    return { ...poi, ...verified };
  }

  // Not verified - return original
  console.warn(`[POI-Sync] POI not verified: ${poi.id}`);
  return poi;
}

// Sync stats
async function getSyncStats() {
  const allVerified = await window.POIVerifiedDB.getAllVerifiedPOIs();
  const allPOIs = window.allPOIs?.() || window.allPOIs?.() || [];

  return {
    total: allPOIs.length,
    verified: allVerified.length,
    percentage: ((allVerified.length / allPOIs.length) * 100).toFixed(2),
    inProgress: syncInProgress.size
  };
}

// Export functions
window.POISync = {
  initSyncEngine,
  syncNearbyPOIs,
  syncSinglePOI,
  batchVerifyPOIs,
  ensurePOIVerified,
  getPOIData,
  getSyncStats
};

console.log('[POI-Sync] Engine loaded');

// Auto-init when document ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSyncEngine);
} else {
  initSyncEngine();
}
