# Tabi (Giappone 2027) — Analisi miglioramenti · 2026-06-11

> Verifica completa post-roadmap: sintassi JS (101 file, tutti OK), lint i18n (321 chiavi × it/en/ja, 0 errori), serve locale OK, struttura HTML, SW, CSS, a11y, repo.

## ✅ Già risolto rispetto a ROADMAP/ANALISI_2026 (per contesto)
Split `app-core.js` (12.800 → 418 righe, 80+ moduli) · i18n completa · CSP attiva · E2EE gruppo (AES-256-GCM) · versioning schema localStorage · backup/restore · ottimizzatore giornata · reminder tappe · JR Pass calculator · cambio valuta live (open.er-api.com) · lazy-load moduli pesanti · CI con smoke test · TF.js lazy.

---

## 🔴 Bug da correggere (subito, sforzo S)

1. **HTML non valido in `index.html`**: due `</main>` orfani (righe ~135 e ~146) senza alcun `<main>` di apertura. Il parser li ignora ma la struttura semantica è rotta (anche per screen reader). Aggiungere `<main>` attorno a `#map` + viste, o rimuovere i tag.
2. **`sw.js` PREDICTIVE_PREFETCH rotto**: prefetch di `../js/sw.js` → **404** (il file non esiste, sw.js è in root). Rimuovere la voce. In generale i path `../` nel SW in root sono fragili: usare `./`.
3. **Icone PWA placeholder**: `icon-192.png` (293 B) e `icon-512.png` (319 B) sono PNG 1-bit quasi vuoti. Servono icone reali + variante **maskable** — è la faccia dell'app sulla home screen.
4. **CSP duplicata e divergente**: definita sia nel `<meta>` di index.html sia in `vercel.json`, e già diverse (cdnjs.cloudflare.com solo in vercel.json). Tenere solo quella in `vercel.json` (più completa, supporta più direttive) e rimuovere il meta, o allinearle.
5. **Meta viewport duplicato**: riga 9 `<meta name="viewport-fit" content="cover">` non è un meta standard (il valore va dentro `viewport`, già presente a riga 8). Rimuovere.

## 🟠 Pulizia repo (S/M)

6. **`.git` pesa 2,4 GB** — la cronologia contiene i vecchi backup giganti e la venv. Una tantum: `git filter-repo` (o BFG) per ripulire la history, poi force-push. Clone e CI diventeranno ~50× più veloci.
7. **Residui nel working tree**: cartella `venv/` (non serve al frontend, già in .gitignore?), cartella vuota `2k con stile glassmorphism/`, `node_modules` committato? → verificare tracking e rimuovere.

## 🟡 Performance (M)

8. **86 `<script>` sincroni bloccanti** (~1,1 MB JS + 179 KB CSS) senza `defer`. Primo paint penalizzato su mobile/4G. Opzioni in ordine di sforzo: (a) `defer` su tutti gli script body mantenendo l'ordine, (b) concatenare i moduli in 2-3 bundle (uno script di build da 20 righe, niente framework), (c) ES modules con import.
9. **`legacy-skin.css` ancora 3.209 righe** (55% del CSS totale) — la migrazione a `modern-2026.css` resta il debito CSS principale (già P1 in roadmap).
10. **907 `console.*`** nei sorgenti: il gating runtime c'è, ma il peso di parsing/manutenzione resta. Valutare strip in fase di deploy.

## 🟡 Accessibilità (M) — punto più debole rimasto

11. Solo **17 `aria-label`** in tutta l'app a fronte di decine di icon-button generati via JS. Mancano: focus-trap nei pannelli/sheet, navigazione tastiera, `role` sulle viste. Audit contrasto sulle superfici glass.

## 🟡 Coerenza UI (S/M)

12. **56 colori hardcoded** residui nei JS (`#FF1493` ecc.) da migrare ai design token.
13. Stili inline ancora presenti in index.html (weather widget, filtri) → spostare in CSS.

## 🔵 Affidabilità

14. **Broker MQTT pubblico unico** (`broker.emqx.io`): se è giù in viaggio, GPS/chat di gruppo muoiono. Aggiungere lista di broker di fallback con retry (es. HiveMQ public, test.mosquitto.org) — l'E2EE già protegge i contenuti.
15. Estendere `smoke-test.mjs` a gruppo/chat/meteo (già pianificato) — la CI c'è, va solo arricchita.

## 🟢 Cose da aggiungere (valore per il viaggio, in ordine)

| Feature | Perché | Sforzo |
|---|---|---|
| **Vista timeline multi-giorno** | Panoramica del viaggio intero scrollabile; oggi si naviga giorno per giorno | M |
| **Ricerca globale** (POI + tappe + GF) | Assente; con 10k+ POI è il modo più rapido di trovare qualcosa | M |
| **Trasporti reali** (orari treni/metro JP) | Le stime Haversine sottostimano molto in Giappone; anche solo deep-link a Google Maps/Navitime per tappa | M/L |
| **Tema chiaro** | Uso diurno all'aperto in viaggio; oggi solo dark | M |
| **Virtualizzazione liste lunghe** (GF list, itinerario) | Scroll fluido su telefoni medi | M |
| **Modalità risparmio batteria** (riduce blur/animazioni/poll GPS) | Giornate intere fuori con la PWA aperta | S/M |

---

### Proposta di sprint
- **Sprint A (1-2 gg)**: bug 1-5 + pulizia 6-7 + `defer` sugli script (punto 8a).
- **Sprint B**: a11y pass (11) + token colori (12-13) + broker fallback (14).
- **Sprint C**: timeline + ricerca globale + tema chiaro.
