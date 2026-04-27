/**
 * group-panel.js
 * Renderizza pannello Gruppo con:
 * - Lista membri connessi
 * - Toggle GPS sharing
 * - Exit/Delete room
 * - Chat gruppo (integrato)
 */

window.groupPanel = (() => {
  const FORCE_FAKE_GPS = false; // Phase 6: rimosso debug flag
  
  /**
   * Renderizza pannello gruppo
   */
  function renderGroupPanel() {
    const group = window.state?.group;
    if (!group || !group.roomId) {
      return '<p>Non sei in nessun gruppo.</p>';
    }
    
    const isCreator = group.isCreator;
    const members = group.members || [];
    const gpsEnabled = window.state?.gpsEnabled;
    
    const membersList = members.map(m => `
      <div style="display: flex; gap: 10px; align-items: center; padding: 8px; background: var(--surface-2); border-radius: 8px; margin-bottom: 8px;">
        <img src="${m.avatar || '👤'}" style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary);" />
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 14px;">${escapeHtml(m.name || 'Unnamed')}</div>
          <div style="font-size: 11px; color: var(--muted);">${m.peerId ? '🟢 Online' : '🔴 Offline'}</div>
        </div>
      </div>
    `).join('');
    
    const html = `
      <div style="padding: 14px;">
        
        <div class="section">
          <h3>🏠 Stanza: <strong>${escapeHtml(group.roomId)}</strong></h3>
          <p style="font-size: 12px; color: var(--muted); margin: 0;">
            Creata da: <strong>${escapeHtml(group.createdBy || 'Sconosciuto')}</strong>
          </p>
        </div>
        
        <div class="section">
          <h3>👥 Membri (${members.length})</h3>
          ${membersList || '<p style="color: var(--muted);">Nessun membro.</p>'}
        </div>
        
        <div class="section">
          <h3>📍 Condivisione GPS</h3>
          <div style="display: flex; gap: 10px; align-items: center; padding: 10px; background: var(--surface-2); border-radius: 8px;">
            <input type="checkbox" id="gps-share-toggle" ${gpsEnabled ? 'checked' : ''} 
              style="width: 18px; height: 18px; cursor: pointer;">
            <label for="gps-share-toggle" style="flex: 1; cursor: pointer; margin: 0;">
              <strong>${gpsEnabled ? '✅ Posizione in diretta' : '⬜ Posizione inattiva'}</strong>
              <div style="font-size: 11px; color: var(--muted);">
                ${FORCE_FAKE_GPS ? '📍 Usando Tokyo (test mode)' : '📍 Usando posizione reale'}
              </div>
            </label>
          </div>
          <p style="font-size: 11px; color: var(--muted); margin-top: 6px;">
            La tua posizione è visibile ai membri del gruppo solo se attiva.
          </p>
        </div>
        
        <div class="section">
          <h3>💬 Chat Gruppo</h3>
          <button class="btn primary" id="open-group-chat" style="width: 100%; margin-bottom: 10px;">
            💬 Apri chat stanza
          </button>
          <p style="font-size: 11px; color: var(--muted);">
            Comunica con i membri della stanza (messaggi P2P).
          </p>
        </div>
        
        <div class="section">
          <h3>⚙️ Gestione Stanza</h3>
          ${isCreator ? `
            <button class="btn" id="delete-room" style="width: 100%; background: var(--danger); border-color: var(--danger); color: white;">
              🗑️ Elimina stanza (solo creatore)
            </button>
            <p style="font-size: 11px; color: var(--muted); margin-top: 6px;">
              Elimina la stanza. Tutti i membri verranno disconnessi.
            </p>
          ` : ''}
          <button class="btn" id="exit-room" style="width: 100%; margin-top: 10px; background: var(--warning); border-color: var(--warning); color: #1a1a1a;">
            ❌ Esci dalla stanza
          </button>
          <p style="font-size: 11px; color: var(--muted); margin-top: 6px;">
            Esci dal gruppo. Non riceverai più messaggi P2P.
          </p>
        </div>
      </div>
    `;
    
    // Event listeners (verranno attaccati dopo render)
    setTimeout(() => attachGroupPanelEvents(), 0);
    
    return html;
  }
  
  /**
   * Attacca event listener al pannello
   */
  function attachGroupPanelEvents() {
    // GPS toggle
    const gpsToggle = document.getElementById('gps-share-toggle');
    if (gpsToggle) {
      gpsToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          window.startGPS?.();
        } else {
          window.stopGPS?.();
        }
      });
    }
    
    // Chat gruppo
    const chatBtn = document.getElementById('open-group-chat');
    if (chatBtn) {
      chatBtn.addEventListener('click', () => {
        window.groupChat?.openChatPanel();
      });
    }
    
    // Exit room
    const exitBtn = document.getElementById('exit-room');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        window.exitGroup?.();
      });
    }
    
    // Delete room (solo creator)
    const deleteBtn = document.getElementById('delete-room');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm('Sei sicuro di voler eliminare la stanza? Tutti i membri verranno disconnessi.')) {
          window.deleteGroup?.();
        }
      });
    }
  }
  
  /**
   * Escapa HTML per XSS protection (senza DOM)
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  return {
    render: renderGroupPanel,
    attachEvents: attachGroupPanelEvents,
    getForceFakeGPS: () => FORCE_FAKE_GPS
  };
})();
