/**
 * POI SECTION BUILDERS — Conditional dynamic sections
 *
 * Each function returns HTML string if data exists, or empty string if not.
 * Used by poiDetailHTML() to build adaptive layouts per POI type.
 */

// i18n helper (fallback all'italiano se window.t non disponibile)
const PSB_T = (k, fb) => (window.t ? window.t(k, fb) : (fb || k));

/**
 * HEADER COMPATTO RIDISEGNATO
 * Layout: [EMOJI] CATEGORIA [EDIT] su riga 1
 *         NOME POI (bold, grande) su riga 2
 *         📍 Città · ⭐ Rating · 🟢 Status su riga 3
 */
function renderHeaderCompact(poi, displayName, catColor, catEmoji, isEditing = false) {
  if (!displayName) return '';

  const parts = [];
  if (poi.city) parts.push(`📍 ${poi.city}`);
  if (poi.rating) parts.push(`⭐ ${poi.rating.toFixed(1)} (${poi.ratingCount || 0})`);

  // Status badge con chip colorato - MIGLIORE LEGGIBILITÀ
  let statusBadge = '';
  if (poi.openNow !== null) {
    const isOpen = poi.openNow === true;
    statusBadge = `<span class="status-${isOpen ? 'open' : 'closed'}" style="
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 999px;
      background: ${isOpen ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)'};
      color: ${isOpen ? '#16a34a' : '#dc2626'};
      font-size:13px;
      font-weight: 600;
    ">${isOpen ? PSB_T('poi.open') : PSB_T('poi.closed')}</span>`;
    parts.push(statusBadge);
  }

  const metadataRow = parts.join(' · ');

  // Mappa categorie inglesi → italiano
  const catLabels = {
    'restaurant': PSB_T('cat.restaurant'),
    'food': PSB_T('cat.food'),
    'cafe': PSB_T('cat.cafe'),
    'bar': PSB_T('cat.bar'),
    'meal_takeaway': PSB_T('cat.takeaway'),
    'bakery': PSB_T('cat.bakery'),
    'izakaya': PSB_T('cat.izakaya'),
    'museum': PSB_T('cat.museum'),
    'shrine': PSB_T('cat.shrine'),
    'temple': PSB_T('cat.temple'),
    'church': PSB_T('cat.church'),
    'landmark': PSB_T('cat.landmark'),
    'tourist_attraction': PSB_T('cat.attraction'),
    'post_office': PSB_T('cat.postoffice'),
    'services': PSB_T('cat.services')
  };
  const catLabel = catLabels[poi.cat] || (poi.cat ? poi.cat.charAt(0).toUpperCase() + poi.cat.slice(1) : 'POI');

  return `
    <!-- Row 1: Category - MINI header -->
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px 4px 16px;
      margin-bottom: 0;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 4px;
        font-size:12px;
        font-weight: 500;
        color: var(--l-muted);
        letter-spacing: 0.2px;
      ">
        <span style="font-size:16px;">${catEmoji}</span>
        <span>${catLabel}</span>
      </div>
      <button id="edit-cat-btn" style="
        background: transparent;
        border: none;
        color: var(--l-muted);
        cursor: pointer;
        font-size:14px;
        padding: 2px 4px;
        opacity: 0.5;
        transition: opacity 0.2s;
      " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='0.5'">✏️</button>
    </div>

    <!-- Row 2: Name - Ultra-compact -->
    <div style="padding: 2px 16px 0 16px;">
      <h2 style="
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--l-ink);
        word-wrap: break-word;
        line-height: 1.3;
      ">${displayName}</h2>
    </div>

    <!-- Row 3: Metadata - Tight -->
    ${metadataRow ? `
      <div style="
        font-size:14px;
        color: var(--l-muted);
        line-height: 1.3;
        padding: 2px 16px 0 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 0;
      ">
        ${metadataRow}
      </div>
    ` : ''}

    <!-- Divider - Minimal spacing -->
    <div style="height: 1px; background: var(--l-hair); margin: 8px 0 0 0"></div>
  `;
}

/**
 * Opening hours accordion
 */
