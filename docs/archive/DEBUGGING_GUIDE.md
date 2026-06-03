# 🔍 Guida Debugging - Risolvere Errori PWA

## Problema: "Host Resolution Error"

### Causa
L'app sta cercando di caricare risorse da URL non corretti o DNS non risolve.

### Come Debuggare

**Step 1: Apri DevTools (F12)**
```
Desktop: F12 → Network tab
Mobile: Apri browser menu → DevTools → Network
```

**Step 2: Filtra per errori**
```
Nella tab "Network":
- Clicca il filtro (imbuto)
- Seleziona "XHR" e "Fetch"
- Ricarica la pagina
- Guarda quale URL fa 404
```

**Step 3: Identifica il problema**

Comune URL che falliscono:
```
❌ fonts/courier.woff2 (RISOLTO ✅)
❌ /api/... (controllare service worker routing)
❌ https://api.open-meteo.com (controllare CORS)
```

**Step 4: Verifica il Manifest**
```javascript
// In console, esegui:
fetch('./manifest.webmanifest')
  .then(r => r.json())
  .then(data => console.log('✅ Manifest valido:', data))
  .catch(e => console.error('❌ Manifest error:', e));
```

Deve ritornare l'oggetto JSON con nome, icons, ecc.

---

## Problema: "GestureDetector TypeError"

### Causa
GestureDetector tenta di accedere a DOM prima che sia pronto.

### Soluzione (già applicata)
```javascript
// ✅ Viene eseguito DOPO che il DOM è caricato
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GestureDetector();
  });
} else {
  new GestureDetector();
}
```

### Come Verificare
```javascript
// In console:
window.GestureDetector // Deve mostrare la class
document.dispatchEvent(new CustomEvent('gesture-swipe', { detail: { direction: 'down' } }));
// Se non vedi errori, è OK
```

---

## Problema: "Service Worker non si registra"

### Cause Comuni

**1. SW file non trovato**
```bash
# Verifica che il file esiste:
ls -la /sw.js
ls -la /js/sw.js
# Deve ritornare file, non "No such file"
```

**2. HTTPS non configurato (Dev)**
```
✅ Funziona: http://localhost:3000 (localhost è eccezione)
✅ Funziona: https://tuodominio.com (HTTPS)
❌ Non funziona: http://192.168.1.100 (non-localhost HTTP)
```

### Come Risolvere

**Se su localhost:**
```
1. http://localhost:3000 (va bene)
2. Se non funziona, controlla la console
```

**Se su Vercel production:**
```
✅ Vercel forza automaticamente HTTPS
✅ Dominio: https://tuodominio.vercel.app
```

**Come verificare SW registrato:**
```javascript
// In console:
navigator.serviceWorker.getRegistrations()
  .then(regs => {
    if (regs.length > 0) {
      console.log('✅ SW Registrato:', regs[0].scope);
    } else {
      console.log('❌ SW Non registrato');
    }
  });
```

---

## Checklist: Installazione PWA

**Prima di provare a installare, verifica:**

```
□ Apri DevTools (F12) → Console
□ Non vedi errori rossi ❌
□ Vedi: "[SW] Service Worker activated" ✓
□ Vedi: "[Install] All handlers ready" ✓
□ Vedi: "[Gestures] ✓ Initialized" ✓
□ Manifest carica senza 404 ✓

Se tutto OK:
□ Rilancia la pagina (Ctrl+R o Cmd+R)
□ Aspetta 2-3 secondi (Service Worker registrazione)
□ Dovresti vedere il popup di installazione
```

---

## Flusso Completo: Da Errori a Funzionamento

### 🔴 Fase 1: Identificare Errori
```
1. Apri DevTools → Console
2. Nota tutti gli errori (rosso ❌)
3. Clicca su ogni errore per dettagli
4. Annota il messaggio di errore
```

### 🟡 Fase 2: Risolvere Uno per Uno
```
Errore: "Failed to load fonts/courier.woff2"
Soluzione: Rimosso caricamento font non-esistente ✅

Errore: "GestureDetector TypeError"
Soluzione: Attendi DOMContentLoaded ✅

Errore: "Service Worker not registering"
Soluzione: Verifica HTTPS + manifest valido
```

### 🟢 Fase 3: Verifica Service Worker
```javascript
// Esegui in console:
navigator.serviceWorker.getRegistrations()
  .then(regs => {
    regs.forEach(reg => {
      console.log('✅ Registrato:', reg.scope);
      console.log('   State:', reg.active?.state);
    });
  });
```

Deve mostrare:
```
✅ Registrato: https://tuodominio.vercel.app/
   State: activated
```

### 🟢 Fase 4: Testa Installazione
```
1. Ricarica la pagina
2. Aspetta il popup
3. Clicca "Installa" o "Aggiungi"
4. Verifica che l'app appaia sulla home screen
```

---

## Debug Su Mobile

### Chrome Android
```
1. Collega il telefono al PC via USB
2. Apri Chrome Desktop
3. Vai su chrome://inspect
4. Clicca "Inspect" accanto al tuo dispositivo
5. DevTools si apre per il telefono
6. Vedi gli stessi errori come su desktop
```

### iOS Safari
```
Sfortunatamente, iOS non ha DevTools integrato.
Alternativa: Usa Eruda (console mobile)

Aggiungi al <head>:
<script src="//cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>

Tocca l'icona in basso a sinistra per aprire console mobile.
```

---

## 🚨 Errori Comuni e Soluzioni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `404 font file` | File non esiste | Usa system fonts oppure aggiungi font file |
| `TypeError: cannot read property` | DOM non ready | Usa `DOMContentLoaded` event |
| `Service Worker not registered` | HTTPS assente | Usa localhost o HTTPS |
| `Manifest not found` | File non linkato | Verifica `<link rel="manifest">` nel HTML |
| `CORS error` | API esterna bloccata | Configura CORS headers sul server |
| `PWA not installable` | Manifest incompleto | Verifica obbligatori: name, icons, start_url |

---

## Verifiche Finali Prima di Distribuire

```bash
# 1. Controlla service worker
curl https://tuodominio.com/sw.js
# Deve ritornare il file, status 200

# 2. Controlla manifest
curl https://tuodominio.com/manifest.webmanifest
# Deve ritornare JSON valido, status 200

# 3. Controlla HTTPS
# L'URL deve iniziare con https://

# 4. Testa su Lighthouse
# DevTools → Lighthouse → PWA audit
# Score deve essere > 90
```

---

## 📱 Test su Dispositivi Reali

**Consigliato ordine di test:**

```
1. Desktop Chrome (più facile debuggare)
   ↓
2. Desktop Edge (verifica multi-browser)
   ↓
3. Android Chrome (mobile principale)
   ↓
4. iOS Safari (test finale)
```

---

**Documento**: 🔍 Debugging Guide  
**Ultimo aggiornamento**: May 2026  
**Status**: ✅ Pronto per uso
