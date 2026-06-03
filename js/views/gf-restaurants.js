// ============================================================================
// gf-restaurants.js — GF_RESTAURANTS, FMGF_CITY_URLS, renderGFList, openGFDetail
// Extracted from app-core.js. Deps (all window.*):
//   state, haversineKm, fmtDist, openSheet
// ============================================================================
(function () {
  'use strict';

  const GF_RESTAURANTS = [
    { id:"gf-001", name:"Gluten Free T's Kitchen", city:"Tokyo", area:"Roppongi", cuisine:"Italiana/Fusion", lat:35.6642, lng:139.7322, tags:["100% GF","certificato GIG"], address:"3-8-15 Roppongi, Minato-ku, Tokyo", maps_url:"https://maps.google.com/?q=Gluten+Free+Ts+Kitchen+Roppongi+Tokyo", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Tokyo,+Japan", note:"Primo locale certificato GIG in Asia" },
    { id:"gf-002", name:"Gluten-free Izakaya SHION", city:"Tokyo", area:"Akihabara", cuisine:"Izakaya", lat:35.6995, lng:139.7725, tags:["100% GF"], address:"Akihabara, Tokyo", maps_url:"https://maps.google.com/?q=Gluten+Free+Izakaya+SHION+Akihabara", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Tokyo,+Japan", note:"Menu completamente senza glutine" },
    { id:"gf-003", name:"Soranoiro Nippon", city:"Tokyo", area:"Stazione Tokyo", cuisine:"Ramen", lat:35.6809, lng:139.7673, tags:["opzioni GF"], address:"Tokyo Station Ichibangai B1F", maps_url:"https://maps.google.com/?q=Soranoiro+Nippon+Tokyo+Station", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Tokyo,+Japan", note:"Ramen con brodo GF disponibile" },
    { id:"gf-004", name:"Okomeya Cafe", city:"Kyoto", area:"Centro", cuisine:"Bakery/Cafe", lat:35.0116, lng:135.7681, tags:["100% GF","certificato"], address:"Kyoto", maps_url:"https://maps.google.com/?q=Okomeya+Cafe+Kyoto", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Kyoto,+Japan", note:"Bakery 100% GF, safe for celiac" },
    { id:"gf-005", name:"Mumokuteki Cafe", city:"Kyoto", area:"Kawaramachi", cuisine:"Vegan/GF", lat:35.0035, lng:135.7654, tags:["opzioni GF","vegan"], address:"Kawaramachi, Kyoto", maps_url:"https://maps.google.com/?q=Mumokuteki+Cafe+Kyoto", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Kyoto,+Japan", note:"Menu vegan con molte opzioni GF" },
    { id:"gf-006", name:"Papachan", city:"Osaka", area:"Namba", cuisine:"Okonomiyaki GF", lat:34.6669, lng:135.5016, tags:["100% GF"], address:"Namba, Osaka", maps_url:"https://maps.google.com/?q=Papachan+Gluten+Free+Osaka", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Osaka,+Japan", note:"Okonomiyaki senza glutine" },
    { id:"gf-007", name:"Nara Grocery & Cafe", city:"Nara", area:"Centro", cuisine:"Cafe", lat:34.6854, lng:135.8048, tags:["opzioni GF"], address:"Nara", maps_url:"https://maps.google.com/?q=Gluten+Free+Cafe+Nara", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Nara,+Japan", note:"Verifica sempre disponibilità su FMGF" },
    { id:"gf-008", name:"Cerca su Find Me GF", city:"Sapporo", area:"", cuisine:"", lat:43.0642, lng:141.3469, tags:[], address:"", maps_url:"", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Sapporo,+Japan", note:"Pochi locali certificati — verifica su FMGF" },
    { id:"gf-009", name:"Cerca su Find Me GF", city:"Kanazawa", area:"", cuisine:"", lat:36.5628, lng:136.6564, tags:[], address:"", maps_url:"", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Kanazawa,+Japan", note:"Verifica disponibilità su FMGF" },
    { id:"gf-010", name:"Cerca su Find Me GF", city:"Beppu", area:"", cuisine:"", lat:33.2843, lng:131.4945, tags:[], address:"", maps_url:"", fmgf_url:"https://www.findmeglutenfree.com/map#loc=Beppu,+Japan", note:"Verifica disponibilità su FMGF" }
  ];

  const FMGF_CITY_URLS = {
    "Sapporo":      "https://www.findmeglutenfree.com/map#loc=Sapporo,+Japan",
    "Tokyo":        "https://www.findmeglutenfree.com/map#loc=Tokyo,+Japan",
    "Nikko":        "https://www.findmeglutenfree.com/map#loc=Nikko,+Japan",
    "Kamakura":     "https://www.findmeglutenfree.com/map#loc=Kamakura,+Japan",
    "Shirakawa-go": "https://www.findmeglutenfree.com/map#loc=Shirakawa-go,+Japan",
    "Kanazawa":     "https://www.findmeglutenfree.com/map#loc=Kanazawa,+Japan",
    "Kyoto":        "https://www.findmeglutenfree.com/map#loc=Kyoto,+Japan",
    "Osaka":        "https://www.findmeglutenfree.com/map#loc=Osaka,+Japan",
    "Nara":         "https://www.findmeglutenfree.com/map#loc=Nara,+Japan",
    "Tottori":      "https://www.findmeglutenfree.com/map#loc=Tottori,+Japan",
    "Beppu":        "https://www.findmeglutenfree.com/map#loc=Beppu,+Japan",
    "Okinawa":      "https://www.findmeglutenfree.com/map#loc=Okinawa,+Japan"
  };

  function renderGFList(city, searchText) {
    const container = document.getElementById("gf-list-sheet") || document.getElementById("gf-list");
    if (!container) return;

    const MAX_GF_DISTANCE_KM = 50;
    const hardcodedFiltered = GF_RESTAURANTS.filter(r => {
      if (!window.state?.gpsCurrentLat || !window.state?.gpsCurrentLng) return true;
      if (r.lat && r.lng) {
        const dist = window.haversineKm(window.state.gpsCurrentLat, window.state.gpsCurrentLng, r.lat, r.lng);
        return dist <= MAX_GF_DISTANCE_KM;
      }
      return true;
    }).map(r => ({ ...r, source: 'hardcoded', distance: (r.lat && r.lng && window.state?.gpsCurrentLat) ? window.haversineKm(window.state.gpsCurrentLat, window.state.gpsCurrentLng, r.lat, r.lng) : null }));

    const allItems = [
      ...hardcodedFiltered,
      ...(window.allGlutenFreeShops || []).map(r => ({ ...r, source: 'google', id: r.place_id || r.id }))
    ];

    let filtered = (city && city !== "all")
      ? allItems.filter(r => r.city === city && (!searchText || r.name.toLowerCase().includes(searchText.toLowerCase())))
      : allItems.filter(r => !searchText || r.name.toLowerCase().includes(searchText.toLowerCase()));

    if (window.state?.gpsCurrentLat) {
      filtered.sort((a, b) => {
        const distA = a.distance ?? Infinity;
        const distB = b.distance ?? Infinity;
        return distA - distB;
      });
    }

    const discoverUrl = FMGF_CITY_URLS[city] || "https://www.findmeglutenfree.com/map#loc=Japan";

    if (filtered.length === 0) {
      const noResultsMsg = window.state?.gpsCurrentLat
        ? "Nessun ristorante gluten-free trovato entro 50km."
        : "Nessun ristorante gluten-free trovato.";
      const suggestion = window.state?.gpsCurrentLat
        ? "Prova ad allargare la ricerca o abilitare GPS."
        : "Abilita GPS per cercare vicino a te.";

      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          text-align: center;
          min-height: 200px;
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">🌾</div>
          <h3 style="
            font-size: 16px;
            font-weight: 700;
            color: rgba(255,255,255,0.95);
            margin: 0 0 8px 0;
          ">${noResultsMsg}</h3>
          <p style="
            font-size: 13px;
            color: rgba(255,255,255,0.6);
            margin: 0 0 16px 0;
          ">${suggestion}</p>
          <a href="${discoverUrl}" target="_blank" style="
            display: inline-block;
            padding: 10px 20px;
            background: linear-gradient(135deg, var(--m-accent), #FF5E1F);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(255,107,53,0.3);
          " onmouseover="this.style.boxShadow='0 8px 20px rgba(255,107,53,0.4)'" onmouseout="this.style.boxShadow='0 4px 12px rgba(255,107,53,0.3)'">🔍 Scopri su Find Me GF</a>
        </div>
      `;
      return;
    }

    let html = filtered.map(r => {
      const tags = (r.tags || []).map(t => `<span style="display:inline-block;margin-right:6px;margin-bottom:4px;padding:2px 8px;background:rgba(74,222,128,0.15);color:#4caf50;border-radius:4px;font-size:11px;font-weight:600;">${t}</span>`).join('');

      const ctaButtons = [];
      if (r.phone) {
        ctaButtons.push(`<a href="tel:${r.phone.replace(/[^0-9+]/g,'')}" style="flex:1;padding:10px 12px;background:linear-gradient(135deg, var(--m-accent), #FF5E1F);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;text-decoration:none;text-align:center;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(255,107,53,0.4)'" onmouseout="this.style.boxShadow='none'">📞 Chiama</a>`);
      }
      if (r.maps_url) {
        ctaButtons.push(`<a href="${r.maps_url}" target="_blank" style="flex:1;padding:10px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,165,100,0.2);border-radius:8px;color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;text-decoration:none;text-align:center;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)';this.style.borderColor='rgba(255,165,100,0.4)'" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='rgba(255,165,100,0.2)'">🗺️ Mappe</a>`);
      }

      const secondaryLinks = [];
      if (r.source === 'google' && r.google_maps_url) {
        secondaryLinks.push(`<a href="${r.google_maps_url}" target="_blank" style="color:rgba(255,165,100,0.8);text-decoration:none;font-size:12px;font-weight:500;">Vedi su Google Maps</a>`);
      } else if (r.fmgf_url) {
        secondaryLinks.push(`<a href="${r.fmgf_url}" target="_blank" style="color:rgba(255,165,100,0.8);text-decoration:none;font-size:12px;font-weight:500;">Verifica su Find Me GF</a>`);
      }

      const rating = r.rating ? `⭐ ${r.rating}` : '';
      const reviewCount = r.review_count ? `(${r.review_count})` : '';
      const distanceStr = r.distance ? `<span style="color:#4ADE80;font-weight:600">${window.fmtDist(r.distance)}</span>` : '';

      return `
        <div style="
          padding: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.06)';this.style.borderColor='rgba(255,165,100,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.borderColor='rgba(255,255,255,0.1)'">
          <!-- Header: Name + Distance -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.95); margin-bottom: 2px;">${r.name}</div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.6);">${r.city}${r.area?` · ${r.area}`:''}${r.cuisine?` · ${r.cuisine}`:''}</div>
            </div>
            ${distanceStr ? `<div style="margin-left: 8px; white-space: nowrap; font-size: 12px; font-weight: 600;">${distanceStr}</div>` : ''}
          </div>

          <!-- Address (if available) -->
          ${r.address ? `<div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">${r.address}</div>` : ''}

          <!-- Tags -->
          ${tags ? `<div style="margin-bottom: 8px; font-size: 0;">${tags}</div>` : ''}

          <!-- Rating -->
          ${rating || reviewCount ? `<div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 10px;">${rating} ${reviewCount}</div>` : ''}

          <!-- Note -->
          ${r.note ? `<div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 10px; padding: 8px; background: rgba(74,222,128,0.05); border-left: 2px solid rgba(74,222,128,0.3); border-radius: 4px;">${r.note}</div>` : ''}

          <!-- CTA Buttons -->
          <div style="display: flex; gap: 8px; margin-bottom: ${secondaryLinks.length ? '8px' : '0'};">
            ${ctaButtons.join('')}
          </div>

          <!-- Secondary links -->
          ${secondaryLinks.length ? `<div style="font-size: 12px; text-align: center;">${secondaryLinks.join(' · ')}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    container.querySelectorAll('.poi-row').forEach(r => { r.onclick = () => openGFDetail(r.dataset.id); });
  }

  function openGFDetail(id) {
    const r = GF_RESTAURANTS.find(x => x.id === id);
    if (!r) return;
    const tags = (r.tags || []).map(t => `<span style="margin-right:6px;color:#4caf50;font-weight:600;">${t}</span>`).join('');
    const buttons = [];
    if (r.fmgf_url) buttons.push(`<a class="btn primary" href="${r.fmgf_url}" target="_blank" rel="noopener">🔍 Verifica su FMGF</a>`);
    if (r.maps_url) buttons.push(`<a class="btn" href="${r.maps_url}" target="_blank" rel="noopener">🗺️ Apri in Maps</a>`);
    const html = `
      <div class="section">
        <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <h2 style="margin:0 0 8px;font-size:19px;">${r.name}</h2>
            <div style="font-size:13px;color:var(--muted);">${r.city}${r.area?` · ${r.area}`:''}${r.cuisine?` · ${r.cuisine}`:''}</div>
          </div>
          <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;">${tags}</div>
        </div>
      </div>
      <div class="section">
        <p style="margin:0 0 8px;font-size:14px;color:var(--text);">${r.note || ''}</p>
        ${r.address ? `<p style="margin:0 0 8px;font-size:13px;color:var(--muted);">${r.address}</p>` : ''}
      </div>
      <div class="section" style="display:flex;gap:10px;flex-wrap:wrap;">${buttons.join('')}</div>
    `;
    window.openSheet(r.name, html);
  }

  window.GF_RESTAURANTS = GF_RESTAURANTS;
  window.FMGF_CITY_URLS = FMGF_CITY_URLS;
  window.renderGFList = renderGFList;
  window.openGFDetail = openGFDetail;
})();
