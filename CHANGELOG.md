# 📋 CHANGELOG — Giappone 2027

## v3.45 — Audit completo: XSS critiche, bug logici, UI mobile (2026-07-11, Attuale)

Sessione di audit sistematico su richiesta esplicita ("sistema ogni bug, analizza l'app da ogni punto di vista, controlla ogni vista su mobile"). Bug hunt statico (script di cross-reference proprietario, 0 falsi negativi confermati a mano) + 3 agenti paralleli in background su prospettive diverse (sicurezza/privacy, integrità dati/sync, bug logici itinerary/onboarding) + verifica manuale nel browser reale a viewport 375×812 su Mappa, Itinerario, Gruppo, Chat, GF Guide, Budget, Meteo, Shopping.

### 🔒 Sicurezza — 5 vettori XSS reali, 8 file
Il finding più grave della sessione. Tutti confermati con test round-trip (payload → escape → HTML decode simulato → parse JS) prima e dopo il fix.

- **Zero-click via MQTT pubblico** (il più critico: nessuna interazione utente richiesta, si attiva da solo): `live-presence.js` (badge presenza, refresh automatico ogni 8s), `group-chat.js` (avatar messaggi), `group-panel.js` (avatar membri) — `avatar`/`name` di un peer finivano non sanificati in `src="${...}"`/`title="${...}"` via `innerHTML`. Aggiunto `window.sanitizeAvatarUrl()` condiviso in `ui-helpers.js` (allowlist schema `data:image/`/`http(s)://` + escape) invece di re-implementare (o dimenticare) il controllo in ogni file.
- **Contenuto di terze parti**: `poi-detail-template.js` (recensioni Google Places: autore/testo di chiunque scriva una recensione sul locale) e `poi-photo-gallery.js`/`poi-detail-template.js` (URL foto) non escapati.
- **onclick="fn('${_esc(x)}')" — l'HTML decodifica le entity dell'attributo PRIMA che il JS venga eseguito**, quindi `_esc()` (pensato per testo visibile) non protegge una stringa usata come argomento JS dentro un attributo onclick: `&#39;` torna `'` e rompe comunque fuori dalla stringa. Trovato in `gf-crowdsource.js`, `gf-menu-photos.js` (poiName da OSM/Overpass, editabile da chiunque), `gf-wishlist.js`, `group-checklist.js`, `group-expenses.js` (id generati internamente ma un peer malevolo può spedirne uno arbitrario via MQTT, `receive()` non valida il formato). Aggiunto `_escJs()` per-file (JS-string-escape backslash+apice, poi HTML-escape sopra per il livello attributo) — non è lo stesso escape usato per il testo visibile, servono due funzioni diverse per due contesti diversi.

Non toccato (fuori scope, richiede ridisegno non un fix mirato): l'entropia del codice stanza a 6 caratteri per la chiave E2EE (~30 bit, PBKDF2 150k iter — chiunque ascolti `giap2027v2/#` sul broker pubblico può tentare il crack offline); la finestra in cui un messaggio parte in chiaro se `RoomCrypto.ready()` non è ancora vero all'avvio.

### 🐛 Bug logici
- `japan-calendar-hints.js`/`views/menu-drawer.js` — `window.JapanCalendarHints.openPanel()` chiamato ma mai esportato: il bottone menu "📅 Calendario Giappone" non faceva nulla, in silenzio (`?.()` ingoia l'errore). Aggiunta `openPanel()` che riusa `renderHintsHTML()`/`getHintsForRange()` esistenti + empty state se il viaggio non tocca nessun evento.
- `smoke-test.mjs` — check SOS testava `window.renderSosView` (mai esistito) invece di `renderSOSPanel`, e non caricava lo script lazy prima del check: skippava sempre, falso silenzio nei test.
- `itinerary.js` (`moveToDay`) — nessun bounds-check sul giorno di destinazione, a differenza di `addPOIToDay` che auto-estende. Se `itineraryByDay` non ha ancora l'indice (es. dopo un secondo onboarding con più giorni), trascinare un POI lì lo perdeva (già rimosso dal giorno sorgente) con un `TypeError` non gestito.
- `onboarding.js` — "Partecipare a un viaggio" non salvava nulla: il modale di benvenuto riappariva a ogni riavvio all'infinito, e il bottone non portava a nessuna UI di adesione reale (verificato: zero listener oltre alla chiusura del modale). Ora salva un marcatore minimo di completamento e apre direttamente "Gruppo", che ha già un flusso "Entra Esistente" funzionante — riusato invece di costruirne uno nuovo.
- `onboarding.js` — fallback `budget_daily`/`budget_total` a 50000 quando il parsing del campo fallisce, ma il campo stesso è in EUR con min=10 max=500 default 50 — 1000x fuori scala (residuo di una vecchia versione in JPY). Fallback corretto a 50.
- `js/map-markers.js` — l'empty-state "Nessun POI trovato" (overlay centrato sull'intera mappa) veniva coperto dal widget meteo fluttuante (posizione fissa bottom-left, z-index 9999) su schermi stretti: il testo "zoomare **fuori** per..." e parte del bottone "Resetta filtri" erano illeggibili. Padding asimmetrico per spostare il centro verticale del testo lontano dalla zona del widget.

### 📋 Trovato dagli agenti, documentato ma non risolto in questa sessione (vedi HANDOFF)
Race condition di merge (cancellazioni "zombie" che resuscitano tra tab), gap di migrazione schema per `bookings`/`ai`/`gpsRemoteMarkers`, `QuotaExceededError` senza retry, validazione onboarding che non riporta l'utente allo step sbagliato, wraparound orario oltre mezzanotte in `itinerary-add-wizard.js`.

Verificato: script di audit proprietario (0 falsi negativi dopo 2 iterazioni di fix del parser, verificati a mano), `node --check` su 17 file, lint-i18n verde, smoke test verde 4/4 run consecutivi (1 fallimento isolato in `custom-poi.js` risultato flaky/pre-esistente, non una regressione — confermato riproducendo su baseline pulita), verifica manuale nel browser reale a 375×812 su 8 viste con dati seedati realistici.

## v3.44 — Pulizia Y2K parte 2: gli ultimi file davvero intercettati (2026-07-10, Attuale)

Continuazione v3.43. Prima di toccare altro codice, ricostruita la lista **precisa** dei colori che l'override in `legacy-skin.css` (righe ~2930-3186) caccia davvero via `[style*="..."]` — non tutto ciò che "sembra Y2K" lo è: `#FF69B4`/`#2D3B7D`/`#C85C3B`/`#4A5BA8` e altri comparivano nel file ma mai dentro un selettore attributo, quindi non c'entrano con l'override. Lista reale: `#00FF88`, `#1A2560`, `#6B5EA8`, `#C8BDFF`, `#E8E0FF`, `#FF1493`, `#FFD700`, `#FFF9E6`, `#FFFDF0`, `var(--y2k-ink/muted/pink)`.

