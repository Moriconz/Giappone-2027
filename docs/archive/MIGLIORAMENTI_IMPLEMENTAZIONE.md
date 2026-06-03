# SafeEats — Guida Implementazione Miglioramenti
**Data:** 11 Maggio 2026 | **Status:** Sprint 1 in progress

---

## 📋 Stato P1 (Priorità Immediata)

| Task | Status | Deliverable | Effort |
|------|--------|-------------|--------|
| ✅ Service Worker verify | Completato | sw.js registrato riga 9720 | - |
| 🔄 GF Safety + JP Phrases | In progress | gf-safety.js + show-to-waiter.js | 2h |
| ⏳ Sentry error tracking | Creato config | sentry-init.js (DSN da configurare) | 0.5h |
| ⏳ Modularizzare index.html | TODO | core/map/chat/gallery/budget modules | 8h |
| ⏳ Lighthouse audit | TODO | Fix top 5 issue (perf/a11y/SEO) | 1h |

---

## 🔧 Nuovi Moduli Creati

### 1. **js/gf-safety.js** (150 righe)
Tutto ciò che celiaco needs:

```javascript
import { 
  GF_SAFETY_LEVELS,      // 🟢🟡🟠🔴 badge system
  GF_PHRASES_JP,         // Frasi + pronuncia romaji
  GFSafetyPOI,          // Schema per POI GF
  GFPhraseTTS,          // Web Speech API TTS offline
  filterGFPOIsBySafety  // Query by risk score
} from './gf-safety.js';
```

**Features:**
- `GFSafetyPOI.getBadge()` → "🟢 Dedicato (15d)"
- `GFSafetyPOI.getRiskScore()` → 0-100 (age + level)
- `GFSafetyPOI.getEmergencyCard()` → tessera medica JP
- `GFPhraseTTS.speak('soy_sauce')` → TTS ristorante

### 2. **js/show-to-waiter.js** (120 righe)
Modal fullscreen giapponese per mostrare cameriere:

```javascript
import { showToWaiter } from './show-to-waiter.js';

// Bottone SOS in nav
document.getElementById('btn-show-waiter').onclick = () => showToWaiter.open();

// Keyboard shortcut: Ctrl+W
// Mostra testo GRANDE 4rem: "セリアック病" + emoji 🚫
```

**Content:**
- Titolo EN + JP (big, bold)
- Diagnosis box glassmorphism
- Allergen checklist (soy, dashi, bread, noodles)
- Emergency: "119に電話してください"
- Close: Esc or Back button

### 3. **js/sentry-init.js** (70 righe)
Error tracking async (non-blocking):

```javascript
// Auto-init on load (lazy, no impact on FCP)
// Captures: crashes, promise rejections, unhandled errors
// Replay on error enabled

window.logError('utente trovato glutine', { ristorante_id, soy_sauce: true });
// → sent to Sentry dashboard
```

**Setup necessario:**
1. Account gratis su [sentry.io](https://sentry.io)
2. Crea progetto "Web" → ottieni DSN
3. Replace `REPLACE_WITH_YOUR_DSN` in sentry-init.js
4. Link in `<head>` di index.html (post-load):
   ```html
   <script src="./js/sentry-init.js" async defer></script>
   ```

---

## 🔗 Integrazione in index.html

### Aggiungi a `<head>` (dopo manifest):
```html
<!-- GF Safety schema per POI rendering -->
<script type="module" src="./js/gf-safety.js"></script>

<!-- Show-to-waiter modal -->
<script type="module" src="./js/show-to-waiter.js"></script>

<!-- Sentry error tracking (async, lazy) -->
<script src="./js/sentry-init.js" async defer></script>
```

### Aggiungi bottone in nav (subito dopo "Mappa"):
```html
<div class="y2k-window nav-btn" id="waiter-btn" style="position: absolute; top: 10px; right: 60px;">
  <button onclick="showToWaiter.open()" style="font-size: 1.2rem; padding: 12px 20px;">
    🚨 Mostra al cameriere
  </button>
</div>
```

### Per ogni POI GF in mappa, render:
```javascript
const poi = new GFSafetyPOI(basePOI);
const badge = poi.getBadge();  // "🟢 Dedicato (15d)"
const riskScore = poi.getRiskScore(); // 0-100

// Colora marker per risk score
marker.setStyle({
  color: riskScore < 25 ? '#4CAF50' : riskScore < 50 ? '#FFC107' : '#FF5722'
});
```

---

## 📊 Impact Utente Finale

### Prima (Stato attuale)
❌ "GF certificato" → troppo vago per celiaco severo
❌ Paura: "Quanto è veramente sicuro questo ristorante?"
❌ Niente testo giapponese → chiede male in ristorante
❌ Incidente → niente error tracking, impossibile capire perché

### Dopo (Con miglioramenti P1)
✅ "🟢 Dedicato (3d)" → confidence alta
✅ Risk score 15/100 → decision veloce
✅ Tap "Mostra al cameriere" → cameriere vede giapponese GRANDE
✅ Frasi con audio TTS → pronuncia corretta
✅ Crash? → Sentry traccia, team sa cosa fixare

**Result:** Celiaco viaggio + usa app → dormi tranquillo 😴

---

## 🛣️ Roadmap Sprint 2 (prossimi 2 sprint)

### Sprint 2B (P1 final week)
- [ ] Integrare gf-safety.js in index.html mappa rendering
- [ ] Modulo "verifica età dati" → warning se >12 mesi
- [ ] Foto menu GF per POI (upload + validazione)
- [ ] Test offline per show-to-waiter (deve funzionare offline)

### Sprint 3 (P2 — Performance)
- [ ] Splittare index.html → 5 moduli ES6 core/map/chat/gallery/budget
- [ ] Cluster OpenLayers + WebGL per 10k+ POI
- [ ] IndexedDB per budget + chat (swap localStorage)
- [ ] Image compression client-side prima di salvare

### Sprint 4 (P2 — UX)
- [ ] Wizard onboarding "Quanti siete? Quando? GF severity?"
- [ ] Notifiche "ora pranzo" + ristoranti aperti vicino
- [ ] Accessibility pass (a11y, keyboard nav, color contrast)

### Sprint 5 (P2 — Visibility)
- [ ] Landing page SEO
- [ ] Blog articles (10 ristoranti GF a Tokyo, frasi JP essenziali)
- [ ] Open Graph + JSON-LD schema.org

### Sprint 6 (P2 — Launch)
- [ ] Product Hunt launch
- [ ] Google Play TWA wrapper
- [ ] Newsletter pre-viaggio

---

## 🚨 Criticalità Residue

| Rischio | Mitigazione | Timeline |
|---------|------------|----------|
| POI data stale al viaggio | Sistema verifica + crowdsource | NOW |
| index.html 10k righe cresce | Modularizzazione atomica | Sprint 3 |
| Geolocation denied iOS | Fallback Tokyo coords | Sprint 2B |
| Open-Meteo rate limit | Cache 2h + fallback | Sprint 3 |
| Service Worker stale cache | Version bump + skipWaiting | ✅ Done |

---

## 📞 Contacts / Resources

- **Sentry free:** https://sentry.io (5k errori/mese)
- **GlitchTip self-hosted:** https://glitchtip.com (alternativa)
- **Frasi JP source:** Coeliac Japan Org + Google Translate verify
- **TTS API:** Web Speech API (browser nativo, offline)

---

**Fine guida. Procedi step-by-step. Backup disponibili se rollback serve.**

