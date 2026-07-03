# 🏗️ ARCHITETTURA — Giappone 2027

**Guida tecnica per navigare e estendere il codebase**

---

## 📐 LAYER STACK

```
┌─────────────────────────────────────────────────────┐
│                   UI/PRESENTATION LAYER              │
│  (HTML rendering, event handlers, animations)       │
│  Files: /js/itinerary-unified.js, /index.html      │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                │
│  (State management, data operations, validation)    │
│  Files: /js/itinerary.js, /index.html              │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                   DATA LAYER                         │
│  (state object in window, localStorage)             │
│  Structure: state.itineraryByDay, state.tripProfile│
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                  STYLING LAYER                       │
│  (CSS animations, gradients, responsive)            │
│  Files: /y2k-override.css, inline styles            │
└─────────────────────────────────────────────────────┘
```

---

## 📁 FILES STRUCTURE

```
/Giappone-2027-main-2/
├── index.html                    ← MAIN APPLICATION FILE
│   ├── Wizard implementation (lines 6900-7500)
│   ├── Map click handlers (lines 5872-5920)
│   ├── openPOI() function (lines 6882-6900)
│   ├── renderMarkers() function (lines 5383-5470)
│   └── Global event listeners
│
├── js/
│   ├── itinerary.js              ← DATA STRUCTURE & OPERATIONS
│   │   ├── state.itineraryByDay structure
│   │   ├── addPOIToDay()
│   │   ├── removePOI()
│   │   ├── moveToDay()
│   │   ├── updateTime/Duration/Cost/Notes()
│   │   └── getDayDuration()
│   │
│   └── itinerary-unified.js      ← UI RENDERING & INTERACTIONS
│       ├── renderItineraryUnified()
│       ├── Card POI rendering (3-row layout)
│       ├── showItineraryPOIMenu()
│       ├── setupAccordionAndDragDrop()
│       └── Event delegation handlers
│
├── y2k-override.css              ← STYLES & ANIMATIONS
│   ├── Y2K window transitions (optimized)
│   ├── Sheet open/close animations
│   └── POI card styles
│
└── STATUS.md & ARCHITECTURE.md   ← DOCUMENTATION
```

---

## 🔄 DATA FLOW DIAGRAM

### **From Marker Click to Itinerary Display**

```
┌─ MAP LAYER ──────────────────────────────────────────┐
│ [Click marker] → Feature with id, name, lat, lng    │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ HANDLER LAYER ──────────────────────────────────────┐
│ map.on('singleclick') → {                            │
│   id = feature.get('id')                             │
│   type = feature.get('type')                         │
│   openPOI(id)                                        │
│ }                                                    │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ LOOKUP LAYER ───────────────────────────────────────┐
│ openPOI(id) → {                                      │
│   p = getCachedAllPOIs().find(x => x.id === id)    │
│   ├─ Cache always fresh ✓                           │
│   └─ Returns POI object with name, lat, lng         │
│ }                                                    │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ DETAIL MODAL LAYER ──────────────────────────────────┐
│ window.openSheet(p.name, htmlContent)               │
│ ├─ Shows POI details                                 │
│ └─ Button: "[+] Aggiungi POI a questo giorno"      │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ WIZARD LAYER ───────────────────────────────────────┐
│ 4-step multi-step form:                             │
│ 1. Select day → wizardState.selectedDay             │
│ 2. Pick time → wizardState.selectedTime             │
│ 3. Duration/cost/notes → wizardState.duration/...   │
│ 4. Review → Confirm button                          │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ SAVE LAYER ──────────────────────────────────────────┐
│ addPOIToDay(poiId, poiName, dayIndex, time, ...) {│
│   state.itineraryByDay[dayIndex].push({            │
│     poi_id: poiId,                                  │
│     poi_name: poiName,                              │
│     time: time,                                     │
│     duration: duration,                             │
│     cost: cost,                                     │
│     notes: notes,                                   │
│     status: "proposed"                              │
│   })                                                │
│   saveState()                                       │
│ }                                                   │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ RENDER LAYER ────────────────────────────────────────┐
│ renderItineraryUnified() → {                        │
│   for each day:                                     │
│     for each POI in state.itineraryByDay[day]:      │
│       render 3-row card:                            │
│         ROW 1: [number] [name] [menu]               │
│         ROW 2: [time] [duration] [cost]             │
│         ROW 3: [notes]                              │
│ }                                                   │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ INTERACTION LAYER ───────────────────────────────────┐
│ Event delegation listeners:                         │
│ • .itinerary-menu-btn click → showItineraryPOIMenu()│
│ • .itinerary-add-btn click → toast message          │
│ • .itinerary-day-header click → toggle accordion    │
│ • drag-drop POI → moveToDay()                       │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ EDIT LAYER ──────────────────────────────────────────┐
│ showItineraryPOIMenu(poiId) → {                     │
│   Find POI in itineraryByDay                        │
│   Open modal with:                                  │
│     - Time input                                    │
│     - Duration input                                │
│     - Cost input                                    │
│     - Notes textarea                                │
│     - Move to day buttons                           │
│     - Save button → updateTime/Duration/Cost/Notes()│
│     - Delete button → removePOI()                   │
│ }                                                   │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌─ STATE PERSIST ───────────────────────────────────────┐
│ saveState() → localStorage update                   │
│ renderItineraryUnified() → UI reflects changes      │
└───────────────────────────────────────────────────────┘
```

