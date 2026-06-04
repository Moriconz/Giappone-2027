/**
 * ITINERARY ADD WIZARD — 3-step flow for adding POI to itinerary
 *
 * Flow:
 * Step 1: Confirm POI (name, city, type)
 * Step 2: Choose day & time (with smart suggestions)
 * Step 3: Add notes (optional)
 */

const _Tw = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

function openAddToItineraryWizard(poiData) {
  console.log('[AddWizard] Opening wizard for POI:', poiData);

  if (!poiData || !poiData.googlePlaceId) {
    console.error('[AddWizard] ❌ Invalid POI data - googlePlaceId missing');
    window.toast?.(_Tw('wizard.invalidPOI', '❌ Errore: POI non valido'));
    return;
  }

  // Initialize wizard state
  const wizardState = {
    poiId: poiData.googlePlaceId,
    poiName: poiData.name || 'POI',
    poiCity: poiData.city || 'Città sconosciuta',
    poiType: poiData.type || 'restaurant',
    poiPhoto: poiData.photo || null,
    poiLat: poiData.lat ?? null,
    poiLng: poiData.lng ?? null,
    // Opening hours for closed-day warnings in step 2
    poiWeekdayHours: poiData.currentOpeningHours?.weekdayDescriptions || null,
    selectedDay: getSuggestedDay(),
    selectedTime: getSuggestedTime(getSuggestedDay()),
    notes: '',
    currentStep: 1
  };

  console.log('[AddWizard] ✅ Wizard state initialized with name:', wizardState.poiName);
  window.addWizardState = wizardState;
  renderWizardStep(1, wizardState);
}

/**
 * Get the suggested day (next day or day with fewest POIs)
 */
function getSuggestedDay() {
  const tripProfile = window.state?.tripProfile || {};
  const days = tripProfile.days || 8;

  let suggestedDay = 0;
  let minPOIs = Infinity;

  for (let d = 0; d < days; d++) {
    const dayPOIs = window.state?.itineraryByDay?.[d] || [];
    if (dayPOIs.length < minPOIs) {
      minPOIs = dayPOIs.length;
      suggestedDay = d;
    }
  }

  console.log('[AddWizard] Suggested day:', suggestedDay, 'with', minPOIs, 'POIs');
  return suggestedDay;
}

/**
 * Get suggested time based on last POI in the day
 */
function getSuggestedTime(dayIndex) {
  const dayPOIs = window.state?.itineraryByDay?.[dayIndex] || [];

  if (dayPOIs.length === 0) {
    return '10:00'; // Default morning time
  }

  // Get last POI time
  const lastPOI = dayPOIs[dayPOIs.length - 1];
  const lastTime = lastPOI.time || '10:00';
  const lastDuration = lastPOI.duration || 60;

  // Calculate suggested time (add 1.5 hours for travel + buffer)
  const [hours, minutes] = lastTime.split(':').map(Number);
  const nextMinutes = (hours * 60 + minutes + lastDuration + 90) % 1440;
  const nextHours = Math.floor(nextMinutes / 60);
  const nextMins = nextMinutes % 60;

  return `${String(nextHours).padStart(2, '0')}:${String(nextMins).padStart(2, '0')}`;
}

/**
 * Render wizard step
 */
function renderWizardStep(step, state) {
  console.log('[AddWizard] Rendering step:', step);

  let html = '';

  if (step === 1) {
    html = renderStep1(state);
  } else if (step === 2) {
    html = renderStep2(state);
  } else if (step === 3) {
    html = renderStep3(state);
  }

  window.openSheet('➕ Aggiungi all\'Itinerario', html);

  // Remove any existing wizard event listeners first (prevents duplicates)
  removeWizardListeners();

  // Attach handlers after DOM is ready
  setTimeout(() => {
    setupWizardHandlers(step, state);
  }, 100);
}

/**
 * Remove existing wizard event listeners to prevent duplicates
 * Called before attaching new ones
 */
function removeWizardListeners() {
  // Get all wizard buttons currently in DOM
  const buttons = document.querySelectorAll('[id^="wizard-"]');
  buttons.forEach(btn => {
    // Replace with clone to remove all listeners
    const clone = btn.cloneNode(true);
    btn.parentNode?.replaceChild(clone, btn);
  });
}

