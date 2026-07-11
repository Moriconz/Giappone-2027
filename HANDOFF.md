# HANDOFF — Tabi (Giappone 2027) · 2026-07-12 (fine sessione, v3.52)

Prompt di ripartenza per nuova chat:
> Continua il progetto Tabi. Leggi HANDOFF.md nella root del repo. Riparti dal primo punto di "Prossimi step". Attiva /fable-5.

## Cos'è l'app
**Tabi** — travel planner PWA (vanilla JS, no framework, no bundler) con layer gluten-free opzionale. Planner **globale**, non solo Giappone; il trip Giappone 2027 è il caso d'uso di partenza. Collaborativa tra amici via MQTT (broker pubblico, zero backend); serverless Vercel solo come proxy API (Google Places/Groq, quota-gated in `js/api-quota.js`). **Regola utente ferrea: nessun dato hardcoded** — tutto da fonti live o da input umano (crowdsourcing di gruppo). Uso esclusivamente mobile, utenti non tech-savvy (amici in viaggio, non sviluppatori).

## Stato attuale
- Tutto committato e pushato su `main`, sincronizzato in `/Users/riccardomoricone/Documents/GitHub/Giappone-2027` (v3.52, questa sessione).
- Test: `smoke-test.mjs` verde più volte consecutive (exit 0, nessun errore console nuovo oltre a quelli attesi in dev locale: CORS overpass-api, 404 GF senza chiave API).
- Repo pulito: nessuna worktree residua in `.claude/worktrees/`, nessun branch locale `claude/*` orfano.
- **Priorità prodotto confermate dall'utente** (vedi memoria `product-priority-order`): 1) viaggio-ready, 2) zero bug, 3) feature-complete, in quest'ordine. Deadline = partenza per il Giappone. GF resta fisso in bottom-nav (deciso, non richiedere di nuovo).

## Richiesta della sessione
Due parti. (1) Audit esplicito "cosa c'è di troppo" nell'intera app, sia lato codice (over-engineering/codice morto, via skill `ponytail-audit`) che lato UI/UX — poi su conferma: applicare i fix, recuperare 2 modifiche WIP da worktree stale prima di cancellarle, ripulire il repo (v3.51). (2) Su richiesta esplicita di continuare con la priorità "cosmetici UI visivi": fix reali in browser (non alla cieca) di bleed-through pannelli e chat bubble tema chiaro su sfondo scuro (v3.52).

## Cosa è stato fatto (v3.52) — cosmetici UI, verificati in browser reale
- **Bleed-through bottom-nav/header/filtri sotto i pannelli aperti**: 2 cause distinte trovate misurando `getComputedStyle`/`elementFromPoint` in Puppeteer (non a occhio dal CSS statico — questo codebase ha 6+ skin CSS sovrapposti, vedi memoria `css-flattener-pattern`).
  1. `.sheet`/`.sheet-inner` avevano `z-index: 50/51`, sotto `nav.bottom`/`#filters`/`header` (`100/101`) — la chrome galleggiava sopra il pannello invece di finire sfumata sotto il backdrop. Portati a `150/151` in `css/legacy-skin.css`.
  2. `--l-glass-strong` (il colore condiviso da `.y2k-win`, `.sheet-inner`, chip filtri, weather card) era ad alpha `.86`/`.82` — abbastanza translucido da lasciar intravedere il contenuto sotto come un "fantasma". Portato a `.97`/`.96` in `css/liquid-light.css` (entrambi i temi, dark e light — stesso bug, stesso fix).
