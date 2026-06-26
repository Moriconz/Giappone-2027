// ============================================================================
// gf-menu-photos.js — Foto del menù GF condivise nel gruppo, per locale.
//
// Cuore GF + condivisione: uno fotografa un menù "gluten free", la foto si
// allega al POI e tutti nel gruppo la vedono. Si auto-inietta nel dettaglio
// POI via [data-gf-menu] (come GFCrowd). Compressa per stare su MQTT.
//
// Storage: state.gfMenuPhotos = { [poiId]: [{ id, data(base64), by, ts }] }
// API: window.GFMenuPhotos = { captureForPoi, getForPoi, receive, renderInto, count }
// Sync: MQTT type 'gf_menu_photo'
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const _me = () => window.state?.group?.myName || 'io';

  function _db() {
    if (!window.state) return {};
    if (!window.state.gfMenuPhotos || typeof window.state.gfMenuPhotos !== 'object') window.state.gfMenuPhotos = {};
    return window.state.gfMenuPhotos;
  }
  function getForPoi(poiId) { return _db()[poiId] || []; }
  function count(poiId) { return getForPoi(poiId).length; }

  // Compressione aggressiva: menù leggibile ma piccolo per MQTT (~40-70KB)
  function _compress(dataUrl, maxW = 700, maxH = 900) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = (h * maxW) / w; w = maxW; }
        if (h > maxH) { w = (w * maxH) / h; h = maxH; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  function _broadcast(action, data) {
    const payload = { action, from: _me(), ...data };
    window.peerBroadcast?.({ type: 'gf_menu_photo', payload });
    const conns = window.peerGPS?.getPeerConnections?.() || {};
    Object.values(conns).forEach(c => { if (c?.open) { try { c.send({ type: 'gf_menu_photo', payload }); } catch (_) {} } });
  }

  // ── Scatta/scegli una foto per un POI ────────────────────────────────────────
  function captureForPoi(poiId, poiName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // su mobile apre la fotocamera
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const compressed = await _compress(ev.target.result);
        if (!compressed) { window.toast?.(T('gfm.err', '❌ Errore foto')); return; }
        if (compressed.length > 200000) { window.toast?.(T('gfm.tooBig', '⚠️ Foto troppo grande, riprova con meno dettaglio')); return; }
        const photo = { id: 'menu_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), data: compressed, by: _me(), ts: Date.now() };
        const db = _db();
        if (!db[poiId]) db[poiId] = [];
        db[poiId].push(photo);
        window.saveState?.();
        _broadcast('add', { poiId, poiName, photo });
        window.toast?.(T('gfm.added', '📷 Menù GF condiviso col gruppo'));
        _refresh(poiId);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function remove(poiId, photoId) {
    const db = _db();
    if (!db[poiId]) return;
    db[poiId] = db[poiId].filter(p => p.id !== photoId);
    window.saveState?.();
    _broadcast('remove', { poiId, photoId });
    _refresh(poiId);
  }

  function receive(payload) {
    if (!payload?.action || !payload.poiId) return;
    const db = _db();
    if (payload.action === 'add' && payload.photo?.id) {
      if (!db[payload.poiId]) db[payload.poiId] = [];
      if (!db[payload.poiId].some(p => p.id === payload.photo.id)) db[payload.poiId].push(payload.photo);
    } else if (payload.action === 'remove' && payload.photoId) {
      if (db[payload.poiId]) db[payload.poiId] = db[payload.poiId].filter(p => p.id !== payload.photoId);
    } else return;
    window.saveState?.();
    _refresh(payload.poiId);
  }

  function _refresh(poiId) {
    document.querySelectorAll(`[data-gf-menu="${(window.CSS && CSS.escape) ? CSS.escape(poiId) : poiId}"]`).forEach(renderInto);
  }

  function _lightbox(dataUrl) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer;';
    ov.innerHTML = `<img src="${dataUrl}" style="max-width:100%;max-height:100%;border-radius:8px;" />`;
    ov.onclick = () => ov.remove();
    document.body.appendChild(ov);
  }
  window.__gfMenuLightbox = _lightbox;

  // ── Render nel dettaglio POI ─────────────────────────────────────────────────
  function renderInto(el) {
    if (!el) return;
    const poiId = el.getAttribute('data-gf-menu');
    const poiName = el.getAttribute('data-gf-menu-name') || '';
    const photos = getForPoi(poiId);
    const me = _me();

    const thumbs = photos.map(ph => `
      <div style="position:relative;flex-shrink:0;">
        <img src="${ph.data}" onclick="window.__gfMenuLightbox(this.src)" style="width:74px;height:90px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.15);cursor:pointer;" />
        <div style="font-size:9px;color:rgba(255,255,255,0.5);text-align:center;margin-top:2px;">${_esc(ph.by)}</div>
        ${ph.by === me ? `<button onclick="window.GFMenuPhotos.remove('${_esc(poiId)}','${ph.id}')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.3);color:#fff;font-size:11px;cursor:pointer;line-height:1;">×</button>` : ''}
      </div>`).join('');

    el.innerHTML = `
      <div style="margin-top:6px;padding:14px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);border-radius:12px;">
        <div style="font-size:13px;font-weight:700;color:#4ade80;margin-bottom:10px;">📷 ${T('gfm.title', 'Foto menù GF del gruppo')}</div>
        ${photos.length ? `<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;">${thumbs}</div>` : `<div style="font-size:12px;color:rgba(255,255,255,0.55);margin-bottom:10px;">${T('gfm.empty', 'Nessuna foto. Fotografa il menù gluten-free per il gruppo.')}</div>`}
        <button onclick="window.GFMenuPhotos.captureForPoi('${_esc(poiId)}','${_esc(poiName)}')" style="width:100%;padding:10px;background:rgba(74,222,128,0.15);border:1.5px solid rgba(74,222,128,0.4);border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">📷 ${T('gfm.add', 'Aggiungi foto menù')}</button>
      </div>`;
  }
  window.GFMenuPhotos = { captureForPoi, getForPoi, receive, renderInto, remove, count };

  // ── Auto-inject via MutationObserver (come GFCrowd) ──────────────────────────
  function _scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('[data-gf-menu]') : []).forEach(el => {
      if (!el.__gfMenuRendered) { el.__gfMenuRendered = true; renderInto(el); }
    });
  }
  const _obs = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) _scan(n); })));
  if (document.body) { _obs.observe(document.body, { childList: true, subtree: true }); _scan(document); }
  else document.addEventListener('DOMContentLoaded', () => { _obs.observe(document.body, { childList: true, subtree: true }); _scan(document); });
})();
