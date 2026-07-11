// ============================================================================
// SHOPPING-VIEW.JS — renderShoppingView + helpers
// Extracted from app-core.js. Depends on window globals set by app-core.js:
//   window.state, window.GOOGLE_PLACES_POIS, window.openSheet, window.openPOI,
//   window.haversineKm, window.fmtDist, window.debounce, window.CATS,
//   window.getPoiDisplayName
// ============================================================================

(function () {
  'use strict';

  // ── Module-level cache ────────────────────────────────────────────────────

  let _viewCache = { html: null, timestamp: 0, regular: null, vintage: null };
  const _CACHE_TTL = 5 * 60 * 1000;
  const _loadIndex = { regular: 100, secondhand: 100 };

  // ── Constants ─────────────────────────────────────────────────────────────

  const REGULAR_MAX_KM = 20;
  const VINTAGE_MAX_KM = 50;
  const VINTAGE_TYPES = ['antique_shop', 'thrift_store', 'clothing_store', 'secondhand_store'];
  const VINTAGE_KEYWORDS = ['vintage', 'second hand', 'secondhand', 'thrift', 'antique', 'used', 'retro', 'old'];

  // ── Helpers ───────────────────────────────────────────────────────────────

  function isVintageShop(poi) {
    const types = poi.types || [];
    const name = (poi.name || '').toLowerCase();
    return VINTAGE_TYPES.some(t => types.includes(t)) ||
           VINTAGE_KEYWORDS.some(k => name.includes(k));
  }

  // Transliterate Japanese kana to Latin script for display
  const ROMAJI = {
    'きゃ':'kya','きゅ':'kyu','きょ':'kyo','ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
    'しゃ':'sha','しゅ':'shu','しょ':'sho','じゃ':'ja','じゅ':'ju','じょ':'jo',
    'ちゃ':'cha','ちゅ':'chu','ちょ':'cho','にゃ':'nya','にゅ':'nyu','にょ':'nyo',
    'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo','びゃ':'bya','びゅ':'byu','びょ':'byo',
    'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo','みゃ':'mya','みゅ':'myu','みょ':'myo',
    'りゃ':'rya','りゅ':'ryu','りょ':'ryo','キャ':'kya','キュ':'kyu','キョ':'kyo',
    'ギャ':'gya','ギュ':'gyu','ギョ':'gyo','シャ':'sha','シュ':'shu','ショ':'sho',
    'ジャ':'ja','ジュ':'ju','ジョ':'jo','チャ':'cha','チュ':'chu','チョ':'cho',
    'ニャ':'nya','ニュ':'nyu','ニョ':'nyo','ヒャ':'hya','ヒュ':'hyu','ヒョ':'hyo',
    'ビャ':'bya','ビュ':'byu','ビョ':'byo','ピャ':'pya','ピュ':'pyu','ピョ':'pyo',
    'ミャ':'mya','ミュ':'myu','ミョ':'myo','リャ':'rya','リュ':'ryu','リョ':'ryo',
    'あ':'a','い':'i','う':'u','え':'e','お':'o','ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
    'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko','カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
    'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
    'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to','タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
    'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no','ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no',
    'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho','ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
    'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo','マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo',
    'や':'ya','ゆ':'yu','よ':'yo','ヤ':'ya','ユ':'yu','ヨ':'yo',
    'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro','ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro',
    'わ':'wa','を':'o','ん':'n','ワ':'wa','ヲ':'o','ン':'n',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go',
    'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo','ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo',
    'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','ダ':'da','ヂ':'ji','ヅ':'zu','デ':'de','ド':'do',
    'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo','バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo',
    'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po','パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po',
    'ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o','ァ':'a','ィ':'i','ゥ':'u','ェ':'e','ォ':'o',
    'ゃ':'ya','ゅ':'yu','ょ':'yo','ャ':'ya','ュ':'yu','ョ':'yo','っ':'','ッ':'','ー':'-',
  };

  function transliterate(name) {
    if (!name || typeof name !== 'string') return name;
    let result = '';
    for (let i = 0; i < name.length;) {
      const two = name.slice(i, i + 2);
      if (ROMAJI[two]) { result += ROMAJI[two]; i += 2; continue; }
      const one = name[i];
      if (ROMAJI[one]) { result += ROMAJI[one]; } else { result += one; }
      i++;
    }
    return result.replace(/[-\s]+/g, ' ').trim();
  }

  function _poiRow(p, icon) {
    const lat = window.state.gpsCurrentLat;
    const lng = window.state.gpsCurrentLng;
    const dist = window.haversineKm(lat, lng, p.lat, p.lng);
    const distStr = `<span style="color:var(--success);font-weight:600">${window.fmtDist(dist)}</span>`;
    const ratingStr = p.rating ? ` · ⭐ ${p.rating.toFixed(1)}` : '';
    return `<div class="poi-row" data-id="${p.id}">
      <div class="icon">${icon}</div>
      <div class="body">
        <div class="name">${p.name}</div>
        <div class="sub">${distStr}${ratingStr}</div>
      </div>
    </div>`;
  }

  function _buildShopDetail(poi) {
    const lat = window.state.gpsCurrentLat;
    const lng = window.state.gpsCurrentLng;
    const dist = window.haversineKm(lat, lng, poi.lat, poi.lng);
    const displayName = transliterate(poi.name);
    const photosHtml = poi.photos && poi.photos.length > 0
      ? poi.photos.slice(0, 3).map((ph, i) =>
          `<img src="${ph.url}" loading="lazy" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:10px" alt="Foto ${i+1}" onerror="this.style.display='none'">`
        ).join('')
      : '<p style="color:var(--muted);font-size:14px;text-align:center;padding:20px">Nessuna foto disponibile</p>';

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`;
    const appleMapsUrl = `maps://maps.apple.com/?q=${encodeURIComponent(poi.name)}&ll=${poi.lat},${poi.lng}`;
    // ponytail: bottone Apple Maps solo su iOS — su Android non fa nulla di
    // utile e confonde un utente non tecnico (pattern isIOS già in app-boot.js)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    return `<div class="shop-card" style="border:none;padding:0">
      <div class="sc-header">
        <div>
          <div class="sc-name">${displayName}</div>
          <div class="sc-meta">${poi.rating ? `⭐ ${poi.rating.toFixed(1)}` : 'Valutazione N/A'}</div>
        </div>
      </div>
      <div class="sc-hours" style="margin-top:10px">📍 ${window.fmtDist(dist)} da te</div>
      ${poi.ratingCount ? `<div class="sc-hours" style="margin-top:4px">📊 ${poi.ratingCount} recensioni</div>` : ''}
      <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
        <h4 style="margin:0 0 8px;font-size:15px;color:var(--accent)">📸 Foto</h4>
        ${photosHtml}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <a href="${googleMapsUrl}" target="_blank" style="flex:1;padding:10px;background:linear-gradient(135deg, var(--l-accent), var(--l-accent-600));color:white;border:none;border-radius:6px;text-align:center;text-decoration:none;font-weight:600;font-size:14px">🗺️ Google Maps</a>
        ${isIOS ? `<a href="${appleMapsUrl}" target="_blank" style="flex:1;padding:10px;background:linear-gradient(135deg, #00FF88, #C0FF9F);color:#2D3B7D;border:none;border-radius:6px;text-align:center;text-decoration:none;font-weight:600;font-size:14px">🍎 Mappe Apple</a>` : ''}
      </div>
    </div>`;
  }

  // ── Attach click handlers to rendered rows ────────────────────────────────

  function _attachRowHandlers() {
    document.getElementById('regular-shops')?.querySelectorAll('.poi-row').forEach(r => {
      r.onclick = () => {
        const poi = (_viewCache.regular || []).find(p => p.id === r.dataset.id);
        if (poi) window.openSheet('🛍️ ' + transliterate(poi.name), _buildShopDetail(poi));
      };
    });
    document.getElementById('vintage-shops')?.querySelectorAll('.poi-row').forEach(r => {
      r.onclick = () => {
        const poi = (_viewCache.vintage || []).find(p => p.id === r.dataset.id);
        if (poi) window.openSheet('👕 ' + transliterate(poi.name), _buildShopDetail(poi));
      };
    });
  }

  // ── Search filtering ──────────────────────────────────────────────────────

  function _filterRows(query) {
    const lat = window.state.gpsCurrentLat;
    const lng = window.state.gpsCurrentLng;
    const makeRows = (pois, icon) => pois.length
      ? pois.map(p => _poiRow(p, icon)).join('')
      : '<p style="font-size:14px;color:var(--muted)">Nessun negozio trovato</p>';

    if (!query) {
      const reg = document.getElementById('regular-shops');
      const vin = document.getElementById('vintage-shops');
      if (reg) reg.innerHTML = makeRows(_viewCache.regular || [], '🛍️');
      if (vin) vin.innerHTML = makeRows(_viewCache.vintage || [], '👕');
    } else {
      const q = query.toLowerCase();
      const filtReg = (_viewCache.regular || []).filter(p => (p.name || '').toLowerCase().includes(q));
      const filtVin = (_viewCache.vintage || []).filter(p => (p.name || '').toLowerCase().includes(q));
      const reg = document.getElementById('regular-shops');
      const vin = document.getElementById('vintage-shops');
      if (reg) reg.innerHTML = makeRows(filtReg, '🛍️');
      if (vin) vin.innerHTML = makeRows(filtVin, '👕');
    }
    _attachRowHandlers();
  }

  // ── Main render function ──────────────────────────────────────────────────

  function renderShoppingView() {
    const s = window.state;
    const googlePOIs = window.GOOGLE_PLACES_POIS || [];

    if (!s.gpsCurrentLat || !s.gpsCurrentLng) {
      window.openSheet('🛍️ Shopping', `
        <div style="padding:20px;text-align:center;color:var(--muted)">
          <div style="font-size:16px;margin-bottom:10px">📍 GPS necessario</div>
          <p style="font-size:14px;margin:0">Abilita il GPS per vedere negozi entro 20km (50km per vintage/thrift) dalla tua posizione.</p>
        </div>`);
      return;
    }

    if (googlePOIs.length === 0) {
      window.openSheet('🛍️ Shopping', `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          ${Array.from({length: 6}).map(() => '<div class="skeleton" style="height:68px;border-radius:12px;"></div>').join('')}
          <p style="color:var(--l-muted, var(--muted));text-align:center;font-size:14px;margin:4px 0 0;">⏳ Caricamento negozi in corso…</p>
        </div>`);
      return;
    }

    const lat = s.gpsCurrentLat;
    const lng = s.gpsCurrentLng;
    const dist = (p) => window.haversineKm(lat, lng, p.lat, p.lng);

    const regular = googlePOIs
      .filter(p => p.lat && p.lng && !isVintageShop(p) && dist(p) <= REGULAR_MAX_KM)
      .sort((a, b) => dist(a) - dist(b));

    const vintage = googlePOIs
      .filter(p => p.lat && p.lng && isVintageShop(p) && dist(p) <= VINTAGE_MAX_KM)
      .sort((a, b) => dist(a) - dist(b));

    _viewCache.regular = regular;
    _viewCache.vintage = vintage;
    _viewCache.timestamp = Date.now();

    const regularHtml = regular.length
      ? regular.map(p => _poiRow(p, '🛍️')).join('')
      : '<p style="font-size:14px;color:var(--muted)">Nessun negozio trovato entro 20km</p>';

    const vintageHtml = vintage.length
      ? vintage.map(p => _poiRow(p, '👕')).join('')
      : '<p style="font-size:14px;color:var(--muted)">Nessun negozio vintage/thrift trovato entro 50km</p>';

    window.openSheet('🛍️ Shopping', `
      <div style="position:sticky;top:0;background:var(--surface);padding:10px 0;margin-bottom:10px;z-index:100">
        <input id="shopping-search" type="text" placeholder="🔍 Cerca negozio..."
          style="width:100%;padding:8px 10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:8px;font:inherit">
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px">
        <button id="tab-general" style="flex:1;padding:10px;border:none;background:var(--surface-2);color:var(--accent);border-bottom:2px solid var(--accent);cursor:pointer;font-weight:600;font-size:15px">
          🛍️ Negozi Generali
        </button>
        <button id="tab-vintage" style="flex:1;padding:10px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-weight:600;font-size:15px">
          👕 Vintage & Second-Hand
        </button>
      </div>

      <div id="tab-content-general">
        <div class="section">
          <h3>🛍️ Negozi & Mercati (entro 20km)</h3>
          <div id="regular-shops">${regularHtml}</div>
        </div>
      </div>
      <div id="tab-content-vintage" style="display:none">
        <div class="section">
          <h3>👕 Negozi Vintage & Thrift (entro 50km)</h3>
          <div id="vintage-shops">${vintageHtml}</div>
        </div>
      </div>
    `);

    _attachRowHandlers();

    // Tab switching
    const tabGen = document.getElementById('tab-general');
    const tabVin = document.getElementById('tab-vintage');
    if (tabGen && tabVin) {
      tabGen.onclick = () => {
        tabGen.style.cssText = 'flex:1;padding:10px;border:none;background:var(--surface-2);color:var(--accent);border-bottom:2px solid var(--accent);cursor:pointer;font-weight:600;font-size:15px';
        tabVin.style.cssText = 'flex:1;padding:10px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-weight:600;font-size:15px';
        document.getElementById('tab-content-general').style.display = '';
        document.getElementById('tab-content-vintage').style.display = 'none';
      };
      tabVin.onclick = () => {
        tabVin.style.cssText = 'flex:1;padding:10px;border:none;background:var(--surface-2);color:var(--accent);border-bottom:2px solid var(--accent);cursor:pointer;font-weight:600;font-size:15px';
        tabGen.style.cssText = 'flex:1;padding:10px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-weight:600;font-size:15px';
        document.getElementById('tab-content-general').style.display = 'none';
        document.getElementById('tab-content-vintage').style.display = '';
      };
    }

    // Search
    const searchInput = document.getElementById('shopping-search');
    if (searchInput) {
      searchInput.addEventListener('input', window.debounce(e => _filterRows(e.target.value.trim()), 300));
    }
  }

  window.renderShoppingView = renderShoppingView;

})();
