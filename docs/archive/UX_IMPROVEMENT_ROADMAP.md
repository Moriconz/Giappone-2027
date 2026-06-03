# UX Improvement Roadmap — Giappone 2027 Travel Planner

**Visione**: Strumento pratico e serio per pianificare e usare un viaggio in Giappone nel 2027. Mobile-first, offline-capable, group-aware, gluten-free focused.

**Non è**: vetrina estetica, demo, landing page.  
**È**: companion affidabile durante il viaggio, con decisioni rapide e dati verificati.

---

## PARTE 1: ANALISI CRITICITÀ ATTUALI

### 🔴 CRITICO (Blocca usabilità reale)

1. **Manca onboarding iniziale**
   - L'app non sa: chi sei, quanti giorni, quali interessi, vincoli GF, budget
   - Primo accesso è confusionario (quale tab aprire? cosa fare?)
   - I suggerimenti non sono personalizzati
   - **Impact**: Utente perso subito

2. **Itinerario non è realmente modificabile**
   - Non vedo come l'utente sposta un POI da un giorno all'altro
   - Non vedo come elimina, duplica, cambia orario, aggiunge note logistiche
   - Editing probabilmente richiede troppi tap
   - **Impact**: Itinerario è "guardare e basta", non "pianificare davvero"

3. **Offline support incompleto**
   - Dati POI potrebbero non sincronizzare offline
   - Itinerario potrebbe perdersi se connessione cade
   - Quale contenuto è disponibile offline non è chiaro
   - **Impact**: Durante il viaggio (situazione peggiore) l'app non aiuta

4. **Struttura tab è confusionaria**
   - 10+ tab senza gerarchia visiva chiara
   - Non è ovvio "da dove comincio"
   - Mix di "esplora" (mappa, lista) + "pianifica" (itinerario) + "utility" (budget, GF, booking)
   - **Impact**: Cognitive load alto, UX dispersiva

5. **POI detail modal troppo densa**
   - Molte sezioni non sempre rilevanti
   - Ordine informazioni non ottimale per decisione rapida
   - "CTA principale" non è chiara (salva? aggiungi a itinerario? apri mappa?)
   - **Impact**: Utente non sa subito "vuoi questo POI sì o no?"

6. **Filtri travel-specific non esistono**
   - Non posso cercare "gluten-free SICURO" (diverso da "probabile")
   - Non posso cercare "gratis" + "vicino a me"
   - Non posso cercare "piove, cosa fare al coperto?"
   - Non posso cercare "attività sera" vs "mattina"
   - **Impact**: Ricerca inefficiente in situazione reale

### 🟠 IMPORTANTE (Degrada usabilità)

7. **Empty/Loading/Error states non curati**
   - Quando carica POI cosa vede l'utente?
   - Quando non ci sono risultati cosa fa?
   - Quando connessione cade cosa succede?
   - **Impact**: Esperienza inaffidabile, confusionaria

8. **Budget planner è basic**
   - Non integrato con itinerario
   - Non suggerisce "in base ai tuoi POI, spendi X al giorno"
   - Non tiene conto di sconti gruppo
   - **Impact**: Utente non sa se sta spendendo bene

9. **Gruppo è poco visibile**
   - Chat/voting non è integrato in pianificazione
   - Non vedo chi ha proposto cosa, chi ha votato
   - Non è chiaro "questa tappa piace a tutti?"
   - **Impact**: Conflitti durante viaggio, decisioni lente

10. **Gerarchia visiva incoerente**
    - Tanti bottoni ugualmente importanti
    - Non è chiaro "questo è opzionale" vs "devo fare questo"
    - Colori e sizing non guidano decisione
    - **Impact**: Utente non sa dove cliccare

11. **Dark mode incoerente**
    - Contrasto di testo probabilmente non uniforme
    - Superfici (card, input) hanno opacità diverse
    - Colori accent (warm/cyan/pink) mescolati senza logica
    - **Impact**: Affaticamento visivo, sentore di "in beta"

### 🟡 NICE-TO-HAVE (Migliorano ma non blocca)

