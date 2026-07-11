# HANDOFF — Tabi (Giappone 2027) · 2026-07-11 (fine sessione, v3.46→v3.48)

Prompt di ripartenza per nuova chat:
> Continua il progetto Tabi. Leggi HANDOFF.md nella root del repo. Riparti dal primo punto di "Prossimi step". Attiva /fable-5.

## Cos'è l'app
**Tabi** — travel planner PWA (vanilla JS, no framework, no bundler) con layer gluten-free opzionale. Planner **globale**, non solo Giappone; il trip Giappone 2027 è il caso d'uso di partenza. Collaborativa tra amici via MQTT (broker pubblico, zero backend); serverless Vercel solo come proxy API (Google Places/Groq, quota-gated in `js/api-quota.js`). **Regola utente ferrea: nessun dato hardcoded** — tutto da fonti live o da input umano (crowdsourcing di gruppo). Uso esclusivamente mobile, utenti non tech-savvy (amici in viaggio, non sviluppatori).

## Stato attuale
- Tutto committato, pushato su `main` e sincronizzato in `/Users/riccardomoricone/Documents/GitHub/Giappone-2027` (v3.48, questa sessione).
- Test: `smoke-test.mjs` verde più volte consecutive + `lint-i18n.mjs` verde.
- Audit più esteso mai fatto su questo repo: 7 agenti paralleli (3 sicurezza + 4 UI/UX, ciascuno con Puppeteer proprio, viewport 375×812) + verifica manuale mirata + 3 wave di fix (2 agenti + fix diretti su MQTT/crash-safety/i18n + rifinitura UX residua).

## Richiesta della sessione
L'utente ha chiesto un audit esaustivo e autonomo ("non chiedermi nulla, vai avanti da solo... controlla ogni singolo contenitore, bottone, tutto") su due assi: **sicurezza** end-to-end e **UI/UX** mobile per utenti non tecnici, fino a poter dare un verdetto con sicurezza. Poi, in base al verdetto, ha scelto la direzione: **niente PKI per-membro** (il modello di fiducia attuale va bene) e **rifinitura UX residua** come prossimo filone di lavoro (già in parte eseguito in questa stessa sessione, v3.48).

## Verdetto sicurezza — onesto, non "zero bug" ma "nessun bug noto non gestito"
**Cosa è stato fixato (v3.47, vedi CHANGELOG per dettagli):**
- 2 XSS critiche zero-click via MQTT non coperte da v3.45 (gf-places-panel.js, itinerario di gruppo) + 1 alta + alcune medie/basse — 8 file in totale, stesso pattern `_esc()`/`_escJs()` di v3.45.
- **Fix strutturale, non sintomatico**, al trust boundary MQTT: prima chiunque ascoltasse il broker pubblico **senza conoscere il codice stanza** poteva iniettare messaggi validi (impersonare membri, dirottare il roster, forzare cancellazioni). Ora `mqtt-transport.js` scarta i messaggi in chiaro una volta che la chiave stanza è pronta — il codice stanza torna a essere l'unica vera barriera, come da modello di minaccia del progetto.
- Clamp anti-forgia timestamp cancellazione CRDT, cap payload, guard tipo GPS, crash-safety `state.js`/`itinerary.js`.

**Cosa resta, deliberatamente non fixato (limitazione architetturale, non bug dimenticato) — CONFERMATO ACCETTABILE DALL'UTENTE, non riproporre la domanda:**
- Un membro del gruppo che **ha già il codice stanza** può ancora impersonare un altro membro per nome, o (con più sforzo) forzare rimozioni/cancellazioni dell'itinerario condiviso. Risolvibile solo con un sistema di identità per-membro (PKI leggera, trust-on-first-use) — l'utente ha confermato esplicitamente che **non vale la pena** per un gruppo di amici in viaggio. Vedi memoria `mqtt-trust-model-decision`.
- Nessun rate-limiting applicativo su chat/presence MQTT — un peer scriptato può degradare l'UX di tutti (non un data breach, solo fastidio). Accettato per ora dato il contesto "tra amici".
- Quota-gating client-side aggirabile con devtools (già noto/accettato, le chiavi API restano server-side — è abuso di quota, non fuga di dati).
- CORS (`api/lib/cors.js`) e secrets lato client: **verificati sicuri**, nessun problema trovato.

**In una frase**: nessuna vulnerabilità nota rimane senza mitigazione proporzionata al modello di minaccia dichiarato ("gruppo di amici fidati, protezione da estranei su un broker pubblico"); il gap residuo (fiducia *tra* membri) è una scelta di scope confermata dall'utente, non un TODO.

