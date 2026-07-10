# HANDOFF — Tabi (Giappone 2027) · 2026-07-10 (v3, fine sessione v3.30→v3.44)

Prompt di ripartenza per nuova chat:
> Continua il progetto Tabi. Leggi HANDOFF.md nella root del repo. Riparti dal primo punto di "Prossimi step".

## Cos'è l'app
**Tabi** — travel planner PWA (vanilla JS, no framework, no bundler) con layer gluten-free opzionale. Planner **globale**, non solo Giappone; il trip Giappone 2027 è il caso d'uso di partenza. Collaborativa tra amici via MQTT (broker pubblico, zero backend); serverless Vercel solo come proxy API (Google Places/Groq, quota-gated in `js/api-quota.js`). **Regola utente ferrea: nessun dato hardcoded** — tutto da fonti live o da input umano (crowdsourcing di gruppo).

## Stato attuale (tutto committato e pushato)
- Deploy: Vercel (primario, funziona) + GitHub Pages (secondaria, irrilevante). Cartella deploy sincronizzata ad ogni commit: `/Users/riccardomoricone/Documents/GitHub/Giappone-2027`.
- Test: `smoke-test.mjs` (Puppeteer, exit code reale) + `node scripts/lint-i18n.mjs` — entrambi verdi dopo ogni modifica di questa sessione.
- SW `giappone-2027-v10` + nuova cache `giappone-2027-tiles-v1` (v3.40, tile mappa offline).

### Fatto in questa sessione (v3.30 → v3.44, dettagli in CHANGELOG.md)
1. **Pulizia cerotti CSS** (v3.30-3.32) — solo 3 regole erano davvero morte, non ~3000: il grosso di `legacy-skin.css` è un layer di reskin Y2K→glass tuttora attivo, verificato prima di toccarlo.
2. **Selettore paese destinazione** (v3.33) — onboarding + menu, popolato live da Nager.Date.
3. **Refactor monoliti** (v3.34) — `poi-detail-view.js` 1768→441 righe, `gf-places-panel.js` 972→740.
4. **Audit accenti/riskin** (v3.35) — Gruppo (form mai migrato al tema adattivo) e Meteo (due accenti) sistemati.
5. **Quota-stop GF Guide** (v3.36) — loop città non riprova più a quota esaurita.
6. **i18n parziale** (v3.37) — 32 stringhe tradotte, backlog resta ampio (vedi Prossimi step).
7. **Foto-menu → riscontri GF** (v3.38) — AI suggerisce, mai invia da sola.
8. **Riordina giorno per orari** (v3.39) — `DayHoursReorder`, mirror di `TripOptimizer`.
9. **Offline regionale** (v3.40) — tile mappa + posti GF + POI per zona, verificato con richieste di rete reali.
10. **i18n festività + errori Groq** (v3.41) — 17 chiavi `jpcal.*` mai tradotte + 3 chiavi Groq.
11. **Refactor `itinerary-unified.js`** (v3.42) — 1363→372 righe, 4 moduli satellite, più un bug reale trovato e corretto (`_tripStart` fuori scope in `handleExportHTML`, mai intercettato dallo smoke test).
12. **Colori Y2K → variabili adattive** (v3.43) — `budget-view.js` e `group-panel.js` sistemati (`poi-detail-view.js` era già pulito). Scoperto un backlog più ampio: altri 13 file emettono ancora colori Y2K (vedi Prossimi step).
13. **Pulizia Y2K parte 2** (v3.44) — ricostruita la lista precisa dei colori davvero intercettati dall'override CSS (9 valori, non tutto ciò che "sembra Y2K"); sistemati gli unici 3 file rimanenti che ne contenevano: `weather-view.js` (il modal meteo intero, + bug scoperto: badge GPS mai visibile per un selettore troppo largo, + rimossa una funzione morta), `list-view.js` (dialog "Aggiungi tappa"), `group-share-view.js`. **L'override in `legacy-skin.css` non intercetta più nulla in tutto `js/` — è morto, candidato per la rimozione in un prossimo giro** (non fatto: serve un pass di verifica visiva completo prima di cancellare ~250 righe CSS).

**Lezione ricorrente della sessione**: prima di ogni fix, verificare l'ipotesi con grep/misure reali invece di fidarsi della descrizione ereditata da una sessione precedente — 3 volte questa sessione la premessa iniziale ("~3000 righe morte", "basta la foto per l'analisi AI", "il riordino risolve gli avvisi") si è rivelata sbagliata o incompleta a un controllo diretto, e la versione corretta era più piccola/diversa dal previsto.