- `js/views/weather-view.js` — il file con più residui reali: tutto il modal meteo (`buildAndShowWeatherModal`, l'unica funzione che il blocco "WEATHER MODAL/DETAIL BOXES" da ~130 righe esiste per patchare) ancora su `var(--y2k-pink/ink/muted)` per header/testo/footer. Sistemato con `var(--l-ink)`/`var(--l-muted)`/`var(--l-hair)`. **Bonus**: `getWeatherColor()` era codice morto (calcolava `bgColor`, mai usato nell'HTML, nessun altro chiamante in tutto il repo) — rimossa la funzione intera invece di tradurne i colori, 3 righe Y2K sparite gratis. **Bug trovato e corretto**: il badge "📍 GPS" e quello "⚠️ FALLBACK" condividevano `color:#1A2560`, che l'override nasconde con `span[style*="color:#1A2560"]{display:none}` (pensato solo per nascondere il FALLBACK debug) — il badge GPS non è mai stato visibile a nessun utente per lo stesso motivo. Ora il badge GPS ha un verde adattivo proprio (visibile), il ramo FALLBACK resta vuoto (comportamento identico a prima, che era già invisibile).
- `js/views/list-view.js` — dialog "Aggiungi tappa" (`showAddItineraryDialog`), l'unico uso reale rimasto: card crema/navy Y2K completa (sfondo, titolo, 3 label, 3 input, bottone Annulla) mai portata al tema glass, nonostante il bottone Conferma accanto usasse già `var(--l-accent)`. Sistemata mantenendo lo stesso layout/bordo-accento, solo colori → adattivi.
- `js/views/group-share-view.js` — box "Stanza: X" e 3 bottoni "Annulla" con la stessa palette crema/oro/navy già vista in `group-panel.js` (v3.43); bottone "Aggiungi POI" con testo navy illeggibile su sfondo verde → bianco.

**Deliberatamente non toccati** (verificato uno per uno che non siano intercettati da nessun selettore, quindi fuori dallo scope "shrink dell'override"): `app-core.js` (colore Canvas/OpenLayers, non è uno style DOM), `mqtt-transport.js` ×8 (colori di `console.log('%c...')` per DevTools, invisibili al CSS), `debug-panel.js`/`app-boot.js` (bottoni/testo non matchati — `div[style*="border:2px solid #00FF88"]` non cattura un `<button>`), `gf-places-panel.js` e `budget-view.js` (badge semaforo/categoria: stesso ragionamento di `EXPENSE_CATEGORIES` in v3.43, `color:#FFD700` non è mai stato un target dei selettori, solo `background:`/`border:`), `views/shopping-view.js` (bottone Apple Maps: nessun selettore `a[style*=...]` esiste nel CSS, badge auto-contenuto).

**A questo punto l'override in `legacy-skin.css` non intercetta più nulla**: nessun file in `js/` emette ancora uno dei 9 colori/3 variabili della lista precisa sopra. Il blocco è quindi ora davvero morto — candidato per la rimozione in un prossimo giro (non fatto qui: verificarlo con un pass end-to-end su tutte le schermate prima di cancellare ~250 righe di CSS).

Verificato: `node --check` su tutti i file, lint-i18n verde, smoke test verde, verifica visiva nel browser reale (modal meteo con badge GPS visibile, dialog "Aggiungi tappa" ora coerente col tema scuro).

## v3.43 — Colori Y2K hardcoded → variabili adattive (2026-07-10, Attuale)

Continuazione HANDOFF punto 4. Dei 3 file indicati, `poi-detail-view.js` era già pulito (verificato via grep, nessun residuo — probabilmente sistemato in una sessione precedente non documentata). Sistemati gli altri 2:

- `js/views/budget-view.js`: `var(--y2k-ink)`/`var(--y2k-muted)` → `var(--l-ink)`/`var(--l-muted)` (19 occorrenze), bordi/sfondi `#C8BDFF`/`#FF1493`/`#fff` hardcoded su select/input → pattern adattivo `rgba(20,30,60,0.05)` + `var(--l-hair)` già usato altrove nel codebase (es. `group-checklist.js`). **Non toccato**: i 6 colori di `EXPENSE_CATEGORIES` (righe 31-36) — verificato che sono colori semantici di categoria (i pallini legenda), non intercettati dall'override CSS (nessun selettore `div[style*="background:#FF1493"]` generico in `legacy-skin.css`, solo su bordi/testo), cambiarli avrebbe rotto la distinzione visiva tra le 6 categorie.
- `js/group-panel.js`: 4 bottoni (undo/redo/pulisci chat/esci stanza) con palette Y2K crema/oro/navy (`#FFE5B4`/`#FFD700`/`#2D3B7D`) → pattern neutro già usato nello stesso pannello 2 blocchi sotto (bottone "Copia link invito"), bottone "Esci" con accento arancio (stessa palette di "Ottimizza il giro" in itinerary-accordion-template.js).

**Non fatto, deliberatamente fuori scope**: rimuovere il blocco override in `legacy-skin.css` (righe ~2940-3220). Grep su tutto `js/`: altri 13 file emettono ancora colori Y2K via inline style (`app-core.js`, `gf-places-panel.js`, `mqtt-transport.js`, `views/weather-view.js`, `views/shopping-view.js`, `views/list-view.js`, `views/group-share-view.js`, `poi-styles.js`, `gps-tracker.js`, `itinerary-export.js`, `app-boot.js`, `debug-panel.js` + i colori categoria di `budget-view.js`) — l'override resta necessario e funzionale, come dichiarato in HANDOFF. Ripulire tutti richiederebbe lo stesso trattamento file per file; non fatto qui perché fuori dallo scope dei 3 file esplicitamente indicati.

Verificato: `node --check`, lint-i18n verde, smoke test verde, più verifica visiva nel browser reale (budget view completo: header, progress bar, 6 categorie con pallini colorati distinti, form spesa) — nessuna regressione visiva in dark mode.

## v3.42 — Refactor monolite itinerary-unified.js (2026-07-10, Attuale)

Stesso trattamento di poi-detail-view.js/gf-places-panel.js in v3.34: 1363 righe (il file JS più grosso del progetto) diviso in 4 moduli satellite, nessun cambio di comportamento voluto.

- `js/itinerary-accordion-template.js` (258 righe) — HTML della card di un giorno dell'accordion (lista POI, KPI visite/spostamenti, warning orari/densità/pasto).
- `js/itinerary-export-share.js` (354 righe) — export HTML/WhatsApp, link condivisibile, condividi con gruppo, modale itinerario vuoto.
- `js/itinerary-accordion-dnd.js` (91 righe) — toggle accordion + drag&drop POI tra giorni.
- `js/itinerary-poi-actions.js` (368 righe) — menu modifica/sposta/cancella tappa, GF vicino al giorno, base/hotel del giorno.
- `js/itinerary-unified.js`: 1363 → 372 righe. Resta il render principale (assembla budget/meteo/festività/accordion/sharing) + l'event delegation globale.

