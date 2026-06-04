// ============================================================================
// poi-detail-view.js — gfTag, renderEnhancedPoiSections, poiDetailHTML,
//   loadPOIPhotos, openPOI, and supporting helpers
// Extracted from app-core.js. Deps (all window.*):
//   openSheet, closeSheet, state, CATS, saveState, toast,
//   getCategoryColor, getCategoryEmoji, getPoiDisplayName, getCachedAllPOIs,
//   promptAddToCalendar, analyzeGlutenFreeStatus, ITINERARY
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

// ---- POI detail ----
function gfTag(gf){
  if (!gf || !gf.lvl || gf.lvl === 'unknown') return ''; // Non mostrare il tag se non disponibile
  const map = {full:['🌾 100% Gluten-Free','gf-full'], partial:['🌾 GF parziale','gf-partial'], none:['⚠️ Non GF','gf-none']};
  const [t,c] = map[gf.lvl] || map.none;
  return `<span class="tag ${c}">${t}</span>`;
}
/**
 * Generate enhanced sections (photos, reviews, hours, attributes)
 * for POI detail card with glassmorphism styling
 */
function renderEnhancedPoiSections(p) {
  const details = p._details;
  if (!details) return ''; // No enhanced data available

  const sections = [];

  // ===== PHOTO GALLERY =====
  if (p._photoNames && p._photoNames.length > 0) {
    const slides = p._photoNames.slice(0, 6).map((photo, idx) => {
      return `
        <div class="photo-slide" style="flex-shrink:0;width:100%;height:280px;overflow:hidden;border-radius:8px;flex:none">
          <div style="width:100%;height:100%;background:linear-gradient(135deg,rgba(74,91,168,0.2),rgba(255,107,53,0.2));display:flex;align-items:center;justify-content:center;color:#999;font-size:12px">
            📷 Foto ${idx + 1}
          </div>
        </div>
      `;
    }).join('');

    sections.push(`
      <div style="background:linear-gradient(135deg,rgba(74,91,168,0.12),rgba(30,50,80,0.12));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);border-radius:14px;padding:14px;margin-bottom:16px">
        <h3 style="margin:0 0 12px 0;color:#fff;font-size:14px;font-weight:700">📸 Galleria Foto</h3>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;display:flex;gap:8px;padding:0;scroll-behavior:smooth;width:100%">
          ${slides}
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);text-align:center;margin-top:8px">${p._photoNames.length} foto disponibili</div>
      </div>
    `);
  }

  // ===== REVIEWS =====
  if (details.reviews && details.reviews.length > 0) {
    const reviewCards = details.reviews.slice(0, 3).map(review => {
      const stars = Array(review.rating).fill('⭐').join('');
      return `
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
            <div style="font-weight:600;color:#fff;font-size:13px">${review.author}</div>
            <div style="color:#FFD700;font-size:12px">${stars}</div>
          </div>
          <div style="color:rgba(255,255,255,0.8);font-size:12px;line-height:1.5;margin-bottom:4px">"${review.text.substring(0, 120)}${review.text.length > 120 ? '...' : ''}"</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px">${review.relativePublishTimeDescription}</div>
        </div>
      `;
    }).join('');

    sections.push(`
      <div style="background:linear-gradient(135deg,rgba(74,91,168,0.12),rgba(30,50,80,0.12));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);border-radius:14px;padding:14px;margin-bottom:16px">
        <h3 style="margin:0 0 12px 0;color:#fff;font-size:14px;font-weight:700">⭐ Recensioni (${details.reviews.length} totali)</h3>
        ${reviewCards}
      </div>
    `);
  }

  // ===== OPENING HOURS =====
  if (details.currentOpeningHours) {
    const periods = details.currentOpeningHours.periods || [];
    const weekdayText = details.currentOpeningHours.weekdayDescriptions || [];

    let hoursHtml = '';
    if (weekdayText.length > 0) {
      hoursHtml = weekdayText.map((day, idx) => {
        return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);font-size:12px">
          <span>${day.split(':')[0]}</span>
          <span style="font-weight:600;color:#FFD700">${day.includes(':') ? day.split(': ')[1] : 'Chiuso'}</span>
        </div>`;
      }).join('');
    }

    if (hoursHtml) {
      sections.push(`
        <div style="background:linear-gradient(135deg,rgba(74,91,168,0.12),rgba(30,50,80,0.12));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);border-radius:14px;padding:14px;margin-bottom:16px">
          <h3 style="margin:0 0 12px 0;color:#fff;font-size:14px;font-weight:700">⏰ Orari (Prossimi 7 giorni)</h3>
          ${hoursHtml}
        </div>
      `);
    }
  }

  // ===== RESTAURANT ATTRIBUTES =====
  const attrs = [
    { key: 'servesLunch', label: '🍽️ Pranzo', icon: '🍽️' },
    { key: 'servesDinner', label: '🍴 Cena', icon: '🍴' },
    { key: 'reservable', label: '📅 Prenotabile', icon: '📅' },
    { key: 'takeout', label: '📦 Asporto', icon: '📦' },
    { key: 'servesBeer', label: '🍺 Birra', icon: '🍺' },
    { key: 'servesVegetarianFood', label: '🥗 Vegetariano', icon: '🥗' }
  ];

  const activeAttrs = attrs.filter(a => details[a.key] === true);

  if (activeAttrs.length > 0) {
    const chips = activeAttrs.map(attr => `
      <span style="background:linear-gradient(135deg,rgba(255,107,53,0.3),rgba(255,20,147,0.3));border:1px solid rgba(255,107,53,0.6);color:#fff;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block">
        ${attr.label}
      </span>
    `).join('');

    sections.push(`
      <div style="background:linear-gradient(135deg,rgba(74,91,168,0.12),rgba(30,50,80,0.12));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);border-radius:14px;padding:14px;margin-bottom:16px">
        <h3 style="margin:0 0 12px 0;color:#fff;font-size:14px;font-weight:700">🏷️ Caratteristiche</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${chips}
        </div>
      </div>
    `);
  }

  // ===== ACCESSIBILITY =====
  if (details.accessibilityOptions && Object.keys(details.accessibilityOptions).length > 0) {
    const accOptions = details.accessibilityOptions;
    const accessibilityItems = [];

    if (accOptions.wheelchairAccessibleEntrance) accessibilityItems.push('♿ Ingresso accessibile');
    if (accOptions.wheelchairAccessibleParking) accessibilityItems.push('♿ Parcheggio accessibile');
    if (accOptions.wheelchairAccessibleRestroom) accessibilityItems.push('♿ Bagno accessibile');
    if (accOptions.wheelchairAccessibleSeating) accessibilityItems.push('♿ Posti a sedere accessibili');

    if (accessibilityItems.length > 0) {
      const items = accessibilityItems.map(item => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;color:rgba(255,255,255,0.8);font-size:12px;border-bottom:1px solid rgba(255,255,255,0.1)">
          <span style="font-size:14px">✓</span>
          <span>${item}</span>
        </div>
      `).join('');

      sections.push(`
        <div style="background:linear-gradient(135deg,rgba(74,124,89,0.12),rgba(100,150,110,0.12));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(100,200,150,0.25);border-radius:14px;padding:14px;margin-bottom:16px">
          <h3 style="margin:0 0 12px 0;color:#90EE90;font-size:14px;font-weight:700">♿ Accessibilità</h3>
          ${items}
        </div>
      `);
    }
  }

  return sections.join('');
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS — Logica unificata per POI detail
// ═══════════════════════════════════════════════════════════════════

// FOOD_TYPES — Unica fonte di verità per classificazione ristorante
const FOOD_TYPES = ['restaurant','food','cafe','bar','meal_takeaway','bakery','izakaya'];

function isRestaurantPOI(poi) {
  return FOOD_TYPES.includes(poi.primaryType || poi.cat);
}

function getCleanAddress(poi) {
  const addr = (poi._details?.address || poi.address || '').trim();
  return addr && addr.length > 0 ? addr : null;
}

function getReadableSubtypeLabel(poi) {
  const subtypeMap = {
    // Food & Drink
    'restaurant': 'Ristorante',
    'cafe': 'Caffetteria',
    'bar': 'Bar',
    'food': 'Ristorante',
    'izakaya': 'Izakaya',
    'bakery': 'Panetteria',
    'meal_takeaway': 'Asporto',
    // Culture & History
    'museum': 'Museo',
    'shrine': 'Santuario',
    'temple': 'Tempio',
    'church': 'Chiesa',
    'landmark': 'Landmark',
    'tourist_attraction': 'Attrazione turistica',
    // Services & Admin
    'post_office': 'Ufficio postale',
    'services': 'Servizi'
  };
  return subtypeMap[poi.cat] || (poi.cat ? poi.cat.charAt(0).toUpperCase() + poi.cat.slice(1) : 'Luogo');
}

function poiDetailHTML(p){
  console.log('[poiDetailHTML] Rendering new adaptive layout for:', p.name || p.displayName);
  const displayName = window.getPoiDisplayName(p);
  const saved = window.state.savedPOIs.includes(p.id);
  const note = window.state.notes[p.id] || '';
  const catData = window.CATS[p.cat] || {label:p.cat, icon:window.getCategoryEmoji(p.cat)};
  const catColor = window.getCategoryColor(p.cat);
  const catEmoji = window.getCategoryEmoji(p.cat);

  // IMPORTANTE: Determina SE è un ristorante (UNICA fonte di verità = helper isRestaurantPOI)
  const isRestaurant = isRestaurantPOI(p);
  console.debug('[POI Classification] Name:', p.name, 'Type:', p.primaryType || p.cat, 'IsRestaurant:', isRestaurant);

  // Helper: use PoiSectionBuilders if available, otherwise fallback
  const SB = window.PoiSectionBuilders || {};
  const PhotoGal = window.PhotoGallery || null;

  const doList = (p.do||[]).map(x=>`<li>${x}</li>`).join('');
  const dontList = (p.dont||[]).map(x=>`<li>${x}</li>`).join('');
  const b = p.booking || {};
  const bookingBtns = [];
  if (b.tableCheck) bookingBtns.push(`<a class="btn success" href="${b.tableCheck}" target="_blank" rel="noopener">📘 TableCheck</a>`);
  if (b.tabelog) bookingBtns.push(`<a class="btn" href="${b.tabelog}" target="_blank" rel="noopener">🍜 Tabelog</a>`);
  if (b.website) bookingBtns.push(`<a class="btn" href="${b.website}" target="_blank" rel="noopener">🌐 Sito</a>`);
  if (b.phone) bookingBtns.push(`<a class="btn" href="tel:${b.phone.replace(/\s+/g,'')}">📞 Chiama</a>`);
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;
  const amaps = `https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=w`;

  // Info chips
  const infoChips = [];
  if (p.hours) infoChips.push(`<span class="info-chip" style="border:2px solid ${catColor};color:${catColor}">🕐 ${p.hours}</span>`);
  if (p.ticket) infoChips.push(`<span class="info-chip" style="border:2px solid ${catColor};color:${catColor}">🎟️ ${p.ticket}</span>`);
  if (p.duration) infoChips.push(`<span class="info-chip" style="border:2px solid ${catColor};color:${catColor}">⏱️ ${p.duration} min</span>`);
  if (p.paid === false) {
    infoChips.push(`<span class="info-chip" style="background:#4A7C59;color:#fff;border-color:#4A7C59">✅ Ingresso gratuito</span>`);
  } else if (p.paid === true && p.cost) {
    infoChips.push(`<span class="info-chip" style="background:${catColor};color:#fff;border-color:${catColor}">🎟️ ${p.cost}</span>`);
  }

  const rating = window.state.ratings?.[p.id] || 0;
  const stars = `<div class="rating-stars" id="stars-${p.id}">${[1,2,3,4,5].map(n => `<span class="star ${n <= rating ? 'active' : ''}" data-star="${n}" data-id="${p.id}">★</span>`).join('')}</div>`;

  // FOTO: Use new PhotoGallery component
  let photoHtml = '';
  if (PhotoGal) {
    // Priorità: p._photoNames (da Google Places Details) → p.photos → p.photo
    let photos = [];
    if (p._photoNames && Array.isArray(p._photoNames) && p._photoNames.length > 0) {
      photos = p._photoNames;
    } else if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) {
      photos = p.photos;
    } else if (p.photo) {
      photos = [{ url: p.photo }];
    }
    const gallery = new PhotoGal(photos);
    photoHtml = gallery.render();
  } else {
    // Fallback se PhotoGallery non disponibile
    if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) {
      photoHtml = `<img src="${p.photos[0].url}" alt="${displayName}" loading="lazy" style="width:100%;height:260px;object-fit:cover;border-radius:12px 12px 0 0;margin-bottom:16px;display:block">`;
    } else if (p.photo) {
      photoHtml = `<img src="${p.photo}" alt="${displayName}" loading="lazy" style="width:100%;height:260px;object-fit:cover;border-radius:12px 12px 0 0;margin-bottom:16px;display:block">`;
    } else {
      photoHtml = `<div style="width:100%;height:260px;background:linear-gradient(135deg,rgba(0,255,136,.05),rgba(255,20,147,.05));border-radius:12px 12px 0 0;margin-bottom:16px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.5)">📷 Foto non disponibili</div>`;
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // REORDERED LAYOUT FOR RAPID DECISION-MAKING (FASE 1.3)
  // Extract sections in new order for better UX
  // ═════════════════════════════════════════════════════════════════

  // Get readable subtype label (category/subcategory)
  const poiSubtypeLabel = getReadableSubtypeLabel(p);

  // Extract specific sections we need to reorder
  const openingHoursHtml = SB.renderOpeningHours ? (SB.renderOpeningHours(p._details || p) || '') : '';
  const websiteHtml = SB.renderWebsite ? (SB.renderWebsite(p._details || p) || '') : '';
  const phoneHtml = SB.renderPhone ? (SB.renderPhone(p._details || p) || '') : '';
  const descriptionHtml = SB.renderDescription ? (SB.renderDescription(p._details || p) || '') : '';
  const restaurantAttrHtml = SB.renderRestaurantAttributes ? (SB.renderRestaurantAttributes(p, p._details || p) || '') : '';
  const priceLevelHtml = SB.renderPriceLevel ? (SB.renderPriceLevel(p._details || p) || '') : '';
  const durationHtml = SB.renderSuggestedDuration ? (SB.renderSuggestedDuration(p) || '') : '';
  const entranceFeeHtml = SB.renderEntranceFee ? (SB.renderEntranceFee(p) || '') : '';

  // Build GF status HTML (only for restaurants, but prominent)
  let gfStatusHtml = '';
  if (isRestaurant) {
    gfStatusHtml = `
      <div class="gf-section" id="gf-status-container-${p.id}" data-poi-id="${p.id}" style="
        padding: 0 16px;
        margin: 6px 0 12px 0;
      ">
        <div class="gf-box gf-pending" style="
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          opacity: 0.85;
        ">
          <span class="gf-spinner" style="
            width: 10px;
            height: 10px;
            border: 1.5px solid rgba(255, 255, 255, 0.12);
            border-top-color: #4ade80;
            border-radius: 50%;
            display: inline-block;
            flex-shrink: 0;
            animation: spin 0.8s linear infinite;
          "></span>
          <div style="flex: 1; line-height: 1.3; color: rgba(255, 255, 255, 0.4);">
            Verifica gluten-free in corso…
          </div>
        </div>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
          .gf-box.gf-unknown {
            background: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            color: rgba(255, 255, 255, 0.65) !important;
          }
          .gf-box.gf-unknown strong {
            color: rgba(255, 255, 255, 0.75) !important;
          }
          .gf-box.gf-unknown small {
            color: rgba(255, 255, 255, 0.45) !important;
          }
        </style>
      </div>
    `;
  }

  // Fallback old sections if needed
  const enhancedSections = renderEnhancedPoiSections ? renderEnhancedPoiSections(p) : '';

  const html = `
    <!-- 1. PHOTO GALLERY (large, immediately visible) -->
    ${photoHtml}

    <!-- 2. COMPACT HEADER (name + metadata) -->
    ${SB.renderHeaderCompact ? SB.renderHeaderCompact(p, displayName, catColor, catEmoji) : ''}

    <!-- 3. CATEGORY/SUBTYPE (readable label) -->
    ${poiSubtypeLabel ? `
      <div style="
        padding: 0 16px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 500;
        margin-bottom: 0;
      ">${poiSubtypeLabel}</div>
      <div style="height: 1px; background: rgba(255, 255, 255, 0.08); margin: 6px 0 12px 0"></div>
    ` : ''}

    <!-- 4. BRIEF DESCRIPTION (earlier for context) -->
    ${descriptionHtml}

    <!-- 5. GF STATUS (prominent, only for restaurants) -->
    ${gfStatusHtml}

    <!-- 5b. GF CROWDSOURCE (riscontri del gruppo, auto-iniettato da gf-crowdsource.js) -->
    <div data-gf-crowd="${p.id}" data-gf-crowd-name="${(displayName||'').replace(/"/g,'&quot;')}"></div>

    <!-- 6. PRACTICAL INFO (hours, entry fee, duration, info chips) -->
    ${openingHoursHtml}
    ${infoChips.length > 0 ? `<div style="padding:0 16px;margin:8px 0;display:flex;flex-wrap:wrap;gap:6px">${infoChips.join('')}</div>` : ''}
    ${entranceFeeHtml}
    ${durationHtml}

    <!-- 7. RESTAURANT ATTRIBUTES & PRICE (if available) -->
    ${restaurantAttrHtml}
    ${priceLevelHtml}

    <!-- 8. CONTACTS (website, phone) -->
    ${websiteHtml}
    ${phoneHtml}

    <!-- 9. RATING (stars) -->
    <div style="padding:0 16px;margin:16px 0;display:flex;align-items:center;justify-content:space-between;gap:16px">
      <label style="font-size:13px;color:rgba(255,255,255,0.6);font-weight:600;white-space:nowrap">La tua valutazione</label>
      ${stars}
    </div>

    <!-- LEGACY SECTIONS (fallback) -->
    ${enhancedSections}

    <!-- DIVIDER — separates from main action -->
    <div style="height:1px;background:rgba(255,255,255,0.08);margin:16px 0"></div>

    <!-- 10. MAIN CTA: ADD TO ITINERARY (prominent, ruggine saturo) -->
    <div style="padding:0 16px;margin:16px 0">
      <button id="add-to-itinerary-btn" class="btn-cta">${window.t ? window.t('poi.addToItinerary') : "📅 Aggiungi all'itinerario"}</button>
    </div>

    <!-- 11. PERSONAL NOTES (collapsible by default) -->
    <div class="notes-section" id="notes-section-${p.id}">
      ${note ? `
        <label class="text-sm">📝 Note</label>
        <textarea id="poi-note" class="form-input form-textarea" placeholder="Es: Prenotare con 2 giorni di anticipo...">${note}</textarea>
      ` : `
        <button id="add-note-btn-${p.id}" class="notes-button">
          📝 Aggiungi una nota
        </button>
      `}
    </div>

    <!-- 12. SECONDARY ACTIONS (save, calendar, maps) -->
    <div style="display:flex;gap:8px;margin:12px 16px;justify-content:space-between;position:relative">
      <!-- Maps dropdown -->
      <div style="flex:1;position:relative">
        <button class="btn-maps-dropdown" data-poi-id="${p.id}" style="
          width:100%;
          height:36px;
          background:transparent;
          border:1px solid rgba(255,255,255,0.15);
          color:rgba(255,255,255,0.7);
          border-radius:8px;
          cursor:pointer;
          font-weight:600;
          font-size:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:6px;
          transition:all 0.2s;
        " onmouseover="this.style.borderColor='rgba(255,255,255,0.3)';this.style.color='#fff'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='rgba(255,255,255,0.7)'">
          🧭 Apri mappa
        </button>

        <!-- Dropdown menu (hidden by default) -->
        <div class="maps-dropdown-menu" data-poi-id="${p.id}" style="
          display:none;
          position:absolute;
          top:100%;
          left:0;
          background:rgba(30,30,35,0.95);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:8px;
          box-shadow:0 4px 16px rgba(0,0,0,0.3);
          z-index:1000;
          min-width:180px;
          margin-top:4px;
          overflow:hidden;
          animation:slideDown 0.2s ease-out;
        ">
          <style>
            @keyframes slideDown {
              from { opacity:0; transform:translateY(-8px); }
              to { opacity:1; transform:translateY(0); }
            }
          </style>
          <a href="https://maps.google.com/?q=${p.lat},${p.lon}&z=17" target="_blank" style="
            display:block;
            padding:12px 16px;
            color:#fff;
            text-decoration:none;
            font-size:13px;
            border-bottom:1px solid rgba(255,255,255,0.05);
            transition:background 0.2s;
          " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
            🗺️ Google Maps
          </a>
          <a href="https://maps.apple.com/?ll=${p.lat},${p.lon}" target="_blank" style="
            display:block;
            padding:12px 16px;
            color:#fff;
            text-decoration:none;
            font-size:13px;
            transition:background 0.2s;
          " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
            🍎 Apple Maps
          </a>
        </div>
      </div>

      <button class="btn-secondary" id="save-poi" style="
        flex:1;
        height:36px;
        background:transparent;
        border:1px solid rgba(255,255,255,0.1);
        color:rgba(255,255,255,0.6);
        border-radius:8px;
        cursor:pointer;
        font-weight:500;
        font-size:12px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        transition:all 0.2s;
      " onmouseover="this.style.borderColor='rgba(255,255,255,0.2)';this.style.color='rgba(255,255,255,0.8)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.color='rgba(255,255,255,0.6)'">${saved?'⭐ Salvato':'☆ Salva'}</button>

      <button class="btn-secondary" id="add-cal" style="
        flex:1;
        height:36px;
        background:transparent;
        border:1px solid rgba(255,255,255,0.1);
        color:rgba(255,255,255,0.6);
        border-radius:8px;
        cursor:pointer;
        font-weight:500;
        font-size:12px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        transition:all 0.2s;
      " onmouseover="this.style.borderColor='rgba(255,255,255,0.2)';this.style.color='rgba(255,255,255,0.8)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.color='rgba(255,255,255,0.6)'">📅 Calendario</button>
    </div>

    <!-- Bottom spacing -->
    <div style="height:20px"></div>
  `;
  // DEBUG: Log the HTML to verify grid structure
  const hasGrid = html.includes('display:grid');
  console.log(`[DEBUG POI] ${p.name} - Grid found: ${hasGrid}`);
  if (hasGrid) {
    const gridMatch = html.match(/display:grid[^>]*>/);
    console.log('[DEBUG POI] Grid container:', gridMatch ? gridMatch[0] : 'not found');
  }
  return html;
}
function loadPOIPhotos(p){
  const container = document.getElementById('poi-photos-container');
  if (!container) {
    console.warn('[loadPOIPhotos] container not found for', p.id);
    return;
  }
  if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) return;
  if (p.photo) return;
  if (typeof window.getPhotosForLocation !== 'function') {
    console.warn('[loadPOIPhotos] getPhotosForLocation not available', typeof window.getPhotosForLocation);
    container.outerHTML = photoFallbackHtml('Foto non disponibili', p);
    return;
  }

  const googleImagesUrl = (q, city) => {
    const query = [q, city, 'Japan'].filter(Boolean).join(' ');
    return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
  };
  const photoFallbackHtml = (label, poi) => `
    <div style="margin-bottom:12px;padding:14px;background:var(--surface-2);border-radius:8px;text-align:center">
      <div style="font-size:13px;color:var(--muted);margin-bottom:8px">📷 ${label}</div>
      <a href="${googleImagesUrl(window.getPoiDisplayName(poi), poi.city)}" target="_blank" rel="noopener"
         class="btn" style="font-size:12px">🔎 Cerca foto su Google Images</a>
    </div>
  `;

  (async () => {
    try {
      // Usa dati verificati se disponibili
      const verifiedPOI = await window.POIVerifiedDB?.getVerifiedPOI?.(p.id);
      const photoLat = verifiedPOI?.lat || p.lat;
      const photoLng = verifiedPOI?.lng || p.lng;
      const photoCity = verifiedPOI?.addressCity || p.city;
      const photoName = verifiedPOI?.name || window.getPoiDisplayName(p);

      console.log('[loadPOIPhotos] Using', verifiedPOI ? 'verified' : 'local', 'data for photos');

      const photos = await window.getPhotosForLocation(
        photoLat,
        photoLng,
        photoCity,
        photoName
      );

      if (photos && photos.length > 0) {
        const slides = photos.slice(0, 5).map((photo, idx) => `
          <div class="photo-slide" style="flex-shrink:0;width:100%;height:280px;overflow:hidden;border-radius:8px;flex:none">
            <a href="${photo.link || googleImagesUrl(window.getPoiDisplayName(p), p.city)}" target="_blank" rel="noopener" title="${photo.author || ''}" style="display:block;width:100%;height:100%;text-decoration:none">
              <img src="${photo.url}" alt="${window.getPoiDisplayName(p)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .2s">
            </a>
          </div>
        `).join('');

        const sourceLabelMap = {
          google_places: '📷 Foto da Google Maps',
          google_custom_search: '📷 Foto da Google Search',
          wikipedia: '📷 Foto da Wikipedia',
          google_street_view: '📷 Foto da Google Street View',
          google_static_map: '📷 Mappa ufficiale Google Maps'
        };
        const uniqueSources = [...new Set(photos.map(photo => photo.source).filter(Boolean))];
        const sourceLabel = uniqueSources.length === 1
          ? sourceLabelMap[uniqueSources[0]] || '📷 Foto ufficiali'
          : '📷 Foto ufficiali da più fonti';

        container.outerHTML = `
          <div style="margin-bottom:12px">
            <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;display:flex;gap:8px;padding:0;scroll-behavior:smooth;width:100%;margin-bottom:6px">
              ${slides}
            </div>
            <div style="font-size:11px;color:var(--muted);text-align:center">${sourceLabel}</div>
          </div>
        `;
      } else {
        container.outerHTML = photoFallbackHtml('Nessuna foto Google Maps trovata', p);
      }
    } catch (err) {
      console.error('[loadPOIPhotos] Error:', err && err.message);
      container.outerHTML = photoFallbackHtml('Errore nel caricamento foto', p);
    }
  })();
}

