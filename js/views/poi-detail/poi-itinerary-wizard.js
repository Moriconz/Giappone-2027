// ============================================================================
// poi-detail/poi-itinerary-wizard.js — wizard "aggiungi all'itinerario" (4 step)
// Estratto da poi-detail-view.js (nessun cambio di comportamento).
// Deps (window.*): ITINERARY, state, openSheet, closeSheet, saveState, toast,
//   getPoiDisplayName, t. Espone: window.openAddToItineraryWizard e i global
//   window._wizard* (invariati).
// ============================================================================
(function () {
  'use strict';
  const T = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

function openAddToItineraryWizard(p) {
          console.log('[WIZARD] click registered');

          // FASE 1.4: Show day selector for adding POI to itinerary
          if (!window.ITINERARY) {
            console.error('[openPOI] ITINERARY system not available');
            window.toast(T('itin.systemNA', '❌ Sistema itinerario non pronto'));
            return;
          }

          window.currentPOI = p;
          const tripProfile = window.state?.tripProfile || {};
          const days = tripProfile.days || 8;
          const poiName = window.getPoiDisplayName(p);
          const poiId = p.id;

          console.log('[WIZARD] opening multi-step wizard for POI:', poiName);

          // Wizard state
          const wizardState = {
            step: 1,
            selectedDay: null,
            selectedTime: '10:00',
            duration: 60,
            notes: '',
            cost: 0,
            tag: 'cibo'
          };

          // Save to window for global handlers
          window._wizardPoiId = poiId;
          window._wizardPoiName = poiName;
          window._wizardState = wizardState;

          /**
           * Global handler for confirm button (called via onclick)
           */
          window._handleWizardConfirm = () => {
            console.log('[WIZARD] Confirm button clicked via onclick');
            const st = window._wizardState;
            const pid = window._wizardPoiId;
            const pname = window._wizardPoiName;

            // Capture notes directly from textarea
            const notesField = document.getElementById('wizard-notes-input');
            if (notesField) {
              st.notes = notesField.value.trim();
            }

            // Capture duration directly from input field
            const durationField = document.getElementById('wizard-duration-input');
            if (durationField) {
              const durVal = parseInt(durationField.value, 10);
              if (durVal > 0) st.duration = durVal;
            }

            // Capture cost directly from input field
            const costField = document.getElementById('wizard-cost-input');
            if (costField) {
              st.cost = parseFloat(costField.value) || 0;
            }

            console.log('[WIZARD] Confirming POI addition:', {
              poiId: pid,
              poiName: pname,
              day: st.selectedDay,
              time: st.selectedTime,
              duration: st.duration,
              notes: st.notes,
              cost: st.cost,
              tag: st.tag
            });

            // Validate that a day was selected
            if (st.selectedDay === null) {
              console.warn('[WIZARD] No day selected');
              window.toast('⚠️ Seleziona un giorno');
              return;
            }

            // Add POI with all details (lat/lng for optimizer + route map)
            const _pLat = (window.currentPOI && typeof window.currentPOI.lat === 'number') ? window.currentPOI.lat : (typeof p?.lat === 'number' ? p.lat : null);
            const _pLng = (window.currentPOI && typeof window.currentPOI.lng === 'number') ? window.currentPOI.lng : (typeof p?.lng === 'number' ? p.lng : null);
            const success = window.ITINERARY.addPOIToDay(
              pid,
              pname,
              st.selectedDay,
              st.selectedTime,
              st.duration,
              st.notes,
              st.cost,
              st.tag,
              _pLat,
              _pLng
            );

            if (success) {
              window.saveState?.();
              window.closeSheet();
              window.toast(`✅ Aggiunto al Day ${st.selectedDay + 1} alle ${st.selectedTime}`);
              console.log('[WIZARD] POI successfully added and sheet closed');
            } else {
              console.warn('[WIZARD] Failed to add POI');
              window.toast('❌ Errore nell\'aggiunta del POI');
            }
          };

          /**
           * Render wizard step
           */
          function renderWizardStep() {
            let html = '';

            if (wizardState.step === 1) {
              // STEP 1: Day selection
              const _tp = window.state?.tripProfile || {};
              const _start = _tp.startDate ? new Date(_tp.startDate) : new Date(2027, 3, 10);
              const _weekdayHours = window.currentPOI?.currentOpeningHours?.weekdayDescriptions || null;
              const _jsToGoogleDay = (d) => (d + 6) % 7; // Sun=6, Mon=0, ..., Sat=5
              html = `
                <div style="padding: 16px;">
                  <p style="color: var(--l-ink); margin-bottom: 16px; font-weight: 600;">${window.t ? window.t('wizard.step1') : '📅 STEP 1/4 — Scegli il giorno'}</p>
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    ${Array.from({length: days}, (_, i) => {
                      const isSelected = wizardState.selectedDay === i;
                      const dayDate = new Date(_start); dayDate.setDate(dayDate.getDate() + i);
                      let closedBadge = '';
                      if (_weekdayHours) {
                        const gIdx = _jsToGoogleDay(dayDate.getDay());
                        if (/chiuso|closed/i.test(_weekdayHours[gIdx] || '')) closedBadge = ' ⚠️';
                      }
                      return `
                        <button class="wizard-day-btn" data-day="${i}" style="
                          padding: 12px;
                          background: ${isSelected ? 'rgba(255, 107, 53, 0.4)' : 'rgba(255, 107, 53, 0.15)'};
                          border: 2px solid ${isSelected ? 'rgba(255, 107, 53, 0.8)' : 'rgba(255, 107, 53, 0.3)'};
                          color: var(--m-accent);
                          border-radius: 6px;
                          font-weight: 600;
                          cursor: pointer;
                          transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(255, 107, 53, 0.3)'" onmouseout="this.style.background='${isSelected ? 'rgba(255, 107, 53, 0.4)' : 'rgba(255, 107, 53, 0.15)'}'">
                          Day ${i + 1}${closedBadge}
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            } else if (wizardState.step === 2) {
              // STEP 2: Time selection with hours validation
              let hoursWarning = '';
              if (window.currentPOI?.opening_hours) {
                const timeMatch = wizardState.selectedTime.match(/^(\d{2}):(\d{2})$/);
                if (timeMatch) {
                  const inputHour = parseInt(timeMatch[1], 10), inputMin = parseInt(timeMatch[2], 10);
                  const inputMinutes = inputHour * 60 + inputMin;
                  const hoursStr = window.currentPOI.opening_hours;
                  const hoursRegex = /(\d{2}):(\d{2})–(\d{2}):(\d{2})/;
                  const match = hoursStr.match(hoursRegex);
                  if (match) {
                    const openHour = parseInt(match[1], 10), openMin = parseInt(match[2], 10);
                    const closeHour = parseInt(match[3], 10), closeMin = parseInt(match[4], 10);
                    const openMinutes = openHour * 60 + openMin;
                    const closeMinutes = closeHour * 60 + closeMin;
                    if (inputMinutes < openMinutes || inputMinutes >= closeMinutes) {
                      hoursWarning = `<div style="background:rgba(180,83,9,0.12);border:1px solid rgba(180,83,9,0.35);border-radius:5px;padding:10px;margin-top:10px;font-size:13px;color:#b45309">⚠️ Questo luogo apre ${hoursStr}. Vuoi continuare?</div>`;
                    }
                  }
                }
              }
              html = `
                <div style="padding: 16px;">
                  <p style="color: var(--l-ink); margin-bottom: 16px; font-weight: 600;">${window.t ? window.t('wizard.step2') : "🕐 STEP 2/4 — Scegli l'orario"}</p>
                  <div style="margin-bottom: 16px;">
                    <label style="display: block; color: var(--l-muted); font-size:14px; margin-bottom: 8px;">Orario (HH:MM)</label>
                    <input type="text" id="wizard-time-input" value="${wizardState.selectedTime}" placeholder="14:30" maxlength="5" style="
                      width: 100%;
                      padding: 10px;
                      background: rgba(20,30,60,0.05);
                      border: 1px solid var(--l-hair);
                      border-radius: 6px;
                      color: var(--l-ink);
                      font-size: 16px;
                      box-sizing: border-box;
                      font-family: 'Courier New', monospace;
                    ">
                    <p style="color: var(--l-muted); font-size:13px; margin-top: 6px;">Formato: HH:MM (es: 14:30, 09:45)</p>
                    ${hoursWarning}
                  </div>
                  <p style="color: var(--l-muted); font-size:14px; margin-top: 16px;">Giorno selezionato: <strong style="color: var(--m-accent);">Day ${wizardState.selectedDay + 1}</strong></p>
                </div>
              `;
            } else if (wizardState.step === 3) {
              // STEP 3: Details (Duration, Notes, Cost)
              html = `
                <div style="padding: 16px; max-height: 400px; overflow-y: auto;">
                  <p style="color: var(--l-ink); margin-bottom: 16px; font-weight: 600;">${window.t ? window.t('wizard.step3') : '📋 STEP 3/4 — Dettagli (opzionali)'}</p>

                  <div style="margin-bottom: 14px;">
                    <label style="display: block; color: var(--l-muted); font-size:14px; margin-bottom: 8px;">${window.t ? window.t('wizard.duration') : '⏱️ Durata (minuti)'}</label>
                    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                      ${[30, 60, 90, 120, 180].map(d => `
                        <button class="duration-preset" data-duration="${d}" style="
                          flex: 1;
                          padding: 8px;
                          background: ${wizardState.duration === d ? 'rgba(74,124,89,0.4)' : 'rgba(20,30,60,0.04)'};
                          border: 1px solid ${wizardState.duration === d ? 'rgba(74,124,89,0.6)' : 'var(--l-hair)'};
                          color: ${wizardState.duration === d ? '#16a34a' : 'var(--l-muted)'};
                          border-radius: 4px;
                          font-size:13px;
                          font-weight: 500;
                          cursor: pointer;
                          transition: all 0.2s;
                        " onmouseover="this.style.background='${wizardState.duration === d ? 'rgba(74,124,89,0.5)' : 'rgba(20,30,60,0.08)'}'" onmouseout="this.style.background='${wizardState.duration === d ? 'rgba(74,124,89,0.4)' : 'rgba(20,30,60,0.04)'}'">
                          ${d}m
                        </button>
                      `).join('')}
                    </div>
                    <input type="number" id="wizard-duration-input" value="${wizardState.duration}" min="5" max="480" placeholder="o inserisci manualmente" style="
                      width: 100%;
                      padding: 8px;
                      background: rgba(20,30,60,0.04);
                      border: 1px solid var(--l-hair);
                      border-radius: 4px;
                      color: var(--l-ink);
                      font-size:14px;
                      box-sizing: border-box;
                    ">
                  </div>

                  <div style="margin-bottom: 14px;">
                    <label style="display: block; color: var(--l-muted); font-size:14px; margin-bottom: 8px;">💰 Costo (opzionale)</label>
                    <input type="number" id="wizard-cost-input" value="${wizardState.cost}" min="0" placeholder="Es: 15.50" style="
                      width: 100%;
                      padding: 8px;
                      background: rgba(20,30,60,0.04);
                      border: 1px solid var(--l-hair);
                      border-radius: 4px;
                      color: var(--l-ink);
                      font-size:14px;
                      box-sizing: border-box;
                    ">
                  </div>

                  <div style="margin-bottom: 14px;">
                    <label style="display: block; color: var(--l-muted); font-size:14px; margin-bottom: 8px;">🏷️ Categoria</label>
                    <select id="wizard-tag-select" style="
                      width: 100%;
                      padding: 8px;
                      background: rgba(20,30,60,0.04);
                      border: 1px solid var(--l-hair);
                      border-radius: 4px;
                      color: var(--l-ink);
                      font-size:14px;
                      box-sizing: border-box;
                    ">
                      <option value="cibo" ${wizardState.tag === 'cibo' ? 'selected' : ''}>🍽️ Cibo</option>
                      <option value="trasporti" ${wizardState.tag === 'trasporti' ? 'selected' : ''}>🚌 Trasporti</option>
                      <option value="ingressi" ${wizardState.tag === 'ingressi' ? 'selected' : ''}>🎫 Ingressi</option>
                      <option value="shopping" ${wizardState.tag === 'shopping' ? 'selected' : ''}>🛍️ Shopping</option>
                      <option value="altro" ${wizardState.tag === 'altro' ? 'selected' : ''}>📦 Altro</option>
                    </select>
                  </div>

                  <div>
                    <label style="display: block; color: var(--l-muted); font-size:14px; margin-bottom: 8px;">📝 Note personalizzate (opzionale)</label>
                    <textarea id="wizard-notes-input" placeholder="Es: Prenotare in anticipo, glutine-free disponibile..." style="
                      width: 100%;
                      padding: 8px;
                      background: rgba(20,30,60,0.04);
                      border: 1px solid var(--l-hair);
                      border-radius: 4px;
                      color: var(--l-ink);
                      font-size:14px;
                      resize: vertical;
                      min-height: 60px;
                      box-sizing: border-box;
                      font-family: inherit;
                    ">${wizardState.notes}</textarea>
                  </div>
                </div>
              `;
            } else if (wizardState.step === 4) {
              // STEP 4: Summary & Confirm
              const _tp4 = window.state?.tripProfile || {};
              const _start4 = _tp4.startDate ? new Date(_tp4.startDate) : new Date(2027, 3, 10);
              const dayDate = new Date(_start4); dayDate.setDate(dayDate.getDate() + wizardState.selectedDay);
              const dayLabel = dayDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              html = `
                <div style="padding: 16px;">
                  <p style="color: var(--l-ink); margin-bottom: 16px; font-weight: 600;">${window.t ? window.t('wizard.step4') : '✅ STEP 4/4 — Riepilogo'}</p>

                  <div style="background: rgba(20,30,60,0.04); border: 1px solid var(--l-hair); border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <div style="margin-bottom: 10px;">
                      <div style="font-size:13px; color: var(--l-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📌 Punto di interesse</div>
                      <div style="font-size:16px; color: var(--l-ink); font-weight: 600;">${poiName}</div>
                    </div>

                    <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid var(--l-hair);">
                      <div style="font-size:13px; color: var(--l-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📅 Data e orario</div>
                      <div style="font-size:15px; color: var(--l-ink);">
                        <strong>Day ${wizardState.selectedDay + 1}</strong> · ${dayLabel}<br>
                        <strong>${wizardState.selectedTime}</strong>
                      </div>
                    </div>

                    <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid var(--l-hair);">
                      <div style="font-size:13px; color: var(--l-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">⏱️ Durata</div>
                      <div style="font-size:15px; color: var(--l-ink);"><strong>${wizardState.duration}</strong> minuti</div>
                    </div>

                    <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid var(--l-hair);">
                      <div style="font-size:13px; color: var(--l-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">🏷️ Categoria</div>
                      <div style="font-size:15px; color: var(--l-ink);"><strong>${['cibo', 'trasporti', 'ingressi', 'shopping', 'altro'].includes(wizardState.tag) ? wizardState.tag.charAt(0).toUpperCase() + wizardState.tag.slice(1) : 'Altro'}</strong></div>
                    </div>

                    ${wizardState.cost > 0 ? `
                      <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid var(--l-hair);">
                        <div style="font-size:13px; color: var(--l-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">💰 Costo</div>
                        <div style="font-size:15px; color: var(--l-ink);"><strong>¥${wizardState.cost}</strong></div>
                      </div>
                    ` : ''}

                    ${wizardState.notes ? `
                      <div style="padding-top: 10px; border-top: 1px solid var(--l-hair);">
                        <div style="font-size:13px; color: var(--l-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📝 Note</div>
                        <div style="font-size:14px; color: var(--l-ink); line-height: 1.4;">${wizardState.notes}</div>
                      </div>
                    ` : ''}
                  </div>

                  <p style="color: var(--l-muted); font-size:14px; text-align: center;">Conferma per aggiungere alla tappa</p>
                </div>
              `;
            }

            return html;
          }

          /**
           * Update Y2K window content (including buttons)
           */
          function updateWizardUI() {
            // Find the Y2K window that contains wizard
            // Use robust method: find the correct Y2K window by searching from wizard elements
            let wizardContainer = null;
            let containerSource = '';

            // Method 1: Try to find from any wizard button (most reliable when multiple Y2K windows open)
            const wizardBtn = document.querySelector('.wizard-day-btn, .wizard-next-btn, .wizard-back-btn, .wizard-confirm-btn');
            if (wizardBtn) {
              const y2kWin = wizardBtn.closest('.y2k-win');
              if (y2kWin) {
                wizardContainer = y2kWin.querySelector('.y2k-win-body');
                containerSource = 'found via closest .y2k-win from wizard button';
              }
            }

            // Fallback 1: Direct selector (works when only one Y2K window open)
            if (!wizardContainer) {
              wizardContainer = document.querySelector('.y2k-win-body');
              containerSource = 'y2k-win-body direct selector';
            }

            // Fallback 2: Try sheet-body (legacy support)
            if (!wizardContainer) {
              wizardContainer = document.getElementById('sheet-body');
              containerSource = 'sheet-body fallback';
            }

            // Fallback 3: Find by wizard elements in DOM
            if (!wizardContainer) {
              wizardContainer = document.querySelector('.wizard-cancel-btn')?.closest('div');
              containerSource = 'closest div fallback';
            }

            if (!wizardContainer) {
              console.warn('[WIZARD] Could not find wizard container to update');
              return;
            }

            console.log('[WIZARD] Found container via:', containerSource, 'tag:', wizardContainer.tagName, 'id:', wizardContainer.id, 'class:', wizardContainer.className);

            // Re-render ENTIRE wizard (content + buttons), not just the content
            const fullWizardHTML = renderWizardStep() + `
              <div style="padding: 12px 16px; border-top: 1px solid var(--l-hair); display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
                <!-- LEFT BUTTONS -->
                <button class="wizard-cancel-btn" style="
                  padding: 8px 12px;
                  background: rgba(20,30,60,0.04);
                  border: 1px solid var(--l-hair);
                  color: var(--l-muted);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size:13px;
                  font-weight: 500;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.background='rgba(20,30,60,0.08)'" onmouseout="this.style.background='rgba(20,30,60,0.04)'">
                  ✕ Annulla
                </button>

                ${wizardState.step > 1 ? `
                  <button class="wizard-back-btn" style="
                    padding: 8px 12px;
                    background: rgba(20,30,60,0.04);
                    border: 1px solid var(--l-hair);
                    color: var(--l-muted);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size:13px;
                    font-weight: 500;
                    transition: all 0.2s;
                    white-space: nowrap;
                  " onmouseover="this.style.background='rgba(20,30,60,0.08)'" onmouseout="this.style.background='rgba(20,30,60,0.04)'">
                    ${window.t ? window.t('common.back') : '← Indietro'}
                  </button>
                ` : ''}

                <!-- SPACER -->
                <div style="flex: 1;"></div>

                <!-- RIGHT BUTTON -->
                ${wizardState.step < 4 ? `
                  <button class="wizard-next-btn" style="
                    padding: 8px 16px;
                    background: rgba(255, 107, 53, 0.3);
                    border: 1px solid rgba(255, 107, 53, 0.5);
                    color: var(--m-accent);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size:14px;
                    font-weight: 600;
                    transition: all 0.2s;
                    white-space: nowrap;
                  " onmouseover="this.style.background='rgba(255, 107, 53, 0.4)'" onmouseout="this.style.background='rgba(255, 107, 53, 0.3)'">
                    ${window.t ? window.t('common.next') : 'Avanti →'}
                  </button>
                ` : `
                  <button class="wizard-confirm-btn" style="
                    padding: 8px 16px;
                    background: rgba(74,124,89,0.3);
                    border: 1px solid rgba(74,124,89,0.5);
                    color: #16a34a;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size:14px;
                    font-weight: 600;
                    transition: all 0.2s;
                    white-space: nowrap;
                  " onmouseover="this.style.background='rgba(74,124,89,0.4)'" onmouseout="this.style.background='rgba(74,124,89,0.3)'">
                    ✓ Conferma
                  </button>
                `}
              </div>
            `;

            const headerTitle = (window.t ? [window.t('wizard.day'), window.t('wizard.time'), window.t('wizard.details'), window.t('wizard.summary')] : ['📅 Scegli il giorno', "🕐 Scegli l'orario", '📋 Dettagli', '✅ Riepilogo'])[wizardState.step - 1];

            // Update sheet header if exists
            const sheetHeader = document.querySelector('.sheet-header');
            if (sheetHeader) {
              sheetHeader.textContent = headerTitle;
            }

            // Update container with full wizard (content + buttons)
            wizardContainer.innerHTML = fullWizardHTML;

            // Re-attach handlers (must be done AFTER innerHTML update)
            attachWizardHandlers();

            console.log('[WIZARD] Step', wizardState.step, 'rendered with buttons');
          }

          /**
           * Expose wizard functions to global scope for onclick handlers
           */
          window._wizardSelectDay = (dayIndex) => {
            console.log('[WIZARD] ✅ Day selected:', dayIndex + 1);
            wizardState.selectedDay = dayIndex;
            wizardState.step = 2;
            updateWizardUI();
          };

          window._wizardSelectDuration = (duration) => {
            console.log('[WIZARD] ✅ Duration preset selected:', duration);
            wizardState.duration = duration;
            updateWizardUI();
          };

          window._wizardGoBack = () => {
            console.log('[WIZARD] 🔙 Back button clicked (via onclick)');
            if (wizardState.step > 1) {
              wizardState.step--;
              console.log('[WIZARD] ✅ Back clicked, now at step:', wizardState.step);
              updateWizardUI();
            }
          };

          window._wizardGoNext = () => {
            console.log('[WIZARD] ▶️ Next button clicked (via onclick)');
            if (wizardState.step === 1) wizardState.step = 2;
            else if (wizardState.step === 2) wizardState.step = 3;
            else if (wizardState.step === 3) wizardState.step = 4;
            console.log('[WIZARD] ✅ Next clicked, now at step:', wizardState.step);
            updateWizardUI();
          };

          window._wizardCancel = () => {
            console.log('[WIZARD] ❌ Wizard cancelled (via onclick)');
            // Reset global flags so next wizard opens fresh
            window._wizardClickListenerAttached = false;
            window._wizardChangeListenerAttached = false;
            window.closeSheet();
          };

          /**
           * Attach event handlers using document-level event delegation
           * (Wizard opens in Y2K window, not sheetBody)
           */
          function attachWizardHandlers() {
            console.log('[WIZARD DEBUG] attachWizardHandlers() called');

            // Remove old listener if it exists
            if (window._wizardClickListener) {
              document.removeEventListener('click', window._wizardClickListener, { capture: true });
              console.log('[WIZARD] ✅ Removed stale click listener');
            }

            console.log('[WIZARD] ✅ Attaching fresh click listener');

            // Create and save click listener (so it can be removed later)
            window._wizardClickListener = (e) => {
                const target = e.target;

                // Day selection
                if (target.classList.contains('wizard-day-btn')) {
                  const dayIndex = parseInt(target.dataset.day, 10);
                  console.log('[WIZARD] ✅ Day selected:', dayIndex + 1);
                  wizardState.selectedDay = dayIndex;
                  wizardState.step = 2;
                  e.stopImmediatePropagation(); // Prevent other listeners from firing
                  updateWizardUI();
                  return;
                }

                // Duration presets
                if (target.classList.contains('duration-preset')) {
                  const duration = parseInt(target.dataset.duration, 10);
                  console.log('[WIZARD] ✅ Duration preset selected:', duration);
                  wizardState.duration = duration;
                  updateWizardUI();
                  return;
                }

                // Back button (BEFORE next button for debugging)
                if (target.classList.contains('wizard-back-btn')) {
                  console.log('[WIZARD] 🔙 Back button clicked, current step:', wizardState.step);
                  if (wizardState.step > 1) {
                    wizardState.step--;
                    console.log('[WIZARD] ✅ Back clicked, now at step:', wizardState.step);
                    updateWizardUI();
                  } else {
                    console.warn('[WIZARD] ⚠️ Cannot go back from step 1');
                  }
                  return;
                }

                // Next button
                if (target.classList.contains('wizard-next-btn')) {
                  console.log('[WIZARD] ▶️ Next button clicked, current step:', wizardState.step);
                  if (wizardState.step === 1) wizardState.step = 2;
                  else if (wizardState.step === 2) {
                    // Capture time input value before advancing (change event only fires on blur)
                    const timeInput = document.getElementById('wizard-time-input');
                    if (timeInput) {
                      const timeVal = timeInput.value.trim();
                      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                      if (timeRegex.test(timeVal)) {
                        wizardState.selectedTime = timeVal;
                        console.log('[WIZARD] Time captured from input on next:', wizardState.selectedTime);
                      }
                    }
                    wizardState.step = 3;
                  }
                  else if (wizardState.step === 3) wizardState.step = 4;
                  console.log('[WIZARD] ✅ Next clicked, now at step:', wizardState.step);
                  updateWizardUI();
                  return;
                }

                // Cancel button
                if (target.classList.contains('wizard-cancel-btn')) {
                  console.log('[WIZARD] ❌ Wizard cancelled');
                  window.closeSheet();
                  return;
                }

                // Confirm button
                if (target.classList.contains('wizard-confirm-btn')) {
                  console.log('[WIZARD] Confirm button clicked');

                  // Capture notes directly from textarea
                  const notesField = document.getElementById('wizard-notes-input');
                  if (notesField) {
                    wizardState.notes = notesField.value.trim();
                  }

                  // Capture duration directly from input field
                  const durationField = document.getElementById('wizard-duration-input');
                  if (durationField) {
                    const durVal = parseInt(durationField.value, 10);
                    if (durVal > 0) wizardState.duration = durVal;
                  }

                  // Capture cost directly from input field
                  const costField = document.getElementById('wizard-cost-input');
                  if (costField) {
                    wizardState.cost = parseFloat(costField.value) || 0;
                  }

                  console.log('[WIZARD] Confirming POI:', {poiId, poiName, day: wizardState.selectedDay, time: wizardState.selectedTime});

                  // Validate day selected
                  if (wizardState.selectedDay === null) {
                    console.warn('[WIZARD] No day selected');
                    window.toast('⚠️ Seleziona un giorno');
                    return;
                  }

                  // Add POI (lat/lng for optimizer + route map)
                  const _pLat = (window.currentPOI && typeof window.currentPOI.lat === 'number') ? window.currentPOI.lat : (typeof p?.lat === 'number' ? p.lat : null);
                  const _pLng = (window.currentPOI && typeof window.currentPOI.lng === 'number') ? window.currentPOI.lng : (typeof p?.lng === 'number' ? p.lng : null);
                  const success = window.ITINERARY.addPOIToDay(
                    poiId,
                    poiName,
                    wizardState.selectedDay,
                    wizardState.selectedTime,
                    wizardState.duration,
                    wizardState.notes,
                    wizardState.cost,
                    wizardState.tag,
                    _pLat,
                    _pLng
                  );

                  if (success) {
                    window.saveState?.();
                    window.closeSheet();
                    window.toast(`✅ Aggiunto al Day ${wizardState.selectedDay + 1} alle ${wizardState.selectedTime}`);
                    console.log('[WIZARD] POI added successfully');
                  } else {
                    console.warn('[WIZARD] Failed to add POI');
                    window.toast('❌ Errore');
                  }
                  return;
                }
              };

              // Attach the saved listener
              document.addEventListener('click', window._wizardClickListener, { capture: true });
              console.log('[WIZARD] ✅ Click listener attached');

            // Input fields - Time, Duration, Cost, Notes (using change event delegation)
            // Remove old listener and attach fresh one
            if (window._wizardChangeListener) {
              document.removeEventListener('change', window._wizardChangeListener, { capture: true });
              console.log('[WIZARD] ✅ Removed stale change listener');
            }

            console.log('[WIZARD] ✅ Attaching fresh change listener');

              // Create fresh listener for this wizard session
              window._wizardChangeListener = (e) => {
                if (e.target.id === 'wizard-time-input') {
                  const timeVal = e.target.value.trim();
                  // Validate HH:MM format
                  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                  if (timeRegex.test(timeVal)) {
                    wizardState.selectedTime = timeVal;
                    e.target.style.borderColor = 'rgba(20,30,60,0.2)';
                    console.log('[WIZARD] Time selected:', wizardState.selectedTime);
                  } else {
                    e.target.style.borderColor = 'rgba(255, 107, 53, 0.6)';
                    console.warn('[WIZARD] Invalid time format:', timeVal);
                  }
                }
                if (e.target.id === 'wizard-duration-input') {
                  const val = parseInt(e.target.value, 10);
                  if (val > 0) {
                    wizardState.duration = val;
                    console.log('[WIZARD] Duration set to:', wizardState.duration);
                  }
                }
                if (e.target.id === 'wizard-cost-input') {
                  wizardState.cost = parseFloat(e.target.value) || 0;
                  console.log('[WIZARD] Cost set to:', wizardState.cost);
                }
                if (e.target.id === 'wizard-tag-select') {
                  wizardState.tag = e.target.value;
                  console.log('[WIZARD] Tag set to:', wizardState.tag);
                }
                if (e.target.id === 'wizard-notes-input') {
                  wizardState.notes = e.target.value.trim();
                  console.log('[WIZARD] Notes updated');
                }
              };

              document.addEventListener('change', window._wizardChangeListener, { capture: true });
              console.log('[WIZARD] ✅ Change listener attached');
          }

          /**
           * Create initial wizard content with controls
           */
          const wizardHTML = renderWizardStep() + `
            <div style="padding: 12px 16px; border-top: 1px solid var(--l-hair); display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
              <!-- LEFT BUTTONS -->
              <button class="wizard-cancel-btn" style="
                padding: 8px 12px;
                background: rgba(20,30,60,0.04);
                border: 1px solid var(--l-hair);
                color: var(--l-muted);
                border-radius: 4px;
                cursor: pointer;
                font-size:13px;
                font-weight: 500;
                transition: all 0.2s;
                white-space: nowrap;
              " onmouseover="this.style.background='rgba(20,30,60,0.08)'" onmouseout="this.style.background='rgba(20,30,60,0.04)'">
                ✕ Annulla
              </button>

              ${wizardState.step > 1 ? `
                <button class="wizard-back-btn" style="
                  padding: 8px 12px;
                  background: rgba(20,30,60,0.04);
                  border: 1px solid var(--l-hair);
                  color: var(--l-muted);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size:13px;
                  font-weight: 500;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.background='rgba(20,30,60,0.08)'" onmouseout="this.style.background='rgba(20,30,60,0.04)'">
                  ${window.t ? window.t('common.back') : '← Indietro'}
                </button>
              ` : ''}

              <!-- SPACER -->
              <div style="flex: 1;"></div>

              <!-- RIGHT BUTTON -->
              ${wizardState.step < 4 ? `
                <button class="wizard-next-btn" style="
                  padding: 8px 16px;
                  background: rgba(255, 107, 53, 0.3);
                  border: 1px solid rgba(255, 107, 53, 0.5);
                  color: var(--m-accent);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size:14px;
                  font-weight: 600;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.background='rgba(255, 107, 53, 0.4)'" onmouseout="this.style.background='rgba(255, 107, 53, 0.3)'">
                  ${window.t ? window.t('common.next') : 'Avanti →'}
                </button>
              ` : `
                <button class="wizard-confirm-btn" style="
                  padding: 8px 16px;
                  background: rgba(74,124,89,0.3);
                  border: 1px solid rgba(74,124,89,0.5);
                  color: #16a34a;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size:14px;
                  font-weight: 600;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.background='rgba(74,124,89,0.4)'" onmouseout="this.style.background='rgba(74,124,89,0.3)'">
                  ✓ Conferma
                </button>
              `}
            </div>
          `;

          window.openSheet('📅 Aggiungi all\'itinerario', wizardHTML);

          // Attach handlers after sheet is opened
          setTimeout(() => {
            attachWizardHandlers();
            console.log('[WIZARD] Multi-step wizard initialized');
          }, 50);
}

  window.openAddToItineraryWizard = openAddToItineraryWizard;
})();
