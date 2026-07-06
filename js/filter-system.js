/**
 * FILTER SYSTEM — Travel-specific filters for map POI discovery
 *
 * Filters: GF Safe, Free, Nearby, Rainy (indoor), Food, Family, Suggested
 * Usage: Filters update in real-time, marker rendering updates dynamically
 */

const TRAVEL_FILTERS = {
  gf_safe: {
    name: '🌾 GF Sicuro',
    check: (poi) => poi.gf?.lvl === 'full' || (poi.isGF === true),
  },
  free: {
    name: '🆓 Gratis',
    check: (poi) => poi.paid === false,
  },
  nearby: {
    name: '📍 Vicino (1km)',
    check: (poi) => {
      if (!window.state?.gpsCurrentLat || !window.state?.gpsCurrentLng) return true; // Can't filter if no GPS
      const distMeters = haversineDistance(
        window.state.gpsCurrentLat,
        window.state.gpsCurrentLng,
        poi.lat,
        poi.lng
      );
      return distMeters < 1000;
    },
  },
  rainy: {
    name: '🌧️ Pioggia (coperto)',
    check: (poi) => poi.indoor === true || ['museum', 'shrine', 'temple', 'church'].includes(poi.cat),
  },
  food: {
    name: '🍜 Food',
    check: (poi) => {
      const FOOD_TYPES = ['restaurant', 'food', 'cafe', 'bar', 'meal_takeaway', 'bakery', 'izakaya'];
      return FOOD_TYPES.includes(poi.cat);
    },
  },
  family: {
    name: '👨‍👩‍👧‍👦 Famiglia',
    check: (poi) => poi.family_friendly === true || ['park', 'museum', 'shrine', 'temple'].includes(poi.cat),
  },
  suggested: {
    name: '⭐ Consigliato',
    check: (poi) => {
      if (!window.state?.tripProfile?.interests) return true;
      return window.state.tripProfile.interests.includes(poi.cat);
    },
  },
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function initFilterSystem() {
  console.log('[FilterSystem] Initializing...');

  // Initialize state
  if (window.state) {
    window.state.activeFilters = {};
  }

  // Create filter chips UI
  createFilterChips();

  // Set up event listeners
  setupFilterListeners();
}

function createFilterChips() {
  // Try both 'map-view' (preferred) and 'map' (fallback) as parent container
  let mapContainer = document.getElementById('map-view');
  if (!mapContainer) {
    mapContainer = document.getElementById('map');
  }

  if (!mapContainer) {
    console.warn('[FilterSystem] Neither map-view nor map found, retrying...');
    // Only retry max 10 times to avoid infinite loop
    const retries = parseInt(window.filterSystemRetries || 0);
    if (retries < 10) {
      window.filterSystemRetries = retries + 1;
      setTimeout(createFilterChips, 500);
    } else {
      console.error('[FilterSystem] Max retries reached, giving up');
    }
    return;
  }

  // Check if filters already exist
  if (document.getElementById('filter-chips-container')) {
    return; // Already created
  }

  const container = document.createElement('div');
  container.id = 'filter-chips-container';
  container.style.cssText = `
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    overflow-x: auto;
    scroll-behavior: smooth;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    margin-bottom: 0;
  `;

  // "Tutto" chip (always first, clears all filters)
  const allChip = document.createElement('button');
  allChip.className = 'filter-chip active';
  allChip.textContent = '🏪 Tutto';
  allChip.dataset.filter = 'all';
  allChip.style.cssText = `
    padding: 8px 14px;
    background: rgba(255, 107, 53, 0.25);
    border: 1px solid rgba(255, 107, 53, 0.4);
    color: rgba(255, 255, 255, 0.9);
    border-radius: 20px;
    font-size:14px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    flex-shrink: 0;
  `;

  container.appendChild(allChip);

  // Other filter chips
  Object.entries(TRAVEL_FILTERS).forEach(([key, filter]) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip';
    chip.textContent = filter.name;
    chip.dataset.filter = key;
    chip.style.cssText = `
      padding: 8px 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255, 255, 255, 0.65);
      border-radius: 20px;
      font-size:14px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      flex-shrink: 0;
    `;

    container.appendChild(chip);
  });

  // Insert after search input or at start of map-view
  const searchInput = mapContainer.querySelector('input[type="search"]');
  if (searchInput) {
    searchInput.parentNode.insertAdjacentElement('afterend', container);
  } else {
    mapContainer.insertBefore(container, mapContainer.firstChild);
  }

  console.log('[FilterSystem] Filter chips created');
}

function setupFilterListeners() {
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('filter-chip')) return;

    const filterKey = e.target.dataset.filter;

    if (filterKey === 'all') {
      // Clear all filters
      window.state.activeFilters = {};
      updateFilterChipsUI();
      reapplyFilters();
      return;
    }

    // Toggle filter
    if (window.state.activeFilters[filterKey]) {
      delete window.state.activeFilters[filterKey];
    } else {
      window.state.activeFilters[filterKey] = true;
    }

    window.state.activeFilters['all'] = false; // Deactivate "Tutto" when other filter selected

    updateFilterChipsUI();
    reapplyFilters();
  });
}

function updateFilterChipsUI() {
  const chips = document.querySelectorAll('.filter-chip');
  const hasActiveFilters = Object.keys(window.state.activeFilters).some(k => window.state.activeFilters[k]);

  chips.forEach((chip) => {
    const isAll = chip.dataset.filter === 'all';
    const isActive = isAll ? !hasActiveFilters : window.state.activeFilters[chip.dataset.filter];

    if (isActive) {
      chip.classList.add('active');
      chip.style.background = 'rgba(255, 107, 53, 0.25)';
      chip.style.borderColor = 'rgba(255, 107, 53, 0.4)';
      chip.style.color = 'rgba(255, 255, 255, 0.9)';
    } else {
      chip.classList.remove('active');
      chip.style.background = 'rgba(255,255,255,0.04)';
      chip.style.borderColor = 'rgba(255,255,255,0.1)';
      chip.style.color = 'rgba(255, 255, 255, 0.65)';
    }
  });
}

function reapplyFilters() {
  if (!window.vectorSource) {
    console.warn('[FilterSystem] vectorSource not available yet');
    return;
  }

  const features = window.vectorSource.getFeatures();
  const activeFilterKeys = Object.keys(window.state.activeFilters).filter(k => window.state.activeFilters[k]);

  if (activeFilterKeys.length === 0) {
    // No filters active, show all
    features.forEach(f => f.set('hidden', false));
    console.log('[FilterSystem] All filters cleared, showing all POI');
  } else {
    // Apply filters
    features.forEach((feature) => {
      const poi = feature.getProperties();

      const passesAllFilters = activeFilterKeys.every((filterKey) => {
        const filterFunc = TRAVEL_FILTERS[filterKey]?.check;
        if (!filterFunc) return true;
        return filterFunc(poi);
      });

      feature.set('hidden', !passesAllFilters);
    });

    const visibleCount = features.filter(f => !f.get('hidden')).length;
    console.log(`[FilterSystem] ${activeFilterKeys.length} filter(s) active, ${visibleCount} POI visible`);
  }

  // Update marker visibility (style function should check 'hidden' property)
  window.vectorLayer?.changed();
}

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initFilterSystem();
  }, 1000); // Wait for map to be ready
});
