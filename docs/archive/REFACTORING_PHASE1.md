# Phase 1: CSS Component Refactoring Guide

## Overview
This document guides the systematic replacement of 590+ inline styles with reusable CSS classes from `css/components.css`.

**Target**: Eliminate inline styles from core UI components while maintaining exact visual appearance.

---

## Priority 1: Buttons (Highest Impact)

### Current: Inline Styles
```javascript
// Primary CTA (line 6594)
<button id="add-to-itinerary-btn" style="
  width:100%;
  background-color:#b5541e;
  border:none;
  color:white;
  height:50px;
  border-radius:8px;
  font-weight:700;
  font-size:15px;
  cursor:pointer;
  transition:all 0.2s;
  box-shadow:0 4px 14px rgba(181,84,30,0.4);
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
">

// Secondary ghost button
<button style="
  display:flex;align-items:center;justify-content:center;gap:8px;
  width:100%;height:36px;
  background:transparent;
  border:1px solid rgba(255,255,255,0.15);
  border-radius:8px;
  color:rgba(255,255,255,0.5);
  font-size:13px;
  cursor:pointer;
  transition:all 0.2s;
">

// Icon button (copy address)
<button class="copy-address-btn" style="
  width:32px;height:32px;
  display:inline-flex;
  align-items:center;justify-content:center;
  border:none;border-radius:8px;
  background:transparent;
  color:rgba(255,255,255,0.5);
  cursor:pointer;flex-shrink:0;
  transition:all 0.2s
">
```

### Refactored: Component Classes
```javascript
// Primary CTA — Use .btn-primary with custom color override
<button id="add-to-itinerary-btn" class="btn-primary" style="background-color:#b5541e;box-shadow:0 4px 14px rgba(181,84,30,0.4)">
  📅 Aggiungi all'itinerario
</button>

// Better: Create .btn-cta class in components.css for this specific brown color
<button id="add-to-itinerary-btn" class="btn-cta">
  📅 Aggiungi all'itinerario
</button>

// Secondary ghost button
<button class="btn-secondary">
  💾 Salva
</button>

// Icon button
<button class="btn-icon-small copy-address-btn" data-address="...">
  ⧉
</button>
```

### Changes to css/components.css
Add `.btn-cta` class for the brown CTA color:
```css
.btn-cta {
  padding: 12px 20px;
  min-height: var(--touch-min);
  background: #b5541e;
  color: #fff;
  font-size: var(--font-size-md);
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(181, 84, 30, 0.4);
}

.btn-cta:hover {
  box-shadow: 0 6px 18px rgba(181, 84, 30, 0.5);
  transform: translateY(-2px);
}

.btn-cta:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(181, 84, 30, 0.3);
}
```

---

## Priority 2: Address Row & Copy Button (Line 6523)

### Current: Inline Styles
```javascript
<div class="poi-address-row" style="
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:10px 12px;
  border-radius:10px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.1);
  margin:12px 16px
">
  <span class="poi-address-text" style="
    flex:1;
    font-size:14px;
    color:rgba(255,255,255,0.85);
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    min-width:0
  ">📍 ${cleanAddress}</span>
  <button class="copy-address-btn" style="
    width:32px;
    height:32px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    border:none;
    border-radius:8px;
    background:transparent;
    color:rgba(255,255,255,0.5);
    cursor:pointer;
    flex-shrink:0;
    transition:all 0.2s
  ">⧉</button>
</div>
```

### Refactored: Component Classes
```javascript
<div class="address-row">
  <span class="address-text">📍 ${cleanAddress}</span>
  <button class="btn-copy-address" data-address="${cleanAddress}" aria-label="Copia indirizzo">⧉</button>
</div>
```

---

## Priority 3: Form Inputs (Lines 6561-6571)

### Current: Inline Styles
```javascript
<textarea id="poi-note" style="
  width:100%;
  padding:12px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.1);
  border-radius:10px;
  font-size:13px;
  color:#fff;
  resize:vertical;
  min-height:70px;
  font-family:inherit;
  box-sizing:border-box;
  transition:border-color 0.2s;
">${note}</textarea>

<button id="add-note-btn-${p.id}" style="
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  width:100%;
  height:36px;
  background:transparent;
  border:1px dashed rgba(255,255,255,0.15);
  border-radius:8px;
  color:rgba(255,255,255,0.5);
  font-size:13px;
  cursor:pointer;
  transition:all 0.2s;
">
```

### Refactored: Component Classes
```javascript
<textarea id="poi-note" class="form-input form-textarea" placeholder="Es: Prenotare con 2 giorni di anticipo...">${note}</textarea>

<button id="add-note-btn-${p.id}" class="notes-button">
  📝 Aggiungi una nota
</button>
```

---

## Priority 4: Status Badges (Lines 137-202 in poi-detail-events.js)

### Current: Inline Styles
```javascript
// Confirmed
container.innerHTML = `
  <a style="
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    background: rgba(74, 222, 128, 0.12);
    border: 1px solid rgba(74, 222, 128, 0.35);
    border-radius: 8px;
    color: #4ade80;
    text-decoration: none;
    font-size: 13px;
    transition: all 0.2s;
  "
