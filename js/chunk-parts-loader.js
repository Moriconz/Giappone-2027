/**
 * chunk-parts-loader.js
 * Carica chunk POI da jsDelivr CDN (CORS-safe)
 * 
 * Uso:
 *   const pois = await window.chunkPartsLoader.loadChunksForCities(['tokyo', 'kyoto']);
 */

window.chunkPartsLoader = (() => {
  // ✅ jsDelivr CDN - accede direttamente al branch main di GitHub (CORS OK)
  const ZIP_BASE_URL = 'https://cdn.jsdelivr.net/gh/Moriconz/Giappone-2027@main/chunk-zips/';
  
  // Mapping città → file zip (contengono GeoJSON)
  const CITY_CHUNKS = {
    tokyo: 'tokyo.zip',
    osaka: 'osaka.zip',
    kyoto: 'kyoto.zip',
    yokohama: 'yokohama.zip',
    kamakura: 'kamakura.zip',
    nara: 'nara.zip',
    hiroshima: 'hiroshima.zip'
  };
  
  /**
   * Scarica e decomprime chunk ZIP
   */
  async function loadChunkForCity(city) {
    if (!CITY_CHUNKS[city]) {
      console.warn(`[ChunkLoader] City ${city} not found`);
      return [];
    }
    
    const url = ZIP_BASE_URL + CITY_CHUNKS[city];
    console.log(`[ChunkLoader] Loading ${city} from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Decomprimi ZIP usando JSZip (già caricato in index.html)
      const buffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      
      // Cerca file GeoJSON dentro lo zip
      let geojson = null;
      for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.endsWith('.geojson') || filename.endsWith('.json')) {
          const content = await file.async('text');
          geojson = JSON.parse(content);
          console.log(`[ChunkLoader] Found ${filename} in ${city}.zip`);
          break;
        }
      }
      
      if (!geojson) {
        console.warn(`[ChunkLoader] No GeoJSON found in ${city}.zip`);
        return [];
      }
      
      // Estrai features
      const pois = (geojson.features || []).map(f => ({
        id: f.id || Math.random().toString(36).substr(2, 9),
        name: f.properties?.name || 'Unknown',
        lat: f.geometry?.coordinates?.[1] || 0,
        lng: f.geometry?.coordinates?.[0] || 0,
        category: f.properties?.category || 'other',
        description: f.properties?.description || '',
        source: 'chunk',
        city: city
      }));
      
      console.log(`[ChunkLoader] ✅ Loaded ${pois.length} POIs from ${city}`);
      return pois;
      
    } catch (error) {
      console.error(`[ChunkLoader] ❌ Error loading ${city}:`, error);
      return [];
    }
  }
  
  /**
   * Carica chunk per più città in parallelo
   */
  async function loadChunksForCities(cities) {
    if (!Array.isArray(cities) || cities.length === 0) {
      console.log('[ChunkLoader] No cities to load');
      return [];
    }
    
    console.log(`[ChunkLoader] Loading ${cities.length} cities in parallel: ${cities.join(', ')}`);
    
    const promises = cities.map(city => loadChunkForCity(city));
    const results = await Promise.all(promises);
    
    const allPois = results.flat();
    console.log(`[ChunkLoader] ✅ Total POIs loaded: ${allPois.length}`);
    return allPois;
  }
  
  return {
    loadChunksForCities: loadChunksForCities,
    loadChunkForCity: loadChunkForCity,
    getStatus: () => ({ 
      url: ZIP_BASE_URL, 
      method: 'jsDelivr CDN (CORS-safe)',
      format: 'ZIP with GeoJSON'
    })
  };
})();

// Log di debug
console.log('[ChunkLoader] Initialized - Status:', window.chunkPartsLoader.getStatus());

