# 🔍 Giappone 2027 — Analisi e Soluzioni dei 5 Problemi

## 📋 Sommario Esecutivo

Ho letto TUTTO il codice della cartella (`index.html`, `y2k-override.css`, `google-places-cache.js`, ecc.). Ecco i **5 problemi identificati e le soluzioni specifiche e attuabili**.

---

## ❌ PROBLEMA 1: Collapse non funziona

### Causa Root
Il collapse è implementato CORRETTAMENTE nel CSS (`.category-items.collapsed { display: none !important; }`), ma il bug è nel **flow logico del JavaScript**:

**File:** `index.html`, riga 3031-3034
```javascript
const isOpen = !items.classList.contains('collapsed');  // Legge PRIMA del toggle
items.classList.toggle('collapsed');                     // Toggl
toggle.textContent = isOpen ? '▶' : '▼';               // Usa il valore PRIMA del toggle
```

**Problema:** Se clicchi su una categoria aperta, `isOpen` è TRUE (perché inizialmente NON ha `collapsed`). Dopo il `toggle`, aggiunge `collapsed`, ma il testo usa il valore PRE-toggle, rendendo la freccia incorretta.

### ✅ Soluzione
Inverti l'ordine: leggi `isOpen` DOPO il toggle, oppure cambia la logica:

**Nel renderListView (riga 3025-3035), sostituisci:**
```javascript
// ATTUALMENTE (BUGGY):
resultsDiv.querySelectorAll('.category-header').forEach(header => {
  header.onclick = (e) => {
    const section = header.closest('.category-section');
    const items = section.querySelector('.category-items');
    const toggle = header.querySelector('.category-toggle');
    const isOpen = !items.classList.contains('collapsed');  // ❌ LEGGE PRIMA
    items.classList.toggle('collapsed');
    toggle.textContent = isOpen ? '▶' : '▼';
  };
});
```

**CON QUESTA VERSIONE CORRETTA:**
```javascript
resultsDiv.querySelectorAll('.category-header').forEach(header => {
  header.onclick = (e) => {
    e.preventDefault();  // Evita scroll accidentali
    const section = header.closest('.category-section');
    const items = section.querySelector('.category-items');
    const toggle = header.querySelector('.category-toggle');
    
    // Inverti: leggi DOPO il toggle
    items.classList.toggle('collapsed');
    const isNowClosed = items.classList.contains('collapsed');
    toggle.textContent = isNowClosed ? '▶' : '▼';
  };
});
```

---

## ❌ PROBLEMA 2: POI Duplicati (3-4 volte)

### Causa Root
`getAllCached()` ritorna i POI da **TUTTE** le cache entries salvate. Se hai fatto ricerche GPS da locazioni diverse (ad es. Tokyo → Osaka → Tokyo), gli **stessi POI fisici apppaiono in caches separate**:

**Scenario:**
1. Ricerca GPS a Tokyo (lat 35.68, lng 139.76, radius 5km) → cache 462 POI
2. Ricerca GPS a Osaka (lat 34.68, lng 135.50, radius 5km) → cache 240 POI
3. Ricerca GPS di nuovo a Tokyo → cache hit, ma **getAllCached() RITORNA 462+240=702 POI**

Quando filtri per `searchCity.includes("tokyo")`, i 462 POI di Tokyo appaiono tutte volte, generando duplicati.

**File:** `index.html`, riga 2943-2946:
```javascript
window.GooglePlacesCache.getAllCached().then(allPois => {
  const searchResults = allPois.filter(p => {
    const searchCity = (p.searchCity || '').toLowerCase();
    return searchCity.includes(query);  // Nessuna deduplicazione
  });
  // ...
});
```

### ✅ Soluzione
Deduplicare per `googlePlaceId` (il vero ID univoco di Google Places):

**Sostituisci riga 2943-2947 con:**
```javascript
window.GooglePlacesCache.getAllCached().then(allPois => {
  // Deduplicare per googlePlaceId (ID univoco di Google Places)
  const seenIds = new Set();
  const dedupedPois = [];
  
  allPois.forEach(p => {
    const id = p.googlePlaceId || p.id; // Fallback a p.id se necessario
    if (!seenIds.has(id)) {
      seenIds.add(id);
      dedupedPois.push(p);
    }
  });

  // Ora filtra PER CITTÀ
  const searchResults = dedupedPois.filter(p => {
    const searchCity = (p.searchCity || '').toLowerCase();
    return searchCity.includes(query);
  });

  console.log(`[renderListView] Deduplicati: ${allPois.length} → ${dedupedPois.length}. Filtrati per città: ${searchResults.length}`);
  // ... resto del codice
});
```

---

## ❌ PROBLEMA 3: Foto a SINISTRA (dovrebbe essere a DESTRA)

### Causa Root
Nel rendering HTML (riga 2997-3006), l'immagine viene insertata DOPO il `.body`:

