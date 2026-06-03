# PARTE 1 — COMPLETAMENTO WIZARD 'AGGIUNGI ALL'ITINERARIO'

**Status**: ✅ IMPLEMENTATO  
**Data**: 2026-05-15  
**Versione**: v1.0 (Multi-step completo)

---

## 🎯 Obiettivo
Trasformare il wizard semplice "seleziona giorno + orario 10:00 fisso" in un flow completo e production-ready che raccoglie:
- **Giorno** (grid selection)
- **Orario** (time picker HTML5, non hardcoded)
- **Note personalizzate** (optional textarea)
- **Costo del POI** (optional number input)
- **Durata prevista** (optional, con preset rapidi + manual input)
- **Riepilogo finale** prima del salvataggio

---

## 📝 Modifiche Apportate

### 1. **js/itinerary.js** — Potenziamento sistema dati

#### Modifica: `addPOIToDay()`
**Prima:**
```javascript
addPOIToDay(poiId, poiName, dayIndex, time = "10:00")
```

**Dopo:**
```javascript
addPOIToDay(poiId, poiName, dayIndex, time = "10:00", duration = 60, notes = "", cost = 0)
```

**Entry structure aggiornata:**
```javascript
{
  poi_id: poiId,
  poi_name: poiName,
  time: time,           // ← orario reale
  duration: duration,   // ← non più fisso a 60
  notes: notes,         // ← note personalizzate
  cost: cost,           // ← NUOVO: costo POI
  status: "proposed"
}
```

#### Nuove funzioni:
- `updateDuration(poiId, duration)` — Aggiorna durata POI
- `updateCost(poiId, cost)` — Aggiorna costo POI

---

### 2. **index.html** — Wizard multi-step completo

**Sostituzione:** Righe 6936-6980 (day selector semplice → wizard 4-step)

#### Flusso wizard:
1. **STEP 1: Selezione giorno** (grid 2x4)
   - Bottoni per ogni giorno disponibile
   - Feedback visuale su selezione

2. **STEP 2: Selezione orario** (HTML5 time input)
   - Time picker nativo
   - Anteprima giorno selezionato

3. **STEP 3: Dettagli aggiuntivi**
   - **Durata**: Preset rapidi (30/60/90/120/180 min) + input manuale
   - **Costo**: Number input opzionale (¥)
   - **Note**: Textarea opzionale per annotazioni personalizzate

4. **STEP 4: Riepilogo finale**
   - Anteprima completa di tutte le scelte
   - Dettagli formattati: data, orario, durata, costo, note
   - Bottone "Conferma" per salvare

#### Navigazione:
- **Avanti**: Procedi al prossimo step (disabilitato se step non completo)
- **Indietro**: Torna al step precedente (disponibile da step 2+)
- **Annulla**: Chiudi wizard senza salvare
- **Conferma**: Salva POI con tutti i dettagli (step 4)

#### Styling:
- Design coherente con tema dark-warm-glassmorphism
- Colori: 
  - Selezione: `rgba(255, 107, 53, ...)` (arancio)
  - Durata preset: `rgba(74,124,89,...)` (verde)
- Hover effects su tutti i button
- Max-height su step 3 per scroll su devices piccoli

---

### 3. **js/itinerary-unified.js** — Visualizzazione POI dettagliato

#### Modifica: POI list item rendering
**Prima:**
```html
⏰ ${entry.time}
```

**Dopo:**
```html
⏰ ${entry.time} · ⏱️ ${entry.duration}m ${entry.cost > 0 ? '· 💰 ¥' + entry.cost : ''}
${entry.notes ? '<div>📝 ${entry.notes}</div>' : ''}
```

**Visualizzazione:**
- Riga principale: nome POI + orario + durata + (costo se presente)
- Riga nota: (se presente) mostra note personalizzate con max-height 40px

#### Budget dinamico:
**Aggiunto calcolo automatico:**
- `totalCostSpent` — Somma di tutti i costi POI nell'itinerario
- `costByDay[dayIndex]` — Costo per giorno
- Progress bar visual: `width = (totalCostSpent/budget)*100%`
- Colori: verde se < budget, rosso se > budget

**Budget section aggiornato:**
```
Pianificato (totale): ¥${budget}
Speso (POI):          ¥${totalCostSpent}
Rimasto:              ¥${Math.max(0, budget - totalCostSpent)}
```

---

## 🧪 Test Obbligatori

### Test 1: Wizard flow completo
**Precondizioni:**
- App aperta, mappa visibile
- Almeno 1 POI disponibile

**Step:**
1. Clicca POI nella mappa
2. Nel detail modal, clicca "Aggiungi all'itinerario"
3. **Expect:** Sheet apre con Step 1 (day selector)

**Logs attesi:**
```
[WIZARD] opening multi-step wizard for POI: [nome POI]
[WIZARD] Day selected: [day number]
[WIZARD] Time selected: [HH:MM]
[WIZARD] Duration preset selected: [minutes]
[WIZARD] Duration set to: [minutes]
[WIZARD] Cost set to: [amount]
[WIZARD] Notes updated
[WIZARD] Confirming POI addition: {poiId, poiName, day, time, duration, notes, cost}
[WIZARD] POI successfully added and sheet closed
```

