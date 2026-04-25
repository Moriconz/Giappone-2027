# 📋 CHANGELOG — Giappone 2027

## v3.2 — Chunk Parts + Group Panel + Chat (Attuale)

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
