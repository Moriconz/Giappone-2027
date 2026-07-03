/**
 * ITINERARY CLOSING WARNING — segnala se l'arrivo/uscita da una tappa cade
 * fuori dagli orari di apertura noti (da POI_ENRICHMENT / Google Places).
 */

function getEntryClosingWarning(dayIndex, entry, tripStartDate) {
  const periods = entry?.opening_periods;
  if (!Array.isArray(periods) || periods.length === 0 || !entry.time) return null;

  const tripStart = tripStartDate ? new Date(tripStartDate) : new Date(2027, 3, 10);
  const [h, m] = entry.time.split(':').map(Number);
  const arrival = new Date(tripStart);
  arrival.setDate(arrival.getDate() + dayIndex);
  arrival.setHours(h, m, 0, 0);
  const departure = new Date(arrival.getTime() + (entry.duration || 0) * 60000);

  // day: 0=Domenica...6=Sabato, stessa convenzione di Date.getDay()
  const isCoveredBy = (date) => {
    const day = date.getDay();
    const minutes = date.getHours() * 60 + date.getMinutes();
    return periods.some(p => {
      if (!p.open) return false;
      const openDay = p.open.day;
      const openMin = p.open.hour * 60 + (p.open.minute || 0);
      if (!p.close) return openDay === day && minutes >= openMin; // aperto 24h da quel giorno in poi
      const closeDay = p.close.day;
      const closeMin = p.close.hour * 60 + (p.close.minute || 0);

      if (closeDay === openDay) {
        return day === openDay && minutes >= openMin && minutes <= closeMin;
      }
      // overnight: close.day è il giorno dopo open.day (es. apre lun 22:00, chiude mar 02:00)
      if (day === openDay) return minutes >= openMin;
      if (day === closeDay) return minutes <= closeMin;
      return false;
    });
  };

  const arrivalOk = isCoveredBy(arrival);
  const departureOk = isCoveredBy(departure);

  if (arrivalOk && departureOk) return null;
  if (!arrivalOk) {
    return { severity: 'closed', message: 'Chiuso all\'orario di arrivo previsto' };
  }
  return { severity: 'closing-soon', message: 'Chiude prima della fine della visita prevista' };
}

window.getEntryClosingWarning = getEntryClosingWarning;
