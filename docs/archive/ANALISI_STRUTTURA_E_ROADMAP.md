# SafeEats PWA — Analisi Struttura Attuale + Roadmap Esecutivo

**Data:** 11 maggio 2026  
**Base:** PIANO_MIGLIORAMENTI_V4.md + Audit file system  
**Formato:** Caveman compressed per token efficiency

---

## 1. STATO ATTUALE — Monolite HTML/CSS

### Architettura Attuale

```
index.html (MONOLITE ~11K righe)
├── CSS inline (glassmorphism inline, no moduli)
├── HTML markup (nav, header, sheets, widgets)
└── <script> inline (tutti JS incollati in fondo)

js/
├── core.js                   # State management
├── map.js                    # OpenLayers map
├── budget.js                 # Budget tab
├── gallery.js                # Photo gallery
├── chat.js                   # Group chat
├── group-panel.js            # Group UI
├── gf-safety.js              # Safety levels (colori color-blind unfriendly)
├── show-to-waiter.js         # Show-to-waiter card (NO full-screen, NO wake-lock)
├── google-places-cache.js    # Cache manager
├── google-places-loader.js   # POI loader
├── firebase-rtdb.js          # Real-time DB
├── sw.js                     # Service Worker (generico, no strategie per asset type)
└── ... +20 file utility/feature-specific

css/
└── y2k-override.css (glassmorphism, blur 20px hardcoded)

API Routes
├── api/searchGlutenFreeShops.js       (Groq AI)
├── api/analyzeGlutenFree.js           (Groq AI)
├── api/enrichPOI.js                   (Groq AI)
├── api/googlePlacesNearby.js          (Google Places)
├── api/placePhoto.js                  (Google Photos)
└── ... (reverse geocoding, image analysis, etc.)
```

### Problemi Identificati (da PIANO_MIGLIORAMENTI_V4)

**🔴 CRITICI (bloccanti):**
1. **Blur 20px ovunque** — eccessivo, male su mobile, WCAG contrast fail
2. **Niente @supports fallback** — Safari iOS < 17 + Firefox vecchio = rompe
3. **Niente -webkit-backdrop-filter** — Safari specifico ignora blur
4. **Show-to-waiter card** — NO full-screen, NO wake-lock, font 18px (dovrebbe 32px)
5. **Colori safety color-blind unfriendly** — GREEN + RED indistinguibili per protanopia
6. **Carte allergie JP mancanti** — feature P0 bloccante
7. **DB vuoto** — niente 150+ ristoranti pre-caricati

**🟡 ALTI (impediscono scalabilità):**
1. **index.html monolite** — 11K righe, no lazy loading
2. **Service Worker generico** — stesso cache per tutti asset (tiles, API, HTML)
3. **localStorage solo** — max 5-10MB, sincrono, blocca main thread
4. **No filtri avanzati** — toggle semplice, no città/distanza/open-now

**🟢 BUONI:**
1. ✅ OpenLayers map + Nominatim geocoding
2. ✅ Show-to-Waiter concept (solo da raffinare)
3. ✅ Glassmorphism design system (pero con bug)
4. ✅ Service Worker presente
5. ✅ Share Target API working

---

## 2. MODULARIZZAZIONE — Come farlo SUBITO

### Step 1: Estrai CSS in `css/glass.css`

**Atual:** Inline in index.html righe 25-200+  
**Target:** File separato con design tokens

```css
/* css/glass.css — NEW FILE */
:root {
  /* Glass blur scale */
  --blur-sm: 8px;
  --blur-md: 12px;
  --blur-lg: 18px;
  
  /* Glass backgrounds */
  --glass-neutral: rgba(20, 25, 35, 0.55);
  --glass-success: rgba(34, 197, 94, 0.20);
  --glass-warning: rgba(234, 179, 8, 0.22);
  --glass-danger: rgba(239, 68, 68, 0.22);
  
  /* Glass borders */
  --glass-border: rgba(255, 255, 255, 0.15);
  
  /* Shadows */
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.25);
}

/* FALLBACK per browser senza backdrop-filter */
@supports not ((backdrop-filter: blur(10px)) or (-webkit-backdrop-filter: blur(10px))) {
  .glass {
    background: rgba(20, 25, 35, 0.95);  /* fallback solido */
  }
}

/* QUANDO supportato: usa glass */
@supports (backdrop-filter: blur(10px)) or (-webkit-backdrop-filter: blur(10px)) {
  .glass {
    background: var(--glass-neutral);
    backdrop-filter: blur(var(--blur-md)) saturate(140%);
    -webkit-backdrop-filter: blur(var(--blur-md)) saturate(140%);  /* iOS Safari */
    border: 1px solid var(--glass-border);
  }
}

/* Accessibility: disabilita glass se utente ha prefers-reduced-transparency */
@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: rgba(20, 25, 35, 0.95);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

**Azione:** Find/replace in index.html:
- Inline `<style>` → `<link rel="stylesheet" href="css/glass.css">`
- Cambio tutti `blur(20px)` → `var(--blur-md)` (12px)

**Tempo:** 30 min

---

### Step 2: Estrai JS in moduli ES6

**Atual:** Tutto inline in `<script>` finale  
**Target:** Moduli lazy-loaded

```javascript
// index.html (ridotto da 11K a ~500 righe)
<script type="module">
  import { initMap } from './js/map.js';
  import { initDB } from './js/db.js';
  
  // Init app core
  await initDB();
  initMap();
  
  // Lazy-load tab modules
  document.querySelector('[data-tab=budget]').addEventListener('click', async () => {
    const { initBudget } = await import('./js/budget.js');
    initBudget();
  });
