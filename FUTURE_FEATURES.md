# SafeEats - Future Features Roadmap

Documento di funzionalità facoltative da implementare in futuro. Ogni feature include: descrizione, implementazione tecnica, benefici, priorità e difficoltà.

---

## 1. 🔧 Edit Completo dei Posti GF

**Stato**: In Progress (attualmente dice "Edit in progress...")

### Descrizione
Permettere agli utenti di modificare completamente i dati di un ristorante salvato (nome, città, safety level, coordinates, notes, tags).

### Implementazione Tecnica
```javascript
// Modificare editGFPlace() per aprire il form con i dati del posto
window.editGFPlace = function(id) {
  const places = GFPlacesDB.getAll();
  const place = places.find(p => p.id === id);
  
  // Aprire openGFPlacesPanel con prefillData
  window.openGFPlacesPanel(place);
  
  // Aggiungere un flag di edit mode
  // Modificare saveGFPlace() per usare GFPlacesDB.edit() invece di add()
}
```

### Perché è importante
- Correggere errori nei dati inseriti
- Aggiornare info quando il ristorante cambia
- Non forzare "salva come nuovo e elimina vecchio"

### Priorità: **ALTA**
### Difficoltà: ⭐⭐ Facile (solo UX improvement)

---

## 2. 🔄 Sincronizzazione P2P dei GF Places

**Stato**: Non iniziato

### Descrizione
Condividere automaticamente i tuoi ristoranti GF salvati con gli altri membri del gruppo via P2P (PeerJS o Firebase).

### Implementazione Tecnica
```javascript
// In GFPlacesDB.add(), broadcast ai peer:
if (window.broadcastToPeers) {
  window.broadcastToPeers({ 
    type: 'gf_place_add', 
    place,
    from: state.group.myName
  });
}

// Nel handler onDataChannelMessage():
if (msg.type === 'gf_place_add') {
  // Merge con GFPlacesDB.sync()
  const merged = GFPlacesDB.sync([msg.place]);
  window.refreshGFPlacesLayer();
}
```

### Perché è importante
- Il gruppo vede subito i ristoranti che aggiungi
- Non duplica il lavoro di ricerca
- Crea un database collaborativo in tempo reale

### Priorità: **MEDIA-ALTA**
### Difficoltà: ⭐⭐⭐ Moderato (require PeerJS integration)

---

## 3. 🎯 Filtri Avanzati per GF Places sulla Mappa

**Stato**: Non iniziato

### Descrizione
Aggiungere filtri avanzati nel panel "Filtri" per:
- Filtrare per Safety Level (GREEN/YELLOW/RED)
- Filtrare per Rating minimo
- Filtrare per Città

### Implementazione Tecnica
```javascript
// Nel renderFilters():
const advGFPanel = document.createElement('div');
advGFPanel.innerHTML = `
  <div style="padding:12px;">
    <label>Safety Level</label>
    <input type="checkbox" id="gf-filter-green" checked> 🟢 GREEN
    <input type="checkbox" id="gf-filter-yellow" checked> 🟡 YELLOW
    <input type="checkbox" id="gf-filter-red" checked> 🔴 RED
    
    <label>Rating minimo</label>
    <input type="range" id="gf-filter-rating" min="1" max="5" value="1">
    
    <label>Città</label>
    <select id="gf-filter-city">
      <option value="">Tutte</option>
      <!-- Cities list -->
    </select>
  </div>
`;

// Aggiungere listener che rifiltra gfPlacesSource
```

### Perché è importante
- Mappa meno affollata
- Focus solo su ristoranti safe
- Ricerca veloce per città

### Priorità: **MEDIA**
### Difficoltà: ⭐⭐ Facile (filter UI + source filtering)

---

## 4. 📍 Integrazione con Tab Itinerario

**Stato**: Non iniziato

### Descrizione
Permettere di aggiungere i ristoranti GF salvati all'itinerario di viaggio come "Punti di interesse alimentari".