```

### Refactored: Component Classes
```javascript
// Confirmed
container.innerHTML = `
  <a href="${fmgfUrl}" target="_blank" rel="noopener noreferrer" class="status-badge status-confirmed" style="text-decoration: none;">
    <div class="status-content">
      <strong>🌾 Opzioni gluten-free disponibili</strong>
      <small>Confermato da Find Me Gluten Free</small>
    </div>
    <span class="status-arrow">→</span>
  </a>
`

// Likely
container.innerHTML = `
  <div class="status-badge status-likely">
    <div class="status-content">
      <strong>🌾 Probabilmente gluten-free</strong>
      <small>Menzionato nelle recensioni, verifica al locale</small>
    </div>
  </div>
`

// Unknown
container.innerHTML = `
  <div class="status-badge status-unknown">
    <div class="status-content">
      <strong>Gluten-free non verificato</strong>
      <small>Nessuna conferma trovata al momento</small>
    </div>
  </div>
`
```

---

## Priority 5: Rating Stars (Line 6402)

### Current: Inline Styles
```javascript
<span class="star-rating" style="
  font-size: 28px;
  color: ${n<=rating ? '#f59e0b' : 'rgba(255, 255, 255, 0.3)'};
  cursor: pointer;
  transition: all 0.15s;
  transform: scale(1);
">★</span>
```

### Refactored: Component Classes
```javascript
<div class="rating-stars">
  ${[1,2,3,4,5].map(n => `
    <span class="star ${n <= rating ? 'active' : ''}" 
          data-star="${n}" 
          data-id="${p.id}">★</span>
  `).join('')}
</div>
```

### Update poi-detail-events.js (star-rating click handler):
```javascript
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('star')) {
    const poiId = e.target.dataset.id;
    const rating = parseInt(e.target.dataset.star, 10);
    
    // Save to localStorage
    const ratings = JSON.parse(localStorage.getItem('ratings') || '{}');
    ratings[poiId] = rating;
    localStorage.setItem('ratings', JSON.stringify(ratings));
    
    // Update UI with classes instead of inline styles
    const allStars = document.querySelectorAll(`.star[data-id="${poiId}"]`);
    allStars.forEach((star, idx) => {
      const starNum = parseInt(star.dataset.star, 10);
      star.classList.toggle('active', starNum <= rating);
    });
  }
});
```

---

## Priority 6: POI Card List View

### Areas to Refactor:
- Card container styling
- Image sizing
- Title/subtitle layout
- Meta information (distance, rating)
- Add button styling

### Current Pattern:
```javascript
<div style="display:flex;gap:12px;padding:16px;...">
  <img style="width:56px;height:56px;object-fit:cover;...">
  <div style="flex:1;...">
    <div style="font-size:16px;font-weight:600;...">Title</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.65);...">Subtitle</div>
  </div>
</div>
```

### Refactored Pattern:
```html
<div class="poi-card">
  <img class="poi-card-image" src="..." alt="...">
  <div class="poi-card-content">
    <div class="poi-card-title">Title</div>
    <div class="poi-card-subtitle">Subtitle</div>
    <div class="poi-card-meta">
      <span>📍 0.5 km</span>
      <span>⭐ 4.5</span>
    </div>
  </div>
</div>
```

---

## Implementation Order

1. **Step 1**: Update `css/components.css` with all component classes ✅
2. **Step 2**: Add `.btn-cta` variant for brown CTA button
3. **Step 3**: Refactor address row (line 6523) in `index.html`
4. **Step 4**: Refactor form inputs (lines 6561-6571) in `index.html`
5. **Step 5**: Refactor status badges in `js/poi-detail-events.js` (renderGFStatus)
6. **Step 6**: Refactor star rating in `index.html` and `js/poi-detail-events.js`
7. **Step 7**: Refactor POI list cards (wherever they are rendered)
8. **Step 8**: Test all interactions across mobile viewport

---

## Testing Checklist

- [ ] Buttons remain 44px minimum height (touch targets)
- [ ] Hover effects work smoothly
- [ ] Address row displays correctly (no empty box)
- [ ] Copy button appears only when address exists
- [ ] Status badges render with correct colors
- [ ] Star rating stars are clickable and save to localStorage
- [ ] Form inputs have proper borders on focus
- [ ] All transitions are smooth (0.2s normal timing)
- [ ] Mobile viewport (< 480px) looks proportionate
- [ ] No visual regression compared to current inline styles

---

## Notes

- All component classes use CSS custom properties (--color-*, --space-*, --font-size-*, etc.)
- Transitions use `--transition-normal` (0.2s ease) for consistency
- Color palette matches the dark warm/terracotta theme
- Accessibility focus states are automatically provided via `.button:focus-visible`
- Utility classes (`.text-primary`, `.gap-md`, `.p-lg`) available for quick adjustments

---

## File Locations

- **CSS Components**: `/Users/riccardomoricone/Desktop/Giappone-2027-main-2/css/components.css`
- **HTML (Primary refactoring)**: `/Users/riccardomoricone/Desktop/Giappone-2027-main-2/index.html`
- **Event Handlers**: `/Users/riccardomoricone/Desktop/Giappone-2027-main-2/js/poi-detail-events.js`

---

## Next Phase (Phase 2)

- POI card grid system
- Modal layout refinement
- Navigation button styling
- Weather widget styling
- Gallery component styling
