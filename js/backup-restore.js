// ============================================================================
// BACKUP-RESTORE.JS — Full state export / import
// Protects against localStorage loss (phone change, browser data wipe)
// ============================================================================

const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

const BACKUP_VERSION = 1;
const BACKUP_FIELDS = [
  'itinerary',
  'itineraryByDay',
  'groupItineraries',
  'savedPOIs',
  'notes',
  'customEvents',
  'bookings',
  'group',
  '_schemaVersion',
];

function _collect() {
  const s = window.state || {};
  const payload = { _backupVersion: BACKUP_VERSION };
  BACKUP_FIELDS.forEach(k => {
    if (s[k] !== undefined) payload[k] = s[k];
  });
  return payload;
}

function _summarize(payload) {
  const ibd = payload.itineraryByDay || {};
  const itinCount = Object.values(ibd).flat().length || (payload.itinerary || []).length;
  const saved = payload.savedPOIs || [];
  const notes = Object.keys(payload.notes || {});
  const groups = Object.keys(payload.groupItineraries || {});
  const custom = (payload.customEvents || []).length;
  const lines = [];
  if (itinCount) lines.push(`${itinCount} tappe nell'itinerario personale`);
  if (groups.length) lines.push(`${groups.length} itinerari di gruppo`);
  if (saved.length) lines.push(`${saved.length} POI salvati`);
  if (notes.length) lines.push(`${notes.length} note`);
  if (custom) lines.push(`${custom} eventi personalizzati`);
  return lines.length ? lines.join(' · ') : 'Backup vuoto';
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportBackup() {
  const payload = _collect();
  const summary = _summarize(payload);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `giappone2027-backup-${date}.json`;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);

  window.toast?.(T('backup.exported', '📦 Backup scaricato') + ' — ' + summary);
  console.log('[Backup] Exported:', filename, summary);
}

// ── Import ────────────────────────────────────────────────────────────────────

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let payload;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
    } catch (err) {
      (window.modalAlert || alert)('File non valido — impossibile leggere il backup.');
      return;
    }

    if (!payload || typeof payload !== 'object') {
      (window.modalAlert || alert)('Formato backup non riconosciuto.');
      return;
    }

    const ver = payload._backupVersion;
    if (ver !== BACKUP_VERSION) {
      (window.modalAlert || alert)(
        `Versione backup non compatibile (trovata: ${ver || '?'}, attesa: ${BACKUP_VERSION}).`
      );
      return;
    }

    const summary = _summarize(payload);
    const currentSummary = _summarize(_collect());

    const ok = await (window.modalConfirm || confirm)(
      `Ripristinare questo backup?\n\n📦 Backup: ${summary}\n📱 Attuale: ${currentSummary}\n\nI dati attuali verranno sovrascritti.`,
      { title: 'Ripristino backup', confirmText: 'Ripristina', danger: true }
    );
    if (!ok) return;

    // Auto-snapshot current state before overwriting
    window.ItinerarySnapshots?.saveAuto?.('pre-backup-restore');

    // Apply backup
    BACKUP_FIELDS.forEach(k => {
      if (payload[k] !== undefined) {
        window.state[k] = payload[k];
      }
    });

    window.saveState?.();

    window.toast?.(T('backup.restored', '✅ Backup ripristinato — ricarica l\'app per vedere le modifiche'));

    // Show reload prompt
    const reload = await (window.modalConfirm || confirm)(
      'Backup ripristinato con successo. Ricaricare l\'app ora?',
      { confirmText: 'Ricarica', cancelText: 'Più tardi' }
    );
    if (reload) window.location.reload();
  };

  input.click();
}

// ── Panel UI ──────────────────────────────────────────────────────────────────

function openBackupPanel() {
  const currentSummary = _summarize(_collect());
  const date = new Date().toISOString().slice(0, 10);

  const html = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0">

      <!-- Current state summary -->
      <div style="
        background: rgba(99,102,241,0.08);
        border: 1px solid rgba(99,102,241,0.2);
        border-radius: 12px;
        padding: 14px 16px;
      ">
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;">Stato attuale</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5">${currentSummary}</div>
      </div>

      <!-- Warning -->
      <div style="
        background: rgba(251,146,60,0.08);
        border: 1px solid rgba(251,146,60,0.2);
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 12px;
        color: rgba(251,146,60,0.9);
        line-height: 1.4;
      ">
        ⚠️ Tutti i dati sono in localStorage: cambiare browser o cancellare i dati del browser li cancella per sempre. Esporta un backup regolarmente.
      </div>

      <!-- Export button -->
      <button id="btn-backup-export" style="
        display: flex; align-items: center; gap: 10px;
        padding: 14px 16px;
        background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
        border: 1.5px solid rgba(99,102,241,0.4);
        border-radius: 12px;
        color: rgba(255,255,255,0.9);
        font-size: 14px; font-weight: 600;
        cursor: pointer; text-align: left; width: 100%;
        font-family: inherit;
      ">
        <span style="font-size:20px">📦</span>
        <div>
          <div>Esporta backup</div>
          <div style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.5);margin-top:2px">Scarica giappone2027-backup-${date}.json</div>
        </div>
      </button>

      <!-- Import button -->
      <button id="btn-backup-import" style="
        display: flex; align-items: center; gap: 10px;
        padding: 14px 16px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        color: rgba(255,255,255,0.75);
        font-size: 14px; font-weight: 600;
        cursor: pointer; text-align: left; width: 100%;
        font-family: inherit;
      ">
        <span style="font-size:20px">📂</span>
        <div>
          <div>Ripristina backup</div>
          <div style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.55);margin-top:2px">Carica un file .json precedentemente esportato</div>
        </div>
      </button>

    </div>
  `;

  window.openSheet?.('📦 Backup & Ripristino', html);

  setTimeout(() => {
    document.getElementById('btn-backup-export')?.addEventListener('click', exportBackup);
    document.getElementById('btn-backup-import')?.addEventListener('click', importBackup);
  }, 50);
}

window.BackupRestore = { export: exportBackup, import: importBackup, openPanel: openBackupPanel };
window.openBackupPanel = openBackupPanel;
