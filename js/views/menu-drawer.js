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
      { label: T('menu.sos', 'SOS'), icon: '🆘', view: 'sos', style: 'color: #FF6B6B; background: rgba(255,107,107,0.1);' },
      { label: T('menu.wishlist', 'Wishlist GF del gruppo'), icon: '🗳️', view: 'gf-wishlist', style: 'color: #4ade80; background: rgba(74,222,128,0.12); border-color: rgba(74,222,128,0.3);' },
      { label: T('menu.tickets', 'Biglietti'), icon: '🎫', view: 'tickets' },
      { label: T('menu.bookings', 'Prenota'), icon: '📅', view: 'bookings' },
      { label: T('menu.shopping', 'Shopping'), icon: '🛍️', view: 'shopping' },
      { label: T('menu.group', 'Gruppo'), icon: '👥', view: 'group' },
      { label: T('menu.budget', 'Budget'), icon: '💰', view: 'budget' },
      { label: T('menu.expenses', 'Spese di gruppo'), icon: '💴', view: 'group-expenses' },
      { label: T('menu.checklist', 'Checklist del gruppo'), icon: '📋', view: 'group-checklist' },
      { label: T('menu.gallery', 'Galleria'), icon: '📸', view: 'gallery' },
      { label: T('menu.tips', 'Tips Viaggio 2027'), icon: '🌸', view: 'tips' },
      { label: T('menu.gfHeatmap', 'Heatmap GF'), icon: '🔥', view: 'gf-heatmap' },
      { label: T('menu.gfToggle', 'Guida Gluten-Free') + (window.isGFEnabled?.() ? ' ✓' : ''), icon: '🌾', view: 'gf-toggle' },
      { label: T('menu.timeline', 'Timeline viaggio'), icon: '🗓️', view: 'timeline' },
      { label: T('menu.suggestGaps', 'Suggerimenti tempo libero'), icon: '✨', view: 'itin-suggest' },
      { label: T('menu.search', 'Cerca ovunque'), icon: '🔍', view: 'global-search' },
      { label: T('menu.battery', 'Risparmio batteria') + (window.BatterySaver?.isOn?.() ? ' ✓' : ''), icon: '🔋', view: 'battery-saver' },
      { label: T('menu.gameMode', 'Modalità gioco') + (window.GameEvents?.isOn?.() ? ' ✓' : ''), icon: '🎮', view: 'game-mode' },
      { label: T('menu.reminders', 'Promemoria Tappe'), icon: '🔔', view: 'reminders' },
      // Plugin destinazione: JR Pass e calendario festività hanno senso solo
      // per un viaggio in Giappone. Nessun campo "destinazione" esplicito in
      // tripProfile → si deduce dalle tappe già in itinerario (o dall'ultima
      // vista mappa), vedi window.isJapanTrip() in state.js.
      ...(window.isJapanTrip?.() !== false ? [
        { label: T('menu.jrpass', 'Conviene il JR Pass?'), icon: '🚄', view: 'jr-pass' },
        { label: T('menu.japanCal', 'Calendario Giappone'), icon: '📅', view: 'japan-cal' },
      ] : []),
      { label: T('menu.groqai', 'Assistente AI'), icon: '🤖', view: 'groq-menu' },
      { label: T('menu.suggest', 'Suggerisci Posti'), icon: '💡', view: 'gf-suggest' },
      { label: T('menu.createTrip', 'Voglio creare il mio viaggio'), icon: '✏️', view: 'create-trip', style: 'color: var(--m-accent); background: rgba(255,107,53,0.15); border-color: rgba(255,107,53,0.3);' },
      { label: T('menu.backup', 'Backup & Ripristino'), icon: '📦', view: 'backup' },
      { label: T('offline.menuLabel', 'Scarica per offline'), icon: '📥', view: 'offline-region' },
      ...(window.DEBUG ? [{ label: T('menu.errors', 'Errori (debug)'), icon: '🐞', view: 'errors', style: 'opacity:0.85;' }] : [])
    ];

    const menuHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;">
          <span style="font-size:16px;">🌐 ${T('menu.language', 'Lingua')}</span>
          <select id="lang-switcher-drawer" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:inherit;padding:4px 8px;font-size:15px;">
            <option value="it">🇮🇹 IT</option>
            <option value="en">🇬🇧 EN</option>
            <option value="ja">🇯🇵 日本語</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;">
          <span style="font-size:16px;">📍 ${T('menu.destination', 'Destinazione')}</span>
          <select id="country-switcher-drawer" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:inherit;padding:4px 8px;font-size:15px;max-width:160px;">
            <option value="${window.state?.tripProfile?.countryCode || 'JP'}">…</option>
          </select>
        </div>
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
            font-size:16px;
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

    // Lingua: il vero <select id="lang-switcher"> è nascosto in index.html (i18n.js
    // legge/ascolta solo quello) — qui pilotiamo un select gemello visibile nel drawer.
    const langDrawer = document.getElementById('lang-switcher-drawer');
    const langReal = document.getElementById('lang-switcher');
    if (langDrawer && langReal) {
      langDrawer.value = langReal.value;
      langDrawer.onchange = () => {
        langReal.value = langDrawer.value;
        langReal.dispatchEvent(new Event('change'));
      };
    }

    // Destinazione: stesso <select> paese dell'onboarding (popolato da
    // JapanCalendarHints.getAvailableCountries), qui per chi ha già un
    // tripProfile e non rivede più il wizard. Cambiarla invalida solo la
    // cache festività (chiave = countryCode), nessun'altra migrazione dati.
    const countryDrawer = document.getElementById('country-switcher-drawer');
    if (countryDrawer && typeof window.populateCountrySelect === 'function') {
      window.populateCountrySelect(countryDrawer, window.state?.tripProfile?.countryCode || 'JP');
      countryDrawer.onchange = () => {
        if (!window.state.tripProfile) window.state.tripProfile = {};
        window.state.tripProfile.countryCode = countryDrawer.value;
        try {
          const stored = JSON.parse(localStorage.getItem('tripProfile') || '{}');
          stored.countryCode = countryDrawer.value;
          localStorage.setItem('tripProfile', JSON.stringify(stored));
        } catch (_) {}
        window.saveState?.();
        window.JapanCalendarHints?.syncGlobalHolidays?.();
      };
    }

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
            else if (view === 'gf-wishlist') { window.GFWishlist?.openPanel?.(); }
            else if (view === 'group-expenses') { window.GroupExpenses?.openPanel?.(); }
            else if (view === 'group-checklist') { window.GroupChecklist?.openPanel?.(); }
            else if (view === 'tickets') { window.loadScript('./js/views/tickets-view.js').then(() => window.renderTicketsVault?.()); }
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
            else if (view === 'timeline') { window.loadScript('./js/views/timeline-view.js').then(() => window.renderTimelineView?.()); }
            else if (view === 'itin-suggest') { window.loadScript('./js/itinerary-suggest.js').then(() => window.openItinerarySuggest?.()); }
            else if (view === 'global-search') { window.loadScript('./js/global-search.js').then(() => window.openGlobalSearch?.()); }
            else if (view === 'battery-saver') { window.BatterySaver?.toggle?.(); }
            else if (view === 'game-mode') { window.GameEvents?.setOn?.(!window.GameEvents?.isOn?.()); window.toast?.(window.GameEvents?.isOn?.() ? T('game.on', '🎮 Modalità gioco attiva') : T('game.off', 'Modalità gioco disattivata')); }
            else if (view === 'gf-toggle') { window.setGFEnabled?.(!window.isGFEnabled?.()); window.toast?.(window.isGFEnabled?.() ? '🌾 Guida Gluten-Free attiva' : 'Guida Gluten-Free nascosta'); }
            else if (view === 'reminders') { window.loadScript('./js/itinerary-reminders.js').then(() => window.openItineraryReminders?.()); }
            else if (view === 'jr-pass') { window.loadScript('./js/jr-pass-calculator.js').then(() => window.openJRPassPanel?.()); }
            else if (view === 'japan-cal') { window.loadScript('./js/japan-calendar-hints.js').then(() => window.JapanCalendarHints?.openPanel?.()); }
            else if (view === 'groq-menu') { window.openGroqPanel(); }
            else if (view === 'gf-suggest') { window.openGFSuggestionPanel(); }
            else if (view === 'sos') { window.loadScript('./js/views/sos-view.js').then(() => window.renderSOSPanel?.()); }
            else if (view === 'backup') { window.openBackupPanel?.(); }
            else if (view === 'offline-region') { window.loadScript('./js/offline-region.js').then(() => window.openOfflineRegionPanel?.()); }
            else if (view === 'errors') { window.ErrorCollector?.openPanel?.(); }
          }
        }, 200);
      });
    });
  }

  window.showMenuDrawer = showMenuDrawer;
})();