/**
 * STEP 1: Confirm POI details
 */
function renderStep1(state) {
  return `
    <div style="display:flex;flex-direction:column;gap:24px;padding:0">
      <!-- Progress Bar -->
      <div style="
        width:100%;
        height:6px;
        background:rgba(255,255,255,0.1);
        border-radius:3px;
        overflow:hidden;
      ">
        <div style="
          width:33.33%;
          height:100%;
          background:linear-gradient(90deg, var(--m-accent), #FF5E1F);
          transition:width 0.3s ease;
        "></div>
      </div>

      <!-- Step Indicator -->
      <div style="
        font-size:12px;
        font-weight:600;
        color:rgba(255,255,255,0.6);
        text-align:center;
      ">Passo 1 di 3</div>

      <!-- POI Card -->
      <div style="
        background:linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,165,100,0.1));
        border:1.5px solid rgba(255,107,53,0.3);
        border-radius:12px;
        padding:20px;
        display:flex;
        gap:16px;
      ">
        ${state.poiPhoto ? `
          <img src="${state.poiPhoto}" loading="lazy" decoding="async" style="
            width:80px;
            height:80px;
            border-radius:8px;
            object-fit:cover;
            flex-shrink:0;
          " />
        ` : `
          <div style="
            width:80px;
            height:80px;
            border-radius:8px;
            background:rgba(255,107,53,0.2);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:32px;
            flex-shrink:0;
          ">📍</div>
        `}

        <div style="flex:1;min-width:0">
          <div style="
            font-size:16px;
            font-weight:700;
            color:#fff;
            margin-bottom:6px;
            word-break:break-word;
          ">${state.poiName}</div>
          <div style="
            font-size:13px;
            color:rgba(255,255,255,0.7);
            margin-bottom:8px;
          ">📍 ${state.poiCity}</div>
          <div style="
            font-size:11px;
            background:rgba(255,107,53,0.3);
            border-radius:4px;
            padding:4px 8px;
            width:fit-content;
            color:var(--m-accent);
            font-weight:600;
            text-transform:capitalize;
          ">${state.poiType}</div>
        </div>
      </div>

      <!-- Description -->
      <div style="
        font-size:13px;
        color:rgba(255,255,255,0.7);
        line-height:1.6;
      ">
        ✓ Stai per aggiungere questo luogo al tuo itinerario. Nei prossimi step sceglierai il giorno e l'orario.
      </div>

      <!-- Buttons -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        <button id="wizard-next-1" style="
          width:100%;
          padding:14px 16px;
          background:linear-gradient(135deg, var(--m-accent), #FF5E1F);
          border:none;
          border-radius:10px;
          color:#fff;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(255,107,53,0.3)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
          Continua → Scegli Giorno
        </button>
        <button id="wizard-cancel" style="
          width:100%;
          padding:14px 16px;
          background:transparent;
          border:1.5px solid rgba(255,255,255,0.2);
          border-radius:10px;
          color:rgba(255,255,255,0.7);
          font-size:14px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.borderColor='rgba(255,255,255,0.4)';this.style.color='rgba(255,255,255,0.95)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.2)';this.style.color='rgba(255,255,255,0.7)'">
          Annulla
        </button>
      </div>
    </div>
  `;
}

/**
 * STEP 2: Choose day and time
 */
