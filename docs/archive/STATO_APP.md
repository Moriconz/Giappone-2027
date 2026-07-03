# Giappone 2027 — Stato dell'App (2026-05-26)

> Documento di **inventario + tracciabilità**. Per ogni file: dove sta, cosa fa, quante righe,
> quali funzioni espone e a che riga. Pensato per **ripristinare un pezzo specifico** senza
> dover scorrere a mano l'intera repo. In fondo: idee per portare ogni feature al livello successivo.

---

## 1. Idea e obiettivo

**Giappone 2027** (interno: "SafeEats") è una **PWA di viaggio per il Giappone** progettata per un
gruppo di amici intolleranti / sensibili al glutine. Risolve quattro problemi che le app generaliste
risolvono male:

1. **Trovare locali davvero gluten-free in Giappone** — incrocia Google Places, una whitelist
   curata `data/`, e un detector euristico (`js/services/gfDetector.js`) che legge attributi+recensioni.
2. **Pianificare un itinerario multi-giorno** — wizard 4 step, ottimizzatore "nearest-neighbor",
   tempi di spostamento e tariffe di trasporto stimate, budget per giorno.
3. **Coordinarsi con il gruppo in tempo reale** — codici stanza a 6 caratteri, sync via MQTT
   pubblico, merge CRDT a livello di campo con vector clock (auto-resolution last-write-wins),
   audit log delle modifiche scritto a regime (la sua visualizzazione UI è ancora scaffolding —
   vedi §8).
4. **Funzionare in mobilità reale** — offline-first, service worker con cache versionata,
   IndexedDB per i POI, lazy loading delle immagini, GPS background con wake lock.

**Obiettivo finale**: un compagno di viaggio installabile (iOS/Android via PWA), senza account,
**senza backend applicativo proprietario persistente** (solo Vercel serverless come proxy verso
Google Places / Groq AI / Geocoding per nascondere le chiavi — nessun DB nostro, nessun login,
nessuna ownership dei dati utente), bilingue IT/EN/JA con fallback IT, utilizzabile per il viaggio
del 2027.

**Stack scelto** (volutamente conservativo per durabilità):

| Layer | Scelta |
|---|---|
| Frontend | HTML + vanilla JS (no framework, no build step) |
| Mappa | OpenLayers 8.2 (CDN) |
| Stato | `window.state` + `localStorage` + IndexedDB per i POI |
| Realtime | MQTT su broker pubblico `broker.emqx.io` (zero signup) |
| API segrete | Vercel serverless (`api/*.js`) con chiavi in env |
| i18n | dizionari `it/en/ja` + `data-i18n` + `window.t()` |
| Distribuzione | Vercel, hosting statico + serverless |

---

## 2. Topologia del repository

```
Giappone-2027-main-2/
├── index.html               210 LOC — shell HTML, header, nav, ordine script/CSS
├── manifest.webmanifest          — manifest PWA
├── sw.js                    ~200 LOC — service worker, cache v7
├── vercel.json                   — routes + headers, SW no-cache
├── package.json                  — solo puppeteer come dev-dep
├── smoke-test.mjs           ~250 LOC — test Puppeteer 9 flussi
│
├── css/                    6'014 LOC totali
├── js/                    27'030 LOC totali, 50 file (post-cleanup + extraction views + iCal + snapshots+autosave + JR Pass + invite + jpcal + audit + conflicts + undo/redo 2026-05-27)
│   ├── views/             3 file (sos-view, tips-view, bookings-view) estratti da app-core
│   ├── itinerary-ical.js  nuovo modulo: export .ics (Apple/Google/Outlook Calendar)
│   ├── itinerary-snapshots.js  nuovo modulo: snapshot/branch itinerario personale + auto-save destructive ops
│   ├── itinerary-optimizer-trip.js  nuovo modulo: ottimizzatore multi-giorno (k-means geo + preview)
│   ├── itinerary-suggest.js     nuovo modulo: suggerimenti completamento (free-time + POI vicini GF-aware)
│   ├── jr-pass-calculator.js   nuovo modulo: conviene il JR Pass? (compute + UI breakdown)
│   ├── group-invite.js         nuovo modulo: deep link ?join=CODE + Web Share + clipboard
│   ├── japan-calendar-hints.js  nuovo modulo: warning Golden Week / Obon / Shogatsu + sakura/koyo (widget in itinerary view)
│   ├── audit-log-viewer.js     nuovo modulo: timeline cronologica modifiche itinerario gruppo (risolve gap UI §8.3)
│   ├── conflict-resolver-ui.js  nuovo modulo: wrapper merge + review conflitti + "Tieni la mia" override (risolve gap UI §8.3)
│   ├── itinerary-undo-redo.js   nuovo modulo: undo/redo itinerario personale + Ctrl+Z (risolve ultimo gap UI §8.3)
│   ├── custom-poi.js           nuovo modulo: POI custom utente via long-press mappa (layer OL + dialog)
│   ├── gf-heatmap.js           nuovo modulo: heatmap densità GF (ol.layer.Heatmap, toggle menu)
│   ├── error-collector.js      nuovo modulo: cattura errori runtime locali (no cloud) + pannello debug
│   └── gf-crowdsource.js       nuovo modulo: riscontri GF condivisi nel gruppo (sezione POI + sync MQTT)
├── scripts/                    tooling
│   ├── lint-i18n.mjs           verifica parità chiavi it/en/ja + data-i18n (npm run lint:i18n)
│   └── visual-regression.mjs   screenshot 4 viste + change-detection via hash (npm run visual)
├── api/                    1'315 LOC, 11 Vercel functions
├── data/                         — DB GF + JSON curati
├── docs/                         — note (I18N.md + archive/)
├── ANALISI_2026.md               — direzione progettuale 2026
├── ARCHITECTURE.md               — architettura (storico)
├── CHANGELOG.md                  — log modifiche
├── FLUSSI_APP.md                 — descrizione di ogni flusso utente
├── README.md                     — overview pubblica
└── ROADMAP.md                    — piano evoluzione
```

---

## 3. Mappa file — tracciamento per ripristino

> **Convenzione**: ogni riga "→ funz @ N" significa: la funzione `funz` inizia alla riga `N` del file.
> Se devi ripristinare quel comportamento, leggi quel range.

### 3.1 Shell HTML

#### [index.html](index.html) — 210 LOC
- Righe 1–80: `<head>` (meta, manifest, ordine CSS).
- 68: prima `<script>` (features-gps.js caricato in `<head>`).
- 93–131: `<header>` con `#lang-switcher` (riga 95) e meteo floating (177).
- 133–155: `<nav class="bottom">` — 4 tab `data-view="map/itinerary/gf/menu"`.
- 156–209: ordine script (vedi §3.2 per il significato dei moduli).

#### [sw.js](sw.js) — ~200 LOC
- 9: `CACHE_NAME = 'giappone-2027-v7'` (versione attuale — bump quando cambi >1 modulo critico).
- 10–11: cache API + immagini separate per TTL diversi.
- 15: `CRITICAL_RESOURCES` — lista pre-cache install.
- 36+: handler `install`, `activate`, `fetch` (offline-first + cleanup vecchie cache).

### 3.2 Moduli JavaScript (ordine di caricamento da `index.html`)

**Legenda stato** (riempita guardando chi chiama davvero ogni modulo, vedi §8 per metodo):

| Tag | Significato |
|---|---|
| 🟢 **canonical** | Percorso ufficiale, usato dal dispatcher / da altri moduli stabili |
| 🟡 **legacy-live** | Vivo (codice eseguito) ma non più via dispatcher principale — coesiste col canonical |
| 🔴 **dead-load** | Caricato in `index.html` ma le sue API esposte **non sono chiamate da nessuno** fuori dal file — candidato rimozione dopo verifica |
| 🔵 **scaffolding** | Codice scritto e funzionante, ma **manca l'UI** che lo esponga (presente per essere usato in futuro) |

