/**
 * "Mostra al cameriere" — Fullscreen Japanese emergency card
 * P1: Celiaco in viaggio risolve con 1 tap
 */

class ShowToWaiter {
  constructor() {
    this.container = null;
    this.isOpen = false;
  }

  /**
   * Apri modal fullscreen con testo GRANDE in giapponese
   */
  open(userProfile = {}) {
    if (this.isOpen) return;
    this.isOpen = true;

    // Remove if exists
    const existing = document.getElementById('waiter-modal');
    if (existing) existing.remove();

    // Create modal
    this.container = document.createElement('div');
    this.container.id = 'waiter-modal';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: white;
      text-align: center;
      backdrop-filter: blur(10px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      max-width: 100%;
      width: 100%;
    `;

    // Title (English + JP)
    const title = document.createElement('h1');
    title.style.cssText = 'font-size: 2.5rem; margin: 0 0 30px 0; font-weight: bold;';
    title.textContent = 'Medical Emergency';

    const titleJP = document.createElement('h2');
    titleJP.style.cssText = 'font-size: 3rem; margin: 0 0 40px 0; font-weight: 300; letter-spacing: 2px;';
    titleJP.textContent = 'セリアック病';

    // Main message (HUGE font)
    const message = document.createElement('div');
    message.style.cssText = `
      font-size: 4rem;
      font-weight: bold;
      margin-bottom: 40px;
      line-height: 1.2;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    `;
    message.innerHTML = `
      🚫<br>
      グルテン不可<br>
      <span style="font-size: 2.5rem; margin-top: 20px; display: block;">小麦 · 大麦 · ライ麦</span>
    `;

    // Critical info box
    const infoBox = document.createElement('div');
    infoBox.style.cssText = `
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      padding: 30px;
      margin: 30px 0;
      font-size: 1.8rem;
      line-height: 1.6;
    `;
    infoBox.innerHTML = `
      <div style="margin-bottom: 20px; font-weight: bold;">診断 (Diagnosis)</div>
      <div>セリアック病<br><span style="font-size: 1.5rem;">Celiac Disease</span></div>
      <div style="margin-top: 30px; border-top: 2px solid rgba(255,255,255,0.5); padding-top: 20px;">
        <strong>これは深刻です<br>This is SERIOUS</strong>
      </div>
    `;

    // Allergen checklist
    const allergens = document.createElement('div');
    allergens.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      border-radius: 15px;
      padding: 25px;
      margin: 30px 0;
      font-size: 1.6rem;
      line-height: 2;
    `;
    allergens.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 15px;">避けるべき食材 (Avoid)</div>
      <div>🚫 醤油 (Soy sauce)</div>
      <div>🚫 出汁 (Dashi broth)</div>
      <div>🚫 パン (Bread)</div>
      <div>🚫 麺 (Noodles)</div>
      <div>🚫 ビール (Beer)</div>
    `;

    // Emergency action
    const emergency = document.createElement('div');
    emergency.style.cssText = `
      background: rgba(200, 50, 50, 0.6);
      border-radius: 15px;
      padding: 25px;
      margin: 30px 0;
      font-size: 1.8rem;
      font-weight: bold;
    `;
    emergency.innerHTML = `
      気分が悪い場合<br>
      <span style="font-size: 2.5rem;">119 に電話してください</span><br>
      <span style="font-size: 1.4rem;">Call ambulance immediately</span>
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      margin-top: 30px;
      padding: 20px 40px;
      font-size: 1.5rem;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      color: white;
      border-radius: 50px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;
    `;
    closeBtn.textContent = 'Back to App';
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      closeBtn.style.transform = 'scale(1.05)';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      closeBtn.style.transform = 'scale(1)';
    };
    closeBtn.onclick = () => this.close();

    // Escape key close
    const escapeHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', escapeHandler);

    // Assemble
    content.appendChild(title);
    content.appendChild(titleJP);
    content.appendChild(message);
    content.appendChild(infoBox);
    content.appendChild(allergens);
    content.appendChild(emergency);
    content.appendChild(closeBtn);

    this.container.appendChild(content);
    document.body.appendChild(this.container);

    // Announce per screen readers
    this.announceAccessible();
  }

  close() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.isOpen = false;
  }

  /**
   * Accessibility announcement
   */
  announceAccessible() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.textContent = 'Medical alert card opened. Press Escape to close.';
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    document.body.appendChild(announcement);
  }
}

// Export singleton
export const showToWaiter = new ShowToWaiter();

// Keyboard shortcut: Ctrl+W / Cmd+W = open waiter card
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    e.preventDefault();
    showToWaiter.open();
  }
});
