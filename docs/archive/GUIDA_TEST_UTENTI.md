# 🧭 Tabi — Guida per i tester

> **Tabi (旅)** è il compagno di viaggio per il Giappone 2027: mappa interattiva con migliaia di luoghi, focus **gluten-free** per celiaci, itinerario multi-giorno, gruppo in tempo reale (GPS + chat), tutto funzionante anche **offline**. Questa guida ti spiega come usarla e cosa controllare. Tempo stimato per il test completo: **30-40 minuti** (la parte gruppo richiede 2 persone).

**Come segnalare un problema:** annota *cosa stavi facendo*, *cosa ti aspettavi* e *cosa è successo* (uno screenshot vale oro). Se l'app si comporta in modo strano, prova prima a ricaricare la pagina.

---

## 1. Installazione (2 min)

1. Apri l'URL dell'app sul telefono (serve HTTPS, es. il link Vercel che ti è stato inviato).
2. Installa come app:
   - **iPhone (Safari):** tasto Condividi → "Aggiungi a schermata Home".
   - **Android (Chrome):** menu ⋮ → "Installa app" (o accetta il banner).
3. Apri l'app dall'icona sulla home.

**✅ Verifica:** l'icona è un **torii bianco su sole rosso** (non un quadrato vuoto). L'app si apre a schermo intero senza barra del browser.

---

## 2. Primo avvio — Onboarding (3 min)

Al primo avvio compare la creazione del viaggio.

1. Compila: nome viaggio, **numero giorni**, **data di inizio**, dimensione gruppo, interessi (almeno 1), dieta, budget giornaliero.
2. Conferma.

**✅ Verifica:** dopo la conferma si apre la mappa del Giappone. In alto vedi: titolo **🧭 Tabi**, bottone **🔍**, selettore lingua **IT/EN/日本語**.

**🌐 Test lingua:** cambia lingua in EN e poi 日本語 → menu, navigazione e pannelli si traducono. Torna su IT.

---

## 3. Mappa e luoghi (5 min)

La vista principale. I luoghi (POI) si caricano automaticamente mentre ti muovi sulla mappa.

1. **Muovi e zooma** la mappa su Tokyo/Kyoto → compaiono marker colorati per categoria; i gruppi di marker vicini si raggruppano in **cluster numerati** (tap sul cluster → zoom).
2. **Barra filtri** sotto l'header: prova le chip (Ristoranti, Templi, Musei…) → i marker si filtrano. Prova **🌾 Solo GF**.
3. **Tap su un marker** → si apre la scheda del luogo con: foto, orari di apertura, indirizzo, telefono, eventuale badge **GF Confermato/Probabile**, voto a stelle.
4. Nella scheda prova: **🗺️ Apri in Maps**, **💾 Salva** (preferiti), campo **note personali**, **✅ Segna visitato**.

**✅ Verifica:** le schede si aprono fluide, le foto caricano, nessun marker "fantasma" che non risponde al tap.

**🌤️ Meteo:** in basso a sinistra c'è il widget meteo → tap su "more" apre le previsioni complete. Chiudi con ✕.

---

## 4. Itinerario (8 min)

Il cuore della pianificazione. Tab **Itinerario** nella barra in basso.

1. **Aggiungi tappe:** dalla mappa, apri un POI → **📅 Aggiungi all'itinerario** → wizard in 3 passi (giorno → ora e durata → note/costo/trasporto) → conferma. Aggiungi **3-4 tappe su almeno 2 giorni diversi**.
2. **Gestisci:** nell'itinerario trascina le tappe per riordinarle, modifica (✏️) ed elimina (🗑️) una tappa. Tra le tappe vedi distanza e tempo di spostamento stimati.
3. **Ottimizza giorno:** usa il bottone di ottimizzazione → le tappe si riordinano per minimizzare gli spostamenti.
4. **Budget (💰 dal menu):** imposta un budget totale, registra una spesa → la barra "Speso vs Rimanente" si aggiorna. Cambia valuta ¥/€ → i valori si convertono col cambio reale.
5. **Esporta:** prova **📤 WhatsApp** (testo leggibile) e **📥 .ics** (si importa nel calendario del telefono).
6. **🗓️ Timeline viaggio (NUOVO):** Menu → **🗓️ Timeline viaggio** → panoramica verticale di tutti i giorni con le tappe in ordine orario e le **date reali** del tuo viaggio. Tap su una tappa → si apre la scheda del luogo.

**✅ Verifica:** le tappe restano salvate anche se chiudi e riapri l'app. La timeline mostra giorni e orari corretti.

---

## 5. Ricerca globale (2 min) — NUOVO

1. Tocca **🔍** in alto (o Menu → Cerca ovunque).
2. Digita almeno 2 caratteri (es. "ramen", o il nome di una tappa che hai aggiunto).

