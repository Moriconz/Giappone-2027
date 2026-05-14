/**
 * ONBOARDING SCREEN — First-time user setup
 *
 * Collects: trip name, dates, group size, interests, dietary restrictions, budget
 * Saves to: state.tripProfile (localStorage)
 * Shown: Only if tripProfile doesn't exist
 */

function initOnboarding() {
  const ONBOARDING_KEY = 'tripProfile';

  // Check if user has already completed onboarding
  const existingProfile = localStorage.getItem(ONBOARDING_KEY);
  if (existingProfile) {
    console.log('[Onboarding] Already completed, skipping...');
    return; // Skip onboarding
  }

  console.log('[Onboarding] First time user, showing onboarding...');
  showOnboarding();
}

function showOnboarding() {
  const html = `
    <div id="onboarding-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    ">
      <div id="onboarding-container" style="
        width: 100%;
        max-width: 420px;
        background: linear-gradient(135deg, rgba(26,31,46,0.95), rgba(20,30,80,0.95));
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.1);
        padding: 32px 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        margin: 20px;
      ">
        <h1 style="
          font-size: 28px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          margin: 0 0 8px 0;
          text-align: center;
        ">Giappone 2027</h1>

        <p style="
          font-size: 14px;
          color: rgba(255,255,255,0.65);
          text-align: center;
          margin: 0 0 32px 0;
          line-height: 1.5;
        ">Personalizziamo il tuo viaggio in pochi secondi</p>

        <form id="onboarding-form" style="display: flex; flex-direction: column; gap: 20px;">

          <!-- Step 1: Trip name & dates -->
          <div class="onboarding-step" data-step="1">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: rgba(255,255,255,0.6);
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Nome del viaggio</label>
            <input type="text" name="tripName" placeholder="Es: Giappone 2027" class="form-input" value="Giappone 2027" style="margin-bottom: 12px;">

            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: rgba(255,255,255,0.6);
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Quanti giorni?</label>
            <input type="number" name="days" placeholder="Es: 8" class="form-input" min="1" max="30" value="8">
          </div>

          <!-- Step 2: Group size -->
          <div class="onboarding-step" data-step="2" style="display: none;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: rgba(255,255,255,0.6);
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Viaggio con...</label>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                <input type="radio" name="groupSize" value="solo" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255,255,255,0.85);">Solo</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                <input type="radio" name="groupSize" value="partner" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255,255,255,0.85);">Partner/Coppia</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                <input type="radio" name="groupSize" value="group" checked style="width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255,255,255,0.85);">Gruppo (3+)</span>
              </label>
            </div>
          </div>

          <!-- Step 3: Interests -->
          <div class="onboarding-step" data-step="3" style="display: none;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: rgba(255,255,255,0.6);
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Cosa ti interessa? (top 3)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${['Cultura', 'Food', 'Relax', 'Shopping', 'Avventura', 'Natura'].map(interest => `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: rgba(255,255,255,0.04); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                  <input type="checkbox" name="interests" value="${interest.toLowerCase()}" style="width: 16px; height: 16px; cursor: pointer;">
                  <span style="font-size: 13px; color: rgba(255,255,255,0.85);">${interest}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Step 4: Dietary restrictions -->
          <div class="onboarding-step" data-step="4" style="display: none;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: rgba(255,255,255,0.6);
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Vincoli alimentari</label>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                <input type="radio" name="diet" value="none" checked style="width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255,255,255,0.85);">Nessuno</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                <input type="radio" name="diet" value="vegetarian" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255,255,255,0.85);">Vegetariano</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                <input type="radio" name="diet" value="vegan" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255,255,255,0.85);">Vegano</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                <input type="radio" name="diet" value="gluten-free" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255,255,255,0.85);">Gluten-free</span>
              </label>
            </div>
          </div>

          <!-- Step 5: Budget -->
          <div class="onboarding-step" data-step="5" style="display: none;">
            <label style="
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: rgba(255,255,255,0.6);
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Budget giornaliero (€)</label>
            <input type="number" name="budget" placeholder="Es: 50" class="form-input" min="10" max="500" value="50" style="margin-bottom: 4px;">
            <p style="font-size: 11px; color: rgba(255,255,255,0.45); margin: 0;">Budget totale: € <span id="budget-total">400</span></p>
          </div>

          <!-- Navigation -->
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button type="button" id="btn-prev" class="btn-secondary" style="flex: 1; display: none;">← Indietro</button>
            <button type="button" id="btn-next" class="btn-primary" style="flex: 1; background: #FF6B35;">Avanti →</button>
          </div>
          <button type="submit" id="btn-finish" class="btn-cta" style="display: none;">Inizia a pianificare 🗺️</button>
        </form>

        <p style="
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          text-align: center;
          margin-top: 20px;
          margin-bottom: 0;
        ">Puoi cambiare queste preferenze dopo in ⚙️ Menu</p>
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
      alert('Seleziona almeno un interesse');
      return;
    }

    const tripProfile = {
      name: formData.get('tripName'),
      days: parseInt(formData.get('days')),
      groupSize: formData.get('groupSize'),
      interests: interests,
      diet: formData.get('diet'),
      budget_daily: parseInt(formData.get('budget')),
      budget_total: parseInt(formData.get('budget')) * parseInt(formData.get('days')),
      created_at: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem('tripProfile', JSON.stringify(tripProfile));

    // Save to state
    if (window.state) {
      window.state.tripProfile = tripProfile;
      window.saveState?.();
    }

    console.log('[Onboarding] Profile saved:', tripProfile);

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
