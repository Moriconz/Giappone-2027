/**
 * itinerary-snapshots.js — Snapshot/branch dell'itinerario personale
 *
 * Permette di:
 *   1. Salvare l'itinerario corrente come "versione" con un nome
 *   2. Vedere la lista delle versioni salvate (data, nome, n° POI, n° giorni)
 *   3. Ripristinare una versione precedente (con conferma)
 *
 * Storage isolato: chiave localStorage `giappone2027_snapshots_v1`.
 * Max 10 snapshot, rotazione FIFO sul push.
 *
 * NON sostituisce l'infrastruttura `itineraryVersionHistory` di app-core
 * (quella opera sul CRDT undo-stack del **gruppo**). Questo modulo è
 * pensato per l'itinerario **personale** del singolo utente: "voglio provare
 * a riorganizzare il day 4 ma se va male torno indietro".
 *
 * Esposto come window.ItinerarySnapshots = { save, list, restore, remove,
 * openPanel }, più window.openSnapshotsPanel() per il bottone UI.
 *
 * Dipendenze esterne (tutte su window):
 *   - window.state, window.saveState()
 *   - window.openSheet(t, html), window.closeSheet?
 *   - window.toast(msg)
 *   - window.renderItineraryUnified?.()  per re-render dopo restore
 *   - window.t(key, fallback)  i18n con fallback IT
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  const STORAGE_KEY = 'giappone2027_snapshots_v1';
  const AUTO_STORAGE_KEY = 'giappone2027_auto_snapshots_v1';
  const MAX_SNAPSHOTS = 10;
  const MAX_AUTO_SNAPSHOTS = 5;

  function _read(key) {
    try {
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('[snapshots] read failed:', e);
      return [];
    }
  }

  function _write(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('[snapshots] write failed:', e);
      if (typeof window.toast === 'function') window.toast(T('snap.storageFull', '❌ Spazio esaurito, impossibile salvare'));
      return false;
    }
  }

  // Backward-compat shims
  function _readAll() { return _read(STORAGE_KEY); }
  function _writeAll(list) { return _write(STORAGE_KEY, list); }
  function _readAuto() { return _read(AUTO_STORAGE_KEY); }
  function _writeAuto(list) { return _write(AUTO_STORAGE_KEY, list); }

  // Genera id unico (timestamp + random suffix)
  function _newId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  // Conta POI totali in un itineraryByDay
  function _countPOIs(ibd) {
    if (!ibd || typeof ibd !== 'object') return 0;
    return Object.values(ibd).reduce((s, day) => s + (Array.isArray(day) ? day.length : 0), 0);
  }
  function _countDays(ibd) {
    if (!ibd || typeof ibd !== 'object') return 0;
    return Object.values(ibd).filter(d => Array.isArray(d) && d.length > 0).length;
  }

  // Snapshot: deep-clone dell'itineraryByDay + tripProfile
  function save(name) {
    const ibd = window.state?.itineraryByDay || {};
    if (_countPOIs(ibd) === 0) {
      if (typeof window.toast === 'function') window.toast(T('snap.emptyItin', '⚠️ Itinerario vuoto, nulla da salvare'));
      return null;
    }

    const list = _readAll();
    const snap = {
      id: _newId(),
      name: (name || `Versione ${list.length + 1}`).slice(0, 60),
      timestamp: Date.now(),
      poiCount: _countPOIs(ibd),
      dayCount: _countDays(ibd),
      data: {
        itineraryByDay: JSON.parse(JSON.stringify(ibd)),
        tripProfile: window.state?.tripProfile ? JSON.parse(JSON.stringify(window.state.tripProfile)) : null
      }
    };

    list.unshift(snap); // più recente in cima
    while (list.length > MAX_SNAPSHOTS) list.pop();
    if (_writeAll(list)) {
      if (typeof window.toast === 'function') window.toast(`✅ Snapshot "${snap.name}" salvato`);
      return snap;
    }
    return null;
  }

  function list() {
    // Restituisce metadata senza il payload pesante
    return _readAll().map(s => ({
      id: s.id,
      name: s.name,
      timestamp: s.timestamp,
      poiCount: s.poiCount,
      dayCount: s.dayCount,
      isAuto: false
    }));
  }

  function listAuto() {
    return _readAuto().map(s => ({
      id: s.id,
      name: s.name,
      timestamp: s.timestamp,
      poiCount: s.poiCount,
      dayCount: s.dayCount,
      reason: s.reason,
      isAuto: true
    }));
  }

  function listAll() {
    // Manuali + auto, ordinati per timestamp desc (più recenti in cima)
    return [...list(), ...listAuto()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  // Salva uno snapshot automatico, silenzioso, con motivo associato.
  // Pensato per essere chiamato prima di operazioni distruttive
  // (restore, importSharedItinerary, optimizeDay).
  // Store separato + max 5 FIFO (gli auto si rinnovano da soli).
  function saveAuto(reason) {
    const ibd = window.state?.itineraryByDay || {};
    if (_countPOIs(ibd) === 0) return null; // nulla da salvare

    const list = _readAuto();
    const reasonLabel = (() => {
      switch (reason) {
        case 'restore-snapshot': return 'Prima di ripristino';
        case 'import-share-link': return 'Prima di import link';
        case 'optimize-day': return 'Prima di ottimizzazione';
        default: return reason ? `Auto: ${reason}` : 'Auto';
      }
    })();

    const snap = {
      id: _newId(),
      name: reasonLabel,
      reason: reason || 'auto',
      timestamp: Date.now(),
      poiCount: _countPOIs(ibd),
      dayCount: _countDays(ibd),
      data: {
        itineraryByDay: JSON.parse(JSON.stringify(ibd)),
        tripProfile: window.state?.tripProfile ? JSON.parse(JSON.stringify(window.state.tripProfile)) : null
      }
    };

    list.unshift(snap);
    while (list.length > MAX_AUTO_SNAPSHOTS) list.pop();
    if (_writeAuto(list)) {
      console.log('[snapshots] auto-save:', reasonLabel, `(${snap.poiCount} POI)`);
      return snap;
    }
    return null;
  }

  // restore() cerca in entrambi gli store (manuali + auto).
  function _findById(id) {
    const fromManual = _readAll().find(s => s.id === id);
    if (fromManual) return { snap: fromManual, isAuto: false };
    const fromAuto = _readAuto().find(s => s.id === id);
    if (fromAuto) return { snap: fromAuto, isAuto: true };
    return null;
  }

  function restore(id) {
    const found = _findById(id);
    if (!found) {
      if (typeof window.toast === 'function') window.toast(T('snap.notFound', '❌ Snapshot non trovato'));
      return false;
    }
    if (!window.state) return false;

    // Auto-save dello stato corrente PRIMA di sovrascrivere (meta-snapshot)
    try { saveAuto('restore-snapshot'); } catch (_) {}

    const snap = found.snap;
    try {
      window.state.itineraryByDay = JSON.parse(JSON.stringify(snap.data.itineraryByDay || {}));
      if (snap.data.tripProfile) {
        window.state.tripProfile = JSON.parse(JSON.stringify(snap.data.tripProfile));
      }
      window.saveState?.();
      window.renderItineraryUnified?.();
      if (typeof window.toast === 'function') window.toast(`✅ Ripristinato: ${snap.name}`);
      return true;
    } catch (e) {
      console.error('[snapshots] restore failed:', e);
      if (typeof window.toast === 'function') window.toast(T('snap.restoreFailed', '❌ Ripristino fallito'));
      return false;
    }
  }

  function remove(id) {
    // Prova prima nei manuali, poi negli auto
    const manuals = _readAll();
    const fmanuals = manuals.filter(s => s.id !== id);
    if (fmanuals.length !== manuals.length) {
      _writeAll(fmanuals);
      if (typeof window.toast === 'function') window.toast(T('snap.deleted', '🗑️ Snapshot eliminato'));
      return true;
    }
    const autos = _readAuto();
    const fautos = autos.filter(s => s.id !== id);
    if (fautos.length !== autos.length) {
      _writeAuto(fautos);
      if (typeof window.toast === 'function') window.toast(T('snap.autoDeleted', '🗑️ Auto-snapshot eliminato'));
      return true;
    }
    return false;
  }

  // ─── UI ───────────────────────────────────────────────────────────────

  function _fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openPanel() {
    if (typeof window.openSheet !== 'function') {
      console.warn('[snapshots] window.openSheet non disponibile');
      return;
    }
    const items = listAll();
    const T = (k, f) => (typeof window.t === 'function' ? window.t(k, f) : f);

    const empty = items.length === 0
      ? `<p style="color:var(--l-muted);text-align:center;padding:24px 12px;font-size:15px;">
          ${T('snap.empty', 'Nessuno snapshot salvato. Usa "💾 Salva versione" per crearne uno.')}
         </p>`
      : '';

    const rows = items.map(s => {
      // Auto-snapshot: bordo + bg leggermente diversi + badge "🤖 Auto"
      const cardBg = s.isAuto ? 'rgba(255,180,80,0.10)' : 'rgba(20,30,60,0.03)';
      const cardBorder = s.isAuto ? 'rgba(255,180,80,0.35)' : 'var(--l-hair)';
      const badge = s.isAuto
        ? `<span style="display:inline-block;padding:2px 7px;background:rgba(255,180,80,0.22);border:1px solid rgba(255,180,80,0.45);border-radius:999px;font-size:12px;font-weight:700;color:#8a5a10;letter-spacing:.4px;margin-right:4px;">🤖 ${T('snap.autoBadge', 'AUTO')}</span>`
        : '';
      return `
      <div data-snap-id="${_esc(s.id)}" style="
        padding:12px 14px;background:${cardBg};
        border:1px solid ${cardBorder};border-radius:10px;
        display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;">
          <div style="font-weight:700;color:var(--l-ink);font-size:16px;">${badge}${_esc(s.name)}</div>
          <div style="font-size:13px;color:var(--l-muted);font-family:'SF Mono',Menlo,monospace;">${_fmtTime(s.timestamp)}</div>
        </div>
        <div style="font-size:14px;color:var(--l-muted);">
          📍 ${s.poiCount} POI · 📅 ${s.dayCount} ${s.dayCount === 1 ? 'giorno' : 'giorni'}
        </div>
        <div style="display:flex;gap:8px;">
          <button data-snap-restore="${_esc(s.id)}" style="
            flex:1;padding:8px 12px;background:rgba(22,163,74,0.16);
            border:1.5px solid rgba(22,163,74,0.5);border-radius:6px;
            color:#15803d;font-weight:600;font-size:14px;cursor:pointer;">
            ${T('snap.restore', '↩️ Ripristina')}
          </button>
          <button data-snap-delete="${_esc(s.id)}" style="
            padding:8px 12px;background:var(--l-accent-soft);
            border:1.5px solid var(--l-accent-brd);border-radius:6px;
            color:var(--l-accent-600);font-weight:600;font-size:14px;cursor:pointer;">
            🗑️
          </button>
        </div>
      </div>
      `;
    }).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0;">
        <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
          <p style="color:var(--l-muted);font-size:14px;margin:0;flex:1;min-width:180px;">
            ${T('snap.intro', 'Salva versioni del tuo itinerario prima di provare modifiche.')}
          </p>
          <button id="snap-save-new" style="
            padding:8px 14px;background:linear-gradient(135deg,var(--m-accent),#FF5E1F);
            border:none;border-radius:8px;color:#fff;font-weight:700;font-size:14px;
            cursor:pointer;white-space:nowrap;">
            ${T('snap.saveNow', '💾 Salva versione ora')}
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${empty}
          ${rows}
        </div>
        <div style="font-size:12px;color:var(--l-faint);text-align:center;padding-top:8px;">
          ${T('snap.limit', `Massimo ${MAX_SNAPSHOTS} versioni — le più vecchie vengono rimosse automaticamente.`)}
        </div>
      </div>
    `;

    window.openSheet(T('snap.title', '📜 Versioni salvate'), html);

    // Bind handlers (deferred to next tick to ensure DOM ready)
    setTimeout(() => {
      const saveBtn = document.getElementById('snap-save-new');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const name = await (window.modalPrompt || ((msg, o) => Promise.resolve(prompt(msg, o?.defaultValue || ''))))(
            T('snap.askName', 'Nome della versione:'),
            { defaultValue: `Versione ${new Date().toLocaleDateString('it-IT')}` }
          );
          if (name === null) return;
          if (save(name || `Versione ${Date.now()}`)) {
            openPanel(); // refresh
          }
        };
      }
      document.querySelectorAll('[data-snap-restore]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-snap-restore');
          const ok = await (window.modalConfirm || confirm)(
            T('snap.confirmRestore', 'Sostituire l\'itinerario corrente con questa versione?\nL\'itinerario attuale andrà perso (puoi salvarlo prima come versione separata).'),
            { confirmText: 'Ripristina', danger: true }
          );
          if (ok) {
            restore(id);
            window.closeSheet?.();
          }
        };
      });
      document.querySelectorAll('[data-snap-delete]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-snap-delete');
          const ok = await (window.modalConfirm || confirm)(T('snap.confirmDelete', 'Eliminare questa versione?'), { danger: true, confirmText: 'Elimina' });
          if (ok) {
            remove(id);
            openPanel(); // refresh
          }
        };
      });
    }, 60);
  }

  // Wrapper "Salva versione veloce" — usato da un bottone separato (no panel)
  async function saveQuick() {
    const name = await (window.modalPrompt || ((msg, o) => Promise.resolve(prompt(msg, o?.defaultValue || ''))))(
      typeof window.t === 'function' ? window.t('snap.askName', 'Nome della versione:') : 'Nome della versione:',
      { defaultValue: `Versione ${new Date().toLocaleDateString('it-IT')}` }
    );
    if (name === null) return null;
    return save(name || `Versione ${Date.now()}`);
  }

  window.ItinerarySnapshots = {
    save, saveAuto,
    list, listAuto, listAll,
    restore, remove, openPanel,
    MAX_SNAPSHOTS, MAX_AUTO_SNAPSHOTS
  };
  window.openSnapshotsPanel = openPanel;
  window.saveItinerarySnapshot = saveQuick;
  window.saveItineraryAutoSnapshot = saveAuto;
})();
