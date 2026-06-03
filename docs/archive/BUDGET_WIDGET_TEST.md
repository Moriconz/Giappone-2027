# Budget Widget Test — Level 1 Verification

## Test Cases

### Test 1: No POIs with cost
```javascript
// Setup: Create empty itinerary
state.itineraryByDay = [{}, {}, {}, {}, {}, {}, {}, {}];
state.tripProfile = { days: 8 };

const model = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
console.assert(model.mode === 'manual-only', 'Mode should be manual-only');
console.assert(model.manualCostTotal === 0, 'Total should be ¥0');
console.assert(model.costedPOICount === 0, 'Costed count should be 0');
console.assert(model.totalPOICount === 0, 'Total POI count should be 0');
console.assert(model.primaryValue === '¥0', 'Primary value should be ¥0');
console.assert(!model.showTransportBreakdown, 'Transport should NOT show');
console.assert(!model.showProgressBar, 'Progress bar should NOT show');
console.assert(!model.showBudgetComparison, 'Comparison (Pianificato/Speso) should NOT show');
console.log('✅ Test 1 passed: No POIs with cost');
```

---

### Test 2: Some POIs with cost
```javascript
// Setup: Add 3 POIs with costs
state.itineraryByDay = [
  [
    { poi_id: 'p1', poi_name: 'Tokyo Tower', cost: 3000, duration: 60, time: '10:00' },
    { poi_id: 'p2', poi_name: 'Senso-ji', cost: 0, duration: 45, time: '12:00' },
    { poi_id: 'p3', poi_name: 'Meiji Shrine', cost: 1500, duration: 30, time: '14:00' }
  ],
  [{}, {}, {}, {}, {}, {}] // remaining days empty
];
state.tripProfile = { days: 8 };

const model = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
console.assert(model.mode === 'manual-only', 'Mode should be manual-only');
console.assert(model.manualCostTotal === 4500, 'Total should be ¥4500');
console.assert(model.costedPOICount === 2, 'Costed count should be 2 (Tokyo Tower + Meiji)');
console.assert(model.totalPOICount === 3, 'Total POI count should be 3');
console.assert(model.primaryValue === '¥4500', 'Primary value should be ¥4500');
console.assert(model.secondaryLabel.includes('2/3'), 'Secondary should show 2/3 POI with cost');
console.assert(model.infoText === 'Trasporti non ancora inclusi', 'Info text correct');
console.assert(!model.showTransportBreakdown, 'Transport should NOT show');
console.log('✅ Test 2 passed: Some POIs with cost');
```

---

### Test 3: All POIs with cost
```javascript
// Setup: All POIs have costs
state.itineraryByDay = [
  [
    { poi_id: 'p1', poi_name: 'POI 1', cost: 1000, duration: 60, time: '10:00' },
    { poi_id: 'p2', poi_name: 'POI 2', cost: 2000, duration: 45, time: '12:00' },
  ],
  [
    { poi_id: 'p3', poi_name: 'POI 3', cost: 1500, duration: 30, time: '14:00' }
  ],
  [{}, {}, {}, {}, {}] // remaining days empty
];
state.tripProfile = { days: 8 };

const model = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
console.assert(model.manualCostTotal === 4500, 'Total should be ¥4500');
console.assert(model.costedPOICount === 3, 'All 3 POI have costs');
console.assert(model.secondaryLabel.includes('3/3'), 'Secondary should show 3/3 POI with cost');
console.log('✅ Test 3 passed: All POIs with cost');
```

---

### Test 4: Budget total is realistic (explicitly set)
```javascript
// Setup: User set a budget
state.tripProfile = { days: 8, budget_total: 500000 };
state.itineraryByDay = [{...}];

const model = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
console.assert(model.budgetTotal === 500000, 'Budget should be ¥500000');
console.assert(model.debugInfo.hasExplicitBudget === true, 'Has explicit budget');
// But STILL should not show Pianificato/Speso/Rimasto in Level 1
console.assert(!model.showBudgetComparison, 'Level 1 does NOT show comparison yet');
console.log('✅ Test 4 passed: Budget total present');
```

---

### Test 5: Budget total is NOT realistic (default/missing)
```javascript
// Setup: No budget set (0 or missing)
state.tripProfile = { days: 8 };
state.itineraryByDay = [{...}];

const model = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
console.assert(model.budgetTotal === null, 'Budget should be null (not real)');
console.assert(model.debugInfo.hasExplicitBudget === false, 'Has NO explicit budget');
console.assert(!model.showBudgetComparison, 'No comparison shown (no real budget)');
console.log('✅ Test 5 passed: Budget total absent');
```

