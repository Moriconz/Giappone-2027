# 🚀 QUICKSTART — Come Muoversi da Qui

**Leggi questi file IN ORDINE per capire il codebase e continuare lo sviluppo**

---

## 📖 LETTURA CONSIGLIATA (IN ORDINE)

### **1️⃣ PRIMO — Capire lo Stato Attuale (5 min)**
```
📄 STATUS.md
  ├─ Riassunto rapido di cosa funziona
  ├─ Bug risolti in questa sessione
  ├─ Miglioramenti UI implementati
  └─ Checklist testing completato
```

**Dopo**: Saprai cosa è stato fatto e cosa funziona.

---

### **2️⃣ SECONDO — Capire la Struttura Dati (10 min)**
```
📄 /js/itinerary.js (LEGGI TUTTO)
  ├─ Lines 1-32: state.itineraryByDay structure
  ├─ Lines 44-76: addPOIToDay() — come salva un POI
  ├─ Lines 81-98: removePOI() — come rimuove
  ├─ Lines 103-151: update funzioni (time/duration/cost/notes)
  ├─ Lines 175-202: moveToDay() — come sposta tra giorni
  └─ Lines 216-219: getDayDuration() — calcolo durata giorno
```

**Dopo**: Capirai come sono organizzati i dati e come modificarli.

---

### **3️⃣ TERZO — Capire il Flusso dell'App (15 min)**
```
📄 ARCHITECTURE.md
  ├─ Sezione: DATA FLOW DIAGRAM
  │  └─ Traccia il percorso: Click marker → Itinerary display
  │
  ├─ Sezione: KEY FUNCTIONS
  │  └─ Tabelle con le funzioni principali
  │
  └─ Sezione: LAYER STACK
     └─ Come i layer si comunicano
```

**Dopo**: Capirai come i dati fluiscono da un layer all'altro.

---

### **4️⃣ QUARTO — Capire il Rendering UI (15 min)**
```
📄 /js/itinerary-unified.js (LEGGI SEZIONI CHIAVE)
  ├─ Lines 7-40: renderItineraryUnified() — entry point
  ├─ Lines 48-97: Card POI rendering (3-row layout)
  │  ├─ Lines 68-76: ROW 1 (numero + nome + menu)
  │  ├─ Lines 79-87: ROW 2 (badges orario/durata/costo)
  │  └─ Lines 90-94: ROW 3 (note con highlighting)
  ├─ Lines 620-800: showItineraryPOIMenu() — edit modal
  └─ Lines 357-410: setupGlobalEventDelegation() — event handlers
```

**Dopo**: Capirai come viene renderizzato il UI e come aggiungere elementi.

---

### **5️⃣ QUINTO — Capire gli Event Handlers (10 min)**
```
📄 /index.html (LEGGI SEZIONI SPECIFICHE)
  ├─ Lines 5383-5470: renderMarkers()
  │  └─ Come vengono creati i marker sulla mappa
  │
  ├─ Lines 5872-5920: Map click handler
  │  └─ Cosa accade quando clicchi un marker
  │
  ├─ Lines 6882-6900: openPOI(id)
  │  └─ Come viene cercato il POI e aperto il dettaglio
  │
  ├─ Lines 8001-8025: getCachedAllPOIs()
  │  └─ Cache management (CRITICAL per il bug fix)
  │
  └─ Lines 7223-7320: Wizard confirm logic
     └─ Come il wizard salva il POI in itineraryByDay
```

**Dopo**: Capirai come gli eventi sono gestiti e quale è il flusso completo.

---

### **6️⃣ SESTO — Capire le Ottimizzazioni Performance (5 min)**
```
📄 /y2k-override.css (LEGGI SEZIONI CHIAVE)
  └─ Lines 1450-1474: Y2K window animations
     ├─ Line 1460: Opacity transition 0.12s (optimized)
     ├─ Line 1468: Visibility transition removed
     ├─ Line 1473: FloatIn animation 0.15s (optimized)
     └─ Line 1469: will-change GPU acceleration hint

📄 ARCHITECTURE.md
  └─ Sezione: "Adding Animation"
     └─ Come aggiungere animazioni GPU-accelerated
```

