// ============================================================================
// poi-detail-view.js — loadPOIPhotos, openPOI e supporting helpers
// Estratto da app-core.js. Template card, wizard itinerario e helper puri
// sono in js/views/poi-detail/ (poi-detail-helpers.js, poi-detail-template.js,
// poi-itinerary-wizard.js). Deps (all window.*):
//   openSheet, closeSheet, state, CATS, saveState, toast,
//   getCategoryColor, getCategoryEmoji, getPoiDisplayName, getCachedAllPOIs,
//   promptAddToCalendar, analyzeGlutenFreeStatus, ITINERARY,
//   poiDetailHTML, openAddToItineraryWizard
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

function loadPOIPhotos(p){
  const container = document.getElementById('poi-photos-container');
  if (!container) {
    console.warn('[loadPOIPhotos] container not found for', p.id);
    return;
  }
  if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) return;
  if (p.photo) return;
  if (typeof window.getPhotosForLocation !== 'function') {
    console.warn('[loadPOIPhotos] getPhotosForLocation not available', typeof window.getPhotosForLocation);
    container.outerHTML = photoFallbackHtml('Foto non disponibili', p);
    return;
  }

  const googleImagesUrl = (q, city) => {
    const query = [q, city, 'Japan'].filter(Boolean).join(' ');
    return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
  };
  const photoFallbackHtml = (label, poi) => `
    <div style="margin-bottom:12px;padding:14px;background:var(--surface-2);border-radius:8px;text-align:center">
      <div style="font-size:15px;color:var(--muted);margin-bottom:8px">📷 ${label}</div>
      <a href="${googleImagesUrl(window.getPoiDisplayName(poi), poi.city)}" target="_blank" rel="noopener"
         class="btn" style="font-size:14px">🔎 Cerca foto su Google Images</a>
    </div>
  `;

  (async () => {
    try {
      // Usa dati verificati se disponibili
      const verifiedPOI = await window.POIVerifiedDB?.getVerifiedPOI?.(p.id);
      const photoLat = verifiedPOI?.lat || p.lat;
      const photoLng = verifiedPOI?.lng || p.lng;
      const photoCity = verifiedPOI?.addressCity || p.city;
      const photoName = verifiedPOI?.name || window.getPoiDisplayName(p);

      console.log('[loadPOIPhotos] Using', verifiedPOI ? 'verified' : 'local', 'data for photos');

      const photos = await window.getPhotosForLocation(
        photoLat,
        photoLng,
        photoCity,
        photoName
      );

      if (photos && photos.length > 0) {
        const slides = photos.slice(0, 5).map((photo, idx) => `
          <div class="photo-slide" style="flex-shrink:0;width:100%;height:280px;overflow:hidden;border-radius:8px;flex:none">
            <a href="${photo.link || googleImagesUrl(window.getPoiDisplayName(p), p.city)}" target="_blank" rel="noopener" title="${photo.author || ''}" style="display:block;width:100%;height:100%;text-decoration:none">
              <img src="${photo.url}" alt="${window.getPoiDisplayName(p)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .2s">
            </a>
          </div>
        `).join('');

        const sourceLabelMap = {
          google_places: '📷 Foto da Google Maps',
          google_custom_search: '📷 Foto da Google Search',
          wikipedia: '📷 Foto da Wikipedia',
          google_street_view: '📷 Foto da Google Street View',
          google_static_map: '📷 Mappa ufficiale Google Maps'
        };
        const uniqueSources = [...new Set(photos.map(photo => photo.source).filter(Boolean))];
        const sourceLabel = uniqueSources.length === 1
          ? sourceLabelMap[uniqueSources[0]] || '📷 Foto ufficiali'
          : '📷 Foto ufficiali da più fonti';

        container.outerHTML = `
          <div style="margin-bottom:12px">
            <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;display:flex;gap:8px;padding:0;scroll-behavior:smooth;width:100%;margin-bottom:6px">
              ${slides}
            </div>
            <div style="font-size:13px;color:var(--muted);text-align:center">${sourceLabel}</div>
          </div>
        `;
      } else {
        container.outerHTML = photoFallbackHtml('Nessuna foto Google Maps trovata', p);
      }
    } catch (err) {
      console.error('[loadPOIPhotos] Error:', err && err.message);
      container.outerHTML = photoFallbackHtml('Errore nel caricamento foto', p);
    }
  })();
}

// POI validation cache → js/poi-validation-cache.js (window.POIVerifiedDB)

