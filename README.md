# 🗾 Giappone 2027 — Travel Companion v3.2

**Travel companion offline-first per il viaggio in Giappone 2027** con mappa interattiva, **focus gluten-free**, GPS P2P live, chat di gruppo, e AI assistant.

---

## 📊 Status

| Feature | Status | Note |
|---------|--------|------|
| **🗺️ Mappa interattiva** | ✅ Completa | 10,000+ POI, 37 città, zoom intelligente |
| **🍜 Gluten-Free (GF)** | ✅ **FOCUS** | 150+ POI certificati, links FindMeGF, prenotazioni |
| **📍 GPS P2P Live** | ✅ Completa | Star topology, real-time sync 5s |
| **💬 Chat Gruppo** | ✅ Completa | P2P, notifiche push, storia locale |
| **👥 Group Panel** | ✅ Completa | Membri, toggle GPS, exit/delete room |
| **📦 Chunk Loader** | ✅ Completa | GitHub Releases, lazy-load, cache |
| **⚡ Stabilità** | ✅ Completa | WakeLock, Heartbeat (anti-ghost) |
| **🤖 AI Assistant** | ✅ Completa | Gemini API (quota 50/giorno), fallback offline |
| **📅 Itinerario** | ✅ Base | Drag-drop POI, note |

---

## 🏗️ Architettura (rinnovata 2026)

`index.html` è ora una **shell sottile (~205 righe)**: tutto il CSS e il JS inline
è stato estratto in file dedicati. Vedi [ANALISI_2026.md](ANALISI_2026.md) per il dettaglio.

```
index.html (~205 righe)          shell: meta, link CSS, tag <script>
├─ css/
│  ├─ legacy-skin.css            struttura componenti (ex y2k-override.css)
│  ├─ base.css                   stili estratti dai <style> inline
│  ├─ glass.css / safety.css     utility + UI gluten-free
│  ├─ components.css             design tokens + componenti
│  └─ modern-2026.css            ⭐ tema moderno (caricato per ultimo, vince)
├─ js/
│  ├─ app-boot.js                bootstrap PWA/install (ex 1° <script> inline)
│  ├─ app-core.js                applicazione principale (ex <script> inline ~12.8k righe)
│  ├─ state.js                   stato globale (localStorage, single source)
│  ├─ y2k-windows.js             panel manager moderno (API window.y2kWindows)
│  ├─ features-ai.js             AI + vision (TF.js/MobileNet lazy-loaded)
│  ├─ itinerary*.js, routing.js  itinerario, budget, routing
│  ├─ group-*.js                 gruppi realtime (MQTT) + chat
│  └─ google-places-*.js         POI da Google Places
├─ api/                          funzioni serverless Vercel (chiavi via process.env)
├─ manifest.webmanifest          PWA config
└─ sw.js                         service worker (offline)
```

> ⚠️ `app-core.js` (~12.800 righe) è il prossimo candidato a essere spezzato
> in moduli di feature: refactor incrementale documentato in ANALISI_2026.md.

---

## 🚀 Quick Start

### Locale (Dev)
```bash
git clone https://github.com/Moriconz/Giappone-2027.git
cd Giappone-2027
npx http-server . -p 5500
# Apri http://localhost:5500
```

### Mobile
1. Apri su **HTTPS** (PWA richiede HTTPS)
2. iOS: Share → "Aggiungi a Home"
3. Android: Menu → "Installa app"

---

## 📱 Features Dettaglio

### 🍜 **Gluten-Free (FOCUS)**

**Perché?** Il Giappone per chi è celiaco è complesso: il grano è in quasi tutto (tamari, panko, roux). Questa app risolve il problema.

#### ✅ Cosa puoi fare:
- **Filtro "Solo GF"** su mappa → 150+ ristoranti certificati
- **Links diretti a FindMeGF** → verifica in real-time se un locale è GF
- **Badge GF full / GF partial** su ogni POI ristorante
- **Frasi essenziali italiano-giapponese** da mostrare al ristorante
- **Informazioni di contatto** per prenotare in avanti

#### 📍 Ristoranti inclusi:
- **Tokyo**: Gluten Free T's Kitchen (100% GF), Gluten-free Izakaya SHION, Soranoiro Nippon (ramen GF)
- **Kyoto**: Okomeya Cafe (100% GF), Mumokuteki Cafe (vegan + GF)
- **Osaka**: Papachan (okonomiyaki GF)
- **Altre città**: Link a FindMeGF per cercare in tempo reale

#### 🔗 Integration:
- **FindMeGF.com**: Click diretto dalla mappa al database mondiale GF
- **Google Maps**: Link per directions e info recenti
- **Prenotazioni**: Suggerimenti di contatti locali

---

### 🗺️ **Mappa Interattiva + Chunk Loader**

- **10,000+ POI** da GitHub Releases (chunk divisi per città)
- **Lazy-load**: Carica solo città visibili
- **Cache**: localStorage persiste tra sessioni
- **Zoom intelligente**: Parte a zoom 10, radius GPS scala con zoom
- **Performance**: 150 marker a zoom totale (90% nascosti)

---

### 📍 **GPS P2P Live**

