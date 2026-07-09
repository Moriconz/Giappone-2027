// ============================================================================
// poi-detail/poi-detail-template.js — template HTML della card POI (sezioni 1-12)
// Estratto da poi-detail-view.js (nessun cambio di comportamento).
// Deps (window.*): state, CATS, getCategoryColor, getCategoryEmoji,
//   getPoiDisplayName, PoiSectionBuilders, PhotoGallery, PoiDetailHelpers, t
// Espone: window.renderEnhancedPoiSections, window.poiDetailHTML
// ============================================================================
(function () {
  'use strict';

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
          <div style="width:100%;height:100%;background:linear-gradient(135deg,rgba(74,91,168,0.2),rgba(255,107,53,0.2));display:flex;align-items:center;justify-content:center;color:#999;font-size:14px">
            📷 Foto ${idx + 1}
          </div>
        </div>
      `;
    }).join('');

    sections.push(`
      <div style="background:linear-gradient(135deg,rgba(74,91,168,0.06),rgba(30,50,80,0.06));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid var(--l-hair);border-radius:14px;padding:14px;margin-bottom:16px">
        <h3 style="margin:0 0 12px 0;color:var(--l-ink);font-size:16px;font-weight:700">📸 Galleria Foto</h3>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;display:flex;gap:8px;padding:0;scroll-behavior:smooth;width:100%">
          ${slides}
        </div>
        <div style="font-size:13px;color:var(--l-muted);text-align:center;margin-top:8px">${p._photoNames.length} foto disponibili</div>
      </div>
    `);
  }

  // ===== REVIEWS =====
  if (details.reviews && details.reviews.length > 0) {
    const reviewCards = details.reviews.slice(0, 3).map(review => {
      const stars = Array(review.rating).fill('⭐').join('');
      return `
        <div style="background:rgba(20,30,60,0.04);border:1px solid var(--l-hair);border-radius:10px;padding:12px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
            <div style="font-weight:600;color:var(--l-ink);font-size:15px">${review.author}</div>
            <div style="color:#b45309;font-size:14px">${stars}</div>
          </div>
          <div style="color:var(--l-ink);font-size:14px;line-height:1.5;margin-bottom:4px">"${review.text.substring(0, 120)}${review.text.length > 120 ? '...' : ''}"</div>
          <div style="color:var(--l-muted);font-size:14px">${review.relativePublishTimeDescription}</div>
        </div>
      `;
    }).join('');

    sections.push(`
      <div style="background:linear-gradient(135deg,rgba(74,91,168,0.06),rgba(30,50,80,0.06));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid var(--l-hair);border-radius:14px;padding:14px;margin-bottom:16px">
        <h3 style="margin:0 0 12px 0;color:var(--l-ink);font-size:16px;font-weight:700">⭐ Recensioni (${details.reviews.length} totali)</h3>
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
        return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--l-hair);color:var(--l-ink);font-size:14px">
          <span>${day.split(':')[0]}</span>
          <span style="font-weight:600;color:#b45309">${day.includes(':') ? day.split(': ')[1] : 'Chiuso'}</span>
        </div>`;
      }).join('');
    }

    if (hoursHtml) {
      sections.push(`
        <div style="background:linear-gradient(135deg,rgba(74,91,168,0.06),rgba(30,50,80,0.06));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid var(--l-hair);border-radius:14px;padding:14px;margin-bottom:16px">
          <h3 style="margin:0 0 12px 0;color:var(--l-ink);font-size:16px;font-weight:700">⏰ Orari (Prossimi 7 giorni)</h3>
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
      <span style="background:linear-gradient(135deg,rgba(255,107,53,0.16),var(--l-accent-soft));border:1px solid rgba(255,107,53,0.5);color:var(--l-ink);padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;display:inline-block">
        ${attr.label}
      </span>
    `).join('');

    sections.push(`
      <div style="background:linear-gradient(135deg,rgba(74,91,168,0.06),rgba(30,50,80,0.06));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid var(--l-hair);border-radius:14px;padding:14px;margin-bottom:16px">
        <h3 style="margin:0 0 12px 0;color:var(--l-ink);font-size:16px;font-weight:700">🏷️ Caratteristiche</h3>
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
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;color:var(--l-ink);font-size:14px;border-bottom:1px solid var(--l-hair)">
          <span style="font-size:16px">✓</span>
          <span>${item}</span>
        </div>
      `).join('');

      sections.push(`
        <div style="background:linear-gradient(135deg,rgba(74,124,89,0.08),rgba(100,150,110,0.08));backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(22,163,74,0.25);border-radius:14px;padding:14px;margin-bottom:16px">
          <h3 style="margin:0 0 12px 0;color:#16a34a;font-size:16px;font-weight:700">♿ Accessibilità</h3>
          ${items}
        </div>
      `);
    }
  }

  return sections.join('');
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
  const isRestaurant = window.PoiDetailHelpers.isRestaurantPOI(p);
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
      photoHtml = `<div style="width:100%;height:260px;background:linear-gradient(135deg,rgba(22,163,74,.06),var(--l-accent-soft));border-radius:12px 12px 0 0;margin-bottom:16px;display:flex;align-items:center;justify-content:center;color:var(--l-muted)">📷 Foto non disponibili</div>`;
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // REORDERED LAYOUT FOR RAPID DECISION-MAKING (FASE 1.3)
  // Extract sections in new order for better UX
  // ═════════════════════════════════════════════════════════════════

  // Get readable subtype label (category/subcategory)
  const poiSubtypeLabel = window.PoiDetailHelpers.getReadableSubtypeLabel(p);

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
          background: rgba(20, 30, 60, 0.03);
          border: 1px solid var(--l-hair);
          border-radius: 8px;
          padding: 8px 10px;
          font-size:14px;
          color: var(--l-muted);
          opacity: 0.85;
        ">
          <span class="gf-spinner" style="
            width: 10px;
            height: 10px;
            border: 1.5px solid rgba(20, 30, 60, 0.15);
            border-top-color: #16a34a;
            border-radius: 50%;
            display: inline-block;
            flex-shrink: 0;
            animation: spin 0.8s linear infinite;
          "></span>
          <div style="flex: 1; line-height: 1.3; color: var(--l-muted);">
            Verifica gluten-free in corso…
          </div>
        </div>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
          .gf-box.gf-unknown {
            background: rgba(20, 30, 60, 0.04) !important;
            border: 1px solid var(--l-hair) !important;
            color: var(--l-ink) !important;
          }
          .gf-box.gf-unknown strong {
            color: var(--l-ink) !important;
          }
          .gf-box.gf-unknown small {
            color: var(--l-muted) !important;
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
        font-size:14px;
        color: var(--l-muted);
        font-weight: 500;
        margin-bottom: 0;
      ">${poiSubtypeLabel}</div>
      <div style="height: 1px; background: var(--l-hair); margin: 6px 0 12px 0"></div>
    ` : ''}

    <!-- 4. BRIEF DESCRIPTION (earlier for context) -->
    ${descriptionHtml}

    <!-- 5. GF STATUS (prominent, only for restaurants) -->
    ${gfStatusHtml}

    <!-- 5b. GF CROWDSOURCE (riscontri del gruppo, auto-iniettato da gf-crowdsource.js) -->
    <div data-gf-crowd="${p.id}" data-gf-crowd-name="${(displayName||'').replace(/"/g,'&quot;')}"></div>
    <div data-gf-menu="${p.id}" data-gf-menu-name="${(displayName||'').replace(/"/g,'&quot;')}"></div>

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
      <label style="font-size:15px;color:var(--l-muted);font-weight:600;white-space:nowrap">La tua valutazione</label>
      ${stars}
    </div>

    <!-- LEGACY SECTIONS (fallback) -->
    ${enhancedSections}

    <!-- DIVIDER — separates from main action -->
    <div style="height:1px;background:var(--l-hair);margin:16px 0"></div>

    <!-- 10. MAIN CTA: ADD TO ITINERARY (prominent, ruggine saturo) -->
    <!-- Zona azioni: TUTTE le sezioni (CTA, nota, riga secondaria) condividono
         inset orizzontale 16px e ritmo verticale 12px — l'allineamento a
         sinistra di "Aggiungi una nota" era dovuto a un inset diverso
         (token --space-lg = 14px su mobile) e a un bottone content-width. -->
    <div style="display:flex;flex-direction:column;gap:12px;margin:16px 16px 12px">
      <button id="add-to-itinerary-btn" class="btn-cta" style="margin:0;">${window.t ? window.t('poi.addToItinerary') : "📅 Aggiungi all'itinerario"}</button>
      <button id="propose-to-group-btn" style="width:100%;padding:12px;background:rgba(22,163,74,0.12);border:1.5px solid rgba(22,163,74,0.4);border-radius:10px;color:var(--l-ink);font-size:16px;font-weight:700;cursor:pointer;">🗳️ ${window.t ? window.t('poi.proposeGroup', 'Proponi al gruppo') : 'Proponi al gruppo'}</button>
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
    <!-- I tre bottoni sono flex child DIRETTI dello stesso tipo/box-model
         (prima "Apri mappa" era avvolto in un <div> per il dropdown, mentre
         gli altri due erano <button> diretti: quell'asimmetria di markup
         faceva calcolare a Chrome larghezze diverse a schermi stretti, anche
         con flex:1 identico su tutti — bottoni visibilmente disallineati.
         Il menu a tendina resta assoluto rispetto alla riga (posizionamento
         invariato), ma ora è un fratello fuori flusso, non un contenitore. -->
    <div style="display:flex;gap:8px;margin:12px 16px;justify-content:space-between;position:relative">
      <button class="btn-maps-dropdown" data-poi-id="${p.id}" style="
        flex:1;
        min-height:40px;
        padding:6px 8px;
        background:transparent;
        border:1px solid var(--l-hair);
        color:var(--l-muted);
        border-radius:8px;
        cursor:pointer;
        font-weight:600;
        font-size:14px;
        white-space:nowrap;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        transition:all 0.2s;
      " onmouseover="this.style.borderColor='rgba(20,30,60,0.3)';this.style.color='var(--l-ink)'" onmouseout="this.style.borderColor='var(--l-hair)';this.style.color='var(--l-muted)'">
        🧭 Mappa
      </button>

      <!-- Dropdown menu (hidden by default) — fuori flusso, non conta nel flex -->
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
          font-size:15px;
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
          font-size:15px;
          transition:background 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
          🍎 Apple Maps
        </a>
      </div>

      <button class="btn-secondary" id="save-poi" style="
        flex:1;
        min-height:40px;
        padding:6px 8px;
        background:transparent;
        border:1px solid var(--l-hair);
        color:var(--l-muted);
        border-radius:8px;
        cursor:pointer;
        font-weight:500;
        font-size:14px;
        white-space:nowrap;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        transition:all 0.2s;
      " onmouseover="this.style.borderColor='rgba(20,30,60,0.25)';this.style.color='var(--l-ink)'" onmouseout="this.style.borderColor='var(--l-hair)';this.style.color='var(--l-muted)'">${saved?'⭐ Salvato':'☆ Salva'}</button>

      <button class="btn-secondary" id="add-cal" style="
        flex:1;
        min-height:40px;
        padding:6px 8px;
        background:transparent;
        border:1px solid var(--l-hair);
        color:var(--l-muted);
        border-radius:8px;
        cursor:pointer;
        font-weight:500;
        font-size:14px;
        white-space:nowrap;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        transition:all 0.2s;
      " onmouseover="this.style.borderColor='rgba(20,30,60,0.25)';this.style.color='var(--l-ink)'" onmouseout="this.style.borderColor='var(--l-hair)';this.style.color='var(--l-muted)'">📅 Calendario</button>
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

  window.renderEnhancedPoiSections = renderEnhancedPoiSections;
  window.poiDetailHTML = poiDetailHTML;
})();
