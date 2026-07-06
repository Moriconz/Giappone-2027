// ============================================================================
// itinerary-export.js — buildICS, downloadICS, exportItineraryJSON,
//   exportItineraryPDF, exportItineraryWhatsApp, promptAddToCalendar,
//   showExportModal, shareItineraryInGroup
// Extracted from app-core.js. Deps (all window.*):
//   state (itineraryByDay, tripProfile, notes), allPOIs, toast, t, openSheet,
//   getPoiDisplayName, broadcastItinerary
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  // ── ICS helpers ────────────────────────────────────────────────────────────
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toICSDate(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
  }
  function buildICS(events) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Giappone2027//IT', 'CALSCALE:GREGORIAN'];
    events.forEach((ev, i) => {
      lines.push('BEGIN:VEVENT',
        'UID:' + (ev.id || 'ev-' + i) + '@giappone2027',
        'DTSTAMP:' + toICSDate(new Date()),
        'DTSTART:' + toICSDate(new Date(ev.start)),
        'DTEND:' + toICSDate(new Date(ev.end)),
        'SUMMARY:' + (ev.title || '').replace(/,/g, '\\,'),
        'LOCATION:' + (ev.location || '').replace(/,/g, '\\,'),
        'DESCRIPTION:' + ((ev.desc || '').replace(/\n/g, '\\n').replace(/,/g, '\\,')),
        'GEO:' + (ev.lat || '') + ';' + (ev.lng || ''),
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function downloadICS(filename, content) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────
  function _getDayDate(dayIndex) {
    const tp = window.state?.tripProfile || {};
    const base = tp.startDate ? new Date(tp.startDate) : new Date(2027, 3, 10);
    base.setDate(base.getDate() + dayIndex);
    return base;
  }

  function _getAllDaysSorted() {
    const ibd = window.state?.itineraryByDay || {};
    return Object.entries(ibd)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([d, entries]) => ({ dayIdx: Number(d), entries: entries || [] }))
      .filter(d => d.entries.length > 0);
  }

  function _totalPOIs() {
    return _getAllDaysSorted().reduce((s, d) => s + d.entries.length, 0);
  }

  // ── Export: JSON ────────────────────────────────────────────────────────────
  function exportItineraryJSON() {
    const days = _getAllDaysSorted();
    if (!days.length) {
      window.toast(T('toast.addStopsFirst', '⚠️ Aggiungi tappe prima di esportare'));
      return;
    }
    const tp = window.state?.tripProfile || {};
    const notes = window.state?.notes || {};

    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      trip: { name: tp.name || 'Giappone 2027', startDate: tp.startDate || '2027-04-10', days: tp.days || 8 },
      itinerary: days.map(({ dayIdx, entries }) => ({
        day: dayIdx + 1,
        date: _getDayDate(dayIdx).toISOString().split('T')[0],
        entries: entries.map(e => ({
          poi_id: e.poi_id, name: e.poi_name, time: e.time, duration: e.duration,
          cost: e.cost, notes: e.notes || notes[e.poi_id] || null,
          lat: e.lat, lng: e.lng, tag: e.tag
        }))
      })),
      stats: { totalStops: _totalPOIs(), days: days.length }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'giappone-2027-itinerario.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
    window.toast(T('toast.itinJsonExported', 'Itinerario JSON scaricato 📥'));
  }

  // ── Export: PDF (print-to-PDF via browser) ──────────────────────────────────
  function exportItineraryPDF() {
    const days = _getAllDaysSorted();
    if (!days.length) {
      window.toast(T('toast.addStopsFirst', '⚠️ Aggiungi tappe prima di esportare'));
      return;
    }
    const notes = window.state?.notes || {};

    // Riepilogo costi (gap segnalato: il report aveva il costo per tappa ma
    // nessun totale aggregato — riusa getBudgetDB(), già la fonte di verità
    // del modulo Budget, invece di ricalcolare da capo).
    const budgetDb = window.getBudgetDB?.();
    const totalSpent = budgetDb ? window.getTotalSpent?.(budgetDb) : null;
    const curr = budgetDb?.currency && window.CURRENCIES?.[budgetDb.currency];
    const spentStr = (totalSpent != null && curr) ? `${curr.symbol}${Math.round(window.convertCurrency?.(totalSpent, 'JPY', budgetDb.currency) ?? totalSpent)}` : null;

    let body = `<h1>🧭 Tabi — Itinerario</h1>
      <p><strong>Generato:</strong> ${new Date().toLocaleString('it-IT')} · <strong>Giorni:</strong> ${days.length} · <strong>Tappe:</strong> ${_totalPOIs()}${spentStr ? ` · <strong>Speso finora:</strong> ${spentStr}` : ''}</p>`;

    days.forEach(({ dayIdx, entries }) => {
      const dayDate = _getDayDate(dayIdx);
      const dayLabel = dayDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const dayCost = entries.reduce((s, e) => s + (Number(e.cost) || 0), 0);
      body += `<h2>Giorno ${dayIdx + 1} — ${dayLabel}${dayCost ? ` <span class="daycost">¥${dayCost}</span>` : ''}</h2>`;
      entries.forEach((e, idx) => {
        const note = e.notes || notes[e.poi_id];
        body += `<div class="stop">
          <h3>${idx + 1}. ${e.poi_name || e.poi_id}</h3>
          <div class="meta">🕐 ${e.time || '—'} · ⏱ ${e.duration || 60}min${e.cost ? ` · 💴 ¥${e.cost}` : ''}</div>
          ${note ? `<div class="notes"><strong>Note:</strong> ${note}</div>` : ''}
          ${(e.lat && e.lng) ? `<div class="meta"><a href="https://www.google.com/maps?q=${e.lat},${e.lng}">📍 Mappa</a></div>` : ''}
        </div>`;
      });
    });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Tabi — Itinerario</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;color:#333}
        h1{color:#1A3C5E;border-bottom:3px solid #C85C3B;padding-bottom:10px}
        h2{color:#1A3C5E;margin-top:24px;border-left:4px solid #C85C3B;padding-left:10px}
        .daycost{float:right;font-size:15px;color:#C85C3B;font-weight:normal;}
        .stop{margin:12px 0;padding:12px;background:#f5f5f5;border-left:3px solid #E8A838}
        .stop h3{margin:0 0 6px;color:#1A3C5E}.meta{font-size:14px;color:#666;margin:4px 0}
        .notes{font-style:italic;color:#666;margin-top:6px}a{color:#1A3C5E}</style>
      </head><body>${body}<div style="margin-top:30px;border-top:1px solid #ccc;padding-top:10px;font-size:13px;color:#999">Esportato da Tabi</div></body></html>`;

    const w = window.open('', '_blank');
    if (!w) { window.toast(T('toast.popupBlocked', '⚠️ Consenti i popup per esportare il PDF')); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 500);
  }

  // ── Export: WhatsApp / clipboard ─────────────────────────────────────────────
  function exportItineraryWhatsApp() {
    const days = _getAllDaysSorted();
    if (!days.length) {
      window.toast(T('toast.itinEmptyActions', '❌ Itinerario vuoto. Aggiungi tappe prima!'));
      return;
    }

    let text = '🗾 GIAPPONE 2027 — ITINERARIO\n\n';
    text += `📅 ${new Date().toLocaleDateString('it-IT')} · ${_totalPOIs()} tappe\n`;
    text += '━━━━━━━━━━━━━━━━━━━━━━━\n';

    days.forEach(({ dayIdx, entries }) => {
      const dayDate = _getDayDate(dayIdx);
      const dayLabel = dayDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      text += `\n📅 GIORNO ${dayIdx + 1} — ${dayLabel}\n─ ─ ─ ─ ─ ─ ─ ─ ─ ─\n`;
      entries.forEach((e, idx) => {
        text += `${idx + 1}. 📍 ${e.poi_name || e.poi_id}\n`;
        if (e.time) text += `   🕐 ${e.time}${e.duration ? ` (${e.duration}min)` : ''}\n`;
        if (e.cost) text += `   💴 ¥${e.cost}\n`;
        if (e.notes) text += `   📝 ${e.notes}\n`;
      });
    });

    text += '\n━━━━━━━━━━━━━━━━━━━━━━━\n✈️ Creato con Giappone 2027\n';

    navigator.clipboard.writeText(text).then(() => {
      window.toast(T('toast.itinCopied', '✅ Itinerario copiato! Incollalo su WhatsApp'));
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    }).catch(() => { showExportModal(text); });
  }

  function showExportModal(text) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;inset:0;z-index:3001;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px" id="export-modal">
        <div style="background:var(--surface);border-radius:12px;padding:20px;max-width:380px;width:100%;max-height:70vh;overflow-y:auto">
          <h3 style="margin:0 0 14px;color:var(--accent)">📋 Itinerario da Esportare</h3>
          <pre style="background:var(--surface-2);padding:12px;border-radius:8px;font-size:13px;color:var(--text);overflow-x:auto;max-height:300px">${text.replace(/</g,'&lt;')}</pre>
          <div style="display:flex;gap:8px;margin-top:14px">
            <button onclick="document.getElementById('export-modal').remove()" style="flex:1;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer">Chiudi</button>
            <button onclick="navigator.clipboard.writeText(this.dataset.t);window.toast?.('✅ Copiato!')" data-t="${text.replace(/"/g,'&quot;')}" style="flex:1;padding:10px;background:var(--accent);border:none;border-radius:8px;color:#fff;cursor:pointer;font-weight:600">📋 Copia</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  // ── Add single POI to calendar ──────────────────────────────────────────────
  function promptAddToCalendar(p) {
    const html = `
      <div class="form-row"><label>Data inizio</label><input type="datetime-local" id="cal-start" required/></div>
      <div class="form-row"><label>Durata (minuti)</label>
        <select id="cal-dur">
          <option value="60">1 ora</option><option value="90" selected>1.5 ore</option>
          <option value="120">2 ore</option><option value="180">3 ore</option>
          <option value="240">4 ore</option><option value="480">Tutto il giorno (8h)</option>
        </select></div>
      <div class="action-row"><button class="btn primary" id="cal-export">📥 Scarica .ics</button></div>
      <div class="section" style="margin-top:14px"><h3>ℹ️ Come usare il file .ics</h3>
        <p style="font-size:14px;color:var(--muted)">Scarica il file e aprilo col tuo telefono: Google Calendar, Apple Calendar e Outlook lo importano automaticamente.</p>
      </div>`;
    window.openSheet('📅 Aggiungi a calendario', html);
    document.getElementById('cal-export').onclick = () => {
      const startVal = document.getElementById('cal-start').value;
      const dur = parseInt(document.getElementById('cal-dur').value, 10);
      if (!startVal) { window.toast(T('cal.selectDateTime', '⚠️ Seleziona data/ora')); return; }
      const start = new Date(startVal);
      const end = new Date(start.getTime() + dur * 60000);
      const notes = window.state?.notes?.[p.id] || '';
      const ics = buildICS([{
        id: p.id, title: window.getPoiDisplayName(p), location: (p.city || '') + ', Giappone',
        desc: (p.desc || '') + (p.gf?.notes ? '\n\nGluten-Free: ' + p.gf.notes : '') + (notes ? '\n\nNote: ' + notes : ''),
        lat: p.lat, lng: p.lng, start, end
      }]);
      downloadICS(`${p.id}_${window.getPoiDisplayName(p).replace(/[^a-z0-9]/gi, '_')}.ics`, ics);
      window.toast(T('toast.calExported', '📅 Calendario scaricato'));
    };
  }

  // ── Share itinerary in group ─────────────────────────────────────────────────
  function shareItineraryInGroup() {
    if (!_totalPOIs()) {
      window.toast(T('toast.itinEmpty', '❌ Itinerario vuoto!'));
      return;
    }
    window.broadcastItinerary?.();
    window.toast(T('toast.itinShared', '✅ Itinerario condiviso con il gruppo!'));
  }

  // ── Global POI cache (used by poi-detail-view.js + map-markers.js) ───────────
  let globalPOIsCache = null;
  function getCachedAllPOIs() {
    if (!globalPOIsCache) {
      globalPOIsCache = window.allPOIs?.() || [];
      console.log('[getCachedAllPOIs] Cache MISS — rebuilt:', globalPOIsCache.length, 'POIs');
    }
    return globalPOIsCache;
  }
  window.getCachedAllPOIs = getCachedAllPOIs;
  window.invalidatePOIsCache = function () { globalPOIsCache = null; };

  // Invalidate POI cache on every save (state may have new custom events / overrides)
  const _origSave = window.saveState;
  window.saveState = function () {
    globalPOIsCache = null;
    _origSave?.apply(this, arguments);
  };

  window.buildICS = buildICS;
  window.downloadICS = downloadICS;
  window.exportItineraryJSON = exportItineraryJSON;
  window.exportItineraryPDF = exportItineraryPDF;
  window.promptAddToCalendar = promptAddToCalendar;
  window.exportItineraryWhatsApp = exportItineraryWhatsApp;
  window.shareItineraryInGroup = shareItineraryInGroup;
})();
