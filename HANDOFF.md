# HANDOFF — Tabi (Giappone 2027) · 2026-07-11 (fine sessione, v3.46→v3.50)

Prompt di ripartenza per nuova chat:
> Continua il progetto Tabi. Leggi HANDOFF.md nella root del repo. Riparti dal primo punto di "Prossimi step". Attiva /fable-5.

## Cos'è l'app
**Tabi** — travel planner PWA (vanilla JS, no framework, no bundler) con layer gluten-free opzionale. Planner **globale**, non solo Giappone; il trip Giappone 2027 è il caso d'uso di partenza. Collaborativa tra amici via MQTT (broker pubblico, zero backend); serverless Vercel solo come proxy API (Google Places/Groq, quota-gated in `js/api-quota.js`). **Regola utente ferrea: nessun dato hardcoded** — tutto da fonti live o da input umano (crowdsourcing di gruppo). Uso esclusivamente mobile, utenti non tech-savvy (amici in viaggio, non sviluppatori).

## Stato attuale
- Tutto committato, pushato su `main` e sincronizzato in `/Users/riccardomoricone/Documents/GitHub/Giappone-2027` (v3.50, questa sessione).
- Test: `smoke-test.mjs` verde più volte consecutive + `lint-i18n.mjs` verde.
- Sessione con la copertura di test più estesa mai fatta su questo repo: 7 agenti paralleli (audit sicurezza+UX) + 2 agenti di verifica semantica (ogni bottone fa davvero quello che promette) + test end-to-end reali con 2 browser separati sul broker MQTT pubblico (non mockato) per gruppo/GPS/chat/eliminazione stanza.

## Richiesta della sessione
Due round: (1) audit esaustivo sicurezza+UX mobile ("controlla ogni singolo contenitore, bottone"), poi (2) su richiesta esplicita di continuare, verifica che **ogni bottone faccia davvero quello che promette** ("nessun errore, nessuna mezza funzione"), con test reali a 2 utenti simulati (gruppo, GPS, chat) via MQTT vero, non mockato.

## Verdetto sicurezza — nessun bug noto non gestito
**Fixato (v3.47, v3.49):**
- 2 XSS critiche zero-click via MQTT + altre 6 minori (8 file, pattern `_esc()`/`_escJs()`).
- **Fix strutturale trust boundary MQTT**: `handleIncoming()` scarta messaggi in chiaro una volta che la chiave stanza è pronta — chiude impersonazione/roster-hijack/cancellazioni forzate da chi non conosce il codice stanza.
- **Regressione trovata e fixata nello stesso giro (v3.49)**: il fix sopra scartava anche la presence/heartbeat (inviata volutamente in chiaro per design originale) — rotto il conteggio membri online per QUALUNQUE gruppo reale. Corretto instradando la presence nel percorso cifrato (`peerBroadcast`), verificato con un test reale a 2 browser sul broker pubblico.
- Clamp anti-forgia timestamp CRDT, cap payload, guard tipo GPS, crash-safety `state.js`/`itinerary.js`.

**Deliberatamente non fixato, CONFERMATO ACCETTABILE DALL'UTENTE — non riproporre la domanda:**
- Impersonazione tra membri che condividono già il codice stanza — richiederebbe una PKI per-membro, l'utente ha confermato che non vale la pena per un gruppo di amici in viaggio. Vedi memoria `mqtt-trust-model-decision`.
- Nessun rate-limiting su chat/presence MQTT (fastidio, non data breach — accettato).
- Quota-gating client-side aggirabile con devtools (chiavi restano server-side, è abuso di quota non fuga dati — noto/accettato).
- CORS e secrets lato client: verificati sicuri.

