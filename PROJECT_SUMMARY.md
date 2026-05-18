Certo — eccolo completo.

```md
# 🌏 GIAPPONE 2027 — Project Summary

---

## ⚠️ PROBLEMI NOTI E APERTI (maggio 2026)

> **LEGGI PRIMA DI TUTTO.** Queste criticità invalidano alcuni ✅ riportati più in basso. Prima di implementare nuove feature, risolvi queste.

### 🔴 CRITICO — Bottoni non funzionanti (wiring JS)
- `"Aggiungi POI a questo giorno"` → nessun effetto al click
- `"Esporta su WhatsApp"` → nessun effetto al click
- `"Condividi con il Gruppo"` → nessun effetto al click
- **Causa:** bottoni renderizzati dinamicamente senza event listener riattaccati dopo il render
- **Fix richiesto:** usare event delegation o una funzione rebind() esplicita dopo ogni render dinamico
- **Ogni bottone deve:** avere un effetto reale, o mostrare un toast/modal se manca un prerequisito (es. gruppo non attivo)

### 🔴 CRITICO — Design System incoerente (codice ≠ dichiarato)
- Il documento dichiara "Warm-dark glassmorphism" come design system
- Il codice attuale usa: `Comic Sans MS`, gradienti magenta (`#FF1493`), verde neon (`#00FF88`), arancione acceso (`#FF6B35`), blu elettrico
- **Risultato:** UI incoerente tra sezioni (onboarding vs itinerario vs modali)
- **Fix richiesto:** definire e applicare un design system coerente — palette warm-dark, font leggibile, no stili "y2k/neon"

### 🔴 CRITICO — index.html è il vero entry point (~550KB, ~15.000 righe)
- Circa il 90% della logica è dentro `index.html`, non nei file `.js` separati
- I file `.js` elencati nell'architettura sono integrazioni parziali/aggiuntive
- **Attenzione:** qualsiasi fix va fatto principalmente su `index.html`
- Non assumere che modificare i file `.js` separati cambi il comportamento dell'app

### 🟡 IMPORTANTE — Modal onboarding: implementato ma non rifinito
- Il modal iniziale esiste ma ha UI non coerente col design system warm-dark
- Palette blu + arancione, spacing insufficiente, gerarchia tipografica sbilanciata
- **Status reale:** `⚠️ Implemented, needs UI polish` (non `✅ Complete` come riportato sotto)

### 🟡 IMPORTANTE — Firebase/PeerJS: parzialmente presente, non stabile
- Logica `rtdbBroadcast` e PeerJS è già nel codice ma non documentata e non testata
- Non considerare il sync real-time come funzionante o affidabile
- Non va segnalato come "Fase 3 futura" — è già presente ma rotto/incompleto

### 🟡 IMPORTANTE — POI Detail ancora troppo densa
- Il reorder è stato dichiarato ✅ ma non verificato sul campo
- Su mobile la scheda è ancora difficile da usare per una decisione rapida sì/no
- Da testare e ottimizzare prima di considerarla completa

### 🟠 APERTO — Offline support non implementato
- L'app dipende dalla rete in tutte le sue funzioni principali
- Durante il viaggio (uso reale) è la situazione peggiore
- Rinviato a Fase 3 ma va trattato come criticità, non come feature opzionale

### 🟠 APERTO — "Debugging & Wiring Completo" (Sezione 13) è fuorviante
- Il documento segna ✅ il wiring completo, ma i bottoni sopra elencati non funzionano
- Quella sezione va considerata **parzialmente completata**, non done

---

## 📌 **VISIONE GENERALE**

### Cos'è l'app?
**Giappone 2027** è un **travel planner collaborativo** per pianificare viaggi di gruppo in Giappone (estendibile a qualunque destinazione).

### Chi sono gli utenti?
- **Viaggiatori in gruppo** che vogliono pianificare insieme
- **Amici/colleghi** che vogliono coordinarsi su un viaggio
- **Travel enthusiasts** che vogliono scoprire posti gluten-free friendly

