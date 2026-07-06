# 📋 CHANGELOG — Giappone 2027

## v3.13 — Bottoni Apri mappa/Salva/Calendario disallineati (2026-07-04, Attuale)

### 🔧 Fix
Nel dettaglio POI, "Apri mappa" era visibilmente più stretto di "Salva"/"Calendario" a schermi mobile (375px: 83.6px vs 117.7px), pur avendo tutti e tre `flex:1`. Causa: asimmetria di markup — "Apri mappa" era avvolto in un `<div>` extra per contenere il menu a tendina (Google/Apple Maps), gli altri due erano `<button>` diretti nella riga flex. Chrome calcola la distribuzione flex diversamente per un contenitore-div-con-bottone-dentro rispetto a un bottone diretto, anche con `flex:1` identico su entrambi.

Fix in `js/views/poi-detail-view.js`: rimosso il `<div>` wrapper, "Apri mappa" è ora un `<button>` flex diretto come gli altri due. Il menu a tendina resta posizionato `absolute` ma come fratello fuori flusso (non conta nel calcolo flex), non più come contenitore. Verificato: tutti e tre i bottoni ora 106.3px esatti a 375px di viewport, dropdown ancora funzionante.

## v3.12 — Testo troppo piccolo in tutta l'app: bump globale (2026-07-04)

Segnalato dall'utente sulla card GF Guide, verificato essere sistemico: 88 punti in tutto il CSS a 13px o meno (33 a 12px, 26 a 13px, 12 a 11px, 11 a 10px, 5 a 9px, 1 a 8px) — sotto i 13-14px il testo è oggettivamente piccolo su mobile.

### 🔧 Fix
Bump automatico +2px su ogni `font-size` da 8px a 14px, in **tutti** i file CSS e JS (805 occorrenze, 61 file: `css/legacy-skin.css`, `js/views/poi-detail-view.js`, `js/itinerary-unified.js`, `js/gf-places-panel.js` e altri 57). Mappatura 1:1 che preserva la gerarchia relativa esistente (8→10, 9→11, 10→12, 11→13, 12→14, 13→15, 14→16) — niente redesign dei layout, solo testo più leggibile ovunque. Verificato: nessun overflow/troncamento su GF Guide, dettaglio POI (card densa con badge, riscontri gruppo, bottoni), sintassi di tutti i 56 file JS toccati, smoke test pulito.

## v3.11 — Rimosso terzo elenco hardcoded + redesign card GF Guide (2026-07-04)

### 🔧 Fix
- Trovato un **terzo** elenco GF scritto a mano (`GF_RESTAURANTS` in `js/views/gf-restaurants.js`, 10 locali con gli stessi nomi del file già rimosso in v3.10) — era quello che alimentava davvero la schermata "GF Guide" vista dall'utente, sfuggito all'audit precedente. Rimosso: la lista ora arriva solo da `window.allGlutenFreeShops` (Google Places Text Search live, quota-gated) e `window.GFPlaces.getAll()` (derivato dal review-scan live, v3.10). Le note editoriali finte tipo "Primo locale certificato GIG in Asia" sono sparite insieme al dato inventato che le portava.

