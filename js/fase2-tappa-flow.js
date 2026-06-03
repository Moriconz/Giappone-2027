/**
 * FASE 2: AGGIUNTA TAPPA — 3-STEP MODAL FLOW
 *
 * Step 1: Select day (chip selector)
 * Step 2: Set time and duration (pre-populated by POI type)
 * Step 3: Transport mode (walking, metro, bus, taxi, train) with Google Directions
 */

class TappaFlowModal {
  constructor() {
    this.currentStep = 1;
    this.currentPOI = null;
    this.data = {
      day: null,
      time: null,
      duration: null,
      transportMode: 'walking'
    };
  }

  /**
   * Get default duration in minutes based on POI category/type
   */
  getDefaultDuration(poiType) {
    const defaults = {
      'restaurant': 90,
      'cafe': 30,
      'bar': 60,
      'museum': 120,
      'temple': 45,
      'shrine': 45,
      'shop': 30,
      'market': 60,
      'church': 30,
      'landmark': 30,
      'park': 90,
      'garden': 60,
      'castle': 120,
      'default': 45
    };
    return defaults[poiType] || defaults['default'];
  }

  /**
   * Get default time based on POI category
   */
  getDefaultTime(poiType) {
    const defaults = {
      'restaurant': '12:00',
      'cafe': '10:00',
      'bar': '19:00',
      'museum': '09:00',
      'temple': '08:00',
      'shrine': '08:00',
      'shop': '10:00',
      'market': '10:00',
      'default': '10:00'
    };
    return defaults[poiType] || defaults['default'];
  }

