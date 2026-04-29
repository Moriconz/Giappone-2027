/**
 * GOOGLE PLACES CACHE — IndexedDB storage for Google Places POI data
 *
 * Stores all Google Places POI results with 1-month TTL
 * Cache key: viewport area + radius to avoid duplicate queries
 */

class GooglePlacesCache {
  constructor() {
    this.dbName = 'GooglePlacesDB';
    this.storeName = 'poisCache';
    this.db = null;
  }

  // Initialize IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        console.log('[GooglePlacesCache] DB initialized');
        resolve(this.db);
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'cacheKey' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          console.log('[GooglePlacesCache] Store created');
        }
      };
    });
  }

  // Generate cache key from viewport/radius
  getCacheKey(lat, lng, radiusM) {
    const latRounded = Math.round(lat * 10000) / 10000; // 4 decimals = ~10m precision
    const lngRounded = Math.round(lng * 10000) / 10000;
    return `${latRounded}_${lngRounded}_${radiusM}`;
  }

  // Save POIs with 1-month TTL
  async savePOIs(lat, lng, radiusM, pois) {
    if (!this.db) await this.initDB();

    const cacheKey = this.getCacheKey(lat, lng, radiusM);
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + oneMonthMs;

    const record = {
      cacheKey,
      lat,
      lng,
      radiusM,
      pois: pois.map(poi => ({
        googlePlaceId: poi.place_id,
        name: poi.name,
        lat: poi.geometry.location.lat,
        lng: poi.geometry.location.lng,
        address: poi.vicinity || poi.formatted_address || '',
        city: poi.city || null,
        rating: poi.rating || null,
        ratingCount: poi.user_ratings_total || 0,
        types: poi.types || [],
        businessStatus: poi.business_status || 'OPERATIONAL',
        icon: poi.icon || null,
        photos: poi.photos?.map(p => ({
          reference: p.photo_reference,
          height: p.height,
          width: p.width,
          attribution: p.html_attributions || []
        })) || [],
        openNow: poi.opening_hours?.open_now || null,
        // Full response for details API later
        fullData: poi
      })),
      expiresAt,
      cachedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(record);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        console.log(`[GooglePlacesCache] Cached ${pois.length} POIs at ${lat.toFixed(4)}, ${lng.toFixed(4)}, radius ${radiusM}m`);
        resolve(record);
      };
    });
  }

  // Get cached POIs for coordinates + radius
  async getCachedPOIs(lat, lng, radiusM) {
    if (!this.db) await this.initDB();

    const cacheKey = this.getCacheKey(lat, lng, radiusM);

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(cacheKey);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const record = req.result;

        // Check expiry
        if (record && record.expiresAt > Date.now()) {
          console.log(`[GooglePlacesCache] Cache hit: ${record.pois.length} POIs`);
          resolve(record.pois);
        } else if (record) {
          console.log('[GooglePlacesCache] Cache expired, removing...');
          store.delete(cacheKey);
          resolve(null);
        } else {
          resolve(null);
        }
      };
    });
  }

  // Clean expired records
  async cleanExpired() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const index = store.index('expiresAt');

      const req = index.openCursor();
      let deleted = 0;

      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.value.expiresAt < Date.now()) {
            store.delete(cursor.value.cacheKey);
            deleted++;
          }
          cursor.continue();
        } else {
          console.log(`[GooglePlacesCache] Cleaned ${deleted} expired records`);
          resolve(deleted);
        }
      };
    });
  }

  // Get all cached POIs (for stats)
  async getAllCached() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const records = req.result.filter(r => r.expiresAt > Date.now());
        const allPOIs = records.flatMap(r => r.pois);
        resolve(allPOIs);
      };
    });
  }

  // Clear entire cache
  async clearCache() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.clear();

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        console.log('[GooglePlacesCache] Cache cleared');
        resolve();
      };
    });
  }
}

// Initialize and expose
window.GooglePlacesCache = new GooglePlacesCache();
window.GooglePlacesCache.initDB().then(() => {
  console.log('[GooglePlacesCache] Ready');
});