| # | File | LOC | Stato | Ruolo |
|---|------|-----|:---:|-------|
| 0 | [js/app-boot.js](js/app-boot.js) | 454 | 🟢 | Bootstrap pre-app: PWA install prompt, SW register, "Mostra al cameriere" |
| 1 | [js/encryption.js](js/encryption.js) | 81 | 🔵 | Wrapper WebCrypto preparato per futura E2EE — mai usato oggi |
| 2 | [js/config.js](js/config.js) | 147 | 🟢 | Config runtime |
| 3 | [js/state.js](js/state.js) | 110 | 🟢 | `window.state` + persist + schema v2 |
| 4 | [js/i18n.js](js/i18n.js) | 195 | 🟢 | Dizionari it/en/ja + `window.t()` |
| 5 | [js/ui-helpers.js](js/ui-helpers.js) | 52 | 🟢 | `escapeHtml`, `formatAIReply`, `renderAIChat` |
| 6 | [js/features-ai.js](js/features-ai.js) | 84 | 🟢 | Chat AI verso `api/groqAnalyze.js` |
| 7 | [js/features-gps.js](js/features-gps.js) | 459 | 🟢 | GPS broadcast, wake lock, heartbeat |
| 8 | [js/firebase-rtdb.js](js/firebase-rtdb.js) | 670 | 🟢 | **MQTT transport** — `window.peerGPS` API |
| 9 | [js/features-photos.js](js/features-photos.js) | 151 | 🟢 | Reverse-geocode + foto Google Places |
| 10 | [js/google-places-cache.js](js/google-places-cache.js) | 210 | 🟢 | Cache IndexedDB POI (TTL, dedupe) |
| 11 | [js/google-places-loader.js](js/google-places-loader.js) | 542 | 🟢 | Fetch POI vicini + categorizzazione |
| 12 | [js/google-places-multitype.js](js/google-places-multitype.js) | 234 | 🟢 | Search multi-categoria per città |
| 13 | [js/google-places-details.js](js/google-places-details.js) | 204 | 🟢 | Enrichment via Place Details API |
| 14 | [js/google-places-debug.js](js/google-places-debug.js) | 343 | 🟢 | Pannello debug — **gate dietro `?debug=1`** dal 2026-05-26 (loader condizionale in index.html, non più sempre caricato) |
| 15 | [js/poi-photo-gallery.js](js/poi-photo-gallery.js) | 267 | 🟢 | Gallery fotografica POI |
| 16 | [js/poi-section-builders.js](js/poi-section-builders.js) | 481 | 🟢 | Builder HTML sezioni POI |
| 17 | [js/services/gfDetector.js](js/services/gfDetector.js) | 214 | 🟢 | Detector GF (3 source, cache) |
| 18 | [js/poi-detail-events.js](js/poi-detail-events.js) | 328 | 🟢 | Init dettaglio POI + rating loader |
| 19 | [js/group-chat.js](js/group-chat.js) | 789 | 🟢 | Chat di gruppo + badge non letti + **reazioni emoji** (`groupchat_reaction`) + **pin messaggi** (`groupchat_pin`, banner Fissati) + **thread per tappa** (compose context legato a un POI, chip 📍 nelle bubble, `discussPoi`). Dal 2026-05-28/29 |
| 20 | [js/group-panel.js](js/group-panel.js) | 427 | 🟢 | Pannello gruppo (header, online/offline, **undo/redo button**) |
| ~~21~~ | ~~js/fase2-tappa-flow.js~~ | ~~561~~ | ✂️ | **Rimosso il 2026-05-26**: `window.TappaFlow` non aveva chiamanti. Smoke test rimasto 9/9. Recuperabile via `git checkout HEAD~ -- js/fase2-tappa-flow.js` se serve |
| 22 | [js/app-core.js](js/app-core.js) | **12'468** | 🟢+🟡 | **Monolite ad alto rischio sistemico** (vedi §8). Contiene: mappa, panel, openSheet/openPOI, CRDT merge, sync, sharing, render*View (6 viste residenti). Include anche `renderItineraryView` 🟡 legacy (~riga 7700) che convive col canonical `renderItineraryUnified`. **Dimagrito −410 LOC** dal 2026-05-26 estraendo Tips/SOS/Bookings/Gallery. Espone `window.CATS`, `window.sheetBody`, `window.renderGroupView` per i moduli views/. |
| 23 | [js/performance-utils.js](js/performance-utils.js) | 94 | 🟢 | `PERF_UTILS` — `batchedSaveState`, debounce |
| 24 | [js/itinerary.js](js/itinerary.js) | 619 | 🟢 | Libreria itinerario (CRUD, optimize, routing, budget) |
| 25 | [js/itinerary-validation.js](js/itinerary-validation.js) | 164 | 🔵 | Valida entry — definito ma usato in modo marginale |
| 26 | [js/budget-widget-helper.js](js/budget-widget-helper.js) | 228 | 🟢 | Widget budget per giorno |
| 27 | [js/poi-enrichment.js](js/poi-enrichment.js) | 167 | 🟢 | `POISync.ensurePOIVerified()` |
| 28 | [js/routing.js](js/routing.js) | 210 | 🟢 | Routing: distance, mode, duration, **fare** |
| ~~29~~ | ~~js/itinerary-ui.js~~ | ~~357~~ | ✂️ | **Rimosso il 2026-05-26**: `renderItineraryViewNew` non aveva chiamanti esterni. Smoke test rimasto 9/9. Recuperabile via git history |
| 30 | [js/itinerary-unified.js](js/itinerary-unified.js) | 1'225 | 🟢 | **Renderer canonical itinerario** (cost summary, OGGI, share link) |
| 31 | [js/itinerary-add-wizard.js](js/itinerary-add-wizard.js) | 704 | 🟢 | Wizard 3 step canonical "Aggiungi a itinerario" |
| 32 | [js/test-helpers.js](js/test-helpers.js) | 199 | 🟢 | `TEST_HELPERS` per smoke test (dev/test only) |
| 33 | [js/onboarding.js](js/onboarding.js) | 819 | 🟢 | Choice modal + form profilo viaggio |
| 34 | [js/filter-system.js](js/filter-system.js) | 264 | 🟢 | Filtri chip mappa (categorie presenti) |
| 35 | [js/y2k-windows.js](js/y2k-windows.js) | 173 | 🟢 | Panel manager (`window.y2kWindows`) |
| 36 | [js/gf-places-loader.js](js/gf-places-loader.js) | 145 | 🟢 | Loader DB GF curato |
| 37 | [js/features-weather.js](js/features-weather.js) | 116 | 🟢 | Meteo |
| 38 | [js/group-sync.js](js/group-sync.js) | 170 | 🟢 | `GROUP_SYNC.broadcastItinerary` + BroadcastChannel |
| 39 | [js/allergy-cards.js](js/allergy-cards.js) | 216 | 🟢 | Cartoncino cameriere IT+JP |
| 40 | [js/wizard-integration.js](js/wizard-integration.js) | 243 | 🟢 | Bridge dal foglio POI al wizard |
| 41 | [js/views/sos-view.js](js/views/sos-view.js) | 194 | 🟢 | **Estratto da app-core il 2026-05-26**: `renderSOSPanel` + helper (copy/medical card/maps). Bug pre-esistente risolto (le 4 helper ora esposte su window) |
| 42 | [js/views/tips-view.js](js/views/tips-view.js) | 92 | 🟢 | **Estratto da app-core il 2026-05-26**: `renderTipsView`. **Collegata al menu** come "🌸 Tips Viaggio 2027" + i18n it/en/ja. Contenuto: frasi GF, timing 2027, alternative ai tourist trap, errori da evitare, info pratiche |
| 43 | [js/views/bookings-view.js](js/views/bookings-view.js) | 60 | 🟢 | **Estratto da app-core il 2026-05-26**: `renderBookingsView`. POI con info prenotazione (TableCheck/Tabelog/sito/telefono) |
| 43b | [js/views/gallery-view.js](js/views/gallery-view.js) | 180 | 🟢 | **Estratto da app-core il 2026-05-29** (refactor §6.9): cluster gallery completo (`getGalleryDB`/`saveGalleryDB`/`compressImage`/`renderGalleryView`). Upload+timeline foto, localStorage 'GalleryDB'. **Verificato isolato + visual regression 4/4 con hash identici** (zero regressioni). app-core −170 LOC |
| 44 | [js/itinerary-ical.js](js/itinerary-ical.js) | 146 | 🟢 | **Nuovo il 2026-05-26**: `window.handleExportICal()`. Genera file `.ics` RFC 5545 importabile in Apple/Google/Outlook Calendar. Bottone "📅 Esporta in Calendario (.ics)" in vista itinerario |
| 45 | [js/itinerary-snapshots.js](js/itinerary-snapshots.js) | 381 | 🟢 | **Nuovo il 2026-05-26**: snapshot/branch dell'itinerario personale + **auto-save** prima di operazioni distruttive. API: `ItinerarySnapshots = {save, saveAuto, list, listAuto, listAll, restore, remove, openPanel}`. Due store separati: `snapshots_v1` (10 manuali FIFO) + `auto_snapshots_v1` (5 auto FIFO). Auto-save triggered da: `restore()` (meta), `importSharedItinerary`, `optimizeDay`. UI panel mostra entrambi con badge "🤖 AUTO" arancione. i18n it/en/ja |
| 46 | [js/jr-pass-calculator.js](js/jr-pass-calculator.js) | 277 | 🟢 | **Nuovo il 2026-05-26**: `window.JRPassCalculator = {compute, openPanel, PASSES, URBAN_JR_COVERAGE}`, `window.openJRPassPanel`. Usa `ROUTING.estimateFare`+`estimateDistanceHaversine` per stimare la spesa transit del trip, confronta con i 3 pass (7/14/21 gg, prezzi 2024+). Output: best pass + savings/extra. UI panel con breakdown km/spesa. i18n it/en/ja (18 chiavi `jrpass.*`) |
| 47 | [js/group-invite.js](js/group-invite.js) | 218 | 🟢 | **Nuovo il 2026-05-26**: `window.copyGroupInviteLink()` (Web Share API → clipboard → prompt fallback) e wrapper su `handleDeepLink` per gestire `?join=CODE[&name=NAME]`. Polling resiliente (60s) che apre `renderGroupView` e precompila `#group-room-join`. sessionStorage `gj2027_pending_join` sopravvive a onboarding/reload. Bottone "🔗 Copia link invito" in `group-panel.js`. i18n it/en/ja (9 `invite.*` + 2 `group.*`) |
| 48 | [js/japan-calendar-hints.js](js/japan-calendar-hints.js) | 359 | 🟢 | **Nuovo il 2026-05-26**: warning proattivo per Golden Week (29 apr–5 mag), Obon (13–16 ago), Shogatsu (29 dic–3 gen), + hint informativi sakura/koyo 2027 per Tokyo/Kyoto/Nikko. API: `JapanCalendarHints = {getHintsForRange, renderHintsHTML, openDetailPanel, getTripDateRange, RECURRING_PERIODS, SEASONAL_2027}`. Widget compatto in vista itinerario sopra weather alerts, con card cliccabili che aprono panel descrittivo. Severità danger/warning/info con palette colori distinta. Dedupe cross-year per Shogatsu. i18n it/en/ja (18 chiavi `jpcal.*`) |
| 49 | [js/audit-log-viewer.js](js/audit-log-viewer.js) | 271 | 🟢 | **Nuovo il 2026-05-26**: timeline cronologica delle modifiche all'itinerario di gruppo. Aggrega `modificationHistory` di tutte le tappe degli `state.groupItineraries` del room corrente. API: `AuditLogViewer = {collect, openPanel, getLastModifiedSummary}`, `window.openGroupAuditLog`. UI: avatar colorato deterministico per autore, badge azione con icona, time-ago localizzato, filtri rapidi (Tutti / Aggiunti / Rimossi / Note). Filter-by-room esclude eventi di altri gruppi. **Risolve gap UI §8.3**: il codice di scrittura `addTappaAuditEntry`+`formatAuditLog` esisteva, mancava il viewer. Bottone "📜 Cronologia" nel pannello gruppo accanto al "🔗 Copia link invito". i18n it/en/ja (~20 chiavi `audit.*`) |
| 50 | [js/conflict-resolver-ui.js](js/conflict-resolver-ui.js) | 397 | 🟢 | **Nuovo il 2026-05-26**: review e override dei conflitti CRDT del gruppo. **Wrappa `window.mergeGroupItinerary`** (non-invasive su app-core) confrontando pre/post per estrarre conflitti reali, popola `recordMergeConflict` (l'API esisteva ma il merge reale non la chiamava). API: `ConflictResolver = {collect, openPanel, keepMine, dismiss, dismissOne, dismissAll, totalUnresolvedCount}`. UI: lista conflitti per itinerario con grid TUO/GRUPPO, bottoni "↩️ Tieni la mia" (chiama `updatePOIFieldInGroupItinerary`) / "✓ Accetta scelta". Auto-toast post-merge + bottone "⚖️ Conflitti N" pulsante nel pannello gruppo (visibile solo se totalUnresolvedCount > 0). Listener `conflicts_recorded` re-renderizza il pannello. **Risolve gap UI §8.3 #2**. i18n it/en/ja (16 chiavi `cr.*`) |
| 51 | [js/itinerary-undo-redo.js](js/itinerary-undo-redo.js) | 234 | 🟢 | **Nuovo il 2026-05-27**: undo/redo per l'itinerario **personale** (`state.itineraryByDay`). **Wrappa i 9 mutator di `window.ITINERARY`** (addPOIToDay, removePOI, updateTime/Notes/Duration/Cost, moveToDay, optimizeDay, markVisited) per pushare snapshot pre-modifica in uno stack volatile (max 30). API: `ItineraryUndoRedo = {undo, redo, canUndo, canRedo, peekUndo, peekRedo, clear, renderButtonsHTML, refreshButtons}`, `window.itineraryUndo/Redo`. UI: 2 bottoni "⬅️ Annulla / Rifai ➡️" in cima alla vista itinerario, disabled-aware con tooltip che mostra l'azione. **Keyboard Ctrl/Cmd+Z = undo, +Shift = redo** (solo su tab itinerario, ignora input/textarea). **Risolve ultimo gap UI §8.3 #3**. i18n it/en/ja (16 chiavi `undo.*`) |
| 52 | [js/custom-poi.js](js/custom-poi.js) | 312 | 🟢 | **Nuovo il 2026-05-29**: POI personalizzati via **long-press sulla mappa** (550ms, tolleranza 12px). Copre lacune del DB Google. Layer OL dedicato (zIndex 60), 6 categorie con icona, dialog crea (nome/cat/nota), detail panel (aggiungi-a-itinerario riusa il wizard + elimina + link Maps). Storage `state.customPOIs`. API: `CustomPOI = {list, add, remove, openCreateDialog, renderLayer, openDetail}`. Aggancio non-invasivo a `window.map`. i18n it/en/ja (~22 chiavi `cpoi.*`) |
| 53 | [js/gf-heatmap.js](js/gf-heatmap.js) | 137 | 🟢 | **Nuovo il 2026-05-29**: `ol.layer.Heatmap` della densità GF (DB curato `GFPlaces.getAll()` + `allGlutenFreeShops`). Peso per safety level, gradiente verde→rosso, dedup per coord. Toggle dalla voce menu "🔥 Heatmap GF" (passa a mappa + accende). API: `GFHeatmap = {toggle, show, hide, isOn, refresh}`. i18n it/en/ja |
| 54 | [js/error-collector.js](js/error-collector.js) | 143 | 🟢 | **Nuovo il 2026-05-29**: cattura `window.onerror` + `unhandledrejection` in ring buffer locale (max 50, localStorage `gj2027_errors_v1`), **nessun invio esterno** (variante privacy-friendly di §6.12 Sentry). Dedup errori entro 3s. Caricato in `<head>` per catturare boot. Pannello con copia/pulisci, voce menu "🐞 Errori" solo se `window.DEBUG`. API: `ErrorCollector = {record, getErrors, clear, openPanel, count}`. i18n it/en/ja |
| 55 | [js/gf-crowdsource.js](js/gf-crowdsource.js) | 205 | 🟢 | **Nuovo il 2026-05-29**: riscontri GF condivisi nel gruppo. Bottoni "✅ GF safe / ⚠️ Problema / 💬 Nota" nel dettaglio POI → si accumulano per-POI e si propagano via MQTT `gf_report` (+ dedup per id). Sezione "🤝 Riscontri del gruppo" **auto-iniettata via MutationObserver** in `[data-gf-crowd]` (disaccoppiata dal render POI). Storage `state.gfReports`. API: `GFCrowd = {addReport, getReports, summary, receiveReport, renderInto, promptNote}`. i18n it/en/ja. **Cuore del prodotto: la fiducia GF "sul campo"** che integra il detector euristico |
| 56 | [js/itinerary-optimizer-trip.js](js/itinerary-optimizer-trip.js) | 290 | 🟢 | **Nuovo il 2026-05-29**: **ottimizzatore multi-giorno**. Raccoglie tutte le tappe con coord, **k-means++ geografico** (k=giorni), ordina i cluster con nearest-neighbor tra centroidi, riordina intra-day, assegna cluster→giorni. Preview obbligatoria con confronto km prima/dopo; `apply()` riscrive `itineraryByDay` con **auto-snapshot** di sicurezza + ricalcolo routing. Bottone "🧭 Ottimizza tutto il viaggio". API: `TripOptimizer = {computePlan, openPreview, apply}`. Test: itinerario Tokyo↔Kyoto mescolato 1495km → 14km (−99%). i18n it/en/ja |
| 57 | [js/itinerary-suggest.js](js/itinerary-suggest.js) | 228 | 🟢 | **Nuovo il 2026-05-29**: suggerimenti di completamento itinerario (§6.2). Per ogni giorno calcola il **tempo libero** (finestra 12h − durate − travel), poi propone POI vicini (≤6km dal baricentro del giorno) non ancora in itinerario, **rankati GF-aware** (bonus gluten-free + rating + vicinanza). 100% locale/offline (no Groq, no API key). Bottone "✨ Riempi il tempo libero" → panel per giorno con "➕ Day N". API: `ItinerarySuggest = {analyze, suggestForDay, openPanel}`. i18n it/en/ja |

> **Totale JS** (+ trip-optimizer + suggest 2026-05-29): ~28'700 LOC, 56 file.
> Distribuzione: 50 🟢 canonical, 2 🟡 legacy-live, 0 🔴 dead-load, 2 🔵 scaffolding (encryption, itinerary-validation),
> ✂️ 2 cancellati (recuperabili da git). **i18n: 301 chiavi × 3 lingue (parità verificata da `npm run lint:i18n`).**
> Tooling: [scripts/lint-i18n.mjs](scripts/lint-i18n.mjs) + [scripts/visual-regression.mjs](scripts/visual-regression.mjs).
> Sicurezza: CSP + Permissions-Policy (meta + vercel headers).
> **app-core.js è sceso a 12'468 LOC** (era 12'878 — −410, −3.2%). 4/10 viste estratte nel piano §8.5 step 1.
> Ora esposte su window anche: `renderGroupView` (per group-invite).

