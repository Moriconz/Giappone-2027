// ============================================================================
// JS/POI-LOADER.JS — Overpass API + IndexedDB cache + lazy load per città
// Phase 2 — sostituisce chunk-parts-loader.js
// ============================================================================

console.log('[POILoader] Loading...');

window.poiLoader = (() => {
  const DB_NAME    = 'giappone-2027-pois';
  const DB_VERSION = 1;
  const STORE_NAME = 'pois';
  const CACHE_TTL  = 7 * 24 * 60 * 60 * 1000; // 7 giorni

  // Overpass API endpoint (CORS-safe)
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  // Bounding box per città (S, W, N, E)
  const CITY_BBOX = {
    tokyo:      [35.50, 139.55, 35.82, 139.92],
    kyoto:      [34.92, 135.62, 35.12, 135.85],
    osaka:      [34.55, 135.37, 34.75, 135.60],
    nara:       [34.62, 135.76, 34.72, 135.89],
    hiroshima:  [34.33, 132.37, 34.45, 132.52],
    kamakura:   [35.27, 139.52, 35.35, 139.58],
    nikko:      [36.72, 139.58, 36.78, 139.63],
    yokohama:   [35.38, 139.59, 35.49, 139.69],
    hakone:     [35.18, 138.97, 35.28, 139.08],
    takayama:   [36.12, 137.23, 36.18, 137.30],
  };

  // Categorie da scaricare via Overpass
  const OVERPASS_CATEGORIES = {
    temple:        'tourism=attraction][historic=temple',
    shrine:        'amenity=place_of_worship][religion=shinto',
    museum:        'tourism=museum',
    restaurant:    'amenity=restaurant',
    market:        'amenity=marketplace][shop=supermarket',
    viewpoint:     'tourism=viewpoint',
    nature:        'natural=peak][tourism=attraction',
    shopping:      'shop=mall][shop=department_store',
    accommodation: 'tourism=hotel][tourism=hostel',
  };

  // Mappa category Overpass → cat interna app
  const CAT_MAP = {
    'tourism=attraction': 'temple',
    'amenity=place_of_worship': 'shrine',
    'tourism=museum': 'museum',
    'amenity=restaurant': 'food',
    'amenity=marketplace': 'market',
    'shop=supermarket': 'market',
    'tourism=viewpoint': 'viewpoint',
    'natural=peak': 'nature',
    'tourism=attraction': 'nature',
    'shop=mall': 'shopping',
    'shop=department_store': 'shopping',
    'tourism=hotel': 'accommodation',
    'tourism=hostel': 'accommodation',
  };

  // =========================================================================
  // IndexedDB helpers
  // =========================================================================

  let _db = null;

  async function _openDB() {
    if (_db) return _db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('city', 'city', { unique: false });
          store.createIndex('cat',  'cat',  { unique: false });
        }
        // Meta store per TTL
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = () => reject(req.error);
    });
  }

  async function _dbGet(store, key) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function _dbPut(store, value) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(value);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function _dbGetByCity(city) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const idx   = tx.objectStore(STORE_NAME).index('city');
      const req   = idx.getAll(city);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  }

  async function _dbPutMany(pois) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      pois.forEach(p => store.put(p));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  async function _isCacheValid(city) {
    const meta = await _dbGet('meta', `ttl_${city}`);
    if (!meta) return false;
    return (Date.now() - meta.ts) < CACHE_TTL;
  }

  async function _setTTL(city) {
    await _dbPut('meta', { key: `ttl_${city}`, ts: Date.now() });
  }

  // =========================================================================
  // Overpass query builder
  // =========================================================================

  function _buildQuery(city) {
    const [s, w, n, e] = CITY_BBOX[city];
    const bbox = `${s},${w},${n},${e}`;

    const parts = [
      `[out:json][timeout:25];`,
      `(`,
      // Templi e santuari
      `  node["tourism"="attraction"]["historic"="temple"](${bbox});`,
      `  node["amenity"="place_of_worship"]["religion"="shinto"](${bbox});`,
      `  node["amenity"="place_of_worship"]["religion"="buddhist"](${bbox});`,
      // Cultura
      `  node["tourism"="museum"](${bbox});`,
      `  node["tourism"="gallery"](${bbox});`,
      `  node["historic"="castle"](${bbox});`,
      // Food
      `  node["amenity"="restaurant"](${bbox});`,
      `  node["amenity"="food_court"](${bbox});`,
      `  node["shop"="supermarket"](${bbox});`,
      `  node["amenity"="marketplace"](${bbox});`,
      // Natura e viewpoint
      `  node["tourism"="viewpoint"](${bbox});`,
      `  node["natural"="peak"]["name"](${bbox});`,
      `  node["leisure"="park"]["name"](${bbox});`,
      // Shopping
      `  node["shop"="mall"](${bbox});`,
      `  node["shop"="department_store"](${bbox});`,
      `  node["shop"="market"](${bbox});`,
      // Alloggio
      `  node["tourism"="hotel"]["name"](${bbox});`,
      `  node["tourism"="hostel"]["name"](${bbox});`,
      `);`,
      `out body;`,
    ];
    return parts.join('\n');
  }

  // =========================================================================
  // Parsing Overpass → POI interno
  // =========================================================================

  function _parseTags(tags) {
    if (tags.tourism === 'museum' || tags.tourism === 'gallery') return 'museum';
    if (tags.historic === 'temple' || (tags.amenity === 'place_of_worship' && tags.religion === 'buddhist')) return 'temple';
    if (tags.amenity === 'place_of_worship' && tags.religion === 'shinto') return 'shrine';
    if (tags.historic === 'castle') return 'castle';
    if (tags.tourism === 'viewpoint') return 'viewpoint';
    if (tags.natural === 'peak' || (tags.leisure === 'park')) return 'nature';
    if (tags.amenity === 'restaurant' || tags.amenity === 'food_court') return 'food';
    if (tags.shop === 'supermarket' || tags.amenity === 'marketplace' || tags.shop === 'market') return 'market';
    if (tags.shop === 'mall' || tags.shop === 'department_store') return 'shopping';
    if (tags.tourism === 'hotel' || tags.tourism === 'hostel') return 'accommodation';
    return 'other';
  }

  function _parseElements(elements, city) {
    return elements
      .filter(el => el.type === 'node' && el.lat && el.lon && el.tags?.name)
      .map(el => {
        const tags = el.tags || {};
        return {
          id:   `osm_${el.id}`,
          name: tags.name || tags['name:en'] || 'Unnamed',
          jp:   tags['name:ja'] || null,
          city,
          cat:  _parseTags(tags),
          lat:  el.lat,
          lng:  el.lon,
          desc: tags.description || tags['description:en'] || '',
          source: 'overpass',
          // Gluten-free: non disponibile da Overpass, default none
          gf: tags.diet_glutenfree === 'yes'
            ? { lvl: 'full', notes: 'Opzioni GF disponibili (OSM)' }
            : { lvl: 'none', notes: '' },
          website: tags.website || tags['contact:website'] || null,
        };
      })
      .filter(p => p.cat !== 'other');
  }

  // =========================================================================
  // Load city (Overpass → IndexedDB → in-memory)
  // =========================================================================

  const _loading = {}; // prevent duplicate concurrent loads

  async function loadCity(city) {
    if (!CITY_BBOX[city]) {
      console.warn(`[POILoader] City '${city}' not configured`);
      return [];
    }

    // Cache fresca in IndexedDB?
    if (await _isCacheValid(city)) {
      const cached = await _dbGetByCity(city);
      if (cached.length > 0) {
        console.log(`[POILoader] ✓ Cache hit: ${city} (${cached.length} POI)`);
        return cached;
      }
    }

    // Prevent parallel loads per stessa città
    if (_loading[city]) return _loading[city];

    _loading[city] = (async () => {
      console.log(`[POILoader] Fetching ${city} from Overpass...`);
      try {
        const query = _buildQuery(city);
        const resp  = await fetch(OVERPASS_URL, {
          method: 'POST',
          body:   `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();
        const pois = _parseElements(data.elements || [], city);

        if (pois.length > 0) {
          await _dbPutMany(pois);
          await _setTTL(city);
          console.log(`[POILoader] ✓ Loaded ${pois.length} POI for ${city} (Overpass)`);
        }

        return pois;
      } catch (err) {
        console.warn(`[POILoader] Overpass failed for ${city}: ${err.message} — using cache`);
        return await _dbGetByCity(city); // fallback cache (anche scaduta)
      } finally {
        delete _loading[city];
      }
    })();

    return _loading[city];
  }

  // =========================================================================
  // Preload più città in parallelo (max 3 concurrent per non stressare Overpass)
  // =========================================================================

  async function preloadCities(cities = []) {
    const batches = [];
    for (let i = 0; i < cities.length; i += 3) {
      batches.push(cities.slice(i, i + 3));
    }

    let total = 0;
    for (const batch of batches) {
      const results = await Promise.all(batch.map(c => loadCity(c)));
      total += results.flat().length;
      // Piccola pausa tra batch per rispettare rate limit Overpass
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    console.log(`[POILoader] Preload complete: ${total} POI totali`);
    return total;
  }

  // =========================================================================
  // Get all cached POI (per merge con POIS_BASE in allPOIs())
  // =========================================================================

  async function getAllCached() {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  }

  // Stato cache per debug
  async function getCacheStatus() {
    const db = await _openDB();
    const meta = await new Promise(resolve => {
      const tx  = db.transaction('meta', 'readonly');
      const req = tx.objectStore('meta').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => resolve([]);
    });
    return meta.map(m => ({
      city: m.key.replace('ttl_', ''),
      age:  Math.round((Date.now() - m.ts) / 3600_000) + 'h',
      valid: (Date.now() - m.ts) < CACHE_TTL,
    }));
  }

  return {
    loadCity,
    preloadCities,
    getAllCached,
    getCacheStatus,
    SUPPORTED_CITIES: Object.keys(CITY_BBOX),
  };
})();

console.log('[POILoader] Loaded ✓ — cities:', window.poiLoader.SUPPORTED_CITIES.join(', '));