**Bug reale trovato ed corretto durante l'estrazione** (non un cambio di comportamento voluto, ma lasciarlo nel nuovo file l'avrebbe perpetuato): `window.handleExportHTML` (bottone "📄 Esporta stampabile") referenziava `_tripStart`, una `const` locale di `renderItineraryUnified()` — due funzioni distinte allo stesso livello di scope in un file mai avvolto in un vero IIFE condiviso, quindi `_tripStart` era `undefined` per `handleExportHTML`. `ReferenceError` silenzioso ad ogni click, mai intercettato dallo smoke test perché non esercita quel bottone. Verificato via browser reale (non solo smoke test) prima/dopo il fix: prima l'errore era `_tripStart is not defined`, dopo il fix la funzione costruisce l'HTML correttamente (il residuo `Cannot read properties of null (reading 'document')` sul `window.open()` è solo popup-blocking del contesto di test senza gesture utente, non correlato).

Verificato: `node --check` su tutti e 5 i file, lint-i18n verde, smoke test verde (comportamento identico al baseline pre-refactor), più verifica manuale nel browser reale — render accordion, apertura giorno, drag&drop wiring, menu modifica POI (Salva/Cancella/Sposta a).

## v3.41 — i18n: calendario giapponese + errori Groq (2026-07-10, Attuale)

Continuazione backlog i18n (v3.37). Controllati i punti indicati in HANDOFF.md: form GF crowdsourcing (`gf-crowdsource.js`) e schermi v3.38-3.40 (foto-menu AI, riordino orari, offline) erano già completamente tradotti — solo due aree avevano stringhe hardcoded reali.

- `js/japan-calendar-hints.js` (festività/stagionalità, mai tradotto da quando esiste): 17 chiavi nuove (`jpcal.*`) per titolo/sottotitolo, Golden Week, Obon, Shogatsu, sakura Tokyo/Kyoto, koyo Kyoto/Nikko + disclaimer stime — le chiavi erano referenziate nel codice (`T(h.labelKey, ...)`) ma assenti dal dizionario, quindi EN/JA vedevano comunque l'italiano via fallback.
- `js/gf-menu-analyzer.js`: 5 messaggi di errore Groq interpolati con template string invece di `T()` (`❌ Errore: ${err.message}` ecc.) — 3 nuove chiavi con placeholder `{msg}` sostituito via `.replace()`, stesso pattern già in uso per `groupPoi.addHint`.
- 51 nuove voci totali (17 chiavi × 3 lingue), lint-i18n verde (428 chiavi in parità it/en/ja), smoke test verde.

Non toccato: `deletePersonalItinerary`/`requestUnshare` in `itinerary-features.js` hanno hardcoded residui ma sono codice pre-esistente non legato alle feature v3.38-3.40, fuori dallo scope dichiarato di questa sessione — restano nel backlog i18n generale.

## v3.40 — Scarica una zona per offline: mappa + posti GF + POI (2026-07-10, Attuale)

Terza e ultima idea prodotto di HANDOFF.md §7. Le tile della mappa (ArcGIS) non avevano **nessuna** copertura offline — cross-origin, senza estensione file, non intercettate da nessuna regola esistente del service worker: ogni pan/zoom era rete viva. I posti GF e i POI generali avevano già cache proprie (7gg/30gg) ma si popolavano solo visitando le zone in-app. Nuova voce di menu "📥 Scarica per offline": scarica tutti e tre in un colpo per le zone del viaggio (stesso clustering automatico già usato dalla GF Guide).

### 🔧 Novità
- `sw.js`: nuova cache `giappone-2027-tiles-v1` + regola di routing cache-first per `server.arcgisonline.com` — le tile non cambiano mai, stessa strategia già scritta per le immagini, riusata as-is.
- `js/offline-region.js` (nuovo file): calcola il bounding box reale delle tappe della zona (non il raggio di clustering di 25km — a zoom street-level sarebbero ~15.000 tile per zona, impraticabile), scarica le tile su un range ristretto (z13-z15, dettaglio "zona pedonale"), poi popola le due cache POI esistenti riusando le funzioni già scritte (`loadGlutenFreeShopsForCity`, `loadNearbyPOIs`) — zero fetch logic nuova per i dati, solo per le tile. Controllo `navigator.storage.estimate()` prima di partire (nuovo per il codebase — l'unico controllo quota esistente copriva solo il blob localStorage) e avviso se la quota API giornaliera è già esaurita.
- `js/views/gf-view.js`: `_zonesFromItinerary()` estesa con le coordinate delle tappe membro (serviva per il bounding box), esportata su `window.GFView`.
- Nuova voce menu "Scarica per offline", 9 nuove chiavi i18n.

Verificato end-to-end **con richieste di rete reali** (le tile ArcGIS sono pubbliche, nessuna chiave richiesta): download di una zona di test (2 tappe, 86 tile, stima 1.7MB — combacia esatta col conteggio reale), tile confermate in Cache Storage, una richiesta ripetuta della stessa tile servita dalla cache in 4ms invece di un round-trip di rete. Confermato che il fallimento delle chiamate GF/POI (atteso in locale, niente chiavi API) non blocca il download delle tile — i tre passi sono indipendenti. Smoke test verde.

**Limite noto, dichiarato non risolto in questa versione**: nessuna rimozione selettiva per zona (le tile di zone diverse condividono la stessa cache e possono sovrapporsi) — per liberare spazio serve la cancellazione cache del browser. Scope reale per una v2 se serve gestione spazio attiva.

## v3.39 — Riordina un giorno per orari di apertura (2026-07-10, Attuale)

Seconda idea prodotto pianificata di HANDOFF.md §7. L'itinerario segnalava già passivamente i problemi (`getEntryClosingWarning` avvisa se una tappa cade a locale chiuso, badge "⛔ N sovrapposte"), ma non c'era modo di **agire**: il drag&drop sposta tappe tra giorni diversi, non le riordina dentro lo stesso giorno. Nuovo bottone "🕐 Riordina per orari" per giorno, stesso schema anteprima→conferma→snapshot già in produzione per "Ottimizza viaggio" (`TripOptimizer`, mirror quasi esatto, stesso file).

### 🔧 Novità
- `js/itinerary-features.js`: nuova sezione `DayHoursReorder` — euristica greedy (non un solver esatto): ad ogni passo sceglie tra le tappe rimanenti quella raggiungibile prima, aspettando l'apertura se serve invece di segnare comunque un orario sbagliato. Anteprima con avvisi/minuti di spostamento prima→dopo, applica con snapshot automatico (**riuso** dell'hook `'optimize-day'` già presente ma orfano in `itinerary-snapshots.js` — mai collegato a nulla finora).
- `js/itinerary-closing-warning.js`: estratta `isPeriodsOpenAt(periods, date)` dalla closure privata che c'era prima — comportamento di `getEntryClosingWarning` invariato, ma ora la logica "è aperto a quest'ora?" è richiamabile anche per orari ipotetici.
- Bottone "🕐 Riordina per orari" nell'accordion di ogni giorno (≥2 tappe), accanto al bottone base/hotel — non nella toolbar in cima che agisce sull'intero viaggio.
- 8 nuove chiavi i18n (it/en/ja).

### 🐛 Trovato in verifica manuale, non previsto dal piano
La prima versione riordinava correttamente le tappe (mattina→lungo-orario→sera) ma non "aspettava" l'apertura: la tappa serale finiva comunque schedulata alle 10:59 invece che alle 18:00, quindi l'avviso restava. Aggiunta `_nextOpenToday()`: se la prossima tappa non è ancora aperta all'arrivo previsto, il cursore avanza fino alla prima finestra utile invece di ignorarla. Verificato su un caso costruito (3 tappe, una aperta solo di sera): avvisi 1→0 dopo il riordino, non solo un ordine diverso con lo stesso problema.

