// ============================================================================
// group-expenses.js — Divisione spese di gruppo (chi ha pagato, chi deve a chi)
//
// Parte dell'organizzazione condivisa del viaggio: ogni spesa registra chi ha
// pagato e tra chi si divide. Il pannello calcola i saldi e i rimborsi minimi
// ("Luca deve a Marco ¥X"). Sincronizzato via MQTT come chat/wishlist.
//
// Storage: state.groupExpenses = [
//   { id, desc, amount (JPY), paidBy, splitAmong: [name…], by, ts }
// ]
// API: window.GroupExpenses = { add, remove, getAll, balances, settlements, openPanel, receive, count }
// Sync: MQTT type 'group_expense'
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Per valori dentro onclick="fn('...')": _esc() da solo non basta, l'HTML
  // decodifica le entity dell'attributo prima che il JS venga eseguito. Gli
  // id sono generati internamente ma un peer malevolo può spedire una entry
  // con un id arbitrario via MQTT (receive() la accetta senza validare il
  // formato) — vettore reale, non solo teorico.
  const _escJs = (s) => _esc(String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
  const _me = () => window.state?.group?.myName || null;
  const _yen = (n) => '¥' + Math.round(n).toLocaleString('it-IT');

  function _list() {
    if (!window.state) return [];
    if (!Array.isArray(window.state.groupExpenses)) window.state.groupExpenses = [];
    return window.state.groupExpenses;
  }
  function getAll() { return _list().slice(); }
  function count() { return _list().length; }

  function _members() {
    const m = (window.state?.group?.members || []).map(x => x.name).filter(Boolean);
    const me = _me();
    if (me && !m.includes(me)) m.unshift(me);
    return m.length ? m : (me ? [me] : []);
  }

  function _broadcast(action, data) {
    const payload = { action, from: _me(), ...data };
    window.peerBroadcast?.({ type: 'group_expense', payload });
    const conns = window.peerGPS?.getPeerConnections?.() || {};
    Object.values(conns).forEach(c => { if (c?.open) { try { c.send({ type: 'group_expense', payload }); } catch (_) {} } });
  }

  // ── Aggiungi una spesa ───────────────────────────────────────────────────────
  function add(desc, amount, paidBy, splitAmong) {
    amount = parseFloat(amount);
    if (!desc || !amount || amount <= 0) { window.toast?.(T('exp.invalid', '⚠️ Inserisci descrizione e importo')); return false; }
    paidBy = paidBy || _me() || 'io';
    const members = _members();
    splitAmong = (Array.isArray(splitAmong) && splitAmong.length) ? splitAmong : members;
    const exp = { id: 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), desc: desc.trim(), amount, paidBy, splitAmong, by: _me() || paidBy, ts: Date.now() };
    _list().push(exp);
    window.saveState?.();
    _broadcast('add', { expense: exp });
    window.toast?.(T('exp.added', '💴 Spesa registrata'));
    _rerender();
    return true;
  }

  function remove(id) {
    const l = _list();
    const i = l.findIndex(e => e.id === id);
    if (i === -1) return;
    l.splice(i, 1);
    window.saveState?.();
    _broadcast('remove', { id });
    _rerender();
  }

  // ── Saldi: per ogni persona, pagato − quota dovuta ───────────────────────────
  function balances() {
    const bal = {};
    _members().forEach(m => bal[m] = 0);
    _list().forEach(e => {
      const share = e.amount / (e.splitAmong.length || 1);
      if (!(e.paidBy in bal)) bal[e.paidBy] = 0;
      bal[e.paidBy] += e.amount;            // ha anticipato
      e.splitAmong.forEach(m => { if (!(m in bal)) bal[m] = 0; bal[m] -= share; }); // deve la sua quota
    });
    return bal; // >0 = gli devono, <0 = deve
  }

  // ── Rimborsi minimi: chi deve a chi ──────────────────────────────────────────
  function settlements() {
    const bal = balances();
    const debtors = [], creditors = [];
    Object.entries(bal).forEach(([m, v]) => {
      if (v < -1) debtors.push({ m, v: -v });
      else if (v > 1) creditors.push({ m, v });
    });
    debtors.sort((a, b) => b.v - a.v); creditors.sort((a, b) => b.v - a.v);
    const out = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].v, creditors[j].v);
      out.push({ from: debtors[i].m, to: creditors[j].m, amount: pay });
      debtors[i].v -= pay; creditors[j].v -= pay;
      if (debtors[i].v < 1) i++;
      if (creditors[j].v < 1) j++;
    }
    return out;
  }

  function receive(payload) {
    if (!payload?.action) return;
    const l = _list();
    if (payload.action === 'add' && payload.expense?.id) {
      if (!l.some(e => e.id === payload.expense.id)) l.push(payload.expense);
    } else if (payload.action === 'remove' && payload.id) {
      const i = l.findIndex(e => e.id === payload.id);
      if (i !== -1) l.splice(i, 1);
    } else return;
    window.saveState?.();
    _rerender();
  }

  function _rerender() { if (document.getElementById('group-exp-body')) openPanel(); }

  // ── Pannello ─────────────────────────────────────────────────────────────────
  function openPanel() {
    const me = _me();
    const members = _members();
    const bal = balances();
    const setts = settlements();
    const total = _list().reduce((s, e) => s + e.amount, 0);

    const memberOpts = members.map(m => `<option value="${_esc(m)}" ${m === me ? 'selected' : ''}>${_esc(m)}</option>`).join('');

    const balRows = Object.entries(bal).sort((a, b) => b[1] - a[1]).map(([m, v]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(20,30,60,0.08);">
        <span style="color:var(--l-ink);font-size:16px;font-weight:600;">${_esc(m)}${m === me ? ' <span style="font-size:12px;color:var(--l-muted)">(tu)</span>' : ''}</span>
        <span class="gx-amount" style="font-weight:700;color:${v > 1 ? '#16a34a' : v < -1 ? '#dc2626' : 'var(--l-muted)'};">${v > 1 ? '+' : ''}${_yen(v)}</span>
      </div>`).join('');

    const settRows = setts.length ? setts.map(s => `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,107,53,0.08);border:1px solid rgba(255,107,53,0.25);border-radius:8px;margin-bottom:6px;">
        <span class="gx-amount" style="color:#dc2626;font-weight:700;">${_esc(s.from)}</span>
        <span style="color:var(--l-muted);">→</span>
        <span class="gx-amount" style="color:#16a34a;font-weight:700;">${_esc(s.to)}</span>
        <span style="margin-left:auto;color:var(--l-ink);font-weight:800;">${_yen(s.amount)}</span>
      </div>`).join('') : `<p style="color:var(--l-muted);font-size:15px;text-align:center;padding:10px;">${T('exp.allSettled', '✅ Tutti pari, nessun rimborso')}</p>`;

    const expRows = _list().slice().reverse().map(e => `
      <div style="display:flex;align-items:center;gap:8px;padding:10px;background:rgba(20,30,60,0.03);border:1px solid rgba(20,30,60,0.08);border-radius:8px;margin-bottom:6px;">
        <div style="flex:1;min-width:0;">
          <div style="color:var(--l-ink);font-size:15px;font-weight:600;">${_esc(e.desc)}</div>
          <div style="color:var(--l-muted);font-size:13px;">${T('exp.paidBy', 'pagato da')} ${_esc(e.paidBy)} · ${T('exp.splitN', 'diviso tra')} ${e.splitAmong.length}</div>
        </div>
        <div style="color:var(--l-ink);font-weight:700;font-size:16px;">${_yen(e.amount)}</div>
        ${(e.by === me || e.paidBy === me) ? `<button onclick="window.GroupExpenses.remove('${_escJs(e.id)}')" style="background:none;border:none;color:var(--l-faint);cursor:pointer;font-size:16px;padding:4px;">🗑️</button>` : ''}
      </div>`).join('');

    const html = `
      <div id="group-exp-body" style="padding:4px 2px;">
        <!-- Saldi -->
        <div style="background:rgba(20,30,60,0.04);border:1px solid rgba(20,30,60,0.1);border-radius:12px;padding:14px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <h3 style="margin:0;color:var(--m-accent,#ff7a45);font-size:16px;font-weight:700;">${T('exp.balances', 'Saldi')}</h3>
            <span style="color:var(--l-muted);font-size:14px;">${T('exp.total', 'Totale')}: ${_yen(total)}</span>
          </div>
          ${balRows || `<p style="color:var(--l-muted);font-size:15px;">${T('exp.noMembers', 'Nessun membro')}</p>`}
        </div>

        <!-- Rimborsi -->
        <div style="background:rgba(20,30,60,0.04);border:1px solid rgba(20,30,60,0.1);border-radius:12px;padding:14px;margin-bottom:12px;">
          <h3 style="margin:0 0 10px;color:var(--m-accent,#ff7a45);font-size:16px;font-weight:700;">${T('exp.whoOwes', 'Chi deve a chi')}</h3>
          ${settRows}
        </div>

        <!-- Aggiungi spesa -->
        <div style="background:rgba(20,30,60,0.04);border:1px solid rgba(20,30,60,0.1);border-radius:12px;padding:14px;margin-bottom:12px;">
          <h3 style="margin:0 0 10px;color:var(--m-accent,#ff7a45);font-size:16px;font-weight:700;">${T('exp.add', 'Aggiungi spesa')}</h3>
          <input id="exp-desc" type="text" placeholder="${T('exp.descPh', 'Es: cena ramen GF')}" style="width:100%;padding:9px;margin-bottom:8px;background:rgba(20,30,60,0.05);border:1px solid rgba(20,30,60,0.15);border-radius:7px;color:var(--l-ink);font-size:15px;box-sizing:border-box;">
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input id="exp-amount" type="number" min="0" placeholder="¥0" style="flex:1;padding:9px;background:rgba(20,30,60,0.05);border:1px solid rgba(20,30,60,0.15);border-radius:7px;color:var(--l-ink);font-size:15px;box-sizing:border-box;">
            <select id="exp-paidby" style="flex:1;padding:9px;background:rgba(20,30,60,0.05);border:1px solid rgba(20,30,60,0.15);border-radius:7px;color:var(--l-ink);font-size:15px;">${memberOpts}</select>
          </div>
          <button id="exp-add-btn" style="width:100%;padding:10px;background:rgba(255,107,53,0.2);border:1.5px solid rgba(255,107,53,0.45);border-radius:8px;color:var(--l-ink);font-size:16px;font-weight:700;cursor:pointer;">${T('exp.addBtn', '+ Registra spesa')}</button>
          <p style="color:var(--l-faint);font-size:13px;margin:8px 0 0;">${T('exp.splitHint', 'Diviso equamente tra tutti i membri del gruppo.')}</p>
        </div>

        <!-- Lista spese -->
        ${_list().length ? `<div style="margin-top:6px;"><h3 style="margin:0 0 8px;color:var(--l-muted);font-size:15px;">${T('exp.history', 'Spese')}</h3>${expRows}</div>` : ''}
      </div>`;

    window.openSheet('💴 ' + T('exp.title', 'Spese di gruppo'), html);

    setTimeout(() => {
      const btn = document.getElementById('exp-add-btn');
      if (btn) btn.onclick = () => {
        const d = document.getElementById('exp-desc')?.value;
        const a = document.getElementById('exp-amount')?.value;
        const pb = document.getElementById('exp-paidby')?.value;
        if (add(d, a, pb)) { /* panel re-renders via _rerender */ }
      };
    }, 0);
  }

  window.GroupExpenses = { add, remove, getAll, balances, settlements, openPanel, receive, count };
})();
