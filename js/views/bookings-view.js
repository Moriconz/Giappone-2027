/**
 * views/bookings-view.js — Lista POI con info di prenotazione
 *
 * Estratto da app-core.js il 2026-05-26 (vedi STATO_APP.md §8.5).
 *
 * Mostra solo i POI che hanno un campo `booking` non vuoto, con bottoni verso
 * TableCheck / Tabelog / sito ufficiale / numero di telefono.
 *
 * Dipendenze esterne (tutte su window):
 *   - window.allPOIs()            sorgente POI corrente
 *   - window.CATS                 mappa cat → {label, icon}
 *   - window.getPoiDisplayName(p) display name normalizzato
 *   - window.openSheet(t, html)   apre il panel
 *   - window.sheetBody            elemento panel per attach event handlers
 *   - window.openPOI(id)          apertura dettaglio POI on click
 */
(function () {
  'use strict';

  function renderBookingsView() {
    if (typeof window.allPOIs !== 'function' || typeof window.openSheet !== 'function') {
      console.warn('[bookings-view] dipendenze mancanti');
      return;
    }

    const items = window.allPOIs().filter(p => p.booking && Object.keys(p.booking).length);
    const html = items.length
      ? items.map(p => {
          const bookingBtns = [];
          if (p.booking.tableCheck) bookingBtns.push(`<a class="btn success" href="${p.booking.tableCheck}" target="_blank" rel="noopener">TableCheck</a>`);
          if (p.booking.tabelog) bookingBtns.push(`<a class="btn" href="${p.booking.tabelog}" target="_blank" rel="noopener">Tabelog</a>`);
          if (p.booking.website) bookingBtns.push(`<a class="btn" href="${p.booking.website}" target="_blank" rel="noopener">Sito</a>`);
          if (p.booking.phone) bookingBtns.push(`<a class="btn" href="tel:${p.booking.phone.replace(/\s+/g, '')}">Chiama</a>`);
          const icon = (window.CATS && window.CATS[p.cat]?.icon) || '🍴';
          const name = window.getPoiDisplayName ? window.getPoiDisplayName(p) : (p.name || 'POI');
          return `
        <div class="poi-row" data-id="${p.id}">
          <div class="icon">${icon}</div>
          <div class="body">
            <div class="name">${name}</div>
            <div class="sub">${p.city || ''} · ${p.desc?.slice(0, 70) || ''}</div>
          </div>
        </div>
        <div class="section">${bookingBtns.join(' ')}</div>
      `;
        }).join('')
      : '<p style="color:var(--muted);font-size:15px">Nessuna prenotazione disponibile.</p>';

    window.openSheet('🍽️ Prenota', html);

    const body = window.sheetBody || document.getElementById('sheet-body');
    if (body) {
      body.querySelectorAll('.poi-row').forEach(r => {
        r.onclick = () => window.openPOI?.(r.dataset.id);
      });
    }
  }

  window.renderBookingsView = renderBookingsView;
})();