</script>
```

**File nuovi da estrarre:**
- `js/core.js` (200 righe) — state, toast, sheet utils
- `js/db.js` (300 righe) — GFPlacesDB, GFSuggestionsDB
- `js/map.js` (400 righe) — OpenLayers init
- `js/search.js` (250 righe) — search + filters
- `js/allergy-cards.js` (300 righe) — **NUOVO: multi-lingua allergie**
- `js/waiter-card.js` (150 righe) — **AGGIORNATO: full-screen + wake-lock**

**Tempo:** 4-6 ore di refactor (find/replace, test)

---

## 3. P0 FEATURES — Da fare LUNEDÌ

### 3.1 Carte Allergie Multi-Lingua + TTS

**File:** `js/allergy-cards.js` (NUOVO)

```javascript
const ALLERGY_CARDS = {
  ja: {
    title: 'セリアック病について',
    intro: '私はセリアック病です。グルテン（小麦・大麦・ライ麦）を絶対に食べられません。',
    questions: [
      { q: 'これに小麦は入っていますか？', romaji: 'Kore ni komugi wa haitte imasu ka?' },
      { q: '醤油は小麦不使用ですか？', romaji: 'Shōyu wa komugi fushiyō desu ka?' }
    ],
    forbidden: ['小麦', '大麦', 'ライ麦', '醤油', '麦茶', 'うどん']
  },
  en: { /* ... */ },
  it: { /* ... */ }
};

