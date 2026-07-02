/**
 * conflict-resolver-ui.js — Review e override dei conflitti CRDT del gruppo
 *
 * Risolve un secondo gap UI documentato in STATO_APP.md §8.3: il CRDT
 * (mergeGroupItinerary in app-core.js) risolve automaticamente last-write-wins
 * sui conflitti field-level via vector clock. Le funzioni `recordMergeConflict`
 * e `getMergeConflictInfo` esistono ma il merge reale non le popolava → l'utente
 * non sapeva mai quando le sue modifiche erano state sovrascritte da un peer.
 *
 * Questo modulo:
 *   1. WRAPPA window.mergeGroupItinerary (non-invasive su app-core):
 *      confronta pre/post per estrarre i conflitti reali e li salva via
 *      window.recordMergeConflict (API già esposta).
 *   2. Espone una UI panel di review con per ogni conflict:
 *      - field, valore locale (mio), valore remoto (vincitore auto)
 *      - bottone "↩️ Tieni la mia" → applica override via updatePOIFieldInGroupItinerary
 *      - bottone "✓ Conferma scelta auto" → dismiss del singolo conflict
 *   3. Mostra toast con CTA quando arrivano nuovi conflicts (post-merge).
 *
 * Esposto:
 *   - window.ConflictResolver = { collect, openPanel, keepMine, dismiss, dismissAll }
 *   - window.openConflictResolver() → apre il panel
 *
 * Dipendenze esterne (tutte su window):
 *   - window.mergeGroupItinerary (wrappato)
 *   - window.recordMergeConflict / window.getMergeConflictInfo
 *   - window.updatePOIFieldInGroupItinerary (per override "keep mine")
 *   - window.state.groupItineraries / window.state.group?.roomId
 *   - window.openSheet, window.toast, window.t
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  // ─── Wrapper su mergeGroupItinerary per estrarre conflicts reali ─────

  function _extractFieldsToCompare(poi) {
    // Estraggo campi "user-visible" — se sono semplici scalari sono confrontabili.
    const fields = ['name', 'notes', 'category', 'cat', 'time', 'day',
                    'cost', 'duration', 'openingHours', 'opening_hours',
                    'address', 'phone', 'website', 'tag'];
    const out = {};
    fields.forEach(f => {
      if (poi == null) return;
      const v = poi[f];
      if (v != null && typeof v !== 'object') out[f] = v;
    });
    return out;
  }

  function _diffConflicts(localItin, remoteItin, mergedItin) {
    const conflicts = [];
    if (!localItin?.pois || !remoteItin?.pois || !mergedItin?.pois) return conflicts;

    const remoteMap = new Map();
    remoteItin.pois.forEach(p => {
      const id = p?.googlePlaceId || p?.id;
      if (id) remoteMap.set(id, p);
    });
    const mergedMap = new Map();
    mergedItin.pois.forEach(p => {
      const id = p?.googlePlaceId || p?.id;
      if (id) mergedMap.set(id, p);
    });

    localItin.pois.forEach(localPoi => {
      const id = localPoi?.googlePlaceId || localPoi?.id;
      if (!id) return;
      const remotePoi = remoteMap.get(id);
      const mergedPoi = mergedMap.get(id);
      if (!remotePoi || !mergedPoi) return; // POI solo da una parte: non è un conflict di campo

      const localFields = _extractFieldsToCompare(localPoi);
      const remoteFields = _extractFieldsToCompare(remotePoi);
      const mergedFields = _extractFieldsToCompare(mergedPoi);

      Object.keys(localFields).forEach(field => {
        const lv = localFields[field];
        const rv = remoteFields[field];
        const mv = mergedFields[field];
        // Se entrambi presenti e diversi, e il merge ha scelto un vincitore concreto
        if (lv !== rv && lv != null && rv != null) {
          const winner = (mv === lv) ? 'local' : (mv === rv) ? 'remote' : 'unknown';
          // Riportiamo solo conflitti dove c'è una vera divergenza e il merge ha preso una decisione
          if (winner !== 'unknown') {
            conflicts.push({
              poiId: id,
              poiName: localPoi.name || localPoi.poi_name || remotePoi.name || id,
              field, local: lv, remote: rv, winner,
              ts: Date.now()
            });
          }
        }
      });
    });

    return conflicts;
  }

  function _installMergeWrapper() {
    const original = window.mergeGroupItinerary;
    if (typeof original !== 'function') {
      // app-core non ancora caricato — riprova
      return false;
    }
    if (original.__conflictWrapped) return true;

    const wrapped = function (localItin, remoteItin) {
      const merged = original.apply(this, arguments);
      try {
        const conflicts = _diffConflicts(localItin, remoteItin, merged);
        if (conflicts.length > 0) {
          const itinId = (merged && merged.id) || (localItin && localItin.id) || (remoteItin && remoteItin.id);
          if (itinId && typeof window.recordMergeConflict === 'function') {
            window.recordMergeConflict(itinId, conflicts);
            console.log('[conflict-resolver] registered', conflicts.length, 'conflicts for', itinId);
            _notifyNewConflicts(conflicts.length, itinId);
          }
        }
      } catch (e) {
        console.warn('[conflict-resolver] wrapper threw:', e);
      }
      return merged;
    };
    wrapped.__conflictWrapped = true;
    window.mergeGroupItinerary = wrapped;
    return true;
  }

  function _notifyNewConflicts(count, itinId) {
    if (typeof window.toast === 'function') {
      const msg = `⚠️ ${count} ${count === 1 ? T('cr.toastOne', 'modifica sovrascritta dal gruppo') : T('cr.toastMany', 'modifiche sovrascritte dal gruppo')}`;
      window.toast(msg);
    }
    // Emit custom event per UI badge
    try {
      window.dispatchEvent(new CustomEvent('conflicts_recorded', { detail: { count, itinId } }));
    } catch (_) {}
  }

  // ─── Collect & metadata ──────────────────────────────────────────────

  function collect() {
    const itineraries = window.state?.groupItineraries || {};
    const myRoom = window.state?.group?.roomId;
    const out = [];

    Object.values(itineraries).forEach(itin => {
      if (myRoom && itin.groupId && itin.groupId !== myRoom) return;
      const info = itin.lastMergeConflicts;
      if (!info || !Array.isArray(info.details) || info.details.length === 0) return;
      out.push({
        itineraryId: itin.id,
        groupId: itin.groupId,
        timestamp: info.timestamp,
        details: info.details.slice() // copy
      });
    });

    // Sort: più recenti in cima
    out.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return out;
  }

  function totalUnresolvedCount() {
    return collect().reduce((s, g) => s + (Array.isArray(g.details) ? g.details.length : 0), 0);
  }

  // ─── Actions ─────────────────────────────────────────────────────────

  function keepMine(itineraryId, poiId, field, localValue) {
    if (typeof window.updatePOIFieldInGroupItinerary !== 'function') {
      if (typeof window.toast === 'function') window.toast('❌ ' + T('cr.updateMissing', 'API update non disponibile'));
      return false;
    }
    try {
      window.updatePOIFieldInGroupItinerary(itineraryId, poiId, field, localValue);
      // Rimuovi il conflict risolto dai dettagli
      dismissOne(itineraryId, poiId, field);
      if (typeof window.toast === 'function') window.toast('↩️ ' + T('cr.kept', 'Valore tuo applicato'));
      return true;
    } catch (e) {
      console.error('[conflict-resolver] keepMine failed:', e);
      if (typeof window.toast === 'function') window.toast('❌ ' + T('cr.updateFailed', 'Override fallito'));
      return false;
    }
  }

  function dismissOne(itineraryId, poiId, field) {
    const itin = window.state?.groupItineraries?.[itineraryId];
    if (!itin?.lastMergeConflicts?.details) return false;
    const before = itin.lastMergeConflicts.details.length;
    itin.lastMergeConflicts.details = itin.lastMergeConflicts.details.filter(
      c => !(c.poiId === poiId && c.field === field)
    );
    itin.lastMergeConflicts.resolvedCount = itin.lastMergeConflicts.details.length;
    if (itin.lastMergeConflicts.details.length === 0) {
      delete itin.lastMergeConflicts;
    }
    window.saveState?.();
    return itin.lastMergeConflicts ? before !== itin.lastMergeConflicts.details.length : true;
  }

  function dismiss(itineraryId) {
    const itin = window.state?.groupItineraries?.[itineraryId];
    if (!itin?.lastMergeConflicts) return false;
    delete itin.lastMergeConflicts;
    window.saveState?.();
    return true;
  }

  function dismissAll() {
    const itineraries = window.state?.groupItineraries || {};
    const myRoom = window.state?.group?.roomId;
    let removed = 0;
    Object.values(itineraries).forEach(itin => {
      if (myRoom && itin.groupId && itin.groupId !== myRoom) return;
      if (itin.lastMergeConflicts) {
        delete itin.lastMergeConflicts;
        removed++;
      }
    });
    if (removed) window.saveState?.();
    return removed;
  }

  // ─── UI ──────────────────────────────────────────────────────────────

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _fmtValue(v) {
    if (v == null) return '<em style="opacity:.6">vuoto</em>';
    const s = String(v);
    if (s.length > 80) return _esc(s.slice(0, 80)) + '…';
    return _esc(s);
  }

  function _fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openPanel() {
    if (typeof window.openSheet !== 'function') {
      console.warn('[conflict-resolver] window.openSheet non disponibile');
      return;
    }

    const groups = collect();

    if (groups.length === 0) {
      const empty = `
        <div style="padding:24px 14px;text-align:center;color:var(--l-muted);font-size:13px;line-height:1.6;">
          <div style="font-size:36px;margin-bottom:8px;">✅</div>
          <p style="margin:0;">${T('cr.empty', 'Nessun conflitto da rivedere.')}</p>
          <p style="margin:6px 0 0;font-size:11.5px;color:var(--l-faint);">
            ${T('cr.emptyHint', 'Apparirà qui se qualcun altro nel gruppo sovrascrive una tua modifica.')}
          </p>
        </div>
      `;
      window.openSheet(T('cr.title', '⚖️ Conflitti di sincronizzazione'), empty);
      return;
    }

    let blocksHtml = groups.map(g => {
      const rows = g.details.map((c, i) => {
        const winnerLabel = c.winner === 'remote'
          ? T('cr.remoteWon', 'Vince il valore del gruppo')
          : T('cr.localWon', 'Vince il tuo valore');
        const winnerColor = c.winner === 'remote' ? '#c8313e' : '#15803d';
        return `
          <div style="
            padding:12px 14px;background:rgba(20,30,60,0.03);
            border:1px solid var(--l-hair);border-radius:10px;
            display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;">
              <div style="font-weight:700;color:var(--l-ink);font-size:13px;">${_esc(c.poiName)}</div>
              <code style="background:rgba(20,30,60,0.06);padding:2px 8px;border-radius:4px;font-size:11px;color:var(--l-muted);">${_esc(c.field)}</code>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px;">
              <div style="padding:8px;background:rgba(22,163,74,0.08);border:1px solid rgba(22,163,74,0.25);border-radius:6px;">
                <div style="font-size:10px;color:#15803d;font-weight:700;letter-spacing:.5px;margin-bottom:3px;">${T('cr.mine', 'TUO')}</div>
                <div style="color:var(--l-ink);word-break:break-word;">${_fmtValue(c.local)}</div>
              </div>
              <div style="padding:8px;background:rgba(255,180,80,0.10);border:1px solid rgba(255,180,80,0.3);border-radius:6px;">
                <div style="font-size:10px;color:#8a5a10;font-weight:700;letter-spacing:.5px;margin-bottom:3px;">${T('cr.theirs', 'GRUPPO')}</div>
                <div style="color:var(--l-ink);word-break:break-word;">${_fmtValue(c.remote)}</div>
              </div>
            </div>
            <div style="font-size:11px;color:${winnerColor};font-weight:600;">→ ${winnerLabel}</div>
            <div style="display:flex;gap:8px;">
              <button data-cr-keep="${_esc(g.itineraryId)}|${_esc(c.poiId)}|${_esc(c.field)}|${_esc(c.local)}"
                style="
                  flex:1;padding:8px 10px;background:rgba(22,163,74,0.16);
                  border:1.5px solid rgba(22,163,74,0.45);border-radius:6px;
                  color:#15803d;font-size:11.5px;font-weight:600;cursor:pointer;">
                ↩️ ${T('cr.keepMine', 'Tieni la mia')}
              </button>
              <button data-cr-dismiss-one="${_esc(g.itineraryId)}|${_esc(c.poiId)}|${_esc(c.field)}"
                style="
                  flex:1;padding:8px 10px;background:rgba(20,30,60,0.04);
                  border:1.5px solid var(--l-hair);border-radius:6px;
                  color:var(--l-ink);font-size:11.5px;font-weight:600;cursor:pointer;">
                ✓ ${T('cr.acceptAuto', 'Accetta scelta')}
              </button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="display:flex;flex-direction:column;gap:10px;padding:12px;background:rgba(20,30,60,0.02);border:1px solid var(--l-hair);border-radius:12px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">
            <div style="font-size:11.5px;color:var(--l-muted);font-family:'SF Mono',Menlo,monospace;">${_esc(g.itineraryId)}</div>
            <div style="font-size:10.5px;color:var(--l-faint);">${_fmtTime(g.timestamp)}</div>
          </div>
          ${rows}
          <button data-cr-dismiss-all="${_esc(g.itineraryId)}" style="
            margin-top:6px;padding:7px 10px;background:rgba(20,30,60,0.03);
            border:1.5px solid var(--l-hair);border-radius:6px;
            color:var(--l-muted);font-size:11px;cursor:pointer;">
            ${T('cr.dismissGroup', 'Ho visto, nascondi tutti questi')}
          </button>
        </div>
      `;
    }).join('');

    const totalCount = groups.reduce((s, g) => s + g.details.length, 0);
    const html = `
      <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;">
        <p style="margin:0 0 8px 0;color:var(--l-muted);font-size:12px;line-height:1.5;">
          ${T('cr.intro', 'Le tue modifiche sono state automaticamente sovrascritte da quelle di altri membri del gruppo (last-write-wins via CRDT). Qui puoi rivedere ognuna e, se vuoi, riapplicare il tuo valore.')}
        </p>
        <p style="margin:0 0 12px 0;font-size:11.5px;color:var(--l-muted);">
          ${totalCount} ${T('cr.itemsToReview', 'conflitti da rivedere')}
        </p>
        ${blocksHtml}
      </div>
    `;

    window.openSheet(T('cr.title', '⚖️ Conflitti di sincronizzazione'), html);

    setTimeout(() => {
      document.querySelectorAll('[data-cr-keep]').forEach(btn => {
        btn.onclick = () => {
          const [itinId, poiId, field, localValue] = btn.getAttribute('data-cr-keep').split('|');
          if (keepMine(itinId, poiId, field, localValue)) openPanel();
        };
      });
      document.querySelectorAll('[data-cr-dismiss-one]').forEach(btn => {
        btn.onclick = () => {
          const [itinId, poiId, field] = btn.getAttribute('data-cr-dismiss-one').split('|');
          dismissOne(itinId, poiId, field);
          openPanel();
        };
      });
      document.querySelectorAll('[data-cr-dismiss-all]').forEach(btn => {
        btn.onclick = async () => {
          const itinId = btn.getAttribute('data-cr-dismiss-all');
          const ok = await (window.modalConfirm || confirm)(T('cr.confirmDismiss', 'Nascondere tutti i conflitti di questo itinerario?'), { confirmText: 'Nascondi' });
          if (ok) {
            dismiss(itinId);
            openPanel();
          }
        };
      });
    }, 30);
  }

  // ─── Install wrapper at boot (retry until app-core ready) ────────────

  function _bootInstall() {
    if (_installMergeWrapper()) return;
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (_installMergeWrapper() || tries > 30) clearInterval(iv);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootInstall);
  } else {
    _bootInstall();
  }

  window.ConflictResolver = { collect, openPanel, keepMine, dismiss, dismissAll, dismissOne, totalUnresolvedCount };
  window.openConflictResolver = openPanel;
})();