12. Personalizzazione design (tema, font size)
13. Statistiche viaggio (km camminati, soldi spesi vs budget)
14. Weather integration per pianificazione giorno
15. Mappe offline (più complex, lower priority)

---

## PARTE 2: PLAN CONCRETO E PRIORITIZZATO

### **FASE 1: Rendi l'app usabile (3-5 giorni)**

#### 1.1 Onboarding 1-minuto (CRITICO)
**Cosa**: Schermata iniziale che chiede:
- Nome viaggio e date (giorni disponibili)
- "Traveli da solo, con partner, con gruppo?" (influenza UX)
- Top 3 interessi (cultura, food, relax, shopping, avventura, natura)
- Vincoli alimentari: nessuno / vegetariano / vegano / gluten-free / altri
- Budget giornaliero approssimativo
- Salva come "Profilo viaggio"

**Risultato**: I suggerimenti POI diventano pertinenti, filtri si auto-configurano.

**UI Changes**:
- Una splash screen nuova (non parte dalla mappa)
- 5 form fields semplici, 1 per pagina
- Bottone "Inizia pianificazione" finale → apre mappa con filtri preimpostati

**Code**: Nuova route/view, nuova struttura dati `state.tripProfile`

---

#### 1.2 Risistemazione struttura tab (CRITICO)
**Cosa**: Riorganizzare da 10+ tab confusi a 4 principali:

```
┌─────────────────────────────────────┐
│ 🗺️ MAPPA      📅 ITINERARIO         │  ← Principali (sempre visibili)
│ 💚 GF GUIDE   ⚙️ MENU               │  ← Utility (scorribili o sub-menu)
└─────────────────────────────────────┘

MAPPA:
  - Mappa principale con filtri rapidi (GF sicuro, gratis, vicino, tipi POI)
  - Marker colorati per tipo
  - Tap marker → POI detail minimal
  - CTA principale: "Aggiungi a giorno X" o "Salva preferito"

ITINERARIO:
  - Accordion per giorno (Giorno 1, Giorno 2, ...)
  - Drag-and-drop POI tra giorni
  - Per POI: orario, note, stato (proposto/approvato/done), durata
  - CTA: aggiungi POI, elimina, modifica orario, vota
  - Budget summary in alto: spesa stimata questo giorno

GF GUIDE:
  - Lista POI GF già salvati da mappa
  - Filtri: confermato, probabile, cerca per zona
  - Per ogni POI: telefono, indirizzo, note GF specifiche
  - CTA: come arrivare, chiama, apri Google Maps

⚙️ MENU (hamburger):
  - Profilo viaggio (modifica preferenze)
  - Impostazioni offline (cosa sincronizzare)
  - Aiuto e info
  - Accesso ai vecchi tab meno usati (weather, budget dettagliato, galleria)
```

**UI Changes**:
- Bottom nav con 4 iconografie chiare e labeli
- Tab "mappa" e "itinerario" occupano 80% dello spazio
- Tab "GF guide" è versione filtraggio della mappa
- Menu ⚙️ è drawer/modal per cose secondarie

**Code**: Ristruturare index.html navigator, aggiornare CSS per bottom nav highlighting

---

#### 1.3 POI detail modal ridisentato (CRITICO)
**Cosa**: Ordine informazioni per "decidere sì/no rapidamente"

