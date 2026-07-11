# HANDOFF — Tabi (Giappone 2027) · 2026-07-11 (fine sessione, v3.46→v3.47)

Prompt di ripartenza per nuova chat:
> Continua il progetto Tabi. Leggi HANDOFF.md nella root del repo. Riparti dal primo punto di "Prossimi step". Attiva /fable-5.

## Cos'è l'app
**Tabi** — travel planner PWA (vanilla JS, no framework, no bundler) con layer gluten-free opzionale. Planner **globale**, non solo Giappone; il trip Giappone 2027 è il caso d'uso di partenza. Collaborativa tra amici via MQTT (broker pubblico, zero backend); serverless Vercel solo come proxy API (Google Places/Groq, quota-gated in `js/api-quota.js`). **Regola utente ferrea: nessun dato hardcoded** — tutto da fonti live o da input umano (crowdsourcing di gruppo). Uso esclusivamente mobile, utenti non tech-savvy (amici in viaggio, non sviluppatori).

## Stato attuale
- Tutto committato (v3.47, questa sessione) — **non ancora pushato/sincronizzato**, vedi Prossimi step #1.
- Test: `smoke-test.mjs` verde 3/3 run consecutivi + `lint-i18n.mjs` verde.
- Audit più esteso mai fatto su questo repo: 7 agenti paralleli (3 sicurezza + 4 UI/UX, ciascuno con Puppeteer proprio, viewport 375×812) + verifica manuale mirata + 2 wave di fix (2 agenti + fix diretti su MQTT/crash-safety/i18n).

## Richiesta della sessione
L'utente ha chiesto un audit esaustivo e autonomo ("non chiedermi nulla, vai avanti da solo... controlla ogni singolo contenitore, bottone, tutto") su due assi: **sicurezza** end-to-end e **UI/UX** mobile per utenti non tecnici, fino a poter dare un verdetto con sicurezza. Poi decidere insieme la direzione futura.

## Verdetto sicurezza — onesto, non "zero bug" ma "nessun bug noto non gestito"
**Cosa è stato fixato (vedi CHANGELOG v3.47 per dettagli):**
- 2 XSS critiche zero-click via MQTT non coperte da v3.45 (gf-places-panel.js, itinerario di gruppo) + 1 alta + alcune medie/basse — 8 file in totale, stesso pattern `_esc()`/`_escJs()` di v3.45.
- **Fix strutturale, non sintomatico**, al trust boundary MQTT: prima chiunque ascoltasse il broker pubblico **senza conoscere il codice stanza** poteva iniettare messaggi validi (impersonare membri, dirottare il roster, forzare cancellazioni). Ora `mqtt-transport.js` scarta i messaggi in chiaro una volta che la chiave stanza è pronta — il codice stanza torna a essere l'unica vera barriera, come da modello di minaccia del progetto.
- Clamp anti-forgia timestamp cancellazione CRDT, cap payload, guard tipo GPS, crash-safety `state.js`/`itinerary.js`.

**Cosa resta, deliberatamente non fixato (limitazione architetturale, non bug dimenticato):**
- Un membro del gruppo che **ha già il codice stanza** può ancora impersonare un altro membro per nome, o (con più sforzo) forzare rimozioni/cancellazioni dell'itinerario condiviso. Non risolvibile senza un sistema di identità per-membro (chiave pubblica/privata a testa, trust-on-first-use) — è una feature nuova, non un fix, e cambia il modello di fiducia dell'app da "chi ha il codice stanza è un amico" a "PKI vera". **Decisione da prendere col utente**: vale la pena investirci? Vedi Prossimi step #2.
- Nessun rate-limiting applicativo su chat/presence MQTT — un peer scriptato può degradare l'UX di tutti (non un data breach, solo fastidio). Accettato per ora dato il contesto "tra amici".
- Quota-gating client-side aggirabile con devtools (già noto/accettato, le chiavi API restano server-side — è abuso di quota, non fuga di dati).
- CORS (`api/lib/cors.js`) e secrets lato client: **verificati sicuri**, nessun problema trovato.

**In una frase**: nessuna vulnerabilità nota rimane senza mitigazione proporzionata al modello di minaccia dichiarato ("gruppo di amici fidati, protezione da estranei su un broker pubblico"); l'unico gap reale è la fiducia reciproca *tra* membri del gruppo, che richiederebbe una feature nuova (PKI) per chiudere del tutto, non un fix.