Verificato end-to-end: `computePlan` su un giorno con conflitto reale (screenshot anteprima, click Applica, snapshot "Prima di ottimizzazione" creato, `state.itineraryByDay` e `route_from_prev` aggiornati correttamente). Smoke test verde.

## v3.38 — Foto-menu → riscontri: l'AI suggerisce, non invia mai da sola (2026-07-10, Attuale)

Prima idea prodotto pianificata e implementata di HANDOFF.md §7. Collegati tre moduli GF che esistevano già ma erano isolati: `GFMenuPhotos` (foto menù condivisa col gruppo), `GroqMenuAnalyzer` (analisi AI, raggiungibile solo da un pannello standalone scollegato) e `GFCrowd` (riscontri manuali Safe/Problema/Nota). Ora dopo una foto si può chiedere all'AI di analizzarla, e il verdetto **pre-compila** un riscontro — l'utente deve sempre confermare/modificare prima dell'invio, mai automatico (stesso principio del detector review-scan: "likely", mai "confermato" da un automatismo).

### 🔧 Novità
- `js/gf-menu-photos.js`: nuovo bottone "🤖 Analizza con AI" sotto le foto già scattate. Chiama `VisionImageAnalyzer.classifyImage` (stesso classificatore già usato dal pannello standalone) → `GroqMenuAnalyzer.analyzeImage` → mostra piatti sicuri/a rischio inline. Se rischi trovati: bottone che apre `GFCrowd.promptNote` con una nota pre-compilata (l'utente conferma/modifica). Se tutto pulito: bottone che apre `GFCrowd.askSafe` direttamente (i due dettagli cucina/staff restano da compilare a mano, l'AI non può dedurli da una foto).
- `js/gf-crowdsource.js`: `promptNote` esteso con due parametri opzionali (`defaultText`, `type`), retrocompatibile — il bottone "Nota" esistente non cambia comportamento.
- `js/api-quota.js`: **gap di costo trovato in fase di analisi** — la entry quota `analyzeGlutenFree` non corrispondeva a nessun endpoint reale (i path veri sono `groqAnalyze`/`groqImageAnalyze`), quindi le chiamate Groq non erano mai state gate-ate lato client nonostante il commento del file le trattasse come costo a pagamento. Sostituita con le due chiavi corrette, 5/giorno ciascuna.
- 5 nuove chiavi i18n (it/en/ja).

### 🐛 Bug trovati e corretti durante la verifica manuale (non in fase di planning)
- `analyzeImage` rifiuta la richiesta se non riceve `imageLabels` o `menuText` oltre alla foto — il piano iniziale assumeva bastasse la foto da sola. Aggiunta la classificazione via `VisionImageAnalyzer` prima della chiamata.
- I `predictions` di `classifyImage` sono oggetti `{label, probability}`, non stringhe — serviva `.map(p => p.label)` prima di passarli, altrimenti Groq riceveva `[object Object]`.
- Emoji 🤖 duplicata nel bottone (presente sia nel template che nella chiave i18n).

Verificato end-to-end in console: percorso "rischio" (foto → analisi → nota pre-compilata → conferma → riscontro `warning` salvato), percorso "sicuro" (→ `askSafe` chiamato correttamente), non-regressione del bottone "Nota" esistente (chiamata a 2 argomenti, comportamento identico). Smoke test verde.

## v3.37 — i18n: 32 stringhe hardcoded tradotte in 5 file (2026-07-10, Attuale)

