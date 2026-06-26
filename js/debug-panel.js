// ============================================================================
// debug-panel.js — mobile debug panel + console overrides
// Extracted from app-core.js. Runs inside DOMContentLoaded (same timing).
// Deps: window.state (read-only)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const debugLogs = [];
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  let _pending = false;

  function addDebugLog(msg, type = 'log') {
    if (debugLogs.length > 20) debugLogs.shift();
    debugLogs.push({ msg, type, time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
    if (!_pending) {
      _pending = true;
      requestAnimationFrame(() => { updateDebugPanel(); _pending = false; });
    }
  }

  function updateDebugPanel() {
    const panel = document.getElementById('debug-panel');
    const contentEl = document.getElementById('debug-content');
    if (!panel || !contentEl) return;
    const hasErrors = debugLogs.some(l => l.type === 'error');
    const hasRelevant = debugLogs.some(l =>
      l.msg.includes('[MQTT]') || l.msg.includes('[Group]') ||
      l.msg.includes('[FirebaseRTDB]') || l.msg.includes('[GPS]')
    );
    const gpsActive = window.state?.gpsEnabled || window.state?.group;
    panel.style.display = (hasErrors || hasRelevant || gpsActive) ? 'block' : 'none';
    contentEl.innerHTML = debugLogs
      .filter(l =>
        l.msg.includes('[MQTT]') || l.msg.includes('[Group]') ||
        l.msg.includes('[FirebaseRTDB]') || l.msg.includes('[GPS]') ||
        l.type === 'error'
      )
      .map(l => `<div style="color:${l.type === 'error' ? '#FF6B6B' : '#00FF88'};margin:2px 0;word-break:break-all">[${l.time}] ${l.msg.substring(0, 150)}</div>`)
      .join('');
  }

  console.log = function (...args) { origLog(...args); addDebugLog(args.join(' ')); };
  console.error = function (...args) { origError(...args); addDebugLog(args.join(' '), 'error'); };
  console.warn = function (...args) { origWarn(...args); addDebugLog(args.join(' '), 'warn'); };
});
