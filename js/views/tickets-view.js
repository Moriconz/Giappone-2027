/**
 * views/tickets-view.js — Vault biglietti/prenotazioni (window.state.tickets)
 *
 * Lista i ticket (window.ITINERARY_TICKETS), ordinati per data, con badge di
 * stato, bottone elimina e un piccolo form per aggiungerne uno nuovo.
 *
 * Dipendenze esterne (tutte su window):
 *   - window.ITINERARY_TICKETS  core logic (js/itinerary-tickets.js)
 *   - window.openSheet(t, html) apre il panel
 *   - window.sheetBody          elemento panel per attach event handlers
 *   - window.toast(msg)         feedback non bloccante
 *   - window.t(key, fallback)   i18n
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  const TYPE_ICON = { transport: '🚄', entry: '🎟️', lodging: '🏨', event: '🎫' };
  const TYPE_LABEL = {
    transport: T('tickets.type.transport', 'Trasporto'),
    entry: T('tickets.type.entry', 'Ingresso'),
    lodging: T('tickets.type.lodging', 'Alloggio'),
    event: T('tickets.type.event', 'Evento'),
  };
  // ponytail: niente palette semantica dedicata — riuso i soli token esistenti
  // (--l-accent rosso, --l-hair/--l-muted neutri) invece di inventare colori.
  const STATUS_STYLE = {
    booked: `color:var(--l-muted);background:var(--l-btn-bg);border-color:var(--l-hair);`,
    paid: `color:var(--l-accent-600);background:var(--l-accent-soft);border-color:var(--l-accent-brd);`,
    used: `color:var(--l-ink);background:var(--l-btn-bg-hover);border-color:var(--l-hair);`,
    expired: `color:var(--l-faint);background:transparent;border-color:var(--l-hair);`,
    cancelled: `color:var(--l-accent);background:transparent;border-color:var(--l-accent-brd);text-decoration:line-through;`,
  };
  const STATUS_LABEL = {
    booked: T('tickets.status.booked', 'Prenotato'),
    paid: T('tickets.status.paid', 'Pagato'),
    used: T('tickets.status.used', 'Usato'),
    expired: T('tickets.status.expired', 'Scaduto'),
    cancelled: T('tickets.status.cancelled', 'Annullato'),
  };
  const STATUSES = ['booked', 'paid', 'used', 'expired', 'cancelled'];

  // Elenco piatto {poi_id, label} delle tappe in itinerario, per il collegamento ticket→tappa
  function _stopOptions() {
    const ibd = window.state?.itineraryByDay || {};
    const out = [];
    Object.keys(ibd).map(Number).sort((a, b) => a - b).forEach(d => {
      (ibd[d] || []).forEach(e => {
        if (!e.poi_id) return;
        const name = e.poi_name || (window.allPOIs?.() || []).find(p => p.id === e.poi_id)?.name || e.poi_id;
        out.push({ poi_id: e.poi_id, day: d, label: `Giorno ${d + 1} · ${name}` });
      });
    });
    return out;
  }

  function _linkedStopLabel(t) {
    if (!t.linkStopPoi) return '';
    const opt = _stopOptions().find(o => o.poi_id === t.linkStopPoi);
    return opt ? opt.label : '';
  }

  function _fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // Promemoria leggero: countdown se il biglietto è nelle prossime 48h e non
  // ancora usato/annullato — niente notifiche OS (quelle restano di itinerary-reminders.js
  // per le tappe), solo un badge visivo per i biglietti imminenti nel vault.
  function _upcomingBadge(t) {
    if (!t.startDateTime || t.status === 'used' || t.status === 'cancelled' || t.status === 'expired') return '';
    const target = new Date(t.startDateTime);
    if (isNaN(target.getTime())) return '';
    const deltaMs = target - Date.now();
    if (deltaMs < 0 || deltaMs > 48 * 3600 * 1000) return '';
    const h = Math.floor(deltaMs / 3600000), m = Math.round((deltaMs % 3600000) / 60000);
    const label = h > 0 ? `tra ${h}h${m ? ' ' + m + 'm' : ''}` : `tra ${m}m`;
    return `<span style="font-size:12px;font-weight:700;color:#fff;background:var(--l-accent);padding:2px 7px;border-radius:999px;margin-left:6px;">⏱ ${label}</span>`;
  }

  function _ticketRow(t) {
    const icon = TYPE_ICON[t.type] || '🎫';
    const priceStr = (t.price != null) ? ` · ${t.price}${t.currency ? ' ' + t.currency : ''}` : '';
    const subParts = [t.provider, t.code, _fmtDate(t.startDateTime)].filter(Boolean).join(' · ');
    const stopLabel = _linkedStopLabel(t);
    return `
      <div class="poi-row" data-id="${t.id}" style="align-items:flex-start;">
        <div class="icon">${icon}</div>
        <div class="body">
          <div class="name">${t.title || TYPE_LABEL[t.type] || 'Ticket'}${_upcomingBadge(t)}</div>
          <div class="sub">${subParts}${priceStr}</div>
          ${stopLabel ? `<div class="sub" style="margin-top:2px;color:var(--l-accent);">📍 ${stopLabel}</div>` : ''}
          ${t.notes ? `<div class="sub" style="margin-top:2px;">${t.notes}</div>` : ''}
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <select class="ticket-status-select" data-id="${t.id}" style="font-size:13px;padding:3px 8px;border-radius:999px;border:1px solid;${STATUS_STYLE[t.status] || STATUS_STYLE.booked}">
              ${STATUSES.map(s => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
            </select>
            <button class="ticket-del-btn" data-id="${t.id}" style="font-size:13px;padding:3px 8px;border-radius:999px;border:1px solid var(--l-accent-brd);background:transparent;color:var(--l-accent);cursor:pointer;">
              🗑️ ${T('tickets.delete', 'Elimina')}
            </button>
          </div>
        </div>
      </div>`;
  }

  function _formHTML() {
    return `
      <form id="ticket-add-form" class="section" style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-weight:700;font-size:15px;color:var(--l-ink);">${T('tickets.addNew', '+ Nuovo biglietto')}</div>
        <select name="type" required>
          <option value="transport">🚄 ${TYPE_LABEL.transport}</option>
          <option value="entry">🎟️ ${TYPE_LABEL.entry}</option>
          <option value="lodging">🏨 ${TYPE_LABEL.lodging}</option>
          <option value="event">🎫 ${TYPE_LABEL.event}</option>
        </select>
        <input name="title" type="text" placeholder="${T('tickets.form.title', 'Titolo (es. Shinkansen Tokyo→Kyoto)')}" required />
        <input name="provider" type="text" placeholder="${T('tickets.form.provider', 'Fornitore (opzionale, es. JR)')}" />
        <input name="code" type="text" placeholder="${T('tickets.form.code', 'Codice/PNR (opzionale)')}" />
        <input name="startDateTime" type="datetime-local" />
        <select name="linkStopPoi">
          <option value="">${T('tickets.form.noLink', '(nessuna tappa collegata)')}</option>
          ${_stopOptions().map(o => `<option value="${o.poi_id}">${o.label}</option>`).join('')}
        </select>
        <div style="display:flex;gap:8px;">
          <input name="price" type="number" step="0.01" placeholder="${T('tickets.form.price', 'Prezzo')}" style="flex:1;" />
          <input name="currency" type="text" placeholder="${T('tickets.form.currency', 'Valuta')}" style="width:70px;" />
        </div>
        <textarea name="notes" placeholder="${T('tickets.form.notes', 'Note (opzionale)')}" rows="2"></textarea>
        <button type="submit" class="btn success">${T('tickets.form.save', 'Salva biglietto')}</button>
      </form>`;
  }

  function renderTicketsVault() {
    if (typeof window.ITINERARY_TICKETS === 'undefined' || typeof window.openSheet !== 'function') {
      console.warn('[tickets-view] dipendenze mancanti');
      return;
    }

    const all = window.ITINERARY_TICKETS.getAllTickets()
      .slice()
      .sort((a, b) => (a.startDateTime || '').localeCompare(b.startDateTime || ''));

    const list = all.length
      ? all.map(_ticketRow).join('')
      : `<p style="color:var(--l-muted);font-size:15px;text-align:center;padding:16px 0;">${T('tickets.empty', 'Nessun biglietto salvato. Aggiungine uno qui sotto.')}</p>`;

    const html = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;flex-direction:column;gap:8px;">${list}</div>
        ${_formHTML()}
      </div>`;

    window.openSheet(T('tickets.panelTitle', '🎫 Biglietti'), html);

    const body = window.sheetBody || document.getElementById('sheet-body');
    if (!body) return;

    body.querySelectorAll('.ticket-status-select').forEach(sel => {
      sel.onchange = () => {
        window.ITINERARY_TICKETS.updateTicketStatus(sel.dataset.id, sel.value);
        sel.setAttribute('style', `font-size:13px;padding:3px 8px;border-radius:999px;border:1px solid;${STATUS_STYLE[sel.value] || STATUS_STYLE.booked}`);
      };
    });
    body.querySelectorAll('.ticket-del-btn').forEach(btn => {
      btn.onclick = () => {
        window.ITINERARY_TICKETS.deleteTicket(btn.dataset.id);
        renderTicketsVault();
      };
    });
    const form = body.querySelector('#ticket-add-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        window.ITINERARY_TICKETS.addTicket({
          type: fd.get('type'),
          title: fd.get('title'),
          provider: fd.get('provider'),
          code: fd.get('code'),
          startDateTime: fd.get('startDateTime'),
          linkStopPoi: fd.get('linkStopPoi') || null,
          price: fd.get('price'),
          currency: fd.get('currency'),
          notes: fd.get('notes'),
        });
        window.toast?.(T('tickets.added', '🎫 Biglietto salvato'));
        renderTicketsVault();
      };
    }
  }

  window.renderTicketsVault = renderTicketsVault;
})();