// POI validation cache → js/poi-validation-cache.js (window.POIVerifiedDB)

async function enrichPOIData(p) {
  const cached = await window.POIVerifiedDB?.getVerifiedPOI?.(p.id);
  if (cached && !cached._notFound) {
    console.log('[enrichPOI] Using cached validation for', p.id);
    return Object.assign({}, p, cached);
  }
  try {
    const response = await fetch(
      `/api/enrichPOI?id=${encodeURIComponent(p.id)}&name=${encodeURIComponent(p.name || p.jp || p.id)}&lat=${p.lat}&lng=${p.lng}`
    );
    const data = await response.json();
    if (data.poi?.validated === true) {
      await window.POIVerifiedDB?.saveVerifiedPOI?.(data.poi);
      console.log('[enrichPOI] ✅ Validated & cached:', p.id);
      return Object.assign({}, p, data.poi);
    }
    if (data.poi && data.poi.error === 'Place not found on Google Maps') {
      await window.POIVerifiedDB?.saveNotFound?.(p.id);
    }
  } catch (err) {
    console.warn('[enrichPOI] Error enriching POI:', err.message);
  }
  return p;
}

function openPOI(id){
  console.log('%c[openPOI] Called with id:', 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold', id);
  const cached = window.getCachedAllPOIs();
  console.log('[openPOI] 🔎 Searching in', cached.length, 'POIs...');
  console.log('[openPOI] Available IDs (first 5):', cached.slice(0, 5).map(p => p.id).join(', '));
  console.log('[openPOI] Looking for id:', id);
  console.log('[openPOI] ID exists in cache:', cached.some(x => x.id === id) ? '✓ YES' : '✗ NO');

  let p = cached.find(x => x.id===id);
  console.log('[openPOI] Found POI:', p ? p.name : 'NOT FOUND');
  if (!p) {
    console.error('[openPOI] ❌ POI not found, returning');
    console.error('[openPOI] DEBUG: Trying to find matching id with different methods...');
    console.error('[openPOI] Exact match:', cached.filter(x => x.id === id).length);
    console.error('[openPOI] Contains match:', cached.filter(x => x?.id != null && id != null && String(x.id).includes(String(id))).length);
    return;
  }

  // Capture displayName here for use in async functions
  const displayName = window.getPoiDisplayName(p);

  // Show skeleton immediately so the user sees feedback on tap
  window.openSheet(displayName, '<div class="skeleton-poi"><div class="skeleton-block sk-photo"></div><div class="skeleton-block sk-title"></div><div class="skeleton-block sk-badge"></div><div class="skeleton-block sk-line"></div><div class="skeleton-block sk-line-s"></div><div class="skeleton-block sk-line"></div><div class="skeleton-block sk-btn"></div></div>');

  // Syncronizza con Google Places se non ancora verificato
  (async () => {
    const verified = await window.POISync?.ensurePOIVerified?.(p);
    if (verified) {
      p = { ...p, ...verified };
    }

    // NEW: Enrich con Google Places Details API
    if (window.GooglePlacesDetailsClient && p.googlePlaceId) {
      const enriched = await window.GooglePlacesDetailsClient.enrichPOI(p);
      if (enriched._details) p = enriched;
    }

    const html = poiDetailHTML(p);
    // Update sheet body in-place (sheet is already open)
    const _sb = document.getElementById('sheet-body');
    if (_sb && document.getElementById('sheet')?.classList.contains('open')) {
      _sb.innerHTML = html;
    } else {
      window.openSheet(displayName, html);
    }
    // ===== SETUP ADD-TO-ITINERARY BUTTON (MOVED INTO ASYNC BLOCK) =====
    setTimeout(() => {
      const addToItineraryBtn = document.getElementById('add-to-itinerary-btn');
      console.log('[WIZARD] add-to-itinerary button found:', !!addToItineraryBtn);

      if (addToItineraryBtn) {
        addToItineraryBtn.onclick = () => {
          console.log('[WIZARD] click registered');

          // FASE 1.4: Show day selector for adding POI to itinerary
          if (!window.ITINERARY) {
            console.error('[openPOI] ITINERARY system not available');
            window.toast(T('itin.systemNA', '❌ Sistema itinerario non pronto'));
            return;
          }

          window.currentPOI = p;
          const tripProfile = window.state?.tripProfile || {};
          const days = tripProfile.days || 8;
          const poiName = window.getPoiDisplayName(p);
          const poiId = p.id;

          console.log('[WIZARD] opening multi-step wizard for POI:', poiName);

          // Wizard state
          const wizardState = {
            step: 1,
            selectedDay: null,
            selectedTime: '10:00',
            duration: 60,
            notes: '',
            cost: 0,
            tag: 'cibo'
          };

          // Save to window for global handlers
          window._wizardPoiId = poiId;
          window._wizardPoiName = poiName;
          window._wizardState = wizardState;

          /**
           * Global handler for confirm button (called via onclick)
           */
          window._handleWizardConfirm = () => {
            console.log('[WIZARD] Confirm button clicked via onclick');
            const st = window._wizardState;
            const pid = window._wizardPoiId;
            const pname = window._wizardPoiName;

            // Capture notes directly from textarea
            const notesField = document.getElementById('wizard-notes-input');
            if (notesField) {
              st.notes = notesField.value.trim();
            }

            // Capture duration directly from input field
            const durationField = document.getElementById('wizard-duration-input');
            if (durationField) {
              const durVal = parseInt(durationField.value, 10);
              if (durVal > 0) st.duration = durVal;
            }

            // Capture cost directly from input field
            const costField = document.getElementById('wizard-cost-input');
            if (costField) {
              st.cost = parseFloat(costField.value) || 0;
            }

            console.log('[WIZARD] Confirming POI addition:', {
              poiId: pid,
              poiName: pname,
              day: st.selectedDay,
              time: st.selectedTime,
              duration: st.duration,
              notes: st.notes,
              cost: st.cost,
              tag: st.tag
            });

            // Validate that a day was selected
            if (st.selectedDay === null) {
              console.warn('[WIZARD] No day selected');
              window.toast('⚠️ Seleziona un giorno');
              return;
            }

            // Add POI with all details (lat/lng for optimizer + route map)
            const _pLat = (window.currentPOI && typeof window.currentPOI.lat === 'number') ? window.currentPOI.lat : (typeof p?.lat === 'number' ? p.lat : null);
            const _pLng = (window.currentPOI && typeof window.currentPOI.lng === 'number') ? window.currentPOI.lng : (typeof p?.lng === 'number' ? p.lng : null);
            const success = window.ITINERARY.addPOIToDay(
              pid,
              pname,
              st.selectedDay,
              st.selectedTime,
              st.duration,
              st.notes,
              st.cost,
              st.tag,
              _pLat,
              _pLng
            );

            if (success) {
              window.saveState?.();
              window.closeSheet();
              window.toast(`✅ Aggiunto al Day ${st.selectedDay + 1} alle ${st.selectedTime}`);
              console.log('[WIZARD] POI successfully added and sheet closed');
            } else {
              console.warn('[WIZARD] Failed to add POI');
              window.toast('❌ Errore nell\'aggiunta del POI');
            }
          };

          /**
           * Render wizard step
           */
          function renderWizardStep() {
            let html = '';

            if (wizardState.step === 1) {
              // STEP 1: Day selection
              const _tp = window.state?.tripProfile || {};
              const _start = _tp.startDate ? new Date(_tp.startDate) : new Date(2027, 3, 10);
              const _weekdayHours = window.currentPOI?.currentOpeningHours?.weekdayDescriptions || null;
              const _jsToGoogleDay = (d) => (d + 6) % 7; // Sun=6, Mon=0, ..., Sat=5
              html = `
                <div style="padding: 16px;">
                  <p style="color: #fff; margin-bottom: 16px; font-weight: 600;">${window.t ? window.t('wizard.step1') : '📅 STEP 1/4 — Scegli il giorno'}</p>
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    ${Array.from({length: days}, (_, i) => {
                      const isSelected = wizardState.selectedDay === i;
                      const dayDate = new Date(_start); dayDate.setDate(dayDate.getDate() + i);
                      let closedBadge = '';
                      if (_weekdayHours) {
                        const gIdx = _jsToGoogleDay(dayDate.getDay());
                        if (/chiuso|closed/i.test(_weekdayHours[gIdx] || '')) closedBadge = ' ⚠️';
                      }
                      return `
                        <button class="wizard-day-btn" data-day="${i}" style="
                          padding: 12px;
                          background: ${isSelected ? 'rgba(255, 107, 53, 0.4)' : 'rgba(255, 107, 53, 0.15)'};
                          border: 2px solid ${isSelected ? 'rgba(255, 107, 53, 0.8)' : 'rgba(255, 107, 53, 0.3)'};
                          color: var(--m-accent);
                          border-radius: 6px;
                          font-weight: 600;
                          cursor: pointer;
                          transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(255, 107, 53, 0.3)'" onmouseout="this.style.background='${isSelected ? 'rgba(255, 107, 53, 0.4)' : 'rgba(255, 107, 53, 0.15)'}'">
                          Day ${i + 1}${closedBadge}
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            } else if (wizardState.step === 2) {
              // STEP 2: Time selection with hours validation
              let hoursWarning = '';
              if (window.currentPOI?.opening_hours) {
                const timeMatch = wizardState.selectedTime.match(/^(\d{2}):(\d{2})$/);
                if (timeMatch) {
                  const inputHour = parseInt(timeMatch[1], 10), inputMin = parseInt(timeMatch[2], 10);
                  const inputMinutes = inputHour * 60 + inputMin;
                  const hoursStr = window.currentPOI.opening_hours;
                  const hoursRegex = /(\d{2}):(\d{2})–(\d{2}):(\d{2})/;
                  const match = hoursStr.match(hoursRegex);
                  if (match) {
                    const openHour = parseInt(match[1], 10), openMin = parseInt(match[2], 10);
                    const closeHour = parseInt(match[3], 10), closeMin = parseInt(match[4], 10);
                    const openMinutes = openHour * 60 + openMin;
                    const closeMinutes = closeHour * 60 + closeMin;
                    if (inputMinutes < openMinutes || inputMinutes >= closeMinutes) {
                      hoursWarning = `<div style="background:rgba(255,165,0,0.2);border:1px solid rgba(255,165,0,0.4);border-radius:5px;padding:10px;margin-top:10px;font-size:11px;color:rgba(255,200,100,0.9)">⚠️ Questo luogo apre ${hoursStr}. Vuoi continuare?</div>`;
                    }
                  }
                }
              }
              html = `
                <div style="padding: 16px;">
                  <p style="color: #fff; margin-bottom: 16px; font-weight: 600;">${window.t ? window.t('wizard.step2') : "🕐 STEP 2/4 — Scegli l'orario"}</p>
                  <div style="margin-bottom: 16px;">
                    <label style="display: block; color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">Orario (HH:MM)</label>
                    <input type="text" id="wizard-time-input" value="${wizardState.selectedTime}" placeholder="14:30" maxlength="5" style="
                      width: 100%;
                      padding: 10px;
                      background: rgba(255,255,255,0.08);
                      border: 1px solid rgba(255,255,255,0.2);
                      border-radius: 6px;
                      color: #fff;
                      font-size: 16px;
                      box-sizing: border-box;
                      font-family: 'Courier New', monospace;
                    ">
                    <p style="color: rgba(255,255,255,0.55); font-size: 11px; margin-top: 6px;">Formato: HH:MM (es: 14:30, 09:45)</p>
                    ${hoursWarning}
                  </div>
                  <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 16px;">Giorno selezionato: <strong style="color: var(--m-accent);">Day ${wizardState.selectedDay + 1}</strong></p>
                </div>
              `;
            } else if (wizardState.step === 3) {
              // STEP 3: Details (Duration, Notes, Cost)
              html = `
                <div style="padding: 16px; max-height: 400px; overflow-y: auto;">
                  <p style="color: #fff; margin-bottom: 16px; font-weight: 600;">${window.t ? window.t('wizard.step3') : '📋 STEP 3/4 — Dettagli (opzionali)'}</p>

                  <div style="margin-bottom: 14px;">
                    <label style="display: block; color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">${window.t ? window.t('wizard.duration') : '⏱️ Durata (minuti)'}</label>
                    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                      ${[30, 60, 90, 120, 180].map(d => `
                        <button class="duration-preset" data-duration="${d}" style="
                          flex: 1;
                          padding: 8px;
                          background: ${wizardState.duration === d ? 'rgba(74,124,89,0.4)' : 'rgba(255,255,255,0.04)'};
                          border: 1px solid ${wizardState.duration === d ? 'rgba(74,124,89,0.6)' : 'rgba(255,255,255,0.1)'};
                          color: ${wizardState.duration === d ? '#4ade80' : 'rgba(255,255,255,0.7)'};
                          border-radius: 4px;
                          font-size: 11px;
                          font-weight: 500;
                          cursor: pointer;
                          transition: all 0.2s;
                        " onmouseover="this.style.background='${wizardState.duration === d ? 'rgba(74,124,89,0.5)' : 'rgba(255,255,255,0.08)'}'" onmouseout="this.style.background='${wizardState.duration === d ? 'rgba(74,124,89,0.4)' : 'rgba(255,255,255,0.04)'}'">
                          ${d}m
                        </button>
                      `).join('')}
                    </div>
                    <input type="number" id="wizard-duration-input" value="${wizardState.duration}" min="5" max="480" placeholder="o inserisci manualmente" style="
                      width: 100%;
                      padding: 8px;
                      background: rgba(255,255,255,0.04);
                      border: 1px solid rgba(255,255,255,0.1);
                      border-radius: 4px;
                      color: #fff;
                      font-size: 12px;
                      box-sizing: border-box;
                    ">
                  </div>

                  <div style="margin-bottom: 14px;">
                    <label style="display: block; color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">💰 Costo (opzionale)</label>
                    <input type="number" id="wizard-cost-input" value="${wizardState.cost}" min="0" placeholder="Es: 15.50" style="
                      width: 100%;
                      padding: 8px;
                      background: rgba(255,255,255,0.04);
                      border: 1px solid rgba(255,255,255,0.1);
                      border-radius: 4px;
                      color: #fff;
                      font-size: 12px;
                      box-sizing: border-box;
                    ">
                  </div>

                  <div style="margin-bottom: 14px;">
                    <label style="display: block; color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">🏷️ Categoria</label>
                    <select id="wizard-tag-select" style="
                      width: 100%;
                      padding: 8px;
                      background: rgba(255,255,255,0.04);
                      border: 1px solid rgba(255,255,255,0.1);
                      border-radius: 4px;
                      color: #fff;
                      font-size: 12px;
                      box-sizing: border-box;
                    ">
                      <option value="cibo" ${wizardState.tag === 'cibo' ? 'selected' : ''}>🍽️ Cibo</option>
                      <option value="trasporti" ${wizardState.tag === 'trasporti' ? 'selected' : ''}>🚌 Trasporti</option>
                      <option value="ingressi" ${wizardState.tag === 'ingressi' ? 'selected' : ''}>🎫 Ingressi</option>
                      <option value="shopping" ${wizardState.tag === 'shopping' ? 'selected' : ''}>🛍️ Shopping</option>
                      <option value="altro" ${wizardState.tag === 'altro' ? 'selected' : ''}>📦 Altro</option>
                    </select>
                  </div>

                  <div>
                    <label style="display: block; color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 8px;">📝 Note personalizzate (opzionale)</label>
                    <textarea id="wizard-notes-input" placeholder="Es: Prenotare in anticipo, glutine-free disponibile..." style="
                      width: 100%;
                      padding: 8px;
                      background: rgba(255,255,255,0.04);
                      border: 1px solid rgba(255,255,255,0.1);
                      border-radius: 4px;
                      color: #fff;
                      font-size: 12px;
                      resize: vertical;
                      min-height: 60px;
                      box-sizing: border-box;
                      font-family: inherit;
                    ">${wizardState.notes}</textarea>
                  </div>
                </div>
              `;
            } else if (wizardState.step === 4) {
              // STEP 4: Summary & Confirm
              const _tp4 = window.state?.tripProfile || {};
              const _start4 = _tp4.startDate ? new Date(_tp4.startDate) : new Date(2027, 3, 10);
              const dayDate = new Date(_start4); dayDate.setDate(dayDate.getDate() + wizardState.selectedDay);
              const dayLabel = dayDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              html = `
                <div style="padding: 16px;">
                  <p style="color: #fff; margin-bottom: 16px; font-weight: 600;">${window.t ? window.t('wizard.step4') : '✅ STEP 4/4 — Riepilogo'}</p>

                  <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <div style="margin-bottom: 10px;">
                      <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📌 Punto di interesse</div>
                      <div style="font-size: 14px; color: #fff; font-weight: 600;">${poiName}</div>
                    </div>

                    <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                      <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📅 Data e orario</div>
                      <div style="font-size: 13px; color: rgba(255,255,255,0.9);">
                        <strong>Day ${wizardState.selectedDay + 1}</strong> · ${dayLabel}<br>
                        <strong>${wizardState.selectedTime}</strong>
                      </div>
                    </div>

                    <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                      <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">⏱️ Durata</div>
                      <div style="font-size: 13px; color: rgba(255,255,255,0.9);"><strong>${wizardState.duration}</strong> minuti</div>
                    </div>

                    <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                      <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">🏷️ Categoria</div>
                      <div style="font-size: 13px; color: rgba(255,255,255,0.9);"><strong>${['cibo', 'trasporti', 'ingressi', 'shopping', 'altro'].includes(wizardState.tag) ? wizardState.tag.charAt(0).toUpperCase() + wizardState.tag.slice(1) : 'Altro'}</strong></div>
                    </div>

                    ${wizardState.cost > 0 ? `
                      <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">💰 Costo</div>
                        <div style="font-size: 13px; color: rgba(255,255,255,0.9);"><strong>¥${wizardState.cost}</strong></div>
                      </div>
                    ` : ''}

                    ${wizardState.notes ? `
                      <div style="padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📝 Note</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.8); line-height: 1.4;">${wizardState.notes}</div>
                      </div>
                    ` : ''}
                  </div>

                  <p style="color: rgba(255,255,255,0.6); font-size: 12px; text-align: center;">Conferma per aggiungere alla tappa</p>
                </div>
              `;
            }

            return html;
          }

          /**
           * Update Y2K window content (including buttons)
           */
          function updateWizardUI() {
            // Find the Y2K window that contains wizard
            // Use robust method: find the correct Y2K window by searching from wizard elements
            let wizardContainer = null;
            let containerSource = '';

            // Method 1: Try to find from any wizard button (most reliable when multiple Y2K windows open)
            const wizardBtn = document.querySelector('.wizard-day-btn, .wizard-next-btn, .wizard-back-btn, .wizard-confirm-btn');
            if (wizardBtn) {
              const y2kWin = wizardBtn.closest('.y2k-win');
              if (y2kWin) {
                wizardContainer = y2kWin.querySelector('.y2k-win-body');
                containerSource = 'found via closest .y2k-win from wizard button';
              }
            }

            // Fallback 1: Direct selector (works when only one Y2K window open)
            if (!wizardContainer) {
              wizardContainer = document.querySelector('.y2k-win-body');
              containerSource = 'y2k-win-body direct selector';
            }

            // Fallback 2: Try sheet-body (legacy support)
            if (!wizardContainer) {
              wizardContainer = document.getElementById('sheet-body');
              containerSource = 'sheet-body fallback';
            }

            // Fallback 3: Find by wizard elements in DOM
            if (!wizardContainer) {
              wizardContainer = document.querySelector('.wizard-cancel-btn')?.closest('div');
              containerSource = 'closest div fallback';
            }

            if (!wizardContainer) {
              console.warn('[WIZARD] Could not find wizard container to update');
              return;
            }

            console.log('[WIZARD] Found container via:', containerSource, 'tag:', wizardContainer.tagName, 'id:', wizardContainer.id, 'class:', wizardContainer.className);

            // Re-render ENTIRE wizard (content + buttons), not just the content
            const fullWizardHTML = renderWizardStep() + `
              <div style="padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
                <!-- LEFT BUTTONS -->
                <button class="wizard-cancel-btn" style="
                  padding: 8px 12px;
                  background: rgba(255,255,255,0.04);
                  border: 1px solid rgba(255,255,255,0.1);
                  color: rgba(255,255,255,0.6);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 11px;
                  font-weight: 500;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
                  ✕ Annulla
                </button>

                ${wizardState.step > 1 ? `
                  <button class="wizard-back-btn" style="
                    padding: 8px 12px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.6);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: all 0.2s;
                    white-space: nowrap;
                  " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
                    ${window.t ? window.t('common.back') : '← Indietro'}
                  </button>
                ` : ''}

                <!-- SPACER -->
                <div style="flex: 1;"></div>

                <!-- RIGHT BUTTON -->
                ${wizardState.step < 4 ? `
                  <button class="wizard-next-btn" style="
                    padding: 8px 16px;
                    background: rgba(255, 107, 53, 0.3);
                    border: 1px solid rgba(255, 107, 53, 0.5);
                    color: var(--m-accent);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: all 0.2s;
                    white-space: nowrap;
                  " onmouseover="this.style.background='rgba(255, 107, 53, 0.4)'" onmouseout="this.style.background='rgba(255, 107, 53, 0.3)'">
                    ${window.t ? window.t('common.next') : 'Avanti →'}
                  </button>
                ` : `
                  <button class="wizard-confirm-btn" style="
                    padding: 8px 16px;
                    background: rgba(74,124,89,0.3);
                    border: 1px solid rgba(74,124,89,0.5);
                    color: #4ade80;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: all 0.2s;
                    white-space: nowrap;
                  " onmouseover="this.style.background='rgba(74,124,89,0.4)'" onmouseout="this.style.background='rgba(74,124,89,0.3)'">
                    ✓ Conferma
                  </button>
                `}
              </div>
            `;

            const headerTitle = (window.t ? [window.t('wizard.day'), window.t('wizard.time'), window.t('wizard.details'), window.t('wizard.summary')] : ['📅 Scegli il giorno', "🕐 Scegli l'orario", '📋 Dettagli', '✅ Riepilogo'])[wizardState.step - 1];

            // Update sheet header if exists
            const sheetHeader = document.querySelector('.sheet-header');
            if (sheetHeader) {
              sheetHeader.textContent = headerTitle;
            }

            // Update container with full wizard (content + buttons)
            wizardContainer.innerHTML = fullWizardHTML;

            // Re-attach handlers (must be done AFTER innerHTML update)
            attachWizardHandlers();

            console.log('[WIZARD] Step', wizardState.step, 'rendered with buttons');
          }

          /**
           * Expose wizard functions to global scope for onclick handlers
           */
          window._wizardSelectDay = (dayIndex) => {
            console.log('[WIZARD] ✅ Day selected:', dayIndex + 1);
            wizardState.selectedDay = dayIndex;
            wizardState.step = 2;
            updateWizardUI();
          };

          window._wizardSelectDuration = (duration) => {
            console.log('[WIZARD] ✅ Duration preset selected:', duration);
            wizardState.duration = duration;
            updateWizardUI();
          };

          window._wizardGoBack = () => {
            console.log('[WIZARD] 🔙 Back button clicked (via onclick)');
            if (wizardState.step > 1) {
              wizardState.step--;
              console.log('[WIZARD] ✅ Back clicked, now at step:', wizardState.step);
              updateWizardUI();
            }
          };

          window._wizardGoNext = () => {
            console.log('[WIZARD] ▶️ Next button clicked (via onclick)');
            if (wizardState.step === 1) wizardState.step = 2;
            else if (wizardState.step === 2) wizardState.step = 3;
            else if (wizardState.step === 3) wizardState.step = 4;
            console.log('[WIZARD] ✅ Next clicked, now at step:', wizardState.step);
            updateWizardUI();
          };

          window._wizardCancel = () => {
            console.log('[WIZARD] ❌ Wizard cancelled (via onclick)');
            // Reset global flags so next wizard opens fresh
            window._wizardClickListenerAttached = false;
            window._wizardChangeListenerAttached = false;
            window.closeSheet();
          };

          /**
           * Attach event handlers using document-level event delegation
           * (Wizard opens in Y2K window, not sheetBody)
           */
          function attachWizardHandlers() {
            console.log('[WIZARD DEBUG] attachWizardHandlers() called');

            // Remove old listener if it exists
            if (window._wizardClickListener) {
              document.removeEventListener('click', window._wizardClickListener, { capture: true });
              console.log('[WIZARD] ✅ Removed stale click listener');
            }

            console.log('[WIZARD] ✅ Attaching fresh click listener');

            // Create and save click listener (so it can be removed later)
            window._wizardClickListener = (e) => {
                const target = e.target;

                // Day selection
                if (target.classList.contains('wizard-day-btn')) {
                  const dayIndex = parseInt(target.dataset.day, 10);
                  console.log('[WIZARD] ✅ Day selected:', dayIndex + 1);
                  wizardState.selectedDay = dayIndex;
                  wizardState.step = 2;
                  e.stopImmediatePropagation(); // Prevent other listeners from firing
                  updateWizardUI();
                  return;
                }

                // Duration presets
                if (target.classList.contains('duration-preset')) {
                  const duration = parseInt(target.dataset.duration, 10);
                  console.log('[WIZARD] ✅ Duration preset selected:', duration);
                  wizardState.duration = duration;
                  updateWizardUI();
                  return;
                }

                // Back button (BEFORE next button for debugging)
                if (target.classList.contains('wizard-back-btn')) {
                  console.log('[WIZARD] 🔙 Back button clicked, current step:', wizardState.step);
                  if (wizardState.step > 1) {
                    wizardState.step--;
                    console.log('[WIZARD] ✅ Back clicked, now at step:', wizardState.step);
                    updateWizardUI();
                  } else {
                    console.warn('[WIZARD] ⚠️ Cannot go back from step 1');
                  }
                  return;
                }

                // Next button
                if (target.classList.contains('wizard-next-btn')) {
                  console.log('[WIZARD] ▶️ Next button clicked, current step:', wizardState.step);
                  if (wizardState.step === 1) wizardState.step = 2;
                  else if (wizardState.step === 2) {
                    // Capture time input value before advancing (change event only fires on blur)
                    const timeInput = document.getElementById('wizard-time-input');
                    if (timeInput) {
                      const timeVal = timeInput.value.trim();
                      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                      if (timeRegex.test(timeVal)) {
                        wizardState.selectedTime = timeVal;
                        console.log('[WIZARD] Time captured from input on next:', wizardState.selectedTime);
                      }
                    }
                    wizardState.step = 3;
                  }
                  else if (wizardState.step === 3) wizardState.step = 4;
                  console.log('[WIZARD] ✅ Next clicked, now at step:', wizardState.step);
                  updateWizardUI();
                  return;
                }

                // Cancel button
                if (target.classList.contains('wizard-cancel-btn')) {
                  console.log('[WIZARD] ❌ Wizard cancelled');
                  window.closeSheet();
                  return;
                }

                // Confirm button
                if (target.classList.contains('wizard-confirm-btn')) {
                  console.log('[WIZARD] Confirm button clicked');

                  // Capture notes directly from textarea
                  const notesField = document.getElementById('wizard-notes-input');
                  if (notesField) {
                    wizardState.notes = notesField.value.trim();
                  }

                  // Capture duration directly from input field
                  const durationField = document.getElementById('wizard-duration-input');
                  if (durationField) {
                    const durVal = parseInt(durationField.value, 10);
                    if (durVal > 0) wizardState.duration = durVal;
                  }

                  // Capture cost directly from input field
                  const costField = document.getElementById('wizard-cost-input');
                  if (costField) {
                    wizardState.cost = parseFloat(costField.value) || 0;
                  }

                  console.log('[WIZARD] Confirming POI:', {poiId, poiName, day: wizardState.selectedDay, time: wizardState.selectedTime});

                  // Validate day selected
                  if (wizardState.selectedDay === null) {
                    console.warn('[WIZARD] No day selected');
                    window.toast('⚠️ Seleziona un giorno');
                    return;
                  }

                  // Add POI (lat/lng for optimizer + route map)
                  const _pLat = (window.currentPOI && typeof window.currentPOI.lat === 'number') ? window.currentPOI.lat : (typeof p?.lat === 'number' ? p.lat : null);
                  const _pLng = (window.currentPOI && typeof window.currentPOI.lng === 'number') ? window.currentPOI.lng : (typeof p?.lng === 'number' ? p.lng : null);
                  const success = window.ITINERARY.addPOIToDay(
                    poiId,
                    poiName,
                    wizardState.selectedDay,
                    wizardState.selectedTime,
                    wizardState.duration,
                    wizardState.notes,
                    wizardState.cost,
                    wizardState.tag,
                    _pLat,
                    _pLng
                  );

                  if (success) {
                    window.saveState?.();
                    window.closeSheet();
                    window.toast(`✅ Aggiunto al Day ${wizardState.selectedDay + 1} alle ${wizardState.selectedTime}`);
                    console.log('[WIZARD] POI added successfully');
                  } else {
                    console.warn('[WIZARD] Failed to add POI');
                    window.toast('❌ Errore');
                  }
                  return;
                }
              };

              // Attach the saved listener
              document.addEventListener('click', window._wizardClickListener, { capture: true });
              console.log('[WIZARD] ✅ Click listener attached');

            // Input fields - Time, Duration, Cost, Notes (using change event delegation)
            // Remove old listener and attach fresh one
            if (window._wizardChangeListener) {
              document.removeEventListener('change', window._wizardChangeListener, { capture: true });
              console.log('[WIZARD] ✅ Removed stale change listener');
            }

            console.log('[WIZARD] ✅ Attaching fresh change listener');

              // Create fresh listener for this wizard session
              window._wizardChangeListener = (e) => {
                if (e.target.id === 'wizard-time-input') {
                  const timeVal = e.target.value.trim();
                  // Validate HH:MM format
                  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                  if (timeRegex.test(timeVal)) {
                    wizardState.selectedTime = timeVal;
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                    console.log('[WIZARD] Time selected:', wizardState.selectedTime);
                  } else {
                    e.target.style.borderColor = 'rgba(255, 107, 53, 0.6)';
                    console.warn('[WIZARD] Invalid time format:', timeVal);
                  }
                }
                if (e.target.id === 'wizard-duration-input') {
                  const val = parseInt(e.target.value, 10);
                  if (val > 0) {
                    wizardState.duration = val;
                    console.log('[WIZARD] Duration set to:', wizardState.duration);
                  }
                }
                if (e.target.id === 'wizard-cost-input') {
                  wizardState.cost = parseFloat(e.target.value) || 0;
                  console.log('[WIZARD] Cost set to:', wizardState.cost);
                }
                if (e.target.id === 'wizard-tag-select') {
                  wizardState.tag = e.target.value;
                  console.log('[WIZARD] Tag set to:', wizardState.tag);
                }
                if (e.target.id === 'wizard-notes-input') {
                  wizardState.notes = e.target.value.trim();
                  console.log('[WIZARD] Notes updated');
                }
              };

              document.addEventListener('change', window._wizardChangeListener, { capture: true });
              console.log('[WIZARD] ✅ Change listener attached');
          }

          /**
           * Create initial wizard content with controls
           */
          const wizardHTML = renderWizardStep() + `
            <div style="padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
              <!-- LEFT BUTTONS -->
              <button class="wizard-cancel-btn" style="
                padding: 8px 12px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.6);
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 500;
                transition: all 0.2s;
                white-space: nowrap;
              " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
                ✕ Annulla
              </button>

              ${wizardState.step > 1 ? `
                <button class="wizard-back-btn" style="
                  padding: 8px 12px;
                  background: rgba(255,255,255,0.04);
                  border: 1px solid rgba(255,255,255,0.1);
                  color: rgba(255,255,255,0.6);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 11px;
                  font-weight: 500;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
                  ${window.t ? window.t('common.back') : '← Indietro'}
                </button>
              ` : ''}

              <!-- SPACER -->
              <div style="flex: 1;"></div>

              <!-- RIGHT BUTTON -->
              ${wizardState.step < 4 ? `
                <button class="wizard-next-btn" style="
                  padding: 8px 16px;
                  background: rgba(255, 107, 53, 0.3);
                  border: 1px solid rgba(255, 107, 53, 0.5);
                  color: var(--m-accent);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 600;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.background='rgba(255, 107, 53, 0.4)'" onmouseout="this.style.background='rgba(255, 107, 53, 0.3)'">
                  ${window.t ? window.t('common.next') : 'Avanti →'}
                </button>
              ` : `
                <button class="wizard-confirm-btn" style="
                  padding: 8px 16px;
                  background: rgba(74,124,89,0.3);
                  border: 1px solid rgba(74,124,89,0.5);
                  color: #4ade80;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 600;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.background='rgba(74,124,89,0.4)'" onmouseout="this.style.background='rgba(74,124,89,0.3)'">
                  ✓ Conferma
                </button>
              `}
            </div>
          `;

          window.openSheet('📅 Aggiungi all\'itinerario', wizardHTML);

          // Attach handlers after sheet is opened
          setTimeout(() => {
            attachWizardHandlers();
            console.log('[WIZARD] Multi-step wizard initialized');
          }, 50);
        };
      }
    }, 20);

    // Inizializza logica GF detection (SOLO se ristorante)
    setTimeout(() => {
      const FOOD_TYPES = ['restaurant','food','cafe','bar','meal_takeaway','bakery'];
      const isRestaurant = FOOD_TYPES.includes(p.primaryType || p.cat);
      if (isRestaurant && window.initPOIDetail) {
        console.debug('[openPOI] Initializing GF detection');
        window.initPOIDetail(p, p._details || {}, p._reviews || []);
      }
    }, 100);

    // Aumenta la larghezza della finestra del POI per mostrare due colonne side-by-side
    setTimeout(() => {
      const winId = 'y2kwin-' + displayName.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20);
      const win = document.getElementById(winId);
      if (win) {
        win.style.width = '680px';
        console.log('[openPOI] ✅ Window width set to 680px for two-column layout');
      }
    }, 50);

    // Category editor - DOPO openSheet
    setTimeout(() => {
      const editCatBtn = document.getElementById('edit-cat-btn');
      const catSelector = document.getElementById('cat-selector');
      const catOptions = document.getElementById('cat-options');

      if (editCatBtn && catSelector && catOptions) {
        // Popola categorie
        catOptions.innerHTML = Object.entries(CATS)
          .filter(([k]) => k !== 'all')
          .map(([k, v]) => {
            const isSelected = (window.state.userCategoryOverrides?.[id] || p.cat) === k;
            return `<button class="btn" data-cat="${k}" style="font-size:11px;padding:8px;text-align:center;background:${isSelected ? '#FF1493' : '#f0f0f0'};color:${isSelected ? 'white' : '#333'};border:none;border-radius:4px;cursor:pointer">
              ${v.icon}<br>${v.label}
            </button>`;
          })
          .join('');

        // Click matita = toggle
        editCatBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          catSelector.style.display = catSelector.style.display === 'none' ? 'block' : 'none';
        };

        // Click categoria = salva
        catOptions.querySelectorAll('button[data-cat]').forEach(btn => {
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const newCat = btn.dataset.cat;
            if (!window.state.userCategoryOverrides) window.state.userCategoryOverrides = {};
            window.state.userCategoryOverrides[id] = newCat;
            window.saveState();
            window.toast(`✏️ Categoria cambiata a ${window.CATS[newCat]?.label || newCat}`);
            catSelector.style.display = 'none';
            openPOI(id);
          };
        });
      }
    }, 10);
  })();

  // Enrichisci il POI in background (non blocca UI)
  (async () => {
    const enriched = await enrichPOIData(p);
    if (enriched && enriched.validated) {
      console.log('[openPOI] POI enriched with Google data:', enriched);
      // Aggiorna la UI del POI detail se è ancora aperta
      const sheetBody = document.getElementById('sheet-body');
      if (sheetBody && enriched.rating) {
        // Aggiungi info Google Places se disponibile
        const ratingHtml = document.createElement('div');
        ratingHtml.style.cssText = 'background:var(--surface-2);padding:10px;border-radius:8px;margin:10px 0;border-left:3px solid var(--accent)';
        ratingHtml.innerHTML = `
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">📍 Google Places Data</div>
          <div style="font-weight:600;color:var(--text)">⭐ ${enriched.rating.toFixed(1)} (${enriched.review_count} recensioni)</div>
          ${enriched.phone ? `<div style="font-size:12px;margin-top:4px">📞 ${enriched.phone}</div>` : ''}
          ${enriched.website ? `<div style="font-size:12px;margin-top:4px"><a href="${enriched.website}" target="_blank" style="color:var(--accent)">🌐 Website</a></div>` : ''}
          ${enriched.is_open !== null ? `<div style="font-size:12px;margin-top:4px;color:${enriched.is_open ? 'var(--success)' : 'var(--danger)'}">⏰ ${enriched.is_open ? 'Aperto ora' : 'Chiuso ora'}</div>` : ''}
        `;
        sheetBody.insertBefore(ratingHtml, sheetBody.firstChild);
      }
    }

    // Analisi gluten-free per categorie food/drink
    // Priorità: place_id verificato > googlePlaceId (Google Places) > place_id locale > matching GF shops
    let placeIdForGF = null;

    // Primo: prova con place_id verificato (dalla sincronizzazione)
    const verifiedPOIGF = await window.POIVerifiedDB?.getVerifiedPOI?.(p.id);
    if (verifiedPOIGF?.googlePlaceId) {
      placeIdForGF = verifiedPOIGF.googlePlaceId;
      console.log('[openPOI] Using verified place_id for GF:', placeIdForGF);
    } else if (p.googlePlaceId) {
      // Google Places POI - usa il place_id di Google Places
      placeIdForGF = p.googlePlaceId;
      console.log('[openPOI] Using Google Places place_id for GF:', placeIdForGF);
    } else if (p.place_id) {
      // Local POI - usa il place_id locale
      placeIdForGF = p.place_id;
      console.log('[openPOI] Using local place_id for GF:', placeIdForGF);
    }

    // Se non ha place_id, prova a matchare con i GF shops caricati da Google Places
    if (!placeIdForGF && ['food', 'drink', 'restaurant', 'cafe', 'bar'].includes(p.cat)) {
      console.log('%c[openPOI] No place_id - searching GF shops match...', 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
      console.log(`[DEBUG] POI name: "${p.name}", city: "${p.city}"`);
      console.log(`[DEBUG] Available GF shops in ${p.city}:`, (window.allGlutenFreeShops || []).filter(s => s.city === p.city).map(s => s.name).slice(0, 10));

      const matchedShop = (window.allGlutenFreeShops || []).find(shop => {
        const nameMatch = shop.name && p.name && shop.name.toLowerCase().includes(p.name.toLowerCase().substring(0, 5));
        const cityMatch = shop.city === p.city;
        console.log(`[DEBUG] Testing "${shop.name}": name=${nameMatch}, city=${cityMatch}`);
        return nameMatch && cityMatch;
      });

      if (matchedShop && matchedShop.place_id) {
        placeIdForGF = matchedShop.place_id;
        console.log('%c[openPOI] ✅ MATCHED with GF shop!', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px', matchedShop.name, 'place_id:', placeIdForGF);
      } else {
        console.log('%c[openPOI] ❌ NO MATCH found in GF shops', 'background: #D9534F; color: white; padding: 4px 8px; border-radius: 3px');
      }
    }

    if (['food', 'drink', 'restaurant', 'cafe', 'bar'].includes(p.cat)) {
      console.log(`%c[openPOI] GF Check START for: ${p.name} (cat=${p.cat})`, 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
      if (placeIdForGF) {
        console.log('%c[openPOI] 🌐 Analyzing GF status', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px', p.name, 'with place_id:', placeIdForGF);
        const gfStatus = await window.analyzeGlutenFreeStatus(placeIdForGF, p.name, p.city);
        console.log('[openPOI] GF Analysis returned:', gfStatus);
        if (gfStatus && gfStatus.lvl !== 'unknown') {
          console.log('[openPOI] GF Analysis result:', gfStatus);
          // Aggiorna il POI con i dati GF
          if (!p.gf) p.gf = {};
          p.gf.lvl = gfStatus.lvl;
          p.gf.confidence = gfStatus.confidence;
          p.gf.mentions = gfStatus.mentions;
          p.gf.total_reviews = gfStatus.total_reviews;

          // Aggiorna la UI se è ancora aperta (sia sheet che Y2K window)
          const map = { full: ['✅ 100% Gluten Free','gf-full'], partial: ['⚠️ Opzioni GF','gf-partial'], no: ['❌ Contiene Gluten','gf-none'], unknown: ['❓ Sconosciuto',''] };
          const [label, cls] = map[gfStatus.lvl] || map.unknown;
          const gfHtml = `
            <h3>🌾 Analisi Gluten-Free</h3>
            <p><span class="tag ${cls}">${label}</span></p>
            <p style="font-size:12px;color:var(--muted);">Confidenza: ${gfStatus.confidence}% • ${gfStatus.mentions} menzioni su ${gfStatus.total_reviews} review</p>
            <div class="action-row" style="margin-top:8px">
              <a class="btn" href="https://www.findmeglutenfree.com/search?q=${encodeURIComponent((p.name || displayName) + ' ' + (p.city || '') + ' Japan')}" target="_blank" rel="noopener">🔍 Find Me Gluten Free</a>
            </div>
          `;

          // Update sheet and Y2K windows
          const sheetBody = document.getElementById('sheet-body');
          if (sheetBody) {
            const gfSection = sheetBody.querySelector('[data-gf-section]');
            if (gfSection) {
              gfSection.innerHTML = gfHtml;
              console.log('[openPOI] ✅ GF section updated in sheet');
            }
          }

          const y2kWindows = document.querySelectorAll('.y2k-win-body');
          y2kWindows.forEach(win => {
            const gfSection = win.querySelector('[data-gf-section]');
            if (gfSection) {
              gfSection.innerHTML = gfHtml;
              console.log('[openPOI] ✅ GF section updated in Y2K window');
            }
          });
        } else {
          // Analysis failed or unknown - show fallback
          console.log('%c[openPOI] ⚠️ GF analysis failed or unknown', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px');
          const gfHtml = `
            <h3>🌾 Gluten-Free</h3>
            <p><span class="tag gf-none">❌ Nessun dato disponibile</span></p>
            <p style="font-size:12px;color:var(--muted);">Impossibile verificare lo stato gluten-free da Google Reviews. Verifica manualmente:</p>
            <div class="action-row" style="margin-top:8px">
              <a class="btn" href="https://www.findmeglutenfree.com/search?q=${encodeURIComponent((p.name || displayName) + ' ' + (p.city || '') + ' Japan')}" target="_blank" rel="noopener">🔍 Find Me Gluten Free</a>
            </div>
          `;

          const sheetBody = document.getElementById('sheet-body');
          if (sheetBody) {
            const gfSection = sheetBody.querySelector('[data-gf-section]');
            if (gfSection) {
              gfSection.innerHTML = gfHtml;
              console.log('[openPOI] ⚠️ GF fallback shown in sheet');
            }
          }
        }
      } else {
        console.log('%c[openPOI] ⏭️ GF analysis skipped (no place_id found)', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px');
        // Show Find Me Gluten Free fallback even without place_id
        const gfHtml = `
          <h3>🌾 Gluten-Free</h3>
          <p><span class="tag gf-none">❓ Nessun dato disponibile</span></p>
          <p style="font-size:12px;color:var(--muted);">Verifica lo status gluten-free:</p>
          <div class="action-row" style="margin-top:8px">
            <a class="btn" href="https://www.findmeglutenfree.com/search?q=${encodeURIComponent((p.name || displayName) + ' ' + (p.city || '') + ' Japan')}" target="_blank" rel="noopener">🔍 Find Me Gluten Free</a>
          </div>
        `;

        const sheetBody = document.getElementById('sheet-body');
        if (sheetBody) {
          const gfSection = sheetBody.querySelector('[data-gf-section]');
          if (gfSection) {
            gfSection.innerHTML = gfHtml;
            console.log('[openPOI] ❓ GF no-data fallback shown');
          }
        }
      }
    }
  })();

  if (!p.photos && !p.photo && typeof window.getPhotosForLocation === 'function') {
    loadPOIPhotos(p);
  }
  // Star rating
  const starsEl = document.getElementById(`stars-${id}`);
  if (starsEl) starsEl.querySelectorAll('.star').forEach(s => {
    s.onclick = () => {
      const n = parseInt(s.dataset.star,10);
      if (!window.state.ratings) window.state.ratings = {};
      window.state.ratings[id] = n;
      window.saveState();
      starsEl.querySelectorAll('.star').forEach(x => x.classList.toggle('on', parseInt(x.dataset.star,10)<=n));
      window.toast(T('toast.ratingSaved', 'Voto salvato ⭐'));
    };
  });
  const savePoiBtn = document.getElementById('save-poi');
  if (savePoiBtn) savePoiBtn.onclick = () => {
    const i = window.state.savedPOIs.indexOf(id);
    if (i>=0) window.state.savedPOIs.splice(i,1); else window.state.savedPOIs.push(id);
    window.saveState(); openPOI(id); window.toast(i>=0 ? (window.t ? window.t('poi.unsaved','Rimosso') : 'Rimosso') : (window.t ? window.t('poi.saved','Salvato ★') : 'Salvato ★'));
  };
  const noteEl = document.getElementById('poi-note');
  if (noteEl) {
    noteEl.addEventListener('input', e => {
      window.state.notes[id] = e.target.value; window.saveState();
    });
  }
  const addCalBtn = document.getElementById('add-cal');
  if (addCalBtn) addCalBtn.onclick = () => window.promptAddToCalendar(p);
}

  window.gfTag = gfTag;
  window.renderEnhancedPoiSections = renderEnhancedPoiSections;
  window.poiDetailHTML = poiDetailHTML;
  window.loadPOIPhotos = loadPOIPhotos;
  window.__openPOI = openPOI;
  window.openPOI = openPOI;
})();
