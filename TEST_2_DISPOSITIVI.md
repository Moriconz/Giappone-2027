# Test sul campo — 2 dispositivi (l'ultimo miglio)

Tutto è testato in simulazione. Questa checklist verifica l'unica cosa che la
simulazione non può provare: **la consegna reale dei messaggi MQTT tra due
telefoni fisici**. Servono ~15 minuti.

## Preparazione
- **Telefono A** e **Telefono B**, entrambi con connessione (Wi-Fi o dati).
- Apri l'app (URL Vercel) su entrambi. Meglio installarla come PWA (vedi §6).
- Su A: completa l'onboarding (crea il viaggio). Su B puoi saltarlo ("Partecipare").
- Tieni i telefoni vicini così vedi entrambi gli schermi.

> ✅ = atteso · Se qualcosa non compare entro ~5 secondi, annota cosa e in quale step.

---

## 1. Gruppo: creazione e join
**Su A:** Menu → 👥 Gruppo → "Crea Nuova" → scrivi il tuo nome → **✅ Connetti**.
- A: appare il **codice stanza a 6 caratteri** (es. `5RRV8J`) e 🟢 Connesso.
- A: dopo qualche secondo deve comparire **🔒 E2EE** accanto allo stato.

**Su B:** Menu → 👥 Gruppo → "Entra Esistente" → digita il codice di A → nome → **✅ Connetti**.
- ✅ B: 🟢 Connesso + 🔒 E2EE.
- ✅ A: nella lista membri compare **B** (🟢 Online) entro pochi secondi.
- ✅ B: nella lista membri compare **A**.

---

## 2. Chat (il test di sync più rapido)
**Su A:** apri la chat del gruppo, scrivi "ciao da A", invia.
- ✅ B: il messaggio "ciao da A" compare in chat.
**Su B:** rispondi "ciao da B".
- ✅ A: compare "ciao da B".
- ✅ **Nessun messaggio doppio** (verifica il fix dedup): scrivi 3-4 messaggi veloci da A, su B devono apparire **una volta sola** ciascuno.

---

## 3. GPS in tempo reale
**Su entrambi:** assicurati che il GPS sia attivo (icona posizione / consenti accesso).
- ✅ A: sulla mappa appare il **marker di B** (iniziali di B) nella sua posizione.
- ✅ B: appare il marker di A.
- Cammina qualche metro con un telefono → ✅ il suo marker si muove sull'altro.

---

## 4. Itinerario: creazione → condivisione → modifica condivisa
**Su A:** crea l'itinerario — tocca qualche POI sulla mappa → "📅 Aggiungi all'itinerario" → scegli giorno/ora. Aggiungi 2-3 tappe su giorni diversi.
**Su A:** apri l'itinerario, condividilo al gruppo (bottone condivisione gruppo).
- ✅ B: apri il pannello Gruppo → vedi l'**itinerario di A** comparso tra gli itinerari di gruppo.

**Su B:** apri quell'itinerario di gruppo e **aggiungi una tappa** (o modificane una).
- ✅ A: la modifica di B **rientra nell'itinerario di A**, nel giorno giusto, con nome/costo/orario corretti.
- ✅ A: mentre B sta guardando l'itinerario, in cima ad A compare "🟢 B sta guardando".

**Condivisione esterna (link):**
**Su A:** genera il **link di condivisione** dell'itinerario → invialo a te stesso (es. WhatsApp) → aprilo in un browser qualsiasi.
- ✅ Si apre l'anteprima "Itinerario condiviso" → "Importa" → le tappe arrivano con orari/costi/posizioni.

---

## 5. Le funzioni collaborative (il cuore "condivisione + GF")

### 🗳️ Wishlist GF di gruppo
**Su A:** apri un POI gluten-free → "🗳️ Proponi al gruppo".
- ✅ B: Menu → 🗳️ Wishlist GF → vede il locale proposto da A.
**Su B:** vota 👍 "Ci andrei". **Su A:** vota 👍.
- ✅ Entrambi: il punteggio sale a **+2**.
**Su A:** "➕ In itinerario" su quel locale → ✅ compare nel tuo itinerario.

### 💴 Spese di gruppo
**Su A:** Menu → 💴 Spese → aggiungi "Cena ramen GF" 9000, pagato da A.
**Su B:** aggiungi "Taxi" 3000, pagato da B.
- ✅ Entrambi: i **saldi** si aggiornano (A in positivo, B in negativo) e compare "Chi deve a chi" con l'importo del rimborso.

### 📋 Checklist condivisa
**Su A:** Menu → 📋 Checklist → "🍪 Aggiungi preset GF". Spunta una voce.
- ✅ B: vede le voci e la spunta di A ("fatto da A"); la barra di completamento si aggiorna su entrambi.

### 📷 Foto menù GF
**Su A:** apri un POI → sezione "📷 Foto menù GF" → "Aggiungi foto menù" → scatta/scegli.
- ✅ B: aprendo lo **stesso POI**, vede la miniatura della foto caricata da A. Toccala → si ingrandisce.

---

## 6. PWA, offline, privacy

### Install (PWA)
- **iPhone (Safari):** Condividi → "Aggiungi a Home". **Android (Chrome):** menu → "Installa app".
- ✅ L'app si apre a schermo intero come un'app nativa, icona in home.

### Offline
- Con l'app aperta, **disattiva la rete** su un telefono.
- ✅ La mappa e l'itinerario restano visibili (cache); compare il banner "📶 Offline".
- Riattiva la rete → ✅ le modifiche fatte offline si **ri-sincronizzano** col gruppo.

### Privacy (E2EE)
- ✅ Indicatore 🔒 E2EE presente nel pannello gruppo su entrambi = traffico cifrato col codice stanza.

---

## Cosa annotare se qualcosa non va
Per ogni problema: **(a)** in quale step, **(b)** cosa hai fatto su A, **(c)** cosa
NON è comparso su B (o viceversa), **(d)** dopo quanti secondi hai rinunciato.
Con questo si individua subito se è un problema di consegna MQTT, di rendering o
di permessi (GPS/notifiche).