- **Star topology**: Hub distribuisce posizioni a membri
- **Real-time sync**: Aggiornamenti ogni 5 secondi
- **WakeLock**: Schermo sempre acceso durante tracking
- **Heartbeat**: Rileva peer offline (45s timeout)
- **Test mode**: GPS fake a Tokyo per testing (flag `FORCE_FAKE_GPS`)

---

### 💬 **Chat Gruppo** (NEW)

- **P2P tra membri**: Messaggi via PeerJS
- **Notifiche push**: Browser notifications
- **Storia locale**: localStorage salva chat
- **Interfaccia fluida**: Auto-scroll, input focus

---

### 👥 **Group Panel** (NEW)

- **Lista membri**: Status online/offline
- **Toggle GPS**: Condividi posizione in diretta
- **Exit room**: Esci dal gruppo
- **Delete room**: Elimina stanza (solo creator)
- **Link diretto a chat**: Pulsante per aprire chat

---

### 🤖 **AI Assistant**

- **Gemini API**: Free tier (50 richieste/giorno)
- **Fallback offline**: Risponde anche senza API key
- **Suggerimenti GF**: "Ristoranti celiaci a Tokyo", "Alternative GF a Kyoto"
- **Itinerari**: Costruisce itinerari basati su POI GF

---

## 💾 Dati & Privacy

- **Zero backend**: Tutto locale su device
- **Offline-first**: Funziona senza connessione
- **localStorage**: ~5-10MB quota
- **Backup**: Export JSON istantaneo
- **PWA**: Installabile home screen

### Cosa si Salva
```javascript
state = {
  // Filtri
  activeCat, onlyGF, savedPOIs,
  
  // GPS
  gpsTrack, gpsCurrentLat, gpsCurrentLng,
  
  // Gruppo
  group, gpsRemoteMarkers,
  
  // Chat
  groupchat_${roomId},
  
  // Cache
  chunk_parts_${city}
}
```

---

## 🧪 Testing

### Test Chunk Loader
```javascript
window.chunkPartsLoader.loadChunksForCity('tokyo')
// → [ChunkLoader] Extracted 1250 POIs from tokyo
```

### Test Group Panel
```javascript
window.state.group = {
  roomId: 'test',
  myName: 'TestUser',
  isCreator: true
};
console.log(window.groupPanel.render());
```

### Test GPS Fake
```javascript
// index.html linea 2502: USE_FAKE_GPS = true
// Abilita GPS a Tokyo (35.6762, 139.6503)
```

### Test Chat
```javascript
window.groupChat.send('Ciao!');
console.log(window.groupChat.getHistory());
```

---

## 🛠️ Sviluppo

### Aggiungere Feature
1. Crea file `js/feature-name.js`
2. Usa namespace: `window.featureName = (() => { ... })()`
3. Aggiungi script tag nel `<head>`
4. Esporta funzioni pubbliche

### Debug
```javascript
window.state              // Stato globale
window.chunkPartsLoader.getStatus()  // Chunk status
window.groupChat.getHistory()        // Chat history
window.state.group                   // Gruppo info
```

---

## 📚 Documentazione

- **[ANALISI_2026.md](ANALISI_2026.md)** — Analisi completa, criticità e piano (documento canonico)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Architettura dettagliata
- **[CHANGELOG.md](CHANGELOG.md)** — Release notes
- **docs/archive/** — Documentazione storica (sprint, fix, analisi precedenti)

---

## 🐛 Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| "JSZip not defined" | Verifica JSZip CDN caricato prima di chunk-parts-loader.js |
| Chunk 404 | Verifica URL GitHub Releases in chunk-parts-loader.js |
| Chat non riceve messaggi | Verifica PeerJS connesso (F12 → Console) |
| GPS non attivo in gruppo | Imposta `USE_FAKE_GPS = true` (linea 2502) |
| localStorage pieno | Clear browser cache, riprova |

---

## 📋 Checklist Implementazione

- [x] Mappa interattiva (10,000+ POI)
- [x] **Gluten-Free focus** (150+ POI, FindMeGF links)
- [x] GPS P2P live
- [x] Chat di gruppo
- [x] Group panel
- [x] Chunk loader
- [x] WakeLock + Heartbeat
- [x] AI Gemini
- [x] Modular structure
- [x] Offline-first
- [x] PWA

---

## 🚀 Roadmap

- [ ] GF restaurant ratings (crowdsourced)
- [ ] Booking sync P2P
- [ ] Gemini Vision (photo POI)
- [ ] Weather API per tappe
- [ ] Multi-language (EN, JP)
- [ ] Native app (iOS/Android)

---

## 👤 Autore

**Moriconz** — SAP Solution Consultant + Fotografo  
📧 riccardo.moriconz@gmail.com  
📸 [@riccardo_moricone](https://instagram.com/riccardo_moricone)

---

## 📄 License

MIT — Libero per uso personale/commerciale

---

## 🙏 Crediti

- **OpenLayers** — Mappa interattiva
- **PeerJS** — P2P WebRTC
- **Google Gemini API** — AI assistant
- **JSZip** — Decompressione zip
- **Service Workers** — Offline caching
- **FindMeGF.com** — Database GF mondiale

---

**Versione:** v3.3 (modernizzazione 2026)  
**Status:** ✅ Produzione  
**Ultima modifica:** 25 Maggio 2026  

Made with ❤️ for gluten-free travellers in Japan 🇯🇵
