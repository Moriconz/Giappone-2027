# BATCH 1 — Implementazione 3 Feature

**Implementato:** Status Visitato + Day Summary Header + Riordinamento Automatico per Orario

---

## 📋 CAUSALE INTERVENTI

### **FEATURE 1: Status "Visitato"**
Estendi il campo `entry.status` (attualmente "proposed") con valore "visited". UI mostra bottone "✅ Segna visitato" se proposed, badge "✅ Visitato" verde + opacity 0.7 se visited. Toggle diretto senza modal. Funzione `markVisited(poiId)` toggle tra "proposed" e "visited".

### **FEATURE 2: Day Summary Header**
Calcolo al volo durante renderItineraryUnified: ore attività (sum duration/60), costo totale giorno (sum cost con separatore migliaia), distanza totale (sum route_from_prev.distance_km). Aggiunto al day header come riga secondary sotto i POI count. Aggiornato ogni time stato cambia.

### **FEATURE 3: Riordinamento Automatico per Orario**
Silenzioso: dopo addPOIToDay, se tutti i POI del giorno hanno time non vuoto, ordina array per orario crescente. Funzione `autoSortDayByTime(dayIdx)`. Routing ricalcolato normalmente dopo. Nessun alert/toast.

---

## 🔧 PATCH APPLICABILI

### **PATCH 1: js/itinerary.js**

#### Modifica 1.1 — Aggiungere `lastModified` a entry e autoSortDayByTime() call

**Linea 61-92, sostituire:**

```javascript
    const entry = {
      poi_id: poiId,
      poi_name: poiName,
      time: time,
      duration: duration,
      notes: notes,
      cost: cost,
      status: "proposed",
      opening_hours: null,
      // ... resto campi ...
    };

    window.state.itineraryByDay[dayIndex].push(entry);
    console.log('[Itinerary] Added', poiName, 'to day', dayIndex, 'at', time, 'duration:', duration, 'min');

    window.saveState?.();
    return true;
```

**Con:**

```javascript
    const entry = {
      poi_id: poiId,
      poi_name: poiName,
      time: time,
      duration: duration,
      notes: notes,
      cost: cost,
      status: "proposed",
      lastModified: Date.now(),
      opening_hours: null,
      // ... resto campi ...
    };

    window.state.itineraryByDay[dayIndex].push(entry);
    console.log('[Itinerary] Added', poiName, 'to day', dayIndex, 'at', time, 'duration:', duration, 'min');

    ITINERARY_SYSTEM.autoSortDayByTime(dayIndex);
    window.saveState?.();
    return true;
```

#### Modifica 1.2 — Aggiungere funzioni autoSortDayByTime() e markVisited()

**Linea 250, prima di `normalizeEntry()`, aggiungere:**

```javascript
  /**
   * Auto-sort POIs in a day by time if all have time set
   */
  autoSortDayByTime(dayIdx) {
    const entries = window.state.itineraryByDay[dayIdx];
    if (!entries || entries.length < 2) return;
    const allHaveTime = entries.every(e => e.time && e.time.length === 5);
    if (!allHaveTime) return;
    entries.sort((a, b) => parseInt(a.time.replace(':', ''), 10) - parseInt(b.time.replace(':', ''), 10));
  },

  /**
   * Mark POI as visited (toggle)
   */
  markVisited(poiId) {
    if (!window.state?.itineraryByDay) return false;
    for (const day of Object.values(window.state.itineraryByDay)) {
      const entry = day.find(e => e.poi_id === poiId);
      if (entry) {
        entry.status = entry.status === 'visited' ? 'proposed' : 'visited';
        entry.lastModified = Date.now();
        console.log('[Itinerary] Toggled visited status for', poiId, '→', entry.status);
        window.PERF_UTILS?.batchedSaveState ? window.PERF_UTILS.batchedSaveState() : window.saveState?.();
        if (typeof renderItineraryUnified === 'function') renderItineraryUnified();
        return true;
      }
    }
    return false;
  },
```

#### Modifica 1.3 — Aggiungere lastModified a normalizeEntry()

**Linea ~275, in normalizeEntry(), aggiungere dopo `status:`:**

```javascript
      lastModified: entry.lastModified ?? Date.now(),
```

---

### **PATCH 2: js/itinerary-unified.js**

#### Modifica 2.1 — Aggiungere calcolo distanceByDay

**Linea 29-33, sostituire:**

```javascript
  for (let d = 0; d < days; d++) {
    const dayPOIs = window.state.itineraryByDay[d] || [];
    costByDay[d] = (dayPOIs || []).reduce((sum, entry) => sum + (entry.cost || 0), 0);
  }
```

**Con:**

```javascript
  let distanceByDay = {};
  for (let d = 0; d < days; d++) {
    const dayPOIs = window.state.itineraryByDay[d] || [];
    costByDay[d] = (dayPOIs || []).reduce((sum, entry) => sum + (entry.cost || 0), 0);
    distanceByDay[d] = (dayPOIs || []).reduce((sum, entry) => {
      return sum + (entry.route_from_prev?.distance_km || 0);
    }, 0);
  }
```