### 3.3 Funzioni chiave per file (pin-point per ripristino)

#### `js/state.js` — sorgente unica
- 6: `STATE_KEY = 'giappone2027_state_v1'`.
- 9–55: `window.state` con default (itineraryByDay, savedPOIs, tripProfile, budget…).
- 58: `STATE_VERSION = 2`.
- 60–78: **`migrateState()`** — IIFE che esegue migrazioni one-shot (v1→v2 normalizza struttura).
- 80–93: `window.saveState()` — persiste su localStorage.
- 95–108: `ensureStateObject(path)` — getter che crea sotto-oggetti mancanti.

#### `js/i18n.js`
- 1–~80: dizionari `it/en/ja` (~110 chiavi).
- ~85: `window.t(key, fallback)` — fallback IT poi `key`.
- ~120: `applyStatic()` — ritraduce `[data-i18n]`, `[data-i18n-ph]`, `[data-i18n-title]`, `[data-i18n-html]`.
- ~170: `setLang(lang)` — emette evento `langchange`.
- Dettaglio in [docs/I18N.md](docs/I18N.md).

#### `js/itinerary.js` — cuore itinerario
- 15: `initState()` — inizializza `itineraryByDay`.
- **45**: `addPOIToDay(poiId, poiName, dayIndex, time, duration, notes, cost, tag, lat=null, lng=null)`
  — **firma estesa**: ora memorizza lat/lng nell'entry quando disponibili.