**Dopo**: Capirai come fare animazioni senza causare jank.

---

### **7️⃣ SETTIMO — Capire Come Estendere (5 min)**
```
📄 ARCHITECTURE.md
  └─ Sezione: EXTENSION POINTS
     ├─ Come aggiungere un nuovo campo POI
     ├─ Come aggiungere un nuovo event handler
     └─ Come aggiungere una nuova animazione

📄 ARCHITECTURE.md
  └─ Sezione: STATE MANAGEMENT
     └─ Struttura completa di window.state
```

**Dopo**: Saprai dove aggiungere codice nuovo e come integarlo.

---

## 🎯 PRIMA DI INIZIARE A CODIFICARE

### **Checklist Pre-Development**

- [ ] Ho letto STATUS.md
- [ ] Ho capito la struttura dati in `/js/itinerary.js`
- [ ] Ho letto il DATA FLOW DIAGRAM in ARCHITECTURE.md
- [ ] Ho capito renderItineraryUnified() in `/js/itinerary-unified.js`
- [ ] Ho capito gli event handlers in `/index.html`
- [ ] Conosco come funziona getCachedAllPOIs()
- [ ] Conosco come funziona saveState() e renderItineraryUnified()

Se hai risposto "no" a qualcuno di questi, ri-leggi la sezione corrispondente.

---

## 🛠️ QUANDO STAI SCRIVENDO CODICE NUOVO

### **Regole da Seguire**

1. **Sempre usare `saveState()` dopo ogni modifica ai dati**
   ```javascript
   // ✅ CORRETTO
   window.ITINERARY.updateTime(poiId, newTime);
   saveState();  // ← OBBLIGATORIO
   renderItineraryUnified();

   // ❌ SBAGLIATO
   window.ITINERARY.updateTime(poiId, newTime);
   // Dimentico saveState() → data non è persistente
   ```

2. **Sempre invalidare la cache prima di usarla**
   ```javascript
   // ✅ CORRETTO (in renderMarkers)
   globalPOIsCache = null;
   const pois = getCachedAllPOIs();  // ← Cache sempre fresco

   // ❌ SBAGLIATO
   const pois = getCachedAllPOIs();  // ← Potrebbe essere stale
   ```

3. **Usare event delegation per nuovi handler**
   ```javascript
   // ✅ CORRETTO
   document.addEventListener('click', (e) => {
     const btn = e.target.closest('.my-button');
     if (btn) { /* handle */ }
   });

   // ❌ SBAGLIATO
   document.querySelectorAll('.my-button').forEach(btn => {
     btn.onclick = () => { };  // Non funziona per elementi dinamici
   });
   ```

4. **Usare solo transform/opacity per animazioni**
   ```javascript
   // ✅ CORRETTO (GPU-accelerated)
   element.style.transform = 'translateY(10px)';
   element.style.opacity = '0.5';

   // ❌ SBAGLIATO (causes jank)
   element.style.width = '100px';
   element.style.top = '10px';
   element.style.height = '50px';
   ```

5. **Sempre aggiungere debug logs (poi rimuovere in production)**
   ```javascript
   // ✅ CORRETTO (durante development)
   console.log('[FunctionName] Processing POI:', poiId);
   console.log('[FunctionName] Result:', result);

   // ❌ SBAGLIATO in production
   // Lasciare console.log sparsi ovunque
   ```

---

## 📚 FILE MAPPING

