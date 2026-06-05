// ============================================================================
// group-checklist.js — Checklist condivisa del gruppo (cose da portare/fare)
//
// Organizzazione condivisa: il gruppo costruisce insieme una lista spuntabile
// (es. "snack GF di scorta", "card allergie stampate", "prenotare ristorante
// GF a Kyoto"). Preset gluten-free inclusi. Sincronizzata via MQTT.
//
// Storage: state.groupChecklist = [
//   { id, text, done, doneBy, by, ts }
// ]
// API: window.GroupChecklist = { add, toggle, remove, getAll, openPanel, receive, count, seedDefaults }
// Sync: MQTT type 'group_checklist'
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const _me = () => window.state?.group?.myName || 'io';

  // Preset GF-centrici suggeriti al primo avvio
  const GF_DEFAULTS = [
    '🍪 Snack GF di scorta (barrette, riso)',
    '🗣️ Card allergie celiachia stampate',
    '💊 Farmaci/integratori personali',
    '🔌 Adattatore presa Giappone (tipo A)',
    '📱 App tradotta offline per i menù',
    '🏨 Verificare colazione GF in hotel'
  ];

  function _list() {
    if (!window.state) return [];
    if (!Array.isArray(window.state.groupChecklist)) window.state.groupChecklist = [];
    return window.state.groupChecklist;
  }
  function getAll() { return _list().slice(); }
  function count() { return _list().length; }
  function _open() { return _list().filter(i => !i.done).length; }

  function _broadcast(action, data) {
    const payload = { action, from: _me(), ...data };
    window.rtdbBroadcast?.({ type: 'group_checklist', payload });
    const conns = window.peerGPS?.getPeerConnections?.() || {};
    Object.values(conns).forEach(c => { if (c?.open) { try { c.send({ type: 'group_checklist', payload }); } catch (_) {} } });
  }

  function add(text) {
    text = (text || '').trim();
    if (!text) return false;
    const item = { id: 'ck_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), text, done: false, doneBy: null, by: _me(), ts: Date.now() };
    _list().push(item);
    window.saveState?.();
    _broadcast('add', { item });
    _rerender();
    return true;
  }

  function toggle(id) {
    const it = _list().find(i => i.id === id);
    if (!it) return;
    it.done = !it.done;
    it.doneBy = it.done ? _me() : null;
    window.saveState?.();
    _broadcast('toggle', { id, done: it.done, doneBy: it.doneBy });
    _rerender();
  }

  function remove(id) {
    const l = _list();
    const i = l.findIndex(x => x.id === id);
    if (i === -1) return;
    l.splice(i, 1);
    window.saveState?.();
    _broadcast('remove', { id });
    _rerender();
  }

  function seedDefaults() {
    const l = _list();
    GF_DEFAULTS.forEach(text => {
      if (!l.some(i => i.text === text)) add(text);
    });
  }

  function receive(payload) {
    if (!payload?.action) return;
    const l = _list();
    if (payload.action === 'add' && payload.item?.id) {
      if (!l.some(i => i.id === payload.item.id)) l.push(payload.item);
    } else if (payload.action === 'toggle' && payload.id) {
      const it = l.find(i => i.id === payload.id);
      if (it) { it.done = payload.done; it.doneBy = payload.doneBy; }
    } else if (payload.action === 'remove' && payload.id) {
      const i = l.findIndex(x => x.id === payload.id);
      if (i !== -1) l.splice(i, 1);
    } else return;
    window.saveState?.();
    _rerender();
  }

  function _rerender() { if (document.getElementById('group-ck-body')) openPanel(); }

  function openPanel() {
    const me = _me();
    const items = _list();
    const done = items.filter(i => i.done).length;
    const pct = items.length ? Math.round(done / items.length * 100) : 0;

    const rows = items.map(it => `
      <div style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:9px;margin-bottom:6px;">
        <button onclick="window.GroupChecklist.toggle('${_esc(it.id)}')" style="flex-shrink:0;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;
          background:${it.done ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.06)'};border:1.5px solid ${it.done ? 'rgba(76,175,80,0.7)' : 'rgba(255,255,255,0.2)'};color:#fff;">${it.done ? '✓' : ''}</button>
        <div style="flex:1;min-width:0;">
          <div style="color:#fff;font-size:13px;${it.done ? 'text-decoration:line-through;opacity:0.55;' : ''}">${_esc(it.text)}</div>
          ${it.done && it.doneBy ? `<div style="font-size:10px;color:rgba(255,255,255,0.45);">${T('ck.doneBy', 'fatto da')} ${_esc(it.doneBy)}</div>` : ''}
        </div>
        <button onclick="window.GroupChecklist.remove('${_esc(it.id)}')" style="background:none;border:none;color:rgba(255,255,255,0.35);cursor:pointer;font-size:13px;padding:4px;">🗑️</button>
      </div>`).join('');

    const html = `
      <div id="group-ck-body" style="padding:4px 2px;">
        ${items.length ? `
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#fff;font-size:14px;font-weight:700;">${done}/${items.length} ${T('ck.done', 'completati')}</span>
            <span style="color:${pct === 100 ? '#4ade80' : 'var(--m-accent,#ff7a45)'};font-weight:700;">${pct}%</span>
          </div>
          <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--m-accent,#ff7a45),#4ade80);transition:width 0.3s;"></div>
          </div>
        </div>` : ''}

        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input id="ck-input" type="text" placeholder="${T('ck.placeholder', 'Es: prenotare ristorante GF a Kyoto')}" style="flex:1;padding:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:13px;box-sizing:border-box;">
          <button id="ck-add-btn" style="padding:10px 16px;background:rgba(255,107,53,0.25);border:1.5px solid rgba(255,107,53,0.45);border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">+</button>
        </div>

        ${items.length ? rows : `
          <div style="text-align:center;padding:30px 20px;color:rgba(255,255,255,0.5);">
            <div style="font-size:42px;margin-bottom:12px;">📋</div>
            <p style="margin:0 0 16px;">${T('ck.empty', 'Lista vuota. Aggiungete insieme cosa portare e cosa fare.')}</p>
            <button id="ck-seed-btn" style="padding:10px 18px;background:rgba(74,222,128,0.15);border:1.5px solid rgba(74,222,128,0.4);border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">🍪 ${T('ck.seed', 'Aggiungi preset GF')}</button>
          </div>`}
      </div>`;

    window.openSheet('📋 ' + T('ck.title', 'Checklist del gruppo'), html);

    setTimeout(() => {
      const inp = document.getElementById('ck-input');
      const addBtn = document.getElementById('ck-add-btn');
      const doAdd = () => { if (inp && add(inp.value)) inp.value = ''; };
      if (addBtn) addBtn.onclick = doAdd;
      if (inp) inp.onkeydown = (e) => { if (e.key === 'Enter') doAdd(); };
      document.getElementById('ck-seed-btn')?.addEventListener('click', () => seedDefaults());
    }, 0);
  }

  window.GroupChecklist = { add, toggle, remove, getAll, openPanel, receive, count, seedDefaults };
})();