- 114: `removePOI(poiId)` — ora **ricalcola routing dei giorni toccati** (evita `route_from_prev` stale).
- 142–222: `updateTime/Notes/Duration/Cost`, `moveToDay`.
- 257: `calculateBudgetSpent()`.
- 284: `autoSortDayByTime(dayIdx)`.
- **298**: `optimizeDay(dayIdx)` — nearest-neighbor reorder + riassegnazione orari includendo travel time.
- 353: `markVisited(poiId)`.
- 395–465: `normalizeEntry`, `normalizeAllEntries`, `enrichAllEntries`.
- **501**: `computeDayRouting(dayIndex)` — calcola `route_from_prev` con distanza/durata/modalità/fare.
- 529: `calculateDayBudget(dayIndex)` — POI cost + ticket + transport.
- 605: `hasDuplicatePOI`.

#### `js/itinerary-unified.js` — renderer principale
- 7: `renderItineraryUnified()` — entry point.
- 456: `window.handleExportHTML` — export HTML statico.
- 550: `window.handleExportWhatsApp` — share intent.
- **579**: `_buildSharePayload()` — items con `{d, p, n, t, dur, c, lat, lng}`.
- 587: `_encodeShare/_decodeShare` (base64url JSON).
- **594**: `window.handleShareLink` — genera URL `?share=<base64>`.
- **606**: `window.importSharedItinerary(payload)` — re-injecta via `addPOIToDay(..., it.lat, it.lng)`.
- 615: `openSharedItineraryPreview` — modale anteprima link condiviso.
- 636: `handleShareGroup` — condivisione verso gruppo MQTT.
- 669: `setupGlobalEventDelegation` — handler unico per i click sull'itinerario.
- 764: `hasShareableItinerary` — gate dei bottoni share.
- 789: `showEmptyItineraryModal` — empty state quando 0 POI.
- 907: `setupAccordionAndDragDrop`.
- 981: `showItineraryPOIMenu(poiId)` — menu kebab per entry.

#### `js/itinerary-add-wizard.js` — wizard 3 step
- 10: `openAddToItineraryWizard(poiData)` — entry; ora salva `poiLat/poiLng` in `wizardState`.
- 42: `getSuggestedDay`, 64: `getSuggestedTime`.
- 88: `renderWizardStep`.
- 116: `removeWizardListeners`.
- 129/260/408: `renderStep1/2/3`.
- 521: `generateTimeSlots`.
- 534: `setupWizardHandlers`.
- **632**: `finishAddToItinerary(state)` — chiama `addPOIToDay(..., state.poiLat, state.poiLng)`.

#### `js/routing.js` — mobilità Giappone
- ~10: `estimateDistanceHaversine(a, b)`.
- ~30: `suggestMode(distanceKm)` — walk <0.7 / transit ≥0.7 / driving ≥50.
- ~60: `estimateDuration(distanceKm, mode)` — secondi.
- **~110**: `estimateFare(distanceKm, mode)` — yen, arrotondato a 10. Base 180¥ +30¥/km su transit.
- 210: `window.ROUTING = ROUTING`.

#### `js/app-core.js` — monolite (sezioni indicizzate)
Sezioni segnate da `// =====` (vedi `grep` interno se vuoi navigare):

| Riga | Sezione |
|------|---------|
| ~215 | Debug panel mobile |
| ~263 | Cleanup tracce GPS |
| ~274 | `saveState()` (override locale) |
| ~303 | Audit log tappe |
| ~336–388 | Sharing personali ↔ gruppi |
| ~455 | `syncPersonalToSharedGroups` |
| ~577 | `generateRoomCode` (6 caratteri) |
| ~584 | `allPOIs()` — cache POI corrente |
| ~605 | `filtered()` — applica filtri attivi |
| ~807 | **CRDT merge** (vector clock, conflict resolution) |
| ~876 | `normalizePOI` |
| ~1021–1112 | Undo / Redo stack |
| ~1206 | `showGroupSelectionModal` |
| ~1266 | `addPOIToGroupItinerary` |
| ~1380 | `updatePOIFieldInGroupItinerary` |
| ~1459 | `computeItineraryDelta` |
| ~1515–1576 | Offline queue + replay |
| ~1597 | `flushBatchSync` |
| ~1718 | `showNoGroupModal` |
| ~1774 | `showShareItineraryModal` |
| ~2195 | Opening hours (parse/format) |
| ~2393 | Soft delete POI |
| ~2473 | Itinerary version history |
| ~3413 | `broadcastItinerary` (MQTT publish) |
| ~3765 | `getCategoryColor`, ~3839 emoji, ~3849 `makePoiStyle` |
| **~4023** | `window.showDayRoute(dayIdx)` — disegna linea giorno sulla mappa |
| ~4050 | `window.clearDayRoute` |
| ~4250 | `renderMarkers()` — marker mappa principale |
| ~4548 | `renderShoppingMarkers` |
| **~4788** | `renderFilters()` — filtri chip presenti |
| **~4918** | `openSheet(title, html)` — apre panel via `window.y2kWindows` |
| ~4933 | `closeSheet()` |
| ~5113 | `renderEnhancedPoiSections(p)` — assembla sezioni POI |
| **~5778** | `openPOI(id)` — apre dettaglio POI |
| **~5912** | wizard handler #1 — chiama `addPOIToDay(..., _pLat, _pLng)` |
| ~5941 | `renderWizardStep` interna wizard inline |
| **~6447** | wizard handler #2 — chiama `addPOIToDay(..., _pLat, _pLng)` |
| ~6898 | Export JSON + PDF |
| ~7344 | `renderListView` |
| ~7764 | `renderItineraryView` (legacy, ora delega a unified) |
| ~8234 | `renderTipsView` |
| ~8615 | `renderWeatherModal` |
| ~8911 | `renderWeatherView` |
| ~9188 | `renderBudgetView` |
| ~9488 | `renderGalleryView` |
| ~9722 | `renderGFView` |
| ~9880 | `renderBookingsView` |
| ~10163 | `renderShoppingView` |
| ~10652 | `renderGroupView` |
| ~11000 | `renderSOSPanel` |
| ~11162 | `renderGFList(city, searchText)` |
| ~11343 | Google Places integration init |
| ~12134 | Initial GF places layer load |
| ~12541 | `class GestureDetector` |
| ~12682 | `window._refreshGroupView` |
| ~12862 | `window.handleDeepLink()` |

#### `js/firebase-rtdb.js` — MQTT transport (nome storico fuorviante)
- 13: `MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt'`.
- 14: `TOPIC_PFX = 'giap2027v2/'`.
- 30: `roomTopic(room)`.
- 33: `pub(topic, payload)`.
- 47: `rtdbBroadcast(data)`.
- 55: `handleIncoming(raw)` — routing dei tipi messaggio (gps, itinerary, presence…).
- 426: `makeFakeConn()` — fallback se MQTT non disponibile.
- 454: `prunePresence()` — rimuove peer offline >30s.
- **469**: oggetto `peerGPS` (API pubblica identica al vecchio PeerJS).
- 550: `getStatus()` (`connected`/`connecting`/`disconnected`).
- 552: `getPeerCount()`.
- 667: `window.peerGPS = peerGPS`.

#### `js/group-sync.js`
- 45: `broadcastItinerary()` — invia delta via MQTT.
- 170: `window.GROUP_SYNC = GROUP_SYNC` + BroadcastChannel cross-tab.

#### `js/y2k-windows.js` — panel manager
- 57–80: `openWin` — crea `.y2k-win` + body + close button.
- 94: bind X.
- 161: `window.y2kWindows = { open, close, closeAll }`.

#### `js/onboarding.js`
- 10: `initOnboarding()`.
- 27: `showOnboardingChoiceModal`.
- 165: `closeOnboardingChoiceModal`.
- 177: `skipOnboarding`.
- 182: `showOnboarding` — wizard form profilo.
- 719: `initOnboardingForm` — bind input.

#### `js/services/gfDetector.js`
- 81: `sourceC_placesAttributes` — euristica da Place attributes.
- 93/121: cache localStorage status GF.
- 200: `window.GlutenFreeDetector` (API).

### 3.4 Stili CSS (ordine caricamento)

| File | LOC | Ruolo |
|---|---:|---|
| `legacy-skin.css` | 3'545 | Skin Y2K originale — **mantenuto solo per struttura componenti**, sovrascritto da modern-2026 |
| `glass.css` | 184 | Glassmorphism (var `--glass-*`, blur scale) |
| `safety.css` | 226 | Safety badges color-blind accessible (WCAG AAA) |
| `components.css` | 855 | Sistema componenti (.btn-*, .form-*, .card-*, .modal-*) |
| `base.css` | 557 | Estratti da `<style>` inline + esclusioni glass per `#map`/`canvas` |
| `modern-2026.css` | 647 | **Design system 2026** — dark warm + cyan, vince la cascata |

### 3.5 API serverless (`api/*.js`)

| Endpoint | LOC | Cosa fa | Chiave env |
|---|---:|---|---|
| `analyzeGlutenFree.js` | 164 | Analizza review per livello GF | `GROQ_API_KEY` |
| `enrichPOI.js` | 152 | Arricchisce singolo POI | `GOOGLE_PLACES_API_KEY` |
| `googlePlacesDetails.js` | 142 | Place Details (orari, foto, recensioni) | `GOOGLE_PLACES_API_KEY` |
| `googlePlacesNearby.js` | 114 | Nearby search | `GOOGLE_PLACES_API_KEY` |
| `groqAnalyze.js` | 91 | Chat AI Groq | `GROQ_API_KEY` |
| `groqImageAnalyze.js` | 96 | Classifica piatto da labels | `GROQ_API_KEY` |
| `placePhoto.js` | 59 | Proxy `photo_reference → URL diretto` | `GOOGLE_PLACES_API_KEY` |
| `reverseGeocode.js` | 53 | Coordinate → indirizzo | `GOOGLE_GEOCODING_API_KEY` |
| `searchGlutenFreeShops.js` | 105 | Multi-keyword GF search | `GOOGLE_PLACES_API_KEY` |
| `searchGooglePlacesPhotos.js` | 234 | Foto multi-source | `GOOGLE_PLACES_API_KEY` |
| `searchVintageShops.js` | 105 | Vintage/thrift | `GOOGLE_PLACES_API_KEY` |

