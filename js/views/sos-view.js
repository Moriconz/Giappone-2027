/**
 * views/sos-view.js — Pannello SOS celiachia
 *
 * Estratto da app-core.js il 2026-05-26 come parte dello scorporo del monolite
 * (vedi STATO_APP.md §8.5).
 *
 * Bug pre-esistente risolto durante l'estrazione: gli onclick del pannello SOS
 * (copyToClipboard, showMedicalCard, downloadMedicalCard, openGoogleMaps)
 * non funzionavano perché le helper, definite dentro l'IIFE DOMContentLoaded
 * di app-core, non erano esposte su window. Le porto qui ed espongo
 * esplicitamente su window per renderle utilizzabili dagli onclick HTML.
 *
 * Dipendenze esterne (tutte su window):
 *   - window.openSheet(title, html)   per il rendering del pannello
 *   - window.toast(msg)               per feedback (con fallback console)
 *   - window.showWaiterCard(jp)       definita in app-boot.js
 */
(function () {
  'use strict';

  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

  function _toast(msg) {
    if (typeof window.toast === 'function') window.toast(msg);
    else console.log('[toast]', msg);
  }

  function copyToClipboard(text) {
    if (!navigator.clipboard) {
      _toast(T('sos.clipboardNA', '❌ Clipboard non supportata'));
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => _toast(T('sos.copied', '✅ Copiato negli appunti')),
      (err) => { console.error('Copy failed:', err); _toast(T('sos.copyError', '❌ Errore nella copia')); }
    );
  }

  function openGoogleMaps(location) {
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
    window.open(mapsUrl, '_blank');
  }

  function showMedicalCard() {
    const cardContent = `
      <div style="font-family:monospace;white-space:pre-wrap;font-size:11px;line-height:1.4;background:rgba(20,30,60,0.05);color:var(--l-ink);padding:12px;border-radius:8px;margin:12px 0;overflow-x:auto;">
╔════════════════════════════════════════════════╗
║        セリアック病医療カード               ║
║     (Celiac Disease Medical Card)          ║
╚════════════════════════════════════════════════╝

患者名 (Patient Name): ___________________
生年月日 (Date of Birth): ___/___/___

⚠️ 重要な医学情報 (Important Medical Info):

私は不治の病です。
(I have celiac disease.)

パン・小麦は食べられません。
(I cannot eat bread/wheat.)

グルテンを含む食品に対するアレルギーがあります。
(I am allergic to foods containing gluten.)

緊急連絡先 (Emergency Contact):
____________________
____________________

血液型 (Blood Type): _____
      </div>
      <p style="font-size:12px;color:var(--muted);margin-top:12px;">📋 Puoi stampare e completare questa tessera manualmente.</p>
    `;
    if (typeof window.openSheet === 'function') {
      window.openSheet('Tessera Medica', cardContent);
    }
  }

  function downloadMedicalCard() {
    const cardText = `TESSERA MEDICA - CELIAC DISEASE MEDICAL CARD

患者名 (Patient Name): ___________________
生年月日 (Date of Birth): ___/___/___

⚠️ INFORMAZIONI MEDICHE IMPORTANTI / 重要な医学情報

私は不治の病です。
I have celiac disease.

パン・小麦は食べられません。
I cannot eat bread / wheat.

グルテンを含む食品に対するアレルギーがあります。
I am allergic to foods containing gluten.

緊急連絡先 (Emergency Contact):
____________________
____________________

血液型 (Blood Type): _____

NUMERI DI EMERGENZA / 緊急電話番号:
Ambulanza: 119
Police: 110
Hospital: +81-3-3541-5151 (St. Luke's International Hospital, Tokyo)

Data di creazione (Date Created): ${new Date().toLocaleDateString()}
`;

    const blob = new Blob([cardText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Tabi-Medical-Card-' + new Date().toISOString().split('T')[0] + '.txt';
    link.click();
    _toast(T('sos.cardDownloaded', '✅ Tessera medica scaricata'));
  }

  function renderSOSPanel() {
    const jp = '私は不治の病です。パン / 小麦は食べられません。';

    const html = `
      <div style="padding:8px 0;line-height:1.6;">
        <!-- AMBULANZA -->
        <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:20px;padding:14px;background:#fff;border:1.5px solid var(--l-hair);border-radius:14px;box-shadow:0 2px 10px rgba(28,40,71,.06);">
          <div style="flex:0 0 auto;font-size:32px;padding-top:4px;">🚑</div>
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--l-accent-600);margin-bottom:6px;font-size:12px;letter-spacing:0.5px;">AMBULANZA / 救急車</div>
            <div style="font-size:20px;font-weight:800;color:var(--l-accent-600);letter-spacing:3px;margin-bottom:8px;">119</div>
            <div style="font-size:12px;color:var(--l-muted);margin-bottom:10px;line-height:1.5;">Numero di emergenza nazionale giapponese</div>
            <button onclick="copyToClipboard('119')" style="padding:8px 14px;background:var(--l-accent);color:#fff;border:2px solid var(--l-accent);border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;width:100%;">📱 Copia Numero</button>
          </div>
        </div>

        <!-- FRASE EMERGENZA -->
        <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:20px;padding:14px;background:#fff;border:1.5px solid var(--l-hair);border-radius:14px;box-shadow:0 2px 10px rgba(28,40,71,.06);">
          <div style="flex:0 0 auto;font-size:32px;padding-top:4px;">🗣️</div>
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--l-ink);margin-bottom:8px;font-size:12px;letter-spacing:0.5px;">FRASE DI EMERGENZA</div>
            <div style="font-size:13px;font-weight:700;color:var(--l-ink);margin-bottom:8px;line-height:1.5;padding:8px;background:rgba(20,30,60,0.05);border:1px solid var(--l-hair);border-radius:6px;">${jp}</div>
            <div style="font-size:11px;color:var(--l-muted);margin-bottom:10px;font-style:italic;">Mostra al cameriere o medico in caso di dubbio</div>
            <div style="display:flex;gap:8px">
              <button onclick="showWaiterCard('${jp}')" style="flex:1;padding:8px 14px;background:var(--l-accent);color:#fff;border:2px solid var(--l-accent);border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">🗣️ Mostra al Cameriere</button>
              <button onclick="copyToClipboard('${jp}')" style="flex:1;padding:8px 14px;background:rgba(20,30,60,0.055);color:var(--l-ink);border:1.5px solid var(--l-hair);border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">📋 Copia</button>
            </div>
            <button onclick="window.loadScript('./js/allergy-cards.js').then(() => window.openAllergyCard?.(window.I18N?.lang || 'ja'))" style="width:100%;margin-top:8px;padding:8px 14px;background:rgba(37,99,235,0.12);color:#1d4ed8;border:1.5px solid rgba(37,99,235,0.35);border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">🌐 Carta Allergie Multilingua (JA/EN/IT/ZH/KO)</button>
          </div>
        </div>

        <!-- OSPEDALE -->
        <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:20px;padding:14px;background:#fff;border:1.5px solid var(--l-hair);border-radius:14px;box-shadow:0 2px 10px rgba(28,40,71,.06);">
          <div style="flex:0 0 auto;font-size:32px;padding-top:4px;">🏥</div>
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--l-ink);margin-bottom:8px;font-size:12px;letter-spacing:0.5px;">OSPEDALE PRINCIPALE</div>
            <div style="font-size:12px;color:var(--l-ink);margin-bottom:4px;font-weight:600;">St. Luke's International Hospital</div>
            <div style="font-size:11px;color:var(--l-muted);margin-bottom:6px;line-height:1.4;">9-1 Akashicho, Chuo-ku, Tokyo</div>
            <div style="font-size:11px;color:var(--l-muted);margin-bottom:10px;line-height:1.4;">☎️ +81-3-3541-5151</div>
            <button onclick="openGoogleMaps('St. Luke\\'s International Hospital, Tokyo')" style="padding:8px 14px;background:rgba(20,30,60,0.055);color:var(--l-ink);border:1.5px solid var(--l-hair);border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;width:100%;">🗺️ Apri in Maps</button>
          </div>
        </div>

        <!-- TESSERA MEDICA -->
        <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:20px;padding:14px;background:#fff;border:1.5px solid var(--l-hair);border-radius:14px;box-shadow:0 2px 10px rgba(28,40,71,.06);">
          <div style="flex:0 0 auto;font-size:32px;padding-top:4px;">🆔</div>
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--l-ink);margin-bottom:10px;font-size:12px;letter-spacing:0.5px;">TESSERA MEDICA</div>
            <button onclick="showMedicalCard()" style="width:100%;padding:8px 14px;background:rgba(20,30,60,0.055);color:var(--l-ink);border:1.5px solid var(--l-hair);border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;margin-bottom:6px;">📄 Visualizza / Stampa</button>
            <button onclick="downloadMedicalCard()" style="width:100%;padding:8px 14px;background:rgba(20,30,60,0.055);color:var(--l-ink);border:1.5px solid var(--l-hair);border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">⬇️ Scarica</button>
          </div>
        </div>

        <!-- CONSIGLI RAPIDI -->
        <div style="padding:14px;background:#fff;border:1.5px solid var(--l-hair);border-radius:14px;margin-bottom:16px;box-shadow:0 2px 10px rgba(28,40,71,.06);">
          <div style="font-weight:700;color:var(--l-ink);margin-bottom:10px;font-size:12px;letter-spacing:0.5px;">💡 CONSIGLI DI SICUREZZA</div>
          <div style="line-height:1.8;color:var(--l-muted);font-size:12px;">
            • Mostra frase <strong>PRIMA</strong> di mangiare<br>
            • Porta tessera sempre con te<br>
            • Salva contatto ospedale nel telefono<br>
            • Dì "グルテン" (glutine) ai ristoranti
          </div>
        </div>
      </div>
    `;

    if (typeof window.openSheet === 'function') {
      window.openSheet('🚨 SOS - Emergenza Celiac', html);
    } else {
      console.warn('[sos-view] window.openSheet non disponibile');
    }
  }

  // Expose to global scope (le onclick HTML inline le richiedono globali)
  window.copyToClipboard = copyToClipboard;
  window.openGoogleMaps = openGoogleMaps;
  window.showMedicalCard = showMedicalCard;
  window.downloadMedicalCard = downloadMedicalCard;
  window.renderSOSPanel = renderSOSPanel;
})();
