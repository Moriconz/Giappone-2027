/**
 * itinerary-reminders.js — Promemoria tappe itinerario
 *
 * Per ogni tappa con orario impostato e data nel futuro prossimo (oggi/domani),
 * schedula un OS Notification + toast dell'app quando manca il tempo configurato
 * (default 15 min). Funziona anche con la scheda in background se l'utente ha
 * concesso il permesso Notification.
 *
 * API pubblica:
 *   window.ItineraryReminders.schedule()    — schedula/ri-schedula tutti i reminder
 *   window.ItineraryReminders.requestPerm() — chiede permesso e poi schedula
 *   window.ItineraryReminders.clear()       — cancella tutti i timeout attivi
 *   window.ItineraryReminders.openPanel()   — mostra pannello con riepilogo
 *
 * Dipendenze (window): state.itineraryByDay, tripProfile, allPOIs, openSheet, toast, t
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const ADVANCE_MIN = 15; // avvisa 15 min prima
  const STORE_KEY = 'gj2027_reminders_v1';

  let _timers = {}; // poi_id+day → timer id

  // ─── helpers ────────────────────────────────────────────────────────────────

  function _pad(n) { return String(n).padStart(2, '0'); }

  // Restituisce la data reale della tappa (usa tripProfile.startDate o 10 Apr 2027)
  function _tappaDate(dayIndex) {
    const tp = window.state?.tripProfile || {};
    let base;
    if (tp.startDate) {
      base = new Date(tp.startDate);
    } else {
      // default: 10 aprile 2027
      base = new Date(2027, 3, 10);
    }
    base.setDate(base.getDate() + dayIndex);
    return base;
  }

  // "09:30" + Date → Date con ora impostata
  function _dateWithTime(base, timeStr) {
    const [h, m] = (timeStr || '').split(':').map(Number);
    if (isNaN(h)) return null;
    const d = new Date(base);
    d.setHours(h, m || 0, 0, 0);
    return d;
  }

  function _poiName(entry) {
    if (entry.poi_name) return entry.poi_name;
    try {
      const poi = (typeof window.allPOIs === 'function' ? window.allPOIs() : [])
        .find(p => p.id === entry.poi_id);
      return poi ? (poi.name || poi.title || entry.poi_id) : entry.poi_id;
    } catch (_) { return entry.poi_id || '?'; }
  }

  function _notify(title, body) {
    // Toast sempre (in-app)
    window.toast?.(`⏰ ${title}: ${body}`);
    // OS notification se permesso
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: 'gj-reminder',
          renotify: true,
        });
      } catch (_) {}
    }
  }

  // ─── core ────────────────────────────────────────────────────────────────────

  function clear() {
    Object.values(_timers).forEach(id => clearTimeout(id));
    _timers = {};
  }

  function schedule() {
    clear();
    const ibd = window.state?.itineraryByDay || {};
    const now = Date.now();

    Object.keys(ibd).forEach(d => {
      const dayIndex = Number(d);
      const dayBase = _tappaDate(dayIndex);
      const entries = ibd[d] || [];

      entries.forEach((entry, idx) => {
        const timeStr = entry.arrival_time || entry.time;
        if (!timeStr) return;

        const tappaTime = _dateWithTime(dayBase, timeStr);
        if (!tappaTime) return;

        const alertTime = tappaTime.getTime() - ADVANCE_MIN * 60 * 1000;
        const delay = alertTime - now;

        // Solo se nel futuro e entro 48h
        if (delay < 0 || delay > 48 * 60 * 60 * 1000) return;

        const key = `${d}_${entry.poi_id}_${idx}`;
        const name = _poiName(entry);
        const timeLabel = `${_pad(tappaTime.getHours())}:${_pad(tappaTime.getMinutes())}`;

        _timers[key] = setTimeout(() => {
          const title = T('reminder.title', '⏰ Prossima tappa');
          const body = `${name} alle ${timeLabel} — ${T('reminder.inMinutes', 'tra ' + ADVANCE_MIN + ' minuti')}`;
          _notify(title, body);
          delete _timers[key];
        }, delay);
      });
    });
  }

  async function requestPerm() {
    if (typeof Notification === 'undefined') {
      // Notifiche non supportate: solo toast
      schedule();
      return;
    }
    if (Notification.permission === 'granted') {
      schedule();
      return;
    }
    if (Notification.permission === 'denied') {
      window.toast?.(T('reminder.denied', '⚠️ Notifiche bloccate — abilita nelle impostazioni browser'));
      schedule(); // schedula comunque (toast only)
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        window.toast?.(T('reminder.enabled', '🔔 Notifiche tappe attivate'));
      } else if (perm === 'denied') {
        window.toast?.(T('reminder.denied', '⚠️ Notifiche bloccate — abilita nelle impostazioni browser'));
      }
    } catch (_) {}
    schedule();
  }

  // ─── UI panel ────────────────────────────────────────────────────────────────

  function openPanel() {
    if (typeof window.openSheet !== 'function') return;

    const ibd = window.state?.itineraryByDay || {};
    const now = Date.now();
    const upcoming = [];

    Object.keys(ibd).forEach(d => {
      const dayIndex = Number(d);
      const dayBase = _tappaDate(dayIndex);
      (ibd[d] || []).forEach((entry, idx) => {
        const timeStr = entry.arrival_time || entry.time;
        if (!timeStr) return;
        const tappaTime = _dateWithTime(dayBase, timeStr);
        if (!tappaTime || tappaTime.getTime() < now) return;
        const alertTime = tappaTime.getTime() - ADVANCE_MIN * 60 * 1000;
        if (alertTime - now > 48 * 60 * 60 * 1000) return;
        upcoming.push({ entry, dayIndex, tappaTime, alertTime });
      });
    });

    upcoming.sort((a, b) => a.tappaTime - b.tappaTime);

    const permGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    const permBtn = !permGranted ? `
      <button id="rem-enable-btn" style="width:100%;padding:10px;background:linear-gradient(135deg,var(--m-accent),#FF5E1F);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:15px;cursor:pointer;margin-bottom:12px;">
        🔔 ${T('reminder.enableBtn', 'Attiva notifiche OS')}
      </button>` : `
      <div style="padding:8px 12px;background:rgba(22,163,74,0.12);border:1px solid rgba(22,163,74,0.4);border-radius:8px;font-size:14px;color:#15803d;margin-bottom:12px;">
        ✅ ${T('reminder.active', 'Notifiche OS attive')}
      </div>`;

    const rows = upcoming.length === 0
      ? `<div style="text-align:center;padding:20px;color:var(--l-muted);font-size:15px;">
           ${T('reminder.none', 'Nessuna tappa con orario nelle prossime 48h.')}
         </div>`
      : upcoming.map(({ entry, dayIndex, tappaTime }) => {
          const name = _poiName(entry);
          const mins = Math.round((tappaTime.getTime() - now) / 60000);
          const hh = _pad(tappaTime.getHours()), mm = _pad(tappaTime.getMinutes());
          return `
          <div style="padding:10px 12px;background:rgba(20,30,60,0.03);border:1px solid var(--l-hair);border-radius:8px;">
            <div style="font-size:15px;font-weight:600;color:var(--l-ink);">${name}</div>
            <div style="font-size:13px;color:var(--l-muted);margin-top:3px;">
              📅 Day ${dayIndex + 1} · 🕐 ${hh}:${mm} · ⏳ ${mins < 60 ? mins + ' min' : Math.round(mins / 60) + 'h'}
            </div>
          </div>`;
        }).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
        ${permBtn}
        <p style="font-size:13px;color:var(--l-muted);margin:0;">
          ${T('reminder.hint', `Ricevi un avviso ${ADVANCE_MIN} minuti prima di ogni tappa con orario impostato.`)}
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;">${rows}</div>
      </div>`;

    window.openSheet(T('reminder.panelTitle', '🔔 Promemoria tappe'), html);
    setTimeout(() => {
      const btn = document.getElementById('rem-enable-btn');
      if (btn) btn.onclick = () => { requestPerm(); window.closeSheet?.(); };
    }, 40);
  }

  // ─── auto-reschedule on itinerary changes ────────────────────────────────────

  document.addEventListener('itinerary_changed', schedule);
  window.addEventListener('personal_itinerary_synced', schedule);

  // Schedula al boot (dopo 2s per lasciare caricare lo state)
  setTimeout(() => {
    if (localStorage.getItem(STORE_KEY + '_opt') !== '0') schedule();
  }, 2000);

  window.ItineraryReminders = { schedule, requestPerm, clear, openPanel };
  window.openItineraryReminders = openPanel;
})();
