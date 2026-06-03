# Giappone 2027 / SafeEats — Analisi completa & Piano di intervento

> Analisi prodotta il **2026-05-24**. Documento canonico: sostituisce i ~60 `.md` storici sparsi nel repo (archiviati in `docs/archive/`).
> Direzione lavoro decisa con l'utente: **(1) UI modernizzata pulita 2026** (via il look Y2K), **(2) refactor aggressivo del monolite**, **(3) pulizia totale del repo**.

---

## 1. Riassunto — cos'è l'app

PWA mobile-first ("SafeEats — Giappone 2027") che fa da **compagno di viaggio** per un viaggio in Giappone. Funzioni principali:

| Area | Cosa fa | File chiave |
|------|---------|-------------|
| **Mappa** | Mappa interattiva OpenLayers con marker POI, GPS, blur quando si aprono i pannelli | inline in `index.html` (`new ol.Map`, riga ~4867) |
| **Gluten-Free finder** | Trova/valida ristoranti GF, schede allergie, "mostra al cameriere", analisi foto menu via AI | `js/gf-*.js`, `js/services/gfDetector.js`, `css/safety.css` |
| **Itinerario** | Pianificazione multi-giorno: wizard aggiunta tappa, riordino, budget dinamico, routing tra tappe, validazioni | `js/itinerary*.js`, `js/routing.js`, `js/budget-widget-helper.js` |
| **Gruppi realtime** | Condivisione itinerario/chat in tempo reale tra viaggiatori | `js/group-*.js`, `js/firebase-rtdb.js`, MQTT |
| **AI** | Analisi gluten-free, arricchimento POI, analisi immagini (TensorFlow + MobileNet, Groq, Gemini) | `js/features-ai.js`, `api/groq*.js`, `api/enrichPOI.js` |
| **Foto** | Galleria POI, foto Google Places | `js/poi-photo-gallery.js`, `api/*Photos.js` |
| **Meteo** | Widget previsioni (Open-Meteo) | `js/features-weather.js` |

**Stack**: frontend statico (HTML/CSS/JS vanilla, niente build step) + **Vercel serverless** (`api/*.js`, chiavi via `process.env`) + PWA (service worker `sw.js`, manifest). Persistenza: `localStorage` (`window.state`, single source of truth in `js/state.js`). Mappe: OpenLayers 8.2. Realtime: MQTT + Firebase RTDB.

**Architettura UI (importante)**: l'app usa nativamente un sistema di **bottom-sheet** (`openSheet()`/`closeSheet()` definiti in [index.html:6048](index.html#L6048), elemento `.sheet`). Sopra c'è un layer **Y2K** (`js/y2k-windows.js`) che fa *monkey-patch* di `openSheet` per trasformare le sheet in **finestre retro trascinabili**. Il layer è puramente additivo → rimuoverlo fa tornare l'app alle bottom-sheet native (pattern mobile corretto).

---

## 2. Stato di salute — sintesi

| Categoria | Voto | Note |
|-----------|------|------|
| Funzionalità | 🟢 Ricca | Tante feature, molte già funzionanti |
| Integrità repo | 🔴 Critica | File principali erano **cancellati**, venv committata, 60+ doc, backup giganti |
| Architettura codice | 🟠 Fragile | Monolite `index.html` 14.002 righe, ~14 JS orfani, CSS in conflitto |
| UI/UX | 🟠 Incoerente | Doppia identità (Y2K vs moderno), stili inline+hardcoded, finestre retro poco usabili su mobile |
| Performance | 🟠 Migliorabile | ~1.5MB di TF.js/MobileNet caricati eager, blur pesanti, 1405 `console.*` |
| Sicurezza | 🟢 Buona | Nessun secret hardcoded, chiavi server-side via `process.env`, header di sicurezza in `vercel.json` |
| Accessibilità | 🔴 Scarsa | Bottoni-icona senza label, focus states deboli, contrasto incerto su alcuni layer |

---

## 3. Feature/criticità DA CONTROLLARE / SISTEMARE / AGGIORNARE

