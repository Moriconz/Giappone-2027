# 📱 Guida: Installazione PWA + Distribuzione Vercel

## PARTE 1: INSTALLARE L'APP SUL TUO DISPOSITIVO

### ✅ SU ANDROID (Chrome, Edge, Firefox, Samsung Internet)

**Metodo 1: Install Prompt (Automatico)**
```
1. Apri https://tuodominio.vercel.app su Chrome/Edge/Samsung Internet
2. Aspetta il popup "Aggiungi a Schermata Iniziale"
3. Tocca "Installa" o "Aggiungi"
4. L'app appare sulla home screen come app nativa
```

**Metodo 2: Menu Manuale (Se il popup non appare)**
```
1. Apri l'app nel browser
2. Tocca i 3 puntini (menu) in alto a destra
3. Seleziona "Installa app" o "Add to Home screen"
4. Conferma con "Installa"
```

**Metodo 3: Share Menu (Per qualsiasi browser)**
```
1. Apri l'app nel browser
2. Tocca il pulsante Condividi
3. Scorri e cerca "Aggiungi a Schermata Iniziale"
4. Tocca e conferma
```

---

### ✅ SU iOS 16.4+ (Safari, Chrome, Edge, Firefox)

**Unico metodo: Safari Share Menu**
```
1. Apri https://tuodominio.vercel.app su Safari
2. Tocca il pulsante Condividi (freccia verso l'alto)
3. Scorri verso destra e tocca "Aggiungi a Schermata Iniziale"
4. Digita un nome (es: "Giappone 2027")
5. Tocca "Aggiungi" in alto a destra
```

⚠️ **Importante iOS:**
- Funziona SOLO da Safari
- Chrome, Edge, Firefox su iOS usano il motore Safari dietro le quinte
- L'app si apre in modalità fullscreen (no barra browser)

---

### ✅ SU DESKTOP (Windows/Mac/Linux con Chrome/Edge)

**Metodo 1: Install Badge (Automatico)**
```
1. Apri https://tuodominio.vercel.app
2. Cerca l'icona in alto a destra della barra degli indirizzi (⬇️ o ⊞)
3. Clicca su di essa
4. Clicca "Installa"
5. L'app si apre come finestra separata (desktop app)
```

**Metodo 2: Menu Chrome/Edge**
```
1. Clicca i 3 puntini in alto a destra
2. Vai su "Altre strumenti" → "Crea scorciatoie"
3. Seleziona "Apri come finestra"
4. Clicca "Crea"
```

---

## TROUBLESHOOTING: Perché non si installa?

### ❌ Il popup non appare

**Cause possibili:**
1. **Manifest.webmanifest non è accessibile**
   - Verifica: Apri DevTools → Network → Filtra "manifest"
   - Deve essere status 200, non 404

2. **Service Worker non è registrato**
   - Verifica: DevTools → Application → Service Workers
   - Deve dire "Active and running" non "unregistered"

3. **HTTPS non è configurato**
   - Verifica: URL deve iniziare con `https://`, non `http://`
   - Su localhost funziona anche senza HTTPS

4. **Segnale GPS/Internet instabile**
   - L'app sta caricando dati al background
   - Aspetta 2-3 secondi prima di cliccare "Installa"

**Come risolvere:**
```javascript
// Apri la console (F12) e esegui:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log('✅ SW Registrato:', reg.scope));
});

// Deve mostrare: ✅ SW Registrato: https://tuodominio.vercel.app/
```

---

## PARTE 2: DISTRIBUIRE SU VERCEL

### 🚀 Step 1: Preparare il Progetto

**1. Crea account Vercel**
```
Vai a https://vercel.com
Registrati con GitHub, GitLab, o email
```

**2. Collega il tuo repository GitHub**
```
In Vercel Dashboard:
- Clicca "New Project"
- Seleziona il tuo repository
- Clicca "Import"
```

**3. Configura le variabili d'ambiente (se necessarie)**
```
Nel progetto Vercel:
- Vai su "Settings" → "Environment Variables"
- Aggiungi variabili (es: API keys, database URL)
- Clicca "Save"
```

---

### 🚀 Step 2: Deploy Automatico

Il file `vercel.json` è già configurato. Quando fai push a GitHub:
```
1. Fai commit e push del tuo codice a GitHub
2. Vercel automaticamente:
   ✅ Scarica il codice
   ✅ Costruisce il progetto
   ✅ Configura caching (vercel.json)
   ✅ Deploya in produzione
3. Ricevi un URL: https://tuodominio.vercel.app
```

---

### 🚀 Step 3: Personalizza il Dominio