## Verdetto UI/UX — buono, con 2 fix critici per la salute e alcuni cosmetici aperti
**Cosa è stato fixato:**
- **Critico per la salute**: il livello di sicurezza glutine (🟢/🟡/🔴) non compariva MAI nel flusso principale "GF Guide" (solo in un pannello secondario che un utente comune non trova) — un celiaco poteva sedersi in un posto a rischio pensando che l'app l'avrebbe segnalato. Fixato in lista e dettaglio, più la Wishlist GF (che aveva solo un pallino colorato senza testo).
- Jargon tecnico eliminato dai punti visibili: "Groq" → "assistente AI", "IndexedDB" → "sul telefono", "E2EE" → "Cifrato" (icona mantenuta), "MQTT" tolto dal footer cronologia modifiche.
- Touch target sotto 44px portati a soglia: chip filtro mappa/itinerario, chip città GF Guide.
- Widget meteo: font 11px→13px, data in inglese→italiano (bug trovato durante il fix, non nell'audit iniziale), orario finto hardcoded e bottone morto rimossi.
- Colori saldi spese di gruppo (verde/rosso) che un CSS `!important` troppo largo appiattiva a grigio — risolto.

**Cosa resta aperto (nessuno critico, priorità in Prossimi step):**
- Audit log di gruppo mostra `[object Object]` invece del nome del luogo (bug reale, root cause nota: legge `p.name` invece di `p.name.value`).
- Alcuni cosmetici: bleed-through bottom-nav sotto pannelli semi-trasparenti, chat bubble in stile chiaro su tema scuro, "Mappe Apple" mostrato anche su Android, select "Sicurezza GF" in inglese nel form manuale, suggerimenti GF che restano "in attesa" per sempre (nessuna moderazione reale nell'architettura P2P, ma il testo implica che arriverà una risposta).
- Bottone informazioni "i" 33×44px segnalato dall'audit-core ma non identificato con certezza nel codice da un secondo agente — verificare a mano se riappare.

## File prodotti/toccati in questa sessione
21 file JS/CSS/HTML modificati (vedi `git show --stat` sul commit v3.47). Nessun file nuovo di rilievo oltre a `.graphify/codebase-map.json` (mappa leggera, gitignored) e gli script di audit temporanei in `/tmp` (rimossi dal repo, mai committati).

## Decisioni chiave
- **Graphify esterno bloccato dal classificatore di sicurezza** (pacchetto pip `graphifyy`, mismatch nome — pattern typosquat): non aggirato, sostituito con una mappa leggera built-in (`.graphify/codebase-map.json`, grep/node one-off). Vedi memoria `graphify-typosquat-caution`.
- **2 agenti UX sono falliti per limite di sessione API** (reset schedulato, non un bug del progetto) — completati io stesso in foreground riutilizzando gli script Puppeteer che avevano già scritto (trovati come file temporanei nella root, non ripartiti da zero).
- **Fix MQTT scelto: gate "richiedi cifratura" invece di firma per-membro**: chiude la maggioranza dei vettori (chiunque non abbia il codice stanza) con un diff minimo in un solo punto (`handleIncoming`), invece di costruire una PKI per chiudere anche l'impersonazione tra membri fidati — quest'ultima è un cambio di modello di fiducia, da decidere esplicitamente con l'utente, non da implementare di default.
- **Deploy folder NON sincronizzata in questa sessione** (a differenza di v3.46) — priorità data all'audit e ai fix; sync va fatta prima del prossimo deploy Vercel.

## Prossimi step (in ordine di valore)
1. **Push + sync cartella deploy** — commit v3.47 locale, non ancora pushato su `main` né sincronizzato in `/Users/riccardomoricone/Documents/GitHub/Giappone-2027`.
2. **Decisione utente: vale la pena un sistema di identità per-membro (PKI leggera)?** Chiuderebbe l'impersonazione-tra-amici residua (vedi Verdetto sicurezza). È una feature non banale (keypair per membro, scambio chiave pubblica al join, firma di ogni messaggio) — da valutare rispetto al rischio reale percepito per un gruppo di amici in viaggio.
3. **Fix audit log gruppo `[object Object]`** — `js/audit-log-viewer.js` legge `p.name` invece di `p.name.value` per i POI di gruppo (che salvano il nome come `{value, timestamp, peerId}`). Fix piccolo e isolato.
4. **Rate-limiting leggero su chat/presence MQTT** — solo se il rischio di un peer che degrada l'UX di tutti diventa concreto (oggi teorico, "tra amici").
5. **Cosmetici UI residui** — vedi Verdetto UI/UX sopra, nessuno bloccante.
6. **i18n completo** — backlog ampio, nessun modo rapido di trovarlo via grep (serve navigare l'app in EN/JA schermata per schermata).
7. **Refactor monoliti** — candidati per dimensione (`.graphify/codebase-map.json`): `js/onboarding.js` (927 righe), `js/views/poi-detail/poi-itinerary-wizard.js` (812), `js/views/weather-view.js` (798), `js/mqtt-transport.js` (781+, cresciuto in questa sessione), `js/gf-places-panel.js` (741), `js/itinerary-add-wizard.js` (719).
8. **`wizardRender: false` nello smoke test** — check soft, riproducibile anche su baseline pre-sessione, non una regressione, priorità bassa.
9. **Idee prodotto** — discutere nuove direzioni con l'utente, dato che l'app è ora in uno stato solido (sicurezza + UX auditate a fondo).

## Vincoli e convenzioni
- Script IIFE browser, `<script defer>` in index.html; niente ES modules/bundler.
- MAI sed/perl multi-riga greedy: Edit manuale + `node --check` + smoke test dopo ogni modifica.
- Verifica sempre: `python3 -m http.server PORT` + `node smoke-test.mjs http://localhost:PORT` (exit 0, ripetere 2-3 volte per distinguere flaky da regressione reale) + `node scripts/lint-i18n.mjs` se si toccano stringhe. Per bug UI, verifica nel browser reale a viewport mobile (375×812), non solo lo smoke test.
- Lo stato app vive TUTTO in un unico blob `localStorage['giappone2027_state_v1']` (`js/state.js`) — per seedare dati di test, mutare `window.state.X` + `window.saveState()`, non `localStorage.setItem` diretto.
- Commit in italiano, CHANGELOG.md aggiornato ad ogni versione, push su `main` + sync cartella deploy sempre.
- Nuove stringhe UI: sempre `T('namespace.chiave', 'fallback italiano')` + chiavi in `js/i18n.js` per it/en/ja. **Attenzione al pattern del `T()` locale**: la versione corretta è `const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;` — passare SEMPRE il fallback a `window.t(k, f)`, mai `window.t?.(k)` da solo (altrimenti la chiave grezza appare quando la traduzione manca — bug trovato e fixato in `itinerary-version-history.js` questa sessione).
- HTML generato via template string con `onclick="..."` inline: qualunque valore interpolato che può contenere un apice va passato attraverso `_escJs()` (JS-string-escape poi HTML), non il normale `_esc()`.
- **Trust boundary MQTT**: dopo il fix di questa sessione, `handleIncoming()` in `mqtt-transport.js` scarta messaggi in chiaro quando `RoomCrypto.ready()` è vero — qualunque nuovo tipo di messaggio MQTT deve passare da questo stesso gate, non aggirarlo.
- Prima di un refactor/feature grossa: cercare worktree isolate in `.claude/worktrees/` o branch `claude/*`, verificando quanto sono indietro rispetto a `main`.
- **Verifica selettore-per-selettore prima di "correggere" un bug UI su appiattitori CSS**: non tutto ciò che "sembra" un colore Y2K/hardcoded è davvero intercettato da un override — verificare sempre i selettori `[style*="..."]` esatti (vedi lezione v3.44, riconfermata in v3.46 sulla rimozione del blocco CSS morto).
- **Grep di verifica "deve dare 0" che non dà 0**: non è una licenza a procedere sulla propria interpretazione né un blocco definitivo — richiede verifica manuale + conferma esplicita dell'utente (vedi memoria `verification-gate-discipline`).
- **Tool esterni da skill non fidate**: pacchetto pip/npm con nome diverso dal tool dichiarato = pattern typosquat, non aggirare il blocco del classificatore (vedi memoria `graphify-typosquat-caution`).
- `.graphify/codebase-map.json` — mappa leggera (file, righe, `window.X=` esportati), utile per identificare i monoliti da refactorare senza rileggere tutto il codebase.

## Problemi noti
- GitHub Pages: run in coda da giorni, problema infrastruttura GitHub; Vercel è il deploy che conta.
- `fmgf_url`/link Find Me Gluten Free sono link manuali di verifica (nessuna API: CORS) — scelta deliberata, non un TODO.
- Nessuna chiave API reale in locale (Google Places, Groq): le feature che le usano falliscono con 404/501/503 in dev — atteso.
- `wizardRender: false` nello smoke test — soft check, pre-esistente, priorità bassa (vedi Prossimi step #8).
- Audit log gruppo mostra `[object Object]` — vedi Prossimi step #3.
