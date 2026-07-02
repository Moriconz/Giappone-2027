/**
 * gf-crowdsource.js — Riscontri gluten-free condivisi nel gruppo
 *
 * Il cuore del prodotto è la fiducia sul "qui posso mangiare?". Il detector
 * euristico (gfDetector.js) dà una stima; questo modulo aggiunge la **verità sul
 * campo**: gli amici del gruppo confermano "✅ GF safe" o segnalano "⚠️ problema",
 * con una nota. I riscontri si accumulano per-POI e si propagano via MQTT.
 *
 * Coerente con l'architettura "app tra amici": nessun backend, sync sul broker
 * pubblico già usato per chat/itinerario. Se un domani serve moderazione/scala,
 * qui si innesta un endpoint.
 *
 * Storage: `state.gfReports = { [poiId]: [{ id, by, type, note, ts }] }`
 *   type: 'safe' | 'warning' | 'note'
 *
 * UI: si auto-inietta in qualsiasi `[data-gf-crowd]` che appare nel DOM (via
 * MutationObserver) — disaccoppiato dal rendering del dettaglio POI.
 *
 * Esposto:
 *   - window.GFCrowd = { addReport, getReports, summary, receiveReport, renderInto }
 *
 * Dipendenze (tutte su window):
 *   - window.state.gfReports, window.saveState
 *   - window.state.group (autore = myName)
 *   - window.peerBroadcast / window.peerGPS (sync)
 *   - window.toast, window.t
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  function _store() {
    if (!window.state) return {};
    if (!window.state.gfReports || typeof window.state.gfReports !== 'object') window.state.gfReports = {};
    return window.state.gfReports;
  }

  function getReports(poiId) {
    const list = _store()[poiId];
    return Array.isArray(list) ? list : [];
  }

  function summary(poiId) {
    const list = getReports(poiId);
    let safe = 0, warning = 0, note = 0;
    list.forEach(r => {
      if (r.type === 'safe') safe++;
      else if (r.type === 'warning') warning++;
      else note++;
    });
    return { safe, warning, note, total: list.length };
  }

  function _newId() { return 'gfr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  // Aggiunge un riscontro locale + broadcast. type: safe|warning|note
  function addReport(poiId, poiName, type, note) {
    if (!poiId || !['safe', 'warning', 'note'].includes(type)) return null;
    const by = window.state?.group?.myName || T('gfc.anon', 'Tu');
    const report = { id: _newId(), by, type, note: (note || '').slice(0, 200), ts: Date.now() };

    const store = _store();
    if (!Array.isArray(store[poiId])) store[poiId] = [];
    store[poiId].push(report);
    window.saveState?.();

    // Broadcast (se in gruppo)
    if (window.state?.group?.roomId) {
      const payload = { poiId, poiName: poiName || '', report };
      window.peerBroadcast?.({ type: 'gf_report', payload });
      const peerConnections = window.peerGPS?.getPeerConnections?.() || {};
      Object.values(peerConnections).forEach(conn => {
        if (conn && conn.open) { try { conn.send({ type: 'gf_report', payload }); } catch (_) {} }
      });
    }

    _refreshContainers(poiId);
    const label = type === 'safe' ? T('gfc.thanksSafe', 'Grazie! Riscontro GF registrato')
      : type === 'warning' ? T('gfc.thanksWarn', 'Segnalazione registrata')
      : T('gfc.thanksNote', 'Nota aggiunta');
    window.toast?.('✅ ' + label);
    return report;
  }

  // Applica un riscontro ricevuto da un peer (dedup per id)
  function receiveReport(payload) {
    if (!payload || !payload.poiId || !payload.report?.id) return;
    const store = _store();
    if (!Array.isArray(store[payload.poiId])) store[payload.poiId] = [];
    if (store[payload.poiId].some(r => r.id === payload.report.id)) return; // dup
    store[payload.poiId].push(payload.report);
    window.saveState?.();
    _refreshContainers(payload.poiId);
  }

  // ─── UI ──────────────────────────────────────────────────────────────

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _timeAgo(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return T('gfc.now', 'ora');
    if (m < 60) return m + T('gfc.mAgo', 'm fa');
    const h = Math.floor(m / 60);
    if (h < 24) return h + T('gfc.hAgo', 'h fa');
    return Math.floor(h / 24) + T('gfc.dAgo', 'g fa');
  }

  function buildHTML(poiId, poiName) {
    const s = summary(poiId);
    const list = getReports(poiId).slice().sort((a, b) => b.ts - a.ts).slice(0, 8);
    const inGroup = !!window.state?.group?.roomId;

    const summaryChips = `
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <span style="background:rgba(76,175,80,0.18);border:1px solid rgba(76,175,80,0.4);border-radius:999px;padding:3px 10px;font-size:12px;color:#16a34a;font-weight:700;">✅ ${s.safe}</span>
        <span style="background:rgba(255,180,80,0.16);border:1px solid rgba(255,180,80,0.4);border-radius:999px;padding:3px 10px;font-size:12px;color:#b45309;font-weight:700;">⚠️ ${s.warning}</span>
        ${s.note ? `<span style="background:rgba(20,30,60,0.05);border:1px solid rgba(20,30,60,0.14);border-radius:999px;padding:3px 10px;font-size:12px;color:var(--l-muted);font-weight:600;">💬 ${s.note}</span>` : ''}
      </div>`;

    const rows = list.length ? list.map(r => {
      const icon = r.type === 'safe' ? '✅' : r.type === 'warning' ? '⚠️' : '💬';
      const col = r.type === 'safe' ? '#16a34a' : r.type === 'warning' ? '#b45309' : 'var(--l-muted)';
      return `
        <div style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid rgba(20,30,60,0.08);">
          <span style="font-size:14px;flex-shrink:0;">${icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;color:var(--l-ink);"><strong style="color:${col};">${_esc(r.by)}</strong> · <span style="color:var(--l-faint);font-size:11px;">${_timeAgo(r.ts)}</span></div>
            ${r.note ? `<div style="font-size:12px;color:var(--l-muted);margin-top:2px;word-break:break-word;">${_esc(r.note)}</div>` : ''}
          </div>
        </div>`;
    }).join('') : `<div style="font-size:12px;color:var(--l-faint);padding:6px 0;">${T('gfc.empty', 'Ancora nessun riscontro. Sii il primo a confermare!')}</div>`;

    const pn = _esc(poiName || '');
    const actions = `
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button onclick="window.GFCrowd.addReport('${_esc(poiId)}','${pn}','safe')" style="flex:1;min-width:90px;padding:8px;background:rgba(76,175,80,0.22);border:1.5px solid rgba(76,175,80,0.5);border-radius:7px;color:#166534;font-size:12px;font-weight:600;cursor:pointer;">✅ ${T('gfc.btnSafe', 'GF safe')}</button>
        <button onclick="window.GFCrowd.addReport('${_esc(poiId)}','${pn}','warning')" style="flex:1;min-width:90px;padding:8px;background:rgba(255,180,80,0.18);border:1.5px solid rgba(255,180,80,0.45);border-radius:7px;color:#92400e;font-size:12px;font-weight:600;cursor:pointer;">⚠️ ${T('gfc.btnWarn', 'Problema')}</button>
        <button onclick="window.GFCrowd.promptNote('${_esc(poiId)}','${pn}')" style="flex:1;min-width:90px;padding:8px;background:rgba(20,30,60,0.05);border:1.5px solid rgba(20,30,60,0.16);border-radius:7px;color:var(--l-ink);font-size:12px;font-weight:600;cursor:pointer;">💬 ${T('gfc.btnNote', 'Nota')}</button>
      </div>`;

    return `
      <div style="background:rgba(74,91,168,0.06);border:1.5px solid rgba(20,30,60,0.1);border-radius:14px;padding:14px;margin:8px 16px 16px;">
        <h3 style="margin:0 0 4px 0;color:var(--l-ink);font-size:14px;font-weight:700;">🤝 ${T('gfc.title', 'Riscontri del gruppo')}</h3>
        <p style="margin:0 0 10px 0;font-size:11px;color:var(--l-faint);">${inGroup ? T('gfc.subIn', 'Condivisi con il tuo gruppo') : T('gfc.subOut', 'Salvati in locale (unisciti a un gruppo per condividerli)')}</p>
        ${summaryChips}
        <div>${rows}</div>
        ${actions}
      </div>`;
  }

  function renderInto(el) {
    if (!el) return;
    const poiId = el.getAttribute('data-gf-crowd');
    const poiName = el.getAttribute('data-gf-crowd-name') || '';
    if (!poiId) return;
    el.innerHTML = buildHTML(poiId, poiName);
  }

  function _refreshContainers(poiId) {
    document.querySelectorAll(`[data-gf-crowd="${CSS.escape ? CSS.escape(poiId) : poiId}"]`).forEach(renderInto);
  }

  // Prompt per nota libera
  async function promptNote(poiId, poiName) {
    const txt = await (window.modalPrompt || ((msg, o) => Promise.resolve(prompt(msg, o?.defaultValue || ''))))(
      T('gfc.notePrompt', 'Aggiungi una nota GF:'),
      { placeholder: 'Es: hanno menu senza glutine dedicato' }
    );
    if (txt && txt.trim()) addReport(poiId, poiName, 'note', txt.trim());
  }

  // ─── Auto-inject via MutationObserver ────────────────────────────────
  function _scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('[data-gf-crowd]') : []).forEach(el => {
      if (!el.__gfCrowdRendered) { el.__gfCrowdRendered = true; renderInto(el); }
    });
  }

  function _installObserver() {
    try {
      const obs = new MutationObserver((muts) => {
        for (const m of muts) {
          m.addedNodes && m.addedNodes.forEach(n => {
            if (n.nodeType === 1) {
              if (n.hasAttribute && n.hasAttribute('data-gf-crowd') && !n.__gfCrowdRendered) { n.__gfCrowdRendered = true; renderInto(n); }
              _scan(n);
            }
          });
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      _scan(document); // iniziale
    } catch (e) { console.warn('[gf-crowd] observer failed', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _installObserver);
  } else {
    _installObserver();
  }

  window.GFCrowd = { addReport, getReports, summary, receiveReport, renderInto, promptNote };
})();