### Implementazione Tecnica
```javascript
// Aggiungere button "Aggiungi all'Itinerario" in openGFPlacesPanel()
// Nel click handler:
window.addGFPlaceToItinerary = function(placeId) {
  const place = GFPlacesDB.getAll().find(p => p.id === placeId);
  state.itinerary.push({
    id: 'itinerary_' + Date.now(),
    type: 'restaurant',
    name: place.name,
    city: place.city,
    coords: { lat: place.lat, lng: place.lng },
    safetyLevel: place.safety_level,
    date: null // User can set date
  });
  saveState();
  toast('✅ Aggiunto all\'itinerario');
}
```

### Perché è importante
- Pianificare i pasti durante il viaggio
- Organizzare ristoranti per città/data
- Condividere itinerario con il gruppo

### Priorità: **MEDIA**
### Difficoltà: ⭐⭐⭐ Moderato (itinerary system integration)

---

## 5. 🔔 Sistema di Notifiche/Alerts

**Stato**: Non iniziato

### Descrizione
Notificare l'utente quando entra in una città con ristoranti GF salvati. Basato su GPS.

### Implementazione Tecnica
```javascript
// Nel GPS tracking loop:
function checkGFPlacesInCity(currentLat, currentLng) {
  const places = GFPlacesDB.getAll();
  const citiesByDistance = {};
  
  for (const place of places) {
    if (!place.lat || !place.lng) continue;
    
    const distance = haversineDistance(
      currentLat, currentLng,
      place.lat, place.lng
    );
    
    if (distance < 5) { // 5km radius
      if (!citiesByDistance[place.city]) {
        citiesByDistance[place.city] = [];
      }
      citiesByDistance[place.city].push(place);
    }
  }
  
  // Show notification
  if (Object.keys(citiesByDistance).length > 0) {
    showNotification(`Trovati ${Object.keys(citiesByDistance).length} 
                      ristoranti GF vicino a te!`);
  }
}

// Ogni 1 minuto durante il GPS tracking:
setInterval(checkGFPlacesInCity, 60000);
```

### Perché è importante
- Scoperta casuale di ristoranti salvati
- Utile durante la navigazione
- Aumenta l'utilizzo dell'app

### Priorità: **BASSA-MEDIA**
### Difficoltà: ⭐⭐⭐ Moderato (GPS integration, notification logic)

---

## 6. ⭐ Sistema di Voting sui Suggerimenti

**Stato**: Non iniziato

### Descrizione
Gli utenti possono votare sui suggerimenti di POI gluten-free degli altri. I suggerimenti più votati salgono in priorità di moderazione.

### Implementazione Tecnica
```javascript
// Estendere GFSuggestionsDB:
const GFSuggestionsDB = {
  // ... existing code ...
  
  addVote(suggestionId, userId) {
    const suggestions = this.getAll();
    const suggestion = suggestions.find(s => s.id === suggestionId);
    
    if (!suggestion.votes) suggestion.votes = [];
    if (!suggestion.votes.includes(userId)) {
      suggestion.votes.push(userId);
    }
    
    localStorage.setItem(this.STORE_KEY, JSON.stringify(suggestions));
  }
};

// Nel suggestion card:
<button onclick="window.voteGFSuggestion('${s.id}')">
  👍 ${s.votes ? s.votes.length : 0}
</button>
```

### Perché è importante
- Crowdsource della validazione
- Priorità democratica
- Community-driven curation

### Priorità: **BASSA-MEDIA**
### Difficoltà: ⭐⭐ Facile (simple voting logic)

---

## 7. 📧 Notifiche Email per Suggerimenti Approvati

**Stato**: Non iniziato

### Descrizione
Se l'utente fornisce email, notificare quando il suo suggerimento viene approvato e aggiunto al database.