function renderStep2(state) {
  const tripProfile = window.state?.tripProfile || {};
  const days = tripProfile.days || 8;
  const startDate = tripProfile.startDate ? new Date(tripProfile.startDate) : new Date(2027, 3, 10);

  // Google weekdayDescriptions: index 0=Monday, 6=Sunday
  // JS Date.getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  const _jsToGoogleDay = (jsDay) => (jsDay + 6) % 7; // Sun→6, Mon→0, ..., Sat→5
  const weekdayHours = state.poiWeekdayHours || null;

  const dayOptions = Array.from({ length: days }, (_, d) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dayLabel = date.toLocaleDateString('it-IT', { weekday: 'short', month: 'short', day: 'numeric' });
    const dayPOIs = window.state?.itineraryByDay?.[d] || [];
    // Check if POI is closed on this weekday (only if hours data available)
    let closedWarning = '';
    if (weekdayHours) {
      const googleIdx = _jsToGoogleDay(date.getDay());
      const hoursStr = weekdayHours[googleIdx] || '';
      if (/chiuso|closed/i.test(hoursStr)) closedWarning = ' ⚠️ chiuso';
    }
    return { d, dayLabel, poiCount: dayPOIs.length, closedWarning };
  });

  const times = generateTimeSlots();

  return `
    <div style="display:flex;flex-direction:column;gap:24px;padding:0">
      <!-- Progress Bar -->
      <div style="
        width:100%;
        height:6px;
        background:rgba(255,255,255,0.1);
        border-radius:3px;
        overflow:hidden;
      ">
        <div style="
          width:66.66%;
          height:100%;
          background:linear-gradient(90deg, var(--m-accent), #FF5E1F);
          transition:width 0.3s ease;
        "></div>
      </div>

      <!-- Step Indicator -->
      <div style="
        font-size:12px;
        font-weight:600;
        color:rgba(255,255,255,0.6);
        text-align:center;
      ">Passo 2 di 3</div>

      <!-- Day Selection -->
      <div>
        <label style="
          font-size:12px;
          font-weight:700;
          color:rgba(255,255,255,0.8);
          display:block;
          margin-bottom:10px;
        ">📅 Scegli il giorno</label>
        <select id="wizard-day-select" style="
          width:100%;
          padding:12px 14px;
          background:rgba(255,255,255,0.05);
          border:1.5px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:#fff;
          font-size:13px;
          font-weight:500;
          cursor:pointer;
          transition:all 0.2s;
        " onchange="this.style.borderColor='rgba(255,107,53,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          ${dayOptions.map(opt => `
            <option value="${opt.d}" ${opt.d === state.selectedDay ? 'selected' : ''}>
              Day ${opt.d + 1} — ${opt.dayLabel} (${opt.poiCount} POI)${opt.closedWarning}
            </option>
          `).join('')}
        </select>
        ${(() => {
          const sel = dayOptions.find(o => o.d === state.selectedDay);
          return sel?.closedWarning
            ? `<div style="margin-top:8px;padding:8px 12px;background:rgba(255,180,0,0.12);border:1px solid rgba(255,180,0,0.3);border-radius:8px;font-size:12px;color:#ffd166;">⚠️ Questo posto risulta <b>chiuso</b> il giorno selezionato — verifica gli orari aggiornati prima di andare.</div>`
            : '';
        })()}
      </div>

      <!-- Time Selection -->
      <div>
        <label style="
          font-size:12px;
          font-weight:700;
          color:rgba(255,255,255,0.8);
          display:block;
          margin-bottom:10px;
        ">⏰ Scegli l'orario</label>
        <select id="wizard-time-select" style="
          width:100%;
          padding:12px 14px;
          background:rgba(255,255,255,0.05);
          border:1.5px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:#fff;
          font-size:13px;
          font-weight:500;
          cursor:pointer;
          transition:all 0.2s;
        " onchange="this.style.borderColor='rgba(255,107,53,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          ${times.map(t => `
            <option value="${t}" ${t === state.selectedTime ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
      </div>

      <!-- Smart Suggestion -->
      <div style="
        background:rgba(74,175,80,0.1);
        border:1px solid rgba(74,175,80,0.3);
        border-radius:8px;
        padding:12px 14px;
        font-size:12px;
        color:rgba(74,175,80,0.9);
        line-height:1.5;
      ">
        💡 <strong>Suggerimento:</strong> Hai scelto il day ${state.selectedDay + 1} perché ha pochi POI. L'orario suggerito è ${state.selectedTime}.
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:10px;margin-top:12px">
        <button id="wizard-back-2" style="
          flex:1;
          padding:14px 16px;
          background:transparent;
          border:1.5px solid rgba(255,255,255,0.2);
          border-radius:10px;
          color:rgba(255,255,255,0.7);
          font-size:14px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.borderColor='rgba(255,255,255,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.2)'">
          ← Indietro
        </button>
        <button id="wizard-next-2" style="
          flex:1;
          padding:14px 16px;
          background:linear-gradient(135deg, var(--m-accent), #FF5E1F);
          border:none;
          border-radius:10px;
          color:#fff;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(255,107,53,0.3)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
          Continua →
        </button>
      </div>
    </div>
  `;
}

/**
 * STEP 3: Add notes (optional)
 */
function renderStep3(state) {
  return `
    <div style="display:flex;flex-direction:column;gap:24px;padding:0">
      <!-- Progress Bar -->
      <div style="
        width:100%;
        height:6px;
        background:rgba(255,255,255,0.1);
        border-radius:3px;
        overflow:hidden;
      ">
        <div style="
          width:100%;
          height:100%;
          background:linear-gradient(90deg, var(--m-accent), #FF5E1F);
          transition:width 0.3s ease;
        "></div>
      </div>

      <!-- Step Indicator -->
      <div style="
        font-size:12px;
        font-weight:600;
        color:rgba(255,255,255,0.6);
        text-align:center;
      ">Passo 3 di 3</div>

      <!-- Summary -->
      <div style="
        background:rgba(255,255,255,0.03);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:8px;
        padding:10px 12px;
        font-size:12px;
        color:rgba(255,255,255,0.7);
        line-height:1.4;
      ">
        <div style="font-weight:600;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${state.poiName}</div>
        <div>📅 Day ${state.selectedDay + 1} · ⏰ ${state.selectedTime}</div>
      </div>

      <!-- Notes Input -->
      <div>
        <label style="
          font-size:12px;
          font-weight:700;
          color:rgba(255,255,255,0.8);
          display:block;
          margin-bottom:10px;
        ">📝 Note (opzionale)</label>
        <textarea id="wizard-notes-input" placeholder="Es: senza glutine, allergie, preferenze..." style="
          width:100%;
          padding:12px 14px;
          background:rgba(255,255,255,0.05);
          border:1.5px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:#fff;
          font-size:13px;
          font-family:inherit;
          resize:vertical;
          min-height:80px;
          transition:all 0.2s;
          box-sizing:border-box;
        " onchange="this.style.borderColor='rgba(255,107,53,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'" onfocus="this.style.borderColor='rgba(255,107,53,0.4)'">${state.notes}</textarea>
      </div>

      <!-- Info -->
      <div style="
        font-size:12px;
        color:rgba(255,255,255,0.6);
        line-height:1.5;
      ">
        ℹ️ Le note sono utili per ricordare preferenze, allergie o dettagli importanti per questo luogo.
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:10px;margin-top:12px">
        <button id="wizard-back-3" style="
          flex:1;
          padding:14px 16px;
          background:transparent;
          border:1.5px solid rgba(255,255,255,0.2);
          border-radius:10px;
          color:rgba(255,255,255,0.7);
          font-size:14px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.borderColor='rgba(255,255,255,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.2)'">
          ← Indietro
        </button>
        <button id="wizard-finish" style="
          flex:1;
          padding:14px 16px;
          background:linear-gradient(135deg, #4ADE80, #22C55E);
          border:none;
          border-radius:10px;
          color:#fff;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(74,175,80,0.3)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
          ✓ Aggiungi all'Itinerario
        </button>
      </div>
    </div>
  `;
}

/**
 * Generate time slots (every 30 minutes from 08:00 to 22:00)
 */
function generateTimeSlots() {
  const slots = [];
  for (let h = 8; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

/**
 * Setup wizard event handlers
 */
function setupWizardHandlers(step, state) {
  console.log('[AddWizard] Setting up handlers for step', step);

  if (step === 1) {
    const nextBtn = document.getElementById('wizard-next-1');
    const cancelBtn = document.getElementById('wizard-cancel');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        console.log('[AddWizard] Step 1 → Step 2');
        renderWizardStep(2, state);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        console.log('[AddWizard] Wizard cancelled');
        window.closeSheet?.();
      });
    }
  } else if (step === 2) {
    const daySelect = document.getElementById('wizard-day-select');
    const timeSelect = document.getElementById('wizard-time-select');
    const backBtn = document.getElementById('wizard-back-2');
    const nextBtn = document.getElementById('wizard-next-2');

    console.log('[AddWizard] Step 2 setup - backBtn found:', !!backBtn, 'nextBtn found:', !!nextBtn);

    if (daySelect) {
      daySelect.addEventListener('change', (e) => {
        state.selectedDay = parseInt(e.target.value);
        state.selectedTime = getSuggestedTime(state.selectedDay);
        console.log('[AddWizard] Updated day to', state.selectedDay);
        renderWizardStep(2, state); // Refresh to update time suggestion
      });
    }

    if (timeSelect) {
      timeSelect.addEventListener('change', (e) => {
        state.selectedTime = e.target.value;
        console.log('[AddWizard] Updated time to', state.selectedTime);
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        console.log('[AddWizard] ✅ Step 2 → Step 1 (back button clicked)');
        renderWizardStep(1, state);
      });
    } else {
      console.warn('[AddWizard] ⚠️ wizard-back-2 button NOT FOUND in step 2');
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        console.log('[AddWizard] ✅ Step 2 → Step 3 (next button clicked)');
        renderWizardStep(3, state);
      });
    } else {
      console.warn('[AddWizard] ⚠️ wizard-next-2 button NOT FOUND in step 2');
    }
  } else if (step === 3) {
    const notesInput = document.getElementById('wizard-notes-input');
    const backBtn = document.getElementById('wizard-back-3');
    const finishBtn = document.getElementById('wizard-finish');

    console.log('[AddWizard] Step 3 setup - backBtn found:', !!backBtn, 'finishBtn found:', !!finishBtn);

    if (notesInput) {
      notesInput.addEventListener('input', (e) => {
        state.notes = e.target.value;
        console.log('[AddWizard] Updated notes');
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        console.log('[AddWizard] ✅ Step 3 → Step 2 (back button clicked)');
        renderWizardStep(2, state);
      });
    } else {
      console.warn('[AddWizard] ⚠️ wizard-back-3 button NOT FOUND in step 3');
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        console.log('[AddWizard] ✅ Finishing wizard...');
        finishAddToItinerary(state);
      });
    } else {
      console.warn('[AddWizard] ⚠️ wizard-finish button NOT FOUND in step 3');
    }
  }
}

/**
 * Finish and add POI to itinerary
 */
function finishAddToItinerary(state) {
  console.log('[AddWizard] Adding POI to itinerary:', state);

  // Check duplicate POI in same day
  if (window.ITINERARY?.hasDuplicatePOI) {
    if (window.ITINERARY.hasDuplicatePOI(state.poiId, state.selectedDay)) {
      console.warn('[AddWizard] ⚠️ Duplicate POI in day');
      window.toast?.(_Tw('wizard.duplicate', '⚠️ Questo luogo è già stato aggiunto a questo giorno'));
      return;
    }
  }

  // Add using ITINERARY system
  if (window.ITINERARY?.addPOIToDay) {
    console.log('[AddWizard] 📝 Saving POI with name:', state.poiName, 'POI ID:', state.poiId);
    const success = window.ITINERARY.addPOIToDay(
      state.poiId,
      state.poiName,
      state.selectedDay,
      state.selectedTime,
      60,          // Default duration (minutes)
      state.notes,
      0,           // Default cost (not set in this wizard)
      null,        // tag
      state.poiLat,
      state.poiLng
    );

    if (success) {
      console.log('[AddWizard] ✅ POI saved successfully with name:', state.poiName);
      if (state.notes) {
        window.ITINERARY.updateNotes(state.poiId, state.notes);
      }
    } else {
      console.error('[AddWizard] ❌ Failed to save POI');
    }

    if (success) {
      console.log('[AddWizard] ✅ POI added successfully');
      window.closeSheet?.();

      // Show success toast
      window.toast?.(`✅ ${state.poiName} aggiunto al Day ${state.selectedDay + 1} alle ${state.selectedTime}`);

      // Refresh itinerary view if it's open
      if (typeof window.renderItineraryUnified === 'function') {
        setTimeout(() => {
          window.renderItineraryUnified();
        }, 500);
      }

      // Clean up
      window.addWizardState = null;
    } else {
      console.error('[AddWizard] ❌ Failed to add POI');
      window.toast?.(_Tw('wizard.addError', '❌ Errore: impossibile aggiungere il POI'));
    }
  } else {
    console.error('[AddWizard] ITINERARY system not available');
    window.toast?.(_Tw('wizard.systemNA', '❌ Sistema itinerario non disponibile'));
  }
}

// Expose to window
window.openAddToItineraryWizard = openAddToItineraryWizard;
