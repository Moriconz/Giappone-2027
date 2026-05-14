/**
 * POI SECTION BUILDERS — Conditional dynamic sections
 *
 * Each function returns HTML string if data exists, or empty string if not.
 * Used by poiDetailHTML() to build adaptive layouts per POI type.
 */

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
  if (poi.openNow !== null) {
    parts.push(poi.openNow ? '🟢 Aperto' : '🔴 Chiuso');
  }

  const metadataRow = parts.join(' · ');

  return `
    <div style="
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 16px;
    ">
      <!-- Row 1: Category + Edit -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">
          <span style="font-size: 16px;">${catEmoji}</span>
          <span>CIBO</span>
        </div>
        <button id="edit-cat-btn" style="
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        ">✏️</button>
      </div>

      <!-- Row 2: Name (FIX: flex: 1, minWidth: 0 per evitare rendering verticale) -->
      <h2 style="
        margin: 0 0 6px 0;
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        flex: 1;
        min-width: 0;
        word-wrap: break-word;
        line-height: 1.3;
      ">${displayName}</h2>

      <!-- Row 3: Metadata -->
      ${metadataRow ? `
        <div style="
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.3;
        ">
          ${metadataRow}
        </div>
      ` : ''}
    </div>
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
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
    ">
      <button onclick="document.getElementById('${uid}').style.display = document.getElementById('${uid}').style.display === 'none' ? 'block' : 'none'" style="
        width: 100%;
        padding: 12px;
        background: transparent;
        border: none;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span>🕐</span>
        <span>Orari di apertura</span>
        <span style="margin-left: auto; font-size: 12px;">▼</span>
      </button>

      <div id="${uid}" style="
        padding: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        display: none;
        font-size: 12px;
      ">
        ${hours.weekdayDescriptions.map(desc => `
          <div style="
            padding: 6px 0;
            color: rgba(255, 255, 255, 0.7);
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
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    ">
      <div style="
        font-weight: 600;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 6px;
      ">📍 INDIRIZZO</div>
      <div style="
        font-size: 13px;
        color: #fff;
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
      background: linear-gradient(135deg, rgba(42, 110, 144, 0.2), rgba(74, 124, 89, 0.2));
      border: 1px solid rgba(74, 124, 89, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      color: #fff;
      text-decoration: none;
      font-size: 13px;
      transition: background 0.2s;
    " onmouseover="this.style.background='linear-gradient(135deg, rgba(42, 110, 144, 0.3), rgba(74, 124, 89, 0.3))'" onmouseout="this.style.background='linear-gradient(135deg, rgba(42, 110, 144, 0.2), rgba(74, 124, 89, 0.2))'">
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
      background: rgba(255, 107, 53, 0.1);
      border: 1px solid rgba(255, 107, 53, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      color: #fff;
      text-decoration: none;
      font-size: 13px;
      transition: background 0.2s;
    " onmouseover="this.style.background='rgba(255, 107, 53, 0.2)'" onmouseout="this.style.background='rgba(255, 107, 53, 0.1)'">
      📞 ${phone}
    </a>
  `;
}

/**
 * Description from Places API (with fallback)
 */
function renderDescription(details) {
  const text = details?.editorialSummary || null;
  if (!text) return '';

  return `
    <div style="
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
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
    { flag: details.servesVegetarianFood, label: '🥗 Vegetariano' },
    { flag: details.servesDinner, label: '🌙 Cena' },
    { flag: details.servesLunch, label: '☕ Pranzo' },
    { flag: details.servesBeer, label: '🍺 Alcolici' },
    { flag: details.takeout, label: '📦 Takeaway' },
    { flag: details.reservable, label: '📋 Prenotabile' }
  ];

  const activeAttrs = attributes
    .filter(a => a.flag === true)
    .map(a => `
      <span style="
        display: inline-block;
        background: rgba(74, 124, 89, 0.2);
        border: 1px solid rgba(74, 124, 89, 0.4);
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 11px;
        color: #fff;
        font-weight: 600;
      ">${a.label}</span>
    `)
    .join('');

  if (!activeAttrs) return '';

  return `
    <div style="
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    ">
      <div style="
        font-weight: 600;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 8px;
        text-transform: uppercase;
      ">🍴 ATTRIBUTI</div>
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
      background: rgba(255, 215, 0, 0.15);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      color: #FFD700;
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
      background: rgba(100, 150, 200, 0.1);
      border: 1px solid rgba(100, 150, 200, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 13px;
      color: #fff;
    ">
      <div style="font-weight: 600; margin-bottom: 4px;">⏱️ Tempo consigliato</div>
      <div>${duration}</div>
    </div>
  `;
}

/**
 * Ticket/entrance fee
 */
function renderEntranceFee(poi) {
  if (!poi.ticket && poi.paid !== true) return '';

  const fee = poi.ticket || poi.cost || 'Ingresso a pagamento';

  return `
    <div style="
      background: rgba(255, 107, 53, 0.1);
      border: 1px solid rgba(255, 107, 53, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 13px;
      color: #fff;
    ">
      <div style="font-weight: 600; margin-bottom: 4px;">🎟️ Ingresso</div>
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