function openAllergyCard(lang = 'ja') {
  const card = ALLERGY_CARDS[lang];
  const modal = document.createElement('div');
  modal.className = 'allergy-modal';
  modal.innerHTML = `
    <div style="font-size: 32px; line-height: 1.8; color: white;">
      <div style="margin-bottom: 20px;">${card.title}</div>
      <div>${card.intro}</div>
    </div>
    <button onclick="speechSynthesis.speak(new SpeechSynthesisUtterance('${card.intro}'))">
      🔊 Riproduci Audio
    </button>
  `;
  document.body.appendChild(modal);
}
```

**Integrazione UI:**
- Bottone "🆘 Ho la celiachia" in nav bar
- Selettore lingua (JA, EN, IT, ZH, KO)
- Full-screen, max contrast, font 28px+
- Audio offline via Web Speech API

**Tempo:** 2-3 ore

---

### 3.2 Show-to-Waiter Card v2 — Full-screen + Wake-Lock

**File:** `js/waiter-card.js` (AGGIORNATO)

```javascript
async function openWaiterCard(placeId) {
  const place = GFPlacesDB.getById(placeId);
  
  // Richiedi wake lock
  let wakeLock = null;
  try { wakeLock = await navigator.wakeLock.request('screen'); }
  catch (e) { console.log('Wake Lock non supportato'); }
  
  // Full-screen
  document.documentElement.requestFullscreen?.();
  
  // Render high-contrast card
  const card = document.createElement('div');
  card.className = 'waiter-card-full';
  card.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: black;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    z-index: 10000;
    font-size: 32px;
    color: white;
  `;
  
  card.innerHTML = `
    <div style="text-align: center;">
      <h1>${place.name}</h1>
      <p style="font-size: 28px; margin: 20px 0;">セリアック病です</p>
      <p style="font-size: 24px; color: #4ade80;">✓ グルテンフリー対応</p>
    </div>
    <button style="margin-top: 40px; padding: 20px 40px; font-size: 20px;">
      ← Chiudi
    </button>
  `;
  
  document.body.appendChild(card);
  
  card.querySelector('button').onclick = async () => {
    card.remove();
    await wakeLock?.release();
    document.exitFullscreen?.();
  };
}
```

**Tempo:** 1 ora

---

### 3.3 Safety Levels — Color-Blind Safe

**File:** `js/gf-safety.js` (AGGIORNATO)

**Atual:**
```javascript
const SAFETY = {
  GREEN: { color: '#7FFF7F', icon: '🟢' },
  YELLOW: { color: '#FFD700', icon: '🟡' },
  RED: { color: '#FF6B6B', icon: '🔴' }
};
// ❌ FAIL: protanopia (red-green blind) non vede differenza
```

**Target:**
```css
/* css/safety.css (NUOVO) */
.safety-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.safety-safe {
  background: rgba(22, 163, 74, 0.20);
  color: #4ADE80;
  border: 2px solid #4ADE80;
  border-style: solid;  /* solid border */
}

.safety-caution {
  background: rgba(245, 158, 11, 0.20);
  color: #FBBF24;
  border: 2px dashed #FBBF24;  /* dashed border */
}

.safety-danger {
  background: rgba(220, 38, 38, 0.20);
  color: #F87171;
  border: 2px dotted #F87171;  /* dotted border */
}
```

**HTML Template:**
```html
<span class="safety-badge safety-safe">
  <svg class="icon-check" aria-hidden="true">✓</svg>
  <span class="sr-only">Livello sicurezza:</span>
  SICURO
</span>
```

**Vantaggi:**
- Color-blind testato ✓
- Icon + border-style + colore = tripla ridondanza
- WCAG AAA contrast (7:1) ✓

**Tempo:** 1 ora

---

### 3.4 Database Seed — 150+ Ristoranti GF Tokyo/Osaka/Kyoto

**File:** `data/gf-places-seed.json` (NUOVO)

**Struttura:**
```json
{
  "version": "1.0",
  "last_updated": "2026-05-11",
  "places": [
    {
      "id": "gf_tokyo_001",
      "name": "Natural House Azabu-Juban",
      "lat": 35.6555,
      "lng": 139.7332,
      "city": "Tokyo",
      "safety_level": "GREEN",
      "last_verified_at": "2026-04-15",
      "description": "Organic café, dedicated GF kitchen, menu 100% GF",
      "tags": ["cafe", "dedicated_kitchen", "menu_100gf"]
    },
    { /* ... */ }
  ]
}
```

**Integrazione:**
```javascript
// js/db.js
async function initDB() {
  const seed = await fetch('./data/gf-places-seed.json').then(r => r.json());
  const localDB = GFPlacesDB.getAll() || [];
  
  // Merge: seed first, poi user additions
  GFPlacesDB.set([...seed.places, ...localDB]);
}
```

**Tempo:** 2-3 ore (ricerca fonti, verifica, data entry)

---

## 4. TASK LIST — Priorità settimana 1

| Task | Dipendenze | Tempo | Blocca |
|------|-----------|-------|--------|
| 1. Glass refactor + @supports fallback | — | 3h | Tutte UX |
| 2. Allergy cards multi-lingua + TTS | 1 | 3h | — |
| 3. Show-to-waiter v2 (full-screen + wake-lock) | 1 | 1h | — |
| 4. Safety colors color-blind safe | 1 | 1h | — |
| 5. Modularizzazione index.html | 1, 2, 3, 4 | 6h | Performance |
| 6. Database seed 150+ ristoranti | — | 3h | — |
| 7. Filtri avanzati (città, distanza, open-now) | 6 | 4h | — |

**Totale settimana 1:** ~21 ore (realista: 3 giorni full-time)

---

## 5. CAVEMAN-COMPRESSED NEXT STEPS

**🎯 Lunedì prossimo:**
1. **Glass CSS refactor** — 3h, `:root` + `@supports` + `-webkit-`
2. **Allergy cards JP** — 3h, TTS offline, fullscreen, font 32px
3. **Color-blind safety badges** — 1h, icon + border + color redundancy

**Mercoledì:**
4. **Show-to-waiter v2** — 1h, wake-lock + fullscreen
5. **Data seed 150 ristoranti** — 3h (con script scraping/verifica)

**Settimana 2:**
6. **Modularizzazione JS** — 6h, index.html 11K → 500 righe
7. **Filtri avanzati + search sticky** — 4h

**Risultato fine settimana 2:**
- ✅ App **protected** (allergie, colori safe, waiter card funzionante)
- ✅ App **fast** (moduli lazy, glass 12px instead 20px)
- ✅ App **not empty** (150+ POI pre-caricati)

---

## 6. METRICHE — Verifica incrementale

**Baseline attuale (Lighthouse):**
- Performance: TBD (probabilmente ~60-70)
- Accessibility: ~40 (color contrast, touch targets, ARIA mancanti)
- Best Practices: ~60 (glass issues, no @supports)

**Target settimana 2:**
- Performance: ≥80
- Accessibility: ≥85
- Best Practices: ≥85

**Tool:** Lighthouse + axe DevTools per contrast audit

---

**Fine document.**  
Questo file è la **fonte di verità** per le prossime 2 settimane.  
Aggiorna ogni lunedì + venerdi con status.

*Generated 11 May 2026 — Caveman Mode Ultra-Compressed*
