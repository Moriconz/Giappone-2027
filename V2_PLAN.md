# V2_PLAN — Tabi «Voxel Quest» (Fase 0, discovery)

> Output della Fase 0 del prompt V2. Nessun codice scritto. Attende approvazione.
> Fonti: HANDOFF.md v3.58, `.graphify/codebase-map.json`, grep diretto sui moduli, WebSearch plugin 2026, `get_cost` Higgsfield reali.

---

## 1. Stato di partenza (verificato)

- 29.639 righe JS su 89 moduli + 21 view. IIFE browser, `<script defer>`, niente bundler/ES modules.
- Stato: unico blob `localStorage['giappone2027_state_v1']` (`js/state.js`) — `game.*` si aggiunge qui, entra gratis in backup/restore (verificare `BACKUP_FIELDS` in `backup-restore.js` + `EXTRA_FIELDS` in `itinerary-snapshots.js`).
- Collaborazione: MQTT broker pubblici, CRDT LWW per campo (`itinerary-crdt.js`), trust model gruppo-amici confermato.
- Test: `npm run smoke` + `npm run lint:i18n` (446 chiavi it/en/ja) — restano i gate.
- `.graphify/codebase-map.json` esiste ma è **stale** (lista ancora `encryption.js`, rimosso in v3.51) — da rigenerare in F1, non bloccante.

## 2. Punti di aggancio eventi di gioco (mappati, con file:riga)

Pattern unico: **wrapper post-load su API globali**, identico a quello già collaudato da `itinerary-undo-redo.js` (`MUTATOR_LABELS`, righe 109-133, che intercetta per nome i metodi di `window.ITINERARY`). `game-events.js` fa la stessa cosa: zero modifiche alla logica esistente.

| Evento gioco | Aggancio | Tipo |
|---|---|---|
| Tappa creata/rimossa/riordinata | metodi `window.ITINERARY` (`js/itinerary.js:675`) + `addToItinerary`/`removeFromItinerary` (`js/app-core.js`) | wrap |
| Giorno completato | derivato: listener su eventi tappa → ricalcolo well-formed (orari+tempi+carico ≤12h) | derive |
| Spesa registrata | `window.GroupExpenses.add` (`js/group-expenses.js:211`) — XP per l'atto, MAI per importo | wrap |
| Biglietto collegato a tappa | `window.ITINERARY_TICKETS.addTicket` (`js/itinerary-tickets.js:71`) | wrap |
| Analisi GF eseguita | `window.analyzeGlutenFreeStatus` (`js/gf-analysis.js:217`) — solo contatore, GF fuori dalle meccaniche | wrap |
| Sync gruppo riuscito | CustomEvent già emessi: `itinerary_updated`, `personal_itinerary_synced`, `group_members_updated` (`js/mqtt-transport.js:142-472`) | listen |
| Foto salvata (utente) | gallery utente (`js/views/gallery-view.js` / `poi-photo-gallery.js`) — nota: `features-photos.js` è ricerca foto Google, NON foto utente; hook esatto da confermare in F1 | wrap |
| Check-in / timbro / passi | non esistono oggi → moduli nuovi (`checkin.js`, `stamp-hunt.js`, `steps.js`) | new |

## 3. Plugin Capacitor (verifica 2026)