### Test 2: Selezione giorno
**Step:**
1. Wizard aperto (Step 1)
2. Clicca "Day 3"
3. **Expect:** Button evidenziato, wizard avanza a Step 2

**Logs attesi:**
```
[WIZARD] Day selected: 3
```

### Test 3: Selezione orario
**Step:**
1. Wizard a Step 2
2. Vedi time input con valore "10:00"
3. Cambia a "14:30"
4. Clicca Avanti
5. **Expect:** Step 3 apre, orario salvato

**Logs attesi:**
```
[WIZARD] Time selected: 14:30
```

### Test 4: Durata con preset
**Step:**
1. Wizard a Step 3
2. Clicca preset "90m"
3. **Expect:** Button evidenziato, duration impostata

**Logs attesi:**
```
[WIZARD] Duration preset selected: 90
```

### Test 5: Durata manuale
**Step:**
1. Wizard a Step 3
2. Seleziona preset
3. Modifica manualmente input a "120"
4. **Expect:** Duration aggiornata

**Logs attesi:**
```
[WIZARD] Duration set to: 120
```

### Test 6: Costo
**Step:**
1. Wizard a Step 3
2. Input cost: "25.50"
3. Clicca Avanti → Step 4
4. **Expect:** Costo visible in riepilogo

**Logs attesi:**
```
[WIZARD] Cost set to: 25.5
```

### Test 7: Note
**Step:**
1. Wizard a Step 3
2. Digita note: "Prenotare in anticipo"
3. **Expect:** Testo salvato

**Logs attesi:**
```
[WIZARD] Notes updated
```

### Test 8: Riepilogo finale
**Step:**
1. Wizard a Step 4
2. Verifica mostra: POI name, day, data, orario, durata, costo (se > 0), note (se presenti)
3. Clicca "Conferma"
4. **Expect:** Sheet chiude, POI aggiunto all'itinerario

**Logs attesi:**
```
[WIZARD] Confirming POI addition: {...}
[Itinerary] Added [poiName] to day [dayIndex] at [time] duration: [duration] min
```

### Test 9: Cancellazione
**Step:**
1. Wizard a qualsiasi step
2. Clicca "Annulla"
3. **Expect:** Sheet chiude senza salvare

**Logs attesi:**
```
[WIZARD] Wizard cancelled
```

### Test 10: Navigazione back
**Step:**
1. Wizard a Step 3
2. Clicca "Indietro"
3. **Expect:** Torna a Step 2, dati preservati
4. Clicca "Indietro" di nuovo
5. **Expect:** Torna a Step 1

### Test 11: Visualizzazione itinerario
**Step:**
1. Completa wizard e aggiungi POI
2. Apri tab "Itinerario"
3. **Expect:** POI visibile con:
   - Numero sequenza
   - Nome POI (nowrap)
   - Orario + Durata + Costo (se > 0)
   - Note (se presenti) in riga secondaria

### Test 12: Budget dinamico
**Step:**
1. Aggiungi POI con costo: ¥1500
2. Apri tab Itinerario
3. **Expect:** 
   - "Speso (POI): ¥1500"
   - Progress bar mostra % budget allocato
   - Se speso > budget: testo rosso (#ff6b6b)

---

## 📊 Dati di Input Test Consigliati

```javascript
// Test wizard completo
POI: "小海自動車修理工場" (ristorante esempio)
Day: 3
Time: 14:30
Duration: 90 minuti
Cost: ¥3500
Notes: "Prenotare 1 giorno prima, menù glutine-free disponibile"
```

---

## ✅ Checklist Verifica

- [ ] Wizard apre al click bottone "Aggiungi all'itinerario"
- [ ] Step 1: Day selection funziona, button feedback visuale
- [ ] Step 2: Time picker presenta valore attuale e consente modifica
- [ ] Step 3: Preset durata clickabili, input manuale accetta numeri
- [ ] Step 3: Costo input accetta decimali
- [ ] Step 3: Note textarea accetta testo multilinea
- [ ] Step 4: Riepilogo mostra tutti i dati formattati
- [ ] Step 4: Conferma salva POI con tutti i dettagli
- [ ] Bottone Annulla chiude wizard senza salvare
- [ ] Bottone Indietro funziona e preserva i dati
- [ ] Logs console presenti per ogni azione
- [ ] POI visibile in tab Itinerario con tutti i dettagli
- [ ] Budget calcolato correttamente (Speso, Rimasto)
- [ ] CSS styling coerente con design system

---

## 🚀 Prossimo Step

PARTE 2: Integrare dati reali POI
- Opening hours del POI
- Price level da Google Places
- Icone e categorie aggiornate
- Calcolo tratte tra POI consecutivi

---

## 📦 File Modificati

1. `/js/itinerary.js` — Nuove funzioni + parametri
2. `/index.html` — Multi-step wizard (righe 6936-7050 circa)
3. `/js/itinerary-unified.js` — Visualizzazione dettagli + budget dinamico

**Righe circa:** 150+ righe aggiunte/modificate  
**Complessità:** Media (event handling, state management, UI rendering)  
**Testing:** Richiesto test manuale completo

