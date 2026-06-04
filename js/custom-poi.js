/**
 * custom-poi.js — POI personalizzati dell'utente (long-press sulla mappa)
 *
 * Copre una lacuna del DB Google: a volte il posto che serve (un onsen nascosto,
 * la casa dell'amico, un punto di ritrovo) non è su Google Places. Con un
 * long-press sulla mappa l'utente piazza un POI custom, gli dà nome+categoria+nota,
 * e può aggiungerlo all'itinerario come qualsiasi altro POI.
 *
 * Implementazione non-invasiva: aggancia `window.map` (OpenLayers) con un proprio
 * layer vector e i propri handler pointer, senza toccare il `map.on('click')`
 * esistente di app-core.
 *
 * Storage: `state.customPOIs` = [{ id, name, lat, lng, note, cat, createdAt }].
 *
 * Esposto:
 *   - window.CustomPOI = { list, add, remove, openCreateDialog, renderLayer, openDetail }
 *
 * Dipendenze esterne (tutte su window):
 *   - window.map (OpenLayers), window.ol
 *   - window.state.customPOIs, window.saveState
 *   - window.openSheet, window.closeSheet, window.toast, window.t
 *   - window.openAddToItineraryWizard (opzionale, per "aggiungi a itinerario")
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const LONG_PRESS_MS = 550;
  const MOVE_TOLERANCE = 12; // px

  let customLayer = null;
  let customSource = null;

  const CATS = [
    { id: 'custom', icon: '📌', label: () => T('cpoi.catGeneric', 'Generico') },
    { id: 'food', icon: '🍴', label: () => T('cpoi.catFood', 'Cibo') },
    { id: 'sleep', icon: '🛏️', label: () => T('cpoi.catSleep', 'Alloggio') },
    { id: 'meet', icon: '🤝', label: () => T('cpoi.catMeet', 'Ritrovo') },
    { id: 'nature', icon: '⛩️', label: () => T('cpoi.catNature', 'Natura/Cultura') },
    { id: 'shop', icon: '🛍️', label: () => T('cpoi.catShop', 'Shopping') }
  ];
  const catById = (id) => CATS.find(c => c.id === id) || CATS[0];

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function list() {
    const arr = window.state?.customPOIs;
    return Array.isArray(arr) ? arr : [];
  }

  function add(poi) {
    if (!window.state) return null;
    if (!Array.isArray(window.state.customPOIs)) window.state.customPOIs = [];
    const entry = {
      id: 'cpoi_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: (poi.name || T('cpoi.defaultName', 'Posto mio')).slice(0, 80),
      lat: poi.lat, lng: poi.lng,
      note: (poi.note || '').slice(0, 280),
      cat: poi.cat || 'custom',
      createdAt: Date.now()
    };
    window.state.customPOIs.push(entry);
    window.saveState?.();
    renderLayer();
    return entry;
  }

  function remove(id) {
    if (!Array.isArray(window.state?.customPOIs)) return false;
    const before = window.state.customPOIs.length;
    window.state.customPOIs = window.state.customPOIs.filter(p => p.id !== id);
    if (window.state.customPOIs.length !== before) {
      window.saveState?.();
      renderLayer();
      return true;
    }
    return false;
  }

  // ─── OpenLayers layer ────────────────────────────────────────────────

  function _ensureLayer() {
    if (customLayer || !window.map || !window.ol) return;
    customSource = new ol.source.Vector();
    customLayer = new ol.layer.Vector({
      source: customSource,
      zIndex: 60, // sopra i POI normali
      style: (feature) => {
        const cat = catById(feature.get('cat'));
        return new ol.style.Style({
          text: new ol.style.Text({
            text: cat.icon,
            font: '22px sans-serif',
            offsetY: -2
          }),
          image: new ol.style.Circle({
            radius: 15,
            fill: new ol.style.Fill({ color: 'rgba(255,107,53,0.18)' }),
            stroke: new ol.style.Stroke({ color: 'var(--m-accent)', width: 2 })
          })
        });
      }
    });
    window.map.addLayer(customLayer);

    // Click sui custom marker (handler dedicato, non interferisce con map.on('click'))
    window.map.on('click', (e) => {
      window.map.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
        if (layer === customLayer) {
          const id = feature.get('cpoiId');
          if (id) { openDetail(id); return true; }
        }
      });
    });
  }

  function renderLayer() {
    _ensureLayer();
    if (!customSource || !window.ol) return;
    customSource.clear();
    list().forEach(poi => {
      if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number') return;
      const f = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([poi.lng, poi.lat]))
      });
      f.set('cpoiId', poi.id);
      f.set('cat', poi.cat || 'custom');
      f.set('name', poi.name);
      customSource.addFeature(f);
    });
  }

  // ─── Long-press detection ────────────────────────────────────────────

  function _installLongPress() {
    if (!window.map || typeof window.map.getTargetElement !== 'function') return false;
    const target = window.map.getTargetElement();
    if (!target || target.__cpoiLongPress) return true;
    target.__cpoiLongPress = true;

    let timer = null;
    let startXY = null;

    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } startXY = null; };

    const onDown = (ev) => {
      // Solo tocco/click singolo primario
      const pt = ev.touches ? ev.touches[0] : ev;
      if (!pt) return;
      startXY = { x: pt.clientX, y: pt.clientY };
      timer = setTimeout(() => {
        timer = null;
        const rect = target.getBoundingClientRect();
        const px = [startXY.x - rect.left, startXY.y - rect.top];
        try {
          const coord = window.map.getCoordinateFromPixel(px);
          const [lng, lat] = ol.proj.toLonLat(coord);
          openCreateDialog(lat, lng);
          if (navigator.vibrate) navigator.vibrate(30);
        } catch (e) { console.warn('[custom-poi] coord conversion failed', e); }
      }, LONG_PRESS_MS);
    };
    const onMove = (ev) => {
      if (!startXY || !timer) return;
      const pt = ev.touches ? ev.touches[0] : ev;
      if (!pt) return;
      if (Math.abs(pt.clientX - startXY.x) > MOVE_TOLERANCE || Math.abs(pt.clientY - startXY.y) > MOVE_TOLERANCE) clear();
    };

    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', clear);
    target.addEventListener('pointercancel', clear);
    target.addEventListener('pointerleave', clear);
    // Touch fallback (alcuni browser non emettono pointer events su canvas)
    target.addEventListener('touchstart', onDown, { passive: true });
    target.addEventListener('touchmove', onMove, { passive: true });
    target.addEventListener('touchend', clear);

    console.log('[custom-poi] long-press attivato sulla mappa');
    return true;
  }

  // ─── UI ──────────────────────────────────────────────────────────────

  function openCreateDialog(lat, lng) {
    if (typeof window.openSheet !== 'function') return;
    const catBtns = CATS.map((c, i) => `
      <button type="button" data-cpoi-cat="${c.id}" style="
        padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;
        background:${i === 0 ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.06)'};
        border:1.5px solid ${i === 0 ? 'rgba(255,107,53,0.55)' : 'rgba(255,255,255,0.14)'};
        color:#fff;display:flex;align-items:center;gap:6px;">
        <span style="font-size:15px">${c.icon}</span><span>${c.label()}</span>
      </button>
    `).join('');

    const html = `
      <div style="padding:6px 2px;display:flex;flex-direction:column;gap:14px;">
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12.5px;line-height:1.5;">
          ${T('cpoi.intro', 'Crea un posto personalizzato in questa posizione. Apparirà sulla mappa e potrai aggiungerlo all\'itinerario.')}
        </p>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);font-family:'SF Mono',Menlo,monospace;">
          📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
        <div>
          <label style="display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:6px;font-weight:600;">${T('cpoi.name', 'Nome')}</label>
          <input id="cpoi-name" type="text" maxlength="80" placeholder="${T('cpoi.namePh', 'Es. Onsen segreto')}" style="
            width:100%;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);
            border-radius:8px;color:#fff;font-size:14px;box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:6px;font-weight:600;">${T('cpoi.cat', 'Categoria')}</label>
          <div id="cpoi-cats" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${catBtns}</div>
        </div>
        <div>
          <label style="display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:6px;font-weight:600;">${T('cpoi.note', 'Nota (opzionale)')}</label>
          <textarea id="cpoi-note" maxlength="280" rows="2" placeholder="${T('cpoi.notePh', 'Dettagli, come arrivare...')}" style="
            width:100%;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);
            border-radius:8px;color:#fff;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
        </div>
        <button id="cpoi-save" style="
          padding:12px;background:linear-gradient(135deg,var(--m-accent),#FF5E1F);border:none;border-radius:9px;
          color:#fff;font-weight:700;font-size:14px;cursor:pointer;">
          📌 ${T('cpoi.create', 'Crea posto')}
        </button>
      </div>
    `;

    window.openSheet(T('cpoi.title', '📌 Nuovo posto'), html);

    setTimeout(() => {
      let chosenCat = 'custom';
      document.querySelectorAll('[data-cpoi-cat]').forEach(btn => {
        btn.onclick = () => {
          chosenCat = btn.getAttribute('data-cpoi-cat');
          document.querySelectorAll('[data-cpoi-cat]').forEach(b => {
            const sel = b === btn;
            b.style.background = sel ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.06)';
            b.style.borderColor = sel ? 'rgba(255,107,53,0.55)' : 'rgba(255,255,255,0.14)';
          });
        };
      });
      const saveBtn = document.getElementById('cpoi-save');
      if (saveBtn) saveBtn.onclick = () => {
        const name = document.getElementById('cpoi-name')?.value.trim() || T('cpoi.defaultName', 'Posto mio');
        const note = document.getElementById('cpoi-note')?.value.trim() || '';
        const entry = add({ name, lat, lng, note, cat: chosenCat });
        window.closeSheet?.();
        window.toast?.('📌 ' + (entry?.name || '') + ' ' + T('cpoi.created', 'creato'));
      };
    }, 40);
  }

  function openDetail(id) {
    const poi = list().find(p => p.id === id);
    if (!poi || typeof window.openSheet !== 'function') return;
    const cat = catById(poi.cat);
    const html = `
      <div style="padding:6px 2px;display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:30px;">${cat.icon}</div>
          <div>
            <div style="font-size:17px;font-weight:700;color:#fff;">${_esc(poi.name)}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.6);">${cat.label()} · ${T('cpoi.custom', 'posto personalizzato')}</div>
          </div>
        </div>
        ${poi.note ? `<div style="padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.85);font-size:13px;line-height:1.5;">${_esc(poi.note)}</div>` : ''}
        <div style="font-size:11px;color:rgba(255,255,255,0.45);font-family:'SF Mono',Menlo,monospace;">📍 ${poi.lat.toFixed(5)}, ${poi.lng.toFixed(5)}</div>
        <div style="display:flex;gap:8px;">
          <button id="cpoi-add-itin" style="flex:1;padding:11px;background:rgba(76,175,80,0.25);border:1.5px solid rgba(76,175,80,0.5);border-radius:8px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">
            ➕ ${T('cpoi.addItin', 'Aggiungi a itinerario')}
          </button>
          <button id="cpoi-delete" aria-label="${T('common.delete', 'Elimina')}" style="padding:11px 14px;background:rgba(255,107,107,0.18);border:1.5px solid rgba(255,107,107,0.4);border-radius:8px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">🗑️</button>
        </div>
        <a href="https://maps.google.com/?q=${poi.lat},${poi.lng}" target="_blank" rel="noopener" style="text-align:center;font-size:12px;color:#64c8ff;text-decoration:none;">🗺️ ${T('cpoi.openMaps', 'Apri in Google Maps')}</a>
      </div>
    `;
    window.openSheet(poi.name, html);

    setTimeout(() => {
      const addBtn = document.getElementById('cpoi-add-itin');
      if (addBtn) addBtn.onclick = () => {
        // Riusa il wizard standard passando un poiData compatibile
        if (typeof window.openAddToItineraryWizard === 'function') {
          window.openAddToItineraryWizard({
            googlePlaceId: poi.id, name: poi.name,
            city: T('cpoi.custom', 'posto personalizzato'),
            type: poi.cat, lat: poi.lat, lng: poi.lng
          });
        } else if (typeof window.ITINERARY?.addPOIToDay === 'function') {
          window.ITINERARY.addPOIToDay(poi.id, poi.name, 0, '10:00', 60, poi.note || '', 0, 'altro', poi.lat, poi.lng);
          window.closeSheet?.();
          window.toast?.('✅ ' + T('cpoi.addedItin', 'Aggiunto al Day 1'));
        }
      };
      const delBtn = document.getElementById('cpoi-delete');
      if (delBtn) delBtn.onclick = async () => {
        const ok = await (window.modalConfirm || confirm)(T('cpoi.confirmDelete', 'Eliminare questo posto personalizzato?'), { danger: true, confirmText: 'Elimina' });
        if (ok) {
          remove(poi.id);
          window.closeSheet?.();
          window.toast?.('🗑️ ' + T('cpoi.deleted', 'Posto eliminato'));
        }
      };
    }, 40);
  }

  // ─── Boot ────────────────────────────────────────────────────────────

  function _boot() {
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (window.map && window.ol) {
        _ensureLayer();
        renderLayer();
        _installLongPress();
        clearInterval(iv);
      } else if (tries > 60) {
        clearInterval(iv);
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  window.CustomPOI = { list, add, remove, openCreateDialog, renderLayer, openDetail, CATS };
})();
