/**
 * ITINERARY CLOSING WARNING — segnala se l'arrivo/uscita da una tappa cade
 * fuori dagli orari di apertura noti (da POI_ENRICHMENT / Google Places).
 */

// Estratta da getEntryClosingWarning così da poterla interrogare anche per
// orari IPOTETICI (candidati di un riordino), non solo per l'orario già
// assegnato a una tappa. Comportamento identico, solo parametrizzata.
// day: 0=Domenica...6=Sabato, stessa convenzione di Date.getDay()
function isPeriodsOpenAt(periods, date) {
  if (!Array.isArray(periods) || periods.length === 0) return true; // nessun dato -> permissivo, non penalizzare
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
}

function getEntryClosingWarning(dayIndex, entry, tripStartDate) {
  const periods = entry?.opening_periods;
  if (!Array.isArray(periods) || periods.length === 0 || !entry.time) return null;

  const tripStart = tripStartDate ? new Date(tripStartDate) : new Date(2027, 3, 10);
  const [h, m] = entry.time.split(':').map(Number);
  const arrival = new Date(tripStart);
  arrival.setDate(arrival.getDate() + dayIndex);
  arrival.setHours(h, m, 0, 0);
  const departure = new Date(arrival.getTime() + (entry.duration || 0) * 60000);

  const arrivalOk = isPeriodsOpenAt(periods, arrival);
  const departureOk = isPeriodsOpenAt(periods, departure);

  if (arrivalOk && departureOk) return null;
  if (!arrivalOk) {
    return { severity: 'closed', message: 'Chiuso all\'orario di arrivo previsto' };
  }
  return { severity: 'closing-soon', message: 'Chiude prima della fine della visita prevista' };
}

window.isPeriodsOpenAt = isPeriodsOpenAt;
window.getEntryClosingWarning = getEntryClosingWarning;