**✅ Verifica:** i risultati compaiono mentre digiti, divisi in **Luoghi** e **Itinerario**. Tap su un luogo → apre la scheda; tap su una tappa → apre l'itinerario.

> Nota: la ricerca lavora sui luoghi già caricati sulla mappa — se cerchi qualcosa di una città mai visitata sulla mappa, prima spostati lì.

---

## 6. Gluten-Free (5 min) — il focus dell'app

Tab **GF Guide** nella barra in basso.

1. **Frasi essenziali:** frasi IT→giapponese da mostrare al ristorante → tap → "✅ Frase copiata".
2. **🗣️ Mostra al Cameriere:** carta allergie a schermo pieno in giapponese, pensata per essere mostrata al personale.
3. **Tessera Medica:** scarica la Celiac Medical Card.
4. **🤖 Analizza Menu:** scrivi piatti (es. "ramen, tempura, onigiri") o carica la foto di un menu → l'AI segnala cosa è sicuro/a rischio per un celiaco. Se l'AI non è disponibile, deve comparire l'analisi locale di riserva (non un errore).
5. **🏪 I Miei Posti GF / 💡 Suggerisci POI:** salva un tuo posto GF con rating e note; suggerisci un nuovo locale.
6. **🚨 SOS:** pannello di emergenza con contatti e frasi critiche.

**✅ Verifica:** sulla mappa con filtro 🌾 i ristoranti GF hanno il badge nella scheda; l'analisi menu risponde sempre qualcosa (AI o fallback).

---

## 7. Gruppo in tempo reale (10 min — servono 2 telefoni)

La parte più importante da testare in due. Persona **A** e persona **B**.

1. **A:** Menu → **👥 Gruppo** → Crea Nuova → nome → Connetti. Appare un **codice a 6 caratteri** (es. `5RRV8J`) e 🟢 Connesso + **🔒 E2EE** (i messaggi sono cifrati).
2. **B:** Menu → Gruppo → Entra Esistente → codice di A → nome → Connetti.
   - ✅ Entrambi vi vedete nella lista membri entro pochi secondi.
3. **Chat:** scambiatevi messaggi → arrivano entro 1-2 secondi, **mai duplicati**.
4. **GPS live:** con GPS attivo, sulla mappa di A compare il marker di B (e viceversa). Camminate qualche metro → il marker si muove.
5. **Itinerario condiviso:** A condivide il suo itinerario col gruppo → B lo vede nel pannello Gruppo, lo apre e **aggiunge/modifica una tappa** → la modifica torna nell'itinerario di A nel giorno giusto. Mentre B guarda, su A compare "🟢 B sta guardando".
6. **Extra di gruppo** (dal menu): **🗳️ Wishlist GF** (proponi un locale e votate), **💴 Spese di gruppo** (registra una spesa → calcola chi deve a chi), **📋 Checklist** condivisa.

**✅ Verifica:** tutto si sincronizza entro pochi secondi. Se il primo server non risponde, l'app **passa da sola a un server di riserva** entro ~12 secondi: se al primo tentativo "Connetti" resta in attesa, aspetta fino a 30 secondi prima di considerarlo un errore.

---

## 8. Offline e batteria (3 min)

1. **Offline:** usa l'app qualche minuto (mappa + itinerario), poi attiva la **modalità aereo** e riapri l'app.
   - ✅ Compare il banner "📶 Offline — dati in cache"; l'itinerario e i luoghi già visti restano consultabili. Riattiva la rete → il banner sparisce.
2. **🔋 Risparmio batteria (NUOVO):** Menu → **Risparmio batteria** → l'interfaccia diventa "piatta" (niente sfocature/animazioni, consuma molta meno GPU). Riattivalo dal menu (la voce mostra ✓ quando attivo). La preferenza resta salvata alla riapertura.

---

## 9. Riepilogo rapido — cosa deve funzionare

| Area | Test minimo | OK? |
|------|-------------|-----|
| Installazione | PWA installata, icona torii | ☐ |
| Onboarding | Viaggio creato, lingue IT/EN/JA | ☐ |
| Mappa | Marker, cluster, filtri, scheda POI | ☐ |
| Itinerario | 3+ tappe, riordino, export, persistenza | ☐ |
| 🗓️ Timeline | Giorni e orari corretti, tap → POI | ☐ |
| 🔍 Ricerca | Risultati live, apre POI/itinerario | ☐ |
| GF | Frasi, carta cameriere, analisi menu | ☐ |
| Gruppo (2 tel.) | Join, chat, GPS, itinerario condiviso, E2EE | ☐ |
| Offline | Banner + dati in cache | ☐ |
| 🔋 Batteria | Toggle funziona e persiste | ☐ |

Grazie del test! 🙏 Ogni segnalazione, anche piccola ("questo bottone non si capisce"), è utilissima.