---

## 🔑 KEY FUNCTIONS

### **Rendering Functions**

| Function | File | Purpose | Entry Point |
|----------|------|---------|------------|
| `renderMarkers()` | index.html L5383 | Draw markers on map | `map.on('sourcechanged')` |
| `openPOI(id)` | index.html L6882 | Show POI details | Map click handler |
| `renderItineraryUnified()` | itinerary-unified.js L7 | Render itinerary tab | Called after POI added |
| `showItineraryPOIMenu(poiId)` | itinerary-unified.js L620 | Edit POI modal | Menu button click |

### **Data Manipulation Functions**

| Function | File | Purpose |
|----------|------|---------|
| `addPOIToDay(poiId, poiName, dayIndex, time, duration, notes, cost)` | itinerary.js L44 | Add POI to day |
| `removePOI(poiId)` | itinerary.js L81 | Remove POI from itinerary |
| `moveToDay(poiId, toDayIndex)` | itinerary.js L175 | Move POI to another day |
| `updateTime(poiId, newTime)` | itinerary.js L103 | Update POI time |
| `updateDuration(poiId, duration)` | itinerary.js L139 | Update POI duration |
| `updateCost(poiId, cost)` | itinerary.js L157 | Update POI cost |
| `updateNotes(poiId, notes)` | itinerary.js L121 | Update POI notes |
| `getDayDuration(dayIndex)` | itinerary.js L216 | Calculate day total duration |

### **Cache Functions**

| Function | File | Purpose |
|----------|------|---------|
| `getCachedAllPOIs()` | index.html L8002 | Get cached POI list (fresh) |
| `invalidate cache` | index.html L5386 | Clear cache before render |

---

## 🎯 EXTENSION POINTS

### **To Add a New Feature:**

#### **1. Adding a New POI Field**

**File: `/js/itinerary.js`**
```javascript
// Add to entry structure (line ~61-69)
const entry = {
  poi_id: poiId,
  poi_name: poiName,
  time: time,
  duration: duration,
  cost: cost,
  notes: notes,
  NEW_FIELD: value,  // ← Add here
  status: "proposed"
};
```

**File: `/js/itinerary-unified.js`**
```javascript
// Add to card rendering (line ~52-94)
const newFieldDisplay = entry.NEW_FIELD || 'default';
// Add to HTML template
${newFieldDisplay}
```

**File: `/js/itinerary.js`**
```javascript
// Add update function
updateNewField(poiId, newValue) {
  // Similar to updateTime, updateDuration, etc.
}
```

#### **2. Adding a New Event Handler**

**File: `/js/itinerary-unified.js`**
```javascript
// Add to setupGlobalEventDelegation() (line ~357)
sheetBody.addEventListener('click', (e) => {
  const btn = e.target.closest('.new-button-class');
  if (!btn) return;
  
  e.stopPropagation();
  const poiId = btn.dataset.poiId;
  // Handle action
});
```