### Qual è il problema che risolve?
Pianificare un viaggio di gruppo è complesso:
- ❌ Tanti messaggi sparsi su chat
- ❌ Difficile coordinare posti, giorni, orari
- ❌ Nessun punto centrale di verità
- ❌ Impossibile gestire allergie/preferenze di gruppo

**✅ Soluzione:** Un'app centralizzata dove tutto è organizzato, condiviso e sincronizzato in tempo reale.

---

## 🎯 **OBIETTIVO PRINCIPALE**

**Creare un'app mobile-first che consenta ai gruppi di:**
1. ✅ Pianificare un itinerario giorno per giorno
2. ✅ Scoprire posti interessanti sulla mappa interattiva
3. ✅ Aggiungere posti all'itinerario con un wizard fluido
4. ✅ Condividere il piano con il gruppo in tempo reale
5. ✅ Tracciare budget e spese
6. ✅ Scoprire posti gluten-free (feature speciale)
7. ✅ Comunicare tramite chat di gruppo integrata

---

## ✅ **COSA ABBIAMO IMPLEMENTATO (FASE 1)**

> ⚠️ Alcuni item segnati ✅ hanno problemi noti — vedi sezione "PROBLEMI NOTI E APERTI" in cima.

### **1. Onboarding & Setup**
- ⚠️ **Pre-onboarding choice modal** — Implementato, UI da rifinire (palette non coerente, spacing insufficiente)
- ✅ **5-step onboarding** — Nome viaggio, giorni, gruppo, interessi, allergie, budget
- ⚠️ **Design** — Dichiarato warm-dark ma codice usa stili neon/y2k in alcune sezioni
- ✅ **Mobile-first** — Responsive su tutti i device

### **2. Mappa Interattiva (OpenLayers)**
- ✅ **Mappa del Giappone** con città principali
- ✅ **POI dinamici** — Migliaia di ristoranti, hotel, attrazioni
- ✅ **Cluster markers** — Raggruppamento smart per non sovraccaricare
- ✅ **Click su POI** — Apre dettagli completi
- ✅ **Filtri avanzati** — Per tipo, città, allergie, rating
- ✅ **GPS tracking** — Localizzazione utente in tempo reale

### **3. POI Detail Card (Scheda Dettagli)**
- ✅ **Foto, nome, città, tipo**
- ✅ **Rating stelline**
- ✅ **Status gluten-free** (con badge)
- ✅ **Orari apertura**
- ✅ **Prezzo medio**
- ✅ **Menu foto carousel**
- ✅ **Note di allergia** (in rosso, highlight)
- ✅ **Galleria foto scorrevole**
- ✅ **Tasto QR** per condividere il POI
- ⚠️ **Densità** — Ancora troppo densa per decisione rapida su mobile, da ottimizzare

### **4. FASE 1.1 — Onboarding 1-minuto**
- ✅ Design semplice e veloce
- ✅ 5 step progressivi
- ✅ Validazione input in tempo reale

### **5. FASE 1.2 — Filtri Travel-Specific**
- ✅ Filtro per allergie (gluten, latticini, arachidi, ecc.)
- ✅ Filtro per tipo (ristoranti, hotel, attrazioni, shopping)
- ✅ Filtro per città
- ✅ Filtro per rating
- ✅ State management con localStorage

### **6. FASE 1.3 — POI Detail Reordering**
- ⚠️ Sezioni riorganizzate per decisione rapida — dichiarato ✅ ma da verificare su mobile
- ✅ Info critiche (allergie, prezzo) in alto
- ✅ Menu/foto nel mezzo
- ✅ CTA (Aggiungi itinerario) in basso

### **7. FASE 1.4 — Itinerario Modificabile**
- ✅ **Accordion giorni** — Espandi/comprimi per giorno
- ✅ **Drag & drop POI** — Sposta POI tra giorni
- ✅ **Modifica orario** — Click sul POI per cambiare ora
- ✅ **Modifica note** — Aggiungi note personali per ogni POI
- ✅ **Valuta POI** — Rating per feedback personale
- ✅ **Rimuovi POI** — Elimina da itinerario

