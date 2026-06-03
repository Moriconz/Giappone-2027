# Giappone 2027 / SafeEats — Mappa completa dei flussi, schermate e UI

> Inventario funzionale completo: ogni schermata, ogni pannello, ogni bottone, ogni testo.
> Generato il 2026-05-25 dall'analisi di `index.html` + `js/app-core.js` (~12.800 righe) + moduli.
> Per architettura/criticità tecniche vedi [ANALISI_2026.md](ANALISI_2026.md).

---

## 0. Chrome globale (sempre presente)

| Elemento | Testo / Comportamento |
|----------|----------------------|
| **Header** | `🌸 SafeEats` (in alto, fisso) |
| **Banner offline** | `📶 Offline — dati in cache` (appare quando manca connessione) |
| **Barra filtri** (`#filters`) | Sotto l'header, scroll orizzontale di "chip" categoria (vedi §2) |
| **Widget meteo flottante** (`#weather-floating`) | In basso a sx, solo su vista Mappa. Mostra: data (`Sun, 15`), icona (`☀️`), condizione (`Sereno`), temperatura (`15°`), bottone `more` → apre modale meteo |
| **Selettore lingua** (`#lang-switcher`, header) | 🇮🇹 IT / 🇬🇧 EN / 🇯🇵 日本語 — cambia lingua dell'interfaccia live (i18n) |
| **Toast** (`#toast-container`) | Notifiche temporanee in sovraimpressione (vedi Appendice A) |
| **Errore mappa** (`#ol-error`) | `🗾 Impossibile caricare la mappa` + spiegazione ad-blocker + bottone `🔄 Ricarica` |
| **Pannelli** | Tutti i dettagli si aprono come pannello moderno (bottom-sheet su mobile, modal su desktop) con titolo + `✕` chiudi. ESC o click sul backdrop chiude. |

---

## 1. Navigazione principale (barra in basso)

4 tab fissi in basso (`nav.bottom`):

| Icona | Label | Azione |
|-------|-------|--------|
| 🗺️ | **Mappa** | Mostra la mappa + widget meteo, centra su GPS/ultima posizione |
| ☰ | **Itinerario** | `renderItineraryUnified()` — la tua agenda multi-giorno |
| 🌿 | **GF Guide** | `renderGFView()` — guida gluten-free |
| ⋯ | **Menu** | `showMenuDrawer()` — apre il menu con le funzioni secondarie |

### Menu drawer (`⚙️ Menu`)
Apre un pannello con 9 voci:

| Icona | Voce | Apre |
|-------|------|------|
| 📅 | Prenota | Vista prenotazioni |
| 🛍️ | Shopping | Vista shopping/vintage |
| 👥 | Gruppo | Pannello gruppo |
| 💰 | Budget | Vista budget |
| 📸 | Galleria | Galleria foto |
| 🤖 | Groq AI | Analizza menu gluten-free con AI |
| 💡 | Suggerisci Posti | Form suggerimento POI GF |
| ✏️ | Voglio creare il mio viaggio | Onboarding creazione viaggio |
| 🆘 | SOS | Pannello emergenza celiaco |

---

## 2. Vista MAPPA

- Mappa interattiva OpenLayers con marker POI colorati per categoria.
- **Barra filtri categoria** (chip orizzontali). Categorie (`CATS`):
  `Tutti`, `Luoghi`, `Da categorizzare`, `Santuari`, `Templi`, `Chiese`, `Moschee`, `Sinagoghe`, `Cultura`, `Musei`, `Gallerie`, `Librerie`, `Landmark`, `Monumenti`, `Siti storici`, `Castelli`, `Cibo`, `Ristoranti`, `Caffè`, `Bar`, `Panetterie`, `Consegna cibo`, `Asporto`, `Locali`, `Mercati`, `Hotel`, `Alloggi`, `Ostelli`, `Guest house`, `Campeggi`, …
- **Filtri di viaggio** (modulo `filter-system.js`): `🌾 GF Sicuro`, `🆓 Gratis`, `📍 Vicino (1km)`, `🌧️ Pioggia (coperto)`, `🍜 Food`, `👨‍👩‍👧‍👦 Famiglia`, `⭐ Consigliato` + `Reset filtri`.
- Tap su un marker → apre il **Dettaglio POI** (§3).
- I POI vengono caricati da Google Places via `/api/googlePlacesNearby` man mano che ci si sposta/zooma.

