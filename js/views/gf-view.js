// ============================================================================
// gf-view.js — renderGFView + loadGlutenFreeShopsForCity
// Extracted from app-core.js. Deps (all window.*):
//   openSheet, state, CITY_COORDS, debounce,
//   renderGFList, allGlutenFreeShops (shared mutable, set via window)
// ============================================================================
(function () {
  'use strict';

  // ---- GF Shops cache (in-memory + localStorage 7d TTL) ----
  const gfCache = { shops: {} };
  let gfQuotaExhausted = false; // ponytail: flag di sessione, si resetta al reload (la quota è giornaliera lato api-quota)

  // Serve solo al guard quota nel loop città sotto: true se la prossima
  // chiamata per questa città è gratis (cache), senza consumare la entry.
  function _isCityCached(city) {
    if (gfCache.shops[city]) return true;
    try {
      const cached = JSON.parse(localStorage.getItem(`gfShops_v1_${city}`) || 'null');
      return !!(cached && cached.expires > Date.now());
    } catch { return false; }
  }

  async function loadGlutenFreeShopsForCity(city, cityLat, cityLng) {
    if (gfCache.shops[city]) {
      console.log(`%c[GF] Cache HIT (memoria): ${city} = ${gfCache.shops[city].length} shops`, 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
      return gfCache.shops[city];
    }

    // Check localStorage cache (7-day TTL) before hitting the API
    try {
      const lsKey = `gfShops_v1_${city}`;
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.expires > Date.now()) {
          gfCache.shops[city] = cached.shops;
          console.log(`%c[GF] Cache HIT (localStorage 7d): ${city} = ${cached.shops.length} shops`, 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
          return cached.shops;
        }
        localStorage.removeItem(lsKey); // Expired
      }
    } catch { /* localStorage non disponibile */ }

    if (gfQuotaExhausted) return [];

    // Coordinate: esplicite (zone derivate dall'itinerario) o da CITY_COORDS
    // (fallback per il viaggio Giappone di default).
    let lat = cityLat, lng = cityLng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      const coords = window.CITY_COORDS[city];
      if (!coords) {
        console.warn(`[GF] ${city}: nessuna coordinata nota, skip`);
        return [];
      }
      [lat, lng] = coords;
    }
    const apiUrl = `/api/searchGlutenFreeShops?city=${encodeURIComponent(city)}&lat=${lat}&lng=${lng}`;
    console.log(`%c[GF] 🌐 Fetching ${city}...`, 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
    console.log(`[GF] URL: ${apiUrl}`);

    try {
      const fetchStart = Date.now();
      const response = await fetch(apiUrl);
      const fetchTime = Date.now() - fetchStart;

      if (!response.ok) {
        if (response.status === 429) {
          const body = await response.json().catch(() => ({}));
          if (body.quota_exceeded) {
            gfQuotaExhausted = true;
            console.warn(`%c[GF] ⛔ Quota API esaurita — stop fetch per le città restanti`, 'background: #D9534F; color: white; padding: 4px 8px; border-radius: 3px');
            return [];
          }
        }
        console.error(`%c[GF] ❌ HTTP ${response.status} per ${city} (${fetchTime}ms)`, 'background: #D9534F; color: white; padding: 4px 8px; border-radius: 3px');
        return [];
      }

      const data = await response.json();
      const shops = data.shops || [];
      gfCache.shops[city] = shops;

      // Persist to localStorage for 7 days (avoids re-fetching on page reload)
      try {
        localStorage.setItem(`gfShops_v1_${city}`, JSON.stringify({
          shops,
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));
      } catch { /* Storage pieno */ }

      if (shops.length > 0) {
        console.log(`%c[GF] ✅ ${city}: ${shops.length} shops caricati (${fetchTime}ms)`, 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
      } else {
        console.log(`%c[GF] ⚠️ ${city}: ZERO shops ritornati dall'API (${fetchTime}ms)`, 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px');
        console.log('[GF] API Response:', data);
      }
      return shops;
    } catch (err) {
      console.error(`%c[GF] ❌ ${city}: Network/Parse Error`, 'background: #D9534F; color: white; padding: 4px 8px; border-radius: 3px', err.message);
      return [];
    }
  }

  // Zone derivate dalle tappe dell'itinerario: cluster di tappe entro ~25km.
  // È questo che rende la GF Guide "globale": segue il viaggio dell'utente
  // ovunque sia, invece di una lista fissa di città giapponesi.
  function _zonesFromItinerary() {
    const stops = Object.values(window.state?.itineraryByDay || {}).flat()
      .filter(e => typeof e?.lat === 'number' && typeof e?.lng === 'number');
    const zones = [];
    for (const s of stops) {
      const z = zones.find(z => window.haversineKm(z.lat, z.lng, s.lat, s.lng) < 25);
      if (z) { z.count++; z.stops.push({ lat: s.lat, lng: s.lng }); continue; }
      zones.push({ label: (s.poi_name || 'Zona').slice(0, 18), lat: s.lat, lng: s.lng, count: 1, stops: [{ lat: s.lat, lng: s.lng }] });
    }
    return zones;
  }

  function renderGFView() {
    // Zone dal viaggio dell'utente; fallback lista città Giappone se
    // l'itinerario è ancora vuoto (trip di default).
    const zones = _zonesFromItinerary();
    const allCities = zones.length
      ? zones.map(z => z.label)
      : Object.keys(window.CITY_COORDS).sort();
    const zoneByLabel = Object.fromEntries(zones.map(z => [z.label, z]));

    // Determina la città attuale da GPS (se disponibile)
    let currentCity = null;
    if (window.state?.gpsCurrentLat && window.state?.gpsCurrentLng) {
      // Trova la zona/città più vicina (zone da itinerario se presenti)
      const candidates = zones.length
        ? zones.map(z => [z.label, [z.lat, z.lng]])
        : Object.entries(window.CITY_COORDS);
      let minDist = Infinity;
      for (const [city, [lat, lng]] of candidates) {
        const dx = window.state.gpsCurrentLat - lat;
        const dy = window.state.gpsCurrentLng - lng;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
          minDist = dist;
          currentCity = city;
        }
      }
      console.log('[renderGFView] Città attuale da GPS:', currentCity, '- distanza:', minDist.toFixed(2));
    }

    // Build city chips HTML
    const cityChipsHTML = `
      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; overflow-x: auto; padding-bottom: 4px;">
        <button class="gf-city-chip active" data-city="all" style="
          padding: 8px 14px;
          background: rgba(255,165,100,0.2);
          border: 1.5px solid rgba(255,165,100,0.4);
          border-radius: 20px;
          color: var(--l-ink);
          font-size:15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        " onmouseover="this.style.background='rgba(255,165,100,0.3)'" onmouseout="this.style.background='rgba(255,165,100,0.2)'">Tutte</button>
        ${allCities.map(city => `
          <button class="gf-city-chip" data-city="${city}" style="
            padding: 8px 14px;
            background: rgba(20,30,60,0.04);
            border: 1px solid rgba(20,30,60,0.08);
            border-radius: 20px;
            color: var(--l-muted);
            font-size:15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          " onmouseover="this.style.background='rgba(20,30,60,0.08)'" onmouseout="this.style.background='rgba(20,30,60,0.04)'">${city}</button>
        `).join('')}
      </div>
    `;

    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Search bar -->
        <input id="gf-search" placeholder="${window.t ? window.t('gf.searchByName') : 'Cerca per nome...'}" style="
          padding: 10px 14px;
          background: rgba(20,30,60,0.04);
          border: 1px solid rgba(255,165,100,0.3);
          border-radius: 10px;
          color: var(--l-ink);
          font-size:16px;
          font-family: inherit;
          transition: all 0.2s;
        " onfocus="this.style.background='rgba(20,30,60,0.06)'; this.style.borderColor='rgba(255,165,100,0.5)';" onblur="this.style.background='rgba(20,30,60,0.04)'; this.style.borderColor='rgba(255,165,100,0.3)';">

        <!-- City chips -->
        ${cityChipsHTML}

        <!-- List container -->
        <div id="gf-list-sheet" style="position: relative; min-height: 200px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
            ${Array.from({length:5}).map(() => '<div class="skeleton skeleton-card"></div>').join('')}
            <p style="color: var(--l-muted); text-align: center; padding: 6px; margin: 0; font-size:14px;">${window.t ? window.t('gf.loadingRestaurants') : '⏳ Caricamento ristoranti...'}</p>
          </div>
        </div>
      </div>
    `;

    window.openSheet("💚 GF Guide", html);

    // Nessun dato hardcoded da mostrare subito: solo skeleton finché non
    // arrivano risultati live (sotto). renderGFList("all","") qui darebbe
    // solo una lista vuota finché window.allGlutenFreeShops non si popola.

    // Load GF shops: PRIORITÀ GPS → Vicini → Rest (non blocca UI)
    (async () => {
      console.log('[renderGFView] Inizio caricamento GF shops con priorità GPS');
      try {
        window.allGlutenFreeShops = [];

        // Ordina le città: prima quella attuale (GPS), poi il resto
        const priorityCities = currentCity ? [currentCity, ...allCities.filter(c => c !== currentCity)] : allCities;

        for (let i = 0; i < priorityCities.length; i++) {
          const city = priorityCities[i];
          // Quota searchGlutenFreeShops esaurita e questa città non è in
          // cache → tutte le città non-cache rimanenti falliranno uguale
          // (rumore console via ApiQuota, zero costo reale, ma inutile).
          if (window.ApiQuota && !window.ApiQuota.check('searchGlutenFreeShops') && !_isCityCached(city)) {
            console.log(`[renderGFView] Quota searchGlutenFreeShops esaurita, stop su ${priorityCities.length - i} città rimanenti (non in cache)`);
            break;
          }
          try {
            const isCurrentCity = city === currentCity;
            console.log(`[renderGFView] ${i+1}/${priorityCities.length} Caricando${isCurrentCity ? ' (PRIORITÀ GPS)' : ''}: ${city}...`);

            const z = zoneByLabel[city];
            const shops = await loadGlutenFreeShopsForCity(city, z?.lat, z?.lng);
            if (shops.length > 0) {
              console.log(`%c[renderGFView] ✓ ${city}: ${shops.length} GF shops`, 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
              window.allGlutenFreeShops = (window.allGlutenFreeShops || []).concat(shops);
            } else {
              console.log(`%c[renderGFView] ⚠️ ${city}: 0 GF shops (nessuno caricato)`, 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px');

              // Aggiorna la lista SUBITO dopo la città attuale
              if (isCurrentCity) {
                console.log('[renderGFView] Città attuale caricata! Aggiornando lista...');
                window.renderGFList("all", "");
              }
            }
          } catch (err) {
            console.warn(`[renderGFView] Errore caricamento ${city}:`, err.message);
          }
        }

        console.log(`[renderGFView] ✅ Caricati ${(window.allGlutenFreeShops || []).length} shop totali da Google Places`);
        // Aggiorna la lista finale con TUTTI i dati
        window.renderGFList("all", "");
      } catch (err) {
        console.error('[renderGFView] Error loading GF shops:', err);
      }
    })();

    // Event handlers
    const searchInput = document.getElementById("gf-search");
    const cityChips = document.querySelectorAll(".gf-city-chip");

    let selectedCity = "all";

    if (searchInput) {
      searchInput.oninput = window.debounce(() => {
        window.renderGFList(selectedCity, searchInput.value);
      }, 300);
    }

    if (cityChips) {
      cityChips.forEach(chip => {
        chip.addEventListener("click", () => {
          cityChips.forEach(c => {
            c.classList.remove("active");
            c.style.background = "rgba(20,30,60,0.04)";
            c.style.borderColor = "rgba(20,30,60,0.08)";
            c.style.color = "var(--l-muted)";
          });
          chip.classList.add("active");
          chip.style.background = "rgba(255,165,100,0.2)";
          chip.style.borderColor = "rgba(255,165,100,0.4)";
          chip.style.color = "var(--l-ink)";
          selectedCity = chip.dataset.city;
          window.renderGFList(selectedCity, searchInput?.value || "");
        });
      });
    }
  }

  window.renderGFView = renderGFView;
  window.loadGlutenFreeShopsForCity = loadGlutenFreeShopsForCity;
  window.GFView = { zonesFromItinerary: _zonesFromItinerary };
})();
