// ============================================================================
// itinerary-export.js — buildICS, downloadICS, exportItineraryJSON,
//   exportItineraryPDF, exportItineraryWhatsApp, promptAddToCalendar,
//   showExportModal, shareItineraryInGroup
// Extracted from app-core.js. Deps (all window.*):
//   state, allPOIs, SHOPPING_DB, toast, broadcastItinerary, getPoiDisplayName,
//   openSheet
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

function pad(n){ return n<10?'0'+n:''+n; }
function toICSDate(d){
  return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+
         pad(d.getUTCHours())+pad(d.getUTCMinutes())+'00Z';
}
function buildICS(events){
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Giappone2027//IT','CALSCALE:GREGORIAN'];
  events.forEach((ev,i) => {
    lines.push('BEGIN:VEVENT',
      'UID:'+(ev.id||'ev-'+i)+'@giappone2027',
      'DTSTAMP:'+toICSDate(new Date()),
      'DTSTART:'+toICSDate(new Date(ev.start)),
      'DTEND:'+toICSDate(new Date(ev.end)),
      'SUMMARY:'+(ev.title||'').replace(/,/g,'\\,'),
      'LOCATION:'+(ev.location||'').replace(/,/g,'\\,'),
      'DESCRIPTION:'+((ev.desc||'').replace(/\n/g,'\\n').replace(/,/g,'\\,')),
      'GEO:'+(ev.lat||'')+';'+(ev.lng||''),
      'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
function downloadICS(filename, content){
  const blob = new Blob([content], {type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
}
// ===== EXPORT: JSON + PDF =====
function exportItineraryJSON(){
  const itinerary = window.state.itinerary || [];
  const bookings = window.state.bookings || {};
  const notes = window.state.notes || {};
  const savedPOIs = window.state.savedPOIs || [];
  
  const items = itinerary.map(entry => {
    const poi = window.allPOIs().find(p => p.id === entry.id) || window.SHOPPING_DB.find(s => s.id === entry.id);
    return {
      id: entry.id,
      name: entry.name,
      city: entry.city,
      type: entry.type || (poi ? (poi.cat || 'custom') : 'custom'),
      date: entry.date || (bookings[entry.id]?.date || null),
      status: bookings[entry.id]?.status || null,
      notes: notes[entry.id] || null,
      coords: poi ? {lat: poi.lat, lng: poi.lng} : {lat: entry.lat, lng: entry.lng}
    };
  });
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    trip: {name: 'Giappone 2027', startDate: '2027-04-10', endDate: '2027-06-30'},
    itinerary: items,
    stats: {
      totalStops: items.length,
      savedPOIs: savedPOIs.length,
      bookingsPending: Object.values(bookings).filter(b => b.status === 'pending').length,
      bookingsConfirmed: Object.values(bookings).filter(b => b.status === 'confirmed').length
    }
  };
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], {type: 'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'giappone-2027-itinerario.json'; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
  window.toast(T('toast.itinJsonExported', 'Itinerario JSON scaricato 📥'));
}
function exportItineraryPDF(){
  const itinerary = window.state.itinerary || [];
  const bookings = window.state.bookings || {};
  const notes = window.state.notes || {};
  if (!itinerary.length) {
    window.toast(T('toast.addStopsFirst', 'Aggiungi tappe prima di esportare'));
    return;
  }
  // Simple HTML-based PDF generation
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Giappone 2027 - Itinerario</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { color: #1A3C5E; border-bottom: 3px solid #C85C3B; padding-bottom: 10px; }
        .stop { margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #C85C3B; }
        .stop h3 { margin: 0 0 10px; color: #1A3C5E; }
        .meta { font-size: 12px; color: #666; margin: 5px 0; }
        .status { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .status.confirmed { background: #4A7C59; color: white; }
        .status.pending { background: #E8A838; color: #333; }
        .notes { font-style: italic; color: #666; margin-top: 8px; }
        .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 11px; color: #999; }
      </style>
    </head>
    <body>
      <h1>🗾 Giappone 2027 - Itinerario di viaggio</h1>
      <p><strong>Generato:</strong> ${new Date().toLocaleString('it-IT')}</p>
      <p><strong>Totale tappe:</strong> ${itinerary.length}</p>
  `;
  itinerary.forEach((entry, idx) => {
    const poi = window.allPOIs().find(p => p.id === entry.id) || window.SHOPPING_DB.find(s => s.id === entry.id);
    const bk = bookings[entry.id];
    const note = notes[entry.id];
    const statusLabel = bk?.status ? (bk.status === 'confirmed' ? '✅ Confermata' : '⏳ In attesa') : '';
    const statusClass = bk?.status ? `status ${bk.status}` : '';
    htmlContent += `
      <div class="stop">
        <h3>${idx + 1}. ${entry.name}</h3>
        <div class="meta">Posizione rilevata ${entry.city}${entry.type ? ` · ${entry.type}` : ''}</div>
        ${entry.date ? `<div class="meta">📅 ${entry.date}</div>` : ''}
        ${statusLabel ? `<div class="meta"><span class="${statusClass}">${statusLabel}</span></div>` : ''}
        ${poi?.desc ? `<p>${poi.desc}</p>` : ''}
        ${poi?.hours ? `<div class="meta">🕐 ${poi.hours}</div>` : ''}
        ${note ? `<div class="notes"><strong>Note:</strong> ${note}</div>` : ''}
      </div>
    `;
  });
  htmlContent += `
    <div class="footer">
      <p>Esportato da Giappone 2027 Travel Companion v3</p>
    </div>
    </body>
  </html>
  `;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.toast(T('toast.popupBlocked', 'Consenti i popup per esportare il PDF'));
    return;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 500);
} // ← chiusura di exportItineraryPDF



function promptAddToCalendar(p){
  const html = `
    <div class="form-row"><label>Data inizio</label><input type="datetime-local" id="cal-start" required/></div>
    <div class="form-row"><label>Durata (minuti)</label>
      <select id="cal-dur">
        <option value="60">1 ora</option><option value="90" selected>1.5 ore</option>
        <option value="120">2 ore</option><option value="180">3 ore</option>
        <option value="240">4 ore</option><option value="480">Tutto il giorno (8h)</option>
      </select></div>
    <div class="action-row">
      <button class="btn primary" id="cal-export">📥 Scarica .ics</button>
    </div>
    <div class="section" style="margin-top:14px"><h3>ℹ️ Come usare il file .ics</h3>
      <p style="font-size:12px;color:var(--muted)">Scarica il file e aprilo col tuo telefono: Google Calendar, Apple Calendar e Outlook lo importano automaticamente con POI, coordinate e note.</p>
    </div>
  `;
  window.openSheet('📅 Aggiungi a calendario', html);
  document.getElementById('cal-export').onclick = () => {
    const startVal = document.getElementById('cal-start').value;
    const dur = parseInt(document.getElementById('cal-dur').value,10);
    if (!startVal){ window.toast(window.t ? window.t('cal.selectDateTime','Seleziona data/ora') : 'Seleziona data/ora'); return; }
    const start = new Date(startVal);
    const end = new Date(start.getTime() + dur*60000);
    const ics = buildICS([{
      id:p.id, title:window.getPoiDisplayName(p), location:p.city+', Giappone',
      desc:(p.desc||'')+(p.gf?.notes?'\n\nGluten-Free: '+p.gf.notes:'')+(window.state.notes[p.id]?'\n\nNote: '+window.state.notes[p.id]:''),
      lat:p.lat, lng:p.lng, start:start, end:end
    }]);
    downloadICS(`${p.id}_${window.getPoiDisplayName(p).replace(/[^a-z0-9]/gi,'_')}.ics`, ics);
    window.toast(T('toast.calExported', 'Calendario scaricato 📅'));
  };
}
// ===== GLOBAL POI CACHE =====
let globalPOIsCache = null;
function getCachedAllPOIs() {
  if (!globalPOIsCache) {
    globalPOIsCache = window.allPOIs();
    console.log('[getCachedAllPOIs] 📦 Cache MISS - rebuilt:', globalPOIsCache.length, 'POIs');
    console.log('[getCachedAllPOIs] Sample IDs:', globalPOIsCache.slice(0, 3).map(p => p.id).join(', '));
  } else {
    console.log('[getCachedAllPOIs] ✓ Cache HIT -', globalPOIsCache.length, 'POIs');
  }
  return globalPOIsCache;
}
window.getCachedAllPOIs = getCachedAllPOIs; // esposto per js/views/poi-detail-view.js
window.invalidatePOIsCache = function() { globalPOIsCache = null; }; // usato da renderMarkers
// Invalida cache quando state cambia (custom events, category overrides)
const origSaveState = saveState;
let lastItineraryLength = 0;
let lastGroupItinerariesHash = {};
saveState = function() {
  globalPOIsCache = null;

  // Check if personal itinerary changed, and broadcast to group
  const currentLength = (window.state.itinerary || []).length;
  if (currentLength !== lastItineraryLength) {
    lastItineraryLength = currentLength;
    console.log('[saveState] Personal itinerary changed:', currentLength, 'items');
    if (window.peerGPS?.broadcastItinerary) {
      window.peerGPS.broadcastItinerary();
    }
  }

  // Check if group itineraries changed
  const groupItineraries = window.state.groupItineraries || {};
  Object.entries(groupItineraries).forEach(([itineraryId, itinerary]) => {
    const currentHash = JSON.stringify({
      version: itinerary.version,
      poiCount: itinerary.pois?.length || 0
    });
    if (lastGroupItinerariesHash[itineraryId] !== currentHash) {
      lastGroupItinerariesHash[itineraryId] = currentHash;
      console.log('[saveState] Group itinerary changed:', itineraryId, '| v' + itinerary.version, '|', itinerary.pois?.length || 0, 'POIs');
    }
  });

  origSaveState.apply(this, arguments);
};

// Cache per lista tappe
let listViewCache = { data: null, html: null };

// ===== PLANIFICATORE ITINERARIO (Tappe) =====
function exportItineraryWhatsApp() {
  const itinerary = (window.state.itinerary || []).sort((a, b) => {
    const dayA = a.day || 999, dayB = b.day || 999;
    if (dayA !== dayB) return dayA - dayB;
    return (a.time || '').localeCompare(b.time || '');
  });

  if (itinerary.length === 0) {
    window.toast(T('toast.itinEmptyActions', '❌ Itinerario vuoto. Aggiungi tappe prima!'));
    return;
  }

  let text = '🗾 GIAPPONE 2027 - ITINERARIO\n\n';
  text += `📅 ${new Date().toLocaleDateString('it-IT')}\n`;
  text += `📍 ${itinerary.length} tappe pianificate\n`;
  text += '━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  let currentDay = null;
  itinerary.forEach((entry, idx) => {
    if (entry.day !== currentDay) {
      currentDay = entry.day;
      text += `\n📅 GIORNO ${currentDay || '?'}\n`;
      text += '─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─\n';
    }
    text += `${idx + 1}. 📍 ${entry.name || '?'}\n`;
    if (entry.time) text += `   🕐 ${entry.time}\n`;
    if (entry.city) text += `   🏙️ ${entry.city}\n`;
    if (entry.cost) text += `   💰 ${entry.cost}\n`;
  });

  text += '\n━━━━━━━━━━━━━━━━━━━━━━━\n';
  text += '✈️ Creato con Giappone 2027\n';
  text += '📱 https://giappone2027.app';

  // Copia e apri WhatsApp
  navigator.clipboard.writeText(text).then(() => {
    window.toast(T('toast.itinCopied', '✅ Itinerario copiato! Incollalo su WhatsApp'));
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  }).catch(() => {
    // Fallback: mostra il testo in un modal
    showExportModal(text);
  });
}

function showExportModal(text) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="position:fixed;inset:0;z-index:3001;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px" id="export-modal">
      <div style="background:var(--surface);border-radius:12px;padding:20px;max-width:380px;width:100%;max-height:70vh;overflow-y:auto">
        <h3 style="margin:0 0 14px;color:var(--accent)">📋 Itinerario da Esportare</h3>
        <pre style="background:var(--surface-2);padding:12px;border-radius:8px;font-size:11px;color:var(--text);overflow-x:auto;max-height:300px">${text}</pre>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="flex:1;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer">Chiudi</button>
          <button onclick="navigator.clipboard.writeText(\`${text.replace(/`/g, '\\`')}\`);window.toast(window.t?window.t('sos.copied','✅ Copiato!'):'✅ Copiato!')" style="flex:1;padding:10px;background:var(--accent);border:none;border-radius:8px;color:#fff;cursor:pointer;font-weight:600">📋 Copia</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function shareItineraryInGroup() {
  const itinerary = window.state.itinerary || [];
  if (itinerary.length === 0) {
    window.toast(T('toast.itinEmpty', '❌ Itinerario vuoto!'));
    return;
  }
  if (!window.peerGPS?.connections || Object.keys(window.peerGPS.connections).length === 0) {
    window.toast(T('toast.noRoom', '❌ Non sei in una stanza. Crea/accedi a una stanza prima!'));
    return;
  }
  window.broadcastItinerary();
  window.toast(T('toast.itinShared', '✅ Itinerario condiviso con il gruppo!'));
}

  window.buildICS = buildICS;
  window.downloadICS = downloadICS;
  window.exportItineraryJSON = exportItineraryJSON;
  window.exportItineraryPDF = exportItineraryPDF;
  window.promptAddToCalendar = promptAddToCalendar;
  window.exportItineraryWhatsApp = exportItineraryWhatsApp;
  window.shareItineraryInGroup = shareItineraryInGroup;
})();