### Implementazione Tecnica
```javascript
// Implementare backend endpoint (serverless):
// POST /api/notify-suggestion-approved
// Body: { email, suggestionName, city }

// Oppure usare EmailJS (gratuito):
import emailjs from '@emailjs/browser';

emailjs.init('YOUR_SERVICE_ID');

function notifyApproval(email, suggestionName, city) {
  emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
    user_email: email,
    restaurant_name: suggestionName,
    city: city
  });
}
```

### Perché è importante
- Feedback al contributor
- Incentivo a suggerire più posti
- Senso di comunità

### Priorità: **BASSA**
### Difficoltà: ⭐⭐⭐ Moderato (requires email service integration)

---

## 8. 🎛️ Dashboard di Moderazione

**Stato**: Non iniziato

### Descrizione
Interfaccia admin/moderator per approvare/rifiutare suggerimenti di POI.

### Implementazione Tecnica
```javascript
// Nuovo tab "Moderazione" (visibile solo per admin)
if (state.group.isCreator) {
  // Mostrare tutti i suggerimenti pending
  // Pulsanti: Approva / Rifiuta
  // Al click Approva:
  //   - Convertire suggestion in GFPlacesDB entry
  //   - Impostare status = 'approved'
  //   - Broadcast ai peer
}

window.approveSuggestion = function(suggestionId) {
  const suggestion = GFSuggestionsDB.getAll()
    .find(s => s.id === suggestionId);
  
  // Create GFPlace from suggestion
  GFPlacesDB.add({
    name: suggestion.name,
    city: suggestion.city,
    area: suggestion.area,
    note: suggestion.description,
    rating: 4,
    safety_level: 'YELLOW',
    tags: ['Suggerito dalla comunità'],
    source_url: null
  });
  
  // Update status
  suggestion.status = 'approved';
  localStorage.setItem(GFSuggestionsDB.STORE_KEY, 
    JSON.stringify(GFSuggestionsDB.getAll()));
}
```

### Perché è importante
- Controllo qualità dei suggerimenti
- Previene spam/duplicati
- Gestione democratica

### Priorità: **MEDIA** (dipende da voting)
### Difficoltà: ⭐⭐⭐ Moderato (admin UI)

---

## 9. 📤 Export dei Suggerimenti

**Stato**: Non iniziato

### Descrizione
Esportare i suggerimenti in formato CSV o JSON per analisi/moderazione esterna.

### Implementazione Tecnica
```javascript
window.exportSuggestions = function(format = 'csv') {
  const suggestions = GFSuggestionsDB.getAll();
  
  if (format === 'csv') {
    const csv = [
      ['Nome', 'Città', 'Zona', 'Indirizzo', 'Email', 'Descrizione', 'Status', 'Data'],
      ...suggestions.map(s => [
        s.name,
        s.city,
        s.area || '',
        s.address || '',
        s.email || '',
        s.description || '',
        s.status,
        new Date(s.submittedAt).toLocaleDateString('it-IT')
      ])
    ].map(row => row.join(',')).join('\n');
    
    downloadFile(csv, 'suggestions.csv', 'text/csv');
  }
  
  if (format === 'json') {
    downloadFile(
      JSON.stringify(suggestions, null, 2),
      'suggestions.json',
      'application/json'
    );
  }
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Perché è importante
- Condividere dati con team esterno
- Analisi offline
- Backup dei suggerimenti

### Priorità: **BASSA**
### Difficoltà: ⭐⭐ Facile (simple export logic)

---

## 10. 📸 Foto dei Ristoranti

**Stato**: Non iniziato

### Descrizione
Permettere di caricare foto dei ristoranti / piatti nel form di aggiunta.

### Implementazione Tecnica
```javascript
// Aggiungere file input nel form:
<input type="file" id="gf-place-photo" accept="image/*" />

// Nel saveGFPlace():
const photoInput = document.getElementById('gf-place-photo');
let photoBase64 = null;

if (photoInput.files.length > 0) {
  const reader = new FileReader();
  reader.onload = (e) => {
    photoBase64 = e.target.result; // Base64 string
    place.photo = photoBase64;
    GFPlacesDB.add(place);
  };
  reader.readAsDataURL(photoInput.files[0]);
} else {
  GFPlacesDB.add(place);
}

