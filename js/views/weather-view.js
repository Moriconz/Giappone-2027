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
    // Use itineraryByDay (new) with flat fallback to state.itinerary (legacy)
    const itinerary = Object.values(state.itineraryByDay || {}).flat()
      .map(e => ({ id: e.poi_id, city: null, lat: e.lat, lng: e.lng, name: e.poi_name }))
      .concat(state.itinerary || [])
      .filter((e, i, a) => a.findIndex(x => (x.id || x.poi_id) === (e.id || e.poi_id)) === i);

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

  // ---- GPS weather widget + helpers (extracted from app-core.js 2026-06-03) ----
  /* ═══════════════════════════════════════════════════════════════
     WEATHER VIEW — Previsioni meteo per le tappe
  ═══════════════════════════════════════════════════════════════ */
  const weatherCache = { data: null, timestamp: 0, TTL: 6 * 60 * 60 * 1000 }; // 6 ore

  async function fetchWeatherData(lat, lon, cityName) {
    try {
      console.log(`[Weather] Fetching data for ${cityName} (${lat}, ${lon})`);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m_max,weather_code&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm&timezone=Asia/Tokyo`
      );
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      console.log(`[Weather] Data received for ${cityName}`);
      return data;
    } catch (err) {
      console.error(`[Weather] Fetch failed for ${cityName}:`, err);
      return null;
    }
  }

  function getWeatherIcon(code) {
    // WMO Weather interpretation codes
    if (code === 0 || code === 1) return '☀️'; // Clear
    if (code === 2) return '⛅'; // Partly cloudy
    if (code === 3) return '☁️'; // Overcast
    if (code >= 45 && code <= 48) return '🌫️'; // Foggy
    if (code >= 51 && code <= 67) return '🌧️'; // Drizzle/Rain
    if (code >= 71 && code <= 77) return '❄️'; // Snow
    if (code >= 80 && code <= 82) return '⛈️'; // Rain showers
    if (code >= 85 && code <= 86) return '❄️'; // Snow showers
    if (code >= 80 && code <= 99) return '⛈️'; // Thunderstorm
    return '🌡️'; // Default
  }

  function getWeatherColor(code) {
    if (code === 0 || code === 1) return '#FFD700'; // Sole = Giallo
    if (code === 2) return '#E0D5FF'; // Parzialmente nuvoloso = Lavanda
    if (code === 3) return '#B8ACFF'; // Nuvoloso = Viola
    if (code >= 45 && code <= 48) return '#8080C0'; // Nebbia = Blu scuro
    if (code >= 51 && code <= 82) return '#87CEEB'; // Pioggia = Blu
    if (code >= 85 && code <= 86) return '#E0F0FF'; // Neve = Bianco-blu
    return '#C8BDFF'; // Default
  }

  // ═══════════════════════════════════════════════════════════════
  // GPS Weather Widget + Hourly Forecast
  // ═══════════════════════════════════════════════════════════════

  function getWeatherConditionName(code) {
    // WMO Weather interpretation codes to Italian names
    if (code === 0 || code === 1) return 'Sereno';
    if (code === 2) return 'Parzialmente nuvoloso';
    if (code === 3) return 'Nuvoloso';
    if (code >= 45 && code <= 48) return 'Nebbia';
    if (code >= 51 && code <= 67) return 'Pioggia leggera';
    if (code >= 71 && code <= 77) return 'Neve';
    if (code >= 80 && code <= 82) return 'Pioggia';
    if (code >= 85 && code <= 86) return 'Neve';
    if (code >= 80 && code <= 99) return 'Temporale';
    return 'Sconosciuto';
  }

  function fetchWeatherHourly(lat, lon, city = 'Posizione') {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,weathercode,windspeed_10m,relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm&timezone=Asia/Tokyo`;
    console.log(`[Weather] Fetching: ${city} (${lat}, ${lon})`);

    return fetch(url)
      .then(response => {
        console.log(`[Weather] API response for ${city}:`, response.status, response.ok);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
      })
      .then(data => {
        console.log(`[Weather] ✅ Data received for ${city}`, data ? 'has data' : 'null');
        return data;
      })
      .catch(err => {
        console.error(`[Weather] ❌ Fetch FAILED for ${city}:`, err.message);
        return null;
      });
  }

  // Tokyo Station fallback coordinates
  const TOKYO_STATION_LAT = 35.6762;
  const TOKYO_STATION_LNG = 139.7674;

  async function updateWeatherWithFallback(lat, lng, locationName) {
    console.log('[Weather] Updating weather with fallback:', { lat, lng, locationName });
    const weatherData = await fetchWeatherHourly(lat, lng, locationName);
    if (!weatherData) {
      console.warn('[Weather] Failed to fetch fallback weather');
      showWeatherError('Errore API');
      return;
    }

    // Get current hour weather
    const now = new Date();
    const hourIndex = now.getHours();
    const hourlyData = weatherData.hourly;
    const currentTemp = Math.round(hourlyData.temperature_2m[hourIndex]);
    const currentCode = hourlyData.weathercode[hourIndex];
    const currentCondition = getWeatherConditionName(currentCode);
    const icon = getWeatherIcon(currentCode);

    // Format date and time
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = months[now.getMonth()];
    const dateStr = `${dayName}, ${date} ${monthName}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Update card fields
    const weatherIcon = document.getElementById('weather-icon');
    const weatherDate = document.getElementById('weather-date');
    const weatherTime = document.getElementById('weather-time');
    const weatherTemp = document.getElementById('weather-temp');
    const weatherCondition = document.getElementById('weather-condition');
    const weatherFloating = document.getElementById('weather-floating');

    if (weatherIcon && weatherDate && weatherTemp && weatherCondition && weatherFloating) {
      weatherIcon.textContent = icon;
      weatherDate.textContent = dateStr;
      if (weatherTime) weatherTime.textContent = timeStr;
      weatherTemp.innerHTML = `${currentTemp}<span style="font-size: 32px;">°C</span>`;
      weatherCondition.textContent = currentCondition;
      weatherFloating.classList.add('show');
      console.log('[Weather] Card updated with fallback:', { currentTemp, currentCondition, dateStr, timeStr });
    }
  }

  function updateGpsWeatherWidget() {
    console.log('[Weather] Updating GPS weather widget...');
    if (!navigator.geolocation) {
      console.warn('[Weather] Geolocation not available - using Tokyo Station fallback');
      updateWeatherWithFallback(TOKYO_STATION_LAT, TOKYO_STATION_LNG, '🗼 Tokyo (fallback)');
      return;
    }

    console.log('[Weather] Requesting GPS position...');
    let timeoutId = null;
    const timeout = setTimeout(() => {
      console.warn('[Weather] GPS timeout - using Tokyo Station fallback');
      updateWeatherWithFallback(TOKYO_STATION_LAT, TOKYO_STATION_LNG, '🗼 Tokyo (timeout)');
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timeout);
        const { latitude, longitude } = position.coords;
        console.log('[Weather] GPS position:', { latitude, longitude });

        const weatherData = await fetchWeatherHourly(latitude, longitude, 'La tua posizione');
        if (!weatherData) {
          console.warn('[Weather] Failed to fetch GPS weather');
          showWeatherError('Errore API');
          return;
        }

        // Get current hour weather
        const now = new Date();
        const hourIndex = now.getHours();
        const hourlyData = weatherData.hourly;
        const dailyData = weatherData.daily;
        const currentTemp = Math.round(hourlyData.temperature_2m[hourIndex]);
        const currentCode = hourlyData.weathercode[hourIndex];
        const currentCondition = getWeatherConditionName(currentCode);
        const icon = getWeatherIcon(currentCode);

        // Format date (e.g., "Sun, 15 Apr") and time (e.g., "13:25")
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayName = days[now.getDay()];
        const date = now.getDate();
        const monthName = months[now.getMonth()];
        const dateStr = `${dayName}, ${date} ${monthName}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Update card fields
        const weatherIcon = document.getElementById('weather-icon');
        const weatherDate = document.getElementById('weather-date');
        const weatherTime = document.getElementById('weather-time');
        const weatherTemp = document.getElementById('weather-temp');
        const weatherCondition = document.getElementById('weather-condition');
        const weatherFloating = document.getElementById('weather-floating');

        if (weatherIcon && weatherDate && weatherTemp && weatherCondition && weatherFloating) {
          weatherIcon.textContent = icon;
          weatherDate.textContent = dateStr;
          if (weatherTime) weatherTime.textContent = timeStr;
          weatherTemp.innerHTML = `${currentTemp}<span style="font-size: 32px;">°C</span>`;
          weatherCondition.textContent = currentCondition;
          weatherFloating.classList.add('show');
          console.log('[Weather] Card updated:', { currentTemp, currentCondition, dateStr, timeStr });
        }
      },
      (error) => {
        clearTimeout(timeout);
        console.warn('[Weather] GPS error:', error.code, error.message);
        console.log('[Weather] Using Tokyo Station fallback');
        updateWeatherWithFallback(TOKYO_STATION_LAT, TOKYO_STATION_LNG, '🗼 Tokyo (denied)');
      },
      { timeout: 15000, enableHighAccuracy: false }
    );
  }

  function showWeatherError(errorMsg, consoleMsg = '') {
    const weatherDate = document.getElementById('weather-date');
    const weatherIcon = document.getElementById('weather-icon');
    const weatherTemp = document.getElementById('weather-temp');
    const weatherCondition = document.getElementById('weather-condition');
    const weatherFloating = document.getElementById('weather-floating');

    if (weatherDate && weatherIcon && weatherTemp && weatherCondition && weatherFloating) {
      weatherIcon.textContent = '⚠️';
      weatherDate.textContent = 'Errore';
      weatherTemp.textContent = '—';
      weatherCondition.textContent = errorMsg;
      weatherFloating.classList.add('show');
      console.warn('[Weather] Error displayed:', consoleMsg || errorMsg);
    }
  }

  // Expose updateGpsWeatherWidget globally so it can be called
  window.updateGpsWeatherWidget = updateGpsWeatherWidget;

  // ═══════════════════════════════════════════════════════════════
  // WEATHER MODAL — Full forecast detail
  // ═══════════════════════════════════════════════════════════════

  window._weatherModalData = null;

  window.openWeatherModal = function() {
    console.log('[Weather Modal] Opening...');
    const modal = document.getElementById('weather-modal');
    if (!modal) {
      console.error('[Weather Modal] Modal element not found');
      return;
    }

    // Show modal first
    modal.style.display = 'block';

    // If cached, render immediately
    if (window._weatherModalData) {
      console.log('[Weather Modal] Using cached data');
      window.renderWeatherModal(window._weatherModalData);
      return;
    }

    // Otherwise fetch fresh data
    console.log('[Weather Modal] Fetching fresh data...');
    if (!navigator.geolocation) {
      console.error('[Weather Modal] Geolocation not available');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log('[Weather Modal] Got position:', { latitude, longitude });
          const weatherData = await fetchWeatherHourly(latitude, longitude, 'La tua posizione');
          if (weatherData) {
            window._weatherModalData = weatherData;
            window.renderWeatherModal(weatherData);
            console.log('[Weather Modal] Data fetched and rendered');
          } else {
            console.error('[Weather Modal] No data returned');
          }
        } catch (err) {
          console.error('[Weather Modal] Fetch error:', err);
        }
      },
      (error) => {
        console.error('[Weather Modal] Geolocation error:', error.message);
      }
    );
  };

  window.renderWeatherModal = function(weatherData) {
    const container = document.getElementById('weather-cards-container');
    if (!container || !weatherData.daily) return;

    const dailyData = weatherData.daily;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    container.innerHTML = '';

    // Render 4 days
    for (let i = 0; i < Math.min(4, dailyData.time.length); i++) {
      const dateStr = dailyData.time[i];
      const date = new Date(dateStr);
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const time = '13:25'; // Fixed time for now

      const tempMax = Math.round(dailyData.temperature_2m_max[i]);
      const code = dailyData.weather_code[i];
      const condition = getWeatherConditionName(code);
      const icon = getWeatherIcon(code);

      const card = document.createElement('div');
      card.className = 'weather-forecast-card';
      card.innerHTML = `
        <div>
          <div class="weather-card-date">${dayName}, ${day} ${month}</div>
          <div class="weather-card-condition">${time}</div>
        </div>
        <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div class="weather-card-icon">${icon}</div>
          <div style="font-size: 14px; color: rgba(255,255,255,0.8); text-align: center;">${condition}</div>
        </div>
        <div>
          <div class="weather-card-temp">${tempMax}<span class="weather-card-temp-unit">°C</span></div>
          <button class="weather-card-more">more</button>
          <div class="weather-card-footer">
            <div class="weather-card-dot ${i === 0 ? 'active' : ''}"></div>
            <div class="weather-card-dot ${i === 1 ? 'active' : ''}"></div>
            <div class="weather-card-dot ${i === 2 ? 'active' : ''}"></div>
            <div class="weather-card-dot ${i === 3 ? 'active' : ''}"></div>
          </div>
        </div>
      `;
      container.appendChild(card);
    }

    console.log('[Weather Modal] Rendered 4 cards');
  }

  window.closeWeatherModal = function() {
    const modal = document.getElementById('weather-modal');
    if (modal) {
      modal.style.display = 'none';
      // Show weather widget again
      const weatherWidget = document.getElementById('weather-floating');
      if (weatherWidget) weatherWidget.classList.add('show');
      console.log('[Weather Modal] Closed');
    }
  };

  // Modal overlay click to close
  window.addEventListener('load', () => {
    const modal = document.getElementById('weather-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeWeatherModal();
      });
    }
  });

  // Initialize GPS weather widget and update every 10 minutes
  window.initGpsWeatherWidget = function() {
    console.log('[Weather] initGpsWeatherWidget called');
    updateGpsWeatherWidget();
    setInterval(updateGpsWeatherWidget, 10 * 60 * 1000); // Every 10 minutes

    // Add click handler to open detailed weather modal via event delegation
    document.addEventListener('click', (e) => {
      if (e.target.closest('#weather-floating') || e.target.closest('#weather-text')) {
        console.log('[Weather] Weather widget clicked');
        window.openWeatherModal?.();
      }
    });
  };
  // ---- Weather modal (previously in app-core.js) ----
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
      window.fetchWeatherHourly(35.6762, 139.7674, '🗼 Tokyo')
        .then(data => {
          if (data) {
            buildAndShowWeatherModal(data, '🗼 Tokyo', false);
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
          console.log('[Weather] ⚠️ Fast GPS fetch failed, using Tokyo fallback');
          const data = await window.fetchWeatherHourly(35.6762, 139.7674, '🗼 Tokyo');
          if (data) {
            currentModalLocation = 'fallback';
            buildAndShowWeatherModal(data, '🗼 Tokyo', false);
          }
        }
      },
      (error) => {
        // Fast attempt failed/denied → show Tokyo immediately so the user
        // isn't stuck on "Acquisendo posizione...". Then keep trying high-accuracy
        // GPS in the background to upgrade if it succeeds.
        console.warn('[Weather] Fast GPS attempt failed:', error.code, error.message);
        if (currentModalLocation === null) {
          currentModalLocation = 'fallback';
          window.fetchWeatherHourly(35.6762, 139.7674, '🗼 Tokyo').then(data => {
            if (data && currentModalLocation === 'fallback') buildAndShowWeatherModal(data, '🗼 Tokyo', false);
          });
        }
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
          // Upgrade whether we were showing fast GPS OR the Tokyo fallback
          if (weatherData && (currentModalLocation === 'gps-fast' || currentModalLocation === 'fallback')) {
            console.log('[Weather] ✅ Updating modal with HIGH ACCURACY data');
            currentModalLocation = 'gps-fast';
            buildAndShowWeatherModal(weatherData, 'La tua posizione', true);
          }
        },
        (error) => {
          console.warn('[Weather] ❌ HIGH ACCURACY GPS failed:', error.code, error.message);
          // If no fast GPS was acquired, fall back to Tokyo
          if (currentModalLocation === null) {
            console.log('[Weather] No fast GPS, using Tokyo fallback fallback');
            window.fetchWeatherHourly(35.6762, 139.7674, '🗼 Tokyo')
              .then(data => {
                if (data) {
                  currentModalLocation = 'fallback';
                  buildAndShowWeatherModal(data, '🗼 Tokyo', false);
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
  window.fetchWeatherData = fetchWeatherData;
  window.fetchWeatherHourly = fetchWeatherHourly;
  window.getWeatherIcon = getWeatherIcon;
  window.getWeatherConditionName = getWeatherConditionName;
  window.getWeatherColor = getWeatherColor;
})();