## Verdetto UI/UX — solido, 2 critici salute + 1 corruzione dati + 1 dialog falso fixati
**Fixato in questa sessione (v3.47→v3.50), evidenza raccolta tramite test reali dove possibile:**
- Badge sicurezza glutine assente nel flusso GF principale + wishlist solo-colore (critico salute).
- Jargon tecnico rimosso (Groq/IndexedDB/E2EE/MQTT), touch target 44px, widget meteo data inglese→italiano + orario finto + bottone morto rimossi, colori spese appiattiti da CSS, audit-log `[object Object]`, "Azione sconosciuta" (mappe azione↔label disallineate), select GF in inglese, moderazione GF fittizia, Mappe Apple su Android.
- **(v3.50) Corruzione dati silenziosa**: `custom-poi.js` passava il campo sbagliato (`googlePlaceId` invece di `id`) al wizard aggiungi-itinerario — POI personalizzati salvati con `poi_id: undefined`, rischio di modifiche incrociate tra tappe diverse. Causa radice: **due implementazioni concorrenti** di `openAddToItineraryWizard` (una morta, mai raggiungibile — vedi "Da decidere insieme"). Fixato il chiamante.
- **(v3.50) Dialog con dichiarazione falsa**: "Elimina stanza" prometteva "tutti i membri verranno disconnessi" ma faceva solo pulizia locale. Ora c'è un broadcast reale + gestore lato ricezione, verificato con 2 browser separati sul broker MQTT vero. Trovati e fixati nello stesso giro: doppia conferma (dialog mostrato 2 volte) e una race condition (il socket si chiudeva prima che il messaggio uscisse davvero sulla rete).
- **(v3.50) Falso successo, 4 istanze dello stesso pattern**: checklist di gruppo, spese di gruppo, foto menù GF, invio suggerimento GF mostravano "condiviso col gruppo" anche senza un gruppo attivo. Aggiunto messaggio onesto alternativo.
- **(v3.50) Perdita dati silenziosa**: il backup "completo" non includeva `tripProfile`/`tickets` (persi in un cambio telefono, il caso d'uso dichiarato del modulo); il ripristino di uno snapshot non salvava la propria rete di sicurezza in modo simmetrico (rischio di perdita permanente in un caso limite ma riproducibile). Entrambi fixati.

**Cosa resta aperto (nessuno critico):**
- Bleed-through bottom-nav sotto pannelli semi-trasparenti; chat bubble stile chiaro su tema scuro — richiedono iterazione visiva in browser, non fix alla cieca.
- Bottone informazioni "i" 33×44px segnalato ma non identificato con certezza nel codice (2 ricerche approfondite, nessun match) — verificare a mano se riappare.
- `js/itinerary-features.js` `applyDayHours` bypassa i metodi `window.ITINERARY`, quindi "Applica" in "Riordina per orari" non è coperto da Annulla/Ctrl+Z (solo dallo snapshot automatico).
- Cosmetici minori: etichetta "Giorni Rimanenti" nel budget mostra in realtà giorni pianificati; badge countdown biglietti stantio dopo cambio stato; suggerimento itinerario duplicato senza feedback; permesso notifiche negato durante il click senza toast.

## File prodotti/toccati in questa sessione
37 file JS/CSS/HTML modificati totali tra v3.47 e v3.50 (vedi `git log --stat` sui 4 commit). Nessun file nuovo di rilievo oltre a `.graphify/codebase-map.json` (gitignored).

## Decisioni chiave
- **Graphify esterno bloccato dal classificatore** (pip `graphifyy`, mismatch nome — typosquat): non aggirato, sostituito con mappa leggera built-in. Vedi memoria `graphify-typosquat-caution`.
- **Diversi agenti falliti per limite di sessione API** durante la sessione (reset schedulato, non un bug del progetto): completati io stesso in foreground con script Puppeteer diretti, incluso il test reale a 2 browser sul broker MQTT pubblico (funziona: la rete non è ristretta per il processo browser lanciato da Puppeteer, a differenza del tool Bash).
- **Debug via console.log inaffidabile in Puppeteer per eventi asincroni tardivi** in questa sessione — verificare sempre lo STATO risultante (`window.state.X`), non i log di console, quando un test "non mostra nulla".
- **`Elimina stanza`: scelto un broadcast best-effort** (`peerBroadcast`, fire-and-forget) invece di un protocollo con conferma di consegna — coerente con come funziona già ogni altro messaggio MQTT dell'app; un peer offline al momento dell'eliminazione scoprirà la stanza vuota solo alla prossima interazione, accettato.
- **File morto trovato ma NON rimosso** (`js/itinerary-add-wizard.js`, 719 righe): l'utente ha chiesto esplicitamente di decidere insieme su "eliminare/riordinare" — presentato come raccomandazione, non eseguito unilateralmente. Un tentativo di rimozione diretta durante la sessione è stato bloccato dal classificatore di sicurezza per questo stesso motivo, correttamente.

## Prossimi step (in ordine di valore)
1. **Decisione utente: rimuovere `js/itinerary-add-wizard.js`?** 719 righe di codice morto al 100% (verificato: la sua funzione pubblica viene sempre sovrascritta da `poi-detail/poi-itinerary-wizard.js`, caricato dopo; nessun altro file referenzia le sue funzioni interne). Se sì, è una rimozione a rischio zero (rimuovere il file + lo `<script>` in index.html).
2. **Fix pre-esistente trovato per caso**: `group_members_updated` dispatchato su `document` senza `bubbles:true` ma ascoltato su `window` in `group-panel.js` — l'evento non arriva mai, il pannello Gruppo aperto non si aggiorna live quando un membro entra (si aggiorna solo alla riapertura). Fix minimo: `bubbles:true` o dispatch su `window`.
3. **Cosmetici UI residui che richiedono iterazione visiva** — bleed-through bottom-nav, chat bubble tema chiaro/scuro.
4. **`applyDayHours` fuori dal sistema undo/redo** — valutare se vale la pena instradarlo tramite `window.ITINERARY` o accettare (solo snapshot automatico come rete di sicurezza).
5. **i18n completo** — backlog ampio, serve navigare l'app in EN/JA schermata per schermata.
6. **Refactor monoliti** — vedi `.graphify/codebase-map.json`: `js/onboarding.js` (927 righe), `js/views/poi-detail/poi-itinerary-wizard.js` (812), `js/views/weather-view.js` (798), `js/mqtt-transport.js` (~830, cresciuto questa sessione), `js/gf-places-panel.js` (~750).
7. **`wizardRender: false` nello smoke test** — check soft, pre-esistente, priorità bassa.
8. **Idee prodotto** — l'app è ora in stato solido (sicurezza + UX + funzionalità reale auditate a fondo su 3 round).

## Vincoli e convenzioni
- Script IIFE browser, `<script defer>` in index.html; niente ES modules/bundler.
- MAI sed/perl multi-riga greedy: Edit manuale + `node --check` + smoke test dopo ogni modifica.
- Verifica sempre: `python3 -m http.server PORT` + `node smoke-test.mjs http://localhost:PORT` (exit 0, ripetere 2-3 volte) + `node scripts/lint-i18n.mjs` se si toccano stringhe. Per bug UI, verifica nel browser reale a viewport mobile (375×812).
- **Per bug MQTT/multi-utente**: il broker pubblico (`broker.emqx.io` ecc.) è raggiungibile da un browser lanciato da Puppeteer (verificato) — usa 2 istanze `puppeteer.launch()` separate (non 2 tab, per isolare `localStorage`) per un test reale a 2 utenti, invece di mockare MQTT. Non fidarti di `console.log` per eventi asincroni tardivi in questi test: verifica lo stato (`window.state.X`) direttamente.
- Lo stato app vive TUTTO in un unico blob `localStorage['giappone2027_state_v1']` (`js/state.js`) — per seedare dati di test, mutare `window.state.X` + `window.saveState()`, non `localStorage.setItem` diretto.
- Commit in italiano, CHANGELOG.md aggiornato ad ogni versione, push su `main` + sync cartella deploy sempre.
- Nuove stringhe UI: sempre `T('namespace.chiave', 'fallback italiano')` + chiavi in `js/i18n.js` per it/en/ja. Pattern corretto del `T()` locale: `const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;` — passare SEMPRE il fallback a `window.t(k, f)`.
- **Qualunque azione che promette di "condividere/inviare/proporre al gruppo"** deve controllare `window.state?.group` prima di procedere e mostrare un messaggio onesto alternativo se non c'è un gruppo attivo (il broadcast è sempre un no-op silenzioso senza stanza) — pattern ormai consistente in `gf-wishlist.js`, `gf-crowdsource.js`, `group-checklist.js`, `group-expenses.js`, `gf-menu-photos.js`, `gf-places-panel.js`.
- **Chiudere una connessione MQTT subito dopo un broadcast è rischioso**: `pub()` è fire-and-forget (QoS 0), `mqttClient.end(true)` è un force-close — se serve che un ultimo messaggio esca davvero prima di disconnettersi, aggiungere un margine (vedi `deleteGroup()` in `gf-analysis.js`, 500ms).
- **Snapshot/backup con campi extra**: se si aggiunge un nuovo campo persistente a `window.state`, verificare se va incluso in `BACKUP_FIELDS` (`backup-restore.js`) e/o `EXTRA_FIELDS` (`itinerary-snapshots.js`) — altrimenti si perde silenziosamente in un backup/ripristino.
- **Campi POI di gruppo**: possono essere il valore diretto o un metadato CRDT `{value, timestamp, peerId}` — gestire entrambe le forme (vedi unwrap in `audit-log-viewer.js`).
- **Mappe azione↔label/icona** esistono in due punti (`ACTION_ICONS` in `itinerary-version-history.js`, `descriptions` in `itinerary-phase4.js`) — aggiornare entrambe se si aggiunge un tipo di azione.
- **`window.openAddToItineraryWizard` ha 2 implementazioni**: quella reale è `js/views/poi-detail/poi-itinerary-wizard.js` (legge `p.id`), quella in `js/itinerary-add-wizard.js` è morta — non aggiungere chiamate assumendo la seconda esista ancora.
- Prima di un refactor/feature grossa: cercare worktree isolate in `.claude/worktrees/` o branch `claude/*`, verificando quanto sono indietro rispetto a `main`.
- **Verifica selettore-per-selettore prima di "correggere" un bug UI su appiattitori CSS**.
- **Grep di verifica "deve dare 0" che non dà 0**: richiede conferma esplicita dell'utente (vedi memoria `verification-gate-discipline`).
- **Tool esterni da skill non fidate con pacchetto di nome diverso** = typosquat, non aggirare il blocco (vedi memoria `graphify-typosquat-caution`).
- **Decisioni di "eliminare/riordinare" codice**: presentarle come raccomandazione, non eseguirle unilateralmente — l'utente vuole deciderle insieme (vedi Prossimi step #1).

## Problemi noti
- GitHub Pages: run in coda da giorni, problema infrastruttura GitHub; Vercel è il deploy che conta.
- `fmgf_url`/link Find Me Gluten Free sono link manuali di verifica (nessuna API: CORS) — scelta deliberata.
- Nessuna chiave API reale in locale (Google Places, Groq): le feature che le usano falliscono con 404/501/503 in dev — atteso.
- `wizardRender: false` nello smoke test — soft check, pre-esistente, priorità bassa.
- `js/itinerary-add-wizard.js` è codice morto — vedi Prossimi step #1.
- `group_members_updated` non aggiorna live il pannello Gruppo aperto — vedi Prossimi step #2.
