# SafeEats PWA — Analisi & Roadmap Miglioramenti

**Data analisi:** 11 Maggio 2026
**Versione analizzata:** 3.2.0-stable (90% funzionale)
**Stile:** Caveman/compresso (massima densità info, zero fluff)

---

## 1. SCOPO APP — Cosa fa, perché esiste

### Funzione primaria
PWA offline-first **per viaggio Giappone 2027** di gruppo con bisogno specifico: **dieta gluten-free**.
Risolve problema reale: in Giappone, soia/salse/dashi nascondono glutine. Celiaci viaggiano alla cieca.

### Audience target
- **Primario:** Celiaci / sensibili glutine in viaggio Giappone (nicchia ad alta intensità di bisogno)
- **Secondario:** Gruppi viaggio (2-8 persone) che vogliono coordinarsi in tempo reale
- **Terziario:** Travel-tech enthusiasts (estetica Y2K + glassmorphism = appeal cross-over)

### Job-to-be-done (JTBD)
1. "Trovare cibo sicuro" → 150+ ristoranti GF certificati su mappa
2. "Non perdere il gruppo" → GPS P2P live + chat
3. "Gestire spese condivise" → Budget tracker multi-currency
4. "Pianificare itinerario" → Drag-drop + tappe
5. "Funzionare senza wifi" → Service Worker + offline-first
6. "Documentare viaggio" → Galleria + meteo

### Differenziazione vs competitor
| Competitor | Loro forza | Loro debolezza | SafeEats vince perché |
|---|---|---|---|
| Google Maps | POI tantissimi | No filtro GF certificato | Database GF curato |
| TripAdvisor | Recensioni | No P2P real-time | Live sharing |
| Find Me Gluten Free | Solo GF DB | Solo USA/EU, niente travel tools | Suite completa Giappone |
| Splitwise | Budget solo | No mappa né GPS | Tutto-in-uno |
| WhatsApp | Chat | No mappa contestuale | Chat + posizione integrata |

**Posizione di mercato:** Niche-killer per celiaci che vanno Giappone. NON è "altra app viaggi" — è **l'unica app GF-Japan-group**.