```
┌──────────────────────────────────────┐
│ Foto grande (160px)                  │
├──────────────────────────────────────┤
│ NOME POI                             │ ← Titolo grande, bold
│ 🟢 Aperto | ⭐ 4.5 | 30 min da qui    │ ← Metadati decisionali
├──────────────────────────────────────┤
│ CATEGORIA SUBTIPO (es: Tempio Zen)   │ ← Cosa ti aspetta
│                                      │
│ 📝 Descrizione breve SE ESISTE       │ ← Contesto
├──────────────────────────────────────┤
│ 🌾 GLUTEN-FREE: Confermato da...     │ ← Visibile se rilevante
│ OR: Nessun dato, chiedi al locale    │
├──────────────────────────────────────┤
│ 📋 INFO PRATICA:                     │
│   🕐 Orari: ...                      │
│   🎟️ Ingresso: € X o gratis         │
│   ⏱️ Tempo consigliato: 1h30m         │
│   📍 Indirizzo: ...                  │
├──────────────────────────────────────┤
│ 📞 CONTATTI:                         │
│   🌐 Sito   📱 Telefono   ➜ Maps     │
├──────────────────────────────────────┤
│ ⭐ IL TUO VOTO:  ☆ ☆ ☆ ☆ ☆          │
├──────────────────────────────────────┤
│ 📅 AZIONI:                           │
│ [GRANDE] Aggiungi a Giorno X         │ ← CTA principale (colore warm)
│ [piccolo] Salva      [piccolo] Share  │
│ [piccolo] Mappa      [piccolo] Chiama │
├──────────────────────────────────────┤
│ 📝 NOTE PERSONALI (collassibile)     │
│    [Es: Prenotare 2gg prima]         │
└──────────────────────────────────────┘
```

**Cosa togliere/nascondere**:
- Sezioni vuote (descrizione se non esiste)
- "Categoria selector" (matita) → sposta in ⚙️ menu
- Duplicazioni di indirizzo
- Info non essenziali per decisione rapida (es: attributi restaurant troppo specifici)

**Cosa evidenziare**:
- "Aperto adesso?" (traffic light verde/rosso)
- "A che orario gioca bene?" (se rilevante)
- Distanza da te ORA
- GF status (SEMPRE, visibile, affidabile)

**Code**: Riordinare sections array in poiDetailHTML, rimuovere componenti non essenziali

---

#### 1.4 Filtri travel-specific rapidi (IMPORTANTE)
**Dove**: Sotto il campo ricerca mappa, 6-8 chip filtrabili

```
🏪 Tutto | 🌾 GF Sicuro | 🆓 Gratis | 📍 Vicino | ⭐ Consigliato |
🌧️ Pioggia | 🍜 Food | 👨‍👩‍👧‍👦 Famiglia
```

**Comportamento**:
- Tap chip → attiva filtro
- Chip ha colore highlight se attivo
- I marker sulla mappa si filtrano in tempo reale
- Combinabili (es: GF Sicuro + Pioggia + Gratis)

**Backend Logic**:
```javascript
const TRAVEL_FILTERS = {
  gf_safe: (poi) => poi.gf_status === 'confirmed',
  free: (poi) => poi.paid === false,
  nearby: (poi) => poi.distance_m < 1000, // entro 1km
  rainy: (poi) => poi.indoor === true,
  food: (poi) => FOOD_TYPES.includes(poi.cat),
  family: (poi) => poi.family_friendly === true,
  suggested: (poi) => state.tripProfile.interests.includes(poi.cat),
};
```

**Code**: Aggiungere chip UI, aggiungere filterActive state, aggiungere logica filtri a marker rendering

---