- **Chat bubble tema chiaro su sfondo scuro**: `js/group-chat.js` usava colori hardcoded (`#fafafa`/`#e0e0e0`/`#fff`) identici in ogni tema. Sostituiti con le CSS var dell'app (`--m-surface`, `--m-text`, `--l-hair`, `--l-accent`). Il bottone invio veniva comunque appiattito al grigio generico dal flattener `.sheet-body button:not(.btn-plain)` — aggiunta la classe `btn-plain` (pattern già documentato in memoria, non reinventato).
- **Metodo di verifica**: server locale + browser reale a viewport mobile (375×812), stato seedato via `window.state.group`/`localStorage['groupchat_<room>']` (non mock), screenshot before/after, `elementFromPoint` per capire ESATTAMENTE quale elemento causava il bleed prima di toccare il CSS (evitato il rischio "corretto selettore sbagliato" — la prima ipotesi, `.sheet`, non era l'elemento realmente visibile; quello vero era `#y2kwin-menu`, un sistema di finestre diverso).

Commit: `252ba1e` (handoff v3.51) seguito dai commit di questa sessione per v3.52 (da fare).

## Cosa è stato fatto (v3.51)

**Codice morto rimosso (~207 righe nette, 2 file interi):**
- `js/encryption.js` (81 righe) + `window.appConfig` in `js/config.js` (~130 righe): intero sottosistema AES-256-GCM per un vault di chiavi API con master password, **mai chiamato da nessun punto dell'app** — le chiavi reali passano dal proxy Vercel server-side. `js/config.js` ora contiene solo `CATS`/`CITIES`/`CITY_COORDS` (quelli sì usati).
- `js/itinerary-add-wizard.js` (719 righe): candidato già identificato in v3.50 (funzione pubblica sempre sovrascritta dall'implementazione reale in `poi-detail/poi-itinerary-wizard.js`), rimosso ora su conferma esplicita.
- `escapeHtml` duplicata: due implementazioni globali diverse in `js/ui-helpers.js` e `js/views/group-share-view.js` (stessa classe di bug della doppia `openAddToItineraryWizard` — l'ultima caricata sovrascrive silenziosamente l'altra in scope globale non-module). Consolidata in una sola versione in `ui-helpers.js` (con escape dell'apice, la più completa delle due).
- `window.ensureStateObject` in `js/state.js`: zero chiamanti in tutto il repo.
- Badge `gfChip`/`poi._gfStatus` in `js/poi-section-builders.js`: **recuperato da una worktree WIP abbandonata** (`blissful-lichterman-ecebca`, 2026-07-06) — verificato che `poi._gfStatus` non viene mai impostato da nessuna parte nel codebase attuale, quindi era dead code anche oggi. Rimosso.

**Fix applicati:**
- `js/mqtt-transport.js`: `bubbles: true` sui 2 dispatch di `group_members_updated` (era su `document`, ascoltato su `window` — l'evento non arrivava mai, il pannello Gruppo aperto non si aggiornava live all'ingresso di un membro). Verificato live in browser reale.
- `js/views/gf-view.js`: **recuperato da worktree WIP** (`trusting-knuth-4e0d08`, 2026-07-06) — rete di sicurezza reattiva su HTTP 429/`quota_exceeded` (oltre al check proattivo `window.ApiQuota` già esistente in main, che nel frattempo era stato aggiunto e copre già il caso principale). Adattato alla firma attuale di `loadGlutenFreeShopsForCity(city, cityLat, cityLng)`.

**UI/UX — prominenza:**
- Menu ☰: 21 voci in lista piatta senza gerarchia. "SOS" (emergenza) era penultima voce, da scrollare; "Wishlist GF del gruppo" (feature di nicchia) occupava il primo slot. **SOS spostato in cima.**

**Repo hygiene:**
- 3 worktree in `.claude/worktrees/` (13.5MB, 27-53 commit indietro rispetto a main) analizzate una a una prima di toccarle: 2 (`blissful-lichterman`, `trusting-knuth`) erano già ancestor di `main` (lavoro già dentro, solo checkout stale), 1 (`amazing-chebyshev`) aveva un commit genuinamente non mergiato ma il problema che risolveva (cerotti margini CSS) risultava già assente in `main`, superato da un fix più ampio nelle sessioni precedenti. I 2 diff non committati nelle worktree (piccoli, validi) sono stati recuperati e applicati a `main` prima della rimozione. Rimosse tutte e 3 le worktree + i 3 branch locali `claude/*` corrispondenti (nessuno su remote).

Commit: `adf3f0a` (audit bloat) + `e1bf0d0` (recupero fix WIP).

## Verdetto sicurezza — nessun bug noto non gestito (invariato da v3.50)
**Fixato (v3.47, v3.49):**
- 2 XSS critiche zero-click via MQTT + altre 6 minori (8 file, pattern `_esc()`/`_escJs()`).
- **Fix strutturale trust boundary MQTT**: `handleIncoming()` scarta messaggi in chiaro una volta che la chiave stanza è pronta.
- Clamp anti-forgia timestamp CRDT, cap payload, guard tipo GPS, crash-safety `state.js`/`itinerary.js`.

**Deliberatamente non fixato, CONFERMATO ACCETTABILE DALL'UTENTE — non riproporre la domanda:**
- Impersonazione tra membri che condividono già il codice stanza — richiederebbe una PKI per-membro, confermato non necessario per un gruppo di amici. Vedi memoria `mqtt-trust-model-decision`.
- Nessun rate-limiting su chat/presence MQTT (fastidio, non data breach — accettato).
- Quota-gating client-side aggirabile con devtools (chiavi restano server-side, abuso di quota non fuga dati — noto/accettato).
- CORS e secrets lato client: verificati sicuri.

## Verdetto UI/UX — solido (invariato da v3.50 salvo SOS)
**Cosa resta aperto (nessuno critico):**
- Bleed-through bottom-nav sotto pannelli semi-trasparenti; chat bubble stile chiaro su tema scuro — richiedono iterazione visiva in browser, non fix alla cieca.
- Bottone informazioni "i" 33×44px segnalato ma non identificato con certezza nel codice.
- `js/itinerary-features.js` `applyDayHours` bypassa `window.ITINERARY`, quindi "Applica" in "Riordina per orari" non è coperto da Annulla/Ctrl+Z (solo dallo snapshot automatico).
- Cosmetici minori: etichetta "Giorni Rimanenti" nel budget mostra in realtà giorni pianificati; badge countdown biglietti stantio dopo cambio stato; suggerimento itinerario duplicato senza feedback; permesso notifiche negato durante il click senza toast.

## File prodotti/toccati in questa sessione
12 file JS/CSS/HTML/MD modificati (2 commit). 2 file interi eliminati (`js/encryption.js`, `js/itinerary-add-wizard.js`). Nessun file nuovo.

## Decisioni chiave
- **Ogni deletion/rimozione presentata come raccomandazione con verifica (grep chiamanti + `node --check` + smoke test) prima di agire**, mai eseguita alla cieca — coerente con la richiesta esplicita dell'utente su "eliminare/riordinare" decisioni.
- **Prima di eliminare una worktree stale, verificarne sempre il contenuto reale** (non solo l'età): `git merge-base --is-ancestor` per capire se il lavoro è già dentro main, diff dei file sporchi non committati per non perdere modifiche valide. In questo caso 2 piccoli fix erano ancora validi e sono stati recuperati.
- **`window.appConfig`/`js/encryption.js` erano infrastruttura speculativa mai attivata** — nessuna UI chiama mai `setKey`/`getKey`/`initMasterPassword`. Esempio concreto di "costruito ma mai collegato".

## Prossimi step (in ordine di valore — filtrati dalla priorità "viaggio-ready" prima di tutto, vedi memoria `product-priority-order`)
1. **`applyDayHours` fuori dal sistema undo/redo** — valutare se instradarlo tramite `window.ITINERARY` o accettare (solo snapshot automatico come rete di sicurezza). Rilevante per l'uso reale in viaggio (undo di un errore in itinerario).
2. **Altri cosmetici UI da verificare in browser** — la sessione v3.52 ha risolto bleed-through pannelli e chat bubble; verificare se restano altri casi simili non ancora notati (stesso metodo: `elementFromPoint`/`getComputedStyle` in browser reale, non a occhio dal CSS).
3. **i18n completo** — backlog ampio, serve navigare l'app in EN/JA schermata per schermata. Priorità bassa a meno che qualcuno del gruppo non parli solo EN/JA.
4. **Refactor monoliti** — `js/onboarding.js` (928 righe), `js/views/poi-detail/poi-itinerary-wizard.js` (811), `js/views/weather-view.js` (783), `js/mqtt-transport.js` (828), `js/gf-places-panel.js` (752). Manutenibilità futura, non blocca l'uso reale — priorità bassa per esplicita scelta utente (feature-complete è la priorità #3, non #1).
5. **`wizardRender: false` nello smoke test** — check soft, pre-esistente, priorità bassa.
6. **GF slot fisso in bottom-nav**: **CONFERMATO tenerlo così dall'utente** (2026-07-12) — non riproporre la domanda, vedi memoria `product-priority-order`.
7. **Idee prodotto** — l'app è ora in stato solido (sicurezza + UX + bloat + cosmetici auditati a fondo su 5 round: v3.47, v3.49, v3.50, v3.51, v3.52).

## Vincoli e convenzioni
- Script IIFE browser, `<script defer>` in index.html; niente ES modules/bundler.
- MAI sed/perl multi-riga greedy: Edit manuale + `node --check` + smoke test dopo ogni modifica.
- Verifica sempre: `python3 -m http.server PORT` + `node smoke-test.mjs http://localhost:PORT` (exit 0, ripetere 2-3 volte) + `node scripts/lint-i18n.mjs` se si toccano stringhe. Per bug UI, verifica nel browser reale a viewport mobile (375×812).
- **Per bug MQTT/multi-utente**: il broker pubblico (`broker.emqx.io` ecc.) è raggiungibile da un browser lanciato da Puppeteer (verificato) — usa 2 istanze `puppeteer.launch()` separate (non 2 tab, per isolare `localStorage`) per un test reale a 2 utenti, invece di mockare MQTT. Non fidarti di `console.log` per eventi asincroni tardivi in questi test: verifica lo stato (`window.state.X`) direttamente.
- Lo stato app vive TUTTO in un unico blob `localStorage['giappone2027_state_v1']` (`js/state.js`) — per seedare dati di test, mutare `window.state.X` + `window.saveState()`, non `localStorage.setItem` diretto.
- Commit in italiano, CHANGELOG.md aggiornato ad ogni versione, push su `main` + sync cartella deploy sempre.
- Nuove stringhe UI: sempre `T('namespace.chiave', 'fallback italiano')` + chiavi in `js/i18n.js` per it/en/ja. Pattern corretto del `T()` locale: `const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;` — passare SEMPRE il fallback a `window.t(k, f)`.
- **Qualunque azione che promette di "condividere/inviare/proporre al gruppo"** deve controllare `window.state?.group` prima di procedere e mostrare un messaggio onesto alternativo se non c'è un gruppo attivo — pattern consistente in `gf-wishlist.js`, `gf-crowdsource.js`, `group-checklist.js`, `group-expenses.js`, `gf-menu-photos.js`, `gf-places-panel.js`.
- **Chiudere una connessione MQTT subito dopo un broadcast è rischioso**: `pub()` è fire-and-forget (QoS 0), `mqttClient.end(true)` è un force-close — se serve che un ultimo messaggio esca davvero prima di disconnettersi, aggiungere un margine (vedi `deleteGroup()` in `gf-analysis.js`, 500ms).
- **Snapshot/backup con campi extra**: se si aggiunge un nuovo campo persistente a `window.state`, verificare se va incluso in `BACKUP_FIELDS` (`backup-restore.js`) e/o `EXTRA_FIELDS` (`itinerary-snapshots.js`).
- **Campi POI di gruppo**: possono essere il valore diretto o un metadato CRDT `{value, timestamp, peerId}` — gestire entrambe le forme (vedi unwrap in `audit-log-viewer.js`).
- **Mappe azione↔label/icona** esistono in due punti (`ACTION_ICONS` in `itinerary-version-history.js`, `descriptions` in `itinerary-phase4.js`) — aggiornare entrambe se si aggiunge un tipo di azione.
- Prima di un refactor/feature grossa: cercare worktree isolate in `.claude/worktrees/` o branch `claude/*` — **questa sessione le ha azzerate**, ma verificarne sempre contenuto reale (`git merge-base --is-ancestor`) prima di ripulire eventuali nuove worktree future, non solo l'età.
- **Verifica selettore-per-selettore prima di "correggere" un bug UI su appiattitori CSS**.
- **Debug bleed-through/z-index in browser reale**: usa `document.elementFromPoint(x,y)` per capire quale elemento è VISIVAMENTE lì prima di editare CSS a occhio — in questa sessione l'ipotesi iniziale (`.sheet`) era sbagliata, l'elemento reale era `#y2kwin-menu` (sistema `y2k-windows.js` diverso). Tiers z-index attuali dell'app: contenuto 0-10, `.sheet`/`.sheet-inner` 150/151, `header`/`nav.bottom`/`#filters` 100/101, ricerca sticky in sheet 300, toast/alert critici 1400+.
- **Browser cache CSS/JS aggressiva nel dev locale**: dopo una modifica a un file `.css`/`.js`, un `navigate()` semplice nel browser Puppeteer/Playwright spesso NON rifetcha il file (serve fino da cache anche col server locale riavviato). Cache-bust esplicito: `link.href = link.href.split('?')[0] + '?v=' + Date.now()` per CSS, oppure `XMLHttpRequest` sincrono + `eval()` per rieseguire un JS senza reload pagina intera (utile per non perdere lo stato seedato in `window.state`).
- **Grep di verifica "deve dare 0" che non dà 0**: richiede conferma esplicita dell'utente (vedi memoria `verification-gate-discipline`).
- **Tool esterni da skill non fidate con pacchetto di nome diverso** = typosquat, non aggirare il blocco (vedi memoria `graphify-typosquat-caution`).
- **Decisioni di "eliminare/riordinare" codice**: presentarle come raccomandazione con verifica (grep chiamanti, non solo grep del nome file), agire solo su conferma esplicita.
- **Prima di eliminare codice "morto"**: verificare SEMPRE i chiamanti con grep mirato (non solo il nome della funzione, anche pattern come `window.X = `), e per le proprietà lette (es. `poi._gfStatus`) verificare che nessuno le scriva mai, non solo che "sembrino" inutilizzate.

## Problemi noti
- GitHub Pages: run in coda da giorni, problema infrastruttura GitHub; Vercel è il deploy che conta.
- `fmgf_url`/link Find Me Gluten Free sono link manuali di verifica (nessuna API: CORS) — scelta deliberata.
- Nessuna chiave API reale in locale (Google Places, Groq): le feature che le usano falliscono con 404/501/503 in dev — atteso.
- `wizardRender: false` nello smoke test — soft check, pre-esistente, priorità bassa.
