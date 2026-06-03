# SafeEats PWA — Piano Miglioramenti Strategici v4.0

**Data:** 11 Maggio 2026
**Base:** SAFEATS_DEVELOPMENT_COMPLETE.md (versione 90% completa)
**Obiettivo:** Trasformare app funzionale in app **bellissima, accessibile, performante, completa**
**Approccio:** Priorità → Spiegazione → Best practice da fonti autorevoli → Codice esempio

---

## INDICE

1. [Diagnosi: cosa funziona già](#diagnosi)
2. [Cosa manca di FONDAMENTALE](#mancanze-fondamentali)
3. [Glassmorphism: audit e miglioramenti](#glassmorphism-audit)
4. [UI/UX: cosa serve davvero a un celiaco in Giappone](#uiux-celiaco)
5. [Performance: l'app deve volare](#performance)
6. [Accessibility: NON è opzionale per un'app di sicurezza](#accessibility)
7. [Roadmap prioritizzata 12 settimane](#roadmap)
8. [Bibliografia / Fonti](#fonti)

---

## <a name="diagnosi"></a>1. DIAGNOSI — Cosa è già solido

Dal SAFEATS_DEVELOPMENT_COMPLETE.md:

- ✅ Show to Waiter Card (concetto ottimo, da rifinire)
- ✅ Safety Levels GREEN/YELLOW/RED (concetto ottimo, ma color-blind unfriendly — vedi §6)
- ✅ Share Target API + deep linking (forte)
- ✅ Geocoding Nominatim (gratis, attenzione rate limit)
- ✅ GFPlacesDB + GFSuggestionsDB su localStorage (ok per MVP, limitato per scalare)
- ✅ Service Worker funzionante
- ✅ Glassmorphism applicato su 5+ aree

**Punti di forza chiari:** la nicchia è giusta, il design system esiste, le feature core ci sono.
**Il problema:** è "production ready" su carta ma manca polish, accessibility, e features che fanno la differenza fra "uso una volta" e "ne dipendo per il viaggio".

---

## <a name="mancanze-fondamentali"></a>2. COSA MANCA DI FONDAMENTALE

Ranking per **impatto su utente celiaco in viaggio reale** (non per difficoltà tecnica).

### 🔴 P0 — BLOCCANTI (un viaggiatore celiaco senza questi è in pericolo)

#### 2.1 Carte traduzione allergie multi-lingua
**Stato attuale:** "Show to Waiter Card" mostra info ristorante. NON include traduzioni allergie.
**Problema reale:** A Kyoto in un izakaya rurale, cameriere non parla inglese. Mostrare nome ristorante NON aiuta.
**Cosa serve:**
- Carta dedicata "Ho la celiachia" in giapponese (kanji + hiragana + romaji)
- Domande chiave: "Contiene soia/grano?", "Avete pasta GF?", "Cross-contamination?"
- Lista ingredienti vietati con nome JP (醤油=shoyu/salsa soia ha grano, 麦茶=mugicha=tè orzo, etc.)
- Audio TTS offline (Web Speech API)
- Modalità "schermo gigante" full-screen per il cameriere

**Fonte best practice:** [Celiac Disease Foundation](https://celiac.org/2023/06/28/traveling-gluten-free/), [Find Me Gluten Free](https://www.glutenfreelifeandtravels.com/post/how-the-find-me-gluten-free-app-makes-gluten-free-travel-easier-and-the-story-behind-it). Tutte raccomandano "language cards" come feature #1 per viaggio internazionale.

**Codice scheletro:**
```javascript
const ALLERGY_CARDS = {
  ja: {
    title: 'セリアック病について',
    intro: '私はセリアック病です。グルテン（小麦・大麦・ライ麦）を絶対に食べられません。',
    questions: [
      { q: 'これに小麦は入っていますか？', romaji: 'Kore ni komugi wa haitte imasu ka?' },
      { q: '醤油は小麦不使用ですか？', romaji: 'Shōyu wa komugi fushiyō desu ka?' },
      { q: '別の鍋で調理できますか？', romaji: 'Betsu no nabe de chōri dekimasu ka?' }
    ],
    forbidden: ['小麦', '大麦', 'ライ麦', '醤油', '麦茶', 'うどん', 'そうめん', 'ラーメン', 'てんぷら']
  }
};

function openAllergyCard(lang = 'ja') {
  const card = ALLERGY_CARDS[lang];
  // render full-screen modal, max contrast, font 24px+
  // audio button for TTS pronunciation
}
```

#### 2.2 Filtro safety + ricerca avanzata
**Stato attuale:** Toggle "Show GF places". Punto.
**Cosa manca:**
- Filtro per safety_level (solo GREEN, escludi RED)
- Ricerca testuale per nome
- Filtro per città/zona
- Filtro per tag (dedicated kitchen, menu100gf)
- Filtro per distanza dall'utente
- Filtro "aperto adesso" (richiede campo opening_hours nel DB)

**Fonte:** [Go Beyond Gluten — Gluten-Free Travel Apps Compared](https://gobeyondgluten.com/general/gluten-free-travel-apps), [Find Me Gluten Free](https://glutendude.app/) — tutte hanno filtri multipli come feature core.

#### 2.3 Database POI pre-popolato
**Stato attuale:** GFPlacesDB inizia vuoto. Utente deve aggiungere a mano.
**Problema:** Nessuno usa un'app vuota. Effetto "cold start".
**Cosa serve:**
- Seed iniziale 150+ ristoranti GF pre-verificati (README dice già "150+ POI certificati" ma non è chiaro se siano nel DB)
- Update periodico via JSON statico hostato su GitHub Releases o CDN
- Sync intelligente: scarica solo delta (last_updated > local_version)

**Fonte:** [Gluten Free Global](https://glutenfreeglobal.co/travel-smart-with-the-gluten-free-app/) — "global listings of thousands of gluten-free-friendly venues" è il loro punto vendita principale.

#### 2.4 Indicazioni stradali a ristorante
**Stato attuale:** Marker sulla mappa, click = info card. Punto.
**Cosa manca:** "Indicami la strada" → apre Google Maps / Apple Maps con coords.
```javascript
function openDirections(lat, lng, name) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  window.open(url, '_blank');
}
```

---

### 🟡 P1 — ALTI (rendono l'app indispensabile)

#### 2.5 Recensioni e foto utenti
Senza recensioni, fidarsi di un ristorante GF è atto di fede.
- Campo `reviews[]` su GFPlacesDB con: text, date, safety_experienced, photos
- Foto piatto + foto menu (utili per celiaci futuri)
- "Last verified" date prominente (info >6 mesi = warning giallo)

**Fonte:** [Find Me Gluten Free](https://www.glutenfreelifeandtravels.com/post/how-the-find-me-gluten-free-app-makes-gluten-free-travel-easier-and-the-story-behind-it) — "community-submitted feedback and safety review features".

#### 2.6 Esportazione/Backup dati
localStorage può sparire (cache clear, reset browser, cambio device).
- Export JSON download → utente scarica `safeeats-backup-2026-05-11.json`
- Import JSON upload → ripristino
- (Future) Sync cloud opzionale con Supabase/Firebase free tier

#### 2.7 Onboarding wizard
"Apro l'app... e ora?" è il momento più critico. Bounce rate alto.
- Step 1: Severità celiachia (NCGS / classica / dermatite erpetiforme / wheat allergy)
- Step 2: Date viaggio + città
- Step 3: Lingua interfaccia + lingua carta cameriere
- Step 4: Permission geolocalizzazione (con spiegazione del perché)
- Step 5: "Vuoi importare backup esistente?" o "Inizia da zero"

**Fonte:** [Mobile-First UX Design 2026 — Trinergy Digital](https://www.trinergydigital.com/news/mobile-first-ux-design-best-practices-in-2026) — l'onboarding è una delle 5 priorità per mobile-first.

#### 2.8 SOS emergenza medica
Celiaci possono avere reazioni gravi (specialmente con altre comorbidità: latte, soia).
- Bottone SOS sempre visibile in nav bar
- Mostra: 119 (ambulanza JP), ospedali con staff inglese più vicini, frase "Sono celiaco, ho mangiato glutine per errore" in JP
- Tessera medica scaricabile come PDF (genera offline con jsPDF)

---

### 🟢 P2 — MEDI (great-to-have, differenziano dal competitor)

- Voting community su POI suggeriti
- Tag avanzati: vegano + GF, halal + GF, kosher + GF
- Calendario viaggio integrato (data → POI visitabili in quei giorni)
- Statistiche personali viaggio ("hai mangiato in 12 ristoranti, 8 GREEN, 4 YELLOW")
- Achievement / gamification leggera ("Esploratore Tokyo", "Recensore +10")
- Modalità dark / light toggle
- Multi-lingua UI (EN, ES, DE, FR, JA per ricerca)

---

## <a name="glassmorphism-audit"></a>3. GLASSMORPHISM — Audit dettagliato

Da SAFEATS_DEVELOPMENT_COMPLETE.md riga 658-682, il pattern attuale è:

```css
background: rgba(R, G, B, 0.12);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(R, G, B, 0.3);
border-radius: 12px;
```

Buono come base, ma **migliorabile in 6 dimensioni concrete**.

### 3.1 ❌ Problema: blur 20px è eccessivo

Secondo [NN/G — Glassmorphism Best Practices](https://www.nngroup.com/articles/glassmorphism/) e [Orizon — Frosted Glass Without Killing UX](https://www.orizon.co/blog/glassmorphism-in-2026-how-to-use-frosted-glass-without-killing-ux):

> "Start with low blur values. Something around blur(4–6px) is usually enough."
> "Heavy blur hurts readability, slows performance on mobile, and pulls attention away from the content itself."

**Raccomandazione:** Ridurre a `blur(10-12px) saturate(140%)`. Riserva blur 20px solo per overlay full-screen modal.

### 3.2 ❌ Problema: contrasto testo

Pattern attuale `rgba(0,200,255,0.12)` su mappa OpenLayers colorata = testo bianco rischia contrasto < 4.5:1 (WCAG AA fail).

Secondo [Axess Lab — Glassmorphism Meets Accessibility](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/):

> "Text inside a glassmorphic element must meet WCAG AAA contrast ratios (7:1 minimum). Add a thin, high-contrast white or dark stroke around the glass edge."

**Soluzione:**
```css
.glass-card {
  background: rgba(20, 25, 35, 0.55); /* più opaco = più leggibile */
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%); /* iOS! */
  border: 1px solid rgba(255, 255, 255, 0.15);
  /* SCRIM interno per garantire contrasto testo */
  position: relative;
}
.glass-card::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.35) 100%);
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}
.glass-card > * { position: relative; z-index: 1; }
```

### 3.3 ❌ Problema: -webkit- prefix mancante

[Can I use — backdrop-filter](https://caniuse.com/css-backdrop-filter): Safari < 17 richiede `-webkit-backdrop-filter`. Ancora oggi (2026) molti iPhone su iOS 16 lo hanno.

**Sempre includere BOTH:**
```css
backdrop-filter: blur(12px) saturate(140%);
-webkit-backdrop-filter: blur(12px) saturate(140%);
```

### 3.4 ❌ Problema: nessun fallback `@supports`

[Intellure — Ultimate Guide Glassmorphism 2026](https://intellure.co/blog/glassmorphism-guide):

> "Always use @supports feature queries for progressive enhancement, ensuring smooth degradation without JavaScript."

```css
.glass-card {
  /* Fallback solid per browser senza backdrop-filter (es. Firefox vecchi) */
  background: rgba(20, 25, 35, 0.85);
}
@supports (backdrop-filter: blur(10px)) or (-webkit-backdrop-filter: blur(10px)) {
  .glass-card {
    background: rgba(20, 25, 35, 0.55);
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
  }
}
```

### 3.5 ❌ Problema: performance mobile

[Inverness Design Studio — Glassmorphism 2026](https://invernessdesignstudio.com/glassmorphism-what-it-is-and-how-to-use-it-in-2026): blur è GPU-intensive. Più di 2-3 layer glass sovrapposti = lag su mid-range Android.

**Raccomandazioni:**
1. **Max 2 layer glass sovrapposti.** Se ne servono 3, l'innermost è solido.
2. **Media query reduce su low-end:**
   ```css
   @media (max-width: 480px) {
     .glass-card { backdrop-filter: blur(8px); }
   }
   ```
3. **GPU hints:**
   ```css
   .glass-card {
     transform: translateZ(0); /* force GPU layer */
     will-change: backdrop-filter; /* hint */
   }
   ```
4. **Disable on prefers-reduced-transparency:**
   ```css
   @media (prefers-reduced-transparency: reduce) {
     .glass-card {
       background: rgba(20, 25, 35, 0.95);
       backdrop-filter: none;
       -webkit-backdrop-filter: none;
     }
   }
   ```

### 3.6 ❌ Problema: coerenza palette

SAFEATS_DEVELOPMENT_COMPLETE.md elenca 4 colori glass:
- GF Places: `rgba(100,200,100,0.12)` verde
- Suggestions: `rgba(74,91,168,0.12)` blu
- Budget: `rgba(0,200,255,0.12)` ciano
- Budget Alert: `rgba(255,20,147,0.12)` magenta

**Critique:** Verde + ciano = troppo simili (specialmente per protanopia / deuteranopia color-blindness — vedi §6). Magenta alert clasha con tema arancione di README_COMPLETO.md.

**Proposta palette unificata (semantic-driven, non feature-driven):**
```css
:root {
  /* Glass surfaces */
  --glass-neutral:    rgba(20, 25, 35, 0.55);    /* Default */
  --glass-success:    rgba(34, 197, 94, 0.20);   /* Success / GREEN safety */
  --glass-warning:    rgba(234, 179, 8, 0.22);   /* Warning / YELLOW safety */
  --glass-danger:     rgba(239, 68, 68, 0.22);   /* Danger / RED safety */
  --glass-info:       rgba(59, 130, 246, 0.20);  /* Info */
  --glass-accent:     rgba(255, 107, 53, 0.22);  /* Brand orange (Y2K) */

  /* Borders */
  --glass-border:     rgba(255, 255, 255, 0.15);
  --glass-border-accent: rgba(255, 107, 53, 0.30);

  /* Blur scale */
  --blur-sm: 8px;
  --blur-md: 12px;
  --blur-lg: 18px;
}
```

**Usage:**
```css
.safety-green-card { background: var(--glass-success); }
.safety-red-card   { background: var(--glass-danger); }
.header            { background: var(--glass-neutral); backdrop-filter: blur(var(--blur-md)); }
```

Beneficio: cambi un valore in `:root` → tutto si aggiorna. Manutenzione 10× più facile.

### 3.7 ✅ Refactor proposto — file `glass.css`

Estrarre tutto il glass in un file separato (per ora è inline in y2k-override.css). Esempio completo nel file `glass-refactor-example.css` da creare in fase implementazione.

---

## <a name="uiux-celiaco"></a>4. UI/UX — Cosa serve davvero al celiaco a Tokyo

### 4.1 Navigation pattern: bottom tab bar (già presente) → ottimizzare

[Trinergy Digital — Mobile-First UX 2026](https://www.trinergydigital.com/news/mobile-first-ux-design-best-practices-in-2026):

> "Mobile navigation should be simple, intuitive, and easy to reach with one hand; use sticky navigation bars at the bottom for thumb-friendly access, and limit menu options to 5-7 core items."

**Stato attuale:** README_COMPLETO.md indica 8 tab + 2 button (Budget/Galleria). **TROPPI.**

**Refactor:**
- Tab core (max 5): Mappa · Posti GF · Cerca · Gruppo · Profilo
- Resto in menu "Altro": Budget, Galleria, Itinerario, Meteo, Suggerisci, Settings
- Bottom sheet drawer per gli "Altro" (familiar pattern iOS/Android)

### 4.2 Search-first paradigm

[DesignRush — Best Food App Designs 2026](https://www.designrush.com/best-designs/apps/food-beverage), [Procreator — Food App UX Key Strategies](https://procreator.design/blog/food-app-ux-key-strategies/):

> "The search bar is one of the most important elements of food app design, and users should have quick access to it as part of the navigation since this is the first place they'll look for it."

**Implementazione:**
- Search bar in header **sempre visibile** (sticky top)
- Placeholder dinamico: "Cerca a Tokyo..." / "Cerca ramen GF..." / "Cerca near me"
- Autocomplete da GFPlacesDB + suggerimenti
- Keyboard shortcut: `/` per focus search (desktop PWA)

```html
<header class="glass-card">
  <div class="search-wrapper">
    <svg class="search-icon">...</svg>
    <input
      type="search"
      placeholder="Cerca ristoranti GF..."
      aria-label="Cerca ristoranti gluten-free"
      autocomplete="off"
    >
    <button class="filter-btn" aria-label="Filtri">⚙</button>
  </div>
</header>
```

### 4.3 Show-to-Waiter card — refactor critico

**Attuale (da doc):** "Large text (18px+) for visibility across table"
**Migliorabile:**
- Font 28px+ (chiaro a 50cm distanza)
- Schermata full-screen black-background per massimo contrasto
- Auto-rotazione landscape per leggibilità
- Wake Lock attivo (schermo non si spegne)
- Brightness boost suggerito ("Premi qui per max luminosità")
- QR code che apre la card su altro device (cameriere scansiona con suo)

```javascript
async function openWaiterCard(placeId) {
  const place = GFPlacesDB.getById(placeId);

  // Wake lock per tenere schermo acceso
  let wakeLock = null;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}

  // Rendi card full-screen
  document.documentElement.requestFullscreen?.();

  // Render con font giganti + carta lingua giapponese pre-caricata
  renderCard(place, { lang: 'ja', fontSize: '32px', theme: 'high-contrast' });

  // Auto-release wake lock alla chiusura
  return () => { wakeLock?.release(); document.exitFullscreen?.(); };
}
```

### 4.4 Visual hierarchy — riduzione cognitive load

[Procreator — Food App UX](https://procreator.design/blog/food-app-ux-key-strategies/):

> "The app's interface should be clean and straightforward, allowing users to navigate effortlessly without getting overwhelmed by too many options."

**Issues attuali:** README dice "navigation con 8 tabs + 2 buttons" + filter bar 4 categorie + map + weather widget + bottom nav. **Troppi elementi simultanei.**

**Principio "1 schermo, 1 obiettivo":**
- **Schermo Mappa:** mappa fullscreen, search top, filtri come bottom-sheet expandable
- **Schermo Posti GF:** lista verticale scrollable con search top
- **Schermo Show Waiter:** full-screen, NIENT'ALTRO visibile
- **Schermo Itinerario:** timeline verticale, drag-drop

### 4.5 Micro-interactions e feedback

Best practice mobile 2026 ([mockplus — Food Mobile App](https://www.mockplus.com/blog/post/food-mobile-app)): ogni azione utente deve avere feedback < 100ms.

- Tap su POI → ripple animation + leggero haptic feedback (navigator.vibrate(10))
- Pull-to-refresh su lista POI
- Skeleton screens al posto di spinner (sembra più veloce)
- Toast non in alto/centro ma in basso sopra nav bar (thumb-zone)
- Empty states con illustration + CTA chiara ("Nessun ristorante salvato. [Aggiungi il primo]")

### 4.6 Visual design tokens — proposta sistema completo

```css
:root {
  /* === SPACING (4px scale) === */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;

  /* === TYPOGRAPHY === */
  --font-display: -apple-system, 'SF Pro Display', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'Menlo', monospace;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --text-display: 48px; /* per Show-to-Waiter */

  /* === RADII === */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* === SHADOWS === */
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.25);
  --shadow-elevation-1: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-elevation-2: 0 4px 12px rgba(0, 0, 0, 0.15);

  /* === MOTION === */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-decelerate: cubic-bezier(0, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
```

### 4.7 Skeleton screens (NON spinner)

[Wirefuture — PWA Best Practices 2026](https://wirefuture.com/post/progressive-web-apps-pwa-best-practices-for-2026):

> "Pre-cache critical assets using service workers, use skeleton screens instead of spinners for perceived performance."

```html
<div class="poi-card-skeleton">
  <div class="skeleton-line skeleton-title"></div>
  <div class="skeleton-line skeleton-text" style="width: 80%"></div>
  <div class="skeleton-line skeleton-text" style="width: 60%"></div>
</div>

<style>
.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.05) 0%,
    rgba(255,255,255,0.15) 50%,
    rgba(255,255,255,0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
```

---

## <a name="performance"></a>5. PERFORMANCE — App deve volare

### 5.1 File index.html da 11.000 righe → modularizzare

[Mobidev — PWA Best Practices](https://mobidev.biz/blog/progressive-web-app-development-pwa-best-practices-challenges) + [Wirefuture 2026](https://wirefuture.com/post/progressive-web-apps-pwa-best-practices-for-2026): "lazy-load non-critical resources".

**Refactor con ES modules nativi (no build step!):**

```html
<!-- index.html (ora 11k linee → target ~500 linee) -->
<script type="module">
  import { initMap } from './js/map.js';
  import { initDB } from './js/db.js';

  initDB();

  // Lazy load tab-specific modules
  document.querySelector('[data-tab=budget]').addEventListener('click', async () => {
    const { initBudget } = await import('./js/budget.js');
    initBudget();
  });

  // Solo Mappa carica subito
  initMap();
</script>
```

Struttura proposta:
```
js/
├── core.js          # state, toast, sheet, utils (~300 righe)
├── db.js            # GFPlacesDB, GFSuggestionsDB (~200 righe)
├── map.js           # OpenLayers + GF layer (~400 righe)
├── search.js        # search + filters (~250 righe)
├── waiter-card.js   # Show-to-Waiter (~150 righe)
├── allergy-cards.js # multi-lingua cards (~200 righe + data JSON)
├── geocoding.js     # Nominatim wrapper (~100 righe)
├── budget.js        # Budget tab (lazy)
├── gallery.js       # Photo gallery (lazy)
├── itinerary.js     # Itinerary planner (lazy)
├── share-target.js  # Deep linking handler (~150 righe)
└── pwa.js           # SW registration, install prompt (~100 righe)
```

### 5.2 OpenLayers — performance mappa

[Inverness Design Studio 2026](https://invernessdesignstudio.com/glassmorphism-what-it-is-and-how-to-use-it-in-2026): mappa con 10.000+ POI senza ottimizzazione = lag garantito.

**Soluzioni:**
1. **Cluster source:**
```javascript
const clusterSource = new ol.source.Cluster({
  distance: 40,
  source: gfPlacesSource
});
const clusterLayer = new ol.layer.Vector({
  source: clusterSource,
  style: (feature) => {
    const size = feature.get('features').length;
    return size === 1
      ? singlePointStyle(feature.get('features')[0])
      : clusterStyle(size);
  }
});
```

2. **WebGL renderer** (10× più veloce):
```javascript
const gfLayer = new ol.layer.WebGLPoints({
  source: gfPlacesSource,
  style: {
    'circle-radius': 8,
    'circle-fill-color': ['get', 'colorBySafety']
  }
});
```

3. **Viewport culling:** caricare POI solo nel bbox visibile + 20%

### 5.3 Service Worker — refinement

SW attuale fa cache-first generico. Migliorabile con **Workbox-like strategie per asset type**:

```javascript
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Tiles mappa: cache-first, scadenza 30gg
  if (url.hostname.includes('tile') || url.pathname.includes('/tiles/')) {
    event.respondWith(cacheFirst(event.request, 'tiles-v1', 30 * 24 * 3600));
    return;
  }

  // 2. API Nominatim: network-first, fallback cache 1h
  if (url.hostname === 'nominatim.openstreetmap.org') {
    event.respondWith(networkFirst(event.request, 'api-v1', 3600));
    return;
  }

  // 3. Static assets (js/css/img): cache-first, scadenza 7gg
  if (/\.(js|css|png|webp|svg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, 'static-v2', 7 * 24 * 3600));
    return;
  }

  // 4. HTML: network-first, fallback offline.html
  event.respondWith(networkFirst(event.request, 'pages-v1', 0));
});
```

### 5.4 IndexedDB > localStorage

localStorage: sync, 5-10MB max, blocca main thread, no struttura.
IndexedDB: async, ~50% disco disponibile, indici, query.

Per dataset >100 ristoranti con foto, **migrare**:
```javascript
// Libreria minimale: idb-keyval (1.2KB gzipped)
import { get, set, del } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';

await set('gf-places', placesArray);
const places = await get('gf-places');
```

### 5.5 Image optimization

[Wirefuture 2026](https://wirefuture.com/post/progressive-web-apps-pwa-best-practices-for-2026): "lazy-load non-critical resources like images and videos".

Pattern foto galleria/recensioni:
```javascript
async function compressImage(file, maxDim = 1280, quality = 0.85) {
  const img = await createImageBitmap(file);
  const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
  const canvas = new OffscreenCanvas(img.width * scale, img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
  return blob;
}

// HTML img lazy:
<img src="..." loading="lazy" decoding="async" alt="...">
```

### 5.6 Web Vitals target

Target Lighthouse 2026 ([msmcoretech — PWA 2026](https://msmcoretech.com/blogs/why-websites-should-act-like-apps)):
- LCP (Largest Contentful Paint): < 2.5s
- FID/INP (Interaction to Next Paint): < 200ms
- CLS (Cumulative Layout Shift): < 0.1
- Lighthouse Performance: ≥ 90
- Lighthouse Accessibility: ≥ 95
- Lighthouse SEO: ≥ 90

Misurare con `web-vitals` library:
```javascript
import { onLCP, onINP, onCLS } from 'https://unpkg.com/web-vitals@4/+esm';
onLCP(console.log); onINP(console.log); onCLS(console.log);
```

---

## <a name="accessibility"></a>6. ACCESSIBILITY — NON è opzionale

App che gestisce **safety alimentare** = app che può fare male se inaccessibile.

### 6.1 Safety levels color-blind unfriendly — FIX CRITICO

**Stato attuale (da doc):**
- GREEN: #7FFF7F
- YELLOW: #FFD700
- RED: #FF6B6B

[Smashing Magazine — Color Accessibility](https://www.smashingmagazine.com/2016/06/improving-color-accessibility-for-color-blind-users/), [Section508.gov](https://www.section508.gov/create/making-color-usage-accessible/), [Webability — Colors to Avoid](https://www.webability.io/blog/colors-to-avoid-for-color-blindness):

> "Red and green is the most problematic combination for color blindness (~8% of males, ~0.5% of females). NEVER rely on color alone."

**Soluzione duale (color + icon + label + lightness):**

| Livello | Colore | Icona | Label | Pattern |
|---------|--------|-------|-------|---------|
| Safe | 🟢 #16A34A | ✓ checkmark | "SICURO" | solid border |
| Caution | 🟡 #F59E0B | ⚠ triangle | "ATTENZIONE" | dashed border |
| Danger | 🔴 #DC2626 | ✕ cross | "RISCHIO" | dotted border |

Differenza in **lightness** (non solo hue) → distinguibile anche in B/W e per protanopia/deuteranopia/tritanopia.

```html
<span class="safety-badge safety-safe">
  <svg class="icon-check" aria-hidden="true">...</svg>
  <span class="sr-only">Livello sicurezza:</span>
  SICURO
</span>
```

```css
.safety-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.safety-safe    { background: rgba(22, 163, 74, 0.20); color: #4ADE80; border: 1px solid #4ADE80; }
.safety-caution { background: rgba(245, 158, 11, 0.20); color: #FBBF24; border: 1px dashed #FBBF24; }
.safety-danger  { background: rgba(220, 38, 38, 0.20); color: #F87171; border: 1px dotted #F87171; }
```

**Fonte:** [David Mathlogic — Coloring for Colorblindness](https://davidmathlogic.com/colorblind/) — strumento interattivo per testare palette.

### 6.2 Touch targets ≥ 44×44 px

[WCAG 2.2 SC 2.5.5 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) + Apple HIG.

Audit attuale: bottoni nav.bottom hanno `padding: 5px 2px 4px` — RICALCOLARE. Probabilmente troppo piccoli su iPhone.

Standard:
```css
button, [role="button"], a.btn {
  min-height: 44px;
  min-width: 44px;
  padding: var(--space-3) var(--space-4); /* 12px 16px */
}
```

### 6.3 Keyboard navigation

PWA installabile su desktop → keyboard è essenziale.
- Tab order logico
- Focus visible (`outline: 2px solid var(--glass-accent); outline-offset: 2px;`)
- Esc chiude modal/sheet
- Enter/Space attiva button
- `/` apre search

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.matches('input,textarea')) {
    e.preventDefault();
    document.querySelector('#search-input').focus();
  }
  if (e.key === 'Escape') {
    closeActiveSheet();
  }
});
```

### 6.4 ARIA labels

Tutti i bottoni con icona-only devono avere `aria-label`:
```html
<button aria-label="Filtra ristoranti">⚙</button>
<button aria-label="Aggiungi ristorante">＋</button>
<button aria-label="Chiudi finestra">✕</button>
```

Stato selezione filter chip:
```html
<button role="switch" aria-checked="true" aria-label="Mostra solo ristoranti GREEN">
  🟢 Sicuri
</button>
```

### 6.5 Reduced motion / reduced transparency

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}

@media (prefers-reduced-transparency: reduce) {
  .glass-card {
    background: rgba(20, 25, 35, 0.95);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

[Axess Lab](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/):

> "Detect system-level accessibility settings and automatically swap complex glass blurs for solid, high-contrast surfaces."

### 6.6 Screen reader testing

Test con VoiceOver (iOS) + TalkBack (Android) + NVDA (Windows):
- Mappa ha alternative testuale? (lista POI accessibile)
- Modal trap focus quando aperti?
- Live regions per toast (`aria-live="polite"`)?
- Form validation announce errori (`aria-invalid`, `aria-describedby`)?

```html
<div role="status" aria-live="polite" id="toast-container"></div>

<input
  type="text"
  aria-label="Nome ristorante"
  aria-required="true"
  aria-invalid="false"
  aria-describedby="name-error"
>
<span id="name-error" class="error-msg" hidden>Nome obbligatorio</span>
```

### 6.7 Contrasto colore — verifica programmatica

Tool: axe DevTools (Chrome extension) o Lighthouse a11y audit.
Target: WCAG AA (4.5:1 text, 3:1 UI) minimo. AAA (7:1) per testi piccoli.

Verificare specialmente:
- Testo su sfondo glass (rischio alto)
- Bottoni filter chip
- Status badges (pending yellow su white = fail)
- Map marker labels

---

## <a name="roadmap"></a>7. ROADMAP PRIORITIZZATA — 12 settimane pre-viaggio 2027

### Sprint 1-2 (settimane 1-2) — FOUNDATIONS
**Goal:** infrastruttura sana per costruire sopra.

- [ ] Modularizzazione index.html → ES modules (`js/core.js`, `js/map.js`, etc.)
- [ ] Glass refactor: nuovo design tokens system in `:root`
- [ ] Fallback `@supports` per backdrop-filter
- [ ] `-webkit-backdrop-filter` su tutti glass
- [ ] `prefers-reduced-transparency` + `prefers-reduced-motion` media queries
- [ ] Sentry/GlitchTip per error tracking
- [ ] Lighthouse audit baseline + target

### Sprint 3-4 (settimane 3-4) — SAFETY CORE 🔴 P0
**Goal:** features che PROTEGGONO l'utente celiaco.

- [ ] Carte allergie multi-lingua (IT, EN, JA, ZH, KO) con TTS
- [ ] Show-to-Waiter card v2: full-screen, font 32px+, wake-lock, brightness
- [ ] SOS emergency button + tessera medica PDF offline
- [ ] Safety badges color-blind safe (color + icon + label + lightness)
- [ ] Seed database 150+ ristoranti GF Tokyo/Osaka/Kyoto pre-verificati
- [ ] Field `last_verified_at` con warning se >6 mesi

### Sprint 5-6 (settimane 5-6) — UX REFINEMENT 🟡 P1
**Goal:** app facile e bella da usare.

- [ ] Search-first navigation (sticky top bar)
- [ ] Filtri avanzati (safety, città, tag, distance, open-now)
- [ ] Bottom tab bar ridotta a 5 elementi + drawer "Altro"
- [ ] Skeleton screens al posto degli spinner
- [ ] Onboarding wizard 5-step
- [ ] Empty states con illustrazioni + CTA
- [ ] Recensioni e foto utenti (struttura DB + UI)
- [ ] Export/Import JSON backup

### Sprint 7-8 (settimane 7-8) — PERFORMANCE
**Goal:** app vola anche su mid-range Android.

- [ ] OpenLayers Cluster + WebGL renderer
- [ ] Viewport culling POI
- [ ] Service Worker strategie per asset type (tile cache, api cache, etc.)
- [ ] Image compression client-side (WebP)
- [ ] IndexedDB migration (idb-keyval)
- [ ] Lazy load tab modules
- [ ] Web Vitals monitoring continuo

### Sprint 9-10 (settimane 9-10) — ACCESSIBILITY DEEP
**Goal:** WCAG AA pieno, AAA su elementi safety.

- [ ] Keyboard navigation completa
- [ ] ARIA labels su tutti i controlli
- [ ] Screen reader testing (VoiceOver + TalkBack + NVDA)
- [ ] Contrast audit completo con axe
- [ ] Touch target audit (min 44×44px)
- [ ] Focus management modal/sheet
- [ ] Live regions per toast e status

### Sprint 11-12 (settimane 11-12) — POLISH + LAUNCH
**Goal:** pronto al lancio pubblico.

- [ ] Lighthouse score ≥ 90 su tutte categorie
- [ ] Cross-browser test (Safari iOS, Chrome Android, Firefox, Edge)
- [ ] PWA install banner customizzato
- [ ] Landing page SEO separata
- [ ] Blog 3 articoli launch ("Mangiare GF a Tokyo", etc.)
- [ ] Open Graph + Schema.org JSON-LD
- [ ] Submit a Product Hunt + r/Celiac
- [ ] Analytics Plausible/Umami

---

## <a name="fonti"></a>8. BIBLIOGRAFIA / FONTI

### Glassmorphism
- [NN/G — Glassmorphism: Definition and Best Practices](https://www.nngroup.com/articles/glassmorphism/) — Nielsen Norman Group, gold standard UX research
- [Axess Lab — Glassmorphism Meets Accessibility](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/) — accessibility focus
- [Inverness Design Studio — Glassmorphism 2026](https://invernessdesignstudio.com/glassmorphism-what-it-is-and-how-to-use-it-in-2026)
- [Orizon — Frosted Glass Without Killing UX](https://www.orizon.co/blog/glassmorphism-in-2026-how-to-use-frosted-glass-without-killing-ux)
- [Intellure — Ultimate Guide to Glassmorphism 2026](https://intellure.co/blog/glassmorphism-guide)
- [Interaction Design Foundation — What Is Glassmorphism (updated 2026)](https://ixdf.org/literature/topics/glassmorphism)
- [Josh W. Comeau — Next-level frosted glass with backdrop-filter](https://www.joshwcomeau.com/css/backdrop-filter/)
- [Can I Use — CSS backdrop-filter](https://caniuse.com/css-backdrop-filter)

### PWA & Mobile UX
- [Wirefuture — PWA Best Practices 2026](https://wirefuture.com/post/progressive-web-apps-pwa-best-practices-for-2026)
- [Mobidev — Progressive Web App Best Practices](https://mobidev.biz/blog/progressive-web-app-development-pwa-best-practices-challenges)
- [msmcoretech — Why Websites Must Act Like Apps in 2026](https://msmcoretech.com/blogs/why-websites-should-act-like-apps)
- [Trinergy Digital — Mobile-First UX Design 2026](https://www.trinergydigital.com/news/mobile-first-ux-design-best-practices-in-2026)
- [Gomage — PWA Design UX/UI Principles](https://www.gomage.com/blog/pwa-design/)
- [Zignuts — PWA 2.0 & Edge Runtime 2026](https://www.zignuts.com/blog/pwa-2-0-edge-runtime-full-stack-2026)

### Food / Restaurant App UX
- [DesignRush — Best Food & Beverage App Designs 2026](https://www.designrush.com/best-designs/apps/food-beverage)
- [Procreator — Food App UX Key Strategies](https://procreator.design/blog/food-app-ux-key-strategies/)
- [Uistudioz — Top 10 Food Delivery App UI/UX 2026](https://uistudioz.com/blog/top-10-inspiring-food-delivery-app-ui-ux-designs/)
- [Mockplus — Best Food Mobile App UI Designs](https://www.mockplus.com/blog/post/food-mobile-app)
- [JPLoft — Restaurant App Design Guide](https://www.jploft.com/blog/restaurant-app-design-guide)

### Celiac / Gluten-Free Travel
- [Celiac Disease Foundation — Traveling Gluten-Free](https://celiac.org/2023/06/28/traveling-gluten-free/)
- [Go Beyond Gluten — 3 Gluten-Free Travel Apps Compared](https://gobeyondgluten.com/general/gluten-free-travel-apps)
- [Gluten Free Global — Travel Smart with the App](https://glutenfreeglobal.co/travel-smart-with-the-gluten-free-app/)
- [Gluten Free Life and Travels — Find Me Gluten Free Story](https://www.glutenfreelifeandtravels.com/post/how-the-find-me-gluten-free-app-makes-gluten-free-travel-easier-and-the-story-behind-it)
- [Gluten Free Globetrotter — Top Worldwide GF Travel Apps](https://glutenfreeglobetrotter.com/2018/01/19/top-worldwide-gluten-free-travel-apps/)
- [Today's Dietitian — Apps for Gluten-Free Eating](https://www.todaysdietitian.com/newarchives/021313p16.shtml)

### Accessibility & Color
- [Smashing Magazine — Color Accessibility for Color-Blind Users](https://www.smashingmagazine.com/2016/06/improving-color-accessibility-for-color-blind-users/)
- [Section508.gov — Making Color Usage Accessible](https://www.section508.gov/create/making-color-usage-accessible/)
- [Webability — 8 Colors to Avoid for Color Blindness](https://www.webability.io/blog/colors-to-avoid-for-color-blindness)
- [AudioEye — How to Design for Color Blindness](https://www.audioeye.com/post/8-ways-to-design-a-color-blind-friendly-website/)
- [David Mathlogic — Coloring for Colorblindness](https://davidmathlogic.com/colorblind/)
- [Level Access — Color Blindness Accessibility Designer Guide](https://www.levelaccess.com/blog/color-blindness-accessibility-what-designers-need-to-know/)

### Browser / Technical
- [WebKit — Safari 26.2 Features](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/)
- [Copy Programming — Backdrop Filter Complete 2026 Guide](https://copyprogramming.com/howto/css-workaround-to-backdrop-filter)

---

## CONCLUSIONE — Le 3 cose da fare LUNEDÌ

Se devi fare solo 3 cose questa settimana:

1. **Carte allergie multi-lingua giapponese** — l'utente celiaco a Kyoto senza una frase scritta in JP è in pericolo reale. Feature #1 mancante.

2. **Safety badges color-blind safe** — sostituire dipendenza color-only con `color + icon + label + lightness`. 8% utenti maschi è daltonico. App safety NON può escluderli.

3. **Glass refactor con `@supports` + `-webkit-` prefix + `prefers-reduced-transparency`** — un audit + find/replace su tutto il CSS. 2-3 ore di lavoro. Impatto: Safari iOS smette di rompersi, accessibility ✓, performance migliora.

Tutto il resto è importante ma costruisce su queste fondamenta.

**L'app non deve solo essere bella. Deve essere FIDABILE quando importa.**
Un celiaco a Tokyo che apre SafeEats sta letteralmente affidando la sua salute a questa interfaccia. Ogni decisione di design è una scelta etica.

---

*Documento generato con ricerca web maggio 2026.*
*Tutte le citazioni sono linkate alle fonti originali e verificabili.*