Step 5 di HANDOFF.md: "molte stringhe nuove restano hardcoded in italiano nei template JS (EN/JA le mostrano in italiano)". Tradotte le stringhe più visibili trovate in questa sessione (non l'intero backlog — resta comunque ampio, vedi nota sotto).

### 🔧 Fix
32 nuove chiavi i18n (it/en/ja) in `js/app-boot.js` (istruzioni installa PWA iOS/Android/Desktop, prima ancora del tutto hardcoded), `js/views/gallery-view.js` (titolo, stato vuoto, upload, storage info), `js/itinerary-export.js` (modal export), `js/views/list-view.js` (dialog risultati ricerca + aggiungi tappa), `js/views/group-poi-view.js` (modal aggiungi a itinerario gruppo — trovati anche gli stessi colori Y2K hardcoded del bug Gruppo di v3.35, stesso fix). Verificato in EN via reload + screenshot: tutte le stringhe toccate ora seguono la lingua selezionata. Lint i18n verde (386 chiavi × 3 lingue).

**Nota per la prossima sessione**: questo è un dent nel backlog, non la chiusura. La ricerca mirata (`grep` su parole italiane comuni non wrappate in `T()`) ha trovato solo pattern testuali semplici — molte altre stringhe (form GF crowdsourcing, festività, altri modal) probabilmente restano hardcoded. Non c'è modo rapido di trovarle tutte via grep; l'approccio più affidabile resta navigare l'app in EN schermata per schermata.

## v3.36 — GF Guide non riprova più le città dopo quota esaurita (2026-07-10, Attuale)

Il loop che carica i negozi GF per ogni zona/città dell'itinerario (`renderGFView` in `gf-view.js`) non controllava mai la quota `searchGlutenFreeShops` (2/giorno): a quota esaurita continuava a chiamare `loadGlutenFreeShopsForCity` per OGNI città rimanente, ognuna delle quali veniva bloccata da `ApiQuota` (zero costo reale, il fetch non parte nemmeno) ma con un giro di log rumoroso ad ogni iterazione inutile.

### 🔧 Fix
Guard nel loop: se la quota è esaurita E la città non è già in cache (memoria o localStorage 7gg — quelle restano gratis e vanno servite comunque), interrompe il loop invece di proseguire su ogni città rimanente. Verificato con quota forzata esaurita: il loop si ferma alla prima iterazione senza tentativi sprecati; con quota disponibile, il caricamento procede normale città per città come prima. Smoke test verde.

## v3.35 — Audit accenti/riskin: Gruppo mai migrato al tema adattivo, Meteo a due colori (2026-07-10, Attuale)

Step 4 di HANDOFF.md: stessi criteri usati su itinerario/POI/GF Guide (un accento solo, niente riskin doppi) applicati a meteo/budget/gruppo/shopping. Budget e Shopping già puliti. Due bug reali trovati e risolti in Gruppo e Meteo.

### 🔧 Fix — Gruppo (`group-view.js`)
Il form "Crea Nuova / Entra Esistente" (prima connessione) non era mai stato migrato al sistema di token adattivi di `liquid-light.css` — usava ~15 colori Y2K hardcoded (`#FFF0F8`, `#FFE5B4`, `#FFD700`, `#2D3B7D`, `#fff`, `#333`...) che in dark mode restavano chiari/pastello in mezzo a un'app tutta scura. Sostituiti con i token `--l-*`/`--m-success` già usati da altri 45+ file. Trovato anche un riskin doppio: i 6 bottoni custom del form sono `<button>` dentro `.y2k-win-body`, quindi il riskin tema generico con `!important` schiacciava il loro stato attivo/inattivo — mai notato perché "Crea Nuova" (default attivo) e "Entra Esistente" (inattivo) finivano per sembrare identici, non perché fossero giusti. Aggiunta `.btn-plain` a tutti e 6 (convenzione già in HANDOFF.md). Trovato un terzo problema più subdolo mentre verificavo il secondo: il gradient rosso di "Crea Nuova"/Connetti conteneva letteralmente la sottostringa `background:linear-gradient`, intercettata da un'altra regola di override che lo smorzava ad arancione al primo render (poi tornava rosso corretto dopo un click tab, perché lì il JS serializza lo style con uno spazio che non matcha) — flicker di colore risolto passando a `background-image:`.

### 🔧 Fix — Meteo (`weather-view.js`)
I box PRECIP./UMIDITÀ/VENTO leggevano un tint quasi invisibile (`rgba(20,30,60,0.05)`, 5% di opacità) mentre le card giorno sotto nello stesso pannello hanno arancione al 15% — non un colore sbagliato, semplicemente troppo debole per emergere dal fondo scuro dell'app, letto a occhio come "blu" per contrasto con le card arancioni accanto. Portato allo stesso arancione 15%/bordo 30% delle card giorno. Rimossi anche 3 blocchi CSS in legacy-skin.css ("WEATHER GLASSMORPHISM MASTER") che sembravano la causa ma puntavano a gradient inline che weather-view.js non genera più da anni — confermato morto via grep su tutto js/, zero match.

Verificato: Gruppo con tab toggle funzionante e colori coerenti in entrambi gli stati; Meteo con pannello a un solo accento; smoke test verde.

## v3.34 — Refactor monoliti: poi-detail-view.js 1768→441 righe (2026-07-10, Attuale)

Lavoro preparato in una sessione precedente (worktree isolata, non ancora mergiata) e rimasto in coda come step 3 di HANDOFF.md. Nessun cambio di comportamento, solo split meccanico — verificato: i due commit erano già stati testati con smoke test al momento in cui furono scritti, e la worktree era ferma a 19 commit dietro main (nessuno dei quali toccava questi due file), quindi cherry-pick pulito senza conflitti.

### 🔧 Refactor
- `poi-detail-view.js` (1768 righe) → resta a 441, estratti: `js/views/poi-detail/poi-detail-helpers.js` (gfTag + helper puri), `poi-detail-template.js` (poiDetailHTML, sezioni 1-12), `poi-itinerary-wizard.js` (wizard 4 step). Tutti i `window.*` esistenti invariati.
- `gf-places-panel.js` (972 righe) → 740, estratti: `js/gf-menu-analyzer.js` (GroqMenuAnalyzer), `js/gf-places-db.js` (GFSuggestionsDB + GFPlacesDB).
- Verificato dopo il cherry-pick: tutti i nuovi globali presenti e tipizzati correttamente (`GroqMenuAnalyzer`, `GFPlacesDB`, `PoiDetailHelpers`, `openAddToItineraryWizard`, ecc.), smoke test verde con `openPoi.hasContent: true`, pannello Suggerisci Posti aperto e funzionante nel browser.

## v3.33 — Selettore paese destinazione: chiude il pivot "planner globale" (2026-07-10, Attuale)

`tripProfile.countryCode` era già letto da `japan-calendar-hints.js` (festività Nager.Date) e da `isJapanTrip()`, ma nessuna UI lo scriveva mai — restava sempre al default `'JP'` hardcoded. Mancava il campo per chiuderlo davvero.

### 🔧 Fix
- **Onboarding, Step 1**: nuovo `<select>` "Paese di destinazione" tra nome viaggio e giorni, popolato live dall'endpoint `AvailableCountries` di Nager.Date (stessa API già usata per le festività — stessi codici, garantiti validi), cache 30gg in localStorage, fallback a 10 paesi comuni solo se offline al primo avvio. Bandiere generate algoritmicamente dal codice ISO (regional indicator symbols), zero tabella paese→emoji da mantenere.
- **Menu**, per chi ha già un `tripProfile` e non rivede più il wizard: stesso selettore accanto a quello della lingua, "📍 Destinazione". Cambiarlo aggiorna `state.tripProfile.countryCode` + localStorage e ri-sincronizza le festività (chiave cache = countryCode, nessun'altra migrazione dati serve).
- `populateCountrySelect()` condivisa tra onboarding.js e menu-drawer.js (stessa funzione, non duplicata). Nuove chiavi i18n (`ob.countryLabel`, `menu.destination`) in tutte e 3 le lingue, lint i18n verde.

Verificato: onboarding end-to-end con paese IT selezionato → salvato in tripProfile e localStorage; menu con tripProfile esistente mostra e permette di cambiare la destinazione salvata; smoke test verde.

## v3.32 — Audit padding su tutta l'app: l'ultimo offender era .category-row (2026-07-10, Attuale)

Segnalato: "ci sono ancora gli stessi problemi di padding". Costruito un audit Puppeteer sistematico (`audit-padding.mjs`) che apre 14 pannelli in entrambi i temi e misura la distanza reale di **qualsiasi elemento visibile** (non solo testo — la prima versione per questo non trovava nulla) dal bordo di ogni card. Risultato: un solo offender vero in tutta l'app, `.category-row` del Budget con `padding: 12px 0` — zero orizzontale, così il pallino categoria toccava il bordo sinistro della card (i temi rendono le righe card con bordo proprio). Gli altri 2 hit erano falsi positivi verificati (wrapper sticky ricerca Shopping full-width per allineamento, `.gallery-upload-area` il cui figlio ha già padding 20px proprio).

### 🔧 Fix
`.category-row` → `padding: 12px` su tutti i lati. Audit ri-eseguito dopo il fix in dark e light: zero offender reali residui. Smoke test verde. `audit-padding.mjs` committato accanto a `smoke-test.mjs` per riusarlo ai prossimi giri UI.

## v3.31 — `.section` senza padding sopra i 768px, indentato in più sotto i 480px (2026-07-10, Attuale)

Segnalato dall'utente: header "🛍️ Negozi & Mercati" più rientrato della search bar nello stesso pannello Shopping. Causa: `.section` (usato da Shopping, Biglietti, GF Restaurants, Tips, Prenota, list-view) aveva il padding definito SOLO dentro due `@media` diverse in legacy-skin.css — `14px` sotto 768px, `12px` sotto 480px (quest'ultimo vince per ordine sorgente sotto i 480px, ma niente vince sopra i 768px: card senza padding). Trovato con CDP `CSS.getMatchedStylesForNode` dopo che la ricerca testuale nel CSSOM non trovava nulla (le regole erano annidate in `@media`, invisibili al mio primo giro di grep).

### 🔧 Fix
Consolidato in un'unica regola incondizionata: `.section { padding: 16px; margin: 12px 0; }`, stesso valore di `.budget-categories`/`.budget-form-section`/`.budget-expenses-section` — coerente su tutti i pannelli e tutte le larghezze schermo, non solo sotto i 480px. Verificato su Shopping (header ora allineato con search bar/tab), Biglietti, Tips Viaggio: nessuna regressione, smoke test verde.

## v3.30 — Pulizia cerotti CSS: solo 3 erano davvero morti, il resto è tema attivo (2026-07-10, Attuale)

La stima di v3.29 ("~3000 righe di regole-cerotto, quasi tutte ridondanti ora") era sbagliata. Verificato riga per riga contro il JS sorgente: il file ha solo 94 righe con selettori `[style*="..."]`, e la maggior parte (il blocco "INLINE STYLE OVERRIDES — Glassmorphism", righe ~2940-3220) non è un cerotto del bug margin/padding — è un layer di reskin attivo che converte i colori Y2K (rosa/oro) ancora hardcoded inline in `budget-view.js`, `group-panel.js`, `group-poi-view.js`, `poi-detail-view.js` nel tema glass arancione dell'app. Cancellarlo avrebbe fatto riapparire i colori Y2K — una regressione visiva, non una pulizia.

### 🔧 Fix
Rimosse solo le 3 regole confermate ridondanti o morte via grep sul JS:
- `div[style*="margin-bottom:20px/28px"]` (righe 79-90): il primo selettore re-iniettava `margin:12px;margin-bottom:20px` che `group-panel.js` ha già identico inline; il secondo non matcha nessun elemento nel codebase.
- `#y2kwin-gruppo div[style*="margin-bottom:20px"], ...[style*="background:rgba(74,91,168,0.12)"]` (righe 3226-3231): stesso doppione, più un secondo arm che non matcha nulla dentro la finestra Gruppo.
- `.sheet-body/.sheet-inner div[style*="margin-bottom:48px"]` (righe 3235-3238): selettore SOS panel, nessun elemento nel codebase usa quel valore.

Verificato: screenshot prima/dopo di Budget (incl. scroll sulle card categoria) e Gruppo identici; smoke test verde. Le restanti ~70 righe `[style*=...]` (weather-day, shop-card, y2k-win-body font-size:0 hack, il blocco glassmorphism) restano perché funzionali — non sono nel mirino di questo cleanup. HANDOFF.md corretto per non ripetere la stima errata.

## v3.29 — LA causa dei margini rotti in tutta l'app: `* { padding:0 !important }` (2026-07-04, Attuale)

Trovata con una sonda Puppeteer (misure reali del box model, non a occhio): perfino un div sintetico con `padding:12px` inline appeso al body risultava con padding computato **0px**. In cima a `legacy-skin.css` c'era `html, body, * { margin:0 !important; padding:0 !important }` — l'asterisco con `!important` **azzerava padding e margin di ogni elemento della pagina, battendo qualunque style inline**. Ogni spaziatura visibile nell'app sopravviveva solo grazie alle ~3000 righe di regole-cerotto `div[style*="..."]` più sotto nello stesso file, che re-iniettano i valori uno per uno per substring dello style inline. Questa è la radice comune di tutta la saga spaziature (v3.24-v3.28): i componenti hanno sempre dichiarato padding/margin corretti nel sorgente, il reset li ha sempre mangiati.

### 🔧 Fix
Reset ridotto al legittimo: `html, body` + default UA dei blocchi di testo (h1-h6, p, ul, ol, figure, blockquote), **senza** `!important` — componenti e inline style possono finalmente sovrascrivere. Le regole-cerotto restano innocue (impostano valori simili agli inline che ora funzionano da soli). Misurato dopo: header giorno 16px 18px ✓, card budget 12px 14px ✓, margine tra card 14px ✓ — i valori che il sorgente ha sempre chiesto. Verificato visivamente su itinerario e dettaglio POI: trasformazione netta, nessuna regressione, smoke test verde.

## v3.28 — Doppio container: era il riskin tema su ogni <button> (2026-07-04)

Il fix del margine (v3.27) era giusto ma non bastava — ispezionando il box model del bottone header è emersa la causa principale: i tre file tema (modern-2026, apple-glass, liquid-light) riskinnano con `!important` **qualunque** `<button>` dentro i pannelli — sfondo pill, bordo proprio, radius 14px. Giusto per i bottoni-azione; sbagliato per i bottoni-LAYOUT come l'header dell'accordion giorni, che vive già dentro una card con bordo e radius 10px: il risultato erano due bordi arrotondati annidati — i "due container sovrapposti" segnalati tre volte.

### 🔧 Fix
- Nuova classe opt-out `.btn-plain`: esclusa da tutti i selettori di riskin bottoni nei 3 temi (5 blocchi). I bottoni-layout la dichiarano e mantengono il loro stile inline.
- `.itinerary-day-header` marcato `btn-plain` + sfondo portato a `transparent` (il vecchio gradient inline verde/arancio era rimasto invisibile per mesi proprio perché il tema lo copriva — riemergendo era pesante e fuori palette).
- Verificato con screenshot: ogni riga giorno è ora un solo box con un solo bordo.

## v3.27 — "Due container sovrapposti": margine nativo dei bottoni mai azzerato (2026-07-04)

L'utente ha notato con uno screenshot ravvicinato l'indizio decisivo: sembravano "due container uno sopra l'altro" attorno all'icona del giorno. Aveva ragione — letteralmente due box. Causa: **nessun file in tutto il progetto azzerava il margine nativo di `<button>`/`<input>`/`<select>`/`<textarea>`**. Il margine di default del browser su un bottone dentro un contenitore con bordo (accordion giorni, card POI, chip, praticamente ogni bottone dell'app) crea un gap visibile tra il bottone e il suo wrapper — letto per l'appunto come due caselle sovrapposte invece di una sola.