// Visualizzare foto nella card:
${place.photo ? `<img src="${place.photo}" 
   style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />` : ''}
```

### Perché è importante
- Verificare visivamente il ristorante
- Mostrare il piatto/menu
- Più engagement

### Priorità: **BASSA-MEDIA**
### Difficoltà: ⭐⭐⭐ Moderato (FileReader, Base64 storage, quota limits)

---

## 11. 🧠 Valutazione Difficoltà Opzioni GF

**Stato**: Non iniziato

### Descrizione
Aggiungere un campo per indicare quanto è "difficile" trovare opzioni gluten-free (Facile / Moderato / Difficile).

### Implementazione Tecnica
```javascript
// Aggiungere nel form:
<select id="gf-place-difficulty" style="...">
  <option value="easy">✅ Facile - Menu GF chiaro</option>
  <option value="moderate" selected>🟡 Moderato - Bisogna chiedere</option>
  <option value="hard">🔴 Difficile - Pochissime opzioni</option>
</select>

// Nel place object:
const place = {
  // ... existing fields ...
  difficulty: document.getElementById('gf-place-difficulty').value
};

// Visualizzare con icona:
${p.difficulty === 'easy' ? '✅' : 
  p.difficulty === 'hard' ? '🔴' : '🟡'} 
${p.difficulty}
```

### Perché è importante
- Aiuta altre persone a scegliere
- Valutazione veloce della comodità
- Utile per viaggiatori frrettolosi

### Priorità: **BASSA**
### Difficoltà: ⭐ Molto facile (simple select)

---

## 12. 📞 Contatti Ristorante

**Stato**: Non iniziato

### Descrizione
Salvare e visualizzare telefono, website, social media del ristorante.

### Implementazione Tecnica
```javascript
// Estendere il form:
<input type="tel" id="gf-place-phone" placeholder="Telefono (opz.)" />
<input type="url" id="gf-place-website" placeholder="Website (opz.)" />
<input type="text" id="gf-place-instagram" placeholder="Instagram (opz.)" />

// Nel place object:
const place = {
  // ... existing ...
  phone: document.getElementById('gf-place-phone').value || null,
  website: document.getElementById('gf-place-website').value || null,
  instagram: document.getElementById('gf-place-instagram').value || null
};

// Visualizzare nella card:
${p.phone ? `<a href="tel:${p.phone}">📞 Chiama</a>` : ''}
${p.website ? `<a href="${p.website}" target="_blank">🌐 Website</a>` : ''}
${p.instagram ? `<a href="https://instagram.com/${p.instagram}" target="_blank">📷 Instagram</a>` : ''}
```

### Perché è importante
- Contattare direttamente il ristorante
- Verificare menu GF online
- Confermare disponibilità

### Priorità: **BASSA-MEDIA**
### Difficoltà: ⭐⭐ Facile (simple text fields)

---

## 13. 🥗 Condivisione Menu GF

**Stato**: Non iniziato

### Descrizione
Salvare l'URL o un PDF del menu gluten-free del ristorante.

### Implementazione Tecnica
```javascript
// Aggiungere nel form:
<input type="url" id="gf-place-menu-url" 
  placeholder="URL menu GF (es: ristorante.com/menu-gf)" />

// Nel place object:
menuUrl: document.getElementById('gf-place-menu-url').value || null

