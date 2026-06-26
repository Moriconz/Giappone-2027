# 🧭 Tabi (旅) — Travel Itinerary Planner

**PWA mobile-first, local-first, per pianificare itinerari di viaggio in qualsiasi parte del mondo** — con tempi e distanze reali tra le tappe, budget multi-valuta (preventivo vs consuntivo), collaborazione di gruppo in tempo reale, e una **guida gluten-free opzionale** (eredità del progetto, nato come app celiaci per il Giappone).

> Tabi tratta **tempo e denaro come quantità calcolate**, non come note: ti dice quando una giornata è troppo densa e quanto stai sforando il budget — non solo *cosa* vedere.

---

## Cos'è

Tabi non è una travel app generica. È un **planner**: costruisci itinerari giorno-per-giorno, e l'app calcola tempi/distanze tra le tappe, avvisa quando una giornata è irrealistica, e riconcilia costi preventivati e reali in multi-valuta. Funziona **offline** e gira **interamente lato client** (nessun account obbligatorio). La collaborazione di gruppo (chat, GPS live, spese condivise, editing itinerario) è P2P via MQTT.

Heritage: il progetto è nato come **SafeEats** (guida ristoranti gluten-free in Giappone) ed è stato globalizzato. Il layer gluten-free e i moduli specifici-Giappone (JR Pass, calendario festività) restano disponibili ma sono **opzionali**.

---

## Feature principali

### 🗺️ Itinerario
- Struttura **trip → giorni → tappe**, drag-and-drop per riordinare.
- **Tempi e distanze tra tappe** per mezzo (`routing.js`: Google Distance Matrix con fallback haversine + cache 24h), mostrati inline come riga "↳ spostamento".
- **KPI visite vs spostamenti** + **warning "giornata troppo densa"** (carico > 12h) nell'intestazione di ogni giorno.
- **Ottimizzatore del giro** (raggruppa per prossimità, meno spostamenti), per-giorno e per-trip.
- **Snapshot** dell'itinerario personale (versioni con nome), **undo/redo** di sessione.
- **Suggerimenti tempo libero**: POI vicini al baricentro del giorno non ancora in itinerario.

### 💰 Budget
- **Multi-valuta**: valuta di casa derivata dal locale del browser (it→EUR, en→USD, ja→JPY…), cambio live da `open.er-api.com` (free), unità canonica interna JPY.
- **Preventivo vs consuntivo**: budget per categoria/totale vs speso reale, % e residuo, alert sforamento.
- **Spese di gruppo** con split e settle-up.

### 👥 Collaborazione realtime (P2P, zero backend)
- **Transport MQTT** over WebSocket (`broker.emqx.io`, zero config) — `js/mqtt-transport.js`, API `window.peerGPS` / `window.peerBroadcast`.
- **Chat di gruppo** con notifiche push e storia locale.
- **GPS live** tra membri (star topology, sync ~5s, heartbeat anti-ghost, WakeLock).
- **Pannello gruppo** (membri, toggle GPS, exit/delete room), **inviti via deep-link**.
- **Editing itinerario condiviso** con merge **CRDT** (last-write-wins, vector clock) + UI di **review conflitti**.
- **Presence live** ("chi sta guardando/editando ora").
- **E2EE leggera** della stanza (AES-256-GCM, chiave derivata dal codice stanza — `room-crypto.js`).
- Sync cross-tab locale via **BroadcastChannel** (`group-sync.js`).

### 🌾 Guida Gluten-Free (layer opzionale)
- Ricerca shop/ristoranti GF **per città** (live, globale, via Google Places/Custom Search).
- `gfDetector` (analisi safety GREEN/YELLOW/RED su qualsiasi POI), **heatmap**, **wishlist**, **crowdsource**, **foto menu**.
- **Toggle on/off** dal menu (default ON, eredità del progetto): da spento nasconde tab e layer GF.

### 🗺️ Mappa
- OpenLayers 8 + tile **ArcGIS World Street Map** (globali), cluster marker, route del giorno, layer GF/shopping/GPS.
- **Vista globale persistente**: la mappa riapre dove l'hai lasciata, ovunque nel mondo (Giappone solo come default al primo avvio).