#### **3. Adding Animation**

**File: `/y2k-override.css`**
```css
@keyframes newAnimation {
  from { /* start state */ }
  to { /* end state */ }
}

.element-to-animate {
  animation: newAnimation 0.3s ease-in-out;
  /* Use GPU-accelerated properties only:
     - transform
     - opacity
     Do NOT use:
     - width/height (causes reflow)
     - top/left/margin (causes reflow)
  */
}
```

---

## ⚙️ STATE MANAGEMENT

### **Current State Structure**

```javascript
window.state = {
  // User profile
  group: {
    roomId: "XXXXX",
    myName: "Alice",
    myAvatar: null
  },

  // Trip metadata
  tripProfile: {
    days: 8,
    budget_total: 500000,
    budget_daily: 62500
  },

  // Personal itinerary (by day)
  itineraryByDay: {
    0: [{ poi_id, poi_name, time, duration, cost, notes, status }, ...],
    1: [...],
    ...
  },

  // Shared itinerary
  itinerary: [{ id, name, city, type, lat, lng, notes }, ...],

  // Customizations
  userCategoryOverrides: { "poi_id": "new_category", ... },
  notes: { "poi_id": "user note", ... },
  savedPOIs: ["poi_id1", "poi_id2", ...],

  // Other
  activeCat: "all",
  onlyGF: false,
  onlyLocal: false,
  gpsEnabled: false,
  gpsCurrentLat: null,
  gpsCurrentLng: null
}
```

### **Persistence**

```javascript
// Save to localStorage
saveState() {
  localStorage.setItem('state', JSON.stringify(window.state));
}

// Load from localStorage
// Called on app init (happens automatically)
```

---

## 🐛 DEBUGGING

### **Enable Debug Mode**

```javascript
// In browser console
localStorage.debug = true;

// Add to any function
console.log('[FunctionName] Debug info:', variable);

// Check cache
console.log('Cache:', window.ITINERARY);
console.log('AllPOIs:', allPOIs());
console.log('ItineraryByDay:', window.state.itineraryByDay);
```

### **Common Issues**

| Issue | Debug | Fix |
|-------|-------|-----|
| POI not appearing | `console.log(getCachedAllPOIs())` | Invalidate cache in renderMarkers() |
| Menu not opening | Check DevTools Network tab | Verify event delegation attached |
| Animation jank | Perf DevTools recording | Use GPU props (transform/opacity only) |
| Layout broken | Inspect element styles | Check flex properties, min-width:0 |
| Stale data | Check saveState() called | Call saveState() after data change |

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] All console.log() debug statements removed
- [ ] No localStorage.debug = true in code
- [ ] CSS animations use GPU properties only
- [ ] Cache invalidation working correctly
- [ ] Event delegation properly attached
- [ ] No memory leaks (check DevTools)
- [ ] Mobile responsive tested
- [ ] Drag-drop working on all browsers
- [ ] All update functions calling saveState()
- [ ] renderItineraryUnified() called after all data changes

---

## 📚 NEXT FEATURES TO BUILD

### **PARTE 2 — Integrazione Dati Reali POI**
```
Location: /index.html (lines ~12270)
Task: Load real POI data from Google Places API
Files to modify:
  - index.html (API calls)
  - js/itinerary.js (normalize data structure)
  - js/itinerary-unified.js (render real data)
```

### **PARTE 3 — Calcolo Tratte tra POI Consecutivi**
```
Task: Calculate distance/duration between POIs
Files to create:
  - js/routing.js (Google Maps Directions API)
Files to modify:
  - index.html (call routing)
  - js/itinerary-unified.js (display routes)
```

### **PARTE 4 — Budget Dinamico Avanzato**
```
Task: Real-time budget tracking per giorno
Files to modify:
  - js/itinerary.js (add budget calculations)
  - js/itinerary-unified.js (show budget progress bars)
```

---

**This is the living documentation. Update as you add features.** 📖