// Visualizzare:
${p.menuUrl ? `
  <a href="${p.menuUrl}" target="_blank" 
    style="display:inline-block;padding:6px 12px;
           background:rgba(100,200,100,0.2);border-radius:4px;
           color:var(--text);text-decoration:none;font-size:11px;">
    📋 Menu GF
  </a>
` : ''}
```

### Perché è importante
- Consultare menu prima di andare
- Sapere le opzioni disponibili
- Evitare sorprese

### Priorità: **BASSA-MEDIA**
### Difficoltà: ⭐ Molto facile (just a URL field)

---

## 14. 🚨 Tracking Allergie Multiple

**Stato**: Non iniziato

### Descrizione
Oltre al glutine, tracciare anche crostacei, noci, lattosio, etc. per ogni ristorante.

### Implementazione Tecnica
```javascript
// Aggiungere nel form:
<div style="margin:10px 0;">
  <label style="font-size:11px;color:var(--muted);">Allergie disponibili:</label>
  <div style="display:flex;flex-wrap:wrap;gap:6px;">
    <label><input type="checkbox" name="allergen" value="gluten" checked> 🌾 Glutine</label>
    <label><input type="checkbox" name="allergen" value="shellfish"> 🦐 Crostacei</label>
    <label><input type="checkbox" name="allergen" value="nuts"> 🥜 Noci</label>
    <label><input type="checkbox" name="allergen" value="dairy"> 🥛 Lattosio</label>
    <label><input type="checkbox" name="allergen" value="eggs"> 🥚 Uova</label>
  </div>
</div>

// Nel place object:
const allergens = Array.from(
  document.querySelectorAll('input[name="allergen"]:checked')
).map(el => el.value);

place.allergens = allergens;

// Visualizzare:
${p.allergens ? p.allergens.map(a => {
  const icons = { gluten: '🌾', shellfish: '🦐', nuts: '🥜', dairy: '🥛', eggs: '🥚' };
  return `<span title="${a}">${icons[a] || '⚠️'}</span>`;
}).join('') : ''}
```

### Perché è importante
- Utile per persone con allergie multiple
- Più inclusivo
- Mercato più ampio

### Priorità: **BASSA**
### Difficoltà: ⭐⭐ Facile (checkbox logic)

---

## 15. 📡 Sincronizzazione Offline-First Completa

**Stato**: Parziale (PWA è offline-ready, ma non sync completo)

### Descrizione
Permettere di aggiungere/modificare ristoranti completamente offline e sincronizzare quando torna la connessione.

### Implementazione Tecnica
```javascript
// Creare una queue di operazioni offline:
const OfflineQueue = {
  QUEUE_KEY: 'gf_offline_queue',
  
  queueOperation(operation) {
    const queue = JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
    queue.push({
      ...operation,
      queuedAt: new Date().toISOString()
    });
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  },
  
  processQueue() {
    const queue = JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
    
    for (const op of queue) {
      try {
        if (op.type === 'add_place') {
          GFPlacesDB.add(op.place);
        }
        if (op.type === 'add_suggestion') {
          GFSuggestionsDB.add(op.suggestion);
        }
        // Broadcast ai peer
        if (window.broadcastToPeers) {
          window.broadcastToPeers(op);
        }
      } catch (e) {
        console.error('Error processing queue item', e);
      }
    }
    
    localStorage.removeItem(this.QUEUE_KEY);
  }
};

// Intercettare saveGFPlace:
const originalSave = window.saveGFPlace;
window.saveGFPlace = function() {
  if (!navigator.onLine) {
    const place = { /* extract from form */ };
    OfflineQueue.queueOperation({ type: 'add_place', place });
    toast('📴 Offline - sincronizzato al ritorno');
    return;
  }
  originalSave.call(this);
};

// Ascoltare riconnessione:
window.addEventListener('online', () => {
  OfflineQueue.processQueue();
  toast('📡 Sincronizzazione completa');
});
```

### Perché è importante
- Funzionalità in aree senza segnale
- Montagne, tunnel, remote areas
- Sync silenzioso al ritorno

### Priorità: **MEDIA** (nice-to-have per PWA)
### Difficoltà: ⭐⭐⭐⭐ Complesso (queue management, conflict resolution)

---

## 16. 💾 Backup & Restore Completi

**Stato**: Non iniziato

### Descrizione
Permettere di esportare tutti i dati (posti, suggerimenti, itinerario) e importarli su un altro dispositivo.

### Implementazione Tecnica
```javascript
window.backupAllData = function() {
  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      gfPlaces: GFPlacesDB.getAll(),
      gfSuggestions: GFSuggestionsDB.getAll(),
      itinerary: state.itinerary,
      state: state
    }
  };
  
  const json = JSON.stringify(backup, null, 2);
  downloadFile(json, `safeEats-backup-${Date.now()}.json`, 'application/json');
  toast('✅ Backup esportato');
};