### 🔧 Fix
`css/base.css`: `button, input, select, textarea { margin: 0; }` — reset standard, mai stato presente. Misurato prima/dopo: margine bottone header giorno passato da un valore non nullo a `0px`, gap residuo tra bottone e card ridotto a 1px (solo il bordo della card, corretto). Sistemico: risolve lo stesso artefatto su ogni bottone dell'app, non solo sull'header dei giorni dove è stato notato per primo.

## v3.26 — Padding laterale insufficiente su tutti i pannelli (2026-07-04)

Precisazione dell'utente su v3.25: non era altezza/line-height, era il **padding laterale** — contenuti senza card wrapper (titoli, righe bottoni) restavano attaccati al bordo sinistro/destro del pannello.

Causa: `.y2k-win-body` — il contenitore condiviso da OGNI pannello dell'app — aveva `padding:16px` uniforme. Bump mirato solo sui lati: `padding:16px 20px` in entrambi i punti dove la regola è definita (legacy-skin.css + modern-2026.css, stesso valore, evita incoerenze tra i due). Un solo fix nel contenitore condiviso, si applica a ogni schermata dell'app in un colpo — nessuna card va toccata singolarmente.

## v3.25 — Righe con emoji ancora strette dopo v3.24: padding + line-height (2026-07-04)

L'utente ha segnalato con screenshot puntuali che 4 zone (riscontri gruppo, titolo itinerario, header giorno, widget calendario) restavano strette anche dopo il fix della regola CSS in v3.24. Causa: quei padding erano SEMPRE stati genuinamente stretti nel sorgente (14px, 9px 12px) — non un secondo bug nascosto, solo valori piccoli — più `line-height` di default che lascia poco margine verticale ai glifi emoji (che spesso hanno un bounding box diverso dal testo).

