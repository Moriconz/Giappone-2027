// ============================================================================
// UI-HELPERS.JS — Global UI functions for features
// ============================================================================

console.log('[UI] Loading helpers...');

// ============================================================================
// renderAIChat() — Update AI messages in current sheet
// Used by Feature 3 (Gemini AI) to re-render messages
// ============================================================================

function renderAIChat() {
  const msgsEl = document.getElementById('ai-msgs');
  if (!msgsEl) return; // Not in AI view currently

  const history = window.aiHistory || [];
  if (!history.length) {
    msgsEl.innerHTML = `<div class="ai-msg placeholder">Inizia scrivendo la tua domanda qui sotto o usa uno dei prompt rapidi.</div>`;
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return;
  }

  const historyHTML = history.map(m =>
    `<div class="ai-msg ${m.role === 'user' ? 'user' : 'ai'}">${m.role === 'user' ? escapeHtml(m.content) : formatAIReply(m.content)}</div>`
  ).join('');

  msgsEl.innerHTML = historyHTML;
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatAIReply(text) {
  // Basic markdown → HTML: **bold**, bullet lines, newlines
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n•\s?/g, '\n• ')
    .replace(/\n-\s/g, '\n• ')
    .replace(/\n/g, '<br>');
}

// ============================================================================
// Export functions to window
// ============================================================================

window.renderAIChat = renderAIChat;
window.escapeHtml = escapeHtml;
window.formatAIReply = formatAIReply;

console.log('[UI] Helpers loaded ✓');