async function enrichPOIData(p) {
  const cached = await window.POIVerifiedDB?.getVerifiedPOI?.(p.id);
  if (cached && !cached._notFound) {
    console.log('[enrichPOI] Using cached validation for', p.id);
    return Object.assign({}, p, cached);
  }
  try {
    const response = await fetch(
      `/api/enrichPOI?id=${encodeURIComponent(p.id)}&name=${encodeURIComponent(p.name || p.jp || p.id)}&lat=${p.lat}&lng=${p.lng}`
    );
    const data = await response.json();
    if (data.poi?.validated === true) {
      await window.POIVerifiedDB?.saveVerifiedPOI?.(data.poi);
      console.log('[enrichPOI] ✅ Validated & cached:', p.id);
      return Object.assign({}, p, data.poi);
    }
    if (data.poi && data.poi.error === 'Place not found on Google Maps') {
      await window.POIVerifiedDB?.saveNotFound?.(p.id);
    }
  } catch (err) {
    console.warn('[enrichPOI] Error enriching POI:', err.message);
  }
  return p;
}

function openPOI(id){
  console.log('%c[openPOI] Called with id:', 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold', id);
  const cached = window.getCachedAllPOIs();
  console.log('[openPOI] 🔎 Searching in', cached.length, 'POIs...');
  console.log('[openPOI] Available IDs (first 5):', cached.slice(0, 5).map(p => p.id).join(', '));
  console.log('[openPOI] Looking for id:', id);
  console.log('[openPOI] ID exists in cache:', cached.some(x => x.id === id) ? '✓ YES' : '✗ NO');

  let p = cached.find(x => x.id===id);
  console.log('[openPOI] Found POI:', p ? p.name : 'NOT FOUND');
  if (!p) {
    console.error('[openPOI] ❌ POI not found, returning');
    console.error('[openPOI] DEBUG: Trying to find matching id with different methods...');
    console.error('[openPOI] Exact match:', cached.filter(x => x.id === id).length);
    console.error('[openPOI] Contains match:', cached.filter(x => x?.id != null && id != null && String(x.id).includes(String(id))).length);
    return;
  }

  // Capture displayName here for use in async functions
  const displayName = window.getPoiDisplayName(p);

  // Show skeleton immediately so the user sees feedback on tap
  window.openSheet(displayName, '<div class="skeleton-poi"><div class="skeleton-block sk-photo"></div><div class="skeleton-block sk-title"></div><div class="skeleton-block sk-badge"></div><div class="skeleton-block sk-line"></div><div class="skeleton-block sk-line-s"></div><div class="skeleton-block sk-line"></div><div class="skeleton-block sk-btn"></div></div>');

  // Syncronizza con Google Places se non ancora verificato
  (async () => {
    const verified = await window.POISync?.ensurePOIVerified?.(p);
    if (verified) {
      p = { ...p, ...verified };
    }

    // NEW: Enrich con Google Places Details API
    if (window.GooglePlacesDetailsClient && p.googlePlaceId) {
      const enriched = await window.GooglePlacesDetailsClient.enrichPOI(p);
      if (enriched._details) p = enriched;
    }

    const html = window.poiDetailHTML(p);
    // Update sheet body in-place (sheet is already open)
    const _sb = document.getElementById('sheet-body');
    if (_sb && document.getElementById('sheet')?.classList.contains('open')) {
      _sb.innerHTML = html;
    } else {
      window.openSheet(displayName, html);
    }
    // ===== SETUP ADD-TO-ITINERARY BUTTON (MOVED INTO ASYNC BLOCK) =====
    setTimeout(() => {
      // "Proponi al gruppo" → aggiunge il locale alla wishlist GF condivisa
      const proposeBtn = document.getElementById('propose-to-group-btn');
      if (proposeBtn) {
        proposeBtn.onclick = () => {
          window.GFWishlist?.propose?.({
            id: p.id, name: window.getPoiDisplayName?.(p) || p.name,
            city: p.city, lat: p.lat, lng: p.lng, gf: p.gf
          });
        };
      }

      const addToItineraryBtn = document.getElementById('add-to-itinerary-btn');
      console.log('[WIZARD] add-to-itinerary button found:', !!addToItineraryBtn);

      if (addToItineraryBtn) {
        // Wizard multi-step estratto in poi-detail/poi-itinerary-wizard.js
        addToItineraryBtn.onclick = () => window.openAddToItineraryWizard(p);
      }
    }, 20);

    // Inizializza logica GF detection (SOLO se ristorante)
    setTimeout(() => {
      const FOOD_TYPES = ['restaurant','food','cafe','bar','meal_takeaway','bakery'];
      const isRestaurant = FOOD_TYPES.includes(p.primaryType || p.cat);
      if (isRestaurant && window.initPOIDetail) {
        console.debug('[openPOI] Initializing GF detection');
        window.initPOIDetail(p, p._details || {}, p._reviews || []);
      }
    }, 100);

    // Aumenta la larghezza della finestra del POI per mostrare due colonne side-by-side
    setTimeout(() => {
      const winId = 'y2kwin-' + displayName.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20);
      const win = document.getElementById(winId);
      if (win) {
        win.style.width = '680px';
        console.log('[openPOI] ✅ Window width set to 680px for two-column layout');
      }
    }, 50);

    // Category editor - DOPO openSheet
    setTimeout(() => {
      const editCatBtn = document.getElementById('edit-cat-btn');
      const catSelector = document.getElementById('cat-selector');
      const catOptions = document.getElementById('cat-options');

      if (editCatBtn && catSelector && catOptions) {
        // Popola categorie
        catOptions.innerHTML = Object.entries(CATS)
          .filter(([k]) => k !== 'all')
          .map(([k, v]) => {
            const isSelected = (window.state.userCategoryOverrides?.[id] || p.cat) === k;
            return `<button class="btn" data-cat="${k}" style="font-size:13px;padding:8px;text-align:center;background:${isSelected ? '#e0414e' : '#f0f0f0'};color:${isSelected ? 'white' : '#333'};border:none;border-radius:4px;cursor:pointer">
              ${v.icon}<br>${v.label}
            </button>`;
          })
          .join('');

        // Click matita = toggle
        editCatBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          catSelector.style.display = catSelector.style.display === 'none' ? 'block' : 'none';
        };

        // Click categoria = salva
        catOptions.querySelectorAll('button[data-cat]').forEach(btn => {
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const newCat = btn.dataset.cat;
            if (!window.state.userCategoryOverrides) window.state.userCategoryOverrides = {};
            window.state.userCategoryOverrides[id] = newCat;
            window.saveState?.();
            window.toast(`✏️ Categoria cambiata a ${window.CATS[newCat]?.label || newCat}`);
            catSelector.style.display = 'none';
            openPOI(id);
          };
        });
      }
    }, 10);
  })();

  // Enrichisci il POI in background (non blocca UI)
  (async () => {
    const enriched = await enrichPOIData(p);
    if (enriched && enriched.validated) {
      console.log('[openPOI] POI enriched with Google data:', enriched);
      // Aggiorna la UI del POI detail se è ancora aperta
      const sheetBody = document.getElementById('sheet-body');
      if (sheetBody && enriched.rating) {
        // Aggiungi info Google Places se disponibile
        const ratingHtml = document.createElement('div');
        ratingHtml.style.cssText = 'background:var(--surface-2);padding:10px;border-radius:8px;margin:10px 0;border-left:3px solid var(--accent)';
        ratingHtml.innerHTML = `
          <div style="font-size:14px;color:var(--muted);margin-bottom:4px">📍 Google Places Data</div>
          <div style="font-weight:600;color:var(--text)">⭐ ${enriched.rating.toFixed(1)} (${enriched.review_count} recensioni)</div>
          ${enriched.phone ? `<div style="font-size:14px;margin-top:4px">📞 ${enriched.phone}</div>` : ''}
          ${enriched.website ? `<div style="font-size:14px;margin-top:4px"><a href="${enriched.website}" target="_blank" style="color:var(--accent)">🌐 Website</a></div>` : ''}
          ${enriched.is_open !== null ? `<div style="font-size:14px;margin-top:4px;color:${enriched.is_open ? 'var(--success)' : 'var(--danger)'}">⏰ ${enriched.is_open ? 'Aperto ora' : 'Chiuso ora'}</div>` : ''}
        `;
        sheetBody.insertBefore(ratingHtml, sheetBody.firstChild);
      }
    }

    // Analisi gluten-free per categorie food/drink
    // Priorità: place_id verificato > googlePlaceId (Google Places) > place_id locale > matching GF shops
    let placeIdForGF = null;

    // Primo: prova con place_id verificato (dalla sincronizzazione)
    const verifiedPOIGF = await window.POIVerifiedDB?.getVerifiedPOI?.(p.id);
    if (verifiedPOIGF?.googlePlaceId) {
      placeIdForGF = verifiedPOIGF.googlePlaceId;
      console.log('[openPOI] Using verified place_id for GF:', placeIdForGF);
    } else if (p.googlePlaceId) {
      // Google Places POI - usa il place_id di Google Places
      placeIdForGF = p.googlePlaceId;
      console.log('[openPOI] Using Google Places place_id for GF:', placeIdForGF);
    } else if (p.place_id) {
      // Local POI - usa il place_id locale
      placeIdForGF = p.place_id;
      console.log('[openPOI] Using local place_id for GF:', placeIdForGF);
    }

    // Se non ha place_id, prova a matchare con i GF shops caricati da Google Places
    if (!placeIdForGF && ['food', 'drink', 'restaurant', 'cafe', 'bar'].includes(p.cat)) {
      console.log('%c[openPOI] No place_id - searching GF shops match...', 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
      console.log(`[DEBUG] POI name: "${p.name}", city: "${p.city}"`);
      console.log(`[DEBUG] Available GF shops in ${p.city}:`, (window.allGlutenFreeShops || []).filter(s => s.city === p.city).map(s => s.name).slice(0, 10));

      const matchedShop = (window.allGlutenFreeShops || []).find(shop => {
        const nameMatch = shop.name && p.name && shop.name.toLowerCase().includes(p.name.toLowerCase().substring(0, 5));
        const cityMatch = shop.city === p.city;
        console.log(`[DEBUG] Testing "${shop.name}": name=${nameMatch}, city=${cityMatch}`);
        return nameMatch && cityMatch;
      });

      if (matchedShop && matchedShop.place_id) {
        placeIdForGF = matchedShop.place_id;
        console.log('%c[openPOI] ✅ MATCHED with GF shop!', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px', matchedShop.name, 'place_id:', placeIdForGF);
      } else {
        console.log('%c[openPOI] ❌ NO MATCH found in GF shops', 'background: #D9534F; color: white; padding: 4px 8px; border-radius: 3px');
      }
    }

    if (['food', 'drink', 'restaurant', 'cafe', 'bar'].includes(p.cat)) {
      console.log(`%c[openPOI] GF Check START for: ${p.name} (cat=${p.cat})`, 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
      if (placeIdForGF) {
        console.log('%c[openPOI] 🌐 Analyzing GF status', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px', p.name, 'with place_id:', placeIdForGF);
        const gfStatus = await window.analyzeGlutenFreeStatus(placeIdForGF, p.name, p.city);
        console.log('[openPOI] GF Analysis returned:', gfStatus);
        if (gfStatus && gfStatus.lvl !== 'unknown') {
          console.log('[openPOI] GF Analysis result:', gfStatus);
          // Aggiorna il POI con i dati GF
          if (!p.gf) p.gf = {};
          p.gf.lvl = gfStatus.lvl;
          p.gf.confidence = gfStatus.confidence;
          p.gf.mentions = gfStatus.mentions;
          p.gf.total_reviews = gfStatus.total_reviews;

          // Aggiorna la UI se è ancora aperta (sia sheet che Y2K window)
          const map = { full: ['✅ 100% Gluten Free','gf-full'], partial: ['⚠️ Opzioni GF','gf-partial'], no: ['❌ Contiene Gluten','gf-none'], unknown: ['❓ Sconosciuto',''] };
          const [label, cls] = map[gfStatus.lvl] || map.unknown;
          const gfHtml = `
            <h3>🌾 Analisi Gluten-Free</h3>
            <p><span class="tag ${cls}">${label}</span></p>
            <p style="font-size:14px;color:var(--muted);">Confidenza: ${gfStatus.confidence}% • ${gfStatus.mentions} menzioni su ${gfStatus.total_reviews} review</p>
            <div class="action-row" style="margin-top:8px">
              <a class="btn" href="https://www.findmeglutenfree.com/search?q=${encodeURIComponent((p.name || displayName) + ' ' + (p.city || '') + ' Japan')}" target="_blank" rel="noopener">🔍 Find Me Gluten Free</a>
            </div>
          `;

          // Update sheet and Y2K windows
          const sheetBody = document.getElementById('sheet-body');
          if (sheetBody) {
            const gfSection = sheetBody.querySelector('[data-gf-section]');
            if (gfSection) {
              gfSection.innerHTML = gfHtml;
              console.log('[openPOI] ✅ GF section updated in sheet');
            }
          }

          const y2kWindows = document.querySelectorAll('.y2k-win-body');
          y2kWindows.forEach(win => {
            const gfSection = win.querySelector('[data-gf-section]');
            if (gfSection) {
              gfSection.innerHTML = gfHtml;
              console.log('[openPOI] ✅ GF section updated in Y2K window');
            }
          });
        } else {
          // Analysis failed or unknown - show fallback
          console.log('%c[openPOI] ⚠️ GF analysis failed or unknown', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px');
          const gfHtml = `
            <h3>🌾 Gluten-Free</h3>
            <p><span class="tag gf-none">❌ Nessun dato disponibile</span></p>
            <p style="font-size:14px;color:var(--muted);">Impossibile verificare lo stato gluten-free da Google Reviews. Verifica manualmente:</p>
            <div class="action-row" style="margin-top:8px">
              <a class="btn" href="https://www.findmeglutenfree.com/search?q=${encodeURIComponent((p.name || displayName) + ' ' + (p.city || '') + ' Japan')}" target="_blank" rel="noopener">🔍 Find Me Gluten Free</a>
            </div>
          `;

          const sheetBody = document.getElementById('sheet-body');
          if (sheetBody) {
            const gfSection = sheetBody.querySelector('[data-gf-section]');
            if (gfSection) {
              gfSection.innerHTML = gfHtml;
              console.log('[openPOI] ⚠️ GF fallback shown in sheet');
            }
          }
        }
      } else {
        console.log('%c[openPOI] ⏭️ GF analysis skipped (no place_id found)', 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px');
        // Show Find Me Gluten Free fallback even without place_id
        const gfHtml = `
          <h3>🌾 Gluten-Free</h3>
          <p><span class="tag gf-none">❓ Nessun dato disponibile</span></p>
          <p style="font-size:14px;color:var(--muted);">Verifica lo status gluten-free:</p>
          <div class="action-row" style="margin-top:8px">
            <a class="btn" href="https://www.findmeglutenfree.com/search?q=${encodeURIComponent((p.name || displayName) + ' ' + (p.city || '') + ' Japan')}" target="_blank" rel="noopener">🔍 Find Me Gluten Free</a>
          </div>
        `;

        const sheetBody = document.getElementById('sheet-body');
        if (sheetBody) {
          const gfSection = sheetBody.querySelector('[data-gf-section]');
          if (gfSection) {
            gfSection.innerHTML = gfHtml;
            console.log('[openPOI] ❓ GF no-data fallback shown');
          }
        }
      }
    }
  })();

  if (!p.photos && !p.photo && typeof window.getPhotosForLocation === 'function') {
    loadPOIPhotos(p);
  }
  // Star rating
  const starsEl = document.getElementById(`stars-${id}`);
  if (starsEl) starsEl.querySelectorAll('.star').forEach(s => {
    s.onclick = () => {
      const n = parseInt(s.dataset.star,10);
      if (!window.state.ratings) window.state.ratings = {};
      window.state.ratings[id] = n;
      window.saveState?.();
      starsEl.querySelectorAll('.star').forEach(x => x.classList.toggle('on', parseInt(x.dataset.star,10)<=n));
      window.toast(T('toast.ratingSaved', 'Voto salvato ⭐'));
    };
  });
  const savePoiBtn = document.getElementById('save-poi');
  if (savePoiBtn) savePoiBtn.onclick = () => {
    const i = window.state.savedPOIs.indexOf(id);
    if (i>=0) window.state.savedPOIs.splice(i,1); else window.state.savedPOIs.push(id);
    window.saveState?.(); openPOI(id); window.toast(i>=0 ? (window.t ? window.t('poi.unsaved','Rimosso') : 'Rimosso') : (window.t ? window.t('poi.saved','Salvato ★') : 'Salvato ★'));
  };
  const noteEl = document.getElementById('poi-note');
  if (noteEl) {
    noteEl.addEventListener('input', e => {
      window.state.notes[id] = e.target.value; window.saveState?.();
    });
  }
  const addCalBtn = document.getElementById('add-cal');
  if (addCalBtn) addCalBtn.onclick = () => window.promptAddToCalendar(p);
}

  window.loadPOIPhotos = loadPOIPhotos;
  window.__openPOI = openPOI;
  window.openPOI = openPOI;
})();
