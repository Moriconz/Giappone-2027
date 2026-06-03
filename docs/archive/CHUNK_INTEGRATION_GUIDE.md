# 📦 Integrazione Chunk Parts Loader in index.html

## Step 1: Aggiungi JSZip nel `<head>`

Aggiungi questa riga nel `<head>` di `index.html` (prima di `</head>`):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="./js/chunk-parts-loader.js"></script>
```

Posizionalo **dopo gli altri script** (state, features, ui-helpers).

---

## Step 2: Sostituisci la funzione `loadChunksForVisibleRegion()`

Trova questa funzione in `index.html` (cerca: `loadChunksForVisibleRegion`) e sostituiscila con:

```javascript
async function loadChunksForVisibleRegion() {
  if (!window.chunkPartsLoader) {
    console.warn('[Chunk] chunkPartsLoader not loaded');
    return;
  }
  
  const zoom = map.getView().getZoom() || 5;
  const extent = map.getView().calculateExtent(map.getSize());
  const [minX, minY, maxX, maxY] = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
  
  // Determina quali città sono visibili nella mappa
  const visibleCities = [];
  const cityBounds = {
    tokyo: { n: 35.95, s: 35.45, e: 140.20, w: 139.20 },
    osaka: { n: 34.80, s: 34.50, e: 135.70, w: 135.30 },
    kyoto: { n: 35.15, s: 35.00, e: 135.95, w: 135.65 },
    yokohama: { n: 35.55, s: 35.25, e: 139.85, w: 139.50 },
    kamakura: { n: 35.35, s: 35.20, e: 139.60, w: 139.45 },
    nara: { n: 34.70, s: 34.55, e: 135.85, w: 135.65 },
    hiroshima: { n: 34.42, s: 34.32, e: 132.50, w: 132.30 }
  };
  
  // Controlla intersezione bounds mappa con bounds città
  for (const [city, bounds] of Object.entries(cityBounds)) {
    // Se bounds mappa interseca bounds città
    if (maxX >= bounds.w && minX <= bounds.e && maxY >= bounds.s && minY <= bounds.n) {
      visibleCities.push(city);
    }
  }
  
  if (visibleCities.length === 0) {
    console.log('[Chunk] No visible cities');
    return;
  }
  
  console.log(`[Chunk] Loading for cities: ${visibleCities.join(', ')}`);
  
  try {
    // Carica chunk per città visibili
    const newPois = await window.chunkPartsLoader.loadChunksForCities(visibleCities);
    
    if (newPois && newPois.length > 0) {
      // Aggiungi ai POI esistenti (deduplica per source)
      const existingChunk = (POIS || POIS_BASE || []).filter(p => p.source === 'chunk');
      POIS = (POIS_BASE || []).concat(existingChunk, newPois);
      
      // Rirenderizza marker
      renderMarkers();
      console.log(`[Chunk] Added ${newPois.length} new POIs, total: ${POIS.length}`);
    }
  } catch (error) {
    console.error('[Chunk] Load error:', error);
  }
}
```

---

## Step 3: Trigger il caricamento al pan/zoom

Trova il codice che richiama `loadChunksForVisibleRegion()` (cerca la riga dove è chiamata).

Dovrebbe essere nella sezione di debouncing del map pan/zoom. Assicurati che sia chiamata:

```javascript
// Dopo moveend della mappa
map.on('moveend', () => {
  debouncedRender();
  loadChunksForVisibleRegion(); // ← Aggiungi questa riga
});
```

---

## Step 4: Test

1. **Apri index.html in browser**
2. **F12 → Console**
3. Dovresti vedere:
   ```
   [ChunkLoader] Downloading tokyo (11 parts)...
   → tokyo-aa.zip... ✅
   → tokyo-ab.zip... ✅
   ...
   [ChunkLoader] Extracted 1250 POIs from tokyo
   ```

4. **Zoom/pan su città diversa** → carica automaticamente i chunk

---

## Step 5: Debug Commands

Nel browser console:

```javascript
// Vedi status
window.chunkPartsLoader.getStatus()
// Output: { loaded: ['tokyo'], loading: [] }

// Carica manualmente una città
await window.chunkPartsLoader.loadChunksForCity('kyoto')

// Pulisci cache
window.chunkPartsLoader.clearCache('tokyo')

// Vedi POI caricati
window.POIS.filter(p => p.source === 'chunk').length
```

---

## Vantaggi

✅ **Lazy-load**: Carica solo città visibili  
✅ **Concatenazione**: Scarica 11 parti, le concatena, decomprime 1 zip  
✅ **Cache**: localStorage persiste tra sessioni  
✅ **Deduplicazione**: Evita duplicati se ricarichi  
✅ **Error handling**: Se 1 parte fallisce, continua  

---

## Possibili Problemi

### Errore: "JSZip is not defined"
→ Aggiungi `<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>` **prima** di chunk-parts-loader.js

### Errore: "404 Not Found" su download
→ Verifica che il link GitHub Releases sia corretto:
```javascript
https://github.com/Moriconz/Giappone-2027/releases/download/chunks-v1/tokyo-aa.zip
```

### Download lento
→ Normale, GitHub Releases ~1-2 Mbps. Tokyo (11 parti × 20MB) = ~2-3 min

### localStorage pieno
→ Browser limita ~5-10MB per entry. Se > 5MB, skip localStorage cache

---

**Pronto? Fai i 5 step e dimmi se funziona!** 🚀