### **8. FASE 1.5 — Tab Restructuring**
- ✅ Ridotti a 4 main tabs:
  - 📍 **Mappa** (principale)
  - 📅 **Itinerario** (il tuo piano)
  - 💚 **Gluten-Free** (posti sicuri)
  - ⚙️ **Menu** (tutto il resto)

### **9. FASE 1.6 — GF Guide (Gluten-Free)**
- ✅ Lista dedicata ai posti gluten-free friendly
- ✅ Filtri per città
- ✅ Badge visibile nel POI detail
- ✅ Highlighting delle note di allergia
- ✅ Icone intuitivi

### **10. FASE 1.7 — Empty/Loading/Error States**
- ✅ Empty state quando itinerario vuoto
- ✅ Loading skeleton mentre carica POI
- ✅ Error message se mappa non carica
- ✅ Messaggi intuitivi all'utente

### **11. UNIFICAZIONE UX — Itinerario + Tappe**
- ✅ **Problema originale:** Due tab "Itinerario" e "Tappe" creavano confusione
- ✅ **Soluzione:** Unico tab "Itinerario" con sezioni:
  - 📊 Budget summary (giornaliero + totale)
  - 📅 Il Tuo Itinerario (accordion con drag-drop)
  - 📤 Condividi con il Gruppo (WhatsApp + share modal)
  - 👥 Itinerario Condiviso (tappe del gruppo in tempo reale)
- ✅ **Validazione:** Non puoi condividere itinerario vuoto

### **12. SOS Button**
- ✅ Accesso veloce a emergenze
- ✅ Contatti di aiuto
- ✅ Info di sicurezza

### **13. Debugging & Wiring**
- ⚠️ **PARZIALMENTE COMPLETATO** — Vedi sezione "Problemi Noti" per i bottoni non funzionanti
- ✅ Logging verboso per debug
- ✅ requestAnimationFrame() per timing sicuro
- ✅ Toast di conferma per alcune azioni
- ❌ Event listener su bottoni dinamici dell'itinerario non funzionanti

---

## 🚀 **FASE 2 — 3-Step Add to Itinerary Wizard**

### **Problema che risolve:**
Aggiungere un POI all'itinerario era confuso:
- ❌ Non era chiaro quale giorno scegliere
- ❌ Non suggeriva orario intelligente
- ❌ Non permetteva aggiungere note

### **Soluzione: Wizard a 3 Step**

#### **Step 1: Conferma POI**
- Mostra foto, nome, città, tipo
- Design card con gradiente
- Progress bar (33%)
- Bottone "Continua"

#### **Step 2: Scegli Giorno & Orario** ⭐
- **Smart suggestion:** Sceglie day con MENO POI
- **Orario suggerito:** Calcola based su ultimo POI + tempo viaggio
- Dropdown per giorno (con conteggio POI)
- Dropdown per orario (ogni 30 min, 08:00-22:00)
- Progress bar (67%)

#### **Step 3: Note (Opzionale)**
- Textarea per allergie, preferenze, dettagli
- Summary con giorno/orario scelti
- Bottone verde "✓ Aggiungi all'Itinerario"
- Progress bar (100%)

### **Status attuale:** ⚠️ Debug needed
- La logica del wizard è implementata
- Il bottone di apertura wizard nel POI detail **non funziona** (problema wiring)
- Tutta la Fase 2 è bloccata da questo bug

### **File creati:**
1. `itinerary-add-wizard.js` — Il wizard completo (400+ righe)
2. `wizard-integration.js` — Integrazione con POI detail modal
3. Entrambi linkati in `index.html`

> ⚠️ **Nota:** La maggior parte della logica dell'app è dentro `index.html`. I file .js separati sono integrazioni aggiuntive — qualsiasi fix al wiring va fatto verificando prima cosa c'è in `index.html`.

---

## 🏗️ **ARCHITETTURA TECNICA**

### **Stack:**
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Map:** OpenLayers (open-source, no API key)
- **State Management:** localStorage + window.state object
- **UI Pattern:** Sheet/Modal system con openSheet()
- **Design System:** Warm-dark glassmorphism *(dichiarato — il codice ha stili incoerenti, vedi Problemi Noti)*
- **Sync:** Firebase RTDB + PeerJS *(parzialmente implementati nel codice ma non stabili)*