window.restoreFromBackup = function(jsonFile) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      
      // Restore data
      localStorage.setItem('gf_custom_places', 
        JSON.stringify(backup.data.gfPlaces));
      localStorage.setItem('gf_suggestions_submitted',
        JSON.stringify(backup.data.gfSuggestions));
      
      state.itinerary = backup.data.itinerary;
      saveState();
      
      toast('✅ Backup ripristinato - ricarica la pagina');
      location.reload();
    } catch (e) {
      toast('❌ File di backup non valido');
    }
  };
  reader.readAsText(jsonFile);
};
```

### Perché è importante
- Switch a nuovo dispositivo
- Recovery da crash/perdita dati
- Sincronizzazione manuale tra dispositivi

### Priorità: **MEDIA**
### Difficoltà: ⭐⭐⭐ Moderato (file handling, validation)

---

## 17. 🌙 Dark Mode per Mappe

**Stato**: Non iniziato

### Descrizione
Supportare tema scuro per la mappa (OpenLayers) per ridurre affaticamento degli occhi.

### Implementazione Tecnica
```javascript
// Nel CSS o dinamicamente:
function applyMapDarkMode(enabled) {
  if (enabled) {
    map.getLayers().forEach(layer => {
      if (layer instanceof ol.layer.Tile) {
        // Switch a tile provider dark
        // Es: CartoDB Positron Dark
        layer.setSource(new ol.source.XYZ({
          url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        }));
      }
    });
    document.getElementById('map').style.filter = 'invert(1) hue-rotate(180deg)';
  } else {
    // Reset to light
  }
}

// Aggiungere toggle nel settings:
<input type="checkbox" id="dark-mode-toggle" 
  onchange="applyMapDarkMode(this.checked)">
