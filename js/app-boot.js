// app-boot.js — primo blocco <script> inline estratto da index.html
(function() {
  'use strict';
  console.log('[Install] Initializing PWA install system...');

  window.__deferredPrompt = null;

  // Detect browser and OS
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod|macintosh|mac os/.test(ua);
  const isAndroid = /android|aarch64|arm64/.test(ua);
  // Fallback: if we have touch points and not iOS/Mac, it's likely Android or mobile
  const isMobile = (navigator.maxTouchPoints > 1 || /mobile|android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua)) && !isIOS;
  const isChrome = /chrome|crios/.test(ua) && !/edg/.test(ua);
  const isEdge = /edg/.test(ua);
  const isFirefox = /firefox|fxios/.test(ua);
  const isSafari = /safari|version.*mobile/.test(ua) && !/chrome/.test(ua) && !/edg/.test(ua);

  // ✅ beforeinstallprompt è gestito SOLO dalla classe UniversalInstaller (sotto)
  // Niente listener globale duplicati!

  // ════════════════════════════════════════════════════════════════════
  // UNIVERSAL INSTALLER 2026 — Works on ALL browsers & devices
  // ════════════════════════════════════════════════════════════════════

  class UniversalInstaller {
    constructor() {
      this.ua = navigator.userAgent.toLowerCase();
      this.isIOS = /iphone|ipad|ipod/.test(this.ua);
      this.isAndroid = /android/.test(this.ua);
      this.isMobile = (navigator.maxTouchPoints > 1 || /mobile|android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(this.ua)) && !this.isIOS;
      this.isChrome = /chrome/.test(this.ua) && !/edg/.test(this.ua);
      this.isEdge = /edg/.test(this.ua);
      this.isFirefox = /firefox/.test(this.ua);
      this.isSafari = /safari/.test(this.ua) && !/chrome/.test(this.ua) && !/edg/.test(this.ua);
      this.isBrave = /brave/.test(this.ua);
      this.isDesktop = !this.isAndroid && !this.isIOS && !this.isMobile;
      this.deferredPrompt = null;
      this.init();
    }

    init() {
      console.log('[UniversalInstaller] ✅ Initializing on all browsers');

      // DEBUG: Controlla se Service Worker è registrato (RICHIESTO per beforeinstallprompt)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          console.log('[UniversalInstaller] SW registrations:', regs.length);
          regs.forEach(reg => console.log('[UniversalInstaller] SW scope:', reg.scope, 'active:', !!reg.active));
        });
      }

      // Controlla se app è già installata
      this.checkIfInstalled();

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        console.log('[UniversalInstaller] 🎯 PWA installable (beforeinstallprompt)');
        this.addButtonToHeader();
      });

      // Ascolta evento installazione completata
      window.addEventListener('appinstalled', () => {
        console.log('[UniversalInstaller] ✅ App installata, nascondo bottone');
        this.hideInstallButton();
      });

      setTimeout(() => {
        if (!this.deferredPrompt) {
          console.log('[UniversalInstaller] No beforeinstallprompt, showing button anyway');
          // Non aggiungere bottone se app è già installata
          if (!this.isAppInstalled()) {
            this.addButtonToHeader();
          }
        }
      }, 1000);
    }

    checkIfInstalled() {
      // Controlla se l'app è in display-mode standalone
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('[UniversalInstaller] App è già in standalone mode (installata)');
        this.deferredPrompt = null;
      }
    }

    isAppInstalled() {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true;
    }

    hideInstallButton() {
      const btn = document.getElementById('universal-install-btn');
      if (btn) {
        btn.style.display = 'none';
        console.log('[UniversalInstaller] Bottone nascosto');
      }
    }

    addButtonToHeader() {
      const header = document.querySelector('header');
      if (!header) {
        setTimeout(() => this.addButtonToHeader(), 100);
        return;
      }

      if (document.getElementById('universal-install-btn')) return;

      const btn = document.createElement('button');
      btn.id = 'universal-install-btn';
      btn.textContent = '📱 Aggiungi';
      btn.style.cssText = `
        background: linear-gradient(135deg, #ff7a45, #f5631f) !important;
        color: #1a1207 !important;
        border: none !important;
        padding: 9px 14px !important;
        border-radius: 10px !important;
        font-weight: 700 !important;
        font-size: 13px !important;
        cursor: pointer !important;
        flex-shrink: 0 !important;
        white-space: nowrap !important;
        box-shadow: 0 2px 10px rgba(255,122,69,0.3) !important;
        transition: all 0.2s ease !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      `;

      btn.onmouseenter = () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = '0 4px 14px rgba(255,122,69,0.45)';
      };
      btn.onmouseleave = () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 2px 10px rgba(255,122,69,0.3)';
      };

      btn.onclick = () => this.handleInstall();
      header.appendChild(btn);
      console.log('[UniversalInstaller] ✅ Button added to header');
    }

    async handleInstall() {
      console.log('[UniversalInstaller] 👉 Install clicked', { hasPrompt: !!this.deferredPrompt, isAndroid: this.isAndroid, isIOS: this.isIOS, browser: this.isBrave ? 'BRAVE' : 'OTHER' });

      // Native beforeinstallprompt (Chrome/Edge - NOT Brave)
      if (this.deferredPrompt && !this.isBrave) {
        console.log('[UniversalInstaller] ✅ Using native beforeinstallprompt');
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        console.log('[UniversalInstaller] User choice:', choice.outcome);
        this.deferredPrompt = null;
        return;
      }

      // Fallback for browsers without beforeinstallprompt (or Brave)
      console.log('[UniversalInstaller] 📲 Mostrando modal di installazione manuale');
      this.showInstallModal();
    }

    showInstallModal() {
      // Crea overlay modal
      const overlay = document.createElement('div');
      overlay.id = 'install-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      `;

      // Crea modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: linear-gradient(135deg, #1a2560 0%, #2d3b7d 100%);
        border-radius: 20px;
        padding: 30px;
        max-width: 400px;
        width: 100%;
        color: white;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      `;

      let instructions = '';
      if (this.isIOS) {
        instructions = `
          <h2 style="margin: 0 0 20px 0; font-size: 20px;">📱 Installa su iPhone</h2>
          <ol style="text-align: left; font-size: 16px; line-height: 1.8;">
            <li>Tocca <strong>Condividi</strong> (icona freccia in basso)</li>
            <li>Scorri e tocca <strong>"Aggiungi a Schermata Iniziale"</strong></li>
            <li>Tocca <strong>Aggiungi</strong></li>
          </ol>
        `;
      } else if (this.isAndroid || this.isMobile) {
        instructions = `
          <h2 style="margin: 0 0 20px 0; font-size: 20px;">📲 Installa su Android</h2>
          <ol style="text-align: left; font-size: 16px; line-height: 1.8;">
            <li>Tocca il menu <strong>⋮</strong> (tre puntini in alto a destra)</li>
            <li>Tocca <strong>"Installa app"</strong> oppure <strong>"Aggiungi a schermata iniziale"</strong></li>
            <li>Conferma</li>
          </ol>
        `;
      } else {
        instructions = `
          <h2 style="margin: 0 0 20px 0; font-size: 18px;">🖥️ Installa su Desktop</h2>
          <p style="text-align: left; font-size: 14px; line-height: 1.8;">
            Guarda in <strong>alto a destra della barra indirizzi</strong> — dovresti vedere l'icona di installazione ⊕
          </p>
        `;
      }

      modal.innerHTML = `
        ${instructions}
        <button id="close-install-modal" style="
          margin-top: 25px;
          padding: 12px 30px;
          background: rgba(0,255,136,0.2);
          border: 2px solid #00FF88;
          color: #00FF88;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
        ">Capito! Chiudi</button>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Close button
      document.getElementById('close-install-modal').onclick = () => {
        overlay.remove();
        console.log('[UniversalInstaller] Modal closed');
      };

      // Close on overlay click
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
        }
      };

      console.log('[UniversalInstaller] ✅ Install modal shown');
    }
  }

  new UniversalInstaller();
  console.log('[Install] ✓ System initialized');

  // Show to Waiter Card - Comprehensive celiac disease information
  window.showWaiterCard = function(jp) {
    const overlay = document.createElement('div');
    overlay.id = 'waiter-card-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0d0f17 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      cursor: pointer;
      overflow: hidden;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      position: relative;
      background: rgba(74,91,168,0.12);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 2px solid rgba(255,255,255,0.25);
      border-radius: 20px;
      padding: 30px 24px;
      width: 90vw;
      max-width: 520px;
      max-height: 85vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      animation: slideUp 0.4s ease-out;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.5px;
      text-align: center;
    `;
    title.innerHTML = '🗣️ セリアック病 - 店員様へ<br><span style="font-size:12px;color:rgba(255,255,255,0.7);font-weight:400;">Celiac Disease - For the Waiter</span>';

    const phraseJP = document.createElement('div');
    phraseJP.style.cssText = `
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      text-align: center;
      line-height: 1.5;
      padding: 16px;
      background: rgba(255,20,147,0.1);
      border: 1.5px solid rgba(255,20,147,0.3);
      border-radius: 12px;
      font-family: 'Segoe UI', sans-serif;
    `;
    phraseJP.textContent = jp;

    const translation = document.createElement('div');
    translation.style.cssText = `
      font-size: 11px;
      color: rgba(255,255,255,0.8);
      text-align: center;
      line-height: 1.5;
    `;
    translation.innerHTML = '<strong>意味：</strong><br>セリアック病があります。<br>パン・小麦を食べられません。<br>グルテン（麦類のタンパク質）にアレルギーがあります。';

    // CRITICAL WARNING
    const warning = document.createElement('div');
    warning.style.cssText = `
      padding: 12px;
      background: rgba(255,20,147,0.15);
      border: 1.5px solid rgba(255,20,147,0.5);
      border-radius: 10px;
      font-size: 11px;
      color: #FFB6D9;
      font-weight: 600;
      text-align: center;
      line-height: 1.5;
    `;
    warning.innerHTML = '⚠️ 重篤な医学的症状です<br><span style="font-size:11px;color:rgba(255,182,211,0.8);">Serious medical condition</span><br>少量のグルテンでも腸に損傷を起こします<br><span style="font-size:11px;color:rgba(255,182,211,0.8);">Even tiny gluten amounts cause intestinal damage</span><br>交差汚染（小麦との接触）は危険です<br><span style="font-size:11px;color:rgba(255,182,211,0.8);">Cross-contamination is NOT safe</span>';

    // FOODS TO AVOID
    const foodsSection = document.createElement('div');
    foodsSection.style.cssText = `
      padding: 12px;
      background: rgba(100,149,237,0.1);
      border: 1px solid rgba(100,149,237,0.3);
      border-radius: 10px;
      font-size: 9.5px;
      color: rgba(255,255,255,0.9);
      line-height: 1.6;
    `;
    foodsSection.innerHTML = `<strong style="color:#87CEEB;">🚫 絶対に避けるべき食べ物：</strong><br>
<span style="font-size:11px;color:rgba(135,206,235,0.8);">Foods to Strictly Avoid:</span><br>
• パン・パスタ・うどん（小麦製品） <span style="font-size:11px;color:rgba(135,206,235,0.7);">(Bread, pasta, noodles - wheat)</span><br>
• 麦類（大麦・ライ麦） <span style="font-size:11px;color:rgba(135,206,235,0.7);">(Barley, rye)</span><br>
• 小麦粉・ケーキ・クッキー・ビール <span style="font-size:11px;color:rgba(135,206,235,0.7);">(Flour, cakes, cookies, beer)</span><br>
• 醤油（小麦を含む） <span style="font-size:11px;color:rgba(135,206,235,0.7);">(Soy sauce - contains wheat)</span><br>
• グレービー・ソース・ドレッシング <span style="font-size:11px;color:rgba(135,206,235,0.7);">(Gravy, sauces, dressings)</span><br>
• 揚げ物（共有の油で揚げたもの） <span style="font-size:11px;color:rgba(135,206,235,0.7);">(Fried foods - shared fryer)</span><br>
• 加工肉・チーズ（成分確認が必要） <span style="font-size:11px;color:rgba(135,206,235,0.7);">(Processed meats, cheeses)</span>`;

    // CROSS-CONTAMINATION WARNING
    const crossContam = document.createElement('div');
    crossContam.style.cssText = `
      padding: 12px;
      background: rgba(255,69,0,0.1);
      border: 1.5px solid rgba(255,69,0,0.4);
      border-radius: 10px;
      font-size: 9.5px;
      color: rgba(255,255,255,0.9);
      font-weight: 600;
      line-height: 1.6;
    `;
    crossContam.innerHTML = `<strong style="color:#FF6B6B;">⚡ 交差汚染（こうさおせん）の危険性：</strong><br>
<span style="font-size:11px;color:rgba(255,107,107,0.8);">Cross-Contamination Risk:</span><br>
❌ 共有のナイフ・まな板を使わないでください <span style="font-size:11px;color:rgba(255,107,107,0.7);">(No shared knives/cutting boards)</span><br>
❌ 共有の油で揚げないでください <span style="font-size:11px;color:rgba(255,107,107,0.7);">(No shared fryer)</span><br>
❌ 小麦と同じ鍋・フライパンを使わないでください <span style="font-size:11px;color:rgba(255,107,107,0.7);">(No same pans as wheat)</span><br>
✅ 清潔で別々の調理器具のみを使用してください <span style="font-size:11px;color:rgba(255,107,107,0.7);">(Use CLEAN, SEPARATE equipment only)</span><br>
⚠️ パン粉一粒でも危険です <span style="font-size:11px;color:rgba(255,107,107,0.7);">(Even 1 bread crumb = danger)</span>`;

    // SAFE FOODS
    const safeSection = document.createElement('div');
    safeSection.style.cssText = `
      padding: 12px;
      background: rgba(34,139,34,0.1);
      border: 1px solid rgba(34,139,34,0.3);
      border-radius: 10px;
      font-size: 9.5px;
      color: rgba(200,255,200,1);
      line-height: 1.6;
    `;
    safeSection.innerHTML = `<strong style="color:#7FFF7F;">✅ 安全な食べ物：</strong><br>
<span style="font-size:11px;color:rgba(127,255,127,0.8);">Safe Foods:</span><br>
• ご飯・ジャガイモ・トウモロコシ <span style="font-size:11px;color:rgba(127,255,127,0.7);">(Rice, potatoes, corn)</span><br>
• 新鮮な肉・魚・卵・乳製品 <span style="font-size:11px;color:rgba(127,255,127,0.7);">(Fresh meat, fish, eggs, dairy)</span><br>
• 野菜・果物・豆・ナッツ <span style="font-size:11px;color:rgba(127,255,127,0.7);">(Vegetables, fruits, beans, nuts)</span><br>
• グルテンフリー認証製品のみ <span style="font-size:11px;color:rgba(127,255,127,0.7);">(Gluten-free certified products only)</span>`;

    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size: 11px;
      color: rgba(255,255,255,0.4);
      text-align: center;
      margin-top: 8px;
    `;
    hint.textContent = 'Tap anywhere to close';

    card.appendChild(title);
    card.appendChild(phraseJP);
    card.appendChild(translation);
    card.appendChild(warning);
    card.appendChild(foodsSection);
    card.appendChild(crossContam);
    card.appendChild(safeSection);
    card.appendChild(hint);
    overlay.appendChild(card);

    overlay.onclick = () => overlay.remove();

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      #waiter-card-overlay div::-webkit-scrollbar {
        width: 6px;
      }
      #waiter-card-overlay div::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
      }
      #waiter-card-overlay div::-webkit-scrollbar-thumb {
        background: rgba(255,20,147,0.3);
        border-radius: 10px;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);
  };
})();
