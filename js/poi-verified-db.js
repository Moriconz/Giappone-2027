/**
 * POI VERIFIED DATABASE — IndexedDB Schema & Operations
 *
 * Stores Google Places verified POI data with complete details
 * One-time sync on-demand, cached forever (they're real)
 */

const DB_NAME = 'Giappone2027';
const DB_VERSION = 2;

const STORES = {
  poi_verified: {
    keyPath: 'localId',
    indexes: [
      { name: 'googlePlaceId', keyPath: 'googlePlaceId', unique: true },
      { name: 'category', keyPath: 'category' },
      { name: 'verifiedTimestamp', keyPath: 'verifiedTimestamp' },
      { name: 'lat_lng', keyPath: ['lat', 'lng'] } // For geo queries
    ]
  },
  poi_sync_status: {
    keyPath: 'localId',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'lastAttempt', keyPath: 'lastAttempt' }
    ]
  }
};

let dbInstance = null;

// Initialize DB
async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      dbInstance = req.result;
      console.log('[POI-VerifiedDB] Initialized');
      resolve(dbInstance);
    };

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Store: poi_verified
      if (!db.objectStoreNames.contains('poi_verified')) {
        const store = db.createObjectStore('poi_verified', {
          keyPath: 'localId'
        });
        store.createIndex('googlePlaceId', 'googlePlaceId', { unique: true });
        store.createIndex('category', 'category');
        store.createIndex('verifiedTimestamp', 'verifiedTimestamp');
        console.log('[POI-VerifiedDB] Created store: poi_verified');
      }

      // Store: poi_sync_status
      if (!db.objectStoreNames.contains('poi_sync_status')) {
        const store = db.createObjectStore('poi_sync_status', {
          keyPath: 'localId'
        });
        store.createIndex('status', 'status');
        store.createIndex('lastAttempt', 'lastAttempt');
        console.log('[POI-VerifiedDB] Created store: poi_sync_status');
      }
    };
  });
}

// Get verified POI by local ID
async function getVerifiedPOI(localId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poi_verified', 'readonly');
    const req = tx.objectStore('poi_verified').get(localId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get verified POI by Google Place ID
async function getVerifiedPOIByPlaceId(googlePlaceId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poi_verified', 'readonly');
    const index = tx.objectStore('poi_verified').index('googlePlaceId');
    const req = index.get(googlePlaceId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get all verified POIs
async function getAllVerifiedPOIs() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poi_verified', 'readonly');
    const req = tx.objectStore('poi_verified').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get verified POIs by category
async function getVerifiedPOIsByCategory(category) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poi_verified', 'readonly');
    const index = tx.objectStore('poi_verified').index('category');
    const req = index.getAll(category);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get nearby verified POIs (within radius)
async function getNearbyVerifiedPOIs(lat, lng, radiusKm = 5) {
  const allPOIs = await getAllVerifiedPOIs();
  const radiusM = radiusKm * 1000;

  return allPOIs.filter(poi => {
    const distance = getDistance(lat, lng, poi.lat, poi.lng);
    return distance <= radiusM;
  });
}

// Save verified POI
async function saveVerifiedPOI(poiData) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poi_verified', 'readwrite');
    const req = tx.objectStore('poi_verified').put(poiData);
    req.onsuccess = () => {
      updateSyncStatus(poiData.localId, 'verified');
      resolve(poiData);
    };
    req.onerror = () => reject(req.error);
  });
}

// Batch save verified POIs
async function saveVerifiedPOIs(poiDataArray) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poi_verified', 'readwrite');
    const store = tx.objectStore('poi_verified');

    poiDataArray.forEach(poi => {
      store.put(poi);
      updateSyncStatus(poi.localId, 'verified');
    });

    tx.oncomplete = () => resolve(poiDataArray);
    tx.onerror = () => reject(tx.error);
  });
}

// Get sync status
async function getSyncStatus(localId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poi_sync_status', 'readonly');
    const req = tx.objectStore('poi_sync_status').get(localId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Update sync status
async function updateSyncStatus(localId, status, error = null) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poi_sync_status', 'readwrite');
    const statusData = {
      localId,
      status,
      lastAttempt: Date.now(),
      error: error || null
    };
    const req = tx.objectStore('poi_sync_status').put(statusData);
    req.onsuccess = () => resolve(statusData);
    req.onerror = () => reject(req.error);
  });
}

// Get POIs needing verification
async function getPOIsNeedingVerification(allPOIs) {
  const verified = await getAllVerifiedPOIs();
  const verifiedIds = new Set(verified.map(p => p.localId));

  return allPOIs.filter(poi => !verifiedIds.has(poi.id));
}

// Get POIs needing verification in radius
async function getPOIsNeedingVerificationNearby(allPOIs, lat, lng, radiusKm = 5) {
  const needingVerification = await getPOIsNeedingVerification(allPOIs);
  const radiusM = radiusKm * 1000;

  return needingVerification.filter(poi => {
    const distance = getDistance(lat, lng, poi.lat, poi.lng);
    return distance <= radiusM;
  });
}

// Check if POI is verified
async function isPOIVerified(localId) {
  const verified = await getVerifiedPOI(localId);
  return !!verified;
}

// Get verification status for POI
async function getVerificationStatus(localId) {
  const verified = await getVerifiedPOI(localId);
  if (verified) return 'verified';

  const status = await getSyncStatus(localId);
  return status?.status || 'pending';
}

// Distance calculation (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Clear database
async function clearDatabase() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['poi_verified', 'poi_sync_status'], 'readwrite');
    tx.objectStore('poi_verified').clear();
    tx.objectStore('poi_sync_status').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Export all functions
window.POIVerifiedDB = {
  initDB,
  getVerifiedPOI,
  getVerifiedPOIByPlaceId,
  getAllVerifiedPOIs,
  getVerifiedPOIsByCategory,
  getNearbyVerifiedPOIs,
  saveVerifiedPOI,
  saveVerifiedPOIs,
  getSyncStatus,
  updateSyncStatus,
  getPOIsNeedingVerification,
  getPOIsNeedingVerificationNearby,
  isPOIVerified,
  getVerificationStatus,
  clearDatabase
};

console.log('[POI-VerifiedDB] Module loaded');