### **Nota critica sull'architettura:**
`index.html` contiene circa il 90% della logica dell'app (~550KB, ~15.000 righe). I file `.js` separati sono integrazioni recenti. Qualsiasi modifica strutturale va fatta su `index.html`.

### **Data Structure:**
```javascript
window.state = {
  tripProfile: {
    name: "Giappone 2027",
    days: 8,
    startDate: "2027-04-10",
    budget_total: 5000,
    budget_daily: 625,
    interests: ["food", "culture", "temples"],
    dietaryRestrictions: ["gluten-free"],
    groupSize: 4
  },
  
  itineraryByDay: {
    0: [
      { 
        poi_id: "google-place-123",
        poi_name: "Ramen House Tokyo",
        time: "18:30",
        duration: 90,
        notes: "Senza glutine per Maria",
        status: "proposed"
      }
    ],
    1: [...],
    // ... giorni 2-7
  },
  
  itinerary: [
    // Tappe condivise con il gruppo (Firebase/PeerJS — parziale)
  ],
  
  gpsCurrentLat: 35.6762,
  gpsCurrentLng: 139.6503
}
```

### **File Principali:**
- `index.html` — **Entry point reale, contiene ~90% della logica** ← inizia sempre da qui
- `itinerary.js` — Sistema gestione itinerario
- `itinerary-ui.js` — UI accordion per itinerario
- `itinerary-unified.js` — Unified view con condivisione
- `itinerary-add-wizard.js` — 3-step wizard (NEW, parziale)
- `wizard-integration.js` — Integrazione wizard (NEW, parziale)
- `filter-system.js` — Filtri mappa
- `map.js` — Logica OpenLayers
- `onboarding.js` — Setup utente
- `budget.js` — Gestione budget
- `chat.js` — Chat di gruppo

---

## 📋 **COSA MANCA — TODO prioritizzato**

### 🔴 Priorità ALTA (bloccanti)

**1. FIX WIRING BOTTONI ITINERARIO**
- Bottoni "Aggiungi POI a questo giorno", "Esporta su WhatsApp", "Condividi con il Gruppo" non rispondono al click
- Fix: event delegation o rebind dopo ogni render dinamico
- Verificare in `index.html` prima di cercare nei file .js separati
- Aggiungere console.log su ogni handler per confermare che parte
- Se manca un prerequisito (es. gruppo non attivo), mostrare toast/modal esplicativo

**2. FIX WIZARD BUTTON**
- Il bottone "Aggiungi all'itinerario" nel POI detail non apre il wizard
- Verificare che `openAddToItineraryWizard` sia esposta globalmente e che il bind avvenga dopo il render del detail
- Tutta la Fase 2 è bloccata da questo

**3. UNIFICAZIONE DESIGN SYSTEM**
- Rimuovere Comic Sans MS, gradienti neon, palette magenta/verde da tutto il codice
- Applicare design system warm-dark coerente in tutte le sezioni
- Iniziare dall'onboarding modal, poi itinerario, poi modali condivisione

### 🟡 Priorità MEDIA

**4. TEST WIZARD FLOW end-to-end**
- Step 1 → 2 → 3 → POI aggiunto → itinerario refreshato → toast confermato

**5. TEST ACCORDION DRAG-DROP**
- Espansione/compressione accordion, drag tra giorni, modifica orario, note, rimozione POI

**6. TEST CONDIVISIONE GRUPPO**
- Modal gruppo si apre, itinerario appare in sezione condivisa, validazione vuoto funziona

**7. TEST WHATSAPP EXPORT**
- Bottone funziona, testo formattato correttamente, validazione vuoto

**8. UI POLISH — ONBOARDING MODAL**
- Palette coerente col design system warm-dark
- Spacing e gerarchia tipografica corretti
- Sembrare onboarding travel premium, non popup admin

### 🟠 Priorità BASSA (Fase 3)

**9. Multi-format Itinerary Views** — Timeline, Map view, List, PDF export

**10. Offline Support** — Cache POI e itinerario per uso senza rete (critico per viaggio reale)

**11. Budget Tracking completo** — Spese per POI, split gruppo, report finale

