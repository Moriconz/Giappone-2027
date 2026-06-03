// ============================================================================
// weather-view.js — renderWeatherView extracted from app-core.js
// Deps (all window.*): openSheet, state, allPOIs, SHOPPING_DB, CITY_COORDS,
//   fetchWeatherHourly, fetchWeatherData, getWeatherIcon, getWeatherConditionName
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

  window.renderWeatherView = renderWeatherView;
})();