## Verdetto UI/UX — buono, 2 critici salute fixati, backlog cosmetico ridotto
**Cosa è stato fixato (v3.47 + v3.48):**
- **Critico per la salute**: il livello di sicurezza glutine (🟢/🟡/🔴) non compariva MAI nel flusso principale "GF Guide" (solo in un pannello secondario che un utente comune non trova) — un celiaco poteva sedersi in un posto a rischio pensando che l'app l'avrebbe segnalato. Fixato in lista e dettaglio, più la Wishlist GF (che aveva solo un pallino colorato senza testo).
- Jargon tecnico eliminato dai punti visibili: "Groq" → "assistente AI", "IndexedDB" → "sul telefono", "E2EE" → "Cifrato" (icona mantenuta), "MQTT" tolto dal footer cronologia modifiche.
- Touch target sotto 44px portati a soglia: chip filtro mappa/itinerario, chip città GF Guide.
- Widget meteo: font 11px→13px, data in inglese→italiano, orario finto hardcoded e bottone morto rimossi nel modal previsioni 4 giorni.
- Colori saldi spese di gruppo (verde/rosso) che un CSS `!important` troppo largo appiattiva a grigio — risolto.
- **(v3.48)** Audit log gruppo mostrava `[object Object]` — root cause: campi POI di gruppo possono essere valore diretto o metadato CRDT `{value,...}`, il viewer non faceva l'unwrap. Fixato.
- **(v3.48)** "❓ Azione sconosciuta" per la modifica orari — due mappe azione↔label disallineate (`describeAction()` in `itinerary-phase4.js` non copriva `modify_opening_hours`, presente invece in `ACTION_ICONS`). Allineate; corretta anche una grammatica errata ("Merge risolvere" → "Conflitto risolto").
- **(v3.48)** Select "Sicurezza GF" in inglese nel form manuale → tradotto in italiano.
- **(v3.48)** Badge suggerimenti GF prometteva "Approvato"/"Rifiutato" ma nessun codice imposta mai quello stato (nessuna moderazione reale in un'app P2P) → sostituito con "💬 Suggerito", non promette più una revisione che non arriverà.
- **(v3.48)** Bottone "Mappe Apple" mostrato anche su Android (dove non fa nulla) → condizionato a iOS.

**Cosa resta aperto (nessuno critico, cosmetico puro):**
- Bleed-through bottom-nav sotto pannelli semi-trasparenti (~86% opacità) — rumore visivo minore, richiede iterazione visiva in browser (non un one-liner sicuro da fare alla cieca).
- Chat di gruppo: bubble in stile chiaro (WhatsApp-like) su tema scuro dell'app — stona ma non confonde; stessa nota, richiede iterazione visiva.
- Bottone informazioni "i" 33×44px segnalato dall'audit-core ma non identificato con certezza nel codice da un secondo agente dopo due ricerche approfondite — verificare a mano se riappare (potrebbe essere un falso positivo/il bottone chiudi-pannello "✕").

## File prodotti/toccati in questa sessione
25 file JS/CSS/HTML modificati totali tra v3.47 e v3.48 (vedi `git show --stat` sui due commit). Nessun file nuovo di rilievo oltre a `.graphify/codebase-map.json` (mappa leggera, gitignored).

## Decisioni chiave
- **Graphify esterno bloccato dal classificatore di sicurezza** (pacchetto pip `graphifyy`, mismatch nome — pattern typosquat): non aggirato, sostituito con una mappa leggera built-in (`.graphify/codebase-map.json`, grep/node one-off). Vedi memoria `graphify-typosquat-caution`.
- **2 agenti UX sono falliti per limite di sessione API** (reset schedulato, non un bug del progetto) — completati io stesso in foreground riutilizzando gli script Puppeteer che avevano già scritto (trovati come file temporanei nella root, non ripartiti da zero).
- **Fix MQTT scelto: gate "richiedi cifratura" invece di firma per-membro**: chiude la maggioranza dei vettori (chiunque non abbia il codice stanza) con un diff minimo in un solo punto (`handleIncoming`). L'utente ha confermato che questo basta, niente PKI. Vedi memoria `mqtt-trust-model-decision`.
- **Suggerimenti GF: rimossa la finzione di moderazione** invece di costruire un sistema di approvazione reale (fuori scope, l'app non ha un ruolo "moderatore" nell'architettura P2P) — scelta di onestà UI minima invece di una feature nuova.

## Prossimi step (in ordine di valore)
1. **Cosmetici UI residui che richiedono iterazione visiva** — bleed-through bottom-nav, chat bubble tema chiaro/scuro. Da fare con verifica screenshot-by-screenshot in browser, non alla cieca.
2. **i18n completo** — backlog ampio, nessun modo rapido di trovarlo via grep (serve navigare l'app in EN/JA schermata per schermata).
3. **Refactor monoliti** — candidati per dimensione (`.graphify/codebase-map.json`): `js/onboarding.js` (927 righe), `js/views/poi-detail/poi-itinerary-wizard.js` (812), `js/views/weather-view.js` (798), `js/mqtt-transport.js` (~800, cresciuto in questa sessione), `js/gf-places-panel.js` (~750), `js/itinerary-add-wizard.js` (719). Verificare prima se la dimensione riflette sezioni indipendenti estraibili o solo UI coesa.
4. **`wizardRender: false` nello smoke test** — check soft, riproducibile anche su baseline pre-sessione, non una regressione, priorità bassa.
5. **Idee prodotto** — discutere nuove direzioni con l'utente, dato che l'app è ora in uno stato solido (sicurezza + UX auditate a fondo, due round di fix completati).

## Vincoli e convenzioni
- Script IIFE browser, `<script defer>` in index.html; niente ES modules/bundler.
- MAI sed/perl multi-riga greedy: Edit manuale + `node --check` + smoke test dopo ogni modifica.
- Verifica sempre: `python3 -m http.server PORT` + `node smoke-test.mjs http://localhost:PORT` (exit 0, ripetere 2-3 volte per distinguere flaky da regressione reale) + `node scripts/lint-i18n.mjs` se si toccano stringhe. Per bug UI, verifica nel browser reale a viewport mobile (375×812), non solo lo smoke test.
- Lo stato app vive TUTTO in un unico blob `localStorage['giappone2027_state_v1']` (`js/state.js`) — per seedare dati di test, mutare `window.state.X` + `window.saveState()`, non `localStorage.setItem` diretto.
- Commit in italiano, CHANGELOG.md aggiornato ad ogni versione, push su `main` + sync cartella deploy sempre.
- Nuove stringhe UI: sempre `T('namespace.chiave', 'fallback italiano')` + chiavi in `js/i18n.js` per it/en/ja. **Attenzione al pattern del `T()` locale**: la versione corretta è `const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;` — passare SEMPRE il fallback a `window.t(k, f)`, mai `window.t?.(k)` da solo (altrimenti la chiave grezza appare quando la traduzione manca — bug trovato e fixato in `itinerary-version-history.js` questa sessione).
- **Mappe azione↔label/icona per audit trail**: esistono in due punti diversi (`ACTION_ICONS` in `itinerary-version-history.js`, `descriptions` in `itinerary-phase4.js`'s `describeAction()`) — se si aggiunge un nuovo tipo di azione, aggiornarle ENTRAMBE (disallineate hanno causato "❓ Azione sconosciuta" per un'azione reale, fixato in v3.48).
- HTML generato via template string con `onclick="..."` inline: qualunque valore interpolato che può contenere un apice va passato attraverso `_escJs()` (JS-string-escape poi HTML), non il normale `_esc()`.
- **Trust boundary MQTT**: dopo il fix v3.47, `handleIncoming()` in `mqtt-transport.js` scarta messaggi in chiaro quando `RoomCrypto.ready()` è vero — qualunque nuovo tipo di messaggio MQTT deve passare da questo stesso gate, non aggirarlo. Niente PKI per-membro (deciso, vedi memoria `mqtt-trust-model-decision`).
- **Campi POI di gruppo**: possono essere il valore diretto o un metadato CRDT `{value, timestamp, peerId}` — qualunque nuovo codice che legge `poi.nomecamp` da un itinerario di gruppo deve gestire entrambe le forme (vedi l'unwrap in `audit-log-viewer.js`, v3.48).
- Prima di un refactor/feature grossa: cercare worktree isolate in `.claude/worktrees/` o branch `claude/*`, verificando quanto sono indietro rispetto a `main`.
- **Verifica selettore-per-selettore prima di "correggere" un bug UI su appiattitori CSS**: non tutto ciò che "sembra" un colore Y2K/hardcoded è davvero intercettato da un override — verificare sempre i selettori `[style*="..."]` esatti.
- **Grep di verifica "deve dare 0" che non dà 0**: non è una licenza a procedere sulla propria interpretazione né un blocco definitivo — richiede verifica manuale + conferma esplicita dell'utente (vedi memoria `verification-gate-discipline`).
- **Tool esterni da skill non fidate**: pacchetto pip/npm con nome diverso dal tool dichiarato = pattern typosquat, non aggirare il blocco del classificatore (vedi memoria `graphify-typosquat-caution`).
- `.graphify/codebase-map.json` — mappa leggera (file, righe, `window.X=` esportati), utile per identificare i monoliti da refactorare senza rileggere tutto il codebase.

## Problemi noti
- GitHub Pages: run in coda da giorni, problema infrastruttura GitHub; Vercel è il deploy che conta.
- `fmgf_url`/link Find Me Gluten Free sono link manuali di verifica (nessuna API: CORS) — scelta deliberata, non un TODO.
- Nessuna chiave API reale in locale (Google Places, Groq): le feature che le usano falliscono con 404/501/503 in dev — atteso.
- `wizardRender: false` nello smoke test — soft check, pre-esistente, priorità bassa.