**Opzione 1: Usa il dominio Vercel (Gratuito)**
```
Default: https://giappone-2027-[random].vercel.app
✅ Funziona subito
❌ Poco professionale
```

**Opzione 2: Aggiungi un dominio personalizzato**
```
1. In Vercel Dashboard → "Domains"
2. Clicca "Add Domain"
3. Inserisci il tuo dominio (es: giappone2027.it)
4. Vercel ti dà i DNS records
5. Aggiorna i DNS dal tuo registrar (GoDaddy, Namecheap, ecc)
6. Aspetta 24-48h per propagazione DNS
```

**Opzione 3: Compra un dominio**
```
Se non hai un dominio, compralo da:
- Namecheap.com
- GoDaddy.com
- Google Domains
- OVH.com

Costo: €1-15/anno
```

---

### 🚀 Step 4: Monitoraggio e Analytics

**Vercel Analytics (Gratis)**
```
Nel dashboard → Analytics tab:
- Vedi visits, performance, errors
- Monitora Core Web Vitals
```

**Google Analytics (Opzionale)**
```
Se vuoi tracking avanzato:
1. Vai a https://analytics.google.com
2. Registrati
3. Crea una proprietà per il tuo dominio
4. Aggiungi il tracking code all'HTML
```

---

### 🚀 Step 5: Mantieni l'App Aggiornata

**Workflow di sviluppo continuo:**
```
1. Fai cambiamenti localmente
2. Testa su localhost (npm start o simile)
3. Fai commit: git commit -m "Fix X"
4. Push a GitHub: git push
5. Vercel automaticamente:
   - Tira il codice
   - Lo testa
   - Lo deploya
   - Mostra anteprima (Preview Deployment)
6. Una volta testato, mergia su main/master
7. Auto-deploy in produzione
```

---

### 🚀 Step 6: Proteggi i Dati Sensibili

**❌ NON fare:**
```javascript
// ❌ NON mettere credenziali qui
const API_KEY = "sk-12345678";
const DB_PASSWORD = "password123";
```

**✅ FALLO COSÌ:**
```
1. In Vercel Settings → Environment Variables
2. Aggiungi le variabili sensibili
3. Nel codice, accedile come:
   const API_KEY = process.env.REACT_APP_API_KEY;
```

---

## RIASSUNTO: Flusso Completo

```
┌─────────────────────────────────────┐
│  TU (Sviluppatore)                  │
│  Localhost + Git                    │
└──────────────┬──────────────────────┘
               │
               │ git push origin main
               ↓
┌─────────────────────────────────────┐
│  GitHub Repository                  │
│  Il tuo codice è qui                │
└──────────────┬──────────────────────┘
               │
               │ Webhook automatico
               ↓
┌─────────────────────────────────────┐
│  Vercel CI/CD Pipeline              │
│  - Build                            │
│  - Test                             │
│  - Caching setup (vercel.json)      │
└──────────────┬──────────────────────┘
               │
               │ Deploy completato
               ↓
┌─────────────────────────────────────┐
│  UTENTI FINALI                      │
│  https://giappone2027.it            │
│  - Accedono tramite browser         │
│  - Cliccano "Installa"              │
│  - App sul loro dispositivo ✅      │
└─────────────────────────────────────┘
```

---

## 📚 Fonti

- [MDN: Making PWAs Installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Web.dev: PWA Installation](https://web.dev/learn/pwa/installation)
- [Vercel Deployment Docs](https://vercel.com/docs/deployments)
- [PWA Installation Guide 2025](https://www.bitcot.com/how-to-install-a-pwa-to-your-device/)

---

## ❓ FAQ

**D: Dopo che installo la PWA, continua a funzionare offline?**
R: Sì! Se l'utente ha caricato la mappa/dati prima di andare offline, può usare tutto offline grazie al Service Worker.

**D: Quando faio un aggiornamento, gli utenti lo vedono subito?**
R: Service Worker cachea i file. Il Service Worker stesso verrà aggiornato in ~1 minuto. I dati cachati verranno aggiornati quando l'app rileva una nuova versione.

**D: Posso fare beta testing prima di fare il release finale?**
R: Sì! Usa Preview Deployments di Vercel. Ogni branch di GitHub ottiene un URL temporaneo per testare.

**D: Quanti utenti può supportare una PWA su Vercel?**
R: Illimitati! Vercel scalea automaticamente. Pagherai solo se usi molti Function invocations (non è il caso di una static PWA).

**D: Posso monetizzare la mia PWA?**
R: Sì! Opzioni:
- Ads (Google AdSense)
- Subscriptions (Stripe)
- In-app purchases
- Sponsorships

---

**Status**: ✅ Guida Completa 2026
**Versione**: 1.0