---

## 3. Dettaglio POI (pannello)

Aperto toccando un marker. Titolo = nome del POI. Sezioni (renderizzate solo se il dato esiste — modulo `poi-section-builders.js`):

| Sezione | Contenuto |
|---------|-----------|
| Header | Nome, città, tipo, emoji categoria, voto a stelle (`⭐`, cliccabile → "Voto salvato ⭐") |
| 🕐 Orari | Orari di apertura (open now / settimana) |
| 📍 INDIRIZZO | Indirizzo completo |
| 🌐 Sito web | Link al sito |
| 📞 Telefono | Numero + bottone `📱 Copia Numero` |
| Descrizione | Testo descrittivo |
| 🌾 GF | Badge `GF Confermato` / `GF Probabile` (per ristoranti) |
| 💰 Prezzo | Fascia di prezzo (€/¥) |
| Durata suggerita | Tempo di visita consigliato |
| Biglietto | Costo d'ingresso |

**Azioni nel dettaglio POI:**

| Bottone | Effetto |
|---------|---------|
| `📅 Aggiungi all'itinerario` | Avvia il wizard di aggiunta tappa (§4.1) |
| `🗣️ Mostra al Cameriere` | Mostra la carta allergie/frasi GF da mostrare al ristorante |
| `🤖 Analizza Menu` | Apre l'analisi gluten-free del menu (foto/testo, §6) |
| `🗺️ Apri in Maps` | Apre Google Maps per indicazioni |
| `✅ Segna visitato` | Marca il POI come visitato |
| `💾 Salva` / `★` | Salva/rimuove il POI dai preferiti ("Salvato ★" / "Rimosso") |
| `📅 Aggiungi a calendario` | Esporta come evento (.ics) |
| Note | Campo note personali (placeholder `Aggiungi una nota...`) |
| Foto / 📸 Galleria | Foto del luogo (Google Places + caricate dall'utente) |

---

## 4. Vista ITINERARIO

`📅 La tua agenda` — pianificazione multi-giorno. Se vuoto: `📭 Itinerario vuoto` con CTA `Inizia a pianificare 🗺️`.

- Ricerca tappe (placeholder `🔍 Cerca tappa...`).
- Per ogni giorno: header con `Giorno N`, budget giornaliero (¥), elenco tappe ordinabili.
- Ogni tappa mostra: nome POI, orario, durata, eventuale distanza/durata dalla precedente (`📍`/`⏱️`), costo.
- Azioni tappa: `✏️ Modifica`, `🗑️ Elimina`/`✕ Rimuovi`, riordino.
- **Condivisione** (`#itinerary-sharing-section`): selettore gruppo (`group-share-select`) + `👥 Condividi`, stato sync (`Sincronizzato`), audit log.
- **Esportazioni**: `📥 JSON`, `📥 HTML/PDF` (→ `📄 Visualizza / Stampa`), `📤 WhatsApp`, `📥 .ics` / `📥 Scarica .ics`.

### 4.1 Wizard "Aggiungi tappa" (3 step)
| Step | Titolo | Contenuto |
|------|--------|-----------|
| **1/3** | Conferma POI / Seleziona giorno | Nome, città, tipo; selettore giorno (chip) |
| **2/3** | Quando | Giorno + ora + `Durata (minuti)` (input) |
| **3/3** | Dettagli | `Note (opzionale)`, costo, categoria/tag, modalità trasporto (a piedi/metro/…) |

Navigazione: `← Indietro`, `Avanti →`, conferma `✅ Aggiungi all'itinerario`.
Esito: `✅ Aggiunto al Day N alle HH:MM`. Validazioni: `⚠️ Seleziona un giorno`, `⚠️ Questo luogo è già stato aggiunto a questo giorno`.

Voce correlata: `➕ Nuova tappa personalizzata` (tappa manuale senza POI).

### 4.2 Budget (`💰 Budget`)
- Selettore valuta (¥/€/$), input budget totale (`Imposta il tuo Budget di Viaggio`, placeholder `300000`).
- Barra avanzamento `Speso vs Budget` (%), `Speso` / `Rimanente`.
- Breakdown per categoria e per giorno (POI/biglietti vs trasporti).
- Aggiunta spesa: categoria, importo (`Es: 50`), descrizione (`es. Ramen a Shibuya`) → `Salva Spesa` → "Spesa ¥X registrata!".

---

## 5. Vista GF GUIDE (`💚 GF Guide`)

Hub gluten-free. Contenuti/azioni:

| Voce | Contenuto |
|------|-----------|
| **Frasi essenziali** | Frasi IT→JP da mostrare al ristorante (`✅ Frase copiata negli appunti`) |
| **Tessera Medica** | Celiac Disease Medical Card scaricabile (`✅ Tessera medica scaricata`) |
| `🗣️ Mostra al Cameriere` | Carta allergie a schermo pieno per il personale |
| **🚨 SOS - Emergenza Celiac** | Pannello emergenza (contatti, frasi critiche) |
| **🏪 I Miei Posti GF** | Posti GF salvati dall'utente (`🟢 GF Places`) |
| **💡 Suggerisci POI** | Form per suggerire un locale GF (§7) |
| **🤖 Analizza Menu Gluten-Free** | Analisi AI del menu (§6) |
| **💡 Tips Giappone 2027** | Consigli di viaggio |

---

## 6. Analisi Menu Gluten-Free (`🤖 Analizza Menu Gluten-Free`)

- Input: testo menu (placeholder `Es: Pasta al pomodoro, Risotto ai funghi...`) e/o foto.
- `🤖 Analizza` → usa Groq AI (fallback locale + MobileNet/TensorFlow lazy-loaded).
- Esiti: `✅ Menu analizzato!`, `✅ Foto analizzata!`, fallback `⚠️ Groq non disponibile, uso analisi locale`.
- Validazioni: `⚠️ Inserisci il menu o carica una foto da analizzare`.

---

## 7. Suggerisci / I Miei Posti GF

**Suggerisci POI** (`💡 Suggerisci POI`): form con Nome ristorante, Città, Zona (opz.), Indirizzo (opz.), email (opz.), Descrizione (`Eg: Menu 100% GF...`) → `🚀 Invia Suggerimento` → "Suggerimento inviato! Grazie...".
`📍 Geo-localizza` (richiede nome+città: `⚠️ Inserisci nome e città prima di geo-localizzare`).

**I Miei Posti GF** (`🏪 I Miei Posti GF`): aggiunta posto con Nome, Città, Zona, rating, livello sicurezza, Note personali, Tags (`Es: 100% sicuro, Cucina separata`) → `💾 Salva`. Eliminazione → "✅ Posto eliminato".

---

## 8. Vista GRUPPO (`👥 Gruppo`)

Collaborazione realtime (MQTT + Firebase).

- **Se non in un gruppo** → modale `Non sei in nessun gruppo` con: crea o unisciti.
  - Unisciti: codice stanza (placeholder `Es. ABC123`), nome (`Es. Marco`), avatar (URL) → `✅ Connetti`.
- **In un gruppo**: lista membri (stato online/offline, GPS), tap su membro → `👤 {nome}`.
- **Condividi itinerario** (`Condividi Itinerario`): seleziona gruppo → `✓ Condividi` → "✅ Itinerario condiviso con il gruppo!". Già condiviso → "⚠️ Già condiviso con questo gruppo".
- **Aggiungi al gruppo** (`Aggiungi al Gruppo`): aggiungi tappe all'itinerario condiviso.
- **Modifica itinerario condiviso** (`✏️ Modifica: {nome}`) → "✅ Modifiche salvate e condivise!".
- **Chat di gruppo**: messaggi (placeholder `Scrivi un messaggio...`), notifiche push, storia locale.
- Gestione stanza: uscire (`Sei sicuro di voler uscire dalla stanza?`), eliminare (`Sei sicuro di voler eliminare la stanza? Tutti i membri verranno disconnessi.`).

---

## 9. Altre viste dal Menu

| Vista | Contenuto |
|-------|-----------|
| **📅 Prenota** | Card prenotazioni (hotel/ristoranti): nome (`Es: Hotel Park Hyatt Tokyo`), note (`Es: Prenotare con 2 giorni...`) |
| **🛍️ Shopping** | Negozi (tab `Tutti`/`Vintage`); ricerca negozio (`🔍 Cerca negozio...`) |
| **📸 Galleria** | Foto di viaggio (drag&drop o file); per foto: didascalia (`✏️`), elimina (`🗑️` → "Eliminare questa foto?") |
| **🌤️ Meteo** | Previsioni dettagliate per le città dell'itinerario (Open-Meteo) |
| **💡 Tips Giappone 2027** | Consigli pratici |

---

## 10. Meteo

- **Widget** (mappa): data, icona, condizione, temperatura, `more`.
- **Modale** (`Previsioni Meteo`): griglia card previsioni + `✕` chiudi.
- **Vista** (dal menu): previsioni per le tappe dell'itinerario.

---

## Appendice A — Vocabolario messaggi (toast)

**Conferme/successo:** `✅ Aggiunto al Day N alle HH:MM`, `✅ Itinerario condiviso con il gruppo!`, `✅ Itinerario copiato! Incollalo su WhatsApp`, `✅ Itinerario esportato/importato`, `✅ Modifiche salvate e condivise!`, `✅ Menu analizzato!`, `✅ Foto analizzata!`, `✅ Copiato!`, `✅ Frase copiata negli appunti`, `✅ Tessera medica scaricata`, `✅ Connesso a: …`, `✅ Posto eliminato`, `✅ Trovato! …`, `Tappa aggiunta ✎`, `Voto salvato ⭐`, `Calendario scaricato 📅`, `Spesa ¥X registrata!`, `Foto aggiunta!`.

**Avvisi/errori:** `⚠️ Seleziona un giorno`, `⚠️ Seleziona un gruppo`, `⚠️ Aggiungi almeno una tappa prima di condividere`, `⚠️ Questo luogo è già stato aggiunto a questo giorno`, `⚠️ Non sei in nessun gruppo…`, `⚠️ Codice stanza non valido`, `⚠️ Inserisci il menu o carica una foto…`, `⚠️ Impossibile salvare: storage pieno`, `⚠️ Dati quasi al limite (4.3MB)`, `⚠️ GPS non disponibile`, `Inserisci un budget/importo valido!`.

## Appendice B — Conferme, prompt, alert
- **confirm**: `Eliminare questo itinerario?`, `Eliminare questa foto?`, `Elimina questo suggerimento?`, `Rimuovere questa tappa dal gruppo?`, `Sei sicuro di voler uscire dalla stanza?`, `Sei sicuro di voler eliminare la stanza?…`.
- **prompt**: `Didascalia:`, `Note:`, `Nuova ora (HH:MM):`, `💰 Costo effettivo di …`, `🌍 Cerca su Google Places…`, `🔑 Imposta/Inserisci la master password…`.
- **alert**: `Seleziona almeno un interesse`, `Seleziona un giorno/orario`, `Password troppo corta (min 4 caratteri)`, `❌ Password errata. Riprova.`.

## Appendice C — Impostazioni/sicurezza
- API key (Gemini) cifrate in `localStorage` con **master password** (`js/config.js`, modulo `encryption.js`).
- Le chiavi Google/Groq stanno **server-side** (Vercel `/api/*`, `process.env`).
- Stato app in `localStorage` (`giappone2027_state_v1`), limite ~4.5MB con avviso.

---

# Cosa AGGIUNGEREI / MODIFICHEREI / SISTEMEREI / OTTIMIZZEREI

> ## ✅ Già fatto in questa sessione (le "prime 3")
> - **i18n EN/JP** — NUOVO: `js/i18n.js` (dizionari it/en/ja, `window.t()`, fallback italiano), selettore lingua nell'header, shell/nav/menu tradotti live. Migrazione delle restanti stringhe dinamiche = incrementale.
> - **POI offline** — già presente (`google-places-cache.js`: IndexedDB, TTL 1 mese, integrato nel loader). Enhancement: agganciato il **banner offline** (prima era inerte) agli eventi `online`/`offline`.
> - **Onboarding "Crea il mio viaggio"** — già presente (`onboarding.js`: scelta + form 5 step → `tripProfile`), verificato che parte al primo avvio ed è raggiungibile dal menu.
>
> Tutto verificato con `smoke-test.mjs` (8 flussi + i18n + onboarding + banner, 0 errori).


## 🔴 Sistemerei (correttezza)
1. **Wiring eventi `openPOI` che gira prima del render** — i gestori `stars`/`save-poi`/`note`/`add-cal` sono eseguiti sincroni mentre il contenuto è renderizzato async: di fatto **non si agganciano** (la delega vera è in `poi-detail-events.js`). Ho già messo le guardie anti-crash; andrebbe **rimosso il blocco morto** o spostato dentro il render async.
2. **`view-map` / doppio `</main>`** — l'HTML ha due `</main>` senza `<main>` aperto e riferimenti a `#view-map` inesistente. Ripulire la struttura del body.
3. **Bug pre-esistenti già corretti** (group-sync, filtri, gesture, empty-state) — vedi ANALISI_2026.md §5; tenerli sotto test.
4. **Intervalli di refresh gruppo/chat** che non si fermano alla chiusura (id evento `y2kwin_closed` non combacia) → leak benigno ma da sistemare.

## 🟠 Modificherei (UX/coerenza)
5. **Centinaia di stili inline hardcoded** (colori #FF1493, gradient, `color:#fff`) → migrare ai design token di `modern-2026.css` per coerenza totale del tema.
6. **`alert()`/`confirm()`/`prompt()` nativi** (24 occorrenze) → sostituire con modali/toast coerenti col tema (i popup di sistema rompono l'esperienza mobile).
7. **Filtri categoria vs filtri viaggio** — due sistemi separati (`CATS` nella barra e `TRAVEL_FILTERS`): unificarli in un'unica UI di filtro.
8. **Stato vuoto coerente** ovunque (itinerario vuoto, gruppo vuoto, galleria vuota, nessun POI) con CTA chiare.
9. **Onboarding "Crea il mio viaggio"** — renderlo il primo contatto guidato (giorni, città, interessi) e collegarlo a budget/itinerario.

## 🟢 Aggiungerei (feature fondamentali)
10. **Modalità offline reale per i POI** — cache dei POI Google per città visitate (oggi se l'API non risponde resti senza POI). IndexedDB + TTL.
11. **Ottimizzatore di giornata** — riordina le tappe per minimizzare gli spostamenti (hai già distanza/durata in `routing.js`).
12. **Export/condivisione itinerario via link** (oltre a JSON/WhatsApp): URL condivisibile read-only.
13. **i18n EN/JP** — l'app è solo in italiano; per usarla in Giappone servono almeno le frasi e i label in EN/JP.
14. **Integrazione trasporti reali** (orari treni/metro) al posto delle sole stime Haversine.
15. **Backup/restore cloud** dell'itinerario (oggi solo localStorage: se cambi telefono perdi tutto).

## ⚡ Ottimizzerei (performance/qualità)
16. **Split di `app-core.js` (~12.800 righe)** in moduli di feature (map, poi, itinerary, group, gf, weather) — già documentato come passo successivo.
17. **Eliminare `legacy-skin.css`** (3.5k righe) riscrivendo i componenti in `modern-2026.css` → meno CSS in conflitto, meno `!important`.
18. **Debounce/throttle** su pan/zoom mappa per ridurre le chiamate a `/api/googlePlacesNearby` (oggi 4 tier di raggio con attese).
19. **Lazy-load dei moduli pesanti** (galleria, gruppo, AI) come previsto da `core-modular` (rimosso perché inerte): rifarlo funzionante.
20. **Ridurre i ~1400 `console.*` alla fonte** (oltre al gating già aggiunto) e aggiungere un vero error-tracking (Sentry) gated.
21. **Test automatici** — estendere `smoke-test.mjs` ai flussi gruppo/chat/meteo con mock, e aggiungerlo a un workflow CI.
