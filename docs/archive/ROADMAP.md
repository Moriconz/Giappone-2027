# Giappone 2027 / SafeEats — Roadmap miglioramenti

> Cosa aggiungerei e migliorerei, in ordine di priorità e con impatto/sforzo.
> Stato al 2026-05-25. Documenti collegati: [ANALISI_2026.md](ANALISI_2026.md) (analisi+fix), [FLUSSI_APP.md](FLUSSI_APP.md) (mappa UI), [docs/I18N.md](docs/I18N.md).
> Legenda: **P0** critico · **P1** alto valore · **P2** nice-to-have. Sforzo: S/M/L.

---

## ✅ Già fatto (per contesto)
Ripristino app rotta · pulizia repo (43 file morti, 61 doc archiviati) · rimozione Y2K → tema moderno · monolite estratto (`index.html` 14k→205 righe) · 7 bug pre-esistenti corretti · **i18n it/en/ja** (shell, nav, menu, POI, budget, wizard) · cache POI offline (IndexedDB) verificata · onboarding verificato · **glassmorphism 2026** · marker per-categoria (mappa tipi Google completa) · fix tasto Conferma (desync giorni) · fix overflow pannello · `smoke-test.mjs` (verifica runtime).

---

## 🎯 Le 5 cose che farei SUBITO (massimo valore)
1. **Completare i18n** (P1, M) — migrare le stringhe rimaste (gruppo/chat, toast, GF guide, onboarding) a `t()`. È un'app **da usare in Giappone**: EN/JP servono davvero. Pattern già pronto in `docs/I18N.md`.
2. **Ottimizzatore di giornata** (P1, M) — riordina le tappe per minimizzare gli spostamenti usando le distanze già calcolate in `routing.js`. Bottone "Ottimizza giorno" nell'itinerario.
3. **Backup/ripristino itinerario** (P1, M) — oggi tutto è in `localStorage`: se cambi telefono o pulisci i dati, **perdi l'itinerario**. Aggiungere export/import file robusto + (opz.) sync cloud via Firebase (già presente per i gruppi).
4. **Ridurre l'overload dei filtri** (P1, S) — la barra ha ~80 chip. Mostrare solo le categorie **presenti** tra i POI caricati + raggruppare il resto sotto "Altro/Avanzati".
5. **Split di `app-core.js`** (P1, L) — ~12.800 righe in un file. Spezzare in moduli di feature (map, poi, itinerary, group, gf, weather, budget) per manutenibilità e lazy-load.

---

## 🟢 Funzionalità da aggiungere
| Feature | P | Sforzo | Note |
|--------|---|--------|------|
| Link condivisibile itinerario (URL read-only) | P1 | M | Oltre a JSON/WhatsApp; genera URL con stato compresso o id Firebase |
| Reminder/notifiche tappe ("è ora di partire") | P1 | M | Push/notification API; usa orari tappa + routing |
| Trasporti reali (treni/metro) | P2 | L | Sostituire stime Haversine con orari reali (API trasporti JP) |
| Vista timeline/calendario del viaggio | P2 | M | Panoramica multi-giorno scrollabile |
| Diario di viaggio / foto per tappa | P2 | M | Upload foto utente sui POI/giorni (galleria esiste già) |
| Recensioni GF crowdsourced | P2 | L | Rating/commenti GF condivisi (Firebase) |
| Cambi valuta live | P2 | S | Il budget usa conversione fissa; tasso aggiornato via API |
| Presenza realtime nel gruppo (chi sta guardando) | P2 | M | Sui pannelli condivisi |

## 🎨 UX / UI
| Miglioria | P | Sforzo |
|-----------|---|--------|
| Stati vuoti coerenti ovunque (itinerario, gruppo, galleria, 0 POI) con CTA | P1 | S |
| Skeleton loader durante il caricamento POI/foto | P1 | S |
| Clustering marker su mappa quando densi | P1 | M |
| Ricerca globale (POI + tappe) | P2 | M |
| Migrare le centinaia di **stili inline hardcoded** ai design token | P1 | M |
| Sostituire `alert/confirm/prompt` nativi (24) con modali a tema | P1 | M |
| Onboarding "Crea viaggio" rifinito + i18n + collegato a budget/itinerario | P1 | M |
| Toggle tema (chiaro/scuro) | P2 | M | il contenuto assume scuro: serve audit |
| Micro-interazioni / haptics | P2 | S |