### 🎨 Redesign
- Card della GF Guide: prima bordo arancione + box nota verde piatto + bottone "Mappe" enorme + link scollegato sotto — colori in conflitto, gerarchia confusa. Ora: un solo accento (verde, coerente con il resto del sistema GF nell'app), gerarchia chiara nome→meta→indirizzo→azione, singolo bottone Maps, etichetta onesta della fonte dato ("📍 Google Places" o "💬 Rilevato da recensioni — verifica sul posto") invece di finte certificazioni.

## v3.10 — Via i dati editoriali statici: solo live (2026-07-04)

Policy: niente più dati gluten-free scritti a priori nel codice — decisione dell'utente dopo v3.9. Un ristorante può chiudere o cambiare gestione da un giorno all'altro; un elenco scritto a mano invecchia silenziosamente. Meglio nessun dato che un dato falso su dove un celiaco può mangiare in sicurezza.

### 🔧 Modifiche
- **`js/gf-places-loader.js`** riscritto: non carica più `fmgf_japan_restaurants.json` (rimosso, era hardcoded). La lista "posti GF" si ricostruisce ora dall'incrocio fra POI già caricati live (Google Places, già in memoria) e la cache del review-scan live di `gfDetector.js` — zero chiamate API nuove, zero dati scritti a priori. Le aggiunte manuali dell'utente/gruppo restano supportate.
- **`js/jr-pass-calculator.js`**: i prezzi del JR Pass restano una stima di riferimento (JR Group non ha un'API pubblica, nessun fetch live possibile per CORS) ma ora con disclaimer esplicito e link diretti a jrpass.com / smart-ex.jp per il prezzo reale prima di comprare.

## v3.9 — Ricollegato il DB curato dei 17 ristoranti GF (2026-07-04)

### 🔧 Fix
- `js/gf-places-loader.js` puntava a `./data/gf-places-seed.json`, file/cartella mai esistiti — il DB curato dei posti gluten-free partiva sempre vuoto (404 silenzioso). Il file reale con 17 ristoranti curati (safety_level, certificazioni, telefono, maps_url) era `fmgf_japan_restaurants.json`, alla radice del progetto, mai referenziato da nessun altro file. Corretto il path e adattata la forma dati (array nudo, non `{places:[...]}`).

### ✨ Dati
- Geocodificati via Nominatim i 6 locali con indirizzo abbastanza specifico (via/quartiere/stazione) per una posizione affidabile. Gli 11 con indirizzo generico ("Kyoto", "Osaka", "Nara" da soli, senza via/quartiere) sono stati **lasciati senza coordinate** invece di piazzarli su un centro-città fittizio spacciato per posizione esatta — impreciso e potenzialmente fuorviante per chi deve arrivarci fisicamente con esigenze di sicurezza alimentare reali. Ogni voce ha ora un campo `geo_precision` (`geocoded_address` / `geocoded_landmark` / `needs_address`) che documenta onestamente il livello di affidabilità della posizione.

## v3.8 — Fix falso "confermato" nel rilevamento gluten-free (2026-07-04)

### 🔧 Fix (sicurezza/accuratezza)
- `js/services/gfDetector.js` dichiarava 3 fonti ma solo una funzionava: la fonte "Find Me Gluten Free" faceva un `fetch()` diretto al loro sito, sempre bloccato da CORS lato browser — non ha mai prodotto un risultato reale, era dead code. La fonte "attributi Places" contava `servesVegetarianFood`/`servesVeganFood` come evidenza gluten-free, ma vegetariano ≠ senza glutine (pasta, pane, seitan sono comuni in cucina vegetariana): rischio concreto di falso positivo per un celiaco.
- L'effetto combinato: un locale poteva ottenere il badge verde **"🌾 Confermato da Find Me Gluten Free"** senza che quella fonte fosse mai stata davvero consultata, basandosi solo su recensioni + flag vegetariano/vegano.
- Rimosse le due fonti deboli. Resta solo lo scan keyword nelle review, con tetto a `'likely'` — mai più `'confirmed'` da un automatismo. La vera conferma resta il riscontro umano del gruppo (`gf-crowdsource.js`, non toccato). Il link a Find Me Gluten Free resta in UI ma come aiuto alla verifica manuale, non come conferma automatica.

## v3.7 — Fix widget meteo sopra i pannelli + lag chiusura (2026-07-03)

### 🔧 Fix
- **Widget meteo flottante sopra i pannelli aperti**: `updateGpsWeatherWidget`/`updateWeatherWithFallback`/`showWeatherError` (`js/views/weather-view.js`) rimostravano il widget incondizionatamente — se il GPS rispondeva in ritardo (dopo che l'utente aveva già aperto un pannello, es. il dettaglio Meteo stesso), il widget flottante ricompariva sopra. Aggiunto un controllo condiviso: il widget non compare mai se un pannello (`.y2k-win`) è aperto.
- **Lag alla chiusura dei pannelli**: `#map.blur` (`css/modern-2026.css`) animava il `filter` con una `transition` di 0.25s — costoso da ricalcolare frame per frame sull'intera mappa (canvas + marker), soprattutto in concomitanza con l'animazione di chiusura del pannello stesso. Rimossa la transition: il blur ora scatta di scatto invece di essere animato, eliminando il lavoro GPU duplicato durante la chiusura.

## v3.6 — Fix card POI: doppio rendering al cambio (2026-07-03)

### 🔧 Fix
- **Bug reale in `js/y2k-windows.js`**: passando da una card POI a un'altra, quella vecchia veniva chiusa con l'animazione di uscita (fino a 260ms) mentre quella nuova si apriva subito — per quella finestra restavano DUE pannelli interi nel DOM, animati insieme. Causava sia il "flash" della card precedente sia lag percepito su mobile (doppio lavoro di layout/paint). Fix: quando un pannello viene SOSTITUITO da un altro (non chiuso e basta), la rimozione è ora immediata, senza animazione — verificato che in nessun istante del cambio card esistano più di un `.y2k-win` nel DOM.

## v3.5 — Pulizia header + nuova icona app (2026-07-03)

### ✅ Aggiunte
- **Toggle tema chiaro/scuro** (`js/theme-toggle.js`) — override manuale in un bottone icona nell'header, sopra il comportamento automatico di sistema che resta il default. Ciclo: automatico → opposto del sistema → altro tema → automatico. Scelta persistita in localStorage (`html[data-theme]`, specificità più alta della sola media query in `css/liquid-light.css`).
- **Nuova icona app** (`icon-192.png`, `icon-512.png`, `icon-maskable-*.png`) — sostituito il torii/sole rosso (specifico Giappone, da quando l'app è un planner globale) con un marchio vettoriale astratto (aereo di carta/rotta), disegnato via canvas, nessun emoji.

### 🔧 Fix / pulizia
- Header decongestionato: rimossi bottone ricerca e selettore lingua (spostati nel menu ☰, dove restano pienamente funzionanti — nessuna perdita di funzionalità), bottone installazione ora icona-soltanto invece del testo "📱 Aggiungi".
- Logo header: rimossa l'emoji 🧭, sostituita con lo stesso marchio vettoriale dell'icona app.

## v3.4 — Warning orario chiusura POI + Ricerca ibrida Nominatim/Overpass (2026-07-03)

### ✅ Aggiunte
- **Warning orario chiusura POI** (`js/itinerary-closing-warning.js`) — badge sulla tappa se l'orario di arrivo o fine visita cade fuori apertura, calcolato da `entry.opening_periods` (dati strutturati Google, giorno/ora) confrontati con `entry.time`/`entry.duration` e la data reale del giorno di viaggio. Nessun falso allarme se il dato orari non è disponibile.
- **Ricerca ibrida Nominatim/Overpass** (`js/nominatim-loader.js`) — Overpass API tentato per primo per i POI vicini (gratuito, client-side, nessuna funzione serverless toccata), fallback su Google Places solo se risultati insufficienti (<5) o servizio pubblico sotto carico. Escape hatch: `localStorage.setItem('disableNominatimHybrid','true')`.

### 🔧 Fix
- **Bug reale in `js/poi-enrichment.js`**: referenziava `window.googlePlacesDetailsClient` (minuscolo) invece del vero global `window.GooglePlacesDetailsClient` (maiuscolo) — l'arricchimento orari/prezzi in background non è mai partito finché non corretto. Aggiunto anche il parsing dei `periods` strutturati (al posto del solo testo `weekday_text`, inutilizzabile per confronti programmatici).
- `css/modern-2026.css`: regola generica `.y2k-win-body div { color: var(--m-text-2) !important }` sovrascriveva il colore semantico del nuovo badge — aggiunta regola più specifica per `.itin-closing-warning`.

## v3.3 — Fix strutturali + Timeline, Ricerca globale, Risparmio batteria (2026-06-11)

### ✅ Aggiunte
- **🗓️ Timeline viaggio** (`js/views/timeline-view.js`, lazy) — panoramica verticale multi-giorno con tappe in ordine orario, date reali da `tripProfile.startDate`, click → apre il POI. Voce nel menu.
- **🔍 Ricerca globale** (`js/global-search.js`, lazy) — cerca tra POI caricati e tappe itinerario; bottone 🔍 in header + voce menu.
- **🔋 Risparmio batteria** (`js/battery-saver.js` + CSS) — toggle dal menu: disattiva blur/animazioni/ombre (GPU), preferenza persistita.
- **MQTT broker fallback** (`firebase-rtdb.js`) — se broker.emqx.io è irraggiungibile entro 12s, passa automaticamente a HiveMQ → Mosquitto.
- **Icone PWA reali** — torii + sole rosso (192/512 + varianti maskable nel manifest); prima erano placeholder da 300B.

### 🔧 Fix
- `index.html`: rimossi 2 `</main>` orfani (HTML non valido) → ora un unico `<main>` corretto; rimosso meta `viewport-fit` non standard; CSP `<meta>` allineata a `vercel.json`.
- `sw.js`: rimosso prefetch di `../js/sw.js` (404), path `../` → `./`, tutti i CSS nelle risorse critiche, cache v9.
- **Performance boot**: `defer` su tutti gli 89 script esterni (prima bloccavano il parse: ~1.1MB).
- i18n: +16 chiavi (it/en/ja) per le nuove feature, lint OK.

## v3.2 — Chunk Parts + Group Panel + Chat

### ✅ Aggiunte

- **Chunk Parts Loader** (chunk-parts-loader.js)
  - Scarica chunk da GitHub Releases (divisi in parti < 25MB)
  - Concatena automaticamente le parti
  - Decomprime zip in-browser
  - Cache in localStorage per sessioni future
  - Lazy-load per città visibile sulla mappa

- **Group Panel** (group-panel.js)
  - Lista membri connessi con status online/offline
  - Toggle GPS sharing (📍 condividi posizione)
  - Button "Esci dalla stanza"
  - Button "Elimina stanza" (solo creator)
  - Integration con group-chat

- **Group Chat** (group-chat.js)
  - Chat P2P tra membri della stanza
  - Messaggi salvati in localStorage
  - Notifiche push (browser notification)
  - Supporto Markdown emoji e formattazione base
  - Auto-scroll a ultimi messaggi

- **GPS Fake Tokyo** (testing mode)
  - Usa coordinate Tokyo (35.6762, 139.6503) per testing
  - Simula jitter per realismo
  - Disabilita geolocation reale (flag `FORCE_FAKE_GPS`)

### 🔧 Miglioramenti

- **Tab Tappe**: Non si apre più automaticamente al zoom/pan
- **Renderizzazione chunk**: Silent loading (niente toast)
- **Performance**: maxPOI aggressivo a zoomout totale (150 marker @ zoom 5)
- **Error handling**: Fallback graceful se chunk download fallisce

### 🐛 Bug Fix

- Rimosso errore `process.stdout.write` (Node.js syntax in browser)
- GPS fake rimane attivo anche in stanza gruppo
- Chunk loading non crasha se 1 parte fallisce

### 📦 File Nuovi

```
js/chunk-parts-loader.js      (Loader chunk parts da GitHub Releases)
js/group-panel.js             (UI pannello gruppo)
js/group-chat.js              (Chat P2P con notifiche push)
chunk-zips/                   (7 zip divisi per città, < 25MB ciascuno)
CHUNK_INTEGRATION_GUIDE.md    (Setup chunk loader)
```

### 🗑️ File Rimossi/Deprecati

- `parseChunkFeaturesFromStream()` (commentata, rimpiazzata da chunk-parts-loader)
- `AGGIORNAMENTO.md` (v3.0, obsoleto)

---

## v3.1 — Performance & UX Focus

### ✅ Aggiunte

- **Zoom Iniziale Aggresivo**
  - Mappa parte a zoom 10 (vs 5) per evitare overload
  - Viewport ridotto, ~150-400 marker visibili

- **GPS Radius Dinamico**
  - Scala con zoom level (25km @ zoom 5, 2km @ zoom 16)
  - Filtra POI automaticamente in base al contesto

- **maxPOI Aggressivo**
  - Zoom < 5: 150 marker (nasconde 90%)
  - Zoom ≥ 13: Infinito (mostra tutti)

- **Silent Chunk Loading**
  - Niente toast di caricamento
  - Background fetch invisibile

---

## v3.0 — Modular Refactor

### ✅ Aggiunte

- **Modular Structure**
  - `index.html` (4120 linee, monolite refactored)
  - `js/state.js` (Global state, localStorage)
  - `js/features-gps.js` (GPS P2P, WakeLock, Heartbeat)
  - `js/ui-helpers.js` (Helper functions UI)

- **Features Completate**
  - GPS Live P2P (Star topology, hub relay)
  - WakeLock (Screen lock persistente)
  - Heartbeat (Anti-ghost detection)
  - Gemini AI (Free tier, quota 50/giorno)
  - Gluten-Free Filters (150+ POI certificati)
  - Shopping Guide (14 negozi curati)
  - Itinerary (Drag-drop, export ICS/JSON/PDF)
  - Prenotazioni (TableCheck, Tabelog, reminders)

---

## v2.x — Initial Release

- Mappa interattiva (200+ POI, 37 città)
- OpenLayers integration
- Filtri base (categoria, città, rating)
- Itinerario semplice
- PWA installabile
- Service worker offline-first

---

## 📊 Statistiche Versione Attuale

| Metrica | Valore |
|---------|--------|
| **File totali** | 3515 linee (index.html) |
| **POI hardcoded** | 269 (POIS_BASE) |
| **POI da chunk** | ~10,000+ (da GitHub Releases) |
| **Zip chunk** | 7 città, ~50-220MB ciascuna |
| **Chunk parts** | 28 file × 20MB |
| **Dimensione app** | ~500KB (gzipped) |
| **Supporto browser** | Chrome 90+, Safari 15+, Firefox 88+ |

---

## 🚀 Roadmap Future

- [ ] Chat Gruppo (Emoji support)
- [ ] Booking Sync P2P
- [ ] Gemini Vision (Foto POI)
- [ ] Weather API per tappe
- [ ] Local tourism APIs
- [ ] Multi-language (EN, JP)
- [ ] Native app (iOS/Android Capacitor)
- [ ] Map offline caching
- [ ] Advanced filters (budget, open now, etc)
- [ ] Social sharing (itinerary export)

---

## 🔗 Link Importanti

- **GitHub Repo:** https://github.com/Moriconz/Giappone-2027
- **Live Demo:** https://moriconz.github.io/Giappone-2027
- **Chunk Release:** https://github.com/Moriconz/Giappone-2027/releases/tag/chunks-v1
- **Documentation:** MODULAR_STRUCTURE.md, CHUNK_INTEGRATION_GUIDE.md

---

**Ultima modifica:** 25 Aprile 2026  
**Autore:** Moriconz (SAP Solution Consultant + Fotografo)  
**Status:** ✅ Produzione (v3.2)