function renderOpeningHours(details) {
  if (!details?.currentOpeningHours) return '';

  const hours = details.currentOpeningHours;
  if (!hours.weekdayDescriptions || hours.weekdayDescriptions.length === 0) return '';

  const uid = `hours-${Date.now()}`;

  return `
    <div style="
      background: rgba(20, 30, 60, 0.03);
      border: 1px solid var(--l-hair);
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
    ">
      <button onclick="document.getElementById('${uid}').style.display = document.getElementById('${uid}').style.display === 'none' ? 'block' : 'none'" style="
        width: 100%;
        padding: 12px;
        background: transparent;
        border: none;
        color: var(--l-ink);
        font-weight: 600;
        cursor: pointer;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span>🕐</span>
        <span>${PSB_T('poi.hours')}</span>
        <span style="margin-left: auto; font-size:14px;">▼</span>
      </button>

      <div id="${uid}" style="
        padding: 12px;
        border-top: 1px solid var(--l-hair);
        display: none;
        font-size:14px;
      ">
        ${hours.weekdayDescriptions.map(desc => `
          <div style="
            padding: 6px 0;
            color: var(--l-muted);
            line-height: 1.4;
          ">${desc}</div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Address section
 */
function renderAddress(poi, details) {
  const address = details?.address || poi.address || null;
  if (!address) return '';

  return `
    <div style="
      background: rgba(20, 30, 60, 0.03);
      border: 1px solid var(--l-hair);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    ">
      <div style="
        font-weight: 600;
        font-size:14px;
        color: var(--l-muted);
        margin-bottom: 6px;
      ">📍 ${PSB_T('poi.address')}</div>
      <div style="
        font-size:15px;
        color: var(--l-ink);
        line-height: 1.4;
        word-break: break-word;
      ">${address}</div>
    </div>
  `;
}

/**
 * Website link
 */
function renderWebsite(details) {
  const url = details?.websiteUri || null;
  if (!url) return '';

  const domain = new URL(url).hostname.replace('www.', '');

  return `
    <a href="${url}" target="_blank" rel="noopener" style="
      display: block;
      background: rgba(2, 132, 199, 0.08);
      border: 1px solid rgba(2, 132, 199, 0.25);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      color: #0284c7;
      text-decoration: none;
      font-size:15px;
      transition: background 0.2s;
    " onmouseover="this.style.background='rgba(2, 132, 199, 0.14)'" onmouseout="this.style.background='rgba(2, 132, 199, 0.08)'">
      🌐 ${domain}
    </a>
  `;
}

/**
 * Phone number
 */
function renderPhone(details) {
  const phone = details?.nationalPhoneNumber || null;
  if (!phone) return '';

  const cleanPhone = phone.replace(/\s+/g, '');

  return `
    <a href="tel:${cleanPhone}" style="
      display: block;
      background: rgba(224, 65, 78, 0.08);
      border: 1px solid rgba(224, 65, 78, 0.25);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      color: var(--l-accent-600);
      text-decoration: none;
      font-size:15px;
      transition: background 0.2s;
    " onmouseover="this.style.background='rgba(224, 65, 78, 0.14)'" onmouseout="this.style.background='rgba(224, 65, 78, 0.08)'">
      📞 ${phone}
    </a>
  `;
}

/**
 * Description from Places API (with fallback)
 */
function renderDescription(details) {
  const text = (details?.editorialSummary || '').trim();
  if (!text) return ''; // Non renderizzare se vuoto o solo spazi

  return `
    <div style="
      background: rgba(20, 30, 60, 0.03);
      border: 1px solid var(--l-hair);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      font-size:15px;
      color: var(--l-ink);
      line-height: 1.5;
    ">
      ${text}
    </div>
  `;
}

/**
 * Restaurant attributes: Gluten-Free, Vegetarian, Lunch/Dinner, Alcohol, Takeaway, Reservable
 */
function renderRestaurantAttributes(poi, details) {
  // Only show for food-related POIs
  if (!['restaurant', 'cafe', 'bar', 'food', 'izakaya', 'bakery'].includes(poi.cat)) {
    return '';
  }

  if (!details) return '';

  const attributes = [
    { flag: details.servesVegetarianFood, label: PSB_T('poi.veg') },
    { flag: details.servesDinner, label: PSB_T('poi.dinner') },
    { flag: details.servesLunch, label: PSB_T('poi.lunch') },
    { flag: details.servesBeer, label: PSB_T('poi.alcohol') },
    { flag: details.takeout, label: PSB_T('poi.takeaway') },
    { flag: details.reservable, label: PSB_T('poi.reservable') }
  ];

  const activeAttrs = attributes
    .filter(a => a.flag === true)
    .map(a => `
      <span style="
        display: inline-block;
        background: rgba(20, 30, 60, 0.055);
        border: 1px solid var(--l-hair);
        border-radius: 6px;
        padding: 6px 10px;
        font-size:13px;
        color: var(--l-ink);
        font-weight: 600;
      ">${a.label}</span>
    `)
    .join('');

  if (!activeAttrs) return '';

  return `
    <div style="
      background: rgba(20, 30, 60, 0.02);
      border: 1px solid var(--l-hair);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    ">
      <div style="
        font-weight: 600;
        font-size:13px;
        color: var(--l-muted);
        margin-bottom: 8px;
        text-transform: uppercase;
      ">🍴 ${PSB_T('poi.features')}</div>
      <div style="
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      ">
        ${activeAttrs}
      </div>
    </div>
  `;
}

/**
 * Price level (€, €€, €€€, €€€€)
 */
function renderPriceLevel(details) {
  const level = details?.priceLevel;
  if (!level) return '';

  const priceEmoji = {
    'PRICE_LEVEL_INEXPENSIVE': '€',
    'PRICE_LEVEL_MODERATE': '€€',
    'PRICE_LEVEL_EXPENSIVE': '€€€',
    'PRICE_LEVEL_VERY_EXPENSIVE': '€€€€'
  };

  const emoji = priceEmoji[level] || '€';

  return `
    <div style="
      display: inline-block;
      background: rgba(180, 83, 9, 0.1);
      border: 1px solid rgba(180, 83, 9, 0.3);
      border-radius: 6px;
      padding: 6px 10px;
      font-size:14px;
      color: #b45309;
      font-weight: 700;
      margin-bottom: 12px;
    ">
      💰 ${emoji}
    </div>
  `;
}

/**
 * Suggested visit duration (for museums, attractions)
 */
function renderSuggestedDuration(poi) {
  // Only for attractions, museums, etc.
  if (!['museum', 'tourist_attraction', 'shrine', 'temple', 'church', 'landmark'].includes(poi.cat)) {
    return '';
  }

  const defaults = {
    'museum': '2-3 ore',
    'tourist_attraction': '1-2 ore',
    'shrine': '30-45 min',
    'temple': '30-45 min',
    'church': '20-30 min',
    'landmark': '20-30 min'
  };

  const duration = poi.duration || defaults[poi.cat] || '1 ora';

  return `
    <div style="
      background: rgba(2, 132, 199, 0.08);
      border: 1px solid rgba(2, 132, 199, 0.25);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      font-size:15px;
      color: var(--l-ink);
    ">
      <div style="font-weight: 600; margin-bottom: 4px;">${PSB_T('poi.suggestedTime')}</div>
      <div>${duration}</div>
    </div>
  `;
}

/**
 * Ticket/entrance fee
 */
function renderEntranceFee(poi) {
  if (!poi.ticket && poi.paid !== true) return '';

  const fee = poi.ticket || poi.cost || PSB_T('poi.paidEntry');

  return `
    <div style="
      background: rgba(224, 65, 78, 0.08);
      border: 1px solid rgba(224, 65, 78, 0.25);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      font-size:15px;
      color: var(--l-ink);
    ">
      <div style="font-weight: 600; margin-bottom: 4px;">${PSB_T('poi.entrance')}</div>
      <div>${fee}</div>
    </div>
  `;
}

// Export all
window.PoiSectionBuilders = {
  renderHeaderCompact,
  renderOpeningHours,
  renderAddress,
  renderWebsite,
  renderPhone,
  renderDescription,
  renderRestaurantAttributes,
  renderPriceLevel,
  renderSuggestedDuration,
  renderEntranceFee
};

console.log('[PoiSectionBuilders] Module loaded');