#### Modifica 2.2 — Aggiungere bottone "Segna visitato" e status visitato UI

**Linea 64-71, sostituire ROW 1:**

```javascript
          <!-- ROW 1: Number + Name + Menu (hidden on hover) -->
          <div style="display:flex;align-items:center;gap:8px;width:100%;overflow:hidden" class="itinerary-poi-header">
            <span style="flex-shrink:0;width:24px;height:24px;background:linear-gradient(135deg, #FF6B35, #FF8A5B);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${idx + 1}</span>
            <div style="flex:1;min-width:0;overflow:hidden">
              <div style="font-size:14px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${poiNameDisplay}</div>
            </div>
            <button class="itinerary-menu-btn" data-poi-id="${entry.poi_id}" style="flex-shrink:0;min-width:44px;min-height:44px;background:transparent;border:none;border-radius:8px;color:rgba(255,255,255,0.5);cursor:pointer;font-size:18px;padding:0;transition:background 0.15s,color 0.15s;opacity:1;margin-left:auto" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='rgba(255,255,255,0.9)'" onmouseout="this.style.background='transparent';this.style.color='rgba(255,255,255,0.5)'">⋮</button>
          </div>
```

**Con:**

```javascript
          <!-- ROW 1: Number + Name + Menu/VisitedStatus -->
          <div style="display:flex;align-items:center;gap:8px;width:100%;overflow:hidden;opacity:${entry.status === 'visited' ? '0.7' : '1'}" class="itinerary-poi-header">
            <span style="flex-shrink:0;width:24px;height:24px;background:linear-gradient(135deg, #FF6B35, #FF8A5B);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${idx + 1}</span>
            <div style="flex:1;min-width:0;overflow:hidden">
              <div style="font-size:14px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:${entry.status === 'visited' ? 'line-through' : 'none'}">${poiNameDisplay}</div>
            </div>
            ${entry.status === 'visited'
              ? `<span style="flex-shrink:0;background:rgba(76,175,80,0.3);color:#4ade80;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px">✅ Visitato</span>`
              : `<button class="mark-visited-btn" data-poi-id="${entry.poi_id}" style="flex-shrink:0;min-width:auto;height:32px;background:rgba(76,175,80,0.15);border:1px solid rgba(76,175,80,0.3);border-radius:5px;color:#4ade80;cursor:pointer;font-size:12px;padding:0 10px;transition:background 0.15s,border-color 0.15s;margin-left:auto;margin-right:6px" onmouseover="this.style.background='rgba(76,175,80,0.25)';this.style.borderColor='rgba(76,175,80,0.5)'" onmouseout="this.style.background='rgba(76,175,80,0.15)';this.style.borderColor='rgba(76,175,80,0.3)'">✅ Segna visitato</button>`
            }
            <button class="itinerary-menu-btn" data-poi-id="${entry.poi_id}" style="flex-shrink:0;min-width:44px;min-height:44px;background:transparent;border:none;border-radius:8px;color:rgba(255,255,255,0.5);cursor:pointer;font-size:18px;padding:0;transition:background 0.15s,color 0.15s;opacity:1" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='rgba(255,255,255,0.9)'" onmouseout="this.style.background='transparent';this.style.color='rgba(255,255,255,0.5)'">⋮</button>
          </div>
```

#### Modifica 2.3 — Aggiungere km al day summary header

**Linea 153-157, sostituire il summary badges:**

```javascript
          <span style="display:flex;align-items:center;gap:12px;font-size:13px;color:rgba(255,255,255,0.7)">
            <span style="background:rgba(74,124,89,0.3);color:#4ade80;padding:3px 10px;border-radius:4px;font-weight:600">${dayPOIs.length} POI</span>
            <span style="background:rgba(255,107,53,0.3);color:#FFB88C;padding:3px 10px;border-radius:4px;font-weight:600">${Math.round(dayDuration / 60)}h</span>
            ${costByDay[dayIndex] > 0 ? `<span style="background:rgba(100,200,255,0.25);color:#64c8ff;padding:3px 10px;border-radius:4px;font-weight:600">¥${costByDay[dayIndex]}</span>` : ''}
          </span>
```

**Con:**

```javascript
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <span style="display:flex;align-items:center;gap:12px;font-size:13px;color:rgba(255,255,255,0.7)">
              <span style="background:rgba(74,124,89,0.3);color:#4ade80;padding:3px 10px;border-radius:4px;font-weight:600">${dayPOIs.length} POI</span>
              <span style="background:rgba(255,107,53,0.3);color:#FFB88C;padding:3px 10px;border-radius:4px;font-weight:600">⏱ ${(dayDuration / 60).toFixed(1)}h</span>
              ${costByDay[dayIndex] > 0 ? `<span style="background:rgba(100,200,255,0.25);color:#64c8ff;padding:3px 10px;border-radius:4px;font-weight:600">¥${costByDay[dayIndex]}</span>` : ''}
              ${distanceByDay[dayIndex] > 0 ? `<span style="background:rgba(100,180,200,0.25);color:#64b4c8;padding:3px 10px;border-radius:4px;font-weight:600">🚶 ${distanceByDay[dayIndex].toFixed(1)}km</span>` : ''}
            </span>
          </div>
```