Dark Mode
```

### Perché è importante
- Uso notturno dell'app
- Riduce affaticamento occhi
- Trend moderno (quasi tutte le app hanno dark mode)

### Priorità: **BASSA-MEDIA**
### Difficoltà: ⭐⭐ Facile (CSS + tile provider switch)

---

## 18. 👥 Condivisione Lista con Amici

**Stato**: Non iniziato

### Descrizione
Generare un link shareable per condividere i tuoi ristoranti GF salvati con amici (read-only).

### Implementazione Tecnica
```javascript
window.generateShareLink = function() {
  const places = GFPlacesDB.getAll();
  const encoded = btoa(JSON.stringify(places));
  const link = `${window.location.origin}?gf_share=${encoded}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(link);
  toast('✅ Link copiato - condividi con amici!');
};

// Al caricamento, controllare parametro:
const params = new URLSearchParams(window.location.search);
const sharedData = params.get('gf_share');
if (sharedData) {
  try {
    const places = JSON.parse(atob(sharedData));
    // Show modal: "Vuoi importare questi posti?"
    window.showImportSharedPlaces(places);
  } catch (e) {
    console.error('Invalid share link');
  }
}
```

### Perché è importante
- Condividere i propri scoperte
- Collaborare con amici in viaggio
- Commuity-driven recommendations

### Priorità: **BASSA**
### Difficoltà: ⭐⭐⭐ Moderato (encoding, link generation)

---

## 19. 📊 Statistiche di Utilizzo

**Stato**: Non iniziato

### Descrizione
Mostrare statistiche: quanti ristoranti visitati, dove, quando, trending locations.

### Implementazione Tecnica
```javascript
// Aggiungere tracking quando visiti un ristorante:
window.markRestaurantAsVisited = function(placeId) {
  const place = GFPlacesDB.getAll().find(p => p.id === placeId);
  if (!place) return;
  
  const visits = JSON.parse(localStorage.getItem('gf_visits') || '[]');
  visits.push({
    placeId,
    visitedAt: new Date().toISOString(),
    city: place.city
  });
  localStorage.setItem('gf_visits', JSON.stringify(visits));
};

// Mostrare dashboard:
window.showStatistics = function() {
  const places = GFPlacesDB.getAll();
  const visits = JSON.parse(localStorage.getItem('gf_visits') || '[]');
  
  const stats = {
    totalPlaces: places.length,
    totalVisits: visits.length,
    citiesExplored: new Set(places.map(p => p.city)).size,
    mostVisitedCity: /* calculate */,
    safetyDistribution: {
      green: places.filter(p => p.safety_level === 'GREEN').length,
      yellow: places.filter(p => p.safety_level === 'YELLOW').length,
      red: places.filter(p => p.safety_level === 'RED').length
    }
  };
  
  // Render pie/bar charts using Chart.js
};
```

### Perché è importante
- Gamification (incentiva utilizzo)
- Insights personali
- Community insights se aggregati

### Priorità: **BASSA**
### Difficoltà: ⭐⭐⭐ Moderato (data aggregation, charts)

---

## 20. 🌐 Integrazione Google Forms

**Stato**: Non iniziato (alternativa al form interno)

### Descrizione
Usare Google Forms come backend per raccogliere suggerimenti (alternativa a database locale).

### Implementazione Tecnica
```javascript
// Creare form su Google Forms
// Estrarre URL pre-compilato (Form Prefilling)
window.openGoogleFormSuggestion = function() {
  const name = document.getElementById('gf-suggest-name')?.value || '';
  const city = document.getElementById('gf-suggest-city')?.value || '';
  const description = document.getElementById('gf-suggest-description')?.value || '';
  
  const formUrl = `https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?` +
    `entry.123456789=${encodeURIComponent(name)}&` +
    `entry.987654321=${encodeURIComponent(city)}&` +
    `entry.555666777=${encodeURIComponent(description)}`;
  
  window.open(formUrl, '_blank');
};
```

### Perché è importante
- Zero backend required
- Google gestisce i dati
- Easy moderazione

### Priorità: **BASSA** (alternativa)
### Difficoltà: ⭐⭐ Facile (just a link)

---

## 📋 Riepilogo per Priorità

### ALTA
- Edit completo posti

### MEDIA-ALTA
- Sincronizzazione P2P

### MEDIA
- Filtri avanzati
- Integrazione itinerario
- Dashboard moderazione
- Backup & restore

### BASSA-MEDIA
- Notifiche geolocalizzazione
- Voting suggerimenti
- Foto ristoranti
- Contatti ristorante
- Menu GF
- Difficoltà opzioni
- Dark mode

### BASSA
- Email approvazione
- Export suggerimenti
- Allergie multiple
- Condivisione link
- Statistiche
- Google Forms

---

## 🔧 Dipendenze tra Feature

```
Edit completo → (no deps)
Sincronizzazione P2P → (dipende da edit)
Filtri avanzati → (dipende da GF Places core)
Itinerario → (dipende da geo)
Notifiche → (dipende da geo + GPS)
Voting → (dipende da suggerimenti)
Email → (dipende da voting)
Moderazione → (dipende da voting + email)
Foto → (dipende da storage)
Offline-first → (dipende da queue system)
Backup/Restore → (dipende da offline-first)
Dark mode → (no deps)
Condivisione → (dipende da backup/restore)
Statistiche → (dipende da visit tracking)
```

---

## 🚀 Raccomandazioni per il Prossimo Step

**Suggerito**: Implementare **Edit Completo Posti** come prossima feature (ALTA priorità, facile difficoltà).

Dopo: **Sincronizzazione P2P** per collaborative features.

Poi: **Filtri Avanzati** per migliorare UX della mappa.
