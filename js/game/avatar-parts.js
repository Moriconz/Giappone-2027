// ============================================================================
// AVATAR-PARTS.JS — catalogo parti voxel + composizione avatar (V2 F2).
// Carica assets/game/voxel/parts-catalog.json (bundle unico, cacheato dal SW);
// i singoli parts/<slot>/<id>.json restano la spec per editor/pack premium.
// Composizione: le parti sovrascrivono le celle per coordinate nell'ordine
// body→bottom→top→shoes→face→hair→hat→accessory→backpack (niente z-fight,
// un solo InstancedMesh). palette[0] ricolorabile via avatar.colors[slot].
// ============================================================================
(function () {
  'use strict';

  const CATALOG_URL = './assets/game/voxel/parts-catalog.json';
  const ORDER = ['body', 'bottom', 'top', 'shoes', 'face', 'hair', 'hat', 'accessory', 'backpack'];

  const SKIN_TONES = ['#f6d7b8', '#f2c89b', '#e0ac7e', '#c98d5f', '#a06a42', '#7d4f2c', '#5c3a1e', '#f9e2c8'];
  const COLOR_SWATCHES = ['#c0392b', '#e07b39', '#e0b04b', '#7a8c5a', '#2e6e5e', '#3b6ea5', '#2c3e50', '#6d4b8a', '#b05a7a', '#4a3220', '#8c8c8c', '#f5efe0'];

  const DEFAULT_AVATAR = {
    parts: { body: 'std', face: 'smile', hair: 'short', top: 'tee', bottom: 'pants', shoes: 'sneakers', hat: 'none', accessory: 'none', backpack: 'none' },
    colors: { body: '#f2c89b', hair: '#4a3220', top: '#c0392b', bottom: '#2c3e50', shoes: '#7f8c8d', hat: '#c0392b', accessory: '#c0392b', backpack: '#7a8c5a' }
  };

  let _catalog = null, _loading = null;

  function load() {
    if (_catalog) return Promise.resolve(_catalog);
    if (_loading) return _loading;
    _loading = fetch(CATALOG_URL).then(r => {
      if (!r.ok) throw new Error('parts-catalog HTTP ' + r.status);
      return r.json();
    }).then(c => { _catalog = c; return c; });
    return _loading;
  }

  function get(slot, id) { return _catalog?.parts?.[slot + '/' + id] || null; }

  function idsFor(slot) {
    if (!_catalog) return [];
    const pfx = slot + '/';
    return Object.keys(_catalog.parts).filter(k => k.startsWith(pfx)).map(k => k.slice(pfx.length));
  }

  // avatar → Map "x,y,z" → '#hex'
  function compose(avatar) {
    const cells = new Map();
    const av = avatar && avatar.parts ? avatar : DEFAULT_AVATAR;
    ORDER.forEach(slot => {
      const id = av.parts[slot];
      if (!id || id === 'none') { if (!get(slot, id || 'none')) return; }
      const p = get(slot, id);
      if (!p) return;
      const palette = p.palette.slice();
      if (p.meta.recolorable && av.colors && av.colors[slot]) palette[0] = av.colors[slot];
      p.voxels.forEach(v => cells.set(v[0] + ',' + v[1] + ',' + v[2], palette[v[3]] || palette[0]));
    });
    return cells;
  }

  function randomAvatar() {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const parts = {}, colors = {};
    ORDER.forEach(slot => { parts[slot] = pick(idsFor(slot)); });
    colors.body = pick(SKIN_TONES);
    ['hair', 'top', 'bottom', 'shoes', 'hat', 'accessory', 'backpack'].forEach(s => { colors[s] = pick(COLOR_SWATCHES); });
    return { parts, colors };
  }

  function partName(slot, id, lang) {
    const p = get(slot, id);
    if (!p) return id;
    const n = p.meta.name_i18n || {};
    return n[lang] || n.it || id;
  }

  window.AvatarParts = {
    load, get, idsFor, compose, randomAvatar, partName,
    ORDER, SKIN_TONES, COLOR_SWATCHES,
    defaultAvatar: () => JSON.parse(JSON.stringify(DEFAULT_AVATAR)),
    slots: () => (_catalog ? _catalog.slots : ORDER)
  };
})();
