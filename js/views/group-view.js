// ============================================================================
// group-view.js — renderGroupView extracted from app-core.js
// Deps (all window.*): state, saveState, openSheet, closeSheet, toast, t,
//   groupPanel, groupChat, generateRoomCode, createAvatarDataUrl,
//   sharePersonalItineraryToGroup, updateGPSMarker, peerGPS, peerBroadcast
// ============================================================================
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  function renderGroupView() {
    const state = window.state || {};
    console.log('[Group] renderGroupView', { roomId: state.group?.roomId, myName: state.group?.myName, isCreator: state.group?.isCreator });

    // Run soft-delete cleanup on open (removes POIs deleted >30 days ago)
    if (state.groupItineraries) {
      Object.keys(state.groupItineraries).forEach(id => { window.cleanupSoftDeletedPOIs?.(id); });
    }

    // Hide weather widget when opening group panel
    const weatherWidget = document.getElementById('weather-floating');
    if (weatherWidget) weatherWidget.classList.remove('show');

    // Se gruppo già creato, usa group-panel.js
    if (state.group?.roomId && state.group?.myName && window.groupPanel) {
      const html = window.groupPanel.render();
      const groupWin = document.getElementById('y2kwin-gruppo');
      if (groupWin) {
        const body = groupWin.querySelector('.y2k-win-body');
        if (body) body.innerHTML = html;
      } else {
        window.openSheet('👥 Gruppo', html);
      }
      const bottomNav = document.querySelector('nav.bottom');
      if (bottomNav) {
        const groupBtn = bottomNav.querySelector('button[data-view="group"]');
        if (groupBtn) {
          bottomNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          groupBtn.classList.add('active');
        }
      }
      window.groupPanel.attachEvents();
      return;
    }

    // Altrimenti, mostra form di setup (per prima volta)
    const html = `
      <div style="padding:12px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;">
        <!-- Tab selector: Crea o Entra -->
        <div style="display:flex;gap:8px;">
          <button id="mode-create" style="flex:1;padding:10px;background:linear-gradient(180deg,var(--l-accent),var(--l-accent-600));border:2px solid var(--l-accent-600);color:white;border-radius:8px;font-weight:600;cursor:pointer;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box;">
            ➕ Crea Nuova
          </button>
          <button id="mode-join" style="flex:1;padding:10px;background:#FFE5B4;border:2px solid #FFD700;color:#2D3B7D;border-radius:8px;font-weight:600;cursor:pointer;box-sizing:border-box;">
            🔓 Entra Esistente
          </button>
        </div>

        <!-- CREATE MODE -->
        <div id="create-mode" style="display:block">
          <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600;color:var(--l-accent)">Il codice della tua stanza</label>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:nowrap;">
            <div id="room-code-display" style="padding:16px 12px;background:#FFF0F8;border:2px solid var(--l-accent);border-radius:8px;font-size:24px;font-weight:700;letter-spacing:6px;color:var(--l-accent);text-align:center;font-family:monospace;cursor:default;user-select:all;min-width:160px;flex-shrink:0;">------</div>
            <button id="copy-code-btn" aria-label="Copia codice stanza" style="background:none;border:none;cursor:pointer;font-size:16px;padding:2px;margin:0;line-height:1;flex-shrink:0;width:auto;" title="Copia codice">📋</button>
            <button id="regen-code-btn" aria-label="Genera nuovo codice stanza" style="background:none;border:none;cursor:pointer;font-size:16px;padding:2px;margin:0;line-height:1;flex-shrink:0;width:auto;" title="Genera nuovo codice">🔄</button>
          </div>
          <div style="font-size:11px;color:#888;margin-top:6px;">Condividi questo codice con chi vuoi far entrare. Solo chi lo ha può entrare.</div>
        </div>

        <!-- JOIN MODE -->
        <div id="join-mode" style="display:none">
          <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;color:#2D3B7D">Codice stanza</label>
          <input id="group-room-join" placeholder="Es. ABC123" maxlength="6" style="width:100%;padding:12px;border:2px solid #FFE5B4;background:#fff;color:#333;border-radius:8px;box-sizing:border-box;font-size:22px;font-weight:700;letter-spacing:6px;text-transform:uppercase;font-family:monospace;text-align:center;">
          <div style="font-size:11px;color:#888;margin-top:4px;">Inserisci il codice a 6 lettere ricevuto dal creatore della stanza.</div>
        </div>

        <!-- COMMON FIELDS -->
        <div>
          <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;color:#333">Il tuo nome</label>
          <input id="group-name" placeholder="Es. Marco" style="width:100%;padding:10px;border:2px solid #FFE5B4;background:#fff;color:#333;border-radius:8px;box-sizing:border-box;font-size:13px;" value="${state.group?.myName||''}">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;color:#333">Avatar profilo (opzionale)</label>
          <input id="group-avatar" type="text" placeholder="URL immagine (es. https://example.com/avatar.png)" style="width:100%;padding:10px;border:2px solid #FFE5B4;background:#fff;color:#333;border-radius:8px;box-sizing:border-box;font-size:13px;margin-bottom:6px;" value="${state.group?.myAvatar?.startsWith('data:') || state.group?.myAvatar?.startsWith('http') ? state.group.myAvatar.substring(0,50) + '...' : state.group?.myAvatar || ''}">
          <button id="gallery-upload-btn" style="width:100%;padding:10px;background:#E8F4FF;border:2px solid #16a34a;color:#2D3B7D;border-radius:6px;font-weight:600;cursor:pointer;margin-bottom:6px;box-sizing:border-box;font-size:13px;">
            🎨 Scegli dalla Galleria
          </button>
          <input id="avatar-file-input" type="file" accept="image/*" style="display:none">
          <div style="font-size:11px;color:#999;">Lascia vuoto per generare un avatar con le tue iniziali.</div>
        </div>

        <button id="group-start" style="width:100%;padding:12px;background:linear-gradient(180deg,var(--l-accent),var(--l-accent-600));color:white;border:2px solid var(--l-accent-600);border-radius:8px;font-weight:600;cursor:pointer;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box;font-size:14px;">✅ Connetti</button>
        <div id="peer-status-box" style="color:#999;font-size:13px;">Pronto a connettersi...</div>
      </div>
    `;

    window.openSheet('👥 Gruppo', html);

    setTimeout(() => {
      const bottomNav = document.querySelector('nav.bottom');
      if (bottomNav) {
        const groupBtn = bottomNav.querySelector('button[data-view="group"]');
        if (groupBtn) {
          bottomNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          groupBtn.classList.add('active');
        }
      }
    }, 0);

    const codeDisplay  = document.getElementById('room-code-display');
    const copyCodeBtn  = document.getElementById('copy-code-btn');
    const regenCodeBtn = document.getElementById('regen-code-btn');

    if (codeDisplay) {
      codeDisplay.textContent = (state.group?.roomId && state.group.roomId.length <= 8)
        ? state.group.roomId
        : window.generateRoomCode();
    }
    if (copyCodeBtn && codeDisplay) {
      copyCodeBtn.onclick = () => {
        const code = codeDisplay.textContent.trim();
        navigator.clipboard?.writeText(code)
          .then(() => window.toast(T('toast.codeCopied', '📋 Codice copiato') + ': ' + code))
          .catch(() => window.toast('Codice: ' + code));
      };
    }
    if (regenCodeBtn && codeDisplay) {
      regenCodeBtn.onclick = () => { codeDisplay.textContent = window.generateRoomCode(); };
    }

    // Mode toggle buttons
    const modeCreateBtn = document.getElementById('mode-create');
    const modeJoinBtn = document.getElementById('mode-join');
    const createModeDiv = document.getElementById('create-mode');
    const joinModeDiv = document.getElementById('join-mode');

    if (modeCreateBtn && modeJoinBtn) {
      modeCreateBtn.onclick = () => {
        createModeDiv.style.display = 'block'; joinModeDiv.style.display = 'none';
        modeCreateBtn.style.background = 'linear-gradient(180deg,var(--l-accent),var(--l-accent-600))';
        modeCreateBtn.style.borderColor = 'var(--l-accent-600)'; modeCreateBtn.style.color = 'white';
        modeJoinBtn.style.background = '#FFE5B4'; modeJoinBtn.style.borderColor = '#FFD700';
        modeJoinBtn.style.color = '#2D3B7D';
      };
      modeJoinBtn.onclick = () => {
        createModeDiv.style.display = 'none'; joinModeDiv.style.display = 'block';
        modeJoinBtn.style.background = 'linear-gradient(180deg,#FFD700,#FFC000)';
        modeJoinBtn.style.borderColor = '#FFD700'; modeJoinBtn.style.color = 'white';
        modeCreateBtn.style.background = '#FFE5B4'; modeCreateBtn.style.borderColor = 'var(--l-accent)';
        modeCreateBtn.style.color = '#2D3B7D';
      };
    }

    // Gallery upload button
    const galleryBtn = document.getElementById('gallery-upload-btn');
    const fileInput = document.getElementById('avatar-file-input');
    const avatarInput = document.getElementById('group-avatar');

    if (galleryBtn && fileInput) {
      galleryBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result;
            if (dataUrl) {
              avatarInput.value = String(dataUrl).substring(0, 50) + '...';
              avatarInput.dataset.fullUrl = dataUrl;
              window.toast('✅ Immagine selezionata');
            }
          };
          reader.readAsDataURL(file);
        }
      };
    }

    // Start/Connect button
    const startBtn = document.getElementById('group-start');
    if (startBtn) startBtn.onclick = () => {
      const isCreating = createModeDiv?.style.display !== 'none';
      const room = isCreating
        ? (document.getElementById('room-code-display')?.textContent.trim() || '').replace(/[^A-Z0-9]/g, '')
        : (document.getElementById('group-room-join')?.value.trim() || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const name = document.getElementById('group-name')?.value.trim() || 'Guest';
      let avatarUrl = document.getElementById('group-avatar')?.dataset?.fullUrl ||
                      document.getElementById('group-avatar')?.value.trim() || '';

      if (!room || room.length < 4) {
        window.toast(T('toast.invalidRoom', '⚠️ Codice stanza non valido'));
        return;
      }

      state.group = {
        roomId: room, myName: name,
        myAvatar: avatarUrl || window.createAvatarDataUrl(name),
        isCreator: isCreating,
        createdBy: isCreating ? name : null,
        createdByName: isCreating ? name : null,
        members: [{ name, role: isCreating ? 'hub' : 'member', lastHeartbeat: Date.now() }],
      };
      window.saveState?.();

      window.groupChat?.init(room);

      window.toast(T('toast.groupConnected', '✅ Connesso a: ') + room);
      window.closeSheet();
      window.renderGroupView();

      // Auto-share pending itinerary
      if (state.pendingShareItinerary) {
        setTimeout(() => {
          const hasItinerary = (state.itinerary && state.itinerary.length > 0) ||
            (state.itineraryByDay && Object.values(state.itineraryByDay).some(day => day && day.length > 0));

          if (hasItinerary && state.group?.roomId) {
            if (state.itineraryByDay && (!state.itinerary || state.itinerary.length === 0)) {
              state.itinerary = [];
              for (const dayPOIs of Object.values(state.itineraryByDay)) {
                if (Array.isArray(dayPOIs)) state.itinerary.push(...dayPOIs);
              }
            }
            window.sharePersonalItineraryToGroup(state.group.roomId);
            state.pendingShareItinerary = false;
            window.saveState?.();
            window.toast(T('toast.itinShared', '✅ Itinerario condiviso con il gruppo!'));
          }
        }, 500);
      }

      // Redraw GPS marker
      if (state.gpsCurrentLat && state.gpsCurrentLng) {
        window.updateGPSMarker(state.gpsCurrentLat, state.gpsCurrentLng);
      }

      // Avvia peerGPS IN BACKGROUND
      const peerGPS = window.peerGPS;
      if (peerGPS && typeof peerGPS.start === 'function') {
        setTimeout(() => {
          peerGPS.start(room, name, (status, count) => {
            const box = document.getElementById('peer-status-box');
            if (box) {
              if (status === 'waiting')      box.innerHTML = '🟡 In attesa di altri...';
              else if (status === 'connected')  box.innerHTML = `🟢 Connesso (${count} online)`;
              else if (status === 'disconnected') box.innerHTML = '⚫ Non connesso';
            }
            if (status === 'connected' && state.gpsCurrentLat && state.gpsCurrentLng && state.group?.myName) {
              const payload = { type: 'gps', lat: state.gpsCurrentLat, lng: state.gpsCurrentLng, name: state.group.myName, avatar: state.group?.myAvatar || null };
              window.peerBroadcast?.(payload);
            }
          }, (state.group.members||[]).map(m => m.name).filter(n => n && n !== name));

          setTimeout(() => {
            if (peerGPS?.getMyPeerId) state.group.myPeerId = peerGPS.getMyPeerId();
            if (peerGPS?.getRole && peerGPS.getRole() === 'hub' && state.group.isCreator !== false) {
              state.group.isCreator = true;
            }
            window.saveState?.();
            window.renderGroupView();
          }, 900);
        }, 100);
      } else {
        console.error('[Group] ❌ peerGPS not available!', { peerGPS: !!peerGPS, hasStart: typeof peerGPS?.start });
      }
    };
  }

  window.renderGroupView = renderGroupView;
})();
