/**
 * views/tips-view.js — Tips di viaggio Giappone 2027
 *
 * Estratto da app-core.js il 2026-05-26 come parte dello scorporo del monolite
 * (vedi STATO_APP.md §8.5). Vista "scaffolding-ready": il contenuto è curato
 * (frasi GF, timing 2027, alternative ai tourist trap, errori da evitare,
 * info pratiche su pagamenti/SIM/JR Pass), ma non è ancora collegata al menu.
 * Esposta come window.renderTipsView() per essere agganciata da una voce di menu.
 *
 * Dipendenze esterne (tutte già su window):
 *   - window.openSheet(title, html)
 */
(function () {
  'use strict';

  function renderTipsView() {
    const html = `
      <div class="section">
        <h3>🌾 Gluten-Free in Giappone</h3>
        <p><strong>Frasi essenziali</strong> (mostrare al ristorante):</p>
        <ul>
          <li>グルテンフリーで食べられる料理はありますか？ = "Avete piatti gluten-free?"</li>
          <li>小麦アレルギーです。醤油の代わりにたまりをください = "Sono allergico al grano. Al posto della salsa di soia, tamari per favore."</li>
          <li>I <strong>soba al 100%</strong> (十割 juwari) sono GF — ma attenzione al bollitore condiviso.</li>
        </ul>
        <p><strong>Da evitare sempre:</strong> tempura, katsu, dumpling gyoza, ramen, udon, takoyaki, okonomiyaki, tonkatsu, gran parte delle salse (soia, ponzu, teriyaki, worcester, karashi mentaiko).</p>
        <p><strong>Sicuri di default:</strong> sashimi (con tamari proprio), yakitori senza salsa (solo shio), onigiri di ume/shio, riso bianco, mochi semplice, frutta.</p>
        <p><strong>App consigliate:</strong> Shoku (community celiac Giappone), Google Translate con foto.</p>
      </div>
      <div class="section">
        <h3>📅 Timing ideale 2027</h3>
        <ul>
          <li><strong>Sakura:</strong> Tokyo ~27 mar-5 apr, Kyoto ~30 mar-8 apr, Sapporo ~5 mag.</li>
          <li><strong>Foliage:</strong> Nikko fine ott, Kyoto metà-fine nov, Hokkaido inizio ott.</li>
          <li><strong>Evitare:</strong> Golden Week (29 apr-5 mag — tutto affollato/caro), Obon (metà ago).</li>
          <li><strong>Meteo:</strong> giugno = tsuyu (stagione piogge), luglio-agosto = caldo umido intenso, settembre = tifoni.</li>
          <li><strong>Consigliati:</strong> fine mar-aprile (sakura), fine ottobre-novembre (foliage, prezzi), fine maggio (verde, meteo buono).</li>
        </ul>
      </div>
      <div class="section">
        <h3>🔄 Alternative consigliate</h3>
        <ul>
          <li><strong>Arashiyama bamboo</strong> → <strong>Hokoku-ji (Kamakura)</strong>: stessa magia, 100 persone vs 10.000.</li>
          <li><strong>Fushimi Inari alle 11</strong> → <strong>Fushimi Inari alle 6</strong>: esperienza totalmente diversa.</li>
          <li><strong>Harajuku Takeshita</strong> (trappola kawaii) → <strong>Koenji</strong> (vintage vero, nessun turista).</li>
          <li><strong>Shibuya Sky</strong> (caro) → <strong>Mag's Park Crossing View</strong> (1000¥, stessa vista sull'incrocio).</li>
          <li><strong>Gotemba Premium Outlets</strong> → <strong>Shimokitazawa</strong> per vintage unico vs brand scontati.</li>
          <li><strong>Dotonbori Takoyaki</strong> (NO GF) → <strong>Kuromon Market wagyu grilled</strong> (GF naturale).</li>
        </ul>
      </div>
      <div class="section">
        <h3>✅ Cose da fare assolutamente</h3>
        <ul>
          <li>Onsen (bagno termale) — Beppu o ryokan notte.</li>
          <li>Ryokan tradizionale almeno una notte (idealmente Shirakawa-go o Kyoto).</li>
          <li>Shinkansen passando tra le città — JR Pass valutare.</li>
          <li>Izakaya GF-aware (yakitori solo shio + sashimi) almeno una sera.</li>
          <li>Visita a un mercato mattutino (Tsukiji, Nishiki, Kuromon).</li>
          <li>Cerimonia del tè (Kyoto o Kamakura).</li>
        </ul>
      </div>
      <div class="section">
        <h3>⛔ Errori da evitare</h3>
        <ul>
          <li>Non mangiare/bere camminando (specie nei santuari).</li>
          <li>Non dare/ricevere denaro con una sola mano (usarne due o il vassoietto).</li>
          <li>Tatuaggi: molti onsen li vietano — cercare "tattoo friendly" o ryokan privati.</li>
          <li>Soffiare il naso in pubblico = maleducato. Tirarlo su = normale.</li>
          <li>Mancia = offensiva. Mai dare tip.</li>
          <li>Non improvvisare senza prenotazioni a Ryokan, ristoranti famosi, TeamLab.</li>
        </ul>
      </div>
      <div class="section">
        <h3>💳 Pratica</h3>
        <ul>
          <li><strong>Pagamenti:</strong> cash ancora necessario fuori città grandi. IC Card (Suica/ICOCA) essenziale per trasporti — ora su Apple Wallet/Google Wallet.</li>
          <li><strong>SIM:</strong> eSIM Japan Wireless o Ubigi prima di partire.</li>
          <li><strong>JR Pass:</strong> dal 2023 +70% prezzo — calcolare se conveniente (spesso no per itinerari multi-hub lenti).</li>
          <li><strong>Valigia:</strong> servizio Yamato (takuhaibin) sposta bagagli tra hotel per ~2000¥.</li>
          <li><strong>Emergenze:</strong> 110 polizia, 119 ambulanza/fuoco. Ambasciata IT a Tokyo +81-3-3453-5291.</li>
        </ul>
      </div>
    `;
    if (typeof window.openSheet === 'function') {
      window.openSheet('💡 Tips Giappone 2027', html);
    } else {
      console.warn('[tips-view] window.openSheet non disponibile');
    }
  }

  window.renderTipsView = renderTipsView;
})();
