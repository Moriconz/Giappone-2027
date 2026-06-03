// ============================================================================
// gps-tracker.js — startGPS, stopGPS, toggleGPS,
//   updateAgendaDistances, buildGPSPanelHTML, updateGPSStatusPanel
// Extracted from app-core.js. Deps (all window.*):
//   state, saveState, haversineKm, fmtDist, updateGPSMarker, peerGPS,
//   rtdbBroadcast, toast, t
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  function startGPS(){
    // === FAKE GPS A TOKYO (per testing) ===
    const USE_FAKE_GPS = false;
    let geolocationToUse = navigator.geolocation;

    // Se in un gruppo, manda il GPS subito (non aspetta il primo update)
    if (window.state.group?.myName && window.state.gpsCurrentLat && window.state.gpsCurrentLng && window.peerGPS?.getStatus() !== 'disconnected') {
      console.log(`%c[GPS] 📍 START: Broadcasting GPS istantaneo all'accensione`, 'background:#4A7C59;color:white;padding:4px 8px;border-radius:3px');
      const payload = {
        type: 'gps',
        lat: window.state.gpsCurrentLat,
        lng: window.state.gpsCurrentLng,
        name: window.state.group.myName,
        avatar: window.state.group?.myAvatar || null
      };
      window.rtdbBroadcast(payload);
    }

    if (USE_FAKE_GPS) {
      // Mock geolocation (non assegnare a navigator.geolocation che è readonly)
      geolocationToUse = {
        watchPosition: (successCallback, errorCallback, options) => {
          // Simula Tokyo coordinates con piccolo jitter per realismo
          const interval = setInterval(() => {
            successCallback({
              coords: {
                latitude: 35.6762 + (Math.random() - 0.5) * 0.001,
                longitude: 139.6503 + (Math.random() - 0.5) * 0.001,
                accuracy: 10
              }
            });
          }, 1000);
          return interval;
        },
        clearWatch: (id) => {
          clearInterval(id);
        }
      };
      console.log('[GPS] Using FAKE GPS at Tokyo');
    }
    // === FINE FAKE GPS ===

    if (!geolocationToUse) { window.toast(T('toast.gpsNA', 'GPS non disponibile')); return; }
    window.state.gpsEnabled=true; window.state.gpsPermissionAsked=true; window.saveState?.();
    if (window.gpsWatchId!==null) return;
    window.gpsWatchId=geolocationToUse.watchPosition(pos=>{
      const pt={lat:pos.coords.latitude,lng:pos.coords.longitude};
      if(!window.state.gpsTrack) window.state.gpsTrack=[];
      const last=window.state.gpsTrack[window.state.gpsTrack.length-1];
      if(!last||window.haversineKm(last.lat,last.lng,pt.lat,pt.lng)*1000>5){
        if(window.state.gpsTrack.length>=500) window.state.gpsTrack.shift();
        window.state.gpsTrack.push(pt);
      }
      window.state.gpsCurrentLat=pt.lat; window.state.gpsCurrentLng=pt.lng;
      window.updateGPSMarker(pt.lat, pt.lng);
      // Invia posizione ai peer connessi (se GPS live attivo)
      if (window.peerGPS?.getStatus() !== 'disconnected') {
        try {
          const payload = { type:'gps', lat:pt.lat, lng:pt.lng,
            name: window.state.group?.myName||'?', avatar: window.state.group?.myAvatar||null };
          console.log(`%c[GPS] 📍 Trasmettendo posizione: (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}) - ${window.state.group?.myName}`, 'background:#4A7C59;color:white;padding:4px 8px;border-radius:3px;font-size:11px');
          window.rtdbBroadcast(payload);
        } catch(e) {}
      }
      window.saveState?.(); updateAgendaDistances(); updateGPSStatusPanel();
    },err=>{
      window.toast('GPS: '+err.message); window.state.gpsEnabled=false; window.saveState?.();
      if(window.gpsWatchId!==null){geolocationToUse.clearWatch(window.gpsWatchId);window.gpsWatchId=null;}
      updateGPSStatusPanel();
    },{enableHighAccuracy:true,maximumAge:5000,timeout:30000});
  }

  function stopGPS(){
    window.state.gpsEnabled=false; window.saveState?.();
    if(window.gpsWatchId!==null){navigator.geolocation.clearWatch(window.gpsWatchId);window.gpsWatchId=null;}
    window.updateGPSMarker(null, null);
    updateGPSStatusPanel(); window.toast(T('toast.gpsOff', 'GPS disattivato'));
  }

  function toggleGPS(){ if(window.state.gpsEnabled&&window.gpsWatchId!==null) stopGPS(); else startGPS(); }

  function updateAgendaDistances(){
    if(!window.state.gpsCurrentLat) return;
    document.querySelectorAll('[data-gps-dist]').forEach(el=>{
      const lat=parseFloat(el.dataset.lat), lng=parseFloat(el.dataset.lng);
      if(!isNaN(lat)&&!isNaN(lng)){
        const km=window.haversineKm(window.state.gpsCurrentLat,window.state.gpsCurrentLng,lat,lng);
        el.textContent='Posizione rilevata '+window.fmtDist(km);
        el.style.color=km<1?'var(--success)':km<5?'var(--warning)':'var(--muted)';
      }
    });
  }

  function buildGPSPanelHTML(active,pts,lat,lng){
    return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${active?'var(--success)':'var(--muted)'};display:inline-block;${active?'box-shadow:0 0 0 3px rgba(74,124,89,.25)':''}"></span>
          GPS ${active?'attivo':'inattivo'}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">${active?lat+', '+lng:'Nessuna posizione'} · ${pts} punti</div>
      </div>
      <button id="gps-toggle-btn" class="btn ${active?'success':''}" style="font-size:12px;padding:6px 10px">
        ${active?'⏹ Stop':'▶ Start GPS'}
      </button>
      ${pts>0?`<button id="gps-clear-btn" class="btn" aria-label="Cancella traccia GPS" style="font-size:12px;padding:6px 10px">🗑️</button>`:''}
    </div>`;
  }

  function updateGPSStatusPanel(){
    const panel=document.getElementById('gps-status-panel'); if(!panel) return;
    const active=window.state.gpsEnabled&&window.gpsWatchId!==null;
    const pts=window.state.gpsTrack?.length||0;
    const lat=window.state.gpsCurrentLat?window.state.gpsCurrentLat.toFixed(5):'—';
    const lng=window.state.gpsCurrentLng?window.state.gpsCurrentLng.toFixed(5):'—';
    panel.innerHTML=buildGPSPanelHTML(active,pts,lat,lng);
    const btn=document.getElementById('gps-toggle-btn'); if(btn) btn.onclick=toggleGPS;
    const clrBtn=document.getElementById('gps-clear-btn');
    if(clrBtn) clrBtn.onclick=()=>{
      window.state.gpsTrack=[]; window.state.gpsCurrentLat=null; window.state.gpsCurrentLng=null;
      window.updateGPSMarker(null, null);
      window.saveState?.(); updateAgendaDistances(); updateGPSStatusPanel(); window.toast(T('toast.trackCleared', 'Traccia cancellata'));
    };
  }

  window.startGPS = startGPS;
  window.stopGPS = stopGPS;
  window.toggleGPS = toggleGPS;
  window.updateAgendaDistances = updateAgendaDistances;
  window.buildGPSPanelHTML = buildGPSPanelHTML;
  window.updateGPSStatusPanel = updateGPSStatusPanel;
})();
