/**
 * japan-calendar-hints.js — Hint calendario giapponese per la pianificazione
 *
 * Mostra warning proattivi sopra la vista itinerario quando le date del viaggio
 * intersecano periodi sensibili del calendario giapponese:
 *
 *   ⛔ Golden Week (29 apr – 5 mag, ogni anno): festività multiple, prezzi alle
 *     stelle, hotel pieni, treni affollati. Sconsigliato pianificare turismo
 *     iconico (Kyoto, Tokyo Disney) in questa finestra.
 *
 *   ⛔ Obon (13–16 agosto): festa dei defunti, intere famiglie tornano nei
 *     paesi d'origine. Hotel pieni, shinkansen sold-out, festival locali.
 *
 *   ⛔ Shogatsu (29 dic – 3 gen): Capodanno. Tutto chiuso o tariffe altissime,
 *     ristoranti famosi chiusi 1–3 gennaio.
 *
 *   🌸 Sakura peak (date stimate 2027 per città principali): finestra preziosa
 *     ma affollata. Hint informativo, non warning.
 *
 *   🍁 Koyo / foliage peak: idem stagione autunnale.
 *
 * Esposto:
 *   - window.JapanCalendarHints.getHintsForRange(start, end) → array di hint
 *   - window.JapanCalendarHints.renderHintsHTML(start, days) → HTML widget
 *   - window.JapanCalendarHints.openDetailPanel(hint) → panel descrittivo
 *
 * Le date Golden Week / Obon / Shogatsu sono FISSE per Mese-Giorno: si applicano
 * a ogni anno (non solo 2027). Sakura/foliage sono stime calibrate sui pattern
 * 2020–2024; mostrate con disclaimer "approssimazione".
 *
 * Dipendenze esterne (tutte su window):
 *   - window.state.tripProfile  (startDate o year + days)
 *   - window.openSheet, window.t
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  // ─── Definizione dei periodi (mese-giorno) ────────────────────────────
  // start/end sono [month1-12, day1-31] inclusive
  // anno computato dinamicamente in base alla data del viaggio

  function _dateInYear(year, mm, dd) {
    return new Date(year, mm - 1, dd);
  }

  function _overlaps(rangeStart, rangeEnd, tripStart, tripEnd) {
    return rangeStart <= tripEnd && rangeEnd >= tripStart;
  }

  // Periodi annuali ricorrenti (data fissa)
  // Severity: 'danger' = sconsigliato pianificare, 'warning' = attenzione, 'info' = solo hint
  const RECURRING_PERIODS = [
    {
      id: 'golden-week',
      severity: 'danger',
      icon: '⛔',
      labelKey: 'jpcal.gw.label',
      labelFallback: 'Golden Week',
      monthStart: 4, dayStart: 29,
      monthEnd: 5, dayEnd: 5,
      messageKey: 'jpcal.gw.msg',
      messageFallback: 'Settimana di festività multiple (Showa Day, Constitution Day, Greenery Day, Children\'s Day). Hotel pieni, prezzi 2-3× la media, Shinkansen sold-out, attrazioni famose con file enormi. Sconsigliato pianificare turismo iconico (Kyoto, Disney, Universal). Se non si può evitare, prenotare con 6 mesi di anticipo.'
    },
    {
      id: 'obon',
      severity: 'warning',
      icon: '⚠️',
      labelKey: 'jpcal.obon.label',
      labelFallback: 'Obon',
      monthStart: 8, dayStart: 13,
      monthEnd: 8, dayEnd: 16,
      messageKey: 'jpcal.obon.msg',
      messageFallback: 'Festa dei defunti: famiglie intere tornano nei paesi d\'origine. Shinkansen pieni, hotel cari, ristoranti spesso chiusi nelle aree turistiche. In compenso le città sono più tranquille — può essere un\'opportunità se si evitano le tratte intercity.'
    },
    {
      id: 'shogatsu',
      severity: 'danger',
      icon: '⛔',
      labelKey: 'jpcal.shogatsu.label',
      labelFallback: 'Capodanno (Shogatsu)',
      monthStart: 12, dayStart: 29,
      monthEnd: 1, dayEnd: 3, // attraversa l'anno → gestito specialmente sotto
      messageKey: 'jpcal.shogatsu.msg',
      messageFallback: 'Capodanno giapponese: la festività più importante. Quasi tutto chiuso il 1° gennaio (ristoranti famosi 1-3 gen), treni superaffollati 30-31 dic e 2-3 gen. Templi famosi (Meiji-jingu, Asakusa) con folle enormi per hatsumode. Tariffe hotel premium ovunque.'
    }
  ];

  // Periodi stagionali stimati (anno-specifici, calibrati per 2027 da pattern 2020-2024)
  // Format: { id, severity:'info', icon, label, year, monthStart, dayStart, monthEnd, dayEnd, message }
  const SEASONAL_2027 = [
    {
      id: 'sakura-tokyo-2027', year: 2027,
      severity: 'info', icon: '🌸',
      labelKey: 'jpcal.sakura.tokyo', labelFallback: 'Sakura Tokyo (stima)',
      monthStart: 3, dayStart: 27, monthEnd: 4, dayEnd: 5,
      messageKey: 'jpcal.sakura.tokyoMsg',
      messageFallback: 'Finestra stimata di hanami (fioritura ciliegi) a Tokyo, calibrata su 2020-2024. Ueno Park, Shinjuku Gyoen, Meguro River sono i top spot. Affollati ma magici. Le date reali si conoscono solo a febbraio dell\'anno stesso (forecast JMA).'
    },
    {
      id: 'sakura-kyoto-2027', year: 2027,
      severity: 'info', icon: '🌸',
      labelKey: 'jpcal.sakura.kyoto', labelFallback: 'Sakura Kyoto (stima)',
      monthStart: 3, dayStart: 30, monthEnd: 4, dayEnd: 8,
      messageKey: 'jpcal.sakura.kyotoMsg',
      messageFallback: 'Finestra stimata di hanami a Kyoto. Philosopher\'s Path, Maruyama Park, Daigo-ji. Picco settimana di apertura dei fiori — prenotare ryokan/hotel con largo anticipo.'
    },
    {
      id: 'koyo-kyoto-2027', year: 2027,
      severity: 'info', icon: '🍁',
      labelKey: 'jpcal.koyo.kyoto', labelFallback: 'Koyo Kyoto (stima)',
      monthStart: 11, dayStart: 10, monthEnd: 11, dayEnd: 30,
      messageKey: 'jpcal.koyo.kyotoMsg',
      messageFallback: 'Finestra stimata foliage autunnale a Kyoto. Eikando, Tofuku-ji, Kiyomizu (con illuminazione serale). Periodo magico ma molto affollato — equivale a un mini-Golden Week per i fotografi.'
    },
    {
      id: 'koyo-nikko-2027', year: 2027,
      severity: 'info', icon: '🍁',
      labelKey: 'jpcal.koyo.nikko', labelFallback: 'Koyo Nikko (stima)',
      monthStart: 10, dayStart: 25, monthEnd: 11, dayEnd: 5,
      messageKey: 'jpcal.koyo.nikkoMsg',
      messageFallback: 'Foliage a Nikko (Irohazaka, Chuzenji-ko). Picco una settimana prima di Kyoto perché in quota. Domenica = traffico folle, programmare in mezzo settimana.'
    }
  ];

  function getTripDateRange() {
    const tp = window.state?.tripProfile || {};
    let start;
    if (tp.startDate) {
      const d = new Date(tp.startDate);
      if (!isNaN(d.getTime())) start = d;
    }
    if (!start && tp.year) start = new Date(tp.year, 3, 10); // 10 aprile dell'anno
    if (!start) start = new Date(2027, 3, 10); // default 2027-04-10

    const days = Math.max(1, Number(tp.days) || 8);
    const end = new Date(start.getTime() + (days - 1) * 24 * 3600 * 1000);
    return { start, end, days };
  }

  // Espande un periodo ricorrente in range concreti per gli anni che intersecano il trip.
  // Dedupe via Set di chiavi (ISO start-end) per evitare doppioni nei cross-year (es. Shogatsu).
  function _expandRecurring(period, tripStart, tripEnd) {
    const startYear = tripStart.getFullYear();
    const endYear = tripEnd.getFullYear();
    const seen = new Set();
    const out = [];
    const pushUnique = (start, end) => {
      const key = `${start.getTime()}-${end.getTime()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ start, end });
    };
    for (let y = startYear; y <= endYear; y++) {
      if (period.monthStart <= period.monthEnd) {
        // Stesso anno
        pushUnique(
          _dateInYear(y, period.monthStart, period.dayStart),
          _dateInYear(y, period.monthEnd, period.dayEnd)
        );
      } else {
        // Cross-year: aggiungiamo entrambe le orientazioni possibili,
        // il dedupe rimuove i doppioni quando endYear=startYear+1
        pushUnique(
          _dateInYear(y, period.monthStart, period.dayStart),
          _dateInYear(y + 1, period.monthEnd, period.dayEnd)
        );
        pushUnique(
          _dateInYear(y - 1, period.monthStart, period.dayStart),
          _dateInYear(y, period.monthEnd, period.dayEnd)
        );
      }
    }
    return out;
  }

  // ─── Festività globali live (punto 6 roadmap planner) ─────────────────
  // RECURRING_PERIODS/SEASONAL_2027 sopra sono Giappone-only, scritte a
  // mano. Per il pivot a planner globale (memoria progetto: GF è layer
  // opzionale, il planner è per qualunque destinazione), le festività
  // ufficiali del paese del viaggio arrivano da Nager.Date — API pubblica,
  // gratis, CORS-ok, nessuna chiave. Default 'JP' finché non esiste un
  // selettore paese in UI (mantiene invariato il comportamento attuale,
  // aggiunge festività reali oltre a GW/Obon/Shogatsu già coperte a mano).
  const _holidayCache = new Map(); // "CC-YYYY" -> array grezzo API
  async function _fetchHolidays(countryCode, year) {
    const key = `${countryCode}-${year}`;
    if (_holidayCache.has(key)) return _holidayCache.get(key);
    const lsKey = `holidays_v1_${key}`;
    try {
      const cached = JSON.parse(localStorage.getItem(lsKey) || 'null');
      if (cached && cached.expires > Date.now()) { _holidayCache.set(key, cached.data); return cached.data; }
    } catch (_) {}
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
      const data = res.ok ? await res.json() : [];
      _holidayCache.set(key, data);
      try { localStorage.setItem(lsKey, JSON.stringify({ data, expires: Date.now() + 30 * 24 * 3600 * 1000 })); } catch (_) {}
      return data;
    } catch (_) { return []; }
  }

  // Niente guard "una volta sola" qui: _fetchHolidays sopra è già
  // idempotente (cache in-memory + localStorage 30gg), un secondo giro
  // costa un lookup in cache, non un fetch. Un guard duplicato qui aveva
  // solo effetto di bloccare permanentemente ogni retry senza modo di
  // resettarlo dall'esterno — trovato proprio scrivendo il test.
  async function syncGlobalHolidays() {
    const { start, end } = getTripDateRange();
    const cc = window.state?.tripProfile?.countryCode || 'JP';
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      await _fetchHolidays(cc, y);
    }
  }

  function _liveHolidayHints(start, end) {
    const cc = window.state?.tripProfile?.countryCode || 'JP';
    const out = [];
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      const list = _holidayCache.get(`${cc}-${y}`) || [];
      list.forEach(h => {
        const d = new Date(h.date + 'T00:00:00');
        if (d >= start && d <= end) {
          out.push({
            id: `holiday-${cc}-${h.date}`, severity: 'info', icon: '🎌',
            labelKey: null, labelFallback: h.localName || h.name,
            messageKey: null, messageFallback: `Festività nazionale (${cc}). Possibili chiusure di uffici/negozi, trasporti più affollati del solito.`,
            actualStart: d, actualEnd: d
          });
        }
      });
    }
    return out;
  }

  // Restituisce gli hint applicabili a un range di date del viaggio
  function getHintsForRange(start, end) {
    if (!start || !end) return [];
    const hints = [..._liveHolidayHints(start, end)];

    // Periodi ricorrenti
    RECURRING_PERIODS.forEach(p => {
      const ranges = _expandRecurring(p, start, end);
      ranges.forEach(r => {
        if (_overlaps(r.start, r.end, start, end)) {
          hints.push({
            ...p,
            actualStart: r.start,
            actualEnd: r.end
          });
        }
      });
    });

    // Periodi stagionali (anno-specifici)
    SEASONAL_2027.forEach(p => {
      if (start.getFullYear() <= p.year && end.getFullYear() >= p.year) {
        const rStart = _dateInYear(p.year, p.monthStart, p.dayStart);
        const rEnd = _dateInYear(p.year, p.monthEnd, p.dayEnd);
        if (_overlaps(rStart, rEnd, start, end)) {
          hints.push({
            ...p,
            actualStart: rStart,
            actualEnd: rEnd
          });
        }
      }
    });

    // Severity sort: danger > warning > info
    const sevOrder = { danger: 0, warning: 1, info: 2 };
    hints.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

    return hints;
  }

  function _fmtDateRange(start, end) {
    const pad = n => String(n).padStart(2, '0');
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `${pad(start.getDate())}–${pad(end.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`;
    }
    return `${pad(start.getDate())}/${pad(start.getMonth() + 1)} – ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`;
  }

  function _palette(severity) {
    switch (severity) {
      case 'danger':  return { bg: 'rgba(224,65,78,0.12)',  border: 'rgba(224,65,78,0.45)',  fg: '#c8313e' };
      case 'warning': return { bg: 'rgba(180,83,9,0.12)', border: 'rgba(180,83,9,0.45)', fg: '#b45309' };
      case 'info':
      default:        return { bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.40)', fg: '#0284c7' };
    }
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Restituisce HTML widget (vuoto se non ci sono hint per le date del trip)
  function renderHintsHTML() {
    const { start, end } = getTripDateRange();
    const hints = getHintsForRange(start, end);
    if (!hints.length) return '';

    const headerLabel = T('jpcal.title', '📅 Calendario giapponese');
    const subtitle = T('jpcal.subtitle', 'Eventi sovrapposti alle date del viaggio');

    const cards = hints.map(h => {
      const pal = _palette(h.severity);
      const label = T(h.labelKey, h.labelFallback);
      return `
        <button type="button"
          data-jpcal-id="${_esc(h.id)}"
          style="
            display:flex;align-items:center;gap:10px;
            padding:12px 14px;
            background:${pal.bg};border:1.5px solid ${pal.border};border-radius:10px;
            color:${pal.fg};font-size:14px;font-weight:600;
            cursor:pointer;text-align:left;
            transition:all 0.15s;width:100%;"
          onmouseover="this.style.transform='translateY(-1px)'"
          onmouseout="this.style.transform='translateY(0)'">
          <span style="font-size:18px;flex:0 0 auto;">${h.icon}</span>
          <span style="flex:1;line-height:1.4;">
            <strong>${_esc(label)}</strong>
            <span style="display:block;font-size:13px;color:var(--l-muted);font-weight:500;font-family:'SF Mono',Menlo,monospace;">
              ${_fmtDateRange(h.actualStart, h.actualEnd)}
            </span>
          </span>
          <span style="flex:0 0 auto;color:var(--l-muted);font-size:16px;">→</span>
        </button>
      `;
    }).join('');

    return `
      <div id="jpcal-hints-widget" style="
        padding:16px;margin:14px 0;
        background:rgba(20,30,60,0.03);border:1px solid var(--l-hair);border-radius:12px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:10px;flex-wrap:wrap;">
          <div style="font-weight:700;color:var(--l-ink);font-size:15px;line-height:1.5;">${headerLabel}</div>
          <div style="font-size:13px;color:var(--l-muted);">${_esc(subtitle)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${cards}
        </div>
      </div>
    `;
  }

  // Apre pannello con la descrizione completa di un hint
  function openDetailPanel(hint) {
    if (!hint || typeof window.openSheet !== 'function') return;
    const pal = _palette(hint.severity);
    const label = T(hint.labelKey, hint.labelFallback);
    const message = T(hint.messageKey, hint.messageFallback);

    const html = `
      <div style="padding:6px 0;">
        <div style="
          padding:14px;margin-bottom:14px;
          background:${pal.bg};border:1.5px solid ${pal.border};border-radius:12px;
          display:flex;align-items:center;gap:12px;">
          <div style="font-size:32px;flex:0 0 auto;">${hint.icon}</div>
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--l-ink);">${_esc(label)}</div>
            <div style="font-size:14px;color:var(--l-muted);font-family:'SF Mono',Menlo,monospace;margin-top:2px;">
              ${_fmtDateRange(hint.actualStart, hint.actualEnd)}
            </div>
          </div>
        </div>
        <div style="
          padding:14px;background:rgba(20,30,60,0.03);
          border:1px solid var(--l-hair);border-radius:10px;
          color:var(--l-ink);font-size:15px;line-height:1.6;">
          ${_esc(message)}
        </div>
        ${hint.severity === 'info' ? `
          <p style="font-size:12px;color:var(--l-faint);text-align:center;margin-top:12px;line-height:1.5;">
            ⚠️ ${T('jpcal.estimateDisclaimer', 'Date stimate, calibrate su pattern 2020–2024. Le date reali sono pubblicate dalla JMA a febbraio dell\'anno stesso.')}
          </p>` : ''}
      </div>
    `;
    window.openSheet(label, html);
  }

  // Click delegation per i bottoni hint
  function _installClickListener() {
    if (window.__jpcalListenerInstalled) return;
    window.__jpcalListenerInstalled = true;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-jpcal-id]');
      if (!btn) return;
      const id = btn.getAttribute('data-jpcal-id');
      // Re-compute hints to get the right one
      const { start, end } = getTripDateRange();
      const hint = getHintsForRange(start, end).find(h => h.id === id);
      if (hint) openDetailPanel(hint);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _installClickListener);
  } else {
    _installClickListener();
  }

  window.JapanCalendarHints = {
    getHintsForRange,
    renderHintsHTML,
    openDetailPanel,
    getTripDateRange,
    syncGlobalHolidays,
    RECURRING_PERIODS,
    SEASONAL_2027
  };
})();