| Funzione | Scelta | Motivo |
|---|---|---|
| Passi (HealthKit/Health Connect) | **@capgo/capacitor-health** | Unico cross-platform attivamente mantenuto (Health Connect, non Google Fit morto); versione allineata al major Capacitor. Alternativa: `capacitor-health-extended` (Flomentum). ⚠️ Rischio #1 sotto |
| IAP | **@revenuecat/purchases-capacitor** | `cordova-plugin-purchases` deprecato; Billing Client v7 = stop update Google Play dopo 31/08/2026 → strada Cordova chiusa. Free tier RevenueCat fino a 2.5k$/mese MTR; ricevute+restore cross-platform inclusi |
| Ads | **@capacitor-community/admob** | Supporto UMP/CMP integrato (obbligo Google EEA/UK), rewarded supportati |
| GPS background | **@capacitor-community/background-geolocation** | Community mantenuto; solo tracking percorso in visita |
| Camera, geolocation, local-notifications, push, haptics, filesystem, share, app (deep link) | **plugin ufficiali @capacitor/**\* | Prima parte, sempre mantenuti |

## 4. Architettura target

```
PWA esistente (invariata, webDir Capacitor)
 ├─ js/native-bridge.js        ← UNICO accesso API native, feature-detection, fallback web (no fallback passi)
 ├─ js/game/                   ← 16 moduli nuovi (schema del prompt: game-events, xp-engine, steps,
 │                                checkin, souvenirs, badges, streaks, words, quests, group-game,
 │                                mascot, economy, narrator, readiness, stamp-hunt, codex)
 ├─ js/views/                  ← +4: game-view, codex-view, vocabulary-view, trip-log-view
 ├─ monetization/              ← iap.js, ads.js, affiliates.js
 ├─ assets/game/               ← voxel parts JSON, cataloghi, stamps-data/{country}.json, MANIFEST.json
 ├─ vendor/three/              ← Three.js UMD vendored (offline, no CDN)
 └─ ios/ + android/            ← progetti Capacitor versionati
```

- `state.game.*`: schema esattamente come da prompt (ledger event-sourced append-only = fonte di verità; XP/badge/quest derivati → replay deterministico, merge gruppo per unione ledger, mai sovrascrittura).
- Toggle globale «Modalità gioco» OFF = planner V1 identico (gate DoD).
- Avatar voxel: `InstancedMesh`, una scena riusata (creator/profilo/classifica), 60fps target, avatar JSON in state → MQTT.
- Free-API stack: adapter con stesso shape + kill-switch localStorage (pattern `disableNominatimHybrid` già in uso), tabella del prompt → `API_FREE_STACK.md` in F8.

## 5. Modifiche minime ai moduli esistenti

- `index.html`: script tag nuovi + toggle gioco in settings.
- `state.js`: init `game:{}` nel default state (1 riga + migration soft).
- `backup-restore.js` / `itinerary-snapshots.js`: includere `game` nei campi.
- `mqtt-transport.js`: **zero modifiche** — `group-game.js` usa `window.peerBroadcast` esistente su topic `tabi/{groupId}/game`.
- `i18n.js`: nuove chiavi it/en/ja.
- Tutto il resto: wrapper esterni, mai edit alla logica V1.

## 6. Rischi (ordinati)

1. **Metadata anti-cheat passi**: i filtri obbligatori (`HKMetadataKeyWasUserEntered`, `sourceRevision`, `recordingMethod`, `dataOrigin`) potrebbero non essere esposti dall'API JS di @capgo/capacitor-health → possibile piccola patch/fork nativa (Swift/Kotlin, poche righe). Test negativo su device reale è gate F7. Limite dichiarato: blocca manual entry e app terze, non un device rootato.
2. **Crediti Higgsfield: 72 disponibili vs ~234-272 stimati** (vedi §8) → decisione utente richiesta: top-up o pipeline ridotta.
3. **Three.js in repo IIFE no-bundler**: Three moderno è ESM-only; si vendora build UMD (r16x) o si usa un piccolo wrapper `<script type="module">` isolato solo per la scena voxel. Da decidere in F2, entrambe fattibili offline.
4. **iOS test su device**: serve account Apple Developer (99$/anno, già accettato) prima di F7.
5. OSRM demo server: rate limit non garantito → fallback haversine sempre attivo (già pattern del repo).
6. Ledger MQTT che cresce: compattazione periodica (snapshot + tail) da progettare in F5, non-bloccante.
7. GitHub Pages (config affiliati/stamps crowdsourcing): run in coda già noti nel repo → fallback: stessi JSON serviti da Vercel static.

## 7. Ordine fasi

F1 Fondamenta (game-events+ledger+toggle) → F2 Avatar (Three vendored, creator, ≥6 item/slot) → F3 Core loop (xp, check-in offline, passi Health-only) → F4 Retention/AI/planning loop (streak, parole+vocabolario, quest+gems+semina, readiness, stamp-hunt, narrator) → F5 Gruppo (classifiche, sfide, merge ledger) → F6 Asset+UI (Higgsfield, codex Zukan, view nuove) → F7 Mobile (Capacitor, build firmata, test negativo passi su device) → F8 Monetizzazione+API free (un adapter per PR).

Gate per fase come da prompt (smoke+lint sempre; F3: mock bridge scarta passi manuali; F5: 2 client Puppeteer separati — metodo già collaudato nel repo; F7: aereo-mode su device reale).

Nota ordine asset vs codice: F6 dopo F5 come da prompt, ma le **3 proposte Shiba** (6 crediti) si possono generare già durante F2-F3 per sbloccare la scelta utente senza fermare lo sviluppo.

## 8. Preventivo Higgsfield (misurato con `get_cost: true`, non stimato a occhio)

Costi unitari reali: `generate_image` nano_banana_pro 1k = **2 crediti/immagine**; `generate_3d` image_to_3d con texture+rigging+animazione = **38 crediti**. `remove_background`/`upscale_image`: nessun preflight disponibile senza asset reale — si misurano al primo uso (attesi bassi). **Saldo attuale: 72 crediti (piano Plus).**

| Voce | Immagini | Crediti |
|---|---|---|
| Shiba: 3 proposte | 3 | 6 |
| Shiba: sprite 5 stati | 5 | 10 |
| PG: concept sheet 4 set × 3 viste | 12 | 24 |
| Icona app + splash | 3 | 6 |
| **Subtotale priorità 1 (entra nei 72)** | **23** | **46** |
| Badge 10 × 3 tier | 30 | 60 |
| Souvenir | 20 | 40 |
| Timbri digitali codex | 30 | 60 |
| Copertina/cornice codex × 2 temi | 4 | 8 |
| Sfondi città + card social | 10 | 20 |
| **Totale full vision 2D** | **117** | **~234** |
| Opzione Shiba 3D (texture+rig+anim) | 1 | +38 |

Decisione richiesta: (a) partire col subtotale priorità-1 (46 cr, dentro il saldo) e rimandare il resto a top-up successivo, oppure (b) top-up subito per la full vision. La Shiba 3D è sconsigliata ora: 38 crediti = metà saldo per un'opzione che il prompt stesso tiene come "decidi mostrando entrambi" — gli sprite bastano per la V2, il 3D può arrivare dopo.

---

**Prossimo passo: approvazione di questo piano → si parte da F1.**
