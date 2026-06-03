# 📦 Giappone 2027 v3 — Modular Structure

## Panoramica

Il progetto è stato diviso da un **monolite di 4k linee** in una **struttura modulare e manutenibile**:

```
index.html                    (HTML shell + CSS, ~4120 linee)
├─ js/state.js               (State globale, localStorage)
├─ js/features-ai.js         (Feature 3: Gemini AI Chat)
├─ js/features-gps.js        (Features 1,2,4: GPS, WakeLock, Heartbeat)
├─ js/ui-helpers.js          (Helper UI: renderAIChat, escapeHtml, etc)
├─ manifest.webmanifest
├─ icon-192.png
├─ icon-512.png
└─ test-modular.html         (Test che verifica il caricamento)
```

## 📋 Ordine di caricamento

Nel `<head>` di **index.html**:

```html
<script src="./js/state.js"></script>              <!-- 1. Crea window.state PRIMA -->
<script src="./js/features-ai.js"></script>        <!-- 2. Feature 3: AI -->
<script src="./js/features-gps.js"></script>       <!-- 3. Features 1,2,4: GPS -->
<script src="./js/ui-helpers.js"></script>         <!-- 4. Helper functions -->
```

**Importante:** Questo ordine garantisce che:
- ✅ `window.state` esiste PRIMA che Feature 3 lo usi
- ✅ Ogni modulo può dipendere dai precedenti
- ✅ Errori sono visibili con nome del file

## 📄 File Description

### `js/state.js` (70 linee)
**Responsabilità:** Inizializzazione dello stato globale

Crea:
- `window.state` — Object persistente su localStorage
- `window.saveState()` — Salva state su localStorage
- `window.STATE_KEY` — Chiave localStorage

**Non dipende da nulla.** Caricato per **primo**.

---

### `js/features-ai.js` (200 linee)
**Responsabilità:** Feature 3 — Gemini AI Chat

Esporta:
- `window.sendAIMessage(userText)` — Entry point chat
- `window.callGeminiAPI(userText)` — Chiama Gemini API
- `window.saveAIConfig()` — Salva API key
- `window.loadAIConfig()` — Carica API key
- `window.checkAIQuota()` — Verifica quota giornaliera (50 richieste)
- `window.getOfflineAISuggestion(userText)` — Fallback offline

**Dipende da:**
- `window.state` (caricato prima)
- `window.toast()` (dal main, ma fallback)
- `window.renderAIChat()` (caricato dopo, ma deferred)

---

### `js/features-gps.js` (350 linee)
**Responsabilità:** Features 1,2,4 — GPS P2P, WakeLock, Heartbeat

Esporta:
- **Feature 1 (GPS P2P):**
  - `window.makeHubId(roomId)` — ID hub per star topology
  - `window.makePeerId(roomId, name)` — ID peer personale
  - `window.ensureHubAndMembersConnected()` — Connetti alla topologia
  - `window.setupPeerHandlersWithRelay(peer, amIHub)` — Setup P2P message relay
  - `window.startGPSBroadcast()` — Broadcast posizione ogni 5s

- **Feature 2 (WakeLock):**
  - `window.toggleWakeLock(enabled)` — Abilita/disabilita screen lock
  - `window.setupWakeLockToggle()` — Setup event listeners

- **Feature 4 (Heartbeat):**
  - `window.startHeartbeatMonitoring()` — Hub monitora peer offline
  - `window.startHeartbeatSender()` — Tutti mandano heartbeat
  - `window.onPeerMessage(data)` — Update lastHeartbeat

- **Feature 9 (Validation):**
  - `window.validateGroupSetup(group)` — Valida setup gruppo

**Dipende da:**
- `window.state`
- `window.peer` (PeerJS, caricato in main)
- `window.saveState()`
- `window.broadcastGroupSync()` (dal main)
- `window.updateMapMarkers()` (dal main)

---

### `js/ui-helpers.js` (50 linee)
**Responsabilità:** Helper UI functions utilizzate da Feature 3 e main

Esporta:
- `window.renderAIChat()` — Aggiorna UI messaggi AI
- `window.escapeHtml(str)` — XSS protection
- `window.formatAIReply(text)` — Markdown → HTML

**Dipende da:** Niente (puro utility)

---

## 🧪 Testing

### Test 1: Verifica caricamento moduli
```bash
# Apri nel browser
./test-modular.html
```