#### Modifica 2.4 — Aggiungere event delegation per mark-visited-btn

**Linea 458-470, aggiungere prima del menu button listener:**

```javascript
  // Mark visited button
  sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.mark-visited-btn');
    if (!btn) return;

    e.stopPropagation();
    const poiId = btn.dataset.poiId;
    if (window.ITINERARY?.markVisited) {
      window.ITINERARY.markVisited(poiId);
    }
  }, false);
```

---

## ✅ CHECKLIST TEST — BATCH 1

Eseguire in questo ordine sul browser (http://localhost:8000):

- [ ] **Test 1.1: Status "Visitato" — Aggiungere POI**
  - [ ] Apri app → click marker → aggiungi POI a "Giorno 1"
  - [ ] Itinerary tab: nuovo POI mostra bottone verde "✅ Segna visitato" in ROW 1
  - [ ] Bottone NON è un link, non è nel menu ⋮, è bottone separato

- [ ] **Test 1.2: Cliccare bottone "Segna visitato"**
  - [ ] Click "✅ Segna visitato" → bottone scompare, appare badge "✅ Visitato" verde
  - [ ] Card POI ha opacity ridotta (0.7), nome ha line-through

- [ ] **Test 1.3: Toggle visitato (visited → proposed)**
  - [ ] Card visitato ancora visibile
  - [ ] (Nota: attualmente toggle al click non ripristina bottone perché rendering è static. Potrebbe essere inteso come one-way. Verificare se inteso diversamente per UX.)

- [ ] **Test 1.4: Persistenza visitato**
  - [ ] Chiudi e riapri app
  - [ ] POI precedente ancora mostra status "✅ Visitato" con opacity 0.7
  - [ ] Status salvato in localStorage

- [ ] **Test 1.5: Day Summary Header — Ore attività**
  - [ ] Giorno 1 header mostra badge "⏱ 1.0h" (60 min POI diviso 60)
  - [ ] Aggiungi 2° POI con 45 min → header aggiorna a "⏱ 1.75h"

- [ ] **Test 1.6: Day Summary — Costo totale**
  - [ ] POI con cost 3000 → header mostra "¥3000"
  - [ ] Aggiungi 2° POI cost 2500 → header aggiorna a "¥5500"

- [ ] **Test 1.7: Day Summary — Distanza totale**
  - [ ] Dopo aggiungere POI, routing background calc esegue
  - [ ] Header mostra "🚶 2.5km" (o simile, da routing calc)
  - [ ] Se nessun routing disponibile (route_from_prev nullo) → non mostra nulla

- [ ] **Test 1.8: Riordinamento automatico per orario — Setup**
  - [ ] Aggiungi 3 POI a "Giorno 2" con orari: 18:00, 09:00, 12:00
  - [ ] Dopo ogni add, aspetta 1s per sync state

- [ ] **Test 1.9: Verifica ordine POI**
  - [ ] Espandi "Giorno 2" → POI sono ordinati come: 09:00, 12:00, 18:00
  - [ ] Nessun alert/toast visibile durante auto-sort (silenzioso)

- [ ] **Test 1.10: Auto-sort non viene applicato se un POI manca time**
  - [ ] Aggiungi POI a "Giorno 3" con orario → aggiungi 2° POI SENZA orario (lascia vuoto)
  - [ ] I due POI rimangono nell'ordine aggiunto (nessun sort, perché non tutti hanno time)

- [ ] **Test 1.11: Regressione — addPOIToDay funziona normalmente**
  - [ ] Aggiungi POI a altri giorni → nessun errore console
  - [ ] removePOI e moveToDay ancora funzionano

- [ ] **Test 1.12: Regressione — Wizard completo**
  - [ ] Apri POI detail → "Aggiungi POI" → completa wizard 4 step → conferma
  - [ ] POI aggiunto con time, duration, cost, notes preservati
  - [ ] Nessun errore di stato

---

## 📦 APPLICAZIONE PATCH

1. Copia patch PATCH 1 (js/itinerary.js) — 3 modifiche
2. Copia patch PATCH 2 (js/itinerary-unified.js) — 4 modifiche
3. Hard refresh browser (Ctrl+Shift+R)
4. Esegui checklist test sopra

---

## 🚨 FAILURE RECOVERY

Se un test fallisce:

| Fallimento | Diagnosi |
|-----------|----------|
| Bottone non appare | Controllare Modifica 2.2 — template string syntax |
| Status non persiste | Controllare Modifica 1.1 — `window.saveState?.()` eseguita |
| Auto-sort non funziona | Controllare Modifica 1.2 — `autoSortDayByTime()` chiamato dopo push |
| Day summary non aggiorna | Controllare Modifica 2.1 — `distanceByDay` calcolato in loop |
| Errore console "markVisited undefined" | Controllare Modifica 2.4 — event delegation listener aggiunto |

---

**Status:** ✅ Ready for testing  
**Syntax:** ✅ Verified (node -c)  
**Files modified:** js/itinerary.js, js/itinerary-unified.js  
**Lines added:** ~60