Bump mirato sulle 4 zone: card riscontri gruppo e widget calendario 14px→16px, riga bottone hint calendario 9px 12px→12px 14px, header giorno itinerario 14px 16px→16px 18px, `line-height:1.5` sui titoli con emoji in testa.

## v3.24 — Trovata la causa vera dei padding stretti in tutta l'app (2026-07-04)

Segnalato dall'utente: padding troppo stretti su container di testo/immagini. Non erano 150 valori scollegati da sistemare uno per uno — una singola regola in `css/legacy-skin.css`, pensata per un solo pannello (il gruppo), aveva un selettore troppo largo: `.y2k-win-body div[style*="border"]`. "Qualunque div con la parola border nello style inline" intercetta di fatto **quasi ogni card dell'app** (praticamente tutte hanno un bordo inline) e forzava 8px 10px con `!important`, indipendentemente dal padding reale scelto da ogni componente (es. `budget-summary` diceva 12px 14px nel sorgente, ne applicava 8px 10px). Stessa famiglia di bug dei 3 "appiattitori" bottoni rimossi in v3.15 — stavolta sui container invece che sui bottoni.

Rimossa la regola. Verificato visivamente su dettaglio POI e pannello itinerario: le card respirano, il box immagine POI e le card testo hanno ora il padding che il loro stesso sorgente specifica.

## v3.23 — Festività globali live: il widget calendario non era mai apparso (2026-07-04)

Punto 6 roadmap planner, ultimo della lista. Come il banner meteo (v3.20), un'altra feature completa e mai vista da nessuno: `js/japan-calendar-hints.js` (widget Golden Week/Obon/Shogatsu/Sakura/Koyo, ~360 righe) era dichiarato "lazy-loaded on demand" in un commento di `index.html`, ma **nessun file chiamava mai quel `loadScript()`** — `window.JapanCalendarHints` restava sempre `undefined`, il widget non ha mai reso una riga di HTML in produzione.

### 🔧 Fix
- `index.html`: script caricato normalmente (come i suoi moduli fratelli), non più lazy senza trigger.
- `syncGlobalHolidays()`: festività ufficiali del paese del viaggio via Nager.Date (API pubblica, gratis, CORS-ok, nessuna chiave) — si aggiungono a Golden Week/Obon/Shogatsu già coperte a mano, che restano (sono specifiche del Giappone e hanno commentario dedicato). Default paese `JP` finché non esiste un selettore destinazione in UI — nessuna regressione, festività reali in più per il trip Giappone attuale. Cache 30gg in localStorage, stesso pattern del resto dell'app.
- Bug trovato scrivendo il test: un doppio guard "una volta sola" (uno nel modulo, uno nel chiamante) bloccava ogni retry successivo senza modo di resettarlo — il guard interno era ridondante (`_fetchHolidays` è già idempotente via cache), rimosso.

Con questo si chiude la roadmap qualità completa (punti 1-6) più il decluttering UI richiesto.

## v3.22 — Export .ics del viaggio intero + sfoltita sezione Condividi (2026-07-04)

Punto 5 roadmap planner. `buildICS`/`downloadICS` esistevano già ma solo per la singola tappa (promptAddToCalendar) — accettavano già un array di eventi, riusati as-is: `exportItineraryICS()` genera un evento per ogni tappa di ogni giorno (orario/durata/coordinate reali) e scarica un unico file importabile in Google/Apple/Outlook Calendar.

Nel farlo, decluttering coerente col resto: la sezione "Condividi con il Gruppo" aveva 4 bottoni a 4 colori diversi (stesso anti-pattern della riga azioni sistemata in v3.21) — stile unico neutro, resta accentata solo "Condividi con Gruppo" (l'azione principale). Invariante `icsExport` nello smoke test (su `buildICS` puro, non sul click reale: in headless Chrome un `<a download>` cliccato può agganciarsi al download-handling e bloccare la pagina — imparato durante lo sviluppo di questo check).

## v3.21 — Sfoltita la schermata Itinerario (2026-07-04)

Segnalata dall'utente come "confusionaria". Verificato con un audit rapido su tutte le schermate (conteggio colori distinti nei bottoni per file): `itinerary-unified.js` ne aveva 15, ogni altra schermata 0-4 — era l'unica davvero fuori scala.

### 🔧 Fix
- 4 bottoni azione (Ottimizza/Suggerimenti/Storico/Promemoria) avevano 4 colori diversi e `flex-wrap` — su schermi stretti andavano su due righe disordinate. Ora stile unico neutro, riga singola con scroll orizzontale, titolo sopra su riga propria (non più in competizione per lo spazio).
- Nota "Trasporti non ancora inclusi" era in un box arancio stile-warning per un'informazione neutra, non urgente. Ora testo semplice.

## v3.20 — Meteo che influenza il piano: banner mai apparso, ora reale (2026-07-04)

Punto 4 roadmap planner. Il banner "pioggia prevista, hai tappe outdoor" esisteva già (UI completa, dismissibile) ma `window.state.weather.forecast` **non veniva mai scritto da nessun file** — il banner era morto dal giorno in cui è stato costruito, sempre `[]`.

### 🔧 Fix
`syncItineraryWeather()` in `js/features-weather.js`: per ogni giorno con una località nota (base/hotel o prima tappa), fetch Open-Meteo daily (già usato altrove, gratis, nessuna quota) e popola il forecast reale. Match per data di calendario, non offset sequenziale — forecast reale disponibile solo entro ~16gg, i giorni oltre restano senza dato (nessun alert falso, non un bug). Richiamato una volta ad apertura del pannello itinerario, poi si ridisegna da solo quando arriva.

Nel costruire il fix, un bug concreto: il confronto data usava `toISOString()`, che per fusi orari UTC+ (Giappone incluso) fa slittare la data di un giorno indietro passando per UTC — avrebbe disallineato silenziosamente ogni match. Sostituito con lettura calendario locale diretta. Invariante `weatherAlertWiring` nello smoke test, che ha proprio catturato questo bug al primo run.

## v3.19 — Conflitti orari del giorno: overlap + pasto mancante (2026-07-04)

Punto 3 roadmap planner. Il warning chiusure copriva solo la singola tappa; mancava la validazione del giorno intero. Aggiunti due badge nell'header di ogni giorno (riusano `route_from_prev`/`dayDuration` già calcolati, zero costo aggiuntivo): "⛔ N tappa/e sovrapposte" quando l'orario di una tappa cade prima che finiscano visita+spostamento della precedente, "🍽️ Nessun pasto in giornata" quando ci sono oltre 4h di visite senza una tappa taggata cibo. Invariante `dayConflicts` nello smoke test.

## v3.18 — Deep-link indicazioni reali tra tappe consecutive (2026-07-04)

Punto 2 roadmap planner. Le tratte tra tappe erano solo stime (haversine + ¥/km euristici, già etichettate come tali) senza modo di navigarle davvero. API transit vere costano quota; via gratis: link "🧭 Indicazioni" nella riga spostamento di ogni tappa, che apre Google Maps con origine/destinazione = coordinate reali delle due tappe consecutive e travelmode coerente (walking se a piedi, transit altrimenti). Zero chiamate API, compare solo se entrambe le tappe hanno coordinate note.

## v3.17 — Fix vero lag chiusura card + base/hotel del giorno (2026-07-04)

### 🔧 Lag chiusura card (causa radice, finalmente)
L'animazione di uscita **non era mai esistita**: `.y2k-win-closing` riusava la stessa keyframe dell'entrata (`m-sheet-up reverse`) — ma un'animazione con lo stesso nome non riparte mai (per CSS è già completata sull'elemento). La card restava congelata finché il timer di sicurezza non la rimuoveva: il freeze segnalato più volte. In più `transform: none !important` sulla base bloccava anche lo slide di ENTRATA (un transform `!important` vince sulle keyframes), e il pannello aveva un `backdrop-filter` ridondante (la mappa sotto è già sfocata) ricalcolato ad ogni frame su 88vh. Fix: keyframe di uscita dedicata (`l-sheet-down` mobile, `l-modal-out` desktop), via i transform `!important`, via il blur del pannello (sfondo quasi opaco `--l-glass-strong`). Misurato in foreground: uscita 9→218ms con slide reale.