  /**
   * STEP 1: Select which day to add the POI to
   */
  showStep1(poi, numDays = 7) {
    this.currentPOI = poi;
    this.currentStep = 1;

    const dayChips = Array.from({ length: numDays }, (_, i) => {
      const dayNum = i + 1;
      const isSelected = this.data.day === dayNum ? 'selected' : '';
      return `
        <button class="day-chip ${isSelected}" data-day="${dayNum}"
          style="
            padding: 12px 16px;
            background: ${isSelected ? 'rgba(255, 20, 147, 0.3)' : 'rgba(255, 250, 205, 0.15)'};
            border: 2px solid ${isSelected ? 'rgba(255, 20, 147, 0.6)' : 'rgba(255, 255, 255, 0.25)'};
            color: #fff;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s;
          ">
          Giorno ${dayNum}
        </button>
      `;
    }).join('');

    const html = `
      <div style="padding: 20px;">
        <h3 style="color: #fff; margin-bottom: 20px; text-align: center; font-size: 18px;">
          📅 Scegli il giorno
        </h3>

        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        ">
          ${dayChips}
        </div>

        <div style="
          background: rgba(255, 107, 53, 0.1);
          border: 1px solid rgba(255, 107, 53, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        ">
          📍 <strong>${poi.name || poi.displayName}</strong> a <strong>${poi.city}</strong>
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="tappa-flow-cancel" class="btn" style="
            flex: 1;
            background: rgba(100, 100, 100, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">Annulla</button>
          <button id="tappa-flow-next" class="btn" style="
            flex: 1;
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.5), rgba(255, 107, 53, 0.3));
            border: 1px solid rgba(255, 107, 53, 0.5);
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">Avanti →</button>
        </div>
      </div>
    `;

    this.showModal('Aggiunta Tappa - Step 1/3', html);

    // Event handlers
    document.querySelectorAll('.day-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        this.data.day = parseInt(chip.dataset.day, 10);
      });
    });

    document.getElementById('tappa-flow-cancel').addEventListener('click', () => this.closeModal());

    document.getElementById('tappa-flow-next').addEventListener('click', () => {
      if (!this.data.day) {
        (window.modalAlert || alert)('Seleziona un giorno');
        return;
      }
      this.showStep2(poi);
    });
  }

  /**
   * STEP 2: Set time and duration
   */
  showStep2(poi) {
    this.currentStep = 2;
    const defaultTime = this.getDefaultTime(poi.cat || poi.type || 'default');
    const defaultDuration = this.getDefaultDuration(poi.cat || poi.type || 'default');

    if (!this.data.time) this.data.time = defaultTime;
    if (!this.data.duration) this.data.duration = defaultDuration;

    const html = `
      <div style="padding: 20px;">
        <h3 style="color: #fff; margin-bottom: 20px; text-align: center; font-size: 18px;">
          ⏰ Orario e durata
        </h3>

        <div style="
          background: rgba(255, 107, 53, 0.1);
          border: 1px solid rgba(255, 107, 53, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        ">
          📅 <strong>Giorno ${this.data.day}</strong>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #fff; margin-bottom: 6px; font-weight: 600;">
            🕐 Orario di arrivo
          </label>
          <input type="time" id="tappa-time" value="${this.data.time}" style="
            width: 100%;
            padding: 10px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            box-sizing: border-box;
          ">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; color: #fff; margin-bottom: 6px; font-weight: 600;">
            ⏱️ Durata (minuti)
          </label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="number" id="tappa-duration" min="15" max="480" step="15" value="${this.data.duration}" style="
              flex: 1;
              padding: 10px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 6px;
              color: #fff;
              font-size: 14px;
              box-sizing: border-box;
            ">
            <span style="color: rgba(255, 255, 255, 0.6); min-width: 60px;">
              ${this.formatDuration(this.data.duration)}
            </span>
          </div>
          <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin-top: 6px;">
            💡 Suggerito per questo tipo: ${defaultDuration} min
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="tappa-back-2" class="btn" style="
            flex: 1;
            background: rgba(100, 100, 100, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">← Indietro</button>
          <button id="tappa-flow-next-2" class="btn" style="
            flex: 1;
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.5), rgba(255, 107, 53, 0.3));
            border: 1px solid rgba(255, 107, 53, 0.5);
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">Avanti →</button>
        </div>
      </div>
    `;

    this.showModal('Aggiunta Tappa - Step 2/3', html);

    const timeInput = document.getElementById('tappa-time');
    const durationInput = document.getElementById('tappa-duration');

    timeInput.addEventListener('change', (e) => {
      this.data.time = e.target.value;
    });

    durationInput.addEventListener('change', (e) => {
      this.data.duration = parseInt(e.target.value, 10);
      // Update display
      const display = document.querySelector('[data-duration-display]');
      if (display) {
        display.textContent = this.formatDuration(this.data.duration);
      }
    });

    document.getElementById('tappa-back-2').addEventListener('click', () => this.showStep1(poi));
    document.getElementById('tappa-flow-next-2').addEventListener('click', () => {
      if (!this.data.time) {
        (window.modalAlert || alert)('Seleziona un orario');
        return;
      }
      this.showStep3(poi);
    });
  }

  /**
   * STEP 3: Select transport mode
   */
  showStep3(poi) {
    this.currentStep = 3;

    const modes = [
      { id: 'walking', label: '🚶 A piedi', icon: '🚶' },
      { id: 'transit', label: '🚇 Trasporto pubblico', icon: '🚇' },
      { id: 'bus', label: '🚌 Autobus', icon: '🚌' },
      { id: 'taxi', label: '🚖 Taxi/Rideshare', icon: '🚖' },
      { id: 'train', label: '🚆 Treno', icon: '🚆' }
    ];

    const modeButtons = modes.map(mode => {
      const isSelected = this.data.transportMode === mode.id ? 'selected' : '';
      return `
        <button class="transport-mode ${isSelected}" data-mode="${mode.id}"
          style="
            padding: 16px;
            background: ${isSelected ? 'rgba(255, 20, 147, 0.3)' : 'rgba(255, 250, 205, 0.15)'};
            border: 2px solid ${isSelected ? 'rgba(255, 20, 147, 0.6)' : 'rgba(255, 255, 255, 0.25)'};
            color: #fff;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s;
            width: 100%;
            text-align: center;
          ">
          ${mode.label}
        </button>
      `;
    }).join('');

    const html = `
      <div style="padding: 20px;">
        <h3 style="color: #fff; margin-bottom: 20px; text-align: center; font-size: 18px;">
          🚗 Modalità di trasporto
        </h3>

        <div style="
          background: rgba(255, 107, 53, 0.1);
          border: 1px solid rgba(255, 107, 53, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        ">
          📅 Giorno ${this.data.day} • ⏰ ${this.data.time} • ⏱️ ${this.formatDuration(this.data.duration)}
        </div>

        <div style="
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-bottom: 20px;
        ">
          ${modeButtons}
        </div>

        <div style="
          background: rgba(74, 124, 89, 0.1);
          border: 1px solid rgba(74, 124, 89, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        ">
          💡 La modalità di trasporto verrà usata per calcolare il tempo di viaggio verso la prossima tappa.
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="tappa-back-3" class="btn" style="
            flex: 1;
            background: rgba(100, 100, 100, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">← Indietro</button>
          <button id="tappa-flow-confirm" class="btn" style="
            flex: 1;
            background: linear-gradient(135deg, rgba(74, 124, 89, 0.5), rgba(74, 124, 89, 0.3));
            border: 1px solid rgba(74, 124, 89, 0.5);
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">✅ Aggiungi all'itinerario</button>
        </div>
      </div>
    `;

    this.showModal('Aggiunta Tappa - Step 3/3', html);

    document.querySelectorAll('.transport-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.transport-mode').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.data.transportMode = btn.dataset.mode;
      });
    });

    document.getElementById('tappa-back-3').addEventListener('click', () => this.showStep2(poi));
    document.getElementById('tappa-flow-confirm').addEventListener('click', () => this.confirmAndAdd(poi));
  }

  /**
   * Confirm and add to itinerary
   */
  confirmAndAdd(poi) {
    const entry = {
      id: poi.id,
      name: poi.name || poi.displayName,
      city: poi.city,
      lat: poi.lat,
      lng: poi.lng,
      googlePlaceId: poi.googlePlaceId,
      cat: poi.cat,
      day: this.data.day,
      time: this.data.time,
      duration: this.data.duration,
      transportMode: this.data.transportMode,
      addedAt: new Date().toISOString()
    };

    console.log('[TappaFlow] Adding to itinerary:', entry);

    // Call the global addToItinerary function
    if (window.addToItinerary) {
      const success = window.addToItinerary(entry);
      if (success) {
        window.toast?.(`✅ Aggiunto al giorno ${this.data.day}`);
        this.closeModal();
        // Close the POI detail sheet as well
        window.closeSheet?.();
      } else {
        window.toast?.('⚠️ Già presente nell\'itinerario');
      }
    } else {
      console.error('[TappaFlow] addToItinerary not available');
    }
  }

  /**
   * Show modal with title and content
   */
  showModal(title, html) {
    // Create modal container if not exists
    let modal = document.getElementById('tappa-flow-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tappa-flow-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        z-index: 10000;
        display: flex;
        align-items: flex-end;
        animation: slideUpModal 0.3s ease-out;
      `;

      // Add animation
      if (!document.getElementById('tappa-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'tappa-modal-styles';
        style.textContent = `
          @keyframes slideUpModal {
            from {
              opacity: 0;
              transform: translateY(100px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          #tappa-flow-modal {
            animation: slideUpModal 0.3s ease-out;
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(modal);
    }

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 50, 80, 0.95), rgba(45, 59, 125, 0.95));
      border-radius: 24px 24px 0 0;
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
      background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 107, 53, 0.1));
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      font-weight: 700;
      font-size: 16px;
      position: sticky;
      top: 0;
    `;
    titleEl.textContent = title;
    content.appendChild(titleEl);

    const body = document.createElement('div');
    body.innerHTML = html;
    content.appendChild(body);

    modal.innerHTML = '';
    modal.appendChild(content);
    modal.style.display = 'flex';

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });

    // Prevent event bubbling
    content.addEventListener('click', (e) => e.stopPropagation());
  }

  /**
   * Close modal
   */
  closeModal() {
    const modal = document.getElementById('tappa-flow-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.remove();
    }
    // Reset state
    this.currentStep = 1;
    this.currentPOI = null;
    this.data = { day: null, time: null, duration: null, transportMode: 'walking' };
  }

  /**
   * Format duration to human-readable format
   */
  formatDuration(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }
}

// Create singleton instance
window.TappaFlow = new TappaFlowModal();
console.log('[TappaFlow] Module loaded');