| Cosa Fare | Dove Leggere | Dove Modificare |
|-----------|--------------|-----------------|
| Aggiungere campo POI | itinerary.js L44-76 | itinerary.js + itinerary-unified.js |
| Aggiungere event handler | ARCHITECTURE.md EXTENSION POINTS | itinerary-unified.js + index.html |
| Aggiungere animazione | y2k-override.css + ARCHITECTURE.md | y2k-override.css |
| Capire data flow | ARCHITECTURE.md DATA FLOW DIAGRAM | None (read-only) |
| Capire state structure | ARCHITECTURE.md STATE MANAGEMENT | index.html (saveState area) |
| Debuggare bug | ARCHITECTURE.md DEBUGGING | Browser DevTools |

---

## 💡 COMMON PATTERNS

### **Pattern 1: Add Data → Save → Render**
```javascript
// Aggiungi
window.ITINERARY.addPOIToDay(poiId, poiName, dayIndex, time, duration, notes, cost);

// Salva
saveState();

// Ri-renderizza
renderItineraryUnified();
```

### **Pattern 2: Update Data → Save → Render**
```javascript
// Modifica
window.ITINERARY.updateTime(poiId, newTime);

// Salva
saveState();

// Ri-renderizza
renderItineraryUnified();
```

### **Pattern 3: Event Handler → Modifica → Save → Render**
```javascript
const btn = document.querySelector('.my-button');
btn.onclick = () => {
  // 1. Modifica
  window.ITINERARY.updateDuration(poiId, newDuration);
  
  // 2. Salva
  saveState();
  
  // 3. Ri-renderizza
  renderItineraryUnified();
  
  // 4. Feedback utente
  window.toast('✓ Modifiche salvate');
};
```

---

## 🚨 RED FLAGS

Se vedi questi pattern, c'è un bug:

| Red Flag | Causa Probabile | Fix |
|----------|-----------------|-----|
| Dati modificati ma non appaiono | `saveState()` non chiamato | Aggiungi `saveState()` |
| Dati non sincronizzati | `renderItineraryUnified()` non chiamato | Aggiungi `renderItineraryUnified()` |
| Lookup fallisce ("NOT FOUND") | Cache stale | Invalida cache all'inizio renderMarkers() |
| Button non risponde a click | Event delegation non impostato | Aggiungi listener globale |
| Animazione jank | Usando proprietà CPU-intensive | Usa solo transform/opacity |
| Memory leak | Event listeners non rimossi | Usa event delegation al posto di direct listeners |

---

## ✅ READY TO CODE

Quando hai finito di leggere questi file, sei pronto a:

- ✅ Aggiungere nuovi campi POI
- ✅ Aggiungere nuovi event handler
- ✅ Modificare il rendering UI
- ✅ Aggiungere animazioni
- ✅ Debuggare problemi
- ✅ Integrare nuove feature

**Non leggere il codebase intero** — leggi solo le sezioni rilevanti quando serve.

---

## 📞 QUICK REFERENCE

**Domanda**: Come faccio a...?

| Domanda | Risposta |
|---------|----------|
| Aggiungere un nuovo campo al POI? | Modifica `/js/itinerary.js` L44-76 + `/js/itinerary-unified.js` rendering |
| Aggiungere un nuovo bottone? | Modifica `/js/itinerary-unified.js` + aggiungi event listener in setupGlobalEventDelegation() |
| Capire come vengono salvati i dati? | Leggi `/js/itinerary.js` L44-76 (addPOIToDay) |
| Capire come vengono mostrati i dati? | Leggi `/js/itinerary-unified.js` L48-97 (card rendering) |
| Capire come viene gestita la cache? | Leggi `/index.html` L8001-8025 (getCachedAllPOIs) |
| Aggiungere una nuova animazione? | Leggi `/y2k-override.css` + ARCHITECTURE.md EXTENSION POINTS |
| Debuggare un problema? | Leggi ARCHITECTURE.md DEBUGGING section |

---

**Last Updated**: 15 Maggio 2026
**Status**: Ready to extend with PARTE 2-10