Dovrebbe mostrare:
```
✓ window.state exists
✓ window.saveState
✓ window.sendAIMessage
✓ window.renderAIChat
... (20+ funzioni)

🎉 20/20 funzioni caricate ✓
```

### Test 2: Clicca tab AI
1. Apri `index.html` in localhost
2. Clicca tab "🤖 AI Itinerario"
3. **Senza errori** sulla console
4. Vedi config panel con input API key

### Test 3: Prova AI (offline)
1. Scrivi: "Itinerario 3 giorni Kyoto"
2. Vedi risposta offline (non Gemini, perché no API key)
3. Messaggio salvato in `window.aiHistory`

### Test 4: Prova WakeLock (se su mobile)
1. Nel pannello Gruppo, sezione "Stabilità GPS"
2. Toggle "⚡ Mantieni schermo acceso"
3. Vedi messaggio "✅ Wake Lock attivo"

---

## 🔧 Modificare un modulo

Se devi aggiungere codice a una feature:

### Aggiungi funzione a Feature 3 (AI)?
1. Modifica `js/features-ai.js`
2. Aggiungi funzione
3. Esporta: `window.myNewFunction = myNewFunction;`
4. Testa: apri console, digita `window.myNewFunction`

### Aggiungi funzione a Feature 1 (GPS)?
1. Modifica `js/features-gps.js`
2. Stessa procedura

### Aggiungi elemento HTML per una feature?
1. Modifica `index.html` nella sezione HTML appropriata
2. Nel modulo `.js` corrispondente, recupera con `document.getElementById()`

---

## 📊 Size comparison

**Prima (monolite):**
- `index.html` — 4114 linee, ~230 KB (con 200 POI inline)

**Dopo (modular):**
- `index.html` — 4120 linee (~5 linee di script tags)
- `js/state.js` — 70 linee
- `js/features-ai.js` — 200 linee
- `js/features-gps.js` — 350 linee
- `js/ui-helpers.js` — 50 linee
- **Totale:** +5 linee di overhead, `-335 linee` dal main HTML

**Vantaggio:** Molto più leggibile, debuggabile, modulare.

---

## 🐛 Debugging

### Errore: "Can't find variable state"
→ `state.js` non caricato prima di altri moduli  
→ Verifica ordine script tags in `<head>`

### Errore: "renderAIChat is not a function"
→ `ui-helpers.js` non caricato  
→ Verifica linea 23 di `index.html` ha `<script src="./js/ui-helpers.js"></script>`

### Errore: Funzione non esiste
→ Usa console: `console.log(Object.keys(window).filter(k => k.includes('AI')))`  
→ Verifica che il modulo sia stato caricato

---

## 🚀 Deployment

Per mettere in produzione:

1. Copia tutta la cartella in GitHub:
   ```
   index.html
   manifest.webmanifest
   icon-*.png
   js/
     ├─ state.js
     ├─ features-ai.js
     ├─ features-gps.js
     └─ ui-helpers.js
   ```

2. Deploy su GitHub Pages / Netlify / simile

3. Testa su mobile: https://tuodominio.com

---

## ✅ Checklist integrità

Prima di considerarlo "pronto":

- [ ] Apri `test-modular.html` → 20/20 funzioni ✓
- [ ] Apri `index.html` → nessun errore in console (F12)
- [ ] Clicca "AI" → config panel visibile
- [ ] Scrivi messaggio AI → risposta offline ✓
- [ ] Clicca "Gruppo" → toggle WakeLock visibile
- [ ] LocalStorage persiste dopo refresh ✓
- [ ] Su mobile: permission geolocation, etc

---

## 📞 Troubleshooting rapido

| Problema | Soluzione |
|----------|-----------|
| "state is undefined" | Aggiungi `console.log(window.state)` in console. Se undefined, `state.js` non è caricato. Verifica linea 20 di index.html |
| "sendAIMessage is not a function" | Apri `test-modular.html`, vedi quale funzione manca |
| Layout rotto (no CSS) | CSS è nel `<style>` di index.html, dovrebbe essere OK. Refresh hard (Ctrl+Shift+R) |
| Messaggi AI non salvati | Verifica `localStorage.getItem('giappone2027_state_v1')` contiene `aiHistory` |

---

**Fine. Pronto per GitHub!** 🚀