## ⚡ Performance
| Miglioria | P | Sforzo |
|-----------|---|--------|
| Debounce su pan/zoom mappa → meno chiamate `/api/googlePlacesNearby` | P1 | S |
| Eliminare `legacy-skin.css` (3.5k righe) migrando i componenti in `modern-2026.css` | P1 | L |
| Lazy-load moduli pesanti (galleria, gruppo, AI) on-demand | P1 | M |
| Virtualizzare liste lunghe (itinerario, lista GF) | P2 | M |
| Lazy-loading immagini + dimensioni responsive | P1 | S |
| Ridurre i ~1400 `console.*` alla fonte (oltre al gating già attivo) | P2 | S |
| Audit `backdrop-filter` (glass) su device low-end + modalità risparmio | P2 | S |

## 🛠️ Affidabilità / Tecnico
| Miglioria | P | Sforzo |
|-----------|---|--------|
| **Versioning/migrazione schema `localStorage`** (evita crash su cambi schema) | P0 | S |
| Error tracking (Sentry) gated dietro `window.DEBUG`/consenso | P1 | S |
| Estendere `smoke-test.mjs` (gruppo/chat/meteo) + CI su push | P1 | M |
| Gestione quota storage: cleanup + migrazione foto/grandi dati a IndexedDB | P1 | M |
| Tipi (JSDoc o TypeScript graduale) sul core | P2 | L |
| SW: strategia cache versionata + prompt "nuova versione disponibile" | P1 | S |

## ♿ Accessibilità
| Miglioria | P | Sforzo |
|-----------|---|--------|
| `aria-label` su tutti gli icon-button + ruoli; focus-trap nei pannelli | P1 | M |
| Audit contrasto (superfici glass traslucide) | P1 | S |
| Navigazione da tastiera completa | P2 | M |
| Alternativa lista ai marker mappa per screen reader | P2 | M |
| `prefers-reduced-motion` (già presente) — estendere a tutte le animazioni | P2 | S |

## 🔐 Sicurezza / Privacy
> 💤 **Deciso il 2026-05-25**: il broker MQTT è pubblico e i codici stanza sono corti → in teoria chi indovina il codice legge GPS/chat/itinerari del gruppo. **Per ora si lascia così** (app tra amici). Idea salvata per il futuro: **cifrare i messaggi del gruppo** con chiave derivata dal codice stanza (esiste già `js/encryption.js`). Vedi memoria `group-privacy-encryption-idea`.

| Miglioria | P | Sforzo |
|-----------|---|--------|
| 🔒 Cifratura messaggi gruppo (chiave da codice stanza) | rimandato | M |
| Header **Content-Security-Policy** in `vercel.json` | P1 | S |
| Codici stanza gruppo: lunghezza/entropia + scadenza | P2 | S |
| Esporta/cancella i miei dati (privacy) | P2 | S |
| Rate-limit lato `/api/*` serverless | P2 | M |

## 📦 Distribuzione / PWA
| Miglioria | P | Sforzo |
|-----------|---|--------|
| Manifest: screenshots + categorie + shortcuts | P2 | S |
| Set icone completo (maskable, varie dimensioni) | P2 | S |
| Prompt install non invasivo + tracking installazioni | P2 | S |

---

## Proposta di sprint
- **Sprint 1 (stabilità & i18n)**: versioning localStorage (P0), completamento i18n, riduzione filtri, debounce mappa, stati vuoti + skeleton.
- **Sprint 2 (valore viaggio)**: ottimizzatore giornata, backup/ripristino, link condivisibile, reminder tappe.
- **Sprint 3 (qualità)**: split `app-core.js`, eliminazione `legacy-skin.css`, a11y pass, error tracking + CI.