```html
<div class="poi-row" data-id="${p.id}">
  <div class="icon">📍</div>
  <div class="body">
    <div class="name">${getPoiDisplayName(p)}</div>
    <div class="sub">...</div>
  </div>
  ${photoUrl ? `<img src="${photoUrl}" ...>` : ''}  <!-- ❌ DOPO body, quindi a destra nel flex -->
  <button class="btn">+ Aggiungi</button>
</div>
```

Il CSS `.poi-row` usa `display: flex` (riga 316), quindi l'ordine nel DOM determina l'ordine visuale. L'immagine è l'ULTIMO child, quindi appare a DESTRA.

**Problema:** Il design Y2K vuole la foto a destra, ma l'ordine semantico dovrebbe avere:
1. Icon (sinistra)
2. Body / Name (centro)
3. Photo (destra, ma prima del button)
4. Button (estrema destra)

Attualmente è:
1. Icon → 2. Body → 3. Button → 4. Photo (sbagliato!)

### ✅ Soluzione
Cambia l'ordine nel rendering riga 2997-3006. **Metti la foto DOPO il body ma PRIMA del button:**

```javascript
const photoUrl = p.photos && p.photos.length > 0
  ? `/api/placePhoto?reference=${encodeURIComponent(p.photos[0].reference)}&maxwidth=150`
  : '';

return `
  <div class="poi-row" data-id="${p.id}">
    <div class="icon">${CATS[p.cat]?.icon || '📍'}</div>
    <div class="body">
      <div class="name">${getPoiDisplayName(p)}</div>
      <div class="sub">${CATS[cat]?.label || cat} · ${distStr}${ratingStr ? ' · ' + ratingStr : ''}${costStr ? ' · ' + costStr : ''}</div>
    </div>
    ${photoUrl ? `<img src="${photoUrl}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer" alt="Foto" title="Clicca per ingrandire" data-photo-url="${photoUrl}">` : ''}
    <button class="btn" style="flex-shrink:0;padding:4px 8px;font-size:11px;background:${isInItin?'var(--warning)':'var(--primary)'};border-color:${isInItin?'var(--warning)':'var(--primary)'};color:#fff;cursor:pointer" data-add-to-itinerary="${p.id}">${isInItin?'✓':'+ Aggiungi'}</button>
  </div>
`;
```

---

## ❌ PROBLEMA 4: Foto non cliccabili / Template string rotto

### Causa Root
Riga 3003 ha un **template string fragile con apici misti**:

```javascript
${photoUrl ? `<img ... onclick="window.openSheet('${getPoiDisplayName(p).replace(/'/g, "\\'")}'...)"` : ''}
```

**Problemi:**
1. Se `getPoiDisplayName(p)` contiene apici anche dopo escape, il template string crolla
2. La sostituzione `/'/g` non copre tutti i casi (backtick, doppi apici, ecc.)
3. Il data binding è fragile

### ✅ Soluzione
Usa **data attributes** e **event listener** anziché inline `onclick`:

**Modifica riga 2987-3006:**
```javascript
const photoUrl = p.photos && p.photos.length > 0
  ? `/api/placePhoto?reference=${encodeURIComponent(p.photos[0].reference)}&maxwidth=150`
  : '';

return `
  <div class="poi-row" data-id="${p.id}">
    <div class="icon">${CATS[p.cat]?.icon || '📍'}</div>
    <div class="body">
      <div class="name">${getPoiDisplayName(p)}</div>
      <div class="sub">${CATS[cat]?.label || cat} · ${distStr}${ratingStr ? ' · ' + ratingStr : ''}${costStr ? ' · ' + costStr : ''}</div>
    </div>
    ${photoUrl ? `<img 
      src="${photoUrl}" 
      style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer" 
      alt="Foto" 
      title="Clicca per ingrandire" 
      class="poi-photo"
      data-poi-name="${getPoiDisplayName(p).replace(/"/g, '&quot;')}"
      data-photo-url="${photoUrl}"
    >` : ''}
    <button class="btn" style="flex-shrink:0;padding:4px 8px;font-size:11px;background:${isInItin?'var(--warning)':'var(--primary)'};border-color:${isInItin?'var(--warning)':'var(--primary)'};color:#fff;cursor:pointer" data-add-to-itinerary="${p.id}">${isInItin?'✓':'+ Aggiungi'}</button>
  </div>
`;
```

**Poi, DOPO che attacchi gli event handler (dopo riga 3072), aggiungi:**

```javascript
// ATTACH PHOTO CLICK HANDLERS (per ogni immagine POI)
resultsDiv.querySelectorAll('.poi-photo').forEach(img => {
  img.onclick = (e) => {
    e.stopPropagation();
    const poiName = img.dataset.poiName;
    const photoUrl = img.dataset.photoUrl;
    const html = `<div style="text-align:center;padding:20px"><img src="${photoUrl}" style="max-width:100%;border-radius:8px;"></div>`;
    window.openSheet(poiName, html);
  };
});
```

---

## ❌ PROBLEMA 5: Header "Tokyo" sovrapposizione / Z-index

### Causa Root
Lo sticky search header (riga 2859) ha `z-index: 200` e `position: sticky; top: 0`, ma il CSS per il `.sheet-inner` non ha un z-index definitivo che controlli il layering. Inoltre, il header della sheet potrebbe avere z-index superiore.