### 🔴 Critiche (rompono o degradano l'app)
1. **File principali cancellati dal working tree** — `index.html`, `README.md`, `CHANGELOG.md`, `js/group-chat.js`, `js/y2k-windows.js`, `y2k-override.css` ecc. erano cancellati (ma presenti in git). L'app non poteva girare. → **RIPRISTINATI** all'inizio di questa sessione.
2. **`venv/` Python committata** nel repo (centinaia di file, pesante e inutile in un progetto frontend). → da rimuovere dal tracking + `.gitignore`.
3. **Backup giganti committati**: `index.html.SPRINT1_BASE` (446KB), `index.html.SPRINT1_DONE` (446KB), `index.html.backup` (261KB), cartella `backup/`. → rimuovere (restano in cronologia git).
4. **Riferimenti commentati a file inesistenti** ([index.html:1073-1076](index.html#L1073): `poi-sync.js`, `poi-verified-db.js`, `poi-viewport-sync.js`, `test-poi-sync.js`). → rimuovere.

### 🟠 Importanti (debito tecnico / qualità)
5. **Monolite**: blocco `<script>` inline da [index.html:1188](index.html#L1188) a ~13970 (~12.700 righe) + 2 blocchi `<style>` (~550 righe). Ingestibile, lento da caricare/parsare. → estrarre in file esterni.
6. **~14 file JS orfani/duplicati** non referenziati: `budget.js`, `budget-module.js`, `chat-module.js`, `core.js`, `gallery.js`/`gallery-module.js`, `map.js`/`map-module.js`, `group-panel-module.js`, `gf-photo-upload.js`, `gf-safety.js`, `gf-verification-validator.js`, `show-to-waiter.js`, `sentry-init.js`, `chunk-parts-loader.js`. → rimuovere i morti.
7. **CSS in conflitto su 6 layer** (`components.css`, `glass.css`, `safety.css`, `y2k-override.css` 3545 righe, `y2k-glassmorphism-overlay.css` orfano 526 righe, + 550 righe inline) pieni di `!important` e selettori-hack `div[style*="linear-gradient(...)"]`. → consolidare in un design system.
8. **Stili inline + colori hardcoded ovunque** (#FF1493, #FFE5B4, gradient inline) mescolati a `var(--token)`. Tema incoerente.
9. **1405 `console.*`** (643 nei `js/`, 762 in `index.html`) → spam in produzione, va dietro un flag di debug.
10. **~60 file `.md` storici** ridondanti (analisi, sprint, fix-session, report duplicati). → consolidare/archiviare.
11. **File di sviluppo committati**: `graph.html/json`, `viz.html`, `graphify-out/`, `index-simple.html`, `debug-list.html`, `install-diagnostic.html`, `WEATHER_PREVIEW.html`. → rimuovere.

### 🟡 Da migliorare (UX / perf / a11y)
12. **Performance caricamento**: `@tensorflow/tfjs@4.12` + `mobilenet@2.1` (~1.5MB) caricati **eager** in `<head>` su ogni avvio, anche se servono solo per l'analisi foto. → lazy-load on-demand.
13. **`backdrop-filter: blur()` pesante** su molte superfici → costoso su mobile. Il modern theme lo riduce.
14. **Accessibilità**: bottoni-icona della nav senza `aria-label`, niente focus-visible coerente, tap target da verificare a 360px.
15. **Finestre Y2K trascinabili**: poco usabili su telefono (constraint, resize manuale). → sostituite da bottom-sheet moderne.
16. **Service worker / cache**: verificare versioning cache e che non serva asset rimossi.
17. **Meta/PWA polish**: theme-color, viewport-fit per notch, og/twitter tags.

---

## 4. Aggiornamenti FONDAMENTALI da aggiungere

- **Design system 2026 unico** (`css/modern-2026.css`): token coerenti (colore/tipografia/spaziatura/raggi/ombre/motion), tema dark flat moderno, rimappa i legacy `--y2k-*` così nulla si rompe.
- **HTML come shell sottile**: CSS e JS inline estratti in file (`css/base.css`, `js/app-core.js`) → monolite navigabile e cacheable.
- **Logger gated** (`window.DEBUG`) al posto dei `console.*` sparsi.
- **`.gitignore` serio** (venv, node_modules, .DS_Store, backup, *.SPRINT*).
- **Caricamento performante**: lazy-load librerie AI pesanti, `defer` sugli script, riduzione blur.
- **Pass accessibilità**: `aria-label` su icon-button, `:focus-visible`, contrasto, `prefers-reduced-motion`.
- **Documentazione consolidata**: un `README.md` aggiornato + questo `ANALISI_2026.md`; storici in `docs/archive/`.

---

## 5. Esecuzione (sessione 2026-05-25) — FATTO

1. ✅ **Ripristino file cancellati** — `index.html` (14k righe) + README + JS riportati da git; app non più rotta.
2. ✅ **Report** (questo documento).
3. ✅ **Pulizia repo**: `.gitignore` serio; `venv/` non più tracciata; **43 file morti rimossi** (backup giganti, dev-html, graph, 17 JS orfani/duplicati, CSS orfano); **61 `.md` storici archiviati** in `docs/archive/`; refs commentati rimossi. Root da 66 → 4 `.md`.
4. ✅ **Layer Y2K rimosso/sostituito**: `y2k-override.css` → `css/legacy-skin.css` (solo struttura). `y2k-windows.js` **riscritto** come panel-manager moderno (bottom-sheet/modal flat) mantenendo identico il contratto API (`window.y2kWindows`, classi `.y2k-win*`, id `y2kwin-*`, eventi `y2kwin_closed`, patch `openSheet`) → gruppo/chat/wizard NON rotti.
5. ✅ **`css/modern-2026.css`** — design system dark moderno: token, pannelli, nav, bottoni, input, card, chip, weather; rimappa i legacy `--y2k-*`; a11y (`:focus-visible`, `prefers-reduced-motion`, tap target 44px); blur ridotto.
6. ✅ **Refactor monolite**: estratti i blocchi inline → `css/base.css` (557), `js/app-boot.js` (454), `js/app-core.js` (~12.800). **`index.html`: 14.002 → ~205 righe**. Bonus: cascata CSS corretta (base prima di modern).
7. ✅ **Performance/qualità**: TF.js+MobileNet (~1.5MB) **lazy-load** on-demand; meta `color-scheme: dark` + `theme-color`/manifest allineati; **gating dei `console.log`** (1405 silenziati salvo `localStorage.DEBUG='1'` o `?debug`).
8. ✅ **Verifica statica**: 0 asset mancanti, sintassi di tutti i JS valida, CSS bilanciato, serve-test 200 su tutti i file chiave, 404 confermati sui file rimossi.

### ✅ Verifica runtime (Puppeteer / Chromium headless)
Aggiunto `smoke-test.mjs` (+ devDependency `puppeteer`). Carica l'app in Chromium, simula i flussi e cattura errori console/eccezioni/404.

**Risultato finale: 0 eccezioni JS, 0 errori console reali, TUTTI gli 8 flussi verdi** (con `/api` mockate per esercitarli in locale):

| Flusso | Esito |
|--------|-------|
| Init mappa OpenLayers (`.ol-viewport`) | ✅ |
| Pannelli: `openSheet`/`y2kWindows.open`/update-in-place/`closeAll` | ✅ |
| Caricamento POI (`/api/googlePlacesNearby` mock → 36 POI) | ✅ |
| Apertura dettaglio POI (`openPOI`) | ✅ apre con contenuto |
| Aggiunta a itinerario (`ITINERARY.addPOIToDay`, costo ¥1500) | ✅ |
| Budget (`calculateDayBudget`/`calculateTotalBudget`) | ✅ math corretta |
| Render itinerario | ✅ nessuna eccezione |
| Tema dark applicato + log gated | ✅ |

(Gli errori Google Places `501`/`vercel-analytics` in locale sono attesi: niente serverless/rete fuori da Vercel — mockati nel test.)

**7 bug PRE-ESISTENTI trovati e corretti** (confermati nel backup pre-refactor → NON introdotti dal refactor; erano mascherati a catena — fixando i primi sono emersi i successivi):
1. `group-sync.js` — `window.GROUP_SYNC` usato prima dell'assegnazione → eccezione abortiva lo script → `GROUP_SYNC` mai esposto → **sync itinerario di gruppo morto**. Fix: usa il `const` locale.
2. `filter-system.js` — typo `mapView` invece di `mapContainer` → **filtri di viaggio rotti**. Fix: rinominato.
3. `app-core.js` — overlay "Nessun POI" appeso a `#view-map` inesistente → **crash con 0 POI**. Fix: guardia + fallback `#map`.
4. `app-core.js` — `GestureDetector` bindava `handleLongPress` inesistente → costruttore in eccezione. Fix: rimosso bind morto.
5. `app-core.js` `openPOI` — `x.id.toString()` senza guardia (path "non trovato") crashava su id `undefined`. Fix: guardia.
6. `app-core.js` `openPOI` — `getElementById('save-poi').onclick` non guardato → **crash a ogni apertura POI**. Fix: guardia.
7. `app-core.js` `openPOI` — `getElementById('add-cal').onclick` non guardato → idem. Fix: guardia.

> Nota tecnica: i wiring 5-7 in `openPOI` giravano *prima* del render async dei contenuti (i vicini `stars`/`note` erano già guardati e skippavano in silenzio); la delega eventi reale è in `poi-detail-events.js`, quindi le guardie tolgono i crash senza perdita di funzionalità.

Per ri-eseguire: `python3 -m http.server 8080 &` poi `node smoke-test.mjs http://localhost:8080`.

> Resta consigliato un **check visivo manuale** (resa estetica delle ~30 schermate col tema nuovo): lo smoke-test verifica errori e flussi, non la bellezza pixel-per-pixel.

### Lavoro incrementale successivo (documentato, non fatto)
- Split di `app-core.js` (~12.800 righe) in moduli di feature.
- Eliminazione totale di `legacy-skin.css` riscrivendo i componenti in `modern-2026.css` (ora tenuto per non rompere ~30 schermate).
- Migrazione degli stili inline hardcoded (centinaia) verso i design token.
- Riduzione mirata dei `console.*` alla fonte.