#### 1.5 Itinerario minimale ma modificabile (CRITICO)
**Schermata**:
```
📅 ITINERARIO GIAPPONE 2027 (8 giorni)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GIORNO 1 - Lunedì 3 Maggio | Budget: €45 / €50
[+] Aggiungi POI

  ☰ Tempio Shinto Famoso
    ├─ Orario: 10:00
    ├─ 30 min
    ├─ 🌾 GF: Sì
    ├─ Note: Voto: ⭐⭐⭐⭐
    └─ [⋮] Opzioni (modifica, sposta, cancella)

  ☰ Ramen Shop XYZ
    ├─ Orario: 13:00
    ├─ 45 min + 15 min attesa
    ├─ 🌾 GF: Probabile
    ├─ Budget: €12
    ├─ Note: "Coda lunga a pranzo, evitare 12-13"
    └─ [⋮] Opzioni

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GIORNO 2 - Martedì 4 Maggio | Budget: €0 / €50
[+] Aggiungi POI

(Nessun POI ancora)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Interazioni**:
- Tap [+] → apri mappa, seleziona POI, scegli orario, salva
- Drag POI verticalmente → sposta tra giorni (se tempo lo permette)
- Tap [⋮] → modal con: modifica orario, modifica note, elimina, vota (gruppo)
- Budget aggiorna automaticamente da POI.cost

**Code**: 
- Nuova struttura `state.itinerary = { [day]: [{ poi_id, time, notes, status }] }`
- Nuovo component ItineraryDay (riutilizzabile)
- Event listeners per drag, tap menu, aggiungi POI

---

### **FASE 2: Offline + Affidabilità (2-3 giorni)**

#### 2.1 Offline support concreto
**Cosa sincronizzare**:
- POI già salvati/preferiti (metadati completi)
- Itinerario completo (non richiede rete per vederlo)
- Note personali su POI
- Indirizzo e telefono POI (per chiamate/maps)
- GF guide salvata

**Cosa NON offline**:
- Ricerca nuovi POI (richiede rete)
- Rating/foto aggiornati in tempo reale
- Condivisione gruppo live

**Implementazione**:
- Service Worker + IndexedDB
- Sync button in ⚙️ menu: "Salva per offline"
- Badge visivo: "📡 Connesso" vs "📴 Offline mode"
- Se offline: disabilita ricerca, mostra POI salvati

---

#### 2.2 Personalizzazione persistente
**Profilo viaggio** (salva in localStorage):
```javascript
state.tripProfile = {
  name: "Giappone 2027",
  startDate: "2027-05-03",
  endDate: "2027-05-11",
  days: 8,
  groupSize: 3,
  interests: ["cultura", "food", "relax"],
  dietaryRestrictions: ["gluten-free"],
  budget_daily: 50,
  budget_total: 400,
  pace: "moderate", // slow, moderate, fast
  must_see: ["Kyoto", "Tokyo"],
  to_avoid: ["shopping", "nightlife"],
}
```

---

### **FASE 3: Polish e Coerenza (2 giorni)**

#### 3.1 Empty/Loading/Error states
**Empty**: 
```
┌────────────────────────────────────┐
│                                    │
│       📍 Nessun POI trovato        │
│                                    │
│   Prova a:                         │
│   • Cambiare filtri                │
│   • Allargare ricerca geografica   │
│   • Aggiungere manualmente da mappa│
│                                    │
│     [Apri mappa]                   │
│                                    │
└────────────────────────────────────┘
```

**Loading**:
```
┌────────────────────────────────────┐
│                                    │
│          📡 Caricamento...         │
│                                    │
│         ⟳ (spinner sottile)        │
│                                    │
│   (Puoi usare POI offline salvati) │
│                                    │
└────────────────────────────────────┘
```

**Error**:
```
┌────────────────────────────────────┐
│                                    │
│    ⚠️ Errore connessione           │
│                                    │
│  Non riesco a caricare POI nuovi.  │
│  Sto usando i dati offline salvati.│
│                                    │
│  [Riprova]  [Vai offline mode]     │
│                                    │
└────────────────────────────────────┘
```

#### 3.2 Dark mode consistency
- **Background**: Unified #1a1f2e (dark blue base)
- **Surface**: Consistent rgba(255,255,255,0.04) per card/input
- **Text primary**: rgba(255,255,255,0.9) sempre
- **Text secondary**: rgba(255,255,255,0.65) sempre
- **Accent warm**: #FF6B35 per CTA
- **Accent success**: #4ade80 per GF safe
- **Accent warn**: #fbbf24 per GF probable
- **Accent soft**: rgba(255,255,255,0.025) per unknown

---

## PARTE 3: CHECKLIST IMPLEMENTAZIONE

### Riquadro A: Onboarding
- [ ] Nuova route onboarding (splash screen)
- [ ] Form campi: viaggio, giorni, interessi, dieta, budget
- [ ] Salva tripProfile in state + localStorage
- [ ] Primo accesso → onboarding, accessi successivi → home

### Riquadro B: Struttura tab
- [ ] Redesign bottom nav (4 tab principali)
- [ ] Mappa: aggiungere filtri chip
- [ ] Itinerario: nuova view con accordion giorni
- [ ] GF Guide: versione filtrata della mappa
- [ ] Menu ⚙️: drawer con settings

### Riquadro C: POI Detail
- [ ] Riordinare sezioni (foto → titolo → meta → descrizione → GF → info → azioni)
- [ ] Nascondere sezioni vuote
- [ ] CTA principale: "Aggiungi a giorno X" con selezione giorno
- [ ] CTA secondarie piccole: salva, mappa, chiama

### Riquadro D: Filtri
- [ ] 6-8 chip filtri: GF Safe, Gratis, Vicino, Rainy, Food, Family, Suggested
- [ ] Logica filtro combinabile
- [ ] Marker mappa si filtrano in tempo reale

### Riquadro E: Itinerario
- [ ] Nuova struttura dati itinerary
- [ ] View con accordion giorni
- [ ] Aggiungi POI da mappa
- [ ] Modifica orario, note, elimina
- [ ] Budget summary per giorno

### Riquadro F: Offline
- [ ] Service Worker base
- [ ] Sync button in menu
- [ ] Badge online/offline
- [ ] Disabilita ricerca in offline mode

### Riquadro G: Empty/Loading/Error
- [ ] 3 stati UI per ogni schermata principale
- [ ] Consistent messaging

### Riquadro H: Dark mode
- [ ] Audit colori vs spec
- [ ] Unify superfici (card, input, button)
- [ ] Contrasto testo verificato (WCAG AA)

---

## PARTE 4: SCHERMATE NUOVE DA AGGIUNGERE

1. **Splash Onboarding** (3-5 pagine form)
2. **Itinerary View** (redesign completo)
3. **GF Guide** (lista filtrata POI GF con contatti)
4. **Settings/Menu** (gear icon, drawer)
5. **POI Detail Modal Redesigned** (ordine info ottimale)

---

## PARTE 5: FOCUS SU USABILITÀ MOBILE REALE

### Durante il viaggio (situazione peggiore):
- ✅ Tutto offline disponibile (itinerario, indirizzi, contact)
- ✅ Una sola CTA grande per azione principale
- ✅ Tap target >= 44px (non confondere utente in fretta)
- ✅ Font leggibile al sole (contrasto alto)
- ✅ Niente micro-interazioni inutili (velocità al primo)
- ✅ Orari e indirizzi sempre visibili e copiabili
- ✅ Mappe integrate con un tap "come arrivo qui?"
- ✅ GF info SEMPRE accanto a POI food

### Durante la pianificazione (a casa):
- ✅ Drag-drop intuitivo (riordina itinerario)
- ✅ Filtri rapidi (non 5 form da compilare)
- ✅ Voting gruppo visibile (chi vuole cosa?)
- ✅ Budget auto-calcolato (non manuale)

---

## PARTE 6: PRIORITY ORDER

### MUST (Blocca MVP):
1. Onboarding (1 giorno)
2. Redesign tab structure (1 giorno)
3. POI detail reordering (half day)
4. Itinerary basic view + modifica (1 giorno)

### SHOULD (Rende davvero usabile):
5. Filtri travel-specific (half day)
6. Offline support (1 giorno)
7. Empty/Loading/Error states (half day)
8. Dark mode consistency (1 day)

### NICE (Ronda di polish):
9. Budget planner leggero
10. Statistiche viaggio
11. Weather integration
12. Sharing gruppo

---

## PARTE 7: SUCCESS CRITERIA

✅ **Usability test**: Utente nuovo arriva, fa onboarding, costruisce itinerario 3 giorni, aggiunge filtri GF, vede risultati in < 5 min

✅ **Mobile**: Tutto è tap target >= 44px, niente scroll infinito fastidioso, CTA principale è ovvia

✅ **Offline**: Chiudi connessione, itinerario + GF guide + indirizzi visibili ancora

✅ **Visivo**: Non sembra beta, colori coerenti, contrasto sufficiente al sole

✅ **Decisione rapida**: Utente vede POI, sa subito "sì/no/forse", non ha 10 click per decidere

---

**Nota finale**: Questo piano NON include feature estetiche o "fuffa". Ogni elemento serve a una situazione reale: esplorare POI, costruire itinerario, trovare gluten-free, decidere rapido, usare offline durante viaggio.
