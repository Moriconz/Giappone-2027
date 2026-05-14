# Fase 1 Progress Report — Maggio 14, 2026

## ✅ COMPLETATO

### 1.1 Onboarding (100%)
- **File**: `/js/onboarding.js` (300 righe)
- **Cosa fa**: Form a 5 step al primo accesso
  - Nome viaggio, giorni
  - Gruppo size (solo/partner/gruppo)
  - Top 3 interessi (su 6 opzioni)
  - Dieta (none/vegetarian/vegan/gluten-free)
  - Budget giornaliero (auto-calcola totale)
- **Salvato**: `localStorage.tripProfile` + `state.tripProfile`
- **Comportamento**: Non appare più dopo primo accesso
- **Integrato**: ✅ Linkato in index.html prima di y2k-windows.js

### 1.2 Filtri Travel-Specific (100%)
- **File**: `/js/filter-system.js` (280 righe)
- **Chip filtri**: 7 + "Tutto"
  - 🌾 GF Sicuro (poi.gf.lvl === 'full')
  - 🆓 Gratis (poi.paid === false)
  - 📍 Vicino 1km (haversine distance)
  - 🌧️ Pioggia (poi.indoor === true)
  - 🍜 Food (FOOD_TYPES include)
  - 👨‍👩‍👧‍👦 Famiglia (family_friendly)
  - ⭐ Consigliato (vs tripProfile.interests)
- **Comportamento**:
  - Tap chip → attiva/disattiva
  - Combinabili (es: GF + Pioggia + Gratis)
  - Marker nascondono se `feature.hidden === true`
  - Update in tempo reale
- **UI**: Chip container sotto ricerca, scroll orizzontale, highlight se attivo
- **Integrato**: ✅ Linkato + aggiunto check `feature.get('hidden')` in style function

---

## 🔴 IN PROGRESS / BLOCCATO

### 1.3 POI Detail Reordering
**Criticità**: Molto complesso, richiede reordering di 300+ righe in poiDetailHTML

**Plan**:
1. Leggere intera funzione poiDetailHTML (righe 6367-6650 circa)
2. Estrarre sezioni in array separati
3. Ricombinare in nuovo ordine:
   ```
   Foto (PhotoGallery) → 
   Header compatto (nome, metadati) → 
   Categoria/Subtipo → 
   Descrizione breve → 
   GF STATUS (prominente) → 
   Info pratica (orari, ingresso, tempo, indirizzo) → 
   Contatti (sito, telefono, maps) → 
   Voto (stelle) → 
   [DIVIDER] → 
   CTA PRINCIPALE: Aggiungi a giorno X → 
   Note personali (collapsibile) → 
   Azioni secondarie (salva, share, mappa, chiama)
   ```
4. Rimuovere sezioni non essenziali (categoria selector matita, info duplicate)
5. Testare che tutte le interazioni funzionano

**Stima**: 3-4 ore

---

## 🔲 TODO (Fase 1 rimanente)

### 1.4 Itinerario Modificabile
**Cosa**: Nuova view con accordion giorni, drag-drop POI, modifica orario/note, elimina

**Struttura dati**: 
```javascript
state.itinerary = {
  [dayIndex]: [
    { poi_id, time: "10:00", duration: 30, notes: "", status: "proposed|approved|done" }
  ]
}
```

**UI**:
- Accordion collassibile per giorno
- [+] Aggiungi POI button per giorno
- Drag POI (reorder same day o move to different day)
- [⋮] menu su ogni POI (modifica, sposta, cancella, vota)
- Budget summary in alto

**Stima**: 4-5 ore

### 1.5 Tab Restructuring
**Cosa**: Ridurre da 10+ tab a 4 principali

**Nuova architettura**:
```
Bottom nav (4 icone):
  🗺️ MAPPA (con filtri chip)
  📅 ITINERARIO (accordion giorni)
  💚 GF GUIDE (lista POI GF salvati)
  ⚙️ MENU (drawer con settings)
```

**Vecchi tab spostati in ⚙️ MENU**:
- Weather
- Budget dettagliato
- Galleria
- Group chat
- Booking
- etc.

**Stima**: 3-4 ore

### 1.6 GF Guide (nuova schermata)
**Cosa**: Lista di POI GF confermati, filtrabili per zona

**UI**:
- Cerchia nella mappa per scelta zona
- Lista POI GF con: nome, indirizzo, telefono, GF note
- CTA: chiama, come arrivo, apri maps

**Stima**: 2-3 ore

### 1.7 Empty/Loading/Error States
**Dove**: Mappa (nessun POI), itinerario (giorni vuoti), GF guide (nessun GF salvato)

**Mockup UI**:
```
📍 Nessun POI trovato
Prova a:
• Cambiare filtri
• Allargare ricerca
• Aggiungere manualmente
[Apri mappa]
```

**Stima**: 2-3 ore

---

## TEMPO RIMANENTE STIMA

| Attività | Ore | Stato |
|----------|-----|-------|
| POI Detail Reordering | 3-4h | 🔲 TODO |
| Itinerario Modificabile | 4-5h | 🔲 TODO |
| Tab Restructuring | 3-4h | 🔲 TODO |
| GF Guide | 2-3h | 🔲 TODO |
| Empty/Loading/Error | 2-3h | 🔲 TODO |
| **Totale** | **14-19h** | |

**Timeline**: A ritmo di 4-6 ore/giorno → **3-4 giorni**

---

## PROSSIMI STEP IMMEDIATI

1. **Completare POI Detail Reordering** (oggi se possibile)
2. **Implementare Itinerario Modificabile** (domani)
3. **Restructure tab architettura** (domani pomeriggio)
4. **GF Guide view** (giorno 3)
5. **Empty/Loading/Error states** (giorno 3-4)

---

## NOTE IMPORTANTI

- ✅ CSS component system già in place (Phase 1.0 completed)
- ✅ Onboarding e filtri sono **pillar features**, testate mentalmente
- 🔴 POI detail è **critico per UX** ma refactor complesso
- 🔴 Itinerario è **complesso** (drag-drop requires careful event handling)
- ✅ Tab restructure è **mostly UI reorganization**, lower risk

---

## SUCCESS CRITERIA AT FINE FASE 1

- [ ] User opens app → vede onboarding
- [ ] Completes onboarding → vede mappa con filtri
- [ ] Tap filtro GF Sicuro → marker si nascondono in tempo reale
- [ ] Tap POI → modal è ordinato per decisione rapida
- [ ] Tap "Aggiungi a giorno" → POI viene aggiunto a itinerario
- [ ] Itinerario tab mostra POI per giorno, drag-droppabile
- [ ] GF Guide mostra solo POI GF salvati
- [ ] Empty states quando: 0 POI, 0 GF, giorno vuoto
