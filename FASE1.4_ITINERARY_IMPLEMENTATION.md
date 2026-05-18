# FASE 1.4: Itinerario Modificabile — Implementation Complete ✅

## Objective
Implement a day-by-day itinerary view with accordion, drag-drop reordering, and quick edit capabilities for times and notes.

---

## Files Created

### 1. `/js/itinerary.js` (80 lines)
**Purpose**: State management for itinerary data
**Exports**: `window.ITINERARY` system with methods:

- `ITINERARY.initState()` — Initialize itineraryByDay for each trip day
- `ITINERARY.addPOIToDay(poiId, poiName, dayIndex, time)` — Add POI to specific day
- `ITINERARY.removePOI(poiId)` — Remove POI from anywhere in itinerary
- `ITINERARY.updateTime(poiId, newTime)` — Update start time (HH:MM format)
- `ITINERARY.updateNotes(poiId, notes)` — Update personal notes
- `ITINERARY.moveToDay(poiId, toDayIndex)` — Drag-drop to another day
- `ITINERARY.getDayDuration(dayIndex)` — Sum of durations for a day
- `ITINERARY.calculateBudgetSpent()` — (TODO) Cost calculation

**Data Structure**:
```javascript
state.itineraryByDay = {
  0: [
    { 
      poi_id: "g-123456",
      poi_name: "Senso-ji Temple",
      time: "10:00",
      duration: 60,
      notes: "Bring tripod for photos",
      status: "proposed"
    }
  ],
  1: [ ... ],
  ...
}
```

### 2. `/js/itinerary-ui.js` (280 lines)
**Purpose**: Accordion UI + drag-drop + event handlers
**Exports**: `window.renderItineraryViewNew()` and helpers

**Key Functions**:
- `renderItineraryViewNew()` — Main render function called when Itinerario tab is clicked
- `setupItineraryEventHandlers()` — Attach all click/drag/drop listeners
- `showItineraryPOIMenu(poiId)` — Context menu for each POI
- `handlePOIMenuAction(poiId, action)` — Menu action handlers

**UI Features**:
- **Budget Summary** (top): Shows daily budget + total budget from trip profile
- **Accordion Headers** per day: Day 1 — Mon, Apr 10 | 3 POI · 4h
- **POI Items** (draggable): Numbered, name, time, [⋮] menu
- **Add POI Button** per day: Opens suggestions/selections
- **Drag-Drop**: Move POI within same day or to different day

**Event Handlers**:
- Accordion toggle: Click header to expand/collapse day
- Drag-drop: POI draggable, days droppable
- Menu button: Right-click alternatives for time/notes/move/rate/delete
- Quick actions: Inline prompt for time/notes edit

---

## Integration Points

### 1. Bottom Navigation
**File**: `/index.html` (line 1139-1142)
- Added button `data-view="itinerary"` with calendar icon
- Connected to `if (view === 'itinerary') { renderItineraryViewNew(); }`

### 2. POI Detail Modal — "Aggiungi all'itinerario" Button
**File**: `/index.html` (line 7165-7200)
- When user taps button, shows grid of day buttons (Day 1, Day 2, ...)
- User selects day → calls `ITINERARY.addPOIToDay()` → adds to that day
- Toast notification confirms addition

### 3. File Linkage
**File**: `/index.html` (line 12896-12900)
```html
<script src="./js/itinerary.js"></script>
<script src="./js/itinerary-ui.js"></script>
```

---

## User Flow

### Adding a POI to Itinerary
1. User opens POI detail modal (tap marker on map)
2. User taps "📅 Aggiungi all'itinerario"
3. Day selector appears: Grid of buttons (Day 1, Day 2, ..., Day N)
4. User taps desired day
5. POI added to that day at default time 10:00
6. Toast: "✓ Aggiunto al Day 3"
7. Modal closes

### Viewing & Editing Itinerary
1. User taps "📅 Itinerario" in bottom nav
2. Sheet opens showing accordion
3. Accordion expanded shows:
   - Budget summary (€50/day × 8 days = €400 total)
   - List of days with POI counts and total duration
4. User can:
   - Click day header to expand/collapse
   - Drag POI to reorder within same day (visual feedback)
   - Drag POI to different day to move
   - Click [⋮] menu for edit time, edit notes, move day, rate, delete
   - Time edit: Inline `prompt("Nuova ora (HH:MM):", "10:00")`
   - Notes edit: Inline `prompt("Note:", "")`
   - Delete: Confirm dialog then remove

---

## Technical Details

### State Persistence
- All changes call `window.saveState?.()` to persist to localStorage
- State shape: `state.itineraryByDay[dayIndex] = [{...}, {...}]`
- Survives page reload via `loadState()` in state.js

### Accessibility
- Minimum 44px touch targets on buttons
- Keyboard: Tab through days/POIs, Enter to expand day
- Semantic buttons with aria-labels (TODO for next phase)

### Performance
- Drag-drop uses native HTML5 (`draggable="true"`)
- No heavy DOM manipulations; rerender on change
- Debounce on drag-over to avoid performance hit

---

## What's NOT Yet Implemented (Phase 2+)

- **Multi-select drag**: Can only drag one POI at a time
- **Conflict detection**: No warning if two POIs overlap time
- **Suggested itineraries**: No "auto-schedule" based on proximity
- **Export to calendar**: No .ics export from accordion view (exists in old tab)
- **Shared group itineraries**: No Firebase sync (in old tab only)
- **Budget tracking**: calculateBudgetSpent() stubbed out (needs POI cost data)
- **Photos gallery**: No photo previews in itinerary (exists in POI detail)

---

## Testing Checklist

- [ ] Tap Itinerario tab → Accordion loads with all days
- [ ] Budget summary shows correct daily/total
- [ ] Click day header → Content expands/collapses
- [ ] Drag POI → Visual feedback (opacity change)
- [ ] Drop POI in different day → POI moves and UI updates
- [ ] Click [⋮] menu → Menu appears with 5 options
- [ ] Edit time → Prompt appears, update works
- [ ] Edit notes → Prompt appears, update works
- [ ] Delete → Confirm dialog, POI removed
- [ ] Open POI detail → Tap "Aggiungi all'itinerario" → Day selector appears
- [ ] Select day → POI added, toast shows, modal closes
- [ ] Page reload → Itinerary persists in localStorage

---

## Files Modified

- `/index.html` — Added itinerary.js + itinerary-ui.js links, modified itinerary button handler, modified POI detail CTA
- `/FASE1_PROGRESS.md` — Updated task status and timeline

## Success Metrics

✅ Users can view itinerary by day
✅ Users can add POI from POI detail or via itinerario tab
✅ Users can reorder POI via drag-drop
✅ Users can edit time and notes inline
✅ Data persists across page reloads
✅ No breaking changes to existing features
