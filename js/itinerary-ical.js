/**
 * itinerary-ical.js — Export itinerario come file .ics (iCalendar)
 *
 * Genera un file standard iCalendar (RFC 5545) che può essere importato in:
 *   - Apple Calendar
 *   - Google Calendar
 *   - Outlook / Microsoft 365
 *   - qualsiasi app che supporti .ics
 *
 * Mapping:
 *   - Ogni entry diventa un VEVENT
 *   - SUMMARY = poi_name
 *   - DTSTART = data del giorno + entry.time (default 10:00)
 *   - DTEND   = DTSTART + entry.duration (default 60 min)
 *   - LOCATION = "lat,lng" se presenti (così Maps lo apre)
 *   - DESCRIPTION = note + ¥cost + link Maps
 *
 * Esposto come window.handleExportICal() — agganciato a un bottone in
 * itinerary-unified.js. Non ha dipendenze interne ad app-core.
 *
 * Dipendenze esterne (tutte su window):
 *   - window.state.itineraryByDay   sorgente itinerario
 *   - window.state.tripProfile.startDate o tripProfile.year   per ancorare le date
 *   - window.toast(msg)             feedback
 */
(function () {
  'use strict';

  // RFC 5545: escape sequences nel TEXT
  function escIcs(s) {
    if (s == null) return '';
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  // Format Date → "20270410T100000" (local time, no Z)
  function fmtDt(d) {
    const pad = n => String(n).padStart(2, '0');
    return d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) + 'T' +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds());
  }

  function getTripStartDate() {
    const tp = window.state?.tripProfile || {};
    // Priorità: startDate ISO esplicito → year + default 2027-04-10
    if (tp.startDate) {
      const d = new Date(tp.startDate);
      if (!isNaN(d.getTime())) return d;
    }
    if (tp.year) return new Date(tp.year, 3, 10); // 10 aprile dell'anno indicato
    return new Date(2027, 3, 10); // default 2027-04-10
  }

  function parseTime(timeStr) {
    if (typeof timeStr !== 'string') return [10, 0];
    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return [10, 0];
    return [parseInt(m[1], 10), parseInt(m[2], 10)];
  }

  function buildIcs() {
    const ibd = window.state?.itineraryByDay || {};
    const days = Object.keys(ibd).map(Number).sort((a, b) => a - b);
    if (!days.length) return null;

    const start = getTripStartDate();
    const tripName = window.state?.tripProfile?.tripName || 'Giappone 2027';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Giappone 2027//Itinerario//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escIcs(tripName)}`,
      `X-WR-TIMEZONE:Asia/Tokyo`
    ];

    const dtstamp = fmtDt(new Date()) + 'Z'; // creation time in UTC
    let eventCount = 0;

    days.forEach(dayIdx => {
      const entries = ibd[dayIdx] || [];
      entries.forEach((e, i) => {
        if (!e || !e.poi_name) return;

        // Compute event start
        const dayDate = new Date(start.getTime() + dayIdx * 24 * 3600 * 1000);
        const [h, m] = parseTime(e.time);
        const dtStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), h, m, 0);
        const durationMin = (typeof e.duration === 'number' && e.duration > 0) ? e.duration : 60;
        const dtEnd = new Date(dtStart.getTime() + durationMin * 60 * 1000);

        // Compose location: prefer "lat,lng" (Maps apps deep-link well)
        let location = '';
        if (typeof e.lat === 'number' && typeof e.lng === 'number') {
          location = `${e.lat},${e.lng}`;
        }

        // Compose description
        const descParts = [];
        if (e.notes) descParts.push(e.notes);
        if (e.cost && e.cost > 0) descParts.push(`Costo stimato: ¥${e.cost}`);
        if (location) descParts.push(`https://maps.google.com/?q=${location}`);
        const description = descParts.join('\\n');

        const uid = `${dayIdx}-${i}-${e.poi_id || 'unknown'}@giappone-2027`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${dtstamp}`);
        lines.push(`DTSTART:${fmtDt(dtStart)}`);
        lines.push(`DTEND:${fmtDt(dtEnd)}`);
        lines.push(`SUMMARY:${escIcs(e.poi_name)}`);
        if (location) lines.push(`LOCATION:${escIcs(location)}`);
        if (description) lines.push(`DESCRIPTION:${description}`);
        lines.push('END:VEVENT');
        eventCount++;
      });
    });

    lines.push('END:VCALENDAR');
    return { ics: lines.join('\r\n'), eventCount };
  }

  function handleExportICal() {
    const result = buildIcs();
    if (!result || result.eventCount === 0) {
      if (typeof window.toast === 'function') window.toast('⚠️ Itinerario vuoto');
      return;
    }
    try {
      const blob = new Blob([result.ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const tripName = (window.state?.tripProfile?.tripName || 'giappone-2027')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.href = url;
      a.download = `${tripName}-${new Date().toISOString().split('T')[0]}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
      if (typeof window.toast === 'function') {
        window.toast(`✅ Esportati ${result.eventCount} eventi (.ics)`);
      }
    } catch (err) {
      console.error('[itinerary-ical] export failed:', err);
      if (typeof window.toast === 'function') window.toast('❌ Export iCal fallito');
    }
  }

  window.handleExportICal = handleExportICal;
})();
