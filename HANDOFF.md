# HANDOFF — Tabi (Giappone 2027) · 2026-07-10 (v2, dopo pulizia cerotti CSS)

Prompt di ripartenza per nuova chat:
> Continua il progetto Tabi. Leggi HANDOFF.md nella root del repo. Riparti dal primo punto di "Prossimi step".

## Cos'è l'app
**Tabi** — travel planner PWA (vanilla JS, no framework, no bundler) con layer gluten-free opzionale. Pivot dichiarato: planner **globale**, non solo Giappone; il trip Giappone 2027 è il caso d'uso di partenza. Collaborativa tra amici via MQTT (broker pubblico, zero backend); serverless Vercel solo come proxy API (Google Places, quota-gated in `js/api-quota.js`). **Regola utente ferrea: nessun dato hardcoded** — tutto da fonti live (Google Places, Nominatim, Open-Meteo, Nager.Date) o da input umano (crowdsourcing di gruppo).

## Stato attuale (tutto committato e pushato, `main` = `fe2eccd`)
- Deploy: Vercel (primario, funziona) + GitHub Pages (run bloccato da giorni lato GitHub — irrilevante, vetrina secondaria). Cartella deploy sincronizzata: `/Users/riccardomoricone/Documents/GitHub/Giappone-2027`.
- Test: `smoke-test.mjs` (Puppeteer) con **exit code reale** e 9+ invarianti; CI GitHub Actions la esegue + lint i18n. Ha già beccato 3 bug di produzione (detector GF rotto, fuso orario meteo, doppio guard festività).
- SW v10 con revalidation forzata (`cache:'no-cache'`): fine delle versioni stale post-deploy.

### Gluten-free (completato in questa sessione)
Detector review-scan con tetto a "likely" (mai "confermato" da un automatismo); crowdsourcing di gruppo con campi celiaco-critici (cucina separata, staff informato, "ultima verifica Xg fa"); GF Guide con zone derivate dalle tappe del viaggio (non più 37 città fisse); "🌾 Dove mangio GF vicino alle tappe?" per giorno nell'itinerario (posti live entro 1.5km, aggiunta one-tap come pasto). Rimossi 3 elenchi hardcoded di ristoranti.

### Planner (roadmap 1-6 completata)
Base/hotel del giorno (geocoding Nominatim, seed dell'ottimizza-giro); deep-link Indicazioni Google Maps tra tappe consecutive; badge conflitti giorno (tappe sovrapposte, pasto mancante); meteo reale che attiva il banner pioggia+outdoor (Open-Meteo per località del giorno); export .ics del viaggio intero; festività del paese via Nager.Date (default JP, campo `tripProfile.countryCode` pronto ma senza UI).

### UI/UX — lezione della sessione
Il CSS soffriva di "appiattitori": regole con `!important` e selettori larghissimi che annullavano le scelte dei componenti. Rimossi in sequenza: 3 blocchi che forzavano padding/font su ogni bottone; `div[style*="border"]` che schiacciava ogni card; il riskin tema su ogni `<button>` (doppio container → opt-out `.btn-plain`); e infine la radice: **`html, body, * { margin:0 !important; padding:0 !important }`** in cima a `legacy-skin.css`, che azzerava gli inline style di tutta l'app (compensato da ~3000 righe di cerotti `div[style*=...]`, ora ridondanti). Fix chiusura card: keyframe uscita dedicata (`l-sheet-down`) — un'animazione con lo stesso nome non riparte mai.

## Vincoli e convenzioni
- Script IIFE browser, caricati con `<script defer>` in index.html; niente ES modules/bundler.
- MAI sed/perl multi-riga greedy (ha già rotto file): Edit manuale + `node --check` + smoke test dopo ogni modifica.
- Verifica sempre: `python3 -m http.server PORT` + `node smoke-test.mjs http://localhost:PORT` (exit 0 obbligatorio). Computed style via preview-eval bridge inaffidabile: per misure box-model usare sonda Puppeteer.
- Commit in italiano, CHANGELOG.md aggiornato a ogni versione (siamo a v3.29), push su `main` + sync cartella deploy.
- Nuovi bottoni-layout (dentro card con bordo proprio): classe `btn-plain` per evitare il riskin tema.

## Prossimi step (in ordine di valore)
1. ~~**Pulizia cerotti CSS**~~ — FATTO in questa sessione (v3.30). Correzione importante: la stima "~3000 righe quasi tutte ridondanti" era sbagliata. Il file ha solo 94 righe `[style*=...]`, e la maggioranza (blocco "INLINE STYLE OVERRIDES — Glassmorphism", righe ~2940-3220) è un layer di reskin **attivo**, non un cerotto morto — converte colori Y2K ancora hardcoded inline in budget-view.js/group-panel.js/group-poi-view.js/poi-detail-view.js nel tema glass arancione. Rimosse solo le 3 regole confermate ridondanti/morte via grep sul JS (righe 79-90, 3226-3231, 3235-3238, vedi CHANGELOG v3.30). **Se in futuro si vuole davvero dimagrire il blocco glassmorphism, la strada è rimuovere i colori Y2K hardcoded dal JS sorgente e sostituirli con classi CSS dirette — non cancellare le regole override, che smaschererebbe i colori Y2K.**
2. **Selettore paese destinazione in UI** — `tripProfile.countryCode` è già usato da festività e (indirettamente) GF Guide: manca solo il campo nell'onboarding/menu. Chiude davvero il pivot "globale".
3. **Refactor monoliti** — `poi-detail-view.js` (~1700 righe) e `gf-places-panel.js` (~970): task già preparato come chip con piano dettagliato. Farlo a mente fresca.
4. **Audit UI schermate secondarie** — la sessione ha sistemato itinerario/POI/GF Guide; meteo, budget, gruppo, shopping vanno riguardate con gli stessi criteri (un accento solo, niente riskin doppi, spaziature del sorgente).
5. **i18n completo** — el lint copre le chiavi dichiarate; molte stringhe nuove restano hardcoded in italiano nei template JS (EN/JA le mostrano in italiano).
6. **Quota-stop GF Guide** — a quota esaurita il loop città riprova comunque (solo rumore console, zero costi); chip già preparato.
7. **Idee prodotto discusse ma non pianificate**: pre-download offline per regione (mappa+ristoranti GF), foto-menu con analisi Groq già esistente da integrare nel flusso riscontri, ordinamento automatico giorno per orari di apertura.

## Problemi noti
- GitHub Pages: run in coda da giorni, problema infrastruttura GitHub (ticket eventualmente); Vercel è il deploy che conta.
- Le misure `getComputedStyle` via preview-bridge a volte tornano 0 spuri: non fidarsi, usare Puppeteer.
- `fmgf_url`/link Find Me Gluten Free sono link manuali di verifica (nessuna API: CORS) — scelta deliberata, non un TODO.