`vercel.json` mappa `/api/(.*)` → `/api/$1`, headers di sicurezza (X-Frame-Options DENY,
nosniff, strict-origin-when-cross-origin), SW no-cache.

---

## 4. Flussi utente (riassunto)

(Dettaglio completo in [FLUSSI_APP.md](FLUSSI_APP.md).)

1. **Apertura app** → SW register ([app-boot.js](js/app-boot.js)) → init state migrazione v1→v2
   ([state.js:60](js/state.js#L60)) → i18n applyStatic → map render → POI loader debouncato.
2. **Onboarding** (al primo accesso) → choice modal → eventuale form profilo viaggio
   ([onboarding.js:10](js/onboarding.js#L10)).
3. **Tap POI sulla mappa** → `openPOI(id)` ([app-core.js:5778](js/app-core.js#L5778))
   → enrichment ([poi-enrichment.js:167](js/poi-enrichment.js#L167))
   → `openSheet` ([app-core.js:4918](js/app-core.js#L4918))
   → render sezioni ([poi-section-builders.js:468](js/poi-section-builders.js#L468)).
4. **Aggiungi al wizard** → `openAddToItineraryWizard(poiData)`
   ([itinerary-add-wizard.js:10](js/itinerary-add-wizard.js#L10))
   → step 1 giorno → 2 orario → 3 note → conferma → `addPOIToDay(..., lat, lng)`
   ([itinerary.js:45](js/itinerary.js#L45)).
5. **Vista itinerario** → `renderItineraryUnified` ([itinerary-unified.js:7](js/itinerary-unified.js#L7))
   → cost summary widget, OGGI badge, optimize button (chiama `optimizeDay`
   [itinerary.js:298](js/itinerary.js#L298)), route on map (`showDayRoute`
   [app-core.js:4023](js/app-core.js#L4023)).
6. **Share link itinerario** → `handleShareLink` ([itinerary-unified.js:594](js/itinerary-unified.js#L594))
   → URL `?share=<base64>` → su altro device `openSharedItineraryPreview`
   → `importSharedItinerary` → re-injecta via `addPOIToDay` con lat/lng.
7. **Crea/Unisciti a gruppo** → 6-char room code → `peerGPS` MQTT
   ([firebase-rtdb.js:469](js/firebase-rtdb.js#L469)) → presence + chat + sync itinerario.
8. **Sync itinerario gruppo** → `broadcastItinerary` ([group-sync.js:45](js/group-sync.js#L45))
   → CRDT merge ([app-core.js ~807](js/app-core.js#L807)) → audit log
   ([app-core.js ~303](js/app-core.js#L303)).
9. **Budget** → `calculateDayBudget` ([itinerary.js:529](js/itinerary.js#L529)) include
   POI cost + ticket + **transport fare** ([routing.js estimateFare](js/routing.js)).
10. **Cambio lingua** → `setLang(lang)` ([i18n.js](js/i18n.js)) → `langchange` event →
    `app-core` ri-renderizza vista corrente.

---

## 5. Stato di qualità

- **Smoke test**: 9/9 flussi verdi, 0 pageErrors. `node smoke-test.mjs http://localhost:PORT`.
- **i18n coverage**: ~110 chiavi it/en/ja con fallback IT (vedi [docs/I18N.md](docs/I18N.md)).
- **Schema migration**: `STATE_VERSION = 2` con migrazione one-shot.
- **Cache SW**: `giappone-2027-v26` (bump al cambio modulo critico).
- **Lint i18n**: `npm run lint:i18n` — 265 chiavi parità it/en/ja, 0 errori.
- **Visual regression**: `npm run visual` — screenshot 4 viste, change-detection via hash, baseline deterministica.
- **Security headers**: CSP + Permissions-Policy + X-Frame-Options/nosniff/Referrer-Policy (meta in index.html + header in vercel.json).
- **Error collector**: errori runtime in locale (`ErrorCollector.openPanel()`), nessun invio esterno.
- **Console errors residui**: 5 esterni (CORS `findmeglutenfree.com` + un 404 di risorsa esterna).
  Sono **gestiti gracefully** dall'app — non sono regressioni.
- **Privacy**: l'app è esplicitamente "tra amici" (broker pubblico, no E2EE). L'idea di crittografia
  end-to-end è preservata in [js/encryption.js](js/encryption.js) per uso futuro (vedi §6.7).

---

## 6. Next-level: idee per ogni caratteristica

Sezione progettuale. Ogni idea elenca: **valore**, **rischio**, **dove andrebbe il codice**.

### 6.1 Mappa & POI

- **Clustering marker** quando zoom <12. Riduce il clutter sopra Tokyo/Osaka.
  Valore: alto in città dense. Rischio: medio (state visual + perf su mobile vecchi).
  Dove: nuovo `js/map-clustering.js` + hook in `renderMarkers` ([app-core.js:4250](js/app-core.js#L4250)).
- ~~**Heatmap densità GF certificati**~~ ✅ **Fatto il 2026-05-29**: [js/gf-heatmap.js](js/gf-heatmap.js).
  `ol.layer.Heatmap`, toggle dal menu "🔥 Heatmap GF", pesata per safety level, gradiente verde→rosso.
- ~~**POI custom utente**~~ ✅ **Fatto il 2026-05-29**: [js/custom-poi.js](js/custom-poi.js).
  Long-press sulla mappa → dialog crea posto (6 categorie), layer dedicato, detail con "aggiungi a itinerario". Storage `state.customPOIs`.
- **Diff "POI vs ultimo visita"** — quando un place ha cambiato orari, salvalo e mostra "⚠️ orari aggiornati".
  Dove: `js/poi-enrichment.js`.

### 6.2 Itinerario

- ~~**Ottimizzatore multi-giorno**~~ ✅ **Fatto il 2026-05-29**: [js/itinerary-optimizer-trip.js](js/itinerary-optimizer-trip.js).
  k-means++ geografico (k=giorni) + ordine cluster nearest-neighbor + riordino intra-day. Preview con confronto km
  prima/dopo, apply con auto-snapshot. Test: 1495km → 14km su itinerario Tokyo↔Kyoto mescolato.
- **Vincoli orari hard** (un POI è "venerdì 11-18" → mai metterlo lunedì). Già parzialmente avviato
  con `getPOIOpeningHours` ([app-core.js ~2317](js/app-core.js)). Da rendere first-class nel `addPOIToDay`.
- ~~**Snapshot/branch itinerario**~~ ✅ **Fatto il 2026-05-26**: [js/itinerary-snapshots.js](js/itinerary-snapshots.js).
  Modulo isolato in localStorage. **Due store**: 10 manuali (`snapshots_v1`) + 5 auto (`auto_snapshots_v1`), entrambi FIFO.
  **Auto-save** triggered prima di operazioni distruttive: `restore()` (meta-snap), `importSharedItinerary` (import share link),
  `optimizeDay` (riordino giorno). UI panel mostra entrambi i tipi con badge "🤖 AUTO" arancione.
  Indipendente dall'infra CRDT `itineraryVersionHistory` (quella opera sul gruppo, non sull'itinerario personale).
- ~~**Esporta a Google Calendar / iCal**~~ ✅ **Fatto il 2026-05-26**: [js/itinerary-ical.js](js/itinerary-ical.js).
  Bottone "📅 Esporta in Calendario (.ics)" in vista itinerario. Output RFC 5545 con UID univoci,
  DTSTART/DTEND da `entry.time`+`duration`, LOCATION lat/lng, DESCRIPTION con note+cost+link Maps.
- ~~**Suggerimenti di completamento**~~ ✅ **Fatto il 2026-05-29**: [js/itinerary-suggest.js](js/itinerary-suggest.js).
  Analisi tempo libero per giorno + POI vicini (≤6km) non in itinerario, rank GF-aware. "✨ Riempi il tempo libero".
  **Scelta: euristica locale invece di Groq** — l'endpoint `groqAnalyze` è hard-wired sui menu e richiede API key
  server-side (non testabile offline). L'euristica copre il caso d'uso senza dipendenze; gancio AI possibile in futuro
  con un endpoint generico.

### 6.3 Trasporti & costi

- **API trasporti reali** invece di stima euristica `estimateFare` ([js/routing.js](js/routing.js)).
  Candidati: NAVITIME (a pagamento), Jorudan (limitato), OpenTripPlanner self-hosted.
  Valore: tempi/costi accurati. Rischio: alto (costi API + complessità).
- ~~**JR Pass calculator**~~ ✅ **Fatto il 2026-05-26**: [js/jr-pass-calculator.js](js/jr-pass-calculator.js).
  Modulo isolato che usa `ROUTING.estimateFare`+`estimateDistanceHaversine` per stimare la spesa transit del trip,
  classifica per tratta (Shinkansen ≥50km vs urbano 2-50km), confronta con i 3 pass (7/14/21 gg, prezzi 2024+).
  Output: pass migliore + savings. UI panel con breakdown km/spesa/copertura JR. Bottone "🚄 Conviene il JR Pass?" in vista itinerario.
  i18n it/en/ja (18 chiavi). **Bonus**: aggiornata `routing.estimateFare` da 25¥/km a 30¥/km su Shinkansen (Tokyo-Kyoto ora ¥13.500 vs reale ~¥14.000).
- **Walking-friendly route** quando lo step è breve (<1.5 km) — preferisci a piedi anche se
  Google suggerisce metro. Tweak in `suggestMode`.

### 6.4 Gluten-free (cuore del prodotto)

- **GF Detector v2**: aggiungere fonte D = reviews scrape via `analyzeGlutenFree.js` con prompt
  strutturato (campioni: "celiac", "no soy sauce", "gluten free menu"). Migliora confidence score.
- **Card multilingua estesa**: oltre IT+JP, aggiungere EN/ZH/KO per locali frequentati da
  turisti asiatici. Dato: già in `allergy-cards.js:215` schema espandibile.
- **Audit log per POI GF**: "ultimo aggiornamento status: 2025-12-15 da @autore". Costruisce
  fiducia. Schema nello stesso oggetto cache.
- ~~**Crowdsourcing tra amici**~~ ✅ **Fatto il 2026-05-29**: [js/gf-crowdsource.js](js/gf-crowdsource.js).
  Sezione "🤝 Riscontri del gruppo" nel dettaglio POI con "✅ GF safe / ⚠️ Problema / 💬 Nota", sync via MQTT `gf_report`,
  aggregato safe/warning, storage `state.gfReports`. Integra il detector euristico con la verità sul campo.

### 6.5 Gruppo & sync

- **Cifratura E2EE** delle stanze (idea conservata in [js/encryption.js](js/encryption.js)).
  Trigger: quando l'app esce dalla cerchia di amici. Schema progettato: chiave derivata dal
  codice stanza + salt locale, AES-GCM, payload cifrato sopra MQTT. Implementazione: ~1 giorno.
- **Presence "chi vede cosa"** — mostra l'avatar/iniziale di chi sta editando una tappa adesso.
  Già hai il `peerGPS` con presenza; manca solo il binding UI.
- ~~**Conflict resolver UI**~~ ✅ **Fatto il 2026-05-26**: [js/conflict-resolver-ui.js](js/conflict-resolver-ui.js).
  Wrapper non-invasive su `mergeGroupItinerary` estrae conflict reali; UI panel "⚖️ Conflitti di sincronizzazione"
  con grid TUO/GRUPPO per ogni campo, bottoni "↩️ Tieni la mia" (override via `updatePOIFieldInGroupItinerary`)
  e "✓ Accetta scelta". Auto-toast post-merge + bottone pulsante nel pannello gruppo. i18n it/en/ja.
- ~~**Inviti via deep link**~~ ✅ **Fatto il 2026-05-26**: [js/group-invite.js](js/group-invite.js).
  Wrapper non-invasivo su `handleDeepLink` per `?join=CODE[&name=NAME]`. Polling 60s con sessionStorage
  per resistere a onboarding/reload. Web Share API (mobile native sheet) → clipboard → prompt fallback.
  Bottone "🔗 Copia link invito" nel pannello gruppo (in group-panel.js). i18n it/en/ja.

### 6.6 Chat di gruppo

- ~~**Reazioni emoji**~~ ✅ **Fatto il 2026-05-28**: 👍❤️😂😮😢🔥 con toggle e accumulo multi-utente.
  Modifiche a [js/group-chat.js](js/group-chat.js) (`addReaction`/`receiveReaction` + UI pill+picker sotto ogni bubble),
  routing `groupchat_reaction` in [js/firebase-rtdb.js](js/firebase-rtdb.js) (MQTT) e [js/features-gps.js](js/features-gps.js) (P2P + hub relay).
  Canale dedicato con payload minuscolo `{messageId, emoji, from, action}`. Reazioni preservate in `normalizeChatMessage`.
- ~~**Pin di messaggio**~~ ✅ **Fatto il 2026-05-28**: toggle pin (📌/📍 nel picker), banner "Fissati" (max 3) in cima alla chat,
  sync canale `groupchat_pin`. In [js/group-chat.js](js/group-chat.js).
- ~~**Thread per tappa**~~ ✅ **Fatto il 2026-05-29**: dal menu di una tappa "💬 Discuti nel gruppo" apre la chat
  con un compose-context legato a quel POI; i messaggi inviati portano un chip 📍 con il nome della tappa.
  In [js/group-chat.js](js/group-chat.js) (`discussPoi`/`setContext`) + bottone in [js/itinerary-unified.js](js/itinerary-unified.js).

### 6.7 Privacy / sicurezza

- Vedi §6.5 — l'idea è già documentata nel codice (`encryption.js`).
- **Permessi granulari**: oggi GPS = on/off. Migliorabile a "condividi posizione solo durante
  finestra 9-23". Trigger window.peerGPS.
- **Rotazione codice stanza** — generare nuovo codice senza forzare rejoin (delta encryption key).
- **Bouncer mode** — se la stanza viene "scoperta" da estranei sul broker pubblico, soft-rotate.

### 6.8 PWA & offline

- **Background sync** API: quando torni online, replay automatico delle azioni offline (oggi
  `replayOfflineQueue` [app-core.js ~1534](js/app-core.js#L1534) richiede ritorno foreground).
- **Update prompt UX**: già implementato (mostra "nuova versione disponibile"). Migliorabile
  con changelog auto-estratto da `CHANGELOG.md`.
- **iOS install hint**: detect Safari iOS + non-standalone → mostra mini-tutorial "Aggiungi a Home".

### 6.9 Performance

- **Refactor `app-core.js`** (12'878 LOC) in feature modules. Target:
  `map/`, `crdt/`, `views/`, `wizard-legacy/`. Strategia: estrarre per sezione `// =====`
  (vedi §3.3) senza cambiare le firme pubbliche su `window.*`. Lavoro ~3 giorni.
- **Tree-shake legacy-skin.css** (3'545 LOC) — strumento: PurgeCSS contro `index.html` + ogni
  `*.js` che fa `innerHTML`. Risparmio stimato: 30-50%.
- **Lazy load OpenLayers** solo quando si apre la vista map (oggi caricato sempre via CDN).
  Risparmio TTI ~400ms su 4G.

### 6.10 Internazionalizzazione

- **Onboarding i18n** — non ancora tradotto (deferred perché app tra amici IT). Sblocca
  uso da parte di amici EN/JP. ~1 giorno (file singolo, ~50 chiavi).
- **Toast i18n full migration** — oggi via fallback IT. Stimato ~30 chiavi.
- **Locale-aware date/currency** — `Intl.DateTimeFormat` invece di hardcoded "Day 1".
- ~~**JP-aware**: giorni festivi (Golden Week, Obon, Shogatsu) come hint visivi~~ ✅ **Fatto il 2026-05-26**:
  [js/japan-calendar-hints.js](js/japan-calendar-hints.js). Widget proattivo in vista itinerario:
  3 warning ricorrenti (Golden Week/Obon/Shogatsu) + 4 hint informativi 2027 (sakura Tokyo/Kyoto,
  koyo Nikko/Kyoto). Severità danger/warning/info con palette distinta, panel descrittivo on-click.
  i18n it/en/ja completa.
- **JP-aware (rimanente)**: orari "深夜" (notte fonda) e festività regionali minori.

### 6.11 Testing

- ~~**Visual regression**~~ ✅ **Fatto il 2026-05-29**: [scripts/visual-regression.mjs](scripts/visual-regression.mjs)
  (`npm run visual` / `npm run visual:update`). Cattura 4 viste, change-detection via hash SHA-256 con
  neutralizzazione del non-determinismo (animazioni off, meteo nascosto, viewport fisso). Baseline committabile,
  current in .gitignore. **Limite onesto**: non è pixel-diff (servirebbe pixelmatch) — rileva "cambiato/uguale", non *quanto*.
- **Test integrazione MQTT**: due browser headless che si parlano in una stanza ephemeral.
- ~~**Lint i18n**~~ ✅ **Fatto il 2026-05-29**: [scripts/lint-i18n.mjs](scripts/lint-i18n.mjs) (`npm run lint:i18n`).
  Verifica parità chiavi it/en/ja, duplicati, orfane, e data-i18n di index.html senza chiave. 252 chiavi, 0 errori.

### 6.12 Distribuzione

- **App Store / Play Store wrapper**: Capacitor o PWABuilder per fare il pack nativo.
  Valore: fiducia + push notifications + GPS background più robusto.
- ~~**Static site CSP** strict~~ ✅ **Fatto il 2026-05-29**: CSP `default-src 'self'` (con `'unsafe-inline'` per gli onclick diffusi,
  `connect-src https: wss:` per Google Places/open-meteo/MQTT) + Permissions-Policy. Meta in [index.html](index.html) + header in [vercel.json](vercel.json). 0 violazioni verificate.
- ~~**Sentry / error reporting**~~ ✅ **Fatto il 2026-05-29** in variante locale (coerente con "app tra amici, no cloud"):
  [js/error-collector.js](js/error-collector.js) cattura errori in un ring buffer su device, pannello "🐞 Errori"
  in debug. **Se** in futuro serve telemetria centralizzata, qui si può aggiungere un POST opt-in a Sentry/endpoint proprio.

---

## 7. Come usare questo documento

- **Vuoi modificare l'itinerario?** → §3.3 cerca `itinerary.js` / `itinerary-unified.js`,
  vai alla riga indicata.
- **Vuoi capire la mappa?** → §3.3 `app-core.js` sezione 4250 (`renderMarkers`).
- **Vuoi rifare il wizard?** → §3.3 `itinerary-add-wizard.js` riga 88 (`renderWizardStep`).
- **Vuoi ripristinare uno share-link?** → §3.3 `itinerary-unified.js` righe 579–615.
- **Vuoi pensare al futuro?** → §6 — ogni voce ha già il "dove va" identificato.
- **"Questo è un bug o è voluto così?"** → §8 — source-of-truth, compromessi, maturità.

---

## 8. Stato reale del progetto

> Questa sezione esiste perché un inventario tecnico (§3) non basta a rispondere alla
> domanda **"questa cosa è solida, è scaffolding o è legacy?"**. Le tabelle sotto sono
> compilate guardando chi chiama davvero cosa (grep), non leggendo i commenti.

### 8.1 Source of truth per dominio

Per ogni dominio, **un solo posto** è la verità — gli altri ne sono derivazione o vista.

| Dominio | Source of truth | Vista canonical | Vie legacy/scaffold da NON toccare per bug |
|---|---|---|---|
| **Stato locale persistente** | `localStorage` chiave `giappone2027_state_v1` ([state.js:6](js/state.js#L6)) ↔ `window.state` (in memoria) | Tutti i moduli leggono da `window.state` e scrivono via `window.saveState()` / `PERF_UTILS.batchedSaveState` | Nessun fallback storage |
| **Versione schema** | `window.STATE_VERSION` ([state.js:58](js/state.js#L58)) | Migrazione IIFE one-shot a load | Niente runtime checks dopo il load |
| **POI cache** | IndexedDB (`google-places-cache.js`) | `window.allPOIs()` ([app-core.js:584](js/app-core.js#L584)) | Non leggere POI da altre cache |
| **Itinerario personale** | `window.state.itineraryByDay` (oggetto `{dayIdx: [entry…]}`) | `renderItineraryUnified()` 🟢 ([itinerary-unified.js:7](js/itinerary-unified.js#L7)) | `renderItineraryView` 🟡 ([app-core.js:7764](js/app-core.js#L7764)) e `renderItineraryViewNew` 🔴 ([itinerary-ui.js:6](js/itinerary-ui.js#L6)) **non sono more sources** — leggono lo stesso dato |
| **Itinerari di gruppo** | `window.state.groupItineraries[groupId]` (con `vectorClock`) | `renderGroupView` ([app-core.js:10652](js/app-core.js#L10652)) | Mai modificare a mano `vectorClock` |
| **Trasporto/orari/fares tra POI** | Calcolati da `computeDayRouting` ([itinerary.js:501](js/itinerary.js#L501)) e salvati come `entry.route_from_prev` | `route_from_prev` letto dal renderer | Mai persisterlo manualmente, è derivato |
| **Lingua** | `localStorage.lang` + `window.I18N.lang` | Tutto `window.t()` / `[data-i18n]` | Niente stringhe IT hardcoded che non passino da `t()` |
| **Identità gruppo** | Room code 6-char in `window.state.group` + topic MQTT `giap2027v2/<room>` | `peerGPS` ([firebase-rtdb.js:469](js/firebase-rtdb.js#L469)) | Niente altri canali di realtime |
| **GF status di un place** | Cache localStorage gestita da `gfDetector.js` | `GlutenFreeDetector` ([js/services/gfDetector.js:200](js/services/gfDetector.js#L200)) | Mai dedurre GF da review parsing inline |

### 8.2 Compromessi accettati (consapevoli)

Cose che **sembrano bug** ma sono scelte. Se vuoi cambiarle, è una decisione di prodotto.

| Compromesso | Perché | Quando rivedere |
|---|---|---|
| **Broker MQTT pubblico** (`broker.emqx.io`, no auth, no TLS-client-auth) | App "tra amici", zero signup. Vedi memoria: *"al momento, è un'app tra amici"* | Quando l'app esce dalla cerchia → attivare E2EE via [encryption.js](js/encryption.js) §6.7 |
| **Nessuna E2EE sui messaggi gruppo** | Stesso motivo. Il broker pubblico vede tutto il traffico | Stesso trigger di sopra |
| **Conflict resolution silenziosa** (last-write-wins per field con vector clock) | Gli amici discutono in chat se serve. UI di conflict resolver non vale il costo oggi | Quando ci sono >2 utenti che editano in contemporanea regolarmente |
| **`app-core.js` monolitico** (12'878 LOC) | Refactor costa ~3gg + rischio regressioni. Lo smoke test copre i flussi ma non i casi border | Quando un PR su app-core rompe regolarmente flussi non correlati |
| **`legacy-skin.css` ancora caricato** (3'545 LOC) | Fornisce struttura componenti che `modern-2026.css` ripinta. Rimuoverlo significa migrare ogni componente | PurgeCSS guidato prima di una release pubblica |
| **OpenLayers caricato sempre** (CDN, ~150KB) | Semplicità. La vista map è quella di default → caricarla lazy salverebbe poco | Se il TTI mobile scende sotto target |
| **Onboarding solo IT** | App per amici italiani. Il fallback IT non rompe en/ja, solo non li ottimizza | Quando il primo non-italiano usa l'app |
| **`fase2-tappa-flow.js` + `itinerary-ui.js` ancora in `<script>`** | Caricati ma morti. Rimuovere richiede confidenza che davvero nessun handler runtime li chiami | Eseguire smoke + un giro manuale dei 4 tab dopo aver tolto i due `<script>` |

### 8.3 Stato di maturità dei moduli critici

Tabella focalizzata sui **moduli ad alto impatto** (un loro malfunzionamento si vede ovunque).

| Modulo | Stabile? | Test? | UI completa? | Note di rischio |
|---|:---:|:---:|:---:|---|
| `state.js` (persist + schema v2) | ✅ | smoke | ✅ | Bug qui = perdita dati utente |
| `i18n.js` (dict + applyStatic + t) | ✅ | smoke (it/en/ja) | parziale | Mancano onboarding/toast — fallback IT non rompe nulla |
| `itinerary.js` (CRUD + optimize + routing + budget) | ✅ | smoke | ✅ | Cuore del prodotto. `optimizeDay` è greedy (nearest-neighbor) — non ottimo ma deterministico |
| `itinerary-unified.js` (renderer canonical) | ✅ | smoke | ✅ | OK |
| `itinerary-add-wizard.js` (wizard 3-step) | ✅ | smoke (wizardRender) | ✅ | OK dopo le iterazioni recenti |
| `routing.js` (`estimateFare` etc.) | ✅ | none | n/a | **Stime euristiche** — non sono Google Directions. Errore tipico ±30% sulla tariffa. Non chiamarle "verità" |
| `firebase-rtdb.js` (MQTT) | ✅ | manuale | ✅ | Dipende da broker pubblico → vulnerable a downtime esterno |
| **CRDT merge** (`mergeGroupItinerary` [app-core.js:838](js/app-core.js#L838)) | ✅ | E2E 8 step (conflict-resolver-ui) | ✅ | **Gap risolto il 2026-05-26**: [js/conflict-resolver-ui.js](js/conflict-resolver-ui.js) wrappa il merge estraendo i conflict reali, li mostra in panel con override "↩️ Tieni la mia". Last-write-wins è il default; l'utente può sovrascriverlo selettivamente |
| **Audit log** (`addTappaAuditEntry` [app-core.js:303](js/app-core.js#L303)) | ✅ scrive + ✅ legge | nessuno | ✅ | **Gap risolto il 2026-05-26**: [js/audit-log-viewer.js](js/audit-log-viewer.js) aggrega `modificationHistory` di tutte le tappe degli itinerari di gruppo in una timeline cronologica. UI accessibile dal bottone "📜 Cronologia" nel pannello gruppo |
| **Undo/Redo** ([app-core.js:1021-1112](js/app-core.js#L1021)) | ✅ | E2E 8 step (undo-redo) | ✅ | Gruppo: bottoni in `group-panel.js`. **Personale: risolto il 2026-05-27** con [js/itinerary-undo-redo.js](js/itinerary-undo-redo.js) — wrappa i mutator ITINERARY, bottoni in vista itinerario + Ctrl/Cmd+Z |
| **Offline queue + replay** ([app-core.js:1534](js/app-core.js#L1534)) | ⚠️ | nessuno | parziale | Funziona solo con app in foreground. Background sync API non integrata |
| **Itinerary version history** ([app-core.js:2473](js/app-core.js#L2473)) | ✅ scrive | nessuno | ✅ | **Gap risolto il 2026-06-02**: [js/views/itinerary-version-history.js](js/views/itinerary-version-history.js) — timeline snapshot con "📷 Versioni" nel pannello gruppo, bottone "Ripristina" per ogni checkpoint. Auto-snapshot pre-ripristino via `ItinerarySnapshots.saveAuto`. |
| **Soft-delete POI** ([app-core.js:2393](js/app-core.js#L2393)) | ✅ | nessuno | parziale | Esiste, ma il cleanup automatico (`cleanupSoftDeletedPOIs`) non ha trigger noto |
| `google-places-loader.js` | ✅ | smoke (36 POI) | ✅ | Dipende da `api/googlePlacesNearby` → richiede env Vercel |
| `services/gfDetector.js` | ✅ | nessuno | ✅ | Cache locale → un place "diventato GF" non lo sa finché non scade |
| Panel manager `y2k-windows.js` | ✅ | smoke (panelOpen) | ✅ | API contract preservato (`window.y2kWindows.open/close/closeAll`) |

### 8.4 Candidati alla rimozione

> Protocollo applicato: grep esaustivo dei chiamanti → baseline smoke → rimuovere `<script>` →
> smoke post → solo se 9/9 + 0 pageErrors, eliminare file fisico → bump SW cache. **Mai rimuovere a freddo.**

**Già rimossi** (tutti recuperabili da git):

| File rimosso | LOC | Data | Verifica fatta | Esito |
|---|---:|---|---|---|
| ~~`js/itinerary-ui.js`~~ | 357 | 2026-05-26 | `renderItineraryViewNew` chiamato solo da se stesso | ✅ smoke 9/9, 0 errori |
| ~~`js/fase2-tappa-flow.js`~~ | 561 | 2026-05-26 | `window.TappaFlow` mai usato esternamente | ✅ smoke 9/9, 0 errori |
| ~~`js/wizard-integration.js`~~ | 243 | 2026-06-02 | Mai caricato in index.html; funzionalità coperta da wizard inline in app-core.js | ✅ nessun chiamante |

**Totale rimosso: 1'161 LOC (4.5% del JS pre-cleanup).**

**Candidati rimanenti** (richiedono lavoro più mirato):

| Candidato | LOC | Perché rimuovere | Lavoro richiesto |
|---|---:|---|---|
| Sezione legacy `renderItineraryView` in app-core.js (~riga 7700) | ~470 | Dispatcher principale punta già a `renderItineraryUnified`. Le chiamate interne nel monolite andrebbero reindirizzate | Refactor delicato: branch dedicato, sostituire ogni chiamata interna, smoke + giro manuale completo |
| ~~`js/google-places-debug.js` gate~~ | ~~343~~ | ~~Utile in dev, pesa in prod~~ | **Fatto il 2026-05-26**: loader condizionale `?debug=1` in [index.html](index.html). Asset caricato solo on-demand |
| Blocchi `console.log` in `app-core.js` | variabile | Rumore in prod | `grep -c "console.log"` → wrappare in `if (window.DEBUG) console.log(...)` |

### 8.4-bis Extraction da app-core in corso (piano §8.5 step 1)

**Estratto il 2026-05-26**:

| Originale (in app-core) | Nuovo file | LOC | Note |
|---|---|---:|---|
| `renderTipsView` (~riga 8230) | [js/views/tips-view.js](js/views/tips-view.js) | 92 | 🟢 Canonical. **Collegata al menu** come "🌸 Tips Viaggio 2027" + i18n |
| `renderSOSPanel` + 4 helper (~riga 10930) | [js/views/sos-view.js](js/views/sos-view.js) | 194 | 🟢 Canonical. **Bug pre-esistente risolto**: copyToClipboard/showMedicalCard/downloadMedicalCard/openGoogleMaps non erano su window → onclick HTML non funzionanti. Ora globali |
| `renderBookingsView` (~riga 9814) | [js/views/bookings-view.js](js/views/bookings-view.js) | 60 | 🟢 Canonical. POI con prenotazioni TableCheck/Tabelog/sito/telefono |

**Bilancio extraction**: app-core.js −411 LOC aggiuntivi il 2026-06-02 (budget cluster: CURRENCIES, EXPENSE_CATEGORIES, getBudgetDB, saveBudgetDB, convertCurrency, getTotalSpent, getSpentByCategory, renderBudgetView → [js/views/budget-view.js](js/views/budget-view.js)). **5/10 viste estratte** (tips/sos/bookings/gallery/budget). Stub locale in app-core delega a `window.renderBudgetView`. Smoke 15/15, 0 pageErrors. La 4ª (gallery, 2026-05-29) verificata con visual regression (hash identici).

**Esposizioni window.* aggiunte per facilitare le prossime estrazioni**:
- `window.CATS` (mappa categorie → label/icon) — riga 183 di app-core
- `window.CITY_COORDS` (coordinate città giapponesi) — riga 198 di app-core
- `window.sheetBody` (riferimento al DOM panel) — riga 4917 di app-core
- `window.haversineKm`, `window.fmtDist` (utility distance) — dopo le definizioni
- `window.debounce` (debounce util) — dopo la definizione
- `window.renderGFList` (lista GF risultati) — esposta in coda alla funzione
- (già esposte da prima: `allPOIs`, `openSheet`, `closeSheet`, `openPOI`, `getPoiDisplayName`, `toast`, `t`)

**Viste rimanenti** (con stato deps **aggiornato** al 2026-06-02):

| Vista | LOC stimato | Blocchi all'estrazione |
|---|---:|---|
| `renderListView` | ~419 | **7+ deps interne** (addToItinerary, isInItinerary, removeFromItinerary, searchGooglePlaces, showAddItineraryDialog, showGooglePlacesResults, exportItineraryWhatsApp). Probabilmente **deprecabile** in favore di `renderItineraryUnified` |
| `renderShoppingView` | ~ | dipende da `shoppingCache` (mutable closure), `loadVintageShopsForCity` (50+ LOC) |
| ~~`renderBudgetView`~~ | ~~—~~ | ✅ **Estratto il 2026-06-02** → [js/views/budget-view.js](js/views/budget-view.js). Cluster completo (CURRENCIES, EXPENSE_CATEGORIES, getBudgetDB, convertCurrency, ecc.), stub in app-core. −411 LOC |
| ~~`renderGalleryView`~~ | ~~~150~~ | ✅ **Estratto il 2026-05-29** → [js/views/gallery-view.js](js/views/gallery-view.js) |
| `renderGFView` | ~420 | è un **cluster GF** con `allGlutenFreeShops` mutable (dichiarata sotto renderGroupView), `loadGlutenFreeShopsForCity`, `renderGFList`, `openGFDetail`, `GF_RESTAURANTS`, `FMGF_CITY_URLS` — estrarre tutto insieme (~riga 9076–11100) |
| `renderWeatherView` + `renderWeatherModal` + 4 helper | ~340 | le 4 helper (`fetchWeatherData`, `getWeatherIcon`, `getWeatherConditionName`, `fetchWeatherHourly`) sono usate in **15+ punti** del monolite (widget meteo, GPS, ecc.) — non è un cluster pulito |
| `renderGroupView` | ~ | la più grande/intricata — CRDT, members, sharing |

**Lezione appresa il 2026-05-26**: dopo le prime 3 estrazioni "facili" (tips/sos/bookings), le viste rimanenti
richiedono **cluster extraction** (estrarre la view E le sue dipendenze internal insieme), non semplici copy/paste.
Per ognuna serve un mini-progetto: identificare il cluster minimo coerente, esporre le internals come API window.*,
spostare il blocco intero. Stima: ~3-5 ore per cluster.

### 8.5 Rischio sistemico principale: `app-core.js`

Vale la pena ripeterlo a parte. Questo file (12'878 LOC, ~50% del JS totale) contiene:
mappa, panel manager wrapper, `openSheet`/`openPOI`, CRDT merge, sync gruppo, undo/redo,
sharing personali↔gruppi, audit log, soft-delete, opening hours, version history, **tutti
i render*View tranne l'itinerario** (`renderListView`, `renderTipsView`, `renderWeatherView`,
`renderBudgetView`, `renderGalleryView`, `renderGFView`, `renderBookingsView`, `renderShoppingView`,
`renderGroupView`, `renderSOSPanel`), `renderMarkers`, `renderFilters`, `class GestureDetector`,
deep link handler, e un wizard inline che convive col wizard separato.

Conseguenze concrete:

- Una modifica al rendering di una vista può causare regressioni nei flussi sync o CRDT
  perché condividono closure-scope.
- Bug di un dominio sono difficili da rintracciare con grep (es: "perché il giorno 0 non
  si refresha?" → potrebbe essere in 5 punti diversi del file).
- Lo smoke test cattura i flussi happy-path ma non l'interazione tra sezioni distanti.

**Priorità di refactor proposta** (in ordine di valore/rischio):

1. **Estrarre i 10 `render*View`** in `js/views/<nome>.js` mantenendo `window.<render*View>` come
   public API. **Rischio basso**, valore alto (file principale scende a ~8k LOC).
   **Status: in corso (5/10)**: `tips-view.js` ✅, `sos-view.js` ✅, `bookings-view.js` ✅,
   `gallery-view.js` ✅ (2026-05-29, con rete di sicurezza visual regression),
   `budget-view.js` ✅ (2026-06-02, −411 LOC). Rimanenti:
   `renderListView` (legacy, deprecabile), `renderWeatherModal/View`,
   `renderGFView` (cluster GF, ~riga 9076–11100), `renderShoppingView` (cluster shopping), `renderGroupView`.
   **Nota metodologica**: dal 2026-05-29 le estrazioni usano `npm run visual` come rete di sicurezza
   (hash identici pre/post = zero regressioni visive garantite).
2. Estrarre il blocco CRDT (`mergePOIFields`, `mergeGroupItinerary`, `addTappaAuditEntry`, ecc.)
   in `js/crdt.js`. Rischio medio.
3. Estrarre lo sharing (`syncPersonal*`, `markItinerarySharedWithGroup`, request/accept unshare)
   in `js/sharing.js`. Rischio medio.
4. Estrarre il wizard inline (~5900/~6440) e fonderlo con `itinerary-add-wizard.js`. Rischio alto
   — sono due wizard separati che fanno cose simili ma non identiche.

Dopo (1)+(2)+(3): app-core scende a ~6k LOC e diventa veramente "il dispatcher + il setup mappa".

---

*Documento generato il 2026-05-26. Aggiornare LOC e righe-target se modifichi file >5%
o sposti funzioni di rilievo. Per §8: ricontrollare canonical vs legacy con grep dopo
ogni refactor importante (le etichette diventano stale facilmente).*
