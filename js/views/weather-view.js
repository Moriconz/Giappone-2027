// ============================================================================
// weather-view.js — renderWeatherView + buildAndShowWeatherModal + openWeatherModal
// Extracted from app-core.js. Deps (all window.*):
//   openSheet, state, allPOIs, SHOPPING_DB, CITY_COORDS,
//   fetchWeatherHourly, fetchWeatherData,
//   getWeatherIcon, getWeatherConditionName, getWeatherColor
// ============================================================================
(function () {
  'use strict';

  function renderWeatherView() {
    const state = window.state || {};
    const itinerary = state.itinerary || [];

    window.openSheet('🌤️ Meteo', `
      <div class="weather-container" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">⏳</div>
        <p style="color:var(--y2k-ink);font-size:14px;margin:0;">Caricamento previsioni meteo...</p>
      </div>
    `);

    (async () => {
      console.log('[Weather] Starting weather tab render');
      let weatherHtml = '';

      // ═ GPS Current Weather Section ═
      let gpsSection = '';
      if (navigator.geolocation) {
        try {
          const gpsPos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });

          const { latitude, longitude } = gpsPos.coords;
          const weatherData = await window.fetchWeatherHourly(latitude, longitude, 'Posizione attuale');

          if (weatherData) {
            const hourlyData = weatherData.hourly;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            let gpsHtml = `
              <div class="weather-section-divider">
                <h2 style="color:var(--y2k-pink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;margin:20px 0 16px 0;font-size:18px;">📍 La Tua Posizione</h2>
              </div>
              <div class="weather-hourly-grid">
            `;

            for (let i = 0; i < 48; i++) {
              const hourTime = new Date(todayStart.getTime() + i * 60 * 60 * 1000);
              const temp = Math.round(hourlyData.temperature_2m[i]);
              const code = hourlyData.weathercode[i];
              const icon = window.getWeatherIcon(code);
              const condition = window.getWeatherConditionName(code);
              const precip = hourlyData.precipitation[i];
              const humidity = hourlyData.relativehumidity_2m[i];
              const wind = Math.round(hourlyData.windspeed_10m[i]);
              const timeStr = hourTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
              const dayStr = i === 0 ? 'Oggi' : i === 24 ? 'Domani' : hourTime.toLocaleDateString('it-IT', { weekday: 'short' });

              gpsHtml += `
                <div class="weather-hourly-card" data-weather="${code}">
                  <div class="hourly-time">${dayStr} ${timeStr}</div>
                  <div class="hourly-icon">${icon}</div>
                  <div class="hourly-temp">${temp}°C</div>
                  <div class="hourly-condition" style="font-size:12px;">${condition}</div>
                  <div class="hourly-details" style="font-size:12px;margin-top:4px;padding-top:4px;border-top:1px solid rgba(0,0,0,0.1);">
                    💧 ${precip}mm | 💨 ${wind}km | 💦 ${humidity}%
                  </div>
                </div>
              `;
            }

            gpsHtml += '</div>';
            gpsSection = gpsHtml;
          } else {
            gpsSection = `
              <div class="weather-section-divider">
                <h2 style="color:var(--y2k-pink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;margin:20px 0 16px 0;font-size:18px;">📍 La Tua Posizione</h2>
              </div>
              <div style="text-align:center;padding:20px;background:rgba(255,107,107,0.1);border-radius:10px;">
                <div style="color:#FF6B6B;font-size:13px;">⚠️ Impossibile caricare meteo per la tua posizione</div>
              </div>
            `;
          }
        } catch (err) {
          console.warn('[Weather] GPS error:', err);
          gpsSection = `
            <div class="weather-section-divider">
              <h2 style="color:var(--y2k-pink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;margin:20px 0 16px 0;font-size:18px;">📍 La Tua Posizione</h2>
            </div>
            <div style="text-align:center;padding:20px;background:rgba(255,107,107,0.1);border-radius:10px;">
              <div style="color:#FF6B6B;font-size:13px;">📍 GPS non disponibile - consenti accesso alla posizione</div>
            </div>
          `;
        }
      }

      weatherHtml += gpsSection;

      // ═ Itinerary Cities Section ═
      if (itinerary.length > 0) {
        const CITY_COORDS = window.CITY_COORDS || {};
        const SHOPPING_DB = window.SHOPPING_DB || [];
        const cities = {};
        itinerary.forEach(entry => {
          let city = entry.city || null;
          let lat = null;
          let lng = null;

          const poi = (typeof window.allPOIs === 'function' ? window.allPOIs() : []).find(p => p.id === entry.id);
          if (poi) { city = poi.city || city; lat = poi.lat; lng = poi.lng; }

          const shop = SHOPPING_DB.find(s => s.id === entry.id);
          if (shop) { city = shop.city || city; lat = shop.coords[0]; lng = shop.coords[1]; }

          if (city && !cities[city]) {
            if (lat && lng) {
              cities[city] = { lat, lng };
            } else {
              const coords = CITY_COORDS[city];
              if (coords) cities[city] = { lat: coords[0], lng: coords[1] };
            }
          }
        });

        if (Object.keys(cities).length > 0) {
          weatherHtml += `
            <div class="weather-section-divider">
              <h2 style="color:var(--y2k-pink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;margin:20px 0 16px 0;font-size:18px;">🗓️ Le Tue Tappe</h2>
            </div>
          `;

          for (const [city, coords] of Object.entries(cities)) {
            const weatherData = await window.fetchWeatherData(coords.lat, coords.lng, city);
            if (!weatherData) {
              weatherHtml += `
                <div class="weather-city">
                  <h3>${city}</h3>
                  <div style="background:rgba(255,107,107,0.1);border:2px solid #FF6B6B;border-radius:10px;padding:16px;text-align:center;">
                    <div style="color:#FF6B6B;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-weight:700;font-size:14px;margin-bottom:4px;">⚠️ Errore</div>
                    <p style="color:#FF6B6B;font-size:12px;margin:0;opacity:0.8;">Non riusciamo a caricare i dati meteo.</p>
                  </div>
                </div>
              `;
              continue;
            }

            const { daily } = weatherData;
            weatherHtml += `<div class="weather-city"><h3>${city}</h3><div class="weather-days">`;

            daily.time.slice(0, 7).forEach((date, idx) => {
              const code = daily.weather_code[idx];
              const tempMax = daily.temperature_2m_max[idx];
              const tempMin = daily.temperature_2m_min[idx];
              const precip = daily.precipitation_sum[idx];
              const wind = daily.windspeed_10m_max[idx];
              const humidity = daily.relative_humidity_2m_max[idx];
              const icon = window.getWeatherIcon(code);
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'short', month: 'short', day: 'numeric' });

              weatherHtml += `
                <div class="weather-day" data-weather="${code}">
                  <div class="weather-date">${dayName}</div>
                  <div class="weather-icon">${icon}</div>
                  <div class="weather-temps">
                    <div class="weather-temp-max">${tempMax}°</div>
                    <div class="weather-temp-min">${tempMin}°</div>
                  </div>
                  <div class="weather-details">
                    <div class="weather-detail-item"><span class="weather-detail-label">💧</span><span class="weather-detail-value">${precip.toFixed(1)}mm</span></div>
                    <div class="weather-detail-item"><span class="weather-detail-label">💨</span><span class="weather-detail-value">${wind.toFixed(0)}km</span></div>
                    <div class="weather-detail-item"><span class="weather-detail-label">💦</span><span class="weather-detail-value">${humidity}%</span></div>
                  </div>
                </div>
              `;
            });

            weatherHtml += '</div></div>';
          }
        }
      }

      if (itinerary.length === 0 && gpsSection) {
        weatherHtml += `
          <div style="text-align:center;padding:20px;margin-top:20px;">
            <p style="color:var(--y2k-muted);font-size:13px;margin:0;line-height:1.5;">💡 Aggiungi tappe per vedere il meteo per le tue destinazioni!</p>
          </div>
        `;
      }

      window.openSheet('🌤️ Meteo', `<div class="weather-container">${weatherHtml}</div>`);
    })();
  }

  function buildAndShowWeatherModal(weatherData, locationName, isGPS = false) {
    console.log('[Weather] Building and showing modal for', locationName, 'GPS:', isGPS);
    const hourlyData = weatherData.hourly;
    const dailyData = weatherData.daily;
    const now = new Date();
    const currentHour = now.getHours();

    const currentTemp = Math.round(hourlyData.temperature_2m[currentHour]);
    const currentCode = hourlyData.weathercode[currentHour];
    const currentCondition = window.getWeatherConditionName(currentCode);
    const icon = window.getWeatherIcon(currentCode);
    const humidity = hourlyData.relativehumidity_2m[currentHour];
    const wind = Math.round(hourlyData.windspeed_10m[currentHour]);
    const precip = hourlyData.precipitation[currentHour];

    // Badge for GPS status
    const badge = isGPS
      ? '<span style="background:#00FF88;color:#1A2560;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;margin-left:8px;">📍 GPS</span>'
      : '<span style="background:#FFD700;color:#1A2560;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;margin-left:8px;">⚠️ FALLBACK</span>';

    // Build daily forecast cards
    let dailyHtml = '';
    for (let i = 0; i < 8; i++) {
      const dateStr = dailyData.time[i];
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
      const code = dailyData.weather_code[i];
      const tempMax = Math.round(dailyData.temperature_2m_max[i]);
      const tempMin = Math.round(dailyData.temperature_2m_min[i]);
      const dayIcon = window.getWeatherIcon(code);
      const bgColor = window.getWeatherColor(code);

      dailyHtml += `
        <div class="weather-day" data-weather="${code}" style="background:rgba(74,91,168,0.12);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);">
          <div class="weather-date">${dayName}</div>
          <div class="weather-icon">${dayIcon}</div>
          <div class="weather-temps">
            <div class="weather-temp-max">${tempMax}°</div>
            <div class="weather-temp-min">${tempMin}°</div>
          </div>
        </div>
      `;
    }

    const dateStr = now.toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' });

    const modalHtml = `
      <div style="padding:0;">
        <!-- Header -->
        <div style="background:rgba(74,91,168,0.12);backdrop-filter:blur(20px) saturate(180%);border-bottom:1.5px solid rgba(255,255,255,0.25);padding:14px 16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="display:flex;align-items:center;">
                <h2 style="color:var(--y2k-pink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;margin:0;font-size:18px;font-weight:700;">${locationName}</h2>
                ${badge}
              </div>
              <p style="color:var(--y2k-muted);margin:0;font-size:12px;font-family:'Courier New',monospace;">${dateStr}</p>
            </div>
            <div style="text-align:right;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="font-size:48px;line-height:1;">${icon}</div>
                <div>
                  <div style="font-size:36px;font-weight:700;font-family:'Courier New',monospace;margin:0;line-height:1;color:var(--y2k-ink);">${currentTemp}°</div>
                  <p style="color:var(--y2k-muted);margin:2px 0 0 0;font-size:11px;text-transform:capitalize;font-family:'Courier New';">${currentCondition}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;padding:0 16px;">
          <div style="background:rgba(74,91,168,0.12);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);border-radius:12px;padding:12px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">
            <div style="font-size:20px;line-height:1;">💧</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Precip.</div>
            <div style="font-size:22px;font-weight:800;color:#fff;font-family:'Courier New',monospace;line-height:1.1;">${precip}<span style="font-size:13px;font-weight:600;margin-left:2px;">mm</span></div>
          </div>
          <div style="background:rgba(74,91,168,0.12);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);border-radius:12px;padding:12px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">
            <div style="font-size:20px;line-height:1;">💦</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Umidità</div>
            <div style="font-size:22px;font-weight:800;color:#fff;font-family:'Courier New',monospace;line-height:1.1;">${humidity}<span style="font-size:13px;font-weight:600;margin-left:2px;">%</span></div>
          </div>
          <div style="background:rgba(74,91,168,0.12);backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255,255,255,0.25);border-radius:12px;padding:12px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">
            <div style="font-size:20px;line-height:1;">💨</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Vento</div>
            <div style="font-size:22px;font-weight:800;color:#fff;font-family:'Courier New',monospace;line-height:1.1;">${wind}<span style="font-size:13px;font-weight:600;margin-left:2px;">km/h</span></div>
          </div>
        </div>

        <!-- Daily Forecast -->
        <div style="padding:0 16px;">
          <h3 style="color:var(--y2k-pink);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;margin:16px 0 12px 0;font-size:16px;font-weight:700;">🗓️ Prossimi 8 giorni</h3>
          <div class="weather-days" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;">
            ${dailyHtml}
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px;text-align:center;border-top:2px solid var(--y2k-pink);margin-top:20px;">
          <p style="color:var(--y2k-muted);font-size:11px;margin:0;font-family:'Courier New',monospace;">📡 Dati da OpenMeteo | Aggiornamento ogni 10 min</p>
        </div>
      </div>
    `;
    window.openSheet('🌤️ Meteo', modalHtml);
  }

  window.openWeatherModal = function() {
    console.log('[Weather] Opening detailed weather modal');

    // Hide weather widget
    const weatherWidget = document.getElementById('weather-floating');
    if (weatherWidget) weatherWidget.classList.remove('show');

    // Open loading state immediately
    window.openSheet('🌤️ Meteo', `
      <div style="padding:20px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">⏳</div>
        <p style="color:var(--y2k-ink);font-size:14px;margin:0;">📍 Acquisendo posizione...</p>
      </div>
    `);

    if (!navigator.geolocation) {
      console.warn('[Weather] Geolocation not supported - using fallback');
      window.fetchWeatherHourly(41.4667, 12.5833, 'Aprilia')
        .then(data => {
          if (data) {
            buildAndShowWeatherModal(data, 'Aprilia', false);
          }
        });
      return;
    }

    let fastGeoCompleted = false;
    let currentModalLocation = null; // Track current location shown

    // ═══════════════════════════════════════════════════════════════
    // FIRST: Fast attempt (WiFi/cell based) - responds quickly
    // ═══════════════════════════════════════════════════════════════
    console.log('[Weather] 🚀 Attempting FAST position (WiFi/cell)...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (fastGeoCompleted) return;
        fastGeoCompleted = true;

        const { latitude, longitude } = position.coords;
        console.log('[Weather] ✅ FAST position acquired:', { latitude, longitude });

        const weatherData = await window.fetchWeatherHourly(latitude, longitude, 'La tua posizione');
        if (weatherData) {
          console.log('[Weather] ✅ Showing FAST GPS data immediately');
          currentModalLocation = 'gps-fast';
          buildAndShowWeatherModal(weatherData, 'La tua posizione', true);

          // Now search for high-accuracy GPS in background
          searchHighAccuracyGPSInBackground();
        } else {
          console.log('[Weather] ⚠️ Fast GPS fetch failed, using Aprilia');
          const data = await window.fetchWeatherHourly(41.4667, 12.5833, 'Aprilia');
          if (data) {
            currentModalLocation = 'fallback';
            buildAndShowWeatherModal(data, 'Aprilia', false);
          }
        }
      },
      (error) => {
        // Fast attempt failed, try high-accuracy GPS
        console.warn('[Weather] Fast GPS attempt failed:', error.code, error.message);
        searchHighAccuracyGPSInBackground();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
    );

    // ═══════════════════════════════════════════════════════════════
    // BACKGROUND: Search for high-accuracy GPS and update if better
    // ═══════════════════════════════════════════════════════════════
    function searchHighAccuracyGPSInBackground() {
      console.log('[Weather] 🔍 Searching for HIGH ACCURACY GPS in background...');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('[Weather] ✅ HIGH ACCURACY GPS acquired:', { latitude, longitude });

          const weatherData = await window.fetchWeatherHourly(latitude, longitude, 'La tua posizione');
          if (weatherData && currentModalLocation === 'gps-fast') {
            console.log('[Weather] ✅ Updating modal with HIGH ACCURACY data');
            buildAndShowWeatherModal(weatherData, 'La tua posizione', true);
          }
        },
        (error) => {
          console.warn('[Weather] ❌ HIGH ACCURACY GPS failed:', error.code, error.message);
          // If no fast GPS was acquired, fall back to Aprilia
          if (currentModalLocation === null) {
            console.log('[Weather] No fast GPS, using Aprilia fallback');
            window.fetchWeatherHourly(41.4667, 12.5833, 'Aprilia')
              .then(data => {
                if (data) {
                  currentModalLocation = 'fallback';
                  buildAndShowWeatherModal(data, 'Aprilia', false);
                }
              });
          }
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );
    }
  };

  window.renderWeatherView = renderWeatherView;
  window.buildAndShowWeatherModal = buildAndShowWeatherModal;
})();