### 🧰 Altro
- Meteo (open-meteo), foto/galleria (IndexedDB), backup/restore JSON, POI custom, onboarding guidato, ricerca globale, risparmio batteria.
- **Plugin Giappone**: calcolatore convenienza **JR Pass**, hint **calendario festività** giapponesi (lazy-load).
- **AI** (Groq via serverless): analisi menu/foto per stima gluten-free.
- **PWA**: installabile, offline-first (service worker network-first per l'app shell).
- **i18n**: 🇮🇹 IT · 🇬🇧 EN · 🇯🇵 JA.

---

## Novità recenti (giugno 2026)

| Area | Modifica |
|---|---|
| **Globalizzazione** | Mappa persiste worldwide (no più centro fisso Giappone); valuta default dal locale; gluten-free demoto a **layer opzionale** con toggle |
| **Itinerario** | Nuovo **KPI visite/spostamenti** + badge **"giornata molto densa"** per giorno |
| **Snellimento collab** | Rimosso `itinerary-phase5.js` (247 righe, sottosistema delta/batch/metrics mai cablato); trim di 3 funzioni morte in `itinerary-phase4.js`. **Zero funzioni perse.** |
| **Pulizia nomi** | `firebase-rtdb.js` → **`mqtt-transport.js`**, `rtdbBroadcast` → **`peerBroadcast`**, log `[RTDB]` → `[MQTT]` (nessun Firebase: il transport è sempre stato MQTT) |

---

## Stack tecnico

| Layer | Tecnologia | Note |
|---|---|---|
| Frontend | **Vanilla JS** (no framework, no build) | ~90 script `defer`, moduli pesanti lazy-loaded |
| Mappa | **OpenLayers 8.2** + tile ArcGIS | global, free |
| POI / ricerca | **Google Places** + Nominatim (reverse-geocoding fallback) | via serverless `api/` |
| Routing tempi | Google Distance Matrix + **haversine fallback** | cache 24h |
| Realtime | **MQTT/WebSocket** (`broker.emqx.io`) + BroadcastChannel | P2P, zero signup |
| Storage | **localStorage** (stato) + **IndexedDB** (foto) | local-first, ~5MB quota |
| Cambi valuta | open.er-api.com | free, no key |
| Meteo | open-meteo | free |
| AI | **Groq** (serverless) | analisi menu/immagini GF |
| Cache server | Upstash Redis KV | `api/lib/kv-cache.js` |
| Hosting | **Vercel** (statico + serverless `api/`) | CSP in `vercel.json` |

---

## Struttura del progetto

```
index.html                  shell PWA (~278 righe): meta, CSP, link CSS, <script> defer
sw.js                       service worker (offline, network-first app shell)
manifest.webmanifest        config PWA
vercel.json                 routing + header sicurezza + CSP

css/
  base.css components.css glass.css safety.css legacy-skin.css
  modern-2026.css           tema moderno (caricato per ultimo)
  apple-glass.css           skin liquid-glass (vince la cascade)

js/
  app-core.js               controller: dispatcher + init mappa + stato (432 righe)
  app-boot.js               bootstrap install PWA
  app-startup.js            polling pannelli, push, deep-link, sync init
  app-navigation.js         routing viste
  state.js                  stato globale (localStorage) + helper isGFEnabled/applyGFVisibility
  i18n.js                   it/en/ja
  mqtt-transport.js         ⭐ transport MQTT P2P (window.peerGPS / peerBroadcast)
  room-crypto.js            E2EE AES-256-GCM stanza
  group-*.js                chat, panel, sync, expenses, checklist, invite
  live-presence.js          presence "chi è online/editando"
  itinerary.js              dati itinerario (state.itineraryByDay)
  itinerary-unified.js      vista itinerario (render giorni/tappe/KPI)
  itinerary-crdt.js         merge CRDT del gruppo
  conflict-resolver-ui.js   review conflitti CRDT
  itinerary-snapshots.js    versioni personali
  itinerary-undo-redo.js    undo/redo personale
  routing.js                tempi/distanze tra tappe
  google-places-*.js        POI da Google Places
  gf-*.js / services/gfDetector.js   layer gluten-free
  views/                    viste estratte (budget, list, gf, group, timeline, …)
  jr-pass-calculator.js / japan-calendar-hints.js   plugin Giappone (lazy)

api/                        serverless Vercel (chiavi via process.env)
  googlePlacesNearby.js googlePlacesDetails.js placePhoto.js reverseGeocode.js
  groqAnalyze.js groqImageAnalyze.js analyzeGlutenFree.js enrichPOI.js
  searchGlutenFreeShops.js searchVintageShops.js searchGooglePlacesPhotos.js
  lib/kv-cache.js           cache Upstash Redis
```

---

## Modello dati (localStorage `state`)

```js
state = {
  itineraryByDay,      // { 0: [ {poi_id, poi_name, time, duration, cost, notes,
                       //          route_from_prev:{distance_km,duration_min,mode,cost}} ] }
  itinerary,           // itinerario condiviso (gruppo)
  groupItineraries,    // itinerari CRDT del gruppo (versionati)
  tripProfile,         // { days, startDate, groupSize, interests, diet, budget_total }
  group,               // { roomId, myName, myAvatar, members, createdByName }
  customEvents,        // POI custom
  gpsTrack, gpsCurrentLat, gpsCurrentLng,
  userCategoryOverrides, savedPOIs
}
// Chiavi separate: BudgetDB (budget+spese), gfEnabled, gj2027_map_view (vista mappa),
//                  giappone2027_snapshots_v1 (snapshot), homeCurrency
```

---

## Quick start

### Locale (dev)
```bash
git clone https://github.com/Moriconz/Giappone-2027.git
cd Giappone-2027
python3 -m http.server 8080
# apri http://localhost:8080
```
> ⚠️ Le funzioni `api/` (Google Places, Groq) sono serverless Vercel: in locale con un server statico **non girano**, quindi ricerca POI / GF / AI degradano. Tutto il resto (itinerario, budget, mappa, gruppo, offline) funziona.

### Deploy (Vercel)
Deploy come progetto statico + serverless `api/`. Imposta le **env var**:

| Variabile | Uso |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Places, Distance Matrix, foto |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` + `GOOGLE_CUSTOM_SEARCH_CX` | ricerca shop GF / vintage |
| `GRO_API_KEY` | Groq AI (analisi menu/foto) |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | cache Upstash Redis |

### Mobile (PWA)
Apri su **HTTPS** → iOS: Condividi → "Aggiungi a Home"; Android: Menu → "Installa app".

---

## Script & test

```bash
npm run smoke        # smoke test e2e (richiede server su :8080 → python3 -m http.server 8080)
npm run lint:i18n    # verifica chiavi i18n
npm run visual       # regressione visiva (puppeteer)
```
Check rapido sintassi: `node --check js/<file>.js`.

---

## Limiti noti & note

- **"Free" parziale**: Google Places / Distance Matrix / Groq sono a pagamento (free-tier con quota, gestita da `api-quota.js` + cache Redis). Mappa, routing-fallback, budget, cambi, meteo e collaborazione MQTT sono invece davvero gratuiti.
- **Routing transit reale** (orari mezzi pubblici): non disponibile gratis a livello globale → i tempi sono stime (Distance Matrix dove c'è quota, altrimenti haversine × velocità media).
- **Broker MQTT pubblico**: dipende da `broker.emqx.io` (downtime esterno possibile; fallback HiveMQ/Mosquitto previsto in `mqtt-transport.js`).
- **localStorage ~5MB**: con tanti dati può saturare → export/backup JSON consigliato.

---

## Roadmap / cosa manca

- [ ] **Vault biglietti completo**: stati (prenotato/pagato/usato/scaduto), file/PDF in IndexedDB, reminder legati alla tappa (oggi: solo link-prenotazione per POI + promemoria base).
- [ ] **Cambio FX congelato per spesa** (oggi: un unico cambio live).
- [ ] **Opzione gluten-free nell'onboarding** (oggi: toggle dal menu, default ON).
- [ ] **Plugin destinazione gated**: caricare JR Pass / calendario Giappone solo se il viaggio è in Giappone.
- [ ] **Consolidamento moduli itinerario** (oggi ~16 file per feature) — refactor a basso rischio, da fare con trace dei caller.
- [ ] **Vista "Oggi" da campo** (in corso: `views/timeline-view.js`).
- [ ] Migrazione ricerca → Nominatim/Overpass se si vuole un free-tier 100% (oggi Google Places).

---

## Crediti

OpenLayers · MQTT.js + EMQX · Google Places · Groq · Upstash · open-meteo · open.er-api.com · Nominatim/OpenStreetMap · FindMeGlutenFree · Service Workers.

## Licenza & autore

MIT. **Moriconz** — riccardo.moriconz@gmail.com · 📸 [@riccardo_moricone](https://instagram.com/riccardo_moricone)

---

*Tabi 旅 — pianifica viaggi che stanno davvero in piedi.*