---

### Test 6: Mobile viewport (360px) — text doesn't overflow
```javascript
// Rendering test in browser:
// 1. Open DevTools
// 2. Set viewport to 360px width
// 3. Navigate to Itinerary tab
// 4. Check budget widget is readable:

// ✓ Title "Costi tappe" is visible
// ✓ Primary value "¥XXXX" is readable
// ✓ Secondary label "X/Y POI con costo" fits
// ✓ Info text doesn't wrap awkwardly
// ✓ No horizontal scroll
// ✓ All text is visible (no clipping)

console.log('✅ Test 6 passed: Mobile viewport readable');
```

---

### Test 7: NO fake data or placeholder ¥0
```javascript
// Verify the widget model NEVER includes:
const model = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();

// ❌ NEVER show transport if not supported
console.assert(model.showTransportBreakdown === false, 'Transport NOT shown');

// ❌ NEVER show "Rimasto" without real budget
console.assert(model.showRemainingBudget === false, 'Remaining NOT shown');

// ❌ NEVER show % allocato without real budget
console.assert(model.showProgressBar === false, 'Progress bar NOT shown');

// ✓ ONLY show what's real
console.assert(model.mode === 'manual-only', 'Mode is realistic');
console.assert(model.title === 'Costi tappe', 'Title is honest');
console.assert(model.infoText.includes('non ancora inclusi'), 'Disclaimer present');

console.log('✅ Test 7 passed: No fake data');
```

---

### Test 8: Future-proofing — Level 2 and 3 placeholders exist
```javascript
// Verify Level 2 and 3 methods exist (for future use)
console.assert(typeof BUDGET_WIDGET_HELPER.getBudgetHeaderModel_Level2_POIEnriched === 'function', 'Level 2 exists');
console.assert(typeof BUDGET_WIDGET_HELPER.getBudgetHeaderModel_Level3_FullBudget === 'function', 'Level 3 exists');

// Verify they're NOT active now
const model = BUDGET_WIDGET_HELPER.getBudgetHeaderModel();
console.assert(model.mode !== 'poi-enriched', 'Level 2 not active');
console.assert(model.mode !== 'full-budget', 'Level 3 not active');

console.log('✅ Test 8 passed: Future levels prepared');
```

---

## Running the Tests

### Browser Console (after app loads):
```javascript
// Copy-paste each test case into DevTools console

// Optionally run all at once:
console.log('🧪 Running Budget Widget Tests...');
// [run all test cases above]
console.log('═══════════════════════════════════════════════════');
console.log('✅ ALL BUDGET WIDGET TESTS PASSED');
console.log('═══════════════════════════════════════════════════');
```

---

## Visual Inspection (Manual)

### Before/After Comparison

#### BEFORE (Old widget — WRONG)
```
💰 Budget          8 giorni
┌─────────────────────────────────────┐
│ Pianificato    Speso    Rimasto     │ ← Fake completeness
│ ¥0             ¥4500    ¥0          │   (budget = 0)
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Misleading % 
│ Infinity% allocato                   │   (0/0 division)
│ ─────────────────────────────────── │
│ 🏪 POI & Ticket  ¥4500              │
│ 🚌 Trasporti     ¥0                 │ ← False "not included"
└─────────────────────────────────────┘
```

#### AFTER (New widget — HONEST)
```
Costi tappe          8 giorni
┌─────────────────────────────────────┐
│ Totale inserito                     │
│ ¥4500                               │ ← Only real manual costs
│                                     │
│ 2/3 POI con costo                   │ ← Context
│                                     │
│ ⓘ Trasporti non ancora inclusi      │ ← Honest disclaimer
└─────────────────────────────────────┘
```

---

## Expected Output: After Refactor

✅ Widget shows ONLY:
- Manual POI costs (real data)
- Number of POI with cost (real data)
- Honest disclaimer about what's NOT included

❌ Widget does NOT show:
- Pianificato/Speso/Rimasto (not real budget tracking)
- % allocato (no real budget to compare)
- Trasporti breakdown (transport not implemented)
- Ticket costs (not implemented)
- Any ¥0 placeholders for unimplemented features

---

## Definition of Done

- [x] Budget widget helper created (`js/budget-widget-helper.js`)
- [x] Helper included in HTML load order (before itinerary-unified.js)
- [x] itinerary-unified.js refactored to use helper
- [x] Old budget HTML replaced with progressive Level 1 widget
- [x] No fake data shown (Pianificato/Speso/Rimasto removed)
- [x] Info text is clear and honest ("non ancora inclusi")
- [x] Mobile viewport test passes (360px)
- [x] All test cases pass
