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
// MODAL DIALOGS — themed replacements for confirm / prompt / alert
// ============================================================================

const MODAL_CSS = `
  .app-modal-overlay {
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: _modalFadeIn .15s ease;
  }
  @keyframes _modalFadeIn { from { opacity:0; } to { opacity:1; } }
  .app-modal {
    background: linear-gradient(135deg, rgba(20,28,60,.97) 0%, rgba(30,40,80,.97) 100%);
    border: 1.5px solid rgba(255,255,255,.18);
    border-radius: 18px;
    padding: 24px 20px 20px;
    width: 100%; max-width: 360px;
    box-shadow: 0 16px 48px rgba(0,0,0,.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #fff;
    animation: _modalSlideUp .18s ease;
  }
  @keyframes _modalSlideUp { from { transform: translateY(12px); opacity:0; } to { transform: translateY(0); opacity:1; } }
  .app-modal__title { font-size: 15px; font-weight: 700; margin: 0 0 10px; }
  .app-modal__body { font-size: 13px; color: rgba(255,255,255,.8); line-height: 1.5; margin: 0 0 18px; white-space: pre-line; }
  .app-modal__input {
    width: 100%; box-sizing: border-box;
    padding: 10px 12px; font-size: 13px;
    background: rgba(255,255,255,.07); color: #fff;
    border: 1.5px solid rgba(255,255,255,.2); border-radius: 10px;
    margin-bottom: 16px; font-family: inherit; outline: none;
    transition: border-color .15s;
  }
  .app-modal__input:focus { border-color: rgba(99,102,241,.7); }
  .app-modal__input::placeholder { color: rgba(255,255,255,.35); }
  .app-modal__actions { display: flex; gap: 8px; justify-content: flex-end; }
  .app-modal__btn {
    padding: 9px 18px; border-radius: 10px; font-size: 13px;
    font-weight: 600; cursor: pointer; border: none; font-family: inherit;
    transition: opacity .15s, transform .1s;
  }
  .app-modal__btn:active { transform: scale(.96); opacity: .85; }
  .app-modal__btn--cancel {
    background: rgba(255,255,255,.08); color: rgba(255,255,255,.65);
  }
  .app-modal__btn--confirm {
    background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
  }
  .app-modal__btn--danger {
    background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff;
  }
`;

let _modalStyleInjected = false;
function _injectModalStyle() {
  if (_modalStyleInjected) return;
  const s = document.createElement('style');
  s.textContent = MODAL_CSS;
  document.head.appendChild(s);
  _modalStyleInjected = true;
}

/**
 * Async confirm dialog. Returns Promise<boolean>.
 * @param {string} message
 * @param {{ title?: string, confirmText?: string, cancelText?: string, danger?: boolean }} opts
 */
function modalConfirm(message, opts = {}) {
  _injectModalStyle();
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-modal-overlay';

    const confirmCls = opts.danger ? 'app-modal__btn--danger' : 'app-modal__btn--confirm';
    overlay.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true">
        ${opts.title ? `<div class="app-modal__title">${escapeHtml(opts.title)}</div>` : ''}
        <div class="app-modal__body">${escapeHtml(message)}</div>
        <div class="app-modal__actions">
          <button class="app-modal__btn app-modal__btn--cancel" data-action="cancel">${escapeHtml(opts.cancelText || 'Annulla')}</button>
          <button class="app-modal__btn ${confirmCls}" data-action="confirm">${escapeHtml(opts.confirmText || 'Conferma')}</button>
        </div>
      </div>`;

    overlay.addEventListener('click', e => {
      const action = e.target.dataset.action;
      if (action === 'confirm') { overlay.remove(); resolve(true); }
      else if (action === 'cancel' || e.target === overlay) { overlay.remove(); resolve(false); }
    });

    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="confirm"]').focus();
  });
}

/**
 * Async prompt dialog. Returns Promise<string|null> (null = cancelled).
 * @param {string} message
 * @param {{ title?: string, placeholder?: string, defaultValue?: string, confirmText?: string }} opts
 */
function modalPrompt(message, opts = {}) {
  _injectModalStyle();
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-modal-overlay';

    overlay.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true">
        ${opts.title ? `<div class="app-modal__title">${escapeHtml(opts.title)}</div>` : ''}
        <div class="app-modal__body">${escapeHtml(message)}</div>
        <input class="app-modal__input" type="text"
          placeholder="${escapeHtml(opts.placeholder || '')}"
          value="${escapeHtml(opts.defaultValue || '')}" />
        <div class="app-modal__actions">
          <button class="app-modal__btn app-modal__btn--cancel" data-action="cancel">${escapeHtml(opts.cancelText || 'Annulla')}</button>
          <button class="app-modal__btn app-modal__btn--confirm" data-action="confirm">${escapeHtml(opts.confirmText || 'OK')}</button>
        </div>
      </div>`;

    const input = overlay.querySelector('.app-modal__input');

    const submit = () => {
      const val = input.value.trim();
      overlay.remove();
      resolve(val.length ? val : null);
    };

    overlay.addEventListener('click', e => {
      const action = e.target.dataset.action;
      if (action === 'confirm') submit();
      else if (action === 'cancel' || e.target === overlay) { overlay.remove(); resolve(null); }
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') { overlay.remove(); resolve(null); }
    });

    document.body.appendChild(overlay);
    input.focus();
    input.select();
  });
}

/**
 * Async alert dialog. Returns Promise<void>.
 * @param {string} message
 * @param {{ title?: string, confirmText?: string }} opts
 */
function modalAlert(message, opts = {}) {
  _injectModalStyle();
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-modal-overlay';

    overlay.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true">
        ${opts.title ? `<div class="app-modal__title">${escapeHtml(opts.title)}</div>` : ''}
        <div class="app-modal__body">${escapeHtml(message)}</div>
        <div class="app-modal__actions">
          <button class="app-modal__btn app-modal__btn--confirm" data-action="ok">${escapeHtml(opts.confirmText || 'OK')}</button>
        </div>
      </div>`;

    overlay.addEventListener('click', e => {
      if (e.target.dataset.action === 'ok' || e.target === overlay) { overlay.remove(); resolve(); }
    });

    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="ok"]').focus();
  });
}

// ============================================================================
// Export functions to window
// ============================================================================

window.renderAIChat = renderAIChat;
window.escapeHtml = escapeHtml;
window.formatAIReply = formatAIReply;
window.modalConfirm = modalConfirm;
window.modalPrompt = modalPrompt;
window.modalAlert = modalAlert;

console.log('[UI] Helpers loaded ✓');
