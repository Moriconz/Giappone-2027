/**
 * ONBOARDING SCREEN — First-time user setup
 * Premium warm-dark design with step-by-step flow
 *
 * Collects: trip name, dates, group size, interests, dietary restrictions, budget
 * Saves to: state.tripProfile (localStorage)
 * Shown: Only if tripProfile doesn't exist
 */

const _To = (k, f) => (typeof window.t === 'function') ? window.t(k, f) : f;

function initOnboarding() {
  const ONBOARDING_KEY = 'tripProfile';

  // Check if user has already completed onboarding
  const existingProfile = localStorage.getItem(ONBOARDING_KEY);
  if (existingProfile) {
    console.log('[Onboarding] Already completed, skipping...');
    return; // Skip onboarding
  }

  console.log('[Onboarding] First time user, showing choice modal...');
  showOnboardingChoiceModal();
}

/**
 * Show modal asking user: Create trip or Join existing?
 */
function showOnboardingChoiceModal() {
  const html = `
    <div id="onboarding-choice-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, rgba(10,8,5,0.98), rgba(20,15,10,0.98));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 20px;
    ">
      <div style="
        width: 100%;
        max-width: 440px;
        background: linear-gradient(135deg, rgba(35,28,22,0.92), rgba(42,32,25,0.92));
        border-radius: 20px;
        border: 1px solid rgba(255,165,100,0.15);
        padding: 48px 32px;
        box-shadow:
          0 30px 80px rgba(0,0,0,0.8),
          inset 0 1px 1px rgba(255,255,255,0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        flex-direction: column;
        gap: 28px;
      ">
        <!-- ICON -->
        <div style="
          font-size: 56px;
          text-align: center;
        ">🌏</div>

        <!-- TITLE -->
        <h1 style="
          font-size: 28px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          margin: 0;
          text-align: center;
          letter-spacing: -0.5px;
        ">${_To("ob.welcome", "Benvenuto!")}</h1>

        <!-- SUBTITLE -->
        <p style="
          font-size: 14px;
          color: rgba(255,255,255,0.65);
          text-align: center;
          margin: 0;
          line-height: 1.6;
        ">${_To("ob.choice", "Che cosa vuoi fare?")}</p>

        <!-- OPTION 1: CREATE TRIP -->
        <button id="choice-create" style="
          padding: 18px 20px;
          background: var(--m-accent);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(255,107,53,0.3)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
          <span style="font-size: 18px">✏️</span>
          ${_To("ob.create", "Creare il mio viaggio")}
        </button>

        <!-- OPTION 2: JOIN TRIP -->
        <button id="choice-join" style="
          padding: 18px 20px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,165,100,0.3);
          border-radius: 12px;
          color: rgba(255,255,255,0.8);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        " onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='rgba(255,165,100,0.5)';this.style.color='rgba(255,255,255,0.95)'" onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.borderColor='rgba(255,165,100,0.3)';this.style.color='rgba(255,255,255,0.8)'">
          <span style="font-size: 18px">👥</span>
          ${_To("ob.join", "Partecipare a un viaggio")}
        </button>

        <!-- INFO -->
        <p style="
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          text-align: center;
          margin: 0;
          line-height: 1.5;
        ">
          ${_To("ob.hint", "💡 Potrai sempre creare un viaggio dal menù della mappa")}
        </p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  // Attach event listeners
  const createBtn = document.getElementById('choice-create');
  const joinBtn = document.getElementById('choice-join');

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      console.log('[Onboarding] User chose: CREATE TRIP');
      closeOnboardingChoiceModal();
      showOnboarding();
    });
  }

  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      console.log('[Onboarding] User chose: JOIN TRIP - skipping onboarding');
      closeOnboardingChoiceModal();
      skipOnboarding();
    });
  }
}

/**
 * Close choice modal
 */
function closeOnboardingChoiceModal() {
  const overlay = document.getElementById('onboarding-choice-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => overlay.remove(), 300);
  }
}

/**
 * Skip onboarding and go directly to map
 */
function skipOnboarding() {
  console.log('[Onboarding] Skipped - going directly to map');
  // Just close the choice modal, the app will load the map by default
}

function showOnboarding() {
  const html = `
    <div id="onboarding-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, rgba(10,8,5,0.98), rgba(20,15,10,0.98));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 20px;
      overflow-y: auto;
    ">
      <div id="onboarding-container" style="
        width: 100%;
        max-width: 440px;
        background: linear-gradient(135deg, rgba(35,28,22,0.92), rgba(42,32,25,0.92));
        border-radius: 20px;
        border: 1px solid rgba(255,165,100,0.15);
        padding: 48px 32px;
        box-shadow:
          0 30px 80px rgba(0,0,0,0.8),
          inset 0 1px 1px rgba(255,255,255,0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      ">
        <!-- STEP INDICATOR -->
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
          justify-content: center;
        ">
          <div id="step-indicator" style="
            font-size: 12px;
            font-weight: 600;
            color: rgba(255,165,100,0.8);
            letter-spacing: 0.5px;
            text-transform: uppercase;
          ">${_To('ob.stepOf','Passo')} 1 ${_To('ob.of','di')} 5</div>
          <div style="
            height: 1px;
            flex: 1;
            background: linear-gradient(90deg, rgba(255,165,100,0.4), transparent);
            max-width: 60px;
          "></div>
        </div>

        <!-- HERO TEXT -->
        <h1 style="
          font-size: 32px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          margin: 0 0 12px 0;
          text-align: center;
          letter-spacing: -0.5px;
          line-height: 1.2;
        ">Giappone 2027</h1>

        <p style="
          font-size: 15px;
          color: rgba(255,255,255,0.65);
          text-align: center;
          margin: 0 0 40px 0;
          line-height: 1.6;
          font-weight: 400;
        ">${_To("ob.subtitle", "Prepariamo il tuo viaggio perfetto. Ti guideremo in 5 semplici step.")}</p>

        <form id="onboarding-form" style="display: flex; flex-direction: column; gap: 28px;">

          <!-- Step 1: Trip name & dates -->
          <div class="onboarding-step" data-step="1">
            <div style="margin-bottom: 28px;">
              <label style="
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.7);
                margin-bottom: 10px;
                letter-spacing: 0.3px;
              ">${_To('ob.tripName','Nome del viaggio')}</label>
              <input
                type="text"
                name="tripName"
                placeholder="${_To('ob.tripNamePh','Es: Giappone 2027')}"
                class="form-input"
                value="Giappone 2027"
                style="
                  width: 100%;
                  padding: 14px 16px;
                  background: rgba(255,255,255,0.06);
                  border: 1px solid rgba(255,165,100,0.2);
                  border-radius: 10px;
                  color: rgba(255,255,255,0.95);
                  font-size: 15px;
                  font-family: inherit;
                  transition: all 0.3s ease;
                  box-sizing: border-box;
                "
                onfocus="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,165,100,0.4)';"
                onblur="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.2)';"
              >
            </div>

            <div>
              <label style="
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.7);
                margin-bottom: 10px;
                letter-spacing: 0.3px;
              ">${_To('ob.daysLabel','Quanti giorni?')}</label>
              <input
                type="number"
                name="days"
                placeholder="${_To('ob.daysPh','Es: 8')}"
                class="form-input"
                min="1"
                max="30"
                value="8"
                style="
                  width: 100%;
                  padding: 14px 16px;
                  background: rgba(255,255,255,0.06);
                  border: 1px solid rgba(255,165,100,0.2);
                  border-radius: 10px;
                  color: rgba(255,255,255,0.95);
                  font-size: 15px;
                  font-family: inherit;
                  transition: all 0.3s ease;
                  box-sizing: border-box;
                "
                onfocus="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,165,100,0.4)';"
                onblur="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.2)';"
              >
            </div>

            <div>
              <label style="
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.7);
                margin-bottom: 10px;
                letter-spacing: 0.3px;
              ">${_To('ob.startDateLabel','Data di inizio')}</label>
              <input
                type="date"
                name="startDate"
                class="form-input"
                value="2027-04-10"
                style="
                  width: 100%;
                  padding: 14px 16px;
                  background: rgba(255,255,255,0.06);
                  border: 1px solid rgba(255,165,100,0.2);
                  border-radius: 10px;
                  color: rgba(255,255,255,0.95);
                  font-size: 15px;
                  font-family: inherit;
                  transition: all 0.3s ease;
                  box-sizing: border-box;
                  color-scheme: dark;
                "
                onfocus="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,165,100,0.4)';"
                onblur="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.2)';"
              >
            </div>
          </div>

          <!-- Step 2: Group size -->
          <div class="onboarding-step" data-step="2" style="display: none;">
            <label style="
              display: block;
              font-size: 13px;
              font-weight: 600;
              color: rgba(255,255,255,0.7);
              margin-bottom: 16px;
              letter-spacing: 0.3px;
            ">${_To('ob.groupSizeLabel','Con chi viaggi?')}</label>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <label style="
                display: flex;
                align-items: center;
                gap: 14px;
                cursor: pointer;
                padding: 16px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,165,100,0.15);
                border-radius: 12px;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.3)';"
              onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,165,100,0.15)';">
                <input
                  type="radio"
                  name="groupSize"
                  value="solo"
                  style="
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--m-accent);
                  "
                >
                <span style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500;">${_To('ob.solo','Solo')}</span>
              </label>

              <label style="
                display: flex;
                align-items: center;
                gap: 14px;
                cursor: pointer;
                padding: 16px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,165,100,0.15);
                border-radius: 12px;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.3)';"
              onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,165,100,0.15)';">
                <input
                  type="radio"
                  name="groupSize"
                  value="partner"
                  style="
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--m-accent);
                  "
                >
                <span style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500;">${_To('ob.couple','Partner/Coppia')}</span>
              </label>

              <label style="
                display: flex;
                align-items: center;
                gap: 14px;
                cursor: pointer;
                padding: 16px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,165,100,0.15);
                border-radius: 12px;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.3)';"
              onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,165,100,0.15)';">
                <input
                  type="radio"
                  name="groupSize"
                  value="group"
                  checked
                  style="
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--m-accent);
                  "
                >
                <span style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500;">${_To('ob.group3','Gruppo (3+)')}</span>
              </label>
            </div>
          </div>

          <!-- Step 3: Interests -->
          <div class="onboarding-step" data-step="3" style="display: none;">
            <label style="
              display: block;
              font-size: 13px;
              font-weight: 600;
              color: rgba(255,255,255,0.7);
              margin-bottom: 16px;
              letter-spacing: 0.3px;
            ">${_To('ob.interestsLabel','Cosa ti interessa? (scegli almeno 1)')}</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              ${['Cultura', 'Food', 'Relax', 'Shopping', 'Avventura', 'Natura'].map(interest => `
                <label style="
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  cursor: pointer;
                  padding: 14px;
                  background: rgba(255,255,255,0.04);
                  border: 1.5px solid rgba(255,165,100,0.15);
                  border-radius: 10px;
                  transition: all 0.3s ease;
                "
                onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.3)';"
                onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,165,100,0.15)';">
                  <input
                    type="checkbox"
                    name="interests"
                    value="${interest.toLowerCase()}"
                    style="
                      width: 18px;
                      height: 18px;
                      cursor: pointer;
                      accent-color: var(--m-accent);
                    "
                  >
                  <span style="font-size: 14px; color: rgba(255,255,255,0.85); font-weight: 500;">${_To('ob.int.'+interest.toLowerCase(), interest)}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Step 4: Dietary restrictions -->
          <div class="onboarding-step" data-step="4" style="display: none;">
            <label style="
              display: block;
              font-size: 13px;
              font-weight: 600;
              color: rgba(255,255,255,0.7);
              margin-bottom: 16px;
              letter-spacing: 0.3px;
            ">${_To('ob.dietLabel','Vincoli alimentari')}</label>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <label style="
                display: flex;
                align-items: center;
                gap: 14px;
                cursor: pointer;
                padding: 16px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,165,100,0.15);
                border-radius: 12px;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.3)';"
              onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,165,100,0.15)';">
                <input
                  type="radio"
                  name="diet"
                  value="none"
                  checked
                  style="
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--m-accent);
                  "
                >
                <span style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500;">${_To('ob.dietNone','Nessuno')}</span>
              </label>

              <label style="
                display: flex;
                align-items: center;
                gap: 14px;
                cursor: pointer;
                padding: 16px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,165,100,0.15);
                border-radius: 12px;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.3)';"
              onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,165,100,0.15)';">
                <input
                  type="radio"
                  name="diet"
                  value="vegetarian"
                  style="
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--m-accent);
                  "
                >
                <span style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500;">${_To('ob.dietVeg','Vegetariano')}</span>
              </label>

              <label style="
                display: flex;
                align-items: center;
                gap: 14px;
                cursor: pointer;
                padding: 16px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,165,100,0.15);
                border-radius: 12px;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.3)';"
              onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,165,100,0.15)';">
                <input
                  type="radio"
                  name="diet"
                  value="vegan"
                  style="
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--m-accent);
                  "
                >
                <span style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500;">${_To('ob.dietVegan','Vegano')}</span>
              </label>

              <label style="
                display: flex;
                align-items: center;
                gap: 14px;
                cursor: pointer;
                padding: 16px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,165,100,0.15);
                border-radius: 12px;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.3)';"
              onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,165,100,0.15)';">
                <input
                  type="radio"
                  name="diet"
                  value="gluten-free"
                  style="
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--m-accent);
                  "
                >
                <span style="color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500;">Gluten-free</span>
              </label>
            </div>
          </div>

          <!-- Step 5: Budget -->
          <div class="onboarding-step" data-step="5" style="display: none;">
            <div style="margin-bottom: 28px;">
              <label style="
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.7);
                margin-bottom: 10px;
                letter-spacing: 0.3px;
              ">${_To('ob.budgetLabel','Budget giornaliero (€)')}</label>
              <input
                type="number"
                name="budget"
                placeholder="${_To('ob.budgetPh','Es: 50')}"
                class="form-input"
                min="10"
                max="500"
                value="50"
                style="
                  width: 100%;
                  padding: 14px 16px;
                  background: rgba(255,255,255,0.06);
                  border: 1px solid rgba(255,165,100,0.2);
                  border-radius: 10px;
                  color: rgba(255,255,255,0.95);
                  font-size: 15px;
                  font-family: inherit;
                  transition: all 0.3s ease;
                  box-sizing: border-box;
                "
                onfocus="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,165,100,0.4)';"
                onblur="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.2)';"
              >
            </div>

            <div style="
              padding: 14px 16px;
              background: linear-gradient(135deg, rgba(255,165,100,0.1), rgba(255,107,53,0.05));
              border: 1px solid rgba(255,165,100,0.2);
              border-radius: 10px;
            ">
              <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">${_To('ob.budgetTotal','Budget totale')}</div>
              <div style="font-size: 24px; color: var(--m-accent); font-weight: 700;">€<span id="budget-total">400</span></div>
            </div>
          </div>

          <!-- NAVIGATION BUTTONS -->
          <div style="display: flex; gap: 12px; margin-top: 8px;">
            <button
              type="button"
              id="btn-prev"
              style="
                flex: 1;
                display: none;
                padding: 14px 20px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,165,100,0.2);
                border-radius: 10px;
                color: rgba(255,255,255,0.8);
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,165,100,0.3)';"
              onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,165,100,0.2)';"
            >${_To("ob.prev", "← Indietro")}</button>

            <button
              type="button"
              id="btn-next"
              style="
                flex: 1;
                padding: 14px 20px;
                background: linear-gradient(135deg, var(--m-accent), #FF5E1F);
                border: none;
                border-radius: 10px;
                color: #fff;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 8px 24px rgba(255,107,53,0.3);
              "
              onmouseover="this.style.boxShadow='0 12px 32px rgba(255,107,53,0.4)'; this.style.transform='translateY(-2px)';"
              onmouseout="this.style.boxShadow='0 8px 24px rgba(255,107,53,0.3)'; this.style.transform='translateY(0)';"
            >${_To("ob.next", "Avanti →")}</button>
          </div>

          <button
            type="submit"
            id="btn-finish"
            style="
              display: none;
              padding: 16px 20px;
              background: linear-gradient(135deg, var(--m-accent), #FF5E1F);
              border: none;
              border-radius: 10px;
              color: #fff;
              font-size: 16px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 8px 24px rgba(255,107,53,0.3);
            "
            onmouseover="this.style.boxShadow='0 12px 32px rgba(255,107,53,0.4)'; this.style.transform='translateY(-2px)';"
            onmouseout="this.style.boxShadow='0 8px 24px rgba(255,107,53,0.3)'; this.style.transform='translateY(0)';"
          >${_To("ob.finish", "Inizia a pianificare 🗺️")}</button>
        </form>

        <!-- FOOTER TEXT -->
        <p style="
          font-size: 12px;
          color: rgba(255,255,255,0.50);
          text-align: center;
          margin-top: 28px;
          margin-bottom: 0;
          line-height: 1.5;
        ">${_To("ob.footer", "Puoi modificare queste preferenze in qualsiasi momento dal menu ⚙️")}</p>
      </div>
    </div>
  `;

  // Inject into DOM
  const overlay = document.createElement('div');
  overlay.innerHTML = html;
  document.body.appendChild(overlay.firstElementChild);

  // Initialize form logic
  initOnboardingForm();
}

function initOnboardingForm() {
  const form = document.getElementById('onboarding-form');
  let currentStep = 1;
  const totalSteps = 5;

  function showStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(el => {
      el.style.display = el.dataset.step == step ? 'block' : 'none';
    });

    // Update step indicator
    const stepIndicator = document.getElementById('step-indicator');
    if (stepIndicator) {
      stepIndicator.textContent = _To('ob.stepOf', 'Passo') + ' ' + step + ' ' + _To('ob.of', 'di') + ' ' + totalSteps;
    }

    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const finishBtn = document.getElementById('btn-finish');

    prevBtn.style.display = step === 1 ? 'none' : 'block';
    nextBtn.style.display = step === totalSteps ? 'none' : 'block';
    finishBtn.style.display = step === totalSteps ? 'block' : 'none';
  }

  document.getElementById('btn-next').addEventListener('click', () => {
    if (currentStep < totalSteps) {
      currentStep++;
      showStep(currentStep);
    }
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });

  // Budget auto-update
  document.querySelector('input[name="days"]').addEventListener('change', (e) => {
    const budget = parseFloat(document.querySelector('input[name="budget"]').value) || 50;
    const total = budget * parseInt(e.target.value);
    document.getElementById('budget-total').textContent = total;
  });

  document.querySelector('input[name="budget"]').addEventListener('change', (e) => {
    const days = parseInt(document.querySelector('input[name="days"]').value) || 8;
    const total = parseInt(e.target.value) * days;
    document.getElementById('budget-total').textContent = total;
  });

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const interests = Array.from(formData.getAll('interests'));

    if (interests.length === 0) {
      (window.toast || function(m) { window.modalConfirm(m, { confirmText: 'OK', cancelText: '' }); })(_To('ob.selectInterest', '⚠️ Seleziona almeno un interesse'));
      return;
    }

    const tripProfile = {
      name: formData.get('tripName'),
      days: parseInt(formData.get('days')) || 8,
      startDate: formData.get('startDate') || '2027-04-10',
      groupSize: formData.get('groupSize'),
      interests: interests,
      diet: formData.get('diet'),
      budget_daily: parseInt(formData.get('budget')) || 50000,
      budget_total: (parseInt(formData.get('budget')) || 50000) * (parseInt(formData.get('days')) || 8),
      created_at: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem('tripProfile', JSON.stringify(tripProfile));

    // Save to state
    if (window.state) {
      window.state.tripProfile = tripProfile;
      window.saveState?.();
    }

    // Il form ha già l'opzione "senza glutine" tra i vincoli alimentari,
    // ma finora non era collegata al toggle GF reale (menu → isGFEnabled).
    if (tripProfile.diet === 'gluten-free') window.setGFEnabled?.(true);

    // Signal post-onboarding tip on next load
    sessionStorage.setItem('gj_onboarding_just_done', '1');

    // Remove onboarding overlay
    document.getElementById('onboarding-overlay').remove();

    // Reload page or reinitialize UI
    window.location.reload();
  });

  showStep(1);
}

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Onboarding] Checking if needed...');
  initOnboarding();
});