### Stack tecnico (estratto da README)
- Frontend: HTML/CSS/JS vanilla (no framework) — index.html 10k+ righe
- Mappa: OpenLayers (open-source, no API key)
- Meteo: Open-Meteo (gratis, no key)
- P2P: presumibilmente WebRTC + signaling custom
- Storage: localStorage + IndexedDB (foto)
- Estetica: Y2K + glassmorphism (orange #FF6B35 + blur 15-20px)
- PWA: manifest + service worker

---

## 2. ANALISI PUNTI FORTI (cosa NON toccare)

1. **Offline-first** — viaggiatori in Giappone roaming caro / wifi scarso. Strategia corretta.
2. **No framework** — bundle leggero, caricamento veloce, no dipendenze marce
3. **OpenLayers + Open-Meteo gratis** — costo runtime zero
4. **Glassmorphism + tema arancione coerente** — branding forte, memorabile
5. **Y2K floating windows** — UX differenziante (vs solite modal full-screen)
6. **Vincoli drag/resize 145px simmetrici** — soluzione elegante a problema scomodo
7. **PWA installabile** — bypass App Store, distribuzione frictionless
8. **GPS P2P star topology** — semplice, scala fino ~10 persone (ok target)

---

## 3. CRITICITÀ ATTUALI (da fixare PRIMA di nuove feature)

### 3.1 Debito tecnico nascosto

**index.html ~10.000 righe.** Questo è il rischio #1.
- Difficile debug, merge conflict garantiti, search lenta
- Inline JS + inline CSS + HTML in stesso file = no separation of concerns
- Bundler assente → no tree-shaking → tutto viene caricato anche se non usato
- **Azione:** spezzare in moduli ES6 (`import`/`export`) anche senza build step. Browser supportano nativi.

### 3.2 CSS war (`!important` ovunque)
README ammette: `* { padding: 0 !important; }` universale.
- Cascade rotto a tutti i livelli
- Ogni nuovo stile richiede `!important` per vincere
- Cresce esponenzialmente → manutenzione impossibile a 5.000 righe già ora
- **Azione:** scopare `!important` universale, usare specificity corretta + CSS variables, eventualmente CSS Layers (`@layer base, components, utilities`)

### 3.3 Service Worker non verificato
README: "Service Worker: ✅ Codice presente" ma test "Offline Mode" è in **TODO**.
- Senza SW funzionante, claim "offline-first" è marketing falso
- **Azione:** Workbox o sw fatto a mano con runtime cache strategy (cache-first per tiles, network-first per chat)

### 3.4 No error tracking
Crash silenziosi in produzione. Utente celiaco che non trova ristorante GF perché bug → user lost forever.
- **Azione:** Sentry free tier (5k errori/mese) o self-hosted GlitchTip

### 3.5 Geolocation: nessun fallback
Se GPS denied/timeout, meteo widget rompe (`getWeatherColor` su undefined).
- **Azione:** default Tokyo Station coords + UI "Posizione non disponibile, mostro Tokyo"

### 3.6 Nessun test automatizzato
Tutto manuale. Una regressione su drag passa inosservata.
- **Azione:** Playwright per E2E (1 test per feature critica) + vitest per logic pura

---

## 4. MIGLIORAMENTI UX (priorità: utente celiaco in viaggio)

### 4.1 Sicurezza GF — IL cuore del prodotto

**Problema:** "GF certificato" senza dettaglio è insufficiente per celiaci severi.

Aggiungere a ogni POI GF:
- **Livello sicurezza:** 🟢 dedicato (solo GF) / 🟡 dedicated kitchen / 🟠 cross-contamination risk / 🔴 chiedere
- **Fonte info:** "Verificato da [utente/team/ristorante stesso/Coeliac Japan Org]"
- **Data ultima verifica** (info vecchia >12 mesi = warning)
- **Frasi giapponesi da mostrare:** 「グルテンフリーですか？」「醤油は小麦不使用ですか？」+ pronuncia + emergenza
- **Foto menu GF reale** (non solo logo ristorante)
- **Tag allergie aggiuntive:** soia, latte, uova (spesso comorbidità)

### 4.2 Emergenza medica
- Bottone SOS sempre visibile in nav → mostra:
  - Ospedale più vicino con staff EN
  - 119 (ambulanza JP) + script: "Watashi wa celiac desu. Pan / komugi wa taberare nai."
  - Tessera medica condivisibile in giapponese (PDF generato offline)

### 4.3 Pre-viaggio (onboarding nuovo)
Attualmente: utente apre app → vede mappa Giappone → "ok e ora?"
- **Wizard 60 secondi:** "Quanti siete? Quando parti? Severità GF? Preferenze cibo?"
- Genera **itinerario suggerito** + lista pre-partenza (medicazioni, snack EU, carte SIM)

### 4.4 Navigazione cibo contestuale
- "Sono qui, è ora di pranzo" → notifica: "3 ristoranti GF entro 500m, aperti adesso"
- Integrare orari apertura (spesso ristoranti JP chiudono 14:30-17:30!)
- Coda stimata (Google Popular Times scraping o crowdsource gruppo)

### 4.5 Gruppo coordinato
- **Voting:** "Dove ceniamo?" → membri votano da lista pre-filtrata GF
- **Status:** "Marco sta arrivando", "Giulia è in bagno (ETA 5min)"
- **Spese smart:** chi paga oggi (rotazione), chi è in debito (settle algorithm tipo Splitwise)

### 4.6 Itinerario intelligente
- Drag-drop esiste già → aggiungere:
  - **Calcolo tempo viaggio reale** (Google Directions API o open: GraphHopper)
  - **Warning conflitti** ("Hai Kyoto-Tokyo in 2h: impossibile, serve Shinkansen")
  - **Costi trasporto stimati** integrati nel budget

### 4.7 Galleria con valore
Attualmente: foto + data. Aggiungere:
- **Geotagging automatico** (EXIF GPS) → mostra dove scattata su mappa
- **Tag automatico ristorante** (foto scattata <50m da POI → tag auto)
- **Diario timeline:** foto + nota + spesa quel giorno = cronologia viaggio
- **Export memorie:** PDF/ZIP scaricabile a fine viaggio come ricordo

### 4.8 Lingua
App in italiano (ottimo per target). Aggiungere:
- **Modalità "Mostra al cameriere"** → schermata full-screen GIAPPONESE grande con la frase
- Pronuncia romaji + audio TTS (offline, usa Web Speech API)

### 4.9 Accessibility (oggi assente)
- Keyboard navigation Y2K windows (Tab/Esc/Arrow)
- ARIA labels
- Color contrast: orange #FF6B35 su sfondo scuro = OK; verificare con axe DevTools
- Modalità "alto contrasto" toggle
- Font size scaling (min 16px body)

---

## 5. MIGLIORAMENTI VISIBILITY (discoverability + crescita)

### 5.1 SEO tecnico (PWA = sito = Google indicizza)
**Stato attuale (presunto):** index.html 10k righe = render-blocking, FCP scarso.
- `<title>` ottimizzato: "SafeEats — Giappone Gluten-Free 2027 | Mappa Ristoranti GF Tokyo, Osaka, Kyoto"
- `<meta description>` 155 char con keyword: celiachia, gluten free, giappone, ristoranti
- **Open Graph + Twitter Cards** → quando condivisi su social mostrano preview ricca
- **Schema.org JSON-LD:**
  - `@type: TravelAgency` per app stessa
  - `@type: Restaurant` + `servesCuisine` + `acceptsReservations` per ogni POI GF
  - `@type: TouristAttraction` per POI generici
- **Sitemap.xml** generato auto da lista POI
- **robots.txt** ben configurato

### 5.2 Landing page dedicata
PWA è ottima per use, pessima per acquisizione. Serve landing separata:
- `safeeats.app/` (o subdomain) statico con:
  - Hero: "Viaggia in Giappone senza paura del glutine"
  - Video 20s demo
  - "Aggiungi a Home Screen" CTA in 1 tap
  - Testimonial celiaci
- **Blog SEO** (tipica strategia content marketing):
  - "10 ristoranti gluten-free a Tokyo" → ranking Google
  - "Frasi giapponesi essenziali per celiaci"
  - "Cosa NON mangiare in Giappone se sei celiaco"
  → cattura traffico organico, redirect alla PWA

### 5.3 Community building
- **Submission form:** utenti aggiungono ristoranti GF scoperti → moderation queue
- **Recensioni con foto** (specifiche per GF, non generiche tipo TripAdvisor)
- **Discord/Telegram link:** community celiaci Giappone (alta affinità)
- **Newsletter** pre-viaggio (drip campaign: 4 settimane prima → tips settimanali)

### 5.4 Partnership strategiche
- **AIC (Associazione Italiana Celiachia)** → endorsement, link da loro sito
- **Coeliac UK / Coeliac Japan** → cross-promo
- **Travel blogger celiaci** (es. Gluten Free Globetrotter) → review/affiliate
- **Compagnie aeree:** menu speciali, partnership leggere

### 5.5 App store presence (anche se PWA)
- **Google Play:** wrapper PWA con Bubblewrap (Trusted Web Activity) — gratis, mantiene PWA
- **iOS App Store:** Apple permette PWA wrapper con PWABuilder — più friction ma fattibile
- Permette: rating, recensioni, SEO interno store, badge "scarica su…"

### 5.6 Analytics privacy-first
Per capire cosa funziona senza tracciare utenti:
- **Plausible / Umami / Fathom** (no cookie banner, GDPR ok)
- Eventi chiave: install PWA, apertura POI GF, errori geolocation, crash
- Dashboard interna (no Google Analytics)

### 5.7 PR & launch strategy
- Product Hunt launch (target: top 5 of day in "Travel")
- HackerNews "Show HN: SafeEats — PWA for celiac travelers in Japan"
- Reddit: r/Celiac (550k membri), r/JapanTravelTips, r/Glutenfree
- TikTok: video demo POV celiaco che usa app a Tokyo (formato che converte)

### 5.8 Internazionalizzazione (dopo MVP italiano)
- EN-first per audience globale celiaca (mercato 10x più grande)
- ES, DE, FR (paesi con alta % celiaci diagnosticati)
- i18n file JSON, lazy load per lingua → no bundle bloat

---

## 6. MIGLIORAMENTI PERFORMANCE

### 6.1 Bundle size / load time

**Problema:** index.html 10k righe ≈ 400-800KB di HTML+JS+CSS inline. FCP > 3s su 3G probabile.

Azioni:
1. **Splittare in moduli ES:**
   - `core.js` — state + UI helpers (carica subito)
   - `map.js` — OpenLayers + POI (lazy on tab "Mappa")
   - `chat.js` — P2P (lazy on tab "Gruppo")
   - `gallery.js` — IndexedDB (lazy on tab "Galleria")
   - `budget.js`, `weather.js`, `gf.js` — idem
2. **CSS critical path:** inline solo header+filters+map (~5KB), resto async
3. **Minify HTML/JS/CSS:** in build step (terser, csso, html-minifier) → -60% size
4. **Brotli/gzip:** server-side, auto se su Cloudflare Pages / Netlify / Vercel
5. **HTTP/2 push o Resource Hints:** `<link rel=preload>` per critical chunks

**Target metrics:**
- FCP < 1.5s su 4G
- TTI < 3s
- Lighthouse score > 90 in tutte 4 categorie

### 6.2 OpenLayers / Mappa

**Problema:** 10.000+ POI = se renderizzati tutti = lag.
- **Cluster zoom-based:** OpenLayers ha `ol/source/Cluster` → raggruppa marker vicini
- **Viewport culling:** render solo POI in bbox visibile + 20% margin
- **Tile caching aggressivo:** SW cache 7 giorni tiles base map
- **WebGL renderer:** OpenLayers ha `ol/layer/WebGLPoints` → 10x più veloce
- **POI data format:** se JSON → switch a GeoJSON binary (TopoJSON o flatgeobuf) → -80% size

### 6.3 Service Worker strategia

Attualmente "codice presente" ma non testato. Strategia consigliata:
- **App shell** (HTML+CSS+JS core): cache-first, update on activate
- **Map tiles:** cache-first, max-age 30gg, max-entries 500
- **POI data:** stale-while-revalidate, max-age 24h
- **Open-Meteo:** network-first, fallback cache 2h
- **User photos:** never cache (IndexedDB già)

Usare **Workbox** (Google) — gestisce tutto con poche righe.

### 6.4 Memory leaks
- **Y2K windows:** quando si chiude, removeEventListener pulito?
- **OpenLayers map:** map.dispose() su unmount?
- **GPS interval:** clearInterval su page hide?
- **WakeLock:** release su tab blur?
- **Azione:** profilo con Chrome DevTools Memory tab → heap snapshot ogni 5 min uso

### 6.5 Battery (P2P GPS = drain)
GPS continuo + WebRTC + WakeLock = batteria morta in 4h.
- **Throttling adattivo:** se velocità < 1 km/h da 5min → ridurre sync da 5s a 30s
- **Stop background:** Page Visibility API → pausa GPS quando tab nascosta >2min
- **Battery API:** se battery < 20% → modalità "low power" (sync ogni 60s, no WakeLock)
- **Toggle manuale** in UI: "Modalità risparmio energia"

### 6.6 IndexedDB invece di localStorage
- localStorage: sync, 5MB max, blocca main thread
- IndexedDB: async, ~50% disco disponibile, no block
- Budget history + chat history → migrare a IDB con libreria leggera (`idb-keyval` <1KB)

### 6.7 Image optimization
- Foto utente in galleria: comprimere client-side (canvas + JPEG 85%) prima di salvare
- Thumbnail generation per grid view (160px) → main view (full)
- WebP/AVIF se browser supporta
- Lazy load con `loading="lazy"` + IntersectionObserver

### 6.8 Network resilience
- **Retry con exponential backoff** su tutte fetch (Open-Meteo, GitHub chunks)
- **Queue offline:** azioni utente (aggiungi spesa, foto) → coda → sync quando online
- **Conflict resolution P2P:** ultima scrittura vince con vector clock o CRDT (Yjs library)

---

## 7. NUOVE FEATURE — Ranked by ROI

| Feature | Impatto utente | Effort | ROI | Priorità |
|---|---|---|---|---|
| Livello sicurezza GF + frasi JP | 🟢🟢🟢 | 🟡 | Alto | P1 |
| Wizard onboarding | 🟢🟢🟢 | 🟡 | Alto | P1 |
| Service Worker test & fix | 🟢🟢🟢 | 🟢 | Critico | P1 |
| Modulo "Mostra al cameriere" | 🟢🟢🟢 | 🟢 | Alto | P1 |
| Cluster mappa + WebGL | 🟢🟢 | 🟡 | Alto | P1 |
| Notifiche "ora di pranzo" | 🟢🟢 | 🟡 | Medio | P2 |
| Voting cena gruppo | 🟢🟢 | 🟡 | Medio | P2 |
| Galleria geotag + timeline | 🟢🟢 | 🟡 | Medio | P2 |
| SOS medico + tessera JP | 🟢🟢🟢 | 🟢 | Alto | P2 |
| Wrapping in TWA Google Play | 🟢 | 🟢 | Alto | P2 |
| Blog SEO + landing | 🟢🟢 | 🔴 | Crescita | P2 |
| Splittare index.html in moduli | 🟡 (tecnico) | 🔴 | Critico long-term | P3 |
| Internazionalizzazione EN | 🟢🟢 | 🟡 | Crescita | P3 |
| AI suggerimenti GF | 🟢 | 🔴 | Medio | P4 |
| Offline map tiles download | 🟢🟢 | 🔴 | Medio | P4 |
| Voting + settle algorithm | 🟢 | 🟡 | Basso | P4 |

Legenda: 🟢 basso effort/alto impatto · 🟡 medio · 🔴 alto

---

## 8. ROADMAP CONSIGLIATA (3 mesi pre-viaggio 2027)

### Sprint 1 (settimane 1-2) — Stabilità
- Service Worker test + fix offline
- Sentry / GlitchTip per error tracking
- Geolocation fallback Tokyo Station
- Test su iPhone + Android reali (lista TODO esistente)
- Lighthouse audit + fix top 5 issue

### Sprint 2 (settimane 3-4) — Sicurezza GF
- Schema "livello sicurezza" su POI
- Frasi JP + audio TTS offline
- Schermata "mostra al cameriere"
- Submission form per nuovi POI GF
- SOS medico + tessera celiaco JP

### Sprint 3 (settimane 5-6) — Performance
- Cluster + WebGL OpenLayers
- Splittare almeno 3 moduli ES (map, chat, gallery)
- IndexedDB migration per budget/chat
- Image compression galleria

### Sprint 4 (settimane 7-8) — Onboarding + UX
- Wizard 60s nuovo utente
- Notifiche contestuali (pranzo, ristorante vicino)
- Accessibility pass (a11y, keyboard, ARIA)
- Modalità batteria/risparmio

### Sprint 5 (settimane 9-10) — Visibility
- Landing page SEO
- Blog 5 articoli founder
- Open Graph + JSON-LD
- Plausible analytics
- TWA Google Play wrapper

### Sprint 6 (settimane 11-12) — Community + Launch
- Submission flow recensioni
- Discord/Telegram community
- Product Hunt launch
- Newsletter setup
- Pre-launch outreach (AIC, blogger celiaci)

---

## 9. RISCHI & MITIGAZIONI

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| POI GF info stale al viaggio | Alta | Critico | Sistema verifica + crowdsource pre-2027 |
| Geolocation denied su iOS | Media | Alto | Fallback manuale ricerca città |
| P2P signaling server down | Media | Alto | Fallback Firebase / WebSocket pubblico |
| index.html cresce a 15k+ righe | Alta | Critico | Modularizzazione **adesso** |
| Open-Meteo API rate limit | Bassa | Medio | Cache aggressiva 2h + fallback |
| Service Worker bug stale cache | Media | Alto | Version bump + skipWaiting strategy |
| Glassmorphism non supportato | Bassa | Basso | Fallback solid color |
| Concorrente lancia simile | Bassa | Alto | Velocità + nicchia + community lock-in |

---

## 10. METRICHE DI SUCCESSO (KPI)

### Pre-launch (oggi → giugno 2026)
- Lighthouse score ≥ 90 (perf, a11y, SEO, best practices)
- 0 crash su 100 sessioni test
- TTI < 3s su 4G mid-tier device
- 100% feature coverage manual test

### Post-launch (lancio → viaggio 2027)
- 1.000 install PWA primo mese
- 70% utenti aprono app ≥ 3 volte
- 200 POI GF utente-submitted
- < 1% crash rate
- NPS ≥ 50 (questionario in-app)

### Durante viaggio (2027)
- 100% gruppo usa app daily
- 0 incidenti "ho mangiato glutine per sbaglio"
- 50+ foto galleria a fine viaggio
- Budget tracking accuracy ±5%

---

## 11. TL;DR — Top 5 azioni IMMEDIATE

1. **Verifica e fixa Service Worker** — senza offline, claim "offline-first" è bugia
2. **Aggiungi livello sicurezza GF + frasi JP** — cuore del valore prodotto, oggi mancante
3. **Sentry / GlitchTip** — non puoi migliorare ciò che non misuri
4. **Splittare index.html in 3-5 moduli ES** — debito tecnico cresce ogni giorno
5. **Lighthouse audit + fix top issue** — 30 min lavoro, sblocca SEO + UX

---

**Fine analisi.** Documento volutamente denso. Ogni riga = azione concreta o info verificabile.
Nessun fluff aggiunto. Nessuna ripetizione del README.