**File:** `index.html`, riga 2858-2859:
```html
<div style="position:sticky;top:0;background:var(--surface) !important;padding:12px 0;margin-bottom:12px;z-index:200;border-bottom:1px solid var(--border)">
```

**File:** `y2k-override.css`, riga 43:
```css
header {
  z-index: 200 !important;  /* Header è 200 */
}
```

**File:** `y2k-override.css`, riga 203-206:
```css
.sheet {
  background: rgba(20,30,80,0.65) !important;
  backdrop-filter: blur(6px) !important;
}
```

Nessun z-index esplicito su `.sheet` o `.sheet-inner`, quindi il default è 0 (basso).

### ✅ Soluzione
Aumenta il z-index dello sticky search header IN RELAZIONE alla sheet:

**Opzione A: Nel CSS (y2k-override.css), aggiungi riga 203 PRIMA di `.sheet`:**
```css
/* ── Search sticky header (dentro sheet) ────────────────────── */
.sheet-inner [style*="sticky"] {
  z-index: 300 !important;  /* Sopra tutto dentro la sheet */
  position: sticky !important;
  top: 0 !important;
}

/* ── SHEET ─────────────────────────────────────────────────── */
.sheet {
  z-index: 50 !important;  /* Sopra la mappa (che è z: 1) */
  background: rgba(20,30,80,0.65) !important;
  backdrop-filter: blur(6px) !important;
}
.sheet-inner {
  z-index: 51 !important;  /* Sopra .sheet */
  /* ... resto del CSS ... */
}
```

**Opzione B: Nel rendering HTML (riga 2858), cambia lo z-index inline:**
```html
<div style="position:sticky;top:0;background:var(--surface) !important;padding:12px 0;margin-bottom:12px;z-index:2000;border-bottom:1px solid var(--border)">
```

Usa `z-index: 2000` per garantire che il search header staon TOP.

---

## 🛠️ Piano di Implementazione (Ordine di Priorità)

1. **PROBLEMA 2 (Duplicati)** ← INIZIA QUI — è il più visibile e fastidioso
   - Aggiungi deduplicazione nella callback di `getAllCached()`
   - Test: cerca "Tokyo" e conta i POI unici

2. **PROBLEMA 1 (Collapse)** ← CRITICO per UX
   - Inverti il flow logico per leggere `isOpen` dopo il toggle
   - Test: clicca su ogni category header, verifica che la freccia alterna

3. **PROBLEMA 3 (Foto layout)** ← VISIVO
   - Sposta `<img>` prima del `<button>` nel rendering
   - Test: apri la lista e verifica che le foto sono a destra

4. **PROBLEMA 4 (Foto onclick)** ← FUNZIONALITÀ
   - Cambia da inline `onclick` a `.poi-photo` class + data attributes
   - Aggiungi event listener al querySelectorAll
   - Test: clicca su una foto, verifica che apre la sheet

5. **PROBLEMA 5 (Z-index)** ← FINE-TUNING
   - Aggiungi z-index CSS per lo sticky header
   - Test: scorri la lista e verifica che il search header rimane sopra

---

## 📊 Stima di Lavoro

- **Problema 2 (Duplicati)**: 5 minuti — 10 righe di codice
- **Problema 1 (Collapse)**: 3 minuti — 3 righe di codice
- **Problema 3 (Layout foto)**: 2 minuti — reorder HTML
- **Problema 4 (Foto onclick)**: 10 minuti — 20 righe di codice
- **Problema 5 (Z-index)**: 2 minuti — 3 righe CSS

**TOTALE: ~22 minuti di lavoro**

---

## 🎯 Risultato Atteso

Dopo l'implementazione:
- ✅ Collapse accordion funziona (freccia alterna correttamente)
- ✅ Zero duplicati nella lista (deduplicati per `googlePlaceId`)
- ✅ Foto a DESTRA del body
- ✅ Click su foto apre enlargement senza errori template string
- ✅ Search header resta sticky sopra la lista mentre scorre

---

## 📝 Note Tecniche Aggiuntive

### googlePlaceId vs id
- Google Places API ritorna `place_id` (univoco globalmente)
- Nel cache viene salvato come `googlePlaceId` (riga 59 di google-places-cache.js)
- Questo è il valore CORRETTO per deduplicare

### searchCity field
- Viene aggiunto in `google-places-loader.js` → `getZoneFromCoordinates()`
- Assegna il nome della zona geografica (Tokyo, Osaka, ecc.)
- È CASE SENSITIVE a livello di storage ma il filtro usa `.toLowerCase()`

### CSS specificity
- `.category-items.collapsed { display: none !important; }` è CORRETTO
- Le `!important` successive nella cascade NON vengono override da quelle precedenti
- L'ordine nel CSS file non ha importanza quando entrambe hanno `!important`
- La specificità di `.category-items.collapsed` (classe + classe) è più alta di `.category-items` (1 classe)

---

Pronto a procedere? Fammi sapere se vuoi che implemento tutte le 5 soluzioni subito!
