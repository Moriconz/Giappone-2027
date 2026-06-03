/**
 * audit-log-viewer.js — Cronologia modifiche itinerari di gruppo
 *
 * Risolve un gap UI documentato in STATO_APP.md §8.3: il codice di scrittura
 * dell'audit log esiste da tempo in app-core.js (`addTappaAuditEntry` chiamato
 * da firebase-rtdb.js su 4 eventi sync), ma le funzioni di visualizzazione
 * (`formatAuditLog`, `getLastModifiedInfo`) erano definite e mai chiamate.
 *
 * Questo modulo aggrega tutta la modificationHistory di tutte le tappe degli
 * itinerari di gruppo in una timeline cronologica unificata e la mostra in
 * un panel "📜 Cronologia gruppo" accessibile dal pannello gruppo.
 *
 * Esposto:
 *   - window.AuditLogViewer = { collect, openPanel, getLastModifiedSummary }
 *   - window.openGroupAuditLog() → apre il panel
 *
 * Dipendenze esterne (tutte su window):
 *   - window.state.groupItineraries  (mappa groupItinId → {pois: [...], groupId})
 *   - window.state.group?.roomId     gruppo corrente
 *   - window.openSheet(t, html)
 *   - window.toast(msg)
 *   - window.t(key, fallback)
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  // Color palette per le iniziali degli autori (deterministica)
  const AVATAR_COLORS = [
    '#FF6B35', '#FFC857', '#6B9BFF', '#7FE2A9', '#E07AFF',
    '#FFB088', '#88E0FF', '#FFD45A', '#A88BFF', '#FF8DC7'
  ];

  function _hashStr(s) {
    s = String(s || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function _avatarColor(name) {
    return AVATAR_COLORS[_hashStr(name) % AVATAR_COLORS.length];
  }

  function _initials(name) {
    const n = String(name || '?').trim();
    if (!n) return '?';
    const parts = n.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function _timeAgo(ts) {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return d + T('audit.dAgo', 'g fa');
    if (h > 0) return h + T('audit.hAgo', 'h fa');
    if (m > 0) return m + T('audit.mAgo', 'm fa');
    if (s > 5) return s + T('audit.sAgo', 's fa');
    return T('audit.now', 'proprio adesso');
  }

  function _actionLabel(action) {
    switch (action) {
      case 'added':         return { icon: '➕', label: T('audit.action.added', 'Aggiunto'), tone: 'rgba(127,226,169,0.18)' };
      case 'removed':       return { icon: '🗑️', label: T('audit.action.removed', 'Rimosso'), tone: 'rgba(255,107,107,0.18)' };
      case 'reordered':     return { icon: '↕️', label: T('audit.action.reordered', 'Riordinato'), tone: 'rgba(255,200,87,0.18)' };
      case 'note_updated':  return { icon: '📝', label: T('audit.action.note', 'Nota aggiornata'), tone: 'rgba(120,180,255,0.18)' };
      case 'modify_field':  return { icon: '✏️', label: T('audit.action.modified', 'Modificato'), tone: 'rgba(180,150,255,0.18)' };
      case 'modify_opening_hours': return { icon: '⏰', label: T('audit.action.hours', 'Orari aggiornati'), tone: 'rgba(120,200,180,0.18)' };
      case 'soft_delete_poi': return { icon: '🚫', label: T('audit.action.softDelete', 'Eliminato'), tone: 'rgba(255,140,140,0.16)' };
      default:              return { icon: '•', label: action || T('audit.action.unknown', 'Evento'), tone: 'rgba(255,255,255,0.08)' };
    }
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Aggrega tutti gli eventi audit degli itinerari di gruppo del room corrente.
   * Restituisce array ordinato per timestamp desc (più recente in cima).
   * Optional: filtra solo per actionType.
   */
  function collect({ filterAction = null, limit = 200 } = {}) {
    const events = [];
    const itineraries = window.state?.groupItineraries || {};
    const myRoom = window.state?.group?.roomId;

    Object.values(itineraries).forEach(itin => {
      // Considera solo itinerari del room corrente (se siamo in un gruppo).
      // Se non in gruppo, mostra tutti gli eventi salvati in state.
      if (myRoom && itin.groupId && itin.groupId !== myRoom) return;

      const pois = Array.isArray(itin.pois) ? itin.pois : [];
      pois.forEach(p => {
        const history = p?.audit?.modificationHistory;
        if (!Array.isArray(history)) return;
        history.forEach(entry => {
          if (filterAction && entry.action !== filterAction) return;
          events.push({
            at: entry.at,
            by: entry.by,
            action: entry.action,
            poiName: p.name || p.poi_name || p.bestname || p.googlePlaceId || '(POI senza nome)',
            poiId: p.id || p.googlePlaceId,
            itineraryId: itin.id,
            groupId: itin.groupId,
            extra: entry
          });
        });
      });
    });

    events.sort((a, b) => (b.at || 0) - (a.at || 0));
    return limit > 0 ? events.slice(0, limit) : events;
  }

  /**
   * Riassunto: chi e quando ha modificato per ultimo (per intero gruppo).
   * Restituisce {by, at, text} o null.
   */
  function getLastModifiedSummary() {
    const all = collect({ limit: 1 });
    if (!all.length) return null;
    const e = all[0];
    return {
      by: e.by, at: e.at,
      text: `${T('audit.action.' + e.action, e.action)} · ${e.by} · ${_timeAgo(e.at)}`
    };
  }

  function _renderEventRow(e) {
    const meta = _actionLabel(e.action);
    const color = _avatarColor(e.by);
    const ini = _initials(e.by);
    const extras = [];
    if (e.extra?.note) extras.push(`<span style="opacity:.75">"${_esc(String(e.extra.note).slice(0, 80))}${e.extra.note.length > 80 ? '…' : ''}"</span>`);
    if (e.extra?.field) extras.push(`<code style="opacity:.7;font-size:11px">${_esc(e.extra.field)}</code>`);

    return `
      <div style="
        display:flex;gap:10px;align-items:flex-start;
        padding:10px 12px;background:rgba(255,255,255,0.03);
        border:1px solid rgba(255,255,255,0.06);border-radius:10px;">
        <div style="
          flex:0 0 auto;width:32px;height:32px;border-radius:50%;
          background:${color};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;font-family:'SF Mono',Menlo,monospace;
          letter-spacing:-.5px;">
          ${_esc(ini)}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap;">
            <div style="font-size:13px;color:#fff;">
              <strong>${_esc(e.by)}</strong>
              <span style="background:${meta.tone};padding:2px 7px;border-radius:999px;font-size:10.5px;font-weight:600;margin:0 4px;">
                ${meta.icon} ${_esc(meta.label)}
              </span>
            </div>
            <div style="font-size:10.5px;color:rgba(255,255,255,0.5);font-family:'SF Mono',Menlo,monospace;white-space:nowrap;">
              ${_timeAgo(e.at)}
            </div>
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:3px;line-height:1.4;">
            ${_esc(e.poiName)}
          </div>
          ${extras.length ? `<div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:4px;">${extras.join(' ')}</div>` : ''}
        </div>
      </div>
    `;
  }

  function openPanel(opts = {}) {
    if (typeof window.openSheet !== 'function') {
      console.warn('[audit-log] window.openSheet non disponibile');
      return;
    }

    const events = collect(opts);

    if (events.length === 0) {
      const empty = `
        <div style="padding:24px 14px;text-align:center;color:rgba(255,255,255,0.55);font-size:13px;line-height:1.6;">
          <div style="font-size:36px;margin-bottom:8px;">📭</div>
          <p style="margin:0;">${T('audit.empty', 'Nessuna modifica registrata in questo gruppo.')}</p>
          <p style="margin:6px 0 0;font-size:11.5px;color:rgba(255,255,255,0.42);">
            ${T('audit.emptyHint', 'Gli eventi appaiono qui appena qualcuno modifica una tappa dell\'itinerario condiviso.')}
          </p>
        </div>
      `;
      window.openSheet(T('audit.title', '📜 Cronologia modifiche'), empty);
      return;
    }

    const filtered = opts.filterAction;
    const filterChips = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;font-size:11.5px;">
        <button data-audit-filter="" style="
          padding:6px 11px;border-radius:999px;cursor:pointer;
          background:${!filtered ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.05)'};
          border:1.5px solid ${!filtered ? 'rgba(255,107,53,0.55)' : 'rgba(255,255,255,0.12)'};
          color:#fff;font-weight:600;">
          ${T('audit.filterAll', 'Tutti')}
        </button>
        <button data-audit-filter="added" style="
          padding:6px 11px;border-radius:999px;cursor:pointer;
          background:${filtered === 'added' ? 'rgba(127,226,169,0.25)' : 'rgba(255,255,255,0.05)'};
          border:1.5px solid ${filtered === 'added' ? 'rgba(127,226,169,0.55)' : 'rgba(255,255,255,0.12)'};
          color:#fff;font-weight:600;">
          ➕ ${T('audit.action.added', 'Aggiunti')}
        </button>
        <button data-audit-filter="removed" style="
          padding:6px 11px;border-radius:999px;cursor:pointer;
          background:${filtered === 'removed' ? 'rgba(255,107,107,0.25)' : 'rgba(255,255,255,0.05)'};
          border:1.5px solid ${filtered === 'removed' ? 'rgba(255,107,107,0.55)' : 'rgba(255,255,255,0.12)'};
          color:#fff;font-weight:600;">
          🗑️ ${T('audit.action.removed', 'Rimossi')}
        </button>
        <button data-audit-filter="note_updated" style="
          padding:6px 11px;border-radius:999px;cursor:pointer;
          background:${filtered === 'note_updated' ? 'rgba(120,180,255,0.25)' : 'rgba(255,255,255,0.05)'};
          border:1.5px solid ${filtered === 'note_updated' ? 'rgba(120,180,255,0.55)' : 'rgba(255,255,255,0.12)'};
          color:#fff;font-weight:600;">
          📝 ${T('audit.filterNotes', 'Note')}
        </button>
      </div>
    `;

    const rows = events.map(_renderEventRow).join('');
    const countText = T('audit.countShown', 'eventi mostrati');

    const html = `
      <div style="padding:4px 0;display:flex;flex-direction:column;gap:10px;">
        <div style="font-size:11.5px;color:rgba(255,255,255,0.6);">
          ${events.length} ${countText}
        </div>
        ${filterChips}
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${rows}
        </div>
        <p style="text-align:center;font-size:10.5px;color:rgba(255,255,255,0.50);margin-top:6px;">
          ${T('audit.footer', 'Cronologia salvata solo localmente. Si propaga via MQTT quando i membri sono online.')}
        </p>
      </div>
    `;

    window.openSheet(T('audit.title', '📜 Cronologia modifiche'), html);

    // Click delegation per i filtri (replaces panel re-render)
    setTimeout(() => {
      document.querySelectorAll('[data-audit-filter]').forEach(btn => {
        btn.onclick = () => {
          const f = btn.getAttribute('data-audit-filter');
          openPanel(f ? { filterAction: f } : {});
        };
      });
    }, 30);
  }

  window.AuditLogViewer = { collect, openPanel, getLastModifiedSummary };
  window.openGroupAuditLog = openPanel;
})();
