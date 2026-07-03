# 🧭 Tabi — Guida all'uso

Questa è una guida pratica per usare l'app, non un documento tecnico. Se cerchi
dettagli sull'architettura o sullo stack, guarda il [README](README.md).

---

## Indice

1. [Primo avvio](#1-primo-avvio)
2. [Creare un itinerario](#2-creare-un-itinerario)
3. [Tempi e "giornata troppo densa"](#3-tempi-e-giornata-troppo-densa)
4. [Budget](#4-budget)
5. [Biglietti e prenotazioni](#5-biglietti-e-prenotazioni)
6. [Condivisione e gruppi](#6-condivisione-e-gruppi) — *incluse le domande su condivisione esterna, modifica condivisa e GPS*
7. [Guida gluten-free](#7-guida-gluten-free)
8. [Vista "Oggi"](#8-vista-oggi)
9. [Offline e installazione come app](#9-offline-e-installazione-come-app)
10. [Tema chiaro/scuro](#10-tema-chiaroscuro)
11. [Domande frequenti](#11-domande-frequenti)

---

## 1. Primo avvio

Alla prima apertura, l'app chiede: nome del viaggio, date, con chi viaggi (da solo/
coppia/gruppo), interessi, eventuali vincoli alimentari (incluso "senza glutine" —
vedi [§7](#7-guida-gluten-free)), e un budget giornaliero indicativo. Puoi sempre
rifare questo passaggio in seguito da **Menu → ✏️ Voglio creare il mio viaggio**.

Non serve creare un account: tutto resta salvato sul tuo telefono/browser.

## 2. Creare un itinerario

Dalla mappa, tocca un luogo → **Aggiungi all'itinerario** → scegli giorno e orario.
Dalla scheda **Itinerario** (icona 📋 in basso) vedi i giorni del viaggio come
schede espandibili: tocca un giorno per vedere/riordinare le tappe.

- **Trascina** una tappa per cambiarne l'ordine.
- Ogni tappa mostra **tempo di spostamento dalla tappa precedente** (a piedi, mezzi,
  auto) calcolato automaticamente.
- **✨ Suggerimenti** (in cima alla vista Itinerario) propone posti vicini nel tempo
  libero che ti resta in un giorno.
- **🧭 Ottimizza il giro** (dentro ogni giorno con 3+ tappe) riordina le tappe per
  minimizzare gli spostamenti.

## 3. Tempi e "giornata troppo densa"

Ogni giorno mostra una barra **visite vs spostamenti** (quanto tempo passi a vedere
cose contro quanto ne passi in viaggio tra una tappa e l'altra) e, se il carico
totale supera le 12 ore, un avviso **"⚠️ Giornata molto densa"**. Non ti impedisce
di procedere — è un avviso, non un blocco — ma è pensato per farti scoprire un
problema *prima* di essere sul posto, non dopo.

## 4. Budget

Da **Menu → 💰 Budget**: imposta un budget totale, scegli la valuta con cui vuoi
vedere gli importi (si converte da sola dal tasso di cambio aggiornato), e registra
le spese man mano che le fai. Ogni spesa registrata conserva anche **la valuta e
l'importo con cui l'hai inserita** — così se più avanti cambi la valuta di
visualizzazione, non perdi la traccia di "quanto avevi pagato davvero".

La schermata mostra: totale speso vs budget, ripartizione per categoria (cibo,
trasporti, alloggio, shopping, attività, altro), e le ultime 5 spese registrate.

## 5. Biglietti e prenotazioni

Da **Menu → 🎫 Biglietti** puoi salvare biglietti/prenotazioni con:
- **tipo**: trasporto, ingresso, alloggio, evento;
- **titolo, fornitore, codice/PNR, data e ora, prezzo, note**;
- **stato**: prenotato → pagato → usato (o scaduto/annullato) — lo aggiorni da un
  menu a tendina quando cambia.

È separato da **📅 Prenota**, che invece resta il posto dove trovi i link diretti
di prenotazione (TableCheck, Tabelog, sito, telefono) per i ristoranti/POI che li
hanno — due cose diverse: link esterni pronti all'uso vs. i tuoi biglietti già
acquistati.

## 6. Condivisione e gruppi

Questa sezione risponde nel dettaglio alle domande più comuni.

### Posso condividere l'itinerario fuori dall'app (WhatsApp, email...)?

**Sì.** Dalla vista Itinerario, il bottone di condivisione genera un **link** che
contiene l'intero itinerario codificato al suo interno — non serve un account, non
serve che il destinatario sia nel tuo gruppo. Il link viene copiato negli appunti:
incollalo dove vuoi (chat, email, note). Chi lo apre può importare quelle tappe nel
proprio itinerario con un tocco. Limite pratico: se l'itinerario è molto lungo, il
link può diventare troppo grande — in quel caso l'app te lo segnala e puoi invece
condividerlo con un gruppo (vedi sotto) o esportarlo come file calendario (.ics,
dalla scheda di ogni tappa → "Aggiungi a calendario").

### Posso condividerlo internamente, con un gruppo di cui faccio parte?

**Sì.** Da **Menu → 👥 Gruppo**, se sei già in una stanza di gruppo (o ne crei una
con un codice a 6 caratteri), puoi condividere il tuo itinerario personale con quel
gruppo. Da quel momento l'itinerario diventa un "itinerario di gruppo" visibile a
tutti i membri della stanza.

### Ogni membro del gruppo può vedere e modificare l'itinerario condiviso?

**Sì, entrambe le cose, senza restrizioni di ruolo.** Chiunque sia nella stanza può
aprire l'itinerario condiviso e modificarlo (aggiungere/spostare/rimuovere tappe,
cambiare orari e note). Non c'è un concetto di "sola lettura" o di permessi diversi
tra i membri.

**Cosa succede se due persone modificano nello stesso momento?** L'app risolve i
conflitti da sola, campo per campo: se tu cambi l'orario di una tappa e un altro
membro ne cambia la nota nello stesso istante, **vincono entrambe le modifiche**
(non si scelgono una a scapito dell'altra). Solo se *due persone toccano lo stesso
identico campo* nello stesso momento, vince la modifica più recente — e quella
scartata viene comunque registrata in un **pannello di revisione conflitti**, così
sai sempre se una tua modifica è stata sovrascritta invece di scoprirlo per caso.

Non serve che tutti siano online insieme: le modifiche fatte offline si
sincronizzano quando tutti tornano connessi.

### Se sono in un gruppo, vedo il GPS di tutti i partecipanti? Loro vedono il mio?

**È reciproco, ma solo per chi lo attiva.** Da **Menu → 👥 Gruppo** c'è un
interruttore "📍 Condivisione GPS", spento di default. Se lo accendi, la tua
posizione diventa visibile agli altri membri del gruppo (aggiornata ogni 5 secondi
circa, mostrata come marker sulla mappa). Se lo spegni, sparisci dalla mappa degli
altri. **Ogni persona decide per sé stessa** — non è un interruttore unico per tutto
il gruppo: se tu lo attivi ma un compagno di viaggio no, tu sei visibile a loro ma
tu non vedi la sua posizione (perché lui non la sta condividendo). Se lo attivate
entrambi, vi vedete a vicenda.

### Come funziona tecnicamente (in breve)?

Non c'è un server proprietario dietro: gruppo, chat, GPS ed editing condiviso
viaggiano tutti tramite un protocollo P2P (MQTT) su un broker pubblico gratuito.
Significa: zero account, zero costi di infrastruttura per questa parte — ma anche
che se quel broker pubblico ha un disservizio, la sincronizzazione di gruppo si
ferma temporaneamente (l'itinerario personale e i dati già salvati non si perdono,
restano sul tuo telefono).

## 7. Guida gluten-free

Tabi è nata come guida per celiaci in viaggio in Giappone, ed è rimasta come
funzione **opzionale**, non più il centro dell'app. La trovi:
- nell'onboarding, tra i vincoli alimentari ("senza glutine");
- oppure in qualsiasi momento da **Menu → 🌾 Guida Gluten-Free** (toggle on/off,
  attivo di default).

Da attiva, aggiunge sulla mappa un filtro "GF Places" e un'analisi di sicurezza
(🟢 sicuro / 🟡 attenzione / 🔴 rischio) su ristoranti e negozi. Se non ti serve,
disattivala: sparisce dal menu di navigazione in basso e dalla mappa.

## 8. Vista "Oggi"

Da **Menu → 🗓️ Timeline viaggio** vedi tutti i giorni in ordine cronologico. Il
giorno corrente ha un badge **"OGGI"**, e la prossima tappa non ancora iniziata
mostra un countdown ("tra 1h 20m") — pensata per essere consultata rapidamente
mentre sei in giro, non solo in fase di pianificazione.

## 9. Offline e installazione come app

Tabi è una PWA: puoi installarla sulla schermata Home (Safari su iPhone: Condividi
→ "Aggiungi a Home"; Chrome su Android: menu → "Installa app"). Una volta
installata, funziona anche **offline** per tutto ciò che hai già pianificato
(itinerario, budget, biglietti salvati) — utile in aereo o in zone senza copertura.
Ricerca nuovi luoghi, foto e analisi gluten-free richiedono connessione (dipendono
da servizi esterni).

## 10. Tema chiaro/scuro

L'app **non ha un interruttore tema al suo interno**: segue sempre l'impostazione
del tuo telefono/browser (chiaro o scuro). Se vuoi cambiarlo, lo fai dalle
impostazioni di sistema, non dentro Tabi.

## 11. Domande frequenti

**Devo creare un account?** No, mai. Tutto resta sul tuo dispositivo.

**Cosa succede se cambio telefono?** Da **Menu → 📦 Backup & Ripristino** esporti
tutti i tuoi dati in un file, che poi importi sul nuovo dispositivo.

**I tempi di spostamento sono affidabili?** Sono stime (basate su distanza in linea
d'aria e velocità media del mezzo scelto, o su Google Maps quando disponibile) — utili
per capire se una giornata sta in piedi, non un orario ufficiale dei mezzi pubblici.

**L'app costa qualcosa?** L'app in sé è gratuita. Alcune funzioni (ricerca luoghi,
foto, analisi AI del gluten-free) dipendono da servizi esterni a pagamento gestiti
dal gestore dell'app — se la quota finisce, quelle funzioni degradano a stime locali
invece di sparire del tutto.
