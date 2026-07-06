/**
 * itinerary-version-history.js
 * Timeline + ripristino delle versioni dell'itinerario di gruppo.
 * Risolve il gap UI in STATO_APP.md §8.3:
 *   "Itinerary version history — ✅ scrive | nessuno | ❌ gap UI"
 *
 * Come funziona:
 *   Ogni modifica all'itinerario di gruppo chiama pushUndoState() che salva un
 *   snapshot completo in state.undoRedo.stack. Questo modulo espone una UI
 *   per navigare e ripristinare qualsiasi checkpoint.
 *
 * API pubblica:
 *   window.ItineraryVersionHistory = { openPanel, _restoreTo }
 *   window.openItineraryVersionHistory()
 */
(function () {
  'use strict';

  const T = (k, f) => window.t?.(k) ?? (f ?? k);

  const ACTION_ICONS = {
    add_poi:              '➕',
    delete_poi:           '🗑️',
    soft_delete_poi:      '⬜',
    modify_field:         '✏️',
    modify_opening_hours: '🕐',
    merge:                '🔄',
  };

  // Avatar color deterministico da stringa
  function _avatarColor(seed) {
    const COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8'];
    let h = 0;
    for (let i = 0; i < (seed || '').length; i++) {
      h = (h * 31 + (seed.charCodeAt(i) || 0)) & 0xffffff;
    }
    return COLORS[h % COLORS.length];
  }

  function _timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000)    return T('audit.justNow', 'Adesso');
    if (diff < 3600000)  return Math.floor(diff / 60000)   + ' ' + T('audit.minsAgo',  'min fa');
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ' + T('audit.hoursAgo', 'ore fa');
    return Math.floor(diff / 86400000) + ' ' + T('audit.daysAgo', 'gg fa');
  }

  function _esc(s) {
    return window.escapeHtml?.(String(s ?? '')) ?? String(s ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /**
   * Raccoglie le entry dello stack filtrate per l'itinerario del gruppo attivo.
   * Restituisce array ordinato dal più recente al più antico, con _idx originale.
   */
  function collect() {
    const stack = window.state?.undoRedo?.stack;
    if (!stack || stack.length === 0) return [];
    const roomId = window.state?.group?.roomId;
    if (!roomId) return [];
    const itId = `group_itin_${roomId}`;
    return stack
      .map((entry, idx) => ({ ...entry, _idx: idx }))
      .filter(e => e.itineraryId === itId)
      .reverse();
  }

  /**
   * Ripristina l'itinerario di gruppo allo snapshot salvato all'indice `idx`.
   * Chiede conferma, salva un auto-snapshot e aggiorna la UI.
   */
  async function restoreTo(idx) {
    const undoRedo = window.state?.undoRedo;
    if (!undoRedo) return;
    const entry = undoRedo.stack[idx];
    if (!entry?.snapshot || !entry.itineraryId) return;

    const confirmMsg = T('vh.confirmRestore',
      'Ripristinare questa versione? Le modifiche successive andranno perse.');
    const ok = await (window.modalConfirm || window.confirm)(confirmMsg, { danger: true, confirmText: 'Ripristina' });
    if (!ok) return;

    // Auto-snapshot di sicurezza prima di sovrascrivere
    window.ItinerarySnapshots?.saveAuto?.('before_version_restore');

    // Setta l'indice corrente e ripristina lo snapshot
    undoRedo.currentIndex = idx;
    window.state.groupItineraries[entry.itineraryId] =
      JSON.parse(JSON.stringify(entry.snapshot));

    window.saveState?.();
    window.toast?.(T('vh.restored', '✅ Itinerario ripristinato'));
    window.renderGroupView?.();
    window.closeSheet?.();
  }

  /** Apre il pannello della timeline versioni. */
  function openPanel() {
    const T = (k, f) => window.t?.(k) ?? (f ?? k);
    const entries    = collect();
    const currentIdx = window.state?.undoRedo?.currentIndex ?? -1;

    if (entries.length === 0) {
      window.openSheet?.('📷 ' + T('vh.title', 'Versioni itinerario'), `
        <div style="padding:32px 16px;text-align:center;color:var(--l-muted);">
          <div style="font-size:40px;margin-bottom:14px;">🗄️</div>
          <p style="margin:0;font-size:16px;line-height:1.5;">
            ${T('vh.empty',
              'Nessuna versione salvata ancora.<br>Le versioni vengono create automaticamente ad ogni modifica all\'itinerario di gruppo.')}
          </p>
        </div>
      `);
      return;
    }

    const rows = entries.map(entry => {
      const isCurrent = entry._idx === currentIdx;
      const color     = _avatarColor(entry.peerId || '?');
      const initial   = _esc((entry.peerId || '?').charAt(0).toUpperCase());
      const icon      = ACTION_ICONS[entry.action] || '❓';
      const pois      = entry.snapshot?.pois?.length ?? '?';
      const desc      = _esc(window.describeAction?.(entry.action, entry.poiId) || entry.action);
      const when      = _timeAgo(entry.timestamp);

      return `
        <div style="
          display:flex;gap:10px;align-items:flex-start;
          padding:12px;
          background:${isCurrent ? 'rgba(224,65,78,0.06)' : '#fff'};
          border:1.5px solid ${isCurrent ? 'var(--l-accent-brd)' : 'var(--l-hair)'};
          border-radius:10px;margin-bottom:8px;
          transition:all 0.2s;
        ">
          <!-- Avatar -->
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:${color};
            display:flex;align-items:center;justify-content:center;
            font-weight:700;font-size:15px;flex-shrink:0;color:#000;
          ">${initial}</div>

          <!-- Info -->
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
              <span style="font-size:16px;">${icon}</span>
              <span style="color:var(--l-ink);font-weight:600;font-size:15px;">${_esc(entry.peerId || 'sconosciuto')}</span>
              ${isCurrent ? `
                <span style="
                  background:rgba(22,163,74,0.12);border:1px solid rgba(22,163,74,0.4);
                  border-radius:20px;padding:1px 8px;font-size:13px;
                  color:#16a34a;font-weight:700;
                ">${T('vh.current', 'ATTUALE')}</span>` : ''}
            </div>
            <div style="color:var(--l-muted);font-size:14px;margin-bottom:4px;">
              ${desc}
              &nbsp;·&nbsp;${pois} ${T('vh.pois', 'tappe')}
            </div>
            <div style="color:var(--l-faint);font-size:13px;">${when}</div>
          </div>

          <!-- Ripristina -->
          ${!isCurrent ? `
            <button
              onclick="window.ItineraryVersionHistory._restoreTo(${entry._idx})"
              style="
                flex-shrink:0;padding:6px 10px;
                background:rgba(2,132,199,0.1);
                border:1px solid rgba(2,132,199,0.3);
                border-radius:7px;color:#0284c7;font-size:14px;font-weight:600;
                cursor:pointer;transition:all 0.2s;white-space:nowrap;
              "
              onmouseover="this.style.background='rgba(2,132,199,0.18)'"
              onmouseout="this.style.background='rgba(2,132,199,0.1)'"
            >${T('vh.restoreBtn', 'Ripristina')}</button>` : ''}
        </div>
      `;
    }).join('');

    window.openSheet?.('📷 ' + T('vh.title', 'Versioni itinerario'), `
      <div style="padding:4px 0;">
        <p style="
          margin:0 0 14px;
          color:var(--l-muted);font-size:14px;line-height:1.5;
        ">
          ${T('vh.desc',
            'Ogni modifica all\'itinerario di gruppo crea un checkpoint automatico. Puoi tornare a qualsiasi versione precedente.')}
        </p>
        <div>${rows}</div>
      </div>
    `);
  }

  // Registra le i18n keys necessarie (se i18n.js le manca, non causa errori)
  // Chiavi usate: vh.title, vh.desc, vh.empty, vh.current, vh.pois, vh.restoreBtn,
  //               vh.confirmRestore, vh.restored
  // Le chiavi audit.* e cr.* sono riutilizzate da audit-log-viewer e conflict-resolver-ui

  window.ItineraryVersionHistory = { openPanel, _restoreTo: restoreTo };
  window.openItineraryVersionHistory = openPanel;
})();