**12. AI Suggestions** — Suggerimenti POI, ottimizzazione rotta, timing automatico

**13. Foto di Viaggio** — Galleria, associa a POI, timeline

---

## 🔮 **FASE 3 — FUTURE**

### **3.1 — Multi-format Itinerary Views**
- **Timeline view** — Asse orario con POI disposti
- **Map view** — POI sull'itinerario mostrati sulla mappa
- **List view** — Semplice lista ordinata
- **Export PDF** — Stampa/condividi il piano

### **3.2 — Real-time Sync (Firebase/PeerJS)**
- Stabilizzare l'infrastruttura già parzialmente presente nel codice
- Sincronizzazione del gruppo in tempo reale affidabile
- Notifiche quando il gruppo aggiunge POI
- Last-seen status

### **3.3 — Budget Tracking**
- Aggiungi spese a ogni POI
- Totale giornaliero vs budget
- Split equo tra membri del gruppo
- Report spese finale

### **3.4 — Foto di Viaggio**
- Galleria foto dal viaggio
- Associa foto a POI
- Timeline di memoria

### **3.5 — AI Suggestions**
- Suggerimenti POI basati su interessi
- Ottimizzazione rotta (da dove a dove per ogni giorno)
- Timing automatico (considerando distanze)

### **3.6 — Offline Support**
- Cache POI e itinerario localmente (Service Worker)
- Modifiche offline con sync al ritorno della rete
- Mappa offline per le aree del viaggio

---

## 📊 **METRICHE SUCCESS**

### **FASE 1:**
- ✅ Utente crea account + completa onboarding in <2 min
- ✅ Trova POI sulla mappa in <10 sec
- ⚠️ Aggiunge un POI all'itinerario (wizard bloccato, da fixare)
- ⚠️ Condivide itinerario con il gruppo (bottone non funziona, da fixare)

### **FASE 2:**
- ⚠️ Aggiunge POI con 3-step wizard — bloccato da bug wiring
- ✅ Smart suggestions implementate (logica OK)
- ⚠️ Wizard completato in <1 min — da testare dopo fix

### **FASE 3:**
- 🔲 Itinerario esportato in PDF
- 🔲 Sync real-time con gruppo stabile
- 🔲 Budget tracking completo
- 🔲 Offline support

---

## 💡 **INSIGHT CHIAVE**

**L'app risolve un problema reale:** Pianificare un viaggio di gruppo è DIFFICILE.

**Come lo risolve:**
- 🗺️ **Mappa** per scoprire posti
- 📅 **Itinerario** per organizzare giorni
- 👥 **Condivisione** per coordinare il gruppo
- 🔄 **Sync** per restare allineati
- ✨ **Smart suggestions** per decisioni veloci

**Il valore:** Passa da caos (chat sparse) a ordine (plan centralizzato).

---

## 📌 **SNAPSHOT TECNICO FINALE**

| Aspetto | Status | Note |
|---------|--------|------|
| Onboarding | ⚠️ UI polish needed | Funziona, palette incoerente |
| Mappa | ✅ Complete | OpenLayers, filtri, GPS |
| POI Detail | ⚠️ Da ottimizzare | Troppo densa su mobile |
| Itinerario Accordion | ✅ Implementato | Da testare su device reale |
| Bottoni Itinerario | ❌ Non funzionanti | Wiring JS da fixare |
| Unified View | ✅ Complete | Personal + shared + share |
| 3-Step Wizard | ❌ Bloccato | Bottone apertura non funziona |
| Condivisione Gruppo | ⚠️ Da testare | Bottone non funziona |
| Export WhatsApp | ⚠️ Da testare | Bottone non funziona |
| Design System | ❌ Incoerente | Warm-dark dichiarato, neon nel codice |
| Firebase/PeerJS Sync | ⚠️ Parziale | Nel codice ma non stabile |
| Offline Support | ❌ Non implementato | Da fare in Fase 3 |
| Validation | ✅ Complete | Empty itinerary check |

---

**Last Updated:** May 15, 2026  
**Repo:** /Users/riccardomoricone/Desktop/Giappone-2027-main-2  
**Branch:** main
```