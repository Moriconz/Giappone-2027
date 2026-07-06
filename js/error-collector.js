/**
 * error-collector.js — Raccolta errori runtime, 100% locale (no Sentry/cloud)
 *
 * Alternativa privacy-friendly a §6.12 (Sentry): per un'app "tra amici" non
 * vogliamo inviare stack-trace a servizi esterni. Questo modulo cattura gli
 * errori in un ring buffer locale (max 50) persistito in localStorage, così
 * se un amico segnala "mi è crashato" può aprire il pannello e leggere/copiare
 * gli ultimi errori — senza che nulla esca dal device.
 *
 * Caricato il prima possibile (in <head>) per catturare anche gli errori di boot.
 *
 * Esposto:
 *   - window.ErrorCollector = { record, getErrors, clear, openPanel, count }
 *
 * Pannello accessibile da window.ErrorCollector.openPanel() (o auto-hint in ?debug).
 */
(function () {
  'use strict';

  const KEY = 'gj2027_errors_v1';
  const MAX = 50;

  function _read() {
    try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (_) { return []; }
  }
  function _write(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX))); } catch (_) {}
  }

  function record(entry) {
    if (!entry || !entry.message) return;
    const arr = _read();
    // Dedup: stesso message+line negli ultimi 3s → ignora (evita loop di errori)
    const now = Date.now();
    const dup = arr.some(e => e.message === entry.message && e.line === entry.line && (now - e.ts) < 3000);
    if (dup) return;
    arr.push({
      message: String(entry.message).slice(0, 500),
      source: entry.source ? String(entry.source).slice(0, 200) : '',
      line: entry.line || 0,
      col: entry.col || 0,
      stack: entry.stack ? String(entry.stack).slice(0, 1500) : '',
      kind: entry.kind || 'error',
      url: location.pathname + location.search,
      ts: now
    });
    _write(arr);
  }

  function getErrors() { return _read(); }
  function count() { return _read().length; }
  function clear() { _write([]); }

  // ─── Listeners (installati subito) ───────────────────────────────────
  window.addEventListener('error', (e) => {
    // Ignora errori di risorse (img/script 404) che hanno e.message vuoto
    if (e && e.message) {
      record({ message: e.message, source: e.filename, line: e.lineno, col: e.colno, stack: e.error?.stack, kind: 'error' });
    } else if (e && e.target && (e.target.src || e.target.href)) {
      record({ message: 'Resource failed: ' + (e.target.src || e.target.href), kind: 'resource' });
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason;
    record({
      message: 'Unhandled promise: ' + (reason?.message || String(reason)).slice(0, 200),
      stack: reason?.stack,
      kind: 'promise'
    });
  });

  // ─── UI panel ────────────────────────────────────────────────────────
  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function _fmtTime(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function openPanel() {
    const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
    if (typeof window.openSheet !== 'function') { console.table(_read()); return; }
    const errs = _read().slice().reverse();

    const body = errs.length === 0
      ? `<div style="padding:24px 14px;text-align:center;color:rgba(255,255,255,0.55);font-size:15px;">
           <div style="font-size:36px;margin-bottom:8px;">✅</div>
           <p style="margin:0;">${T('err.empty', 'Nessun errore registrato. Tutto liscio!')}</p>
         </div>`
      : errs.map(e => {
          const tone = e.kind === 'promise' ? '#ffb088' : e.kind === 'resource' ? '#a5cdff' : '#ffb0b0';
          return `
          <div style="padding:10px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-left:3px solid ${tone};border-radius:8px;">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">
              <span style="font-size:12px;font-weight:700;color:${tone};text-transform:uppercase;letter-spacing:.4px;">${e.kind}</span>
              <span style="font-size:12px;color:rgba(255,255,255,0.45);font-family:'SF Mono',Menlo,monospace;">${_fmtTime(e.ts)}</span>
            </div>
            <div style="font-size:14px;color:#fff;margin-top:4px;word-break:break-word;">${_esc(e.message)}</div>
            ${e.source ? `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px;font-family:'SF Mono',Menlo,monospace;">${_esc(e.source)}:${e.line}:${e.col}</div>` : ''}
            ${e.stack ? `<details style="margin-top:5px;"><summary style="font-size:12px;color:rgba(255,255,255,0.5);cursor:pointer;">stack</summary><pre style="font-size:12px;color:rgba(255,255,255,0.6);white-space:pre-wrap;word-break:break-word;margin:4px 0 0;">${_esc(e.stack)}</pre></details>` : ''}
          </div>`;
        }).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span style="font-size:14px;color:rgba(255,255,255,0.6);">${errs.length} ${T('err.count', 'errori registrati (solo locali)')}</span>
          <div style="display:flex;gap:6px;">
            <button id="err-copy" style="padding:6px 11px;background:rgba(100,150,255,0.2);border:1px solid rgba(100,150,255,0.45);border-radius:6px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">📋 ${T('err.copy', 'Copia')}</button>
            <button id="err-clear" style="padding:6px 11px;background:rgba(255,107,107,0.18);border:1px solid rgba(255,107,107,0.4);border-radius:6px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">🗑️ ${T('err.clear', 'Pulisci')}</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${body}</div>
        <p style="font-size:12px;color:rgba(255,255,255,0.50);text-align:center;margin-top:6px;">${T('err.privacy', 'Gli errori restano sul tuo dispositivo. Nessun invio esterno.')}</p>
      </div>
    `;
    window.openSheet(T('err.title', '🐞 Errori (debug)'), html);

    setTimeout(() => {
      const copyBtn = document.getElementById('err-copy');
      if (copyBtn) copyBtn.onclick = () => {
        const txt = _read().map(e => `[${new Date(e.ts).toISOString()}] (${e.kind}) ${e.message}${e.source ? ' @ ' + e.source + ':' + e.line : ''}${e.stack ? '\n' + e.stack : ''}`).join('\n\n');
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(() => window.toast?.('📋 ' + T('err.copied', 'Errori copiati')));
        else window.toast?.(T('err.copyManual', '⚠️ Copia non disponibile — apri la console'));
      };
      const clearBtn = document.getElementById('err-clear');
      if (clearBtn) clearBtn.onclick = () => { clear(); openPanel(); window.toast?.('🗑️ ' + T('err.cleared', 'Log errori pulito')); };
    }, 40);
  }

  window.ErrorCollector = { record, getErrors, clear, openPanel, count };

  // In modalità debug, se ci sono errori accumulati, log in console all'avvio
  if (window.DEBUG) {
    const n = count();
    if (n > 0) console.warn(`[ErrorCollector] ${n} errori in archivio locale. window.ErrorCollector.openPanel()`);
  }
})();
