// ============================================================================
// live-presence.js — Presenza "chi sta guardando/editando ora" per vista.
//
// Condivisione in tempo reale: quando apri una vista collaborativa (itinerario,
// wishlist…) trasmetti un ping di presenza; gli altri membri attivi appaiono
// come avatar/iniziali in alto nel pannello. Heartbeat 8s, scade dopo 20s.
//
// API: window.LivePresence = { enter(view), leave(), badgeHTML(view), receive }
// Sync: MQTT type 'live_presence'
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const TTL = 20000;       // ms prima di considerare un peer "uscito"
  const HB = 8000;         // ms tra heartbeat
  const _me = () => window.state?.group?.myName || null;

  // active[view] = { [memberName]: { name, avatar, last } }
  const active = {};
  let _currentView = null;
  let _hbTimer = null;

  function _ensure(view) { if (!active[view]) active[view] = {}; return active[view]; }

  function _broadcast(state) {
    const me = _me();
    if (!me || !window.state?.group?.roomId) return;
    window.peerBroadcast?.({
      type: 'live_presence',
      payload: { name: me, avatar: window.state?.group?.myAvatar || null, view: _currentView, state }
    });
  }

  function enter(view) {
    _currentView = view;
    _broadcast('enter');
    if (_hbTimer) clearInterval(_hbTimer);
    _hbTimer = setInterval(() => { if (_currentView) _broadcast('ping'); _prune(); _refreshBadges(); }, HB);
  }

  function leave() {
    if (_currentView) _broadcast('leave');
    _currentView = null;
    if (_hbTimer) { clearInterval(_hbTimer); _hbTimer = null; }
  }

  function receive(payload) {
    if (!payload?.name || !payload.view) return;
    const me = _me();
    if (payload.name === me) return;
    const v = _ensure(payload.view);
    if (payload.state === 'leave') { delete v[payload.name]; }
    else { v[payload.name] = { name: payload.name, avatar: payload.avatar || null, last: Date.now() }; }
    _refreshBadges();
  }

  function _prune() {
    const now = Date.now();
    Object.keys(active).forEach(view => {
      Object.keys(active[view]).forEach(n => { if (now - active[view][n].last > TTL) delete active[view][n]; });
    });
  }

  // Avatar/iniziali dei membri attivi su una vista (escluso me)
  function badgeHTML(view) {
    _prune();
    const peers = Object.values(active[view] || {});
    if (!peers.length) return '';
    const chips = peers.slice(0, 5).map(p => {
      const init = (p.name || '?').slice(0, 2).toUpperCase();
      const img = p.avatar
        ? `<img src="${p.avatar}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:2px solid #16a34a;" title="${p.name}" />`
        : `<div title="${p.name}" style="width:26px;height:26px;border-radius:50%;background:#2196F3;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #16a34a;">${init}</div>`;
      return `<div style="margin-left:-8px;">${img}</div>`;
    }).join('');
    const label = peers.length === 1 ? `${peers[0].name} ${T('pres.one', 'sta guardando')}` : `${peers.length} ${T('pres.many', 'stanno guardando')}`;
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(22,163,74,0.08);border:1px solid rgba(22,163,74,0.25);border-radius:10px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;padding-left:8px;">${chips}</div>
        <span style="font-size:12px;color:#16a34a;font-weight:600;">🟢 ${label}</span>
      </div>`;
  }

  // Re-inietta il badge negli host [data-live-presence] aperti
  function _refreshBadges() {
    document.querySelectorAll('[data-live-presence]').forEach(el => {
      const view = el.getAttribute('data-live-presence');
      el.innerHTML = badgeHTML(view);
    });
  }

  window.LivePresence = { enter, leave, badgeHTML, receive, _refreshBadges };

  // Esci quando la scheda passa in background, si chiude, o si chiude il pannello
  document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); });
  window.addEventListener('beforeunload', leave);
  document.addEventListener('y2kwin_closed', () => { if (_currentView) leave(); });
})();
