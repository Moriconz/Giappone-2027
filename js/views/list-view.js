// ============================================================================
// LIST-VIEW.JS — renderListView + Google Places helpers
// Extracted from app-core.js. Depends on window globals set by app-core.js:
//   window.state, window.allPOIs, window.CATS, window.haversineKm,
//   window.fmtDist, window.getPoiDisplayName, window.openSheet, window.openPOI,
//   window.addToItinerary, window.removeFromItinerary, window.isInItinerary,
//   window.exportItineraryWhatsApp, window.debounce, window.toast,
//   window.GooglePlacesCache, window.modalPrompt, window.showShareItineraryModal
// ============================================================================

(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  // ── Google Places helpers ─────────────────────────────────────────────────

  async function searchGooglePlaces(query, callback) {
    if (!window.googlePlacesService) {
      window.toast?.(T('places.loading', '⏳ Caricando servizio Google Places...'));
      return;
    }

    const service = window.googlePlacesService;
    const request = {
      query: query,
      fields: ['formatted_address', 'geometry', 'name', 'place_id', 'types']
    };

    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        callback(results.map(r => ({
          id: r.place_id,
          name: r.name,
          city: extractCityFromAddress(r.formatted_address),
          lat: r.geometry.location.lat(),
          lng: r.geometry.location.lng(),
          address: r.formatted_address,
          types: r.types || [],
          fromGoogle: true
        })));
      } else {
        window.toast?.(T('toast.noResults', '❌ Nessun risultato trovato'));
        callback([]);
      }
    });
  }

  function extractCityFromAddress(address) {
    if (!address) return 'Sconosciuto';
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 2].trim() : parts[0].trim();
  }

  function addGooglePlaceToItinerary(place) {
    showAddItineraryDialog(place, ({ day, time, cost }) => {
      const entry = {
        id: place.id,
        name: place.name,
        city: place.city,
        lat: place.lat,
        lng: place.lng,
        address: place.address,
        day: day ? parseInt(day, 10) : null,
        time: time || '',
        cost: cost || '',
        fromGoogle: true
      };
      window.addToItinerary?.(entry);
      window.toast?.(T('toast.stopAdded', '✅ Tappa aggiunta!'));
      renderListView();
    });
  }

  function showGooglePlacesResults(results) {
    const modal = document.createElement('div');
    const resultsList = results.map((place) => `
      <div style="padding:10px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:6px" onclick="window.addGooglePlaceToItinerary({id:'${place.id}',name:'${place.name.replace(/'/g, "\\'")}',city:'${place.city.replace(/'/g, "\\'")}',lat:${place.lat},lng:${place.lng},address:'${place.address.replace(/'/g, "\\'")}'})">
        <div style="font-weight:600;color:var(--accent)">${place.name}</div>
        <div style="font-size:12px;color:var(--muted)">${place.city}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">${place.address}</div>
      </div>
    `).join('');

    modal.innerHTML = `
      <div style="position:fixed;inset:0;z-index:3001;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--surface);border-radius:12px;padding:16px;max-width:380px;width:100%;max-height:70vh;overflow-y:auto">
          <h3 style="margin:0 0 12px;color:var(--accent)">🌍 Risultati (${results.length})</h3>
          <div>${resultsList}</div>
          <button onclick="this.parentElement.parentElement.remove()" style="width:100%;margin-top:12px;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer">Chiudi</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function showAddItineraryDialog(poi, onConfirm) {
    const html = `
      <div style="position:fixed;inset:0;z-index:3000;background:rgba(20,30,80,.85);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto" id="add-itin-overlay">
        <div style="background:linear-gradient(170deg,#FFFDF0 0%,#FFF8DC 100%);border-top:3px solid #FF1493;border-radius:12px;padding:24px;max-width:380px;width:100%;margin:auto 0;box-shadow:0 -8px 40px rgba(255,20,147,.3)">
          <h3 style="margin:0 0 16px;font-size:18px;color:#1A2560;font-weight:700;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif">${poi.name || poi.bestname || 'Aggiungi tappa'}</h3>
          <div class="form-row">
            <label style="color:#6B5EA8;font-weight:700;font-size:12px;display:block;margin-bottom:6px">📅 Giorno del viaggio (1, 2, 3...)</label>
            <input id="itin-day" type="number" placeholder="1" min="1" max="30" style="font-size:14px;width:100%;padding:8px;border:2px solid #C8BDFF;border-radius:8px;background:#fff;color:#1A2560;box-sizing:border-box" />
          </div>
          <div class="form-row">
            <label style="color:#6B5EA8;font-weight:700;font-size:12px;display:block;margin-bottom:6px">⏰ Orario (es. 09:30)</label>
            <input id="itin-time" type="text" placeholder="09:30" style="font-size:14px;width:100%;padding:8px;border:2px solid #C8BDFF;border-radius:8px;background:#fff;color:#1A2560;box-sizing:border-box" autocomplete="off" />
          </div>
          <div class="form-row">
            <label style="color:#6B5EA8;font-weight:700;font-size:12px;display:block;margin-bottom:6px">💰 Costo (es. 10€, opzionale)</label>
            <input id="itin-cost" type="text" placeholder="Gratis" style="font-size:14px;width:100%;padding:8px;border:2px solid #C8BDFF;border-radius:8px;background:#fff;color:#1A2560;box-sizing:border-box" />
          </div>
          <div style="display:flex;gap:8px;margin-top:18px">
            <button id="itin-cancel" style="flex:1;padding:11px;background:linear-gradient(135deg,#E8E0FF,#D8CCFF);border:2px solid #C8BDFF;border-radius:8px;color:#1A2560;cursor:pointer;font-weight:600;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;transition:all 0.18s ease">Annulla</button>
            <button id="itin-confirm" style="flex:1;padding:11px;background:linear-gradient(135deg,#FF1493,#FF69B4);border:none;border-radius:8px;color:#fff;cursor:pointer;font-weight:600;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 0 16px rgba(255,20,147,.45);transition:all 0.18s ease">✓ Aggiungi</button>
          </div>
        </div>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    const dayInput = document.getElementById('itin-day');
    const timeInput = document.getElementById('itin-time');
    const costInput = document.getElementById('itin-cost');
    const cancelBtn = document.getElementById('itin-cancel');
    const confirmBtn = document.getElementById('itin-confirm');
    const overlayDiv = document.getElementById('add-itin-overlay');

    const close = () => overlay.remove();

    if (cancelBtn) cancelBtn.onclick = () => close();
    if (overlayDiv) overlayDiv.onclick = (e) => {
      if (e.target === overlayDiv) close();
    };

    setTimeout(() => dayInput?.focus(), 100);

    if (confirmBtn) {
      confirmBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const day = dayInput.value.trim() || '';
        const time = timeInput.value.trim() || '';
        const cost = costInput.value.trim() || '';
        onConfirm({ day, time, cost });
        close();
      };
    }

    dayInput.onkeydown = (e) => { if (e.key === 'Enter') timeInput.focus(); };
    timeInput.onkeydown = (e) => { if (e.key === 'Enter') costInput.focus(); };
    costInput.onkeydown = (e) => { if (e.key === 'Enter') confirmBtn.click(); };
  }

  // ── Main view ─────────────────────────────────────────────────────────────

  function renderListView() {
    const state = window.state;
    const allPOIs = window.allPOIs;
    const CATS = window.CATS;
    const haversineKm = window.haversineKm;
    const fmtDist = window.fmtDist;
    const getPoiDisplayName = window.getPoiDisplayName;
    const openPOI = window.openPOI;
    const isInItinerary = window.isInItinerary;
    const addToItinerary = window.addToItinerary;
    const removeFromItinerary = window.removeFromItinerary;
    const exportItineraryWhatsApp = window.exportItineraryWhatsApp;
    const debounce = window.debounce;

    const itinerary = state.itinerary || [];
    const itineraryHtml = itinerary.length ? itinerary.map((entry, idx) => {
      const poi = allPOIs().find(p => p.googlePlaceId === entry.id);
      const km = poi && state.gpsCurrentLat
        ? haversineKm(state.gpsCurrentLat, state.gpsCurrentLng, poi.lat, poi.lng) : null;
      const distStr = km !== null ? ` · <span style="color:var(--success);font-weight:600">${fmtDist(km)}</span>` : '';
      const dayStr = entry.day ? ` · 📅 G${entry.day}` : '';
      const timeStr = entry.time ? ` · ⏰ ${entry.time}` : '';
      const costStr = entry.cost ? ` · 💰 ${entry.cost}` : '';
      return `<div class="poi-row" style="position:relative" data-itinerary-id="${entry.id}">
        <div style="position:absolute;top:8px;right:8px;font-size:11px;background:var(--accent);color:#fff;padding:2px 6px;border-radius:4px">${idx+1}</div>
        <div class="icon">${poi ? (CATS[poi.cat]?.icon || '📍') : '📌'}</div>
        <div class="body">
          <div class="name">${entry.name || (poi ? getPoiDisplayName(poi) : '?')}</div>
          <div class="sub">${entry.city || (poi ? poi.city : '?')}${distStr}${dayStr}${timeStr}${costStr}</div>
        </div>
        <button class="btn" aria-label="Rimuovi tappa" style="flex-shrink:0;padding:4px 8px;font-size:11px;background:var(--danger);border-color:var(--danger);color:#fff" data-remove-itinerary="${entry.id}">✕</button>
      </div>`;
    }).join('') : '<p style="color:var(--muted);font-size:13px;padding:12px">📋 L\'itinerario del gruppo è vuoto. Seleziona tappe dalla lista sottostante per aggiungerle!</p>';

    const searchHtml = `
      <div style="position:sticky;top:0;background:rgba(74,91,168,0.12);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);padding:12px;margin-bottom:12px;z-index:200;border-radius:14px">
        <div style="display:flex;gap:6px;margin-bottom:8px">
          <input id="list-search" type="text" placeholder="🔍 Scrivi una città (Tokyo, Osaka, Kyoto...)"
            style="flex:1;padding:8px 10px;background:rgba(74,91,168,0.12);backdrop-filter:blur(10px);color:#fff;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;font:inherit;font-size:13px">
          <button id="btn-google-search" style="padding:8px 12px;background:linear-gradient(180deg,#FF1493,#FF69B4);border:2px solid #FF1493;border-radius:8px;color:#fff;cursor:pointer;font-weight:600;white-space:nowrap;font-size:12px;box-shadow:0 0 12px rgba(255,20,147,0.3)">🌍 Google</button>
        </div>
        <div style="display:flex;gap:6px;font-size:12px">
          <button id="btn-export-whatsapp" style="flex:1;padding:6px;background:rgba(76,175,80,.2);border:1.5px solid rgba(76,175,80,.5);border-radius:6px;color:#fff;cursor:pointer;font-size:11px;font-weight:600;backdrop-filter:blur(10px)">📤 WhatsApp</button>
          <button id="btn-share-group" style="flex:1;padding:6px;background:rgba(255,20,147,.2);border:1.5px solid rgba(255,20,147,.5);border-radius:6px;color:#fff;cursor:pointer;font-size:11px;font-weight:600;backdrop-filter:blur(10px)">👥 Condividi</button>
        </div>
      </div>
      <div class="section" style="background:rgba(74,91,168,0.12);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);border-radius:14px;padding:14px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0;color:#fff;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700">🗓️ Itinerario (${itinerary.length})</h3>
          <span style="font-size:11px;color:rgba(255,255,255,0.7)">Tempo reale</span>
        </div>
        <p style="font-size:12px;color:rgba(255,255,255,0.6);margin:0 0 8px">Condiviso con i membri della stanza</p>
        <div id="itinerary-list">${itineraryHtml}</div>
      </div>
      <div id="list-results" style="margin-top:20px">
        <div style="padding:20px;text-align:center;color:rgba(255,255,255,0.7);font-size:13px">
          <p>📍 Scrivi il nome di una città per vedere i luoghi</p>
          <p style="font-size:11px;margin:8px 0 0;color:rgba(255,255,255,0.5)">Es: Tokyo, Osaka, Kyoto, Hokkaido, Nagano, Fukuoka, Hiroshima...</p>
        </div>
      </div>
    `;

    window.openSheet('🗺️ Tutte le tappe', searchHtml);

    const btnExportWhatsapp = document.getElementById('btn-export-whatsapp');
    const btnShareGroup = document.getElementById('btn-share-group');
    const btnGoogleSearch = document.getElementById('btn-google-search');

    if (btnExportWhatsapp) btnExportWhatsapp.onclick = () => exportItineraryWhatsApp();
    if (btnShareGroup) btnShareGroup.onclick = () => window.showShareItineraryModal?.();
    if (btnGoogleSearch) {
      btnGoogleSearch.onclick = async () => {
        const searchQuery = await (window.modalPrompt || ((msg) => Promise.resolve(prompt(msg))))(
          '🌍 Cerca su Google Places:', { placeholder: 'Es: Senso-ji Temple Tokyo' }
        );
        if (searchQuery) {
          searchGooglePlaces(searchQuery, (results) => {
            if (results.length === 0) return;
            if (results.length === 1) addGooglePlaceToItinerary(results[0]);
            else showGooglePlacesResults(results);
          });
        }
      };
    }

    const searchInput = document.getElementById('list-search');
    const resultsDiv = document.getElementById('list-results');

    if (searchInput) {
      searchInput.oninput = debounce((e) => {
        const query = e.target.value.toLowerCase().trim();

        if (!query) {
          resultsDiv.innerHTML = `
            <div style="padding:20px;text-align:center;color:rgba(255,255,255,0.7);font-size:13px">
              <p>📍 Scrivi il nome di una città per vedere i luoghi</p>
              <p style="font-size:11px;margin:8px 0 0;color:rgba(255,255,255,0.5)">Es: Tokyo, Osaka, Kyoto, Hokkaido, Nagano, Fukuoka, Hiroshima...</p>
            </div>
          `;
          return;
        }

        window.GooglePlacesCache.getAllCached().then(allCachedPois => {
          const seenIds = new Set();
          const dedupedPois = [];
          allCachedPois.forEach(p => {
            const id = p.googlePlaceId || p.id;
            if (!seenIds.has(id)) { seenIds.add(id); dedupedPois.push(p); }
          });

          const searchResults = dedupedPois.filter(p =>
            (p.searchCity || '').toLowerCase().includes(query)
          );

          if (searchResults.length === 0) {
            resultsDiv.innerHTML = `
              <div style="padding:20px;text-align:center">
                <p style="font-size:14px;margin:0 0 8px;color:#FF1493;font-weight:700">❌ Nessun POI trovato</p>
                <p style="font-size:12px;margin:0;color:rgba(255,255,255,0.7)">Non ci sono luoghi a "${query}"</p>
                <p style="font-size:11px;margin:8px 0 0;color:rgba(255,255,255,0.5)">💡 Prova con: Tokyo, Osaka, Kyoto, Hokkaido, Nagano, Fukuoka, Hiroshima</p>
              </div>
            `;
            return;
          }

          const poisWithDist = searchResults.map(p => {
            const km = state.gpsCurrentLat && p.lat && p.lng
              ? haversineKm(state.gpsCurrentLat, state.gpsCurrentLng, p.lat, p.lng)
              : Infinity;
            return { ...p, km };
          }).sort((a, b) => a.km - b.km);

          const byCategory = {};
          poisWithDist.forEach(p => {
            const cat = p.cat || 'poi';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(p);
          });

          const catOrder = Object.keys(byCategory).sort((a, b) =>
            (CATS[a]?.label || a).localeCompare(CATS[b]?.label || b)
          );

          const html = catOrder.map(cat => {
            const items = byCategory[cat];
            const itemsHtml = items.map(p => {
              const isInItin = isInItinerary(p.id);
              const distStr = p.km !== Infinity ? `📍 ${fmtDist(p.km)}` : '';
              const ratingStr = p.rating ? `⭐ ${p.rating}` : '';
              const costStr = p.cost ? `💰 ${p.cost}` : '';
              const photoUrl = p.photos && p.photos.length > 0
                ? `/api/placePhoto?reference=${encodeURIComponent(p.photos[0].reference)}&maxwidth=150`
                : '';
              const displayName = getPoiDisplayName(p);
              const catLabel = CATS[cat]?.label || cat;
              return `
                <div class="poi-row" data-id="${p.googlePlaceId}">
                  <div class="icon">${CATS[p.cat]?.icon || '📍'}</div>
                  <div class="body">
                    <div class="name">${displayName}</div>
                    <div class="sub">${catLabel} · ${distStr}${ratingStr ? ' · ' + ratingStr : ''}${costStr ? ' · ' + costStr : ''}</div>
                  </div>
                  ${photoUrl ? `<img src="${photoUrl}" loading="lazy" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer" alt="Foto" class="poi-photo" data-poi-name="${getPoiDisplayName(p).replace(/"/g, '&quot;')}" data-photo-url="${photoUrl}">` : ''}
                  <button class="btn" style="flex-shrink:0;padding:4px 8px;font-size:11px;background:${isInItin?'var(--warning)':'var(--primary)'};border-color:${isInItin?'var(--warning)':'var(--primary)'};color:#fff;cursor:pointer"
                    data-add-to-itinerary="${p.googlePlaceId}"
                    data-poi-place-id="${p.googlePlaceId}"
                    data-poi-name="${getPoiDisplayName(p).replace(/"/g, '&quot;')}"
                    data-poi-city="${(p.searchCity || p.city || '').replace(/"/g, '&quot;')}"
                    data-poi-lat="${p.lat}"
                    data-poi-lng="${p.lng}"
                  >${isInItin ? '✓' : '+ Aggiungi'}</button>
                </div>
              `;
            }).join('');

            return `
              <div class="category-section" data-category="${cat}">
                <h4 class="category-header" style="cursor:pointer;user-select:none;display:flex;gap:8px;align-items:center">
                  <span class="category-toggle" style="font-size:12px;font-weight:700">▼</span>
                  <span>${CATS[cat]?.label || cat}</span>
                  <span class="count">${items.length}</span>
                </h4>
                <div class="category-items">${itemsHtml}</div>
              </div>
            `;
          }).join('');

          resultsDiv.innerHTML = html;

          resultsDiv.querySelectorAll('.category-header').forEach(header => {
            header.onclick = (e) => {
              e.preventDefault();
              const section = header.closest('.category-section');
              const items = section.querySelector('.category-items');
              const toggle = header.querySelector('.category-toggle');
              items.classList.toggle('collapsed');
              toggle.textContent = items.classList.contains('collapsed') ? '▶' : '▼';
            };
          });

          resultsDiv.querySelectorAll('.poi-row').forEach(r => {
            r.onclick = (e) => {
              if (!e.target.closest('[data-add-to-itinerary]') && !e.target.closest('.poi-photo')) {
                openPOI(r.dataset.id);
              }
            };
          });

          resultsDiv.addEventListener('click', (e) => {
            const addBtn = e.target.closest('[data-add-to-itinerary]');
            if (!addBtn) return;
            e.preventDefault();
            e.stopPropagation();

            const poiId = addBtn.getAttribute('data-add-to-itinerary');
            let poi = allPOIs().find(p => p.googlePlaceId === poiId);
            if (!poi) {
              poi = {
                googlePlaceId: addBtn.getAttribute('data-poi-place-id'),
                name: addBtn.getAttribute('data-poi-name'),
                city: addBtn.getAttribute('data-poi-city'),
                lat: parseFloat(addBtn.getAttribute('data-poi-lat')),
                lng: parseFloat(addBtn.getAttribute('data-poi-lng'))
              };
            }

            if (poi && poi.googlePlaceId) {
              showAddItineraryDialog(poi, ({ day, time, cost }) => {
                const entry = {
                  id: poi.googlePlaceId,
                  name: poi.name || getPoiDisplayName(poi),
                  city: poi.city || poi.searchCity,
                  lat: poi.lat,
                  lng: poi.lng,
                  day: day ? parseInt(day, 10) : null,
                  time: time || '',
                  cost: cost || ''
                };
                addToItinerary(entry);
                window.toast?.(T('toast.stopAddedPersonal', '✓ Aggiunto a itinerario personale'));
                renderListView();
              });
            } else {
              window.toast?.(T('toast.stopAddError', 'Errore: impossibile aggiungere questa tappa'));
            }
          });

          resultsDiv.querySelectorAll('.poi-photo').forEach(img => {
            img.onclick = (e) => {
              e.stopPropagation();
              const overlay = document.createElement('div');
              overlay.id = 'photo-viewer-overlay';
              overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer';
              const container = document.createElement('div');
              container.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding:60px 20px 20px;box-sizing:border-box';
              const closeBtn = document.createElement('button');
              closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:22px;cursor:pointer;z-index:10000;font-weight:700';
              closeBtn.textContent = '✕';
              closeBtn.onclick = () => overlay.remove();
              const photoImg = document.createElement('img');
              photoImg.src = img.dataset.photoUrl;
              photoImg.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:8px;box-shadow:0 0 40px rgba(255,255,255,.3)';
              photoImg.loading = 'eager';
              const titleDiv = document.createElement('p');
              titleDiv.style.cssText = 'color:#fff;margin-top:16px;text-align:center;font-size:14px;font-weight:600;max-width:90vw';
              titleDiv.textContent = img.dataset.poiName;
              container.appendChild(closeBtn);
              container.appendChild(photoImg);
              container.appendChild(titleDiv);
              overlay.appendChild(container);
              overlay.onclick = (ev) => { if (ev.target === overlay) overlay.remove(); };
              const closeOnEscape = (ev) => {
                if (ev.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', closeOnEscape); }
              };
              document.addEventListener('keydown', closeOnEscape);
              document.body.appendChild(overlay);
            };
          });
        });
      }, 200);
    }

    document.querySelectorAll('[data-remove-itinerary]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        removeFromItinerary(btn.dataset.removeItinerary);
        window.toast?.(T('toast.stopRemovedSimple', 'Rimosso da itinerario'));
        renderListView();
      };
    });
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  window.renderListView = renderListView;
  window.searchGooglePlaces = searchGooglePlaces;
  window.addGooglePlaceToItinerary = addGooglePlaceToItinerary;
  window.showGooglePlacesResults = showGooglePlacesResults;
  window.showAddItineraryDialog = showAddItineraryDialog;

})();
