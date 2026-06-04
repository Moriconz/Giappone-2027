// ============================================================================
// poi-validation-cache.js — IndexedDB cache for validated POIs
// Extracted from poi-detail-view.js. Exposes window.POIVerifiedDB.
// Used by: poi-detail-view.js (enrichPOIData), map-markers.js (fake-POI filter)
// ============================================================================
(function () {
  'use strict';

  const DB_NAME  = 'giappone2027_poi_validation';
  const DB_STORE = 'validated_pois';

  function _open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => { e.target.result.createObjectStore(DB_STORE, { keyPath: 'id' }); };
      req.onsuccess  = (e) => resolve(e.target.result);
      req.onerror    = ()  => reject(req.error);
    });
  }

  async function getVerifiedPOI(id) {
    try {
      const db = await _open();
      return await new Promise((res) => {
        const q = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(id);
        q.onsuccess = () => res(q.result || null);
        q.onerror   = () => res(null);
      });
    } catch { return null; }
  }

  async function saveVerifiedPOI(poiData) {
    try {
      const db = await _open();
      return await new Promise((res) => {
        const q = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(poiData);
        q.onsuccess = () => res(true);
        q.onerror   = () => res(false);
      });
    } catch { return false; }
  }

  async function saveNotFound(id) {
    return saveVerifiedPOI({ id, _notFound: true, _checkedAt: Date.now() });
  }

  async function getVerificationStatus(id) {
    const rec = await getVerifiedPOI(id);
    if (!rec) return null;
    return rec._notFound ? 'not_found' : 'found';
  }

  window.POIVerifiedDB = { getVerifiedPOI, saveVerifiedPOI, saveNotFound, getVerificationStatus };
})();
