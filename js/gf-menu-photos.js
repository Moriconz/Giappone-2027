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
  // Per valori dentro onclick="fn('...')": _esc() da solo non basta, l'HTML
  // decodifica le entity dell'attributo prima che il JS venga eseguito (vedi
  // stesso fix in gf-crowdsource.js). Escape JS-string prima, poi HTML sopra.
  const _escJs = (s) => _esc(String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
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
        // Senza gruppo attivo il broadcast è un no-op silenzioso — stesso
        // pattern di falso successo già corretto in gf-wishlist.js/
        // gf-crowdsource.js (quest'ultimo già gestiva bene questo caso).
        if (window.state?.group) {
          window.toast?.(T('gfm.added', '📷 Menù GF condiviso col gruppo'));
        } else {
          window.toast?.(T('gfm.savedLocal', '📷 Salvata solo su questo dispositivo — unisciti a un gruppo per condividerla'));
        }
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
        <img src="${ph.data}" onclick="window.__gfMenuLightbox(this.src)" style="width:74px;height:90px;object-fit:cover;border-radius:8px;border:1px solid rgba(20,30,60,0.15);cursor:pointer;" />
        <div style="font-size:11px;color:var(--l-faint);text-align:center;margin-top:2px;">${_esc(ph.by)}</div>
        ${ph.by === me ? `<button onclick="window.GFMenuPhotos.remove('${_escJs(poiId)}','${_escJs(ph.id)}')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.3);color:#fff;font-size:13px;cursor:pointer;line-height:1;">×</button>` : ''}
      </div>`).join('');

    const analyzeBtn = photos.length
      ? `<button onclick="window.GFMenuPhotos.analyzePhotoForPoi('${_escJs(poiId)}','${_escJs(poiName)}')" style="width:100%;padding:10px;margin-top:8px;background:rgba(20,30,60,0.05);border:1.5px solid rgba(20,30,60,0.16);border-radius:8px;color:var(--l-ink);font-size:15px;font-weight:700;cursor:pointer;">🤖 ${T('gfm.analyze', 'Analizza con AI')}</button>`
      : '';

    el.innerHTML = `
      <div style="margin-top:6px;padding:14px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);border-radius:12px;">
        <div style="font-size:15px;font-weight:700;color:#16a34a;margin-bottom:10px;">📷 ${T('gfm.title', 'Foto menù GF del gruppo')}</div>
        ${photos.length ? `<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;">${thumbs}</div>` : `<div style="font-size:14px;color:var(--l-muted);margin-bottom:10px;">${T('gfm.empty', 'Nessuna foto. Fotografa il menù gluten-free per il gruppo.')}</div>`}
        <button onclick="window.GFMenuPhotos.captureForPoi('${_escJs(poiId)}','${_escJs(poiName)}')" style="width:100%;padding:10px;background:rgba(74,222,128,0.18);border:1.5px solid rgba(74,222,128,0.45);border-radius:8px;color:#166534;font-size:15px;font-weight:700;cursor:pointer;">📷 ${T('gfm.add', 'Aggiungi foto menù')}</button>
        ${analyzeBtn}
        <div id="gfm-ai-${_esc(poiId)}"></div>
      </div>`;
  }

  // ── Analisi AI della foto già scattata: suggerisce, non invia mai da sola ──
  // Il verdetto Groq pre-compila un riscontro GFCrowd che l'utente deve
  // comunque confermare (stesso principio del detector: "likely", mai
  // "confermato" da un automatismo).
  async function analyzePhotoForPoi(poiId, poiName) {
    const photos = getForPoi(poiId);
    const photo = photos[photos.length - 1];
    if (!photo) return;
    if (typeof window.GroqMenuAnalyzer?.analyzeImage !== 'function') return;

    window.toast?.(T('groq.analyzingPhoto', '🔄 Analizzando foto con Groq...'));
    // analyzeImage rifiuta la richiesta se non ha almeno imageLabels o
    // menuText (oltre alla foto) — stesso classificatore già usato dal
    // pannello "Analizza menu" per lo stesso identico scopo.
    const predictions = await window.VisionImageAnalyzer?.classifyImage?.(photo.data) || [];
    const labels = predictions.slice(0, 4).map(p => p.label);
    const result = await window.GroqMenuAnalyzer.analyzeImage(photo.data, labels, '');
    const box = document.getElementById(`gfm-ai-${poiId}`);
    if (!result) {
      window.toast?.(T('groq.imgError', '❌ Errore: risposta immagine non valida'));
      return;
    }

    const safe = result.piatti_sicuri || [];
    const risky = [...(result.rischi || []), ...(result.sconsigliato || [])];
    const list = (items, color, label) => items.length ? `
      <div style="margin-top:8px;">
        <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:4px;">${label}</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--l-ink);">${items.map(i => `<li>${_esc(i)}</li>`).join('')}</ul>
      </div>` : '';

    if (!box) return;
    if (!safe.length && !risky.length) {
      box.innerHTML = `<div style="margin-top:10px;font-size:14px;color:var(--l-muted);">${T('gfm.aiNoData', "L'AI non ha trovato indicazioni utili in questa foto.")}</div>`;
      return;
    }

    const aiSummary = (T('gfm.aiSummaryPrefix', '🤖 Analisi AI: rischi —') + ' ' + risky.join(', ')).slice(0, 200);
    // data-summary invece di interpolare aiSummary dentro l'onclick: è testo
    // generato dall'AI (nomi piatti), più a rischio di contenere apostrofi
    // che romperebbero la stringa JS inline — l'attributo evita il problema.
    const cta = risky.length
      ? `<button data-summary="${_esc(aiSummary)}" onclick="window.GFCrowd.promptNote('${_escJs(poiId)}','${_escJs(poiName)}',this.dataset.summary,'warning')" style="width:100%;margin-top:10px;padding:9px;background:rgba(255,180,80,0.18);border:1.5px solid rgba(255,180,80,0.45);border-radius:8px;color:#92400e;font-size:14px;font-weight:700;cursor:pointer;">⚠️ ${T('gfm.aiWarn', 'Segnala il problema')}</button>`
      : `<button onclick="window.GFCrowd.askSafe('${_escJs(poiId)}','${_escJs(poiName)}')" style="width:100%;margin-top:10px;padding:9px;background:rgba(76,175,80,0.22);border:1.5px solid rgba(76,175,80,0.5);border-radius:8px;color:#166534;font-size:14px;font-weight:700;cursor:pointer;">✅ ${T('gfm.aiSafe', 'Sembra sicuro — conferma dettagli')}</button>`;

    box.innerHTML = `
      <div style="margin-top:10px;padding:10px;background:rgba(20,30,60,0.04);border-radius:10px;">
        ${list(safe, 'var(--m-success)', '🟢 ' + T('gfc.btnSafe', 'Safe'))}
        ${list(risky, 'var(--m-danger)', '🔴 ' + T('gfc.btnWarn', 'Problema'))}
        ${cta}
      </div>`;
  }
  window.GFMenuPhotos = { captureForPoi, getForPoi, receive, renderInto, remove, count, analyzePhotoForPoi };

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
