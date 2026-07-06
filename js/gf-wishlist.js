// ============================================================================
// gf-wishlist.js — Wishlist GF condivisa del gruppo, con voto.
//
// Il cuore della condivisione: il gruppo PROPONE locali gluten-free candidati,
// VOTA (👍 ci andrei / 🤔 forse / 👎 no), e i più votati confluiscono
// nell'itinerario. Sincronizzato via MQTT come chat/itinerario.
//
// Storage: state.groupWishlist = {
//   [poiId]: { id, name, city, lat, lng, gf, proposedBy, proposedAt,
//              votes: { [memberName]: 'yes'|'maybe'|'no' } }
// }
// API: window.GFWishlist = { propose, vote, remove, getAll, openPanel, receive, count }
// Sync: window.peerBroadcast / MQTT type 'gf_wishlist'
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const _me = () => window.state?.group?.myName || null;

  function _db() {
    if (!window.state) return {};
    if (!window.state.groupWishlist || typeof window.state.groupWishlist !== 'object') window.state.groupWishlist = {};
    return window.state.groupWishlist;
  }

  function getAll() { return Object.values(_db()); }
  function count() { return Object.keys(_db()).length; }

  function _score(item) {
    const v = Object.values(item.votes || {});
    return v.filter(x => x === 'yes').length - v.filter(x => x === 'no').length;
  }
  function _tally(item) {
    const v = Object.values(item.votes || {});
    return { yes: v.filter(x => x === 'yes').length, maybe: v.filter(x => x === 'maybe').length, no: v.filter(x => x === 'no').length };
  }

  function _broadcast(action, data) {
    const payload = { action, from: _me(), ...data };
    window.peerBroadcast?.({ type: 'gf_wishlist', payload });
    // P2P fallback (allineato a chat/crowdsource)
    const conns = window.peerGPS?.getPeerConnections?.() || {};
    Object.values(conns).forEach(conn => { if (conn?.open) { try { conn.send({ type: 'gf_wishlist', payload }); } catch (_) {} } });
  }

  // ── Proponi un locale GF al gruppo ───────────────────────────────────────────
  function propose(poi) {
    if (!poi || !(poi.id || poi.googlePlaceId)) return false;
    const id = poi.id || poi.googlePlaceId;
    const db = _db();
    if (db[id]) { // già proposto → vota "yes" come endorsement
      vote(id, 'yes');
      window.toast?.(T('wish.already', '⭐ Già nella wishlist — voto aggiunto'));
      return true;
    }
    const item = {
      id,
      name: poi.name || poi.poi_name || 'Locale',
      city: poi.city || '',
      lat: poi.lat ?? null,
      lng: poi.lng ?? null,
      gf: poi.gf?.lvl || poi.safety_level || null,
      proposedBy: _me() || 'io',
      proposedAt: Date.now(),
      votes: {}
    };
    if (_me()) item.votes[_me()] = 'yes'; // chi propone vota sì
    db[id] = item;
    window.saveState?.();
    _broadcast('propose', { item });
    window.toast?.(T('wish.proposed', '⭐ Proposto al gruppo!'));
    _rerender();
    return true;
  }

  // ── Vota un locale ───────────────────────────────────────────────────────────
  function vote(poiId, choice) {
    if (!['yes', 'maybe', 'no'].includes(choice)) return;
    const db = _db();
    const item = db[poiId];
    if (!item) return;
    const me = _me();
    if (!me) { window.toast?.(T('wish.needGroup', '⚠️ Entra in un gruppo per votare')); return; }
    item.votes = item.votes || {};
    item.votes[me] = choice;
    window.saveState?.();
    _broadcast('vote', { poiId, choice, item }); // includo item per self-heal se il peer non l'ha
    _rerender();
  }

  function remove(poiId) {
    const db = _db();
    if (!db[poiId]) return;
    delete db[poiId];
    window.saveState?.();
    _broadcast('remove', { poiId });
    _rerender();
  }

  // ── Ricezione da MQTT/P2P ────────────────────────────────────────────────────
  function receive(payload) {
    if (!payload || !payload.action) return;
    const db = _db();
    if (payload.action === 'propose' && payload.item?.id) {
      const ex = db[payload.item.id];
      if (!ex) db[payload.item.id] = payload.item;
      else ex.votes = { ...payload.item.votes, ...ex.votes }; // unisci voti, tieni i miei
    } else if (payload.action === 'vote' && payload.poiId) {
      let item = db[payload.poiId];
      if (!item && payload.item) { item = payload.item; db[payload.poiId] = item; } // self-heal
      if (item && payload.from) { item.votes = item.votes || {}; item.votes[payload.from] = payload.choice; }
    } else if (payload.action === 'remove' && payload.poiId) {
      delete db[payload.poiId];
    } else return;
    window.saveState?.();
    _rerender();
  }

  function _rerender() {
    if (document.getElementById('gf-wishlist-body')) openPanel();
    window.updateWishlistBadge?.();
  }

  // ── Aggiungi un locale votato all'itinerario (organizzazione) ────────────────
  function addToItinerary(poiId) {
    const item = _db()[poiId];
    if (!item || !window.ITINERARY?.addPOIToDay) return;
    // Metti nel primo giorno con meno tappe
    const ibd = window.state?.itineraryByDay || {};
    const days = window.state?.tripProfile?.days || 8;
    let bestDay = 0, min = Infinity;
    for (let d = 0; d < days; d++) { const n = (ibd[d] || []).length; if (n < min) { min = n; bestDay = d; } }
    const ok = window.ITINERARY.addPOIToDay(item.id, item.name, bestDay, '12:00', 60, '', 0, 'food', item.lat, item.lng);
    if (ok) { window.saveState?.(); window.toast?.('✅ ' + item.name + ' → Day ' + (bestDay + 1)); window.renderItineraryUnified?.(); }
    else window.toast?.(T('wish.alreadyItin', '⚠️ Già in itinerario'));
  }

  // ── Pannello ─────────────────────────────────────────────────────────────────
  function openPanel() {
    const me = _me();
    const inGroup = !!window.state?.group?.roomId;
    const items = getAll().sort((a, b) => _score(b) - _score(a) || b.proposedAt - a.proposedAt);

    const gfBadge = (lvl) => lvl === 'full' || lvl === 'GREEN' ? '🟢' : lvl === 'partial' || lvl === 'YELLOW' ? '🟡' : lvl === 'RED' ? '🔴' : '';

    const rows = items.map(it => {
      const t = _tally(it);
      const myVote = (it.votes || {})[me];
      const dist = (it.lat && it.lng && window.state?.gpsCurrentLat)
        ? ' · ' + window.fmtDist?.(window.haversineKm(window.state.gpsCurrentLat, window.state.gpsCurrentLng, it.lat, it.lng)) : '';
      const btn = (choice, emoji, label, color) => `
        <button onclick="window.GFWishlist.vote('${_esc(it.id)}','${choice}')" style="flex:1;padding:7px;border-radius:7px;cursor:pointer;font-size:14px;font-weight:700;
          background:${myVote === choice ? color : 'rgba(20,30,60,0.05)'};
          border:1.5px solid ${myVote === choice ? color.replace('0.35', '0.7') : 'rgba(20,30,60,0.14)'};color:${myVote === choice ? '#171b24' : 'var(--l-ink)'};">
          ${emoji} ${label} ${({ yes: t.yes, maybe: t.maybe, no: t.no })[choice] || 0}</button>`;
      return `
        <div style="background:rgba(20,30,60,0.03);border:1px solid rgba(20,30,60,0.08);border-radius:12px;padding:14px;margin-bottom:10px;">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:700;color:var(--l-ink);">${gfBadge(it.gf)} ${_esc(it.name)}</div>
              <div style="font-size:13px;color:var(--l-muted);margin-top:2px;">${_esc(it.city)}${dist} · ${T('wish.by', 'da')} ${_esc(it.proposedBy)}</div>
            </div>
            <div style="font-size:18px;font-weight:800;color:${_score(it) > 0 ? '#16a34a' : _score(it) < 0 ? '#dc2626' : 'var(--l-faint)'};">${_score(it) > 0 ? '+' : ''}${_score(it)}</div>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:8px;">
            ${btn('yes', '👍', T('wish.yes', 'Ci andrei'), 'rgba(76,175,80,0.35)')}
            ${btn('maybe', '🤔', T('wish.maybe', 'Forse'), 'rgba(255,180,0,0.35)')}
            ${btn('no', '👎', T('wish.no', 'No'), 'rgba(239,68,68,0.35)')}
          </div>
          <div style="display:flex;gap:6px;">
            <button onclick="window.GFWishlist.addToItinerary('${_esc(it.id)}')" style="flex:1;padding:7px;background:rgba(255,107,53,0.2);border:1.5px solid rgba(255,107,53,0.45);border-radius:7px;color:#7a2e0e;font-size:14px;font-weight:700;cursor:pointer;">➕ ${T('wish.toItinerary', 'In itinerario')}</button>
            ${it.proposedBy === me ? `<button onclick="window.GFWishlist.remove('${_esc(it.id)}')" style="padding:7px 12px;background:rgba(20,30,60,0.05);border:1.5px solid rgba(20,30,60,0.14);border-radius:7px;color:var(--l-muted);font-size:14px;cursor:pointer;">🗑️</button>` : ''}
          </div>
        </div>`;
    }).join('');

    const html = `
      <div id="gf-wishlist-body" style="padding:4px 2px;">
        ${!inGroup ? `<div style="background:rgba(255,180,0,0.12);border:1px solid rgba(255,180,0,0.3);border-radius:10px;padding:12px;margin-bottom:12px;font-size:15px;color:#92400e;">⚠️ ${T('wish.joinHint', 'Entra in un gruppo per votare insieme. Puoi comunque proporre locali.')}</div>` : ''}
        <p style="font-size:14px;color:var(--l-muted);margin:0 0 14px;">${T('wish.intro', 'Proponi locali gluten-free, votate insieme dove andare, e aggiungete i preferiti all itinerario.')}</p>
        ${items.length ? rows : `<div style="text-align:center;padding:40px 20px;color:var(--l-faint);"><div style="font-size:42px;margin-bottom:12px;">🗳️</div>${T('wish.empty', 'Nessun locale proposto. Aprite un POI GF e toccate "Proponi al gruppo".')}</div>`}
      </div>`;
    window.openSheet('🗳️ ' + T('wish.title', 'Wishlist GF del gruppo'), html);
  }

  window.GFWishlist = { propose, vote, remove, getAll, openPanel, receive, count, addToItinerary };
})();
