// ============================================================================
// menu-drawer.js — showMenuDrawer
// Extracted from app-core.js. Deps (all window.*):
//   t, openSheet, closeSheet, state, DEBUG,
//   renderListView, renderShoppingView, renderGroupView, renderBudgetView,
//   renderGalleryView, loadScript, GFHeatmap, JapanCalendarHints,
//   openGroqPanel, openGFSuggestionPanel, openBackupPanel, ErrorCollector,
//   showOnboardingChoiceModal (global from onboarding.js)
// ============================================================================
(function () {
  'use strict';

  function showMenuDrawer() {
    const T = window.t || ((k, f) => f || k);
    const menuItems = [
      { label: T('menu.bookings', 'Prenota'), icon: '📅', view: 'bookings' },
      { label: T('menu.shopping', 'Shopping'), icon: '🛍️', view: 'shopping' },
      { label: T('menu.group', 'Gruppo'), icon: '👥', view: 'group' },
      { label: T('menu.budget', 'Budget'), icon: '💰', view: 'budget' },
      { label: T('menu.gallery', 'Galleria'), icon: '📸', view: 'gallery' },
      { label: T('menu.tips', 'Tips Viaggio 2027'), icon: '🌸', view: 'tips' },
      { label: T('menu.gfHeatmap', 'Heatmap GF'), icon: '🔥', view: 'gf-heatmap' },
      { label: T('menu.reminders', 'Promemoria Tappe'), icon: '🔔', view: 'reminders' },
      { label: T('menu.jrpass', 'Conviene il JR Pass?'), icon: '🚄', view: 'jr-pass' },
      { label: T('menu.japanCal', 'Calendario Giappone'), icon: '📅', view: 'japan-cal' },
      { label: T('menu.groqai', 'Groq AI'), icon: '🤖', view: 'groq-menu' },
      { label: T('menu.suggest', 'Suggerisci Posti'), icon: '💡', view: 'gf-suggest' },
      { label: T('menu.createTrip', 'Voglio creare il mio viaggio'), icon: '✏️', view: 'create-trip', style: 'color: var(--m-accent); background: rgba(255,107,53,0.15); border-color: rgba(255,107,53,0.3);' },
      { label: T('menu.backup', 'Backup & Ripristino'), icon: '📦', view: 'backup' },
      { label: T('menu.sos', 'SOS'), icon: '🆘', view: 'sos', style: 'color: #FF6B6B; background: rgba(255,107,107,0.1);' },
      ...(window.DEBUG ? [{ label: T('menu.errors', 'Errori (debug)'), icon: '🐞', view: 'errors', style: 'opacity:0.85;' }] : [])
    ];

    const menuHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 0;">
        ${menuItems.map(item => `
          <button class="menu-drawer-item" data-view="${item.view}" style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            color: rgba(255,255,255,0.85);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: left;
            ${item.style || ''}
          "
          onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,165,100,0.3)';"
          onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,255,255,0.1)';">
            <span style="font-size: 18px;">${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    window.openSheet((window.t ? window.t('menu.title', '⚙️ Menu') : '⚙️ Menu'), menuHTML);

    // Attach click handlers
    document.querySelectorAll('.menu-drawer-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        console.log('[MenuDrawer] Clicked:', view);
        window.closeSheet?.();

        // Switch to the selected view
        setTimeout(() => {
          // Handle special case: create trip
          if (view === 'create-trip') {
            console.log('[MenuDrawer] Showing onboarding choice modal...');
            // Clear tripProfile to show onboarding
            localStorage.removeItem('tripProfile');
            window.state.tripProfile = null;
            // Show choice modal
            if (typeof window.showOnboardingChoiceModal === 'function') {
              window.showOnboardingChoiceModal();
            }
            return;
          }

          const navBtn = document.querySelector(`nav.bottom button[data-view="${view}"]`);
          if (navBtn) {
            navBtn.click();
          } else {
            // Fallback: trigger view directly
            if (view === 'list') { window.renderListView?.(); }
            else if (view === 'bookings') { window.loadScript('./js/views/bookings-view.js').then(() => window.renderBookingsView?.()); }
            else if (view === 'shopping') { window.renderShoppingView?.(); }
            else if (view === 'group') { window.renderGroupView?.(); }
            else if (view === 'budget') { window.renderBudgetView?.(); }
            else if (view === 'gallery') { window.renderGalleryView?.(); }
            else if (view === 'tips') { window.loadScript('./js/views/tips-view.js').then(() => window.renderTipsView?.()); }
            else if (view === 'gf-heatmap') {
              window.loadScript('./js/gf-heatmap.js').then(() => {
                const mapBtn = document.querySelector('nav.bottom button[data-view="map"]');
                if (mapBtn) mapBtn.click();
                setTimeout(() => window.GFHeatmap?.toggle?.(), 150);
              });
            }
            else if (view === 'reminders') { window.loadScript('./js/itinerary-reminders.js').then(() => window.openItineraryReminders?.()); }
            else if (view === 'jr-pass') { window.loadScript('./js/jr-pass-calculator.js').then(() => window.openJRPassPanel?.()); }
            else if (view === 'japan-cal') { window.JapanCalendarHints?.openPanel?.(); }
            else if (view === 'groq-menu') { window.openGroqPanel(); }
            else if (view === 'gf-suggest') { window.openGFSuggestionPanel(); }
            else if (view === 'sos') { window.loadScript('./js/views/sos-view.js').then(() => window.renderSOSPanel?.()); }
            else if (view === 'backup') { window.openBackupPanel?.(); }
            else if (view === 'errors') { window.ErrorCollector?.openPanel?.(); }
          }
        }, 200);
      });
    });
  }

  window.showMenuDrawer = showMenuDrawer;
})();
