// ============================================================================
// itinerary-export-share.js — export HTML/WhatsApp, link condivisibile
//   (build/encode/decode payload + import), condividi con gruppo, modale
//   itinerario vuoto.
// Estratto da itinerary-unified.js (1363 righe), nessun cambio di
// comportamento — stesso trattamento di poi-detail-view.js/gf-places-panel.js
// in v3.34. Fix incluso: handleExportHTML referenziava `_tripStart`, una
// const locale di renderItineraryUnified() non visibile da questa funzione
// (scope diverso, mai un vero IIFE condiviso) — ReferenceError silenzioso
// mai intercettato dallo smoke test perché non esercita questo bottone.
// Deps (window.*): t, state, toast, openSheet, closeSheet, modalConfirm,
//   ITINERARY, ItinerarySnapshots, exportItineraryWhatsApp,
//   showShareItineraryModal, renderItineraryUnified
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  /**
   * DIRECT HANDLERS FOR SHARE BUTTONS
   * Called via onclick attribute in the HTML for maximum reliability
   */
  window.handleExportHTML = function() {
    console.log('[ItineraryUnified] 📄 Export HTML button clicked');

    let totalPOIs = 0;
    const tripProfile = window.state?.tripProfile || {};
    const days = tripProfile.days || 8;
    const tripStart = tripProfile.startDate ? new Date(tripProfile.startDate) : new Date(2027, 3, 10);

    for (let d = 0; d < days; d++) {
      totalPOIs += (window.state?.itineraryByDay?.[d] || []).length;
    }

    if (totalPOIs === 0) {
      console.log('[ItineraryUnified] ⚠️ Itinerary empty');
      window.toast?.(T('itin.noPOI', '⚠️ Nessun POI aggiunto'));
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Itinerario Giappone 2027</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: sans-serif; background: white; color: #333; line-height: 1.6; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 20px; color: #1a1a1a; }
          h2 { font-size: 16px; margin: 20px 0 10px 0; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .summary { background: #f9f9f9; padding: 12px; border-radius: 4px; margin-bottom: 20px; }
          .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size:14px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>📅 Itinerario Giappone 2027 — ${days} giorni</h1>
        ${Array.from({ length: days }, (_, d) => {
          const dayPOIs = window.state?.itineraryByDay?.[d] || [];
          if (dayPOIs.length === 0) return '';
          const dayDate = new Date(tripStart); dayDate.setDate(dayDate.getDate() + d);
          const dayLabel = dayDate.toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' });
          const dayCost = dayPOIs.reduce((sum, e) => sum + (e.cost || 0), 0);
          return `
            <h2>Giorno ${d + 1} — ${dayLabel}</h2>
            <table>
              <tr>
                <th>#</th>
                <th>Luogo</th>
                <th>Orario</th>
                <th>Durata</th>
                <th>Costo</th>
                <th>Note</th>
              </tr>
              ${dayPOIs.map((entry, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${entry.poi_name}</td>
                  <td>${entry.time}</td>
                  <td>${entry.duration}m</td>
                  <td>${entry.cost > 0 ? '¥' + entry.cost : '-'}</td>
                  <td style="font-size:13px">${entry.notes || '-'}</td>
                </tr>
              `).join('')}
              <tr style="background:#f0f0f0">
                <td colspan="4" style="text-align:right"><strong>Subtotale giorno:</strong></td>
                <td><strong>¥${dayCost}</strong></td>
                <td></td>
              </tr>
            </table>
          `;
        }).join('')}
        <div class="summary">
          <strong>Budget totale:</strong> ¥${tripProfile.budget_total || 500000}<br>
          <strong>Speso:</strong> ¥${window.ITINERARY?.calculateBudgetSpent?.() || 0}<br>
          <strong>Rimasto:</strong> ¥${(tripProfile.budget_total || 500000) - (window.ITINERARY?.calculateBudgetSpent?.() || 0)}
        </div>
        <div class="footer">
          <p>Generato da Tabi Giappone 2027</p>
        </div>
      </body>
      </html>
    `;

    const newTab = window.open();
    newTab.document.write(html);
    newTab.document.close();

    window.toast?.(T('itin.exported', '✅ Itinerario esportato'));
    console.log('[ItineraryUnified] ✅ HTML export complete');
  };

  window.handleExportWhatsApp = function() {
    console.log('[ItineraryUnified] 📤 WhatsApp export button clicked');

    let totalPOIs = 0;
    const tripProfile = window.state?.tripProfile || {};
    const days = tripProfile.days || 8;

    for (let d = 0; d < days; d++) {
      totalPOIs += (window.state?.itineraryByDay?.[d] || []).length;
    }

    if (totalPOIs === 0) {
      console.log('[ItineraryUnified] ⚠️ Itinerary empty, showing empty modal');
      window.showEmptyItineraryModal();
      return;
    }

    if (typeof window.exportItineraryWhatsApp === 'function') {
      console.log('[ItineraryUnified] ✅ Calling exportItineraryWhatsApp()');
      try {
        window.exportItineraryWhatsApp();
      } catch (err) {
        console.error('[ItineraryUnified] ❌ Error:', err);
        window.toast?.('❌ Errore: ' + err.message);
      }
    }
  };

  // ─── Link itinerario condivisibile (URL read-only, niente backend) ───
  function _buildSharePayload() {
    const ibd = window.state?.itineraryByDay || {};
    const items = [];
    Object.keys(ibd).forEach(d => (ibd[d] || []).forEach(e => {
      items.push({ d: +d, p: e.poi_id, n: e.poi_name, t: e.time, dur: e.duration, c: e.cost, lat: e.lat, lng: e.lng });
    }));
    return { v: 1, days: window.state?.tripProfile?.days || 8, items };
  }
  function _encodeShare(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function _decodeShare(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  }
  window.handleShareLink = function() {
    const payload = _buildSharePayload();
    if (!payload.items.length) { window.toast?.(T('toast.addStopsFirst', '⚠️ Aggiungi tappe prima di condividere')); return; }
    const url = location.origin + location.pathname + '?share=' + _encodeShare(payload);
    if (url.length > 8000) { window.toast?.(T('itin.tooLargeForLink', '⚠️ Itinerario troppo grande per un link')); return; }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => { window.toast?.(T('itin.linkCopied', '🔗 Link copiato! Incollalo dove vuoi')); },
        () => { window.toast?.('⚠️ Copia manuale: ' + url.substring(0, 60) + '…'); }
      );
    } else { window.toast?.('⚠️ Clipboard non disponibile'); }
  };
  window.importSharedItinerary = function(payload) {
    try {
      if (!payload || !Array.isArray(payload.items)) return;
      // Auto-snapshot before overwriting (recoverable via Snapshots panel)
      window.ItinerarySnapshots?.saveAuto?.('import-shared-link');
      payload.items.forEach(it => window.ITINERARY?.addPOIToDay?.(it.p, it.n, it.d, it.t || '10:00', it.dur || 60, '', it.c || 0, 'altro', it.lat ?? null, it.lng ?? null));
      window.saveState?.();
      window.toast?.(T('itin.imported', '✅ Itinerario importato'));
      window.renderItineraryUnified?.();
    } catch (e) { window.toast?.('❌ Errore import'); }
  };
  window.openSharedItineraryPreview = function(payload) {
    const count = (payload && payload.items && payload.items.length) || 0;
    window.__sharedPayload = payload;
    const html = `<div style="padding:8px">
      <p style="color:var(--l-ink);font-size:16px;margin:0 0 14px">Qualcuno ha condiviso un itinerario con <strong>${count}</strong> tappe.</p>
      <button onclick="window.importSharedItinerary(window.__sharedPayload); window.closeSheet&&window.closeSheet();" class="btn primary" style="width:100%;padding:13px;font-weight:700">📥 Importa nel mio itinerario</button>
    </div>`;
    window.openSheet?.('🔗 Itinerario condiviso', html);
  };
  (function detectShareLink() {
    function check() {
      try {
        const code = new URLSearchParams(location.search).get('share');
        if (!code) return;
        const payload = _decodeShare(code);
        setTimeout(() => window.openSharedItineraryPreview(payload), 1500);
      } catch (e) { console.warn('[ShareLink] link non valido', e); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check();
  })();

  window.handleShareGroup = function() {
    console.log('[ItineraryUnified] 👥 Share group button clicked');

    let totalPOIs = 0;
    const tripProfile = window.state?.tripProfile || {};
    const days = tripProfile.days || 8;

    for (let d = 0; d < days; d++) {
      totalPOIs += (window.state?.itineraryByDay?.[d] || []).length;
    }

    if (totalPOIs === 0) {
      console.log('[ItineraryUnified] ⚠️ Itinerary empty, showing empty modal');
      window.showEmptyItineraryModal();
      return;
    }

    if (typeof window.showShareItineraryModal === 'function') {
      console.log('[ItineraryUnified] ✅ Calling showShareItineraryModal()');
      try {
        window.showShareItineraryModal();
      } catch (err) {
        console.error('[ItineraryUnified] ❌ Error:', err);
        window.toast?.('❌ Errore: ' + err.message);
      }
    }
  };

  /**
   * ELEGANT EMPTY SHARE MODAL
   * UX: Explain why share is blocked, offer next useful step
   * Design: Dark warm, coherent with rest of app
   */
  function showEmptyItineraryModal() {
    const html = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
        min-height: 400px;
      ">
        <!-- Icon -->
        <div style="
          font-size: 64px;
          margin-bottom: 24px;
          opacity: 0.9;
        ">📭</div>

        <!-- Heading -->
        <h2 style="
          font-size: 20px;
          font-weight: 700;
          color: var(--l-ink);
          margin: 0 0 16px 0;
          line-height: 1.3;
        ">${window.t ? window.t('itin.noItinShare') : 'Nessun itinerario da condividere'}</h2>

        <!-- Description -->
        <p style="
          font-size:16px;
          color: var(--l-muted);
          margin: 0 0 32px 0;
          line-height: 1.6;
          max-width: 320px;
        ">Non hai ancora aggiunto nessuna tappa al tuo itinerario. Aggiungi almeno un luogo a uno dei giorni prima di esportarlo o condividerlo con il gruppo.</p>

        <!-- CTA Buttons -->
        <div style="
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 220px;
        ">
          <!-- Primary button: Ho capito -->
          <button class="empty-share-close-btn" style="
            padding: 6px 10px !important;
            background: rgba(255,107,53,0.15) !important;
            border: 1px solid rgba(255,107,53,0.4) !important;
            border-radius: 5px !important;
            color: var(--m-accent) !important;
            font-size:15px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            line-height: 1.2 !important;
            height: auto !important;
            min-height: auto !important;
          " onmouseover="this.style.background='rgba(255,107,53,0.25)'; this.style.borderColor='rgba(255,107,53,0.6)';" onmouseout="this.style.background='rgba(255,107,53,0.15)'; this.style.borderColor='rgba(255,107,53,0.4)';">
            ${window.t ? window.t('common.gotIt') : 'Ho capito'}
          </button>

          <!-- Secondary button: Aggiungi una tappa -->
          <button class="empty-share-add-btn" style="
            padding: 6px 10px !important;
            background: linear-gradient(135deg, rgba(22,163,74,0.14), rgba(22,163,74,0.08)) !important;
            border: 1px solid rgba(22,163,74,0.4) !important;
            border-radius: 5px !important;
            color: #16a34a !important;
            font-size:15px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            line-height: 1.2 !important;
            height: auto !important;
            min-height: auto !important;
          " onmouseover="this.style.background='linear-gradient(135deg, rgba(22,163,74,0.22), rgba(22,163,74,0.12))'; this.style.borderColor='rgba(22,163,74,0.6)';" onmouseout="this.style.background='linear-gradient(135deg, rgba(22,163,74,0.14), rgba(22,163,74,0.08))'; this.style.borderColor='rgba(22,163,74,0.4)';">
            ${window.t ? window.t('itin.addStop') : '➕ Aggiungi una tappa'}
          </button>
        </div>
      </div>
    `;

    window.openSheet((window.t ? window.t('itin.emptyTitle') : '📭 Itinerario vuoto'), html);
    console.log('[ItineraryUnified] 📭 showEmptyShareModal() opened');

    // Setup button handlers via event delegation (will be caught by global handlers)
    // But also attach direct handlers for robustness
    setTimeout(() => {
      const closeBtn = document.querySelector('.empty-share-close-btn');
      const addBtn = document.querySelector('.empty-share-add-btn');

      if (closeBtn) {
        closeBtn.onclick = () => {
          console.log('[ItineraryUnified] ✓ User closed empty share modal');
          window.closeSheet();
        };
      }

      if (addBtn) {
        addBtn.onclick = () => {
          console.log('[ItineraryUnified] ✓ User clicked "Aggiungi una tappa"');
          window.closeSheet();
          // Go to map tab to start adding POIs
          const mapBtn = document.querySelector('nav.bottom button[data-view="map"]');
          if (mapBtn) {
            mapBtn.click();
            window.toast?.('📍 Clicca un luogo sulla mappa per aggiungerlo');
          }
        };
      }
    }, 50);
  }
  window.showEmptyItineraryModal = showEmptyItineraryModal;
})();