## Vincoli e convenzioni
- Script IIFE browser, `<script defer>` in index.html; niente ES modules/bundler.
- MAI sed/perl multi-riga greedy: Edit manuale + `node --check` + smoke test dopo ogni modifica.
- Verifica sempre: `python3 -m http.server PORT` + `node smoke-test.mjs http://localhost:PORT` (exit 0 obbligatorio) + `node scripts/lint-i18n.mjs` se si toccano stringhe. Computed style via preview-eval bridge inaffidabile per box-model: usare sonda Puppeteer o verificare via `getComputedStyle` diretto in console.
- Commit in italiano, CHANGELOG.md aggiornato ad ogni versione (siamo a v3.40), push su `main` + sync cartella deploy sempre.
- Nuovi bottoni-layout (dentro card con bordo proprio): classe `btn-plain` per evitare il riskin tema. Se il bottone usa `background:linear-gradient(...)` inline, occhio all'override glassmorphism che intercetta quella sottostringa — usare `background-image:` per evitarlo (visto in v3.35/v3.38).
- Nuove stringhe UI: sempre `T('namespace.chiave', 'fallback italiano')` + chiavi in `js/i18n.js` per it/en/ja, mai testo nudo nei template.
- Prima di un refactor/feature grossa: cercare worktree isolate in `.claude/worktrees/` o branch `claude/*` — potrebbero già contenere lavoro preparato in sessioni precedenti (successo con `poi-detail-view.js`/`gf-places-panel.js` in v3.34).

## Prossimi step (in ordine di valore)
1. **i18n completo** — ancora parziale (v3.37→v3.41). Controllati e sistemati in v3.41: festività (`japan-calendar-hints.js`, 17 chiavi mancanti dal dizionario) ed errori Groq (`gf-menu-analyzer.js`). Form GF crowdsourcing e schermi v3.38-3.40 erano già a posto. Trovato ma non toccato (fuori scope, pre-esistente): `deletePersonalItinerary`/`requestUnshare` in `itinerary-features.js` (righe ~33-93, messaggi toast + `confirmText` hardcoded). Backlog resta ampio altrove — nessun modo rapido di trovare tutte le stringhe hardcoded via grep, serve navigare l'app in EN schermata per schermata.
2. **Refactor monoliti rimanenti** — `js/itinerary-unified.js` fatto in v3.42 (1363→372 righe, 4 moduli satellite). Prossimi candidati per dimensione: `js/onboarding.js` (913 righe), `js/views/poi-detail/poi-itinerary-wizard.js` (811, già un satellite del v3.34 ma cresciuto), `js/views/weather-view.js` (805), `js/mqtt-transport.js` (780). Nessuno è ancora confermato "monolite da spezzare" — prima di procedere verificare se la dimensione riflette davvero sezioni indipendenti estraibili o solo tanta UI coesa (non ripetere l'errore v3.30 di assumere invece di misurare).
3. **Rimuovere l'override "INLINE STYLE OVERRIDES" morto in `legacy-skin.css`** (righe ~2930-3186, dopo v3.44) — verificato che nessun file in `js/` emette più uno dei 9 colori/variabili che i suoi selettori `[style*="..."]` cacciano. Prima di cancellare: (a) ri-fare il grep di verifica (`grep -rln -E "#(00FF88|1A2560|6B5EA8|C8BDFF|E8E0FF|FF1493|FFD700|FFF9E6|FFFDF0)|var\(--y2k-(ink|muted|pink)\)" js/*.js js/views/*.js js/views/poi-detail/*.js`, deve dare 0 file — vedi CHANGELOG v3.44 per i falsi positivi legittimi come colori Canvas/console.log/badge semantici), (b) pass di verifica visiva su ogni schermata che il blocco toccava (Meteo, Aggiungi tappa, Gruppo/Condividi, GF places, budget) per assicurarsi che nessuna sfumatura visiva dipendesse silenziosamente dall'override senza che i grep l'avessero individuata.
   Colori Y2K "adiacenti" ma MAI stati un target reale dei selettori (non toccarli, sono fuori scope): `#2D3B7D`/`#C85C3B`/`#FF69B4`/`#4A5BA8` e simili in `app-core.js` (Canvas), `mqtt-transport.js` (console.log DevTools), `app-boot.js`/`debug-panel.js` (bottoni/testo non matchati), `gf-places-panel.js`/`budget-view.js` (badge semaforo/categoria), `views/shopping-view.js` (bottone Apple Maps auto-contenuto) — dettagli in CHANGELOG v3.44.
4. **Rimozione selettiva zone offline** — limite noto dichiarato in v3.40: oggi si può solo svuotare tutta la cache tile (`giappone-2027-tiles-v1`), non una zona singola (le tile di zone diverse possono sovrapporsi nella cache condivisa). Serve solo se la gestione spazio diventa un problema reale per gli utenti — probabilmente da saltare finché non richiesto.
5. **Idee prodotto**: tutte e 3 quelle discusse in precedenza sono ora implementate (v3.38-3.40). Prossimo giro: nuove idee da discutere con l'utente, non presenti in questo file.

## Problemi noti
- GitHub Pages: run in coda da giorni, problema infrastruttura GitHub; Vercel è il deploy che conta.
- Le misure `getComputedStyle` via preview-bridge a volte tornano 0 spuri: non fidarsi, usare Puppeteer o console diretta.
- `fmgf_url`/link Find Me Gluten Free sono link manuali di verifica (nessuna API: CORS) — scelta deliberata, non un TODO.
- Nessuna chiave API reale in locale (Google Places, Groq): le feature che le usano (GF Guide, foto-menu AI, offline POI) falliscono con 404/501 in dev — atteso, verificato che i percorsi di errore non blocchino il resto (vedi v3.38, v3.40). Solo il deploy Vercel ha le chiavi vere.
