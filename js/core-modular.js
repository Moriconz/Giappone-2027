/**
 * SafeEats Core Module v2 — Lazy-loaded, modular structure
 * Loads core features on demand to reduce initial bundle
 */

// Module registry
const MODULES = {
  map: './js/map-module.js',
  budget: './js/budget-module.js',
  gallery: './js/gallery-module.js',
  chat: './js/chat-module.js',
  groupPanel: './js/group-panel-module.js'
};

const loadedModules = {};

/**
 * Lazy-load a module by tab
 */
async function loadModuleForTab(tabName) {
  if (loadedModules[tabName]) {
    console.log(`[Core] Module "${tabName}" already loaded`);
    return loadedModules[tabName];
  }

  const modulePath = MODULES[tabName];
  if (!modulePath) {
    console.warn(`[Core] No module found for tab: ${tabName}`);
    return null;
  }

  try {
    const module = await import(modulePath);
    loadedModules[tabName] = module;
    console.log(`[Core] ✓ Loaded module: ${tabName}`);
    return module;
  } catch (err) {
    console.error(`[Core] Failed to load module "${tabName}":`, err);
    return null;
  }
}

/**
 * Initialize tab with lazy-loaded module
 */
async function initializeTab(tabName) {
  const module = await loadModuleForTab(tabName);
  if (module && module.init) {
    module.init();
    console.log(`[Core] ✓ Initialized ${tabName}`);
  }
}

/**
 * Setup tab click handlers for lazy loading
 */
function setupTabLazyLoading() {
  const tabs = document.querySelectorAll('[data-tab]');

  tabs.forEach(tab => {
    const tabName = tab.dataset.tab;

    // Skip core tabs (map is always loaded)
    if (tabName === 'map' || !MODULES[tabName]) return;

    tab.addEventListener('click', async () => {
      // Show loading state
      const content = document.querySelector(`[data-tab-content="${tabName}"]`);
      if (content) {
        content.style.opacity = '0.5';
        content.style.pointerEvents = 'none';
      }

      // Load module
      await initializeTab(tabName);

      // Restore interaction
      if (content) {
        content.style.opacity = '1';
        content.style.pointerEvents = 'auto';
      }
    });
  });

  console.log('[Core] ✓ Lazy-loading setup complete');
}

/**
 * Initialize map on startup (critical path)
 */
async function initCoreFeatures() {
  console.log('[Core] Initializing core features...');

  // Map is loaded immediately (critical)
  if (window.initMap && typeof window.initMap === 'function') {
    console.log('[Core] Initializing map...');
    window.initMap();
  }

  // Setup lazy-loading for secondary features
  setupTabLazyLoading();

  console.log('[Core] ✓ Core features ready');
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCoreFeatures);
} else {
  initCoreFeatures();
}

// Expose to global
window.CoreModular = {
  loadModule: loadModuleForTab,
  initTab: initializeTab,
  init: initCoreFeatures
};