### ✨ Planner: base/hotel del giorno (punto 1 roadmap planner)
La giornata reale parte dall'alloggio, non dalla prima tappa. Nuovo per ogni giorno: "🏨 Imposta base/hotel" → geocoding live Nominatim (nessun dato scritto a mano) → opzione "applica a tutti i giorni". "Ottimizza il giro" ora usa la base come punto di partenza del nearest-neighbor. Invariante nel test (`dayBaseSeed`).

## v3.16 — Roadmap qualità: cache PWA, GF nel planner, riscontri celiaco-critici, GF globale, test veri (2026-07-04)

Sei interventi in un giro solo (punti 1-6 della roadmap concordata):

1. **Cache PWA (`sw.js` v10)** — network-first non bastava: `fetch()` passava dalla cache HTTP del browser e coi max-age di GitHub Pages/Vercel tornava il file vecchio anche "dalla rete". Ora l'app-shell usa `cache:'no-cache'` (revalidation ETag/304): dopo un deploy gli utenti vedono la versione nuova alla prima navigazione.
2. **GF dentro il planner** — nuovo bottone per giorno "🌾 Dove mangio GF vicino alle tappe?": incrocia le tappe geolocalizzate con i posti GF da fonti live (zero chiamate API nuove), lista entro 1.5km con distanza dalla tappa più vicina e aggiunta one-tap come pasto.
3. **Riscontri celiaco-critici** — al tap su "Safe" un follow-up chiede cucina separata e staff consapevole (sì/no/non so); i dettagli viaggiano nel sync di gruppo esistente e si mostrano colorati nei riscontri, con "Ultima verifica: Xg fa" nell'header.
4. **GF Guide globale** — le chip non sono più 37 città giapponesi fisse ma zone (~25km) derivate dalle tappe reali del viaggio (fallback Giappone a itinerario vuoto); il backend non appende più " Japan" alle query — àncora il location bias lat/lng.
5. **Test con i denti** — smoke-test ora esce con codice 1 su errori/check falliti (prima la CI passava sempre) + 4 invarianti nuovi. Il primo run ha trovato un bug reale: `gfDetector` referenziava una variabile rimossa nel refactor v3.8 → il rilevamento GF era **rotto in produzione** (ReferenceError a ogni detection). Fixato.
6. **i18n** — chiavi `gfc.*` del nuovo follow-up in it/en/ja.

Punto 7 (refactor dei file monolitici) preparato come task separato in worktree isolato.

## v3.15 — Fix sistemico UI mobile: via i 3 appiattitori CSS + zona azioni POI (2026-07-04)

Segnalati dall'utente: "Aggiungi una nota" fuori asse rispetto ai CTA, bottoni troppo attaccati, layout "sconnesso" in ogni card su mobile, lag visivo alla chiusura.

### 🔧 Causa sistemica trovata
Tre blocchi in `css/legacy-skin.css` (due a ≤480px, uno a ≤768px) forzavano su OGNI bottone dell'app `padding` e `font-size` con `!important` (12-14px/16px, font 15-16px, min-height 48-50px), sovrascrivendo le scelte di ogni singolo componente. Era il motivo per cui i bottoni risultavano gonfi, disallineati e con testi a capo su telefono in tutte le card, mentre a schermo largo tutto sembrava a posto. Ridotti al solo tap-target minimo (`min-height:44px`): il padding torna a deciderlo ogni componente. Eccezione chip estesa a `.gf-city-chip` (36px).

### 🔧 Zona azioni dettaglio POI
- CTA/Proponi/Nota/riga secondaria: stesso inset 16px per tutti (prima `.notes-section` usava un token che scende a 14px su mobile → "Aggiungi una nota" fuori asse), colonna con gap 12px (prima 8px, "troppo attaccati").
- `.notes-button` ora full-width e centrato (prima content-width, incollato a sinistra).
- Bottoni Safe/Problema/Nota: `flex-basis:auto` così ognuno parte dalla larghezza del suo testo — niente più wrap o troncamenti.

### 🔧 Lag chiusura pannelli (seconda passata)
- Rimosso `backdrop-filter: blur` dal backdrop full-screen in tutti e 3 i temi: la mappa sotto è GIÀ sfocata da `#map.blur`, il secondo blur era ridondante e, transizionando in opacity, ricalcolava la sfocatura di tutto lo schermo ad ogni frame di apertura/chiusura.
- `js/y2k-windows.js`: la rimozione di `#map.blur` (repaint full-screen della mappa) è rimandata a fine animazione di uscita invece che nello stesso frame in cui parte lo slide. Verificata la sequenza: blur presente durante lo slide, rimosso a pannello sparito.

## v3.14 — Testo a capo nei bottoni + lag chiusura pannelli densi (2026-07-04)

### 🔧 Fix
- **Testo a capo nei bottoni azioni POI**: dopo il bump font globale (v3.12), "🧭 Apri mappa" andava a capo su 2 righe dentro un box ad altezza fissa 36px (schiacciato/tagliato), e "✅ GF safe" idem nella riga sopra — effetto "sconnesso" segnalato. Accorciate le etichette ("Mappa", "Safe") e sostituita l'altezza fissa con `min-height` + `white-space:nowrap`, coerente su tutti i bottoni della zona (Mappa/Salva/Calendario e Safe/Problema/Nota).
- **Lag alla chiusura di pannelli densi** (es. dettaglio POI con riscontri gruppo, bottoni, stelle): aggiunto `will-change:transform,opacity` a `.y2k-win` — senza quell'hint il browser ridisegna tutto il contenuto interno ad ogni frame dello slide invece di spostare un layer già composto. Impatto maggiore su sheet ricche di contenuto rispetto a una lista semplice, coerente con la segnalazione specifica sul dettaglio POI.

## v3.13 — Bottoni Apri mappa/Salva/Calendario disallineati (2026-07-04)

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
