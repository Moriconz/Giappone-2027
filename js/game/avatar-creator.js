// ============================================================================
// AVATAR-CREATOR.JS — character creator voxel (V2 F2).
// Primo avvio (gioco ON, nessun avatar, onboarding fatto): overlay pre-app
// skippabile con avatar random. Poi riapribile dal menu ☰ «Il mio avatar».
// Salvataggio: state.game.avatar (JSON compatto, già nel backup via F1),
// broadcast MQTT type 'avatar_update' → gli altri membri lo vedono (F5 UI).
// Ricezione: listener su 'mqtt_message' (case default del transport) →
// state.game.groupAvatars[from]. Zero modifiche alla logica planner.
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;
  const LANG = () => (window.I18N && window.I18N.lang) || document.documentElement.lang || 'it';

  const SLOT_ICONS = { body: '🧍', face: '🙂', hair: '💇', top: '👕', bottom: '👖', shoes: '👟', hat: '🎩', accessory: '🧣', backpack: '🎒' };
  const SLOT_LABEL = {
    body: () => T('av.slot.body', 'Corpo'), face: () => T('av.slot.face', 'Viso'),
    hair: () => T('av.slot.hair', 'Capelli'), top: () => T('av.slot.top', 'Sopra'),
    bottom: () => T('av.slot.bottom', 'Sotto'), shoes: () => T('av.slot.shoes', 'Scarpe'),
    hat: () => T('av.slot.hat', 'Cappello'), accessory: () => T('av.slot.accessory', 'Accessorio'),
    backpack: () => T('av.slot.backpack', 'Zaino')
  };

  let overlay = null, handle = null, work = null, activeSlot = 'body';

  function esc(s) { return (window.escapeHtml ? window.escapeHtml(String(s)) : String(s)); }

  function currentAvatar() {
    const g = window.GameEvents?.ensureGame?.();
    return (g && g.avatar && g.avatar.parts && g.avatar.parts.body) ? JSON.parse(JSON.stringify(g.avatar)) : null;
  }

  async function open(opts) {
    if (overlay) return;
    const firstRun = !!(opts && opts.firstRun);
    await window.AvatarParts.load();
    work = currentAvatar() || window.AvatarParts.defaultAvatar();

    overlay = document.createElement('div');
    overlay.id = 'avatar-creator';
    // z-index 10000: sopra il widget meteo (9999); il toast (10000, appeso dopo)
    // resta comunque visibile sopra il creator.
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;background:var(--m-surface,#16161a);color:var(--m-text,#eee);';
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">
        <strong>${esc(T('av.title', '🧊 Il tuo personaggio'))}</strong>
        <div>
          <button id="av-random" class="btn-plain" style="background:none;border:1px solid var(--l-hair,#444);border-radius:8px;color:inherit;padding:6px 10px;font-size:15px;">🎲 ${esc(T('av.random', 'Casuale'))}</button>
          ${firstRun ? `<button id="av-skip" class="btn-plain" style="background:none;border:none;color:var(--l-faint,#999);padding:6px 8px;font-size:14px;">${esc(T('av.skip', 'Salta'))}</button>` : `<button id="av-close" class="btn-plain" style="background:none;border:none;color:var(--l-faint,#999);padding:6px 10px;font-size:18px;">✕</button>`}
        </div>
      </div>
      <div id="av-stage" style="flex:1 1 auto;min-height:220px;"></div>
      <div style="flex:0 0 auto;padding:8px 0 max(12px, env(safe-area-inset-bottom));background:var(--l-glass-strong,rgba(20,20,24,.97));">
        <div id="av-tabs" style="display:flex;gap:6px;overflow-x:auto;padding:6px 12px;"></div>
        <div id="av-items" style="display:flex;gap:6px;overflow-x:auto;padding:6px 12px;"></div>
        <div id="av-colors" style="display:flex;gap:8px;overflow-x:auto;padding:6px 12px;"></div>
        <div style="padding:8px 12px;">
          <button id="av-save" class="btn-plain" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--l-accent,#c0392b);color:#fff;font-size:16px;font-weight:600;">${esc(T('av.save', 'Salva personaggio'))}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    handle = await window.AvatarRenderer.mount(overlay.querySelector('#av-stage'), work);

    overlay.querySelector('#av-random').onclick = () => { work = window.AvatarParts.randomAvatar(); handle.setAvatar(work); renderTabs(); };
    overlay.querySelector('#av-save').onclick = () => { save(); close(); };
    const skip = overlay.querySelector('#av-skip');
    if (skip) skip.onclick = () => { work = currentAvatar() || window.AvatarParts.randomAvatar(); save(true); close(); };
    const x = overlay.querySelector('#av-close');
    if (x) x.onclick = () => close();

    renderTabs();
  }

  function renderTabs() {
    const tabs = overlay.querySelector('#av-tabs');
    tabs.innerHTML = window.AvatarParts.ORDER.map(s =>
      `<button class="btn-plain av-tab" data-slot="${s}" style="flex:0 0 auto;padding:8px 12px;border-radius:10px;border:1px solid ${s === activeSlot ? 'var(--l-accent,#c0392b)' : 'var(--l-hair,#444)'};background:none;color:inherit;font-size:14px;">${SLOT_ICONS[s]} ${esc(SLOT_LABEL[s]())}</button>`).join('');
    tabs.querySelectorAll('.av-tab').forEach(b => { b.onclick = () => { activeSlot = b.dataset.slot; renderTabs(); }; });

    const items = overlay.querySelector('#av-items');
    items.innerHTML = window.AvatarParts.idsFor(activeSlot).map(id =>
      `<button class="btn-plain av-item" data-id="${id}" style="flex:0 0 auto;padding:8px 12px;border-radius:10px;border:1px solid ${id === work.parts[activeSlot] ? 'var(--l-accent,#c0392b)' : 'var(--l-hair,#444)'};background:${id === work.parts[activeSlot] ? 'rgba(192,57,43,.15)' : 'none'};color:inherit;font-size:14px;">${esc(window.AvatarParts.partName(activeSlot, id, LANG()))}</button>`).join('');
    items.querySelectorAll('.av-item').forEach(b => { b.onclick = () => { work.parts[activeSlot] = b.dataset.id; handle.setAvatar(work); renderTabs(); }; });

    const colors = overlay.querySelector('#av-colors');
    const swatches = activeSlot === 'body' ? window.AvatarParts.SKIN_TONES
      : activeSlot === 'face' ? []
      : window.AvatarParts.COLOR_SWATCHES;
    colors.innerHTML = swatches.map(c =>
      `<button class="btn-plain av-color" data-c="${c}" style="flex:0 0 auto;width:32px;height:32px;border-radius:50%;background:${c};border:${c === work.colors[activeSlot] ? '3px solid #fff' : '1px solid var(--l-hair,#444)'};"></button>`).join('');
    colors.querySelectorAll('.av-color').forEach(b => { b.onclick = () => { work.colors[activeSlot] = b.dataset.c; handle.setAvatar(work); renderTabs(); }; });
  }

  function save(silent) {
    const g = window.GameEvents?.ensureGame?.();
    if (!g) return;
    g.avatar = JSON.parse(JSON.stringify(work));
    window.saveState?.();
    window.GameEvents?.emit?.('avatar.saved');
    if (window.state?.group?.members?.length) {
      window.peerBroadcast?.({ type: 'avatar_update', avatar: g.avatar });
    }
    if (!silent) window.toast?.(T('av.saved', '🧊 Personaggio salvato!'));
  }

  function close() {
    if (handle) { handle.dispose(); handle = null; }
    if (overlay) { overlay.remove(); overlay = null; }
  }

  // ── Avatar dei membri del gruppo (ricezione via case default del transport) ─
  document.addEventListener('mqtt_message', (e) => {
    const d = e.detail;
    if (!d || d.type !== 'avatar_update' || !d.from || !d.avatar) return;
    const g = window.GameEvents?.ensureGame?.();
    if (!g || !g.enabled) return;
    if (typeof d.avatar !== 'object' || !d.avatar.parts) return; // guard payload
    g.groupAvatars[d.from] = { parts: d.avatar.parts, colors: d.avatar.colors || {}, at: Date.now() };
    window.saveState?.();
  });

  // ── Primo avvio: creator pre-app (dopo onboarding, gioco ON, nessun avatar) ─
  function maybeFirstRun() {
    try {
      if (!window.GameEvents?.isOn?.()) return;
      if (currentAvatar()) return;
      if (!localStorage.getItem('tripProfile')) return; // onboarding non ancora fatto
      open({ firstRun: true });
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(maybeFirstRun, 800));
  else setTimeout(maybeFirstRun, 800);

  window.AvatarCreator = { open, close };
})();
