/**
 * WEATHER FEATURES — Forecast integration & contextual alerts
 *
 * checkWeatherAlerts: Compares weather forecast with itinerary POI types
 *  - If rain/storm forecasted for a day with outdoor POI → shows warning banner
 *  - Banner is collapsible, dismissal state saved in sessionStorage
 *
 * Punto 4 roadmap planner: il banner esisteva già ma window.state.weather
 * era scritto da NESSUN file — checkWeatherAlerts leggeva sempre [], il
 * banner non compariva mai. syncItineraryWeather() lo popola davvero, via
 * Open-Meteo (già usato altrove, gratis, nessuna quota) sulla località di
 * ogni giorno (base/hotel o prima tappa nota). Forecast reale disponibile
 * solo entro ~16gg: i giorni oltre restano senza dato, nessun alert (corretto
 * di default, non un errore).
 */
let _weatherSyncInFlight = false;
async function syncItineraryWeather() {
  if (_weatherSyncInFlight || !window.state || typeof window.fetchWeatherData !== 'function') return;
  _weatherSyncInFlight = true;
  try {
    const days = window.state.tripProfile?.days || 8;
    const tripStart = window.state.tripProfile?.startDate ? new Date(window.state.tripProfile.startDate) : new Date(2027, 3, 10);
    const itineraryByDay = window.state.itineraryByDay || {};
    window.state.weather = window.state.weather || {};
    window.state.weather.forecast = window.state.weather.forecast || [];

    const cache = new Map(); // una fetch per coordinata (~1 decimale), riusata tra giorni nella stessa città
    for (let d = 0; d < days; d++) {
      const dayDate = new Date(tripStart); dayDate.setDate(dayDate.getDate() + d);
      // Data locale, NON toISOString(): la data locale in fusi UTC+ (Giappone
      // incluso) slitta di un giorno indietro passando per UTC, disallineando
      // il match con daily.time (calendario di timezone=Asia/Tokyo dell'API).
      const iso = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
      const base = window.ITINERARY?.getDayBase?.(d);
      const firstStop = (itineraryByDay[d] || []).find(e => typeof e.lat === 'number' && typeof e.lng === 'number');
      const loc = base || firstStop;
      if (!loc) continue;

      const key = `${loc.lat.toFixed(1)},${loc.lng.toFixed(1)}`;
      try {
        let data = cache.get(key);
        if (!data) { data = await window.fetchWeatherData(loc.lat, loc.lng, ''); cache.set(key, data); }
        const idx = data?.daily?.time?.indexOf(iso);
        if (idx == null || idx < 0) continue;
        window.state.weather.forecast[d] = {
          condition: window.getWeatherConditionName?.(data.daily.weather_code[idx]) || '',
          precip_mm: data.daily.precipitation_sum?.[idx] ?? 0,
        };
      } catch (_) { /* rete assente: giorno resta senza forecast, nessun alert falso */ }
    }
  } finally {
    _weatherSyncInFlight = false;
  }
}
window.syncItineraryWeather = syncItineraryWeather;

const WEATHER_FEATURES = {
  /**
   * Check for weather alerts based on itinerary
   * Returns array of alerts { day, count, message }
   */
  checkWeatherAlerts() {
    const forecast = window.state?.weather?.forecast || [];
    const itineraryByDay = window.state?.itineraryByDay || {};
    const alerts = [];

    const days = window.state?.tripProfile?.days || 8;

    for (let d = 0; d < days; d++) {
      // Check weather for this day
      const dayForecast = forecast[d];
      if (!dayForecast) continue;

      const condition = (dayForecast.condition || '').toLowerCase();
      const hasRain = condition.includes('rain') || condition.includes('storm') || condition.includes('pioggia') || condition.includes('temporale');

      if (!hasRain) continue;

      // Check POI for outdoor activities
      const dayPOIs = itineraryByDay[d] || [];
      const outdoorTypes = ['outdoor', 'parco', 'tempio', 'santuario', 'garden', 'shrine', 'park', 'giardino', 'esterno'];
      const outdoorPOIs = dayPOIs.filter(entry => {
        const type = (entry.poi_type || '').toLowerCase();
        const cuisine = (entry.cuisine || '').toLowerCase();
        const name = (entry.poi_name || '').toLowerCase();
        return outdoorTypes.some(t => type.includes(t) || cuisine.includes(t) || name.includes(t));
      });

      if (outdoorPOIs.length > 0) {
        alerts.push({
          day: d,
          count: outdoorPOIs.length,
          message: `🌧 Giorno ${d + 1}: pioggia prevista — hai ${outdoorPOIs.length} tappe outdoor`
        });
      }
    }

    return alerts;
  },

  /**
   * Render weather alerts as collapsible banners
   * Dismissal state saved in sessionStorage
   */
  renderWeatherAlerts() {
    const alerts = this.checkWeatherAlerts();
    if (alerts.length === 0) return '';

    const dismissedDays = JSON.parse(sessionStorage.getItem('weatherAlertsDismissed') || '[]');

    const alertsHTML = alerts
      .filter(alert => !dismissedDays.includes(alert.day))
      .map(alert => `
        <div class="weather-alert-banner" data-day="${alert.day}" style="
          background: rgba(255,165,0,0.15);
          border: 1px solid rgba(255,165,0,0.4);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size:14px;
          color: rgba(255,200,100,0.95);
        ">
          <span>${alert.message}</span>
          <button class="weather-alert-close" data-day="${alert.day}" style="
            background: transparent;
            border: none;
            color: rgba(255,200,100,0.7);
            cursor: pointer;
            font-size:16px;
            padding: 0;
            margin-left: 8px;
          " onclick="event.stopPropagation()">✕</button>
        </div>
      `)
      .join('');

    return alertsHTML ? `<div style="margin-bottom: 16px;">${alertsHTML}</div>` : '';
  }
};

// Export to window
window.WEATHER_FEATURES = WEATHER_FEATURES;

// Setup event delegation for alert dismissal
document.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('.weather-alert-close');
  if (!closeBtn) return;

  e.stopPropagation();
  const day = parseInt(closeBtn.dataset.day);
  const dismissed = JSON.parse(sessionStorage.getItem('weatherAlertsDismissed') || '[]');
  if (!dismissed.includes(day)) {
    dismissed.push(day);
    sessionStorage.setItem('weatherAlertsDismissed', JSON.stringify(dismissed));
  }

  const banner = document.querySelector(`.weather-alert-banner[data-day="${day}"]`);
  if (banner) {
    banner.style.display = 'none';
  }
}, false);
