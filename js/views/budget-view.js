/**
 * budget-view.js — Estratto da app-core.js il 2026-06-02 (refactor §8.5 step 5/10)
 * Budget & Currency Tracker: converter valuta + expense tracker manuale.
 *
 * Cluster estratto: CURRENCIES, EXPENSE_CATEGORIES, getBudgetDB, saveBudgetDB,
 *   convertCurrency, getTotalSpent, getSpentByCategory, renderBudgetView.
 *
 * API pubblica:
 *   window.renderBudgetView()
 *   window.getBudgetDB()      — utile per budget-widget-helper.js
 *   window.CURRENCIES         — utile per jr-pass-calculator.js se esteso
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     COSTANTI
  ═══════════════════════════════════════════════════════════════ */

  const CURRENCIES = {
    JPY: { symbol: '¥',    rate: 1,      name: 'Japanese Yen'    },
    EUR: { symbol: '€',    rate: 0.0065, name: 'Euro'            },
    USD: { symbol: '$',    rate: 0.0068, name: 'US Dollar'       },
    GBP: { symbol: '£',    rate: 0.0054, name: 'British Pound'   },
    CHF: { symbol: 'CHF',  rate: 0.0060, name: 'Swiss Franc'     },
    AUD: { symbol: 'A$',   rate: 0.0103, name: 'Australian Dollar'},
    CAD: { symbol: 'C$',   rate: 0.0094, name: 'Canadian Dollar' },
  };

  const EXPENSE_CATEGORIES = [
    { id: 'food',          name: '🍱 Food',          color: '#FF69B4' },
    { id: 'transport',     name: '🚄 Transport',      color: '#00FF88' },
    { id: 'accommodation', name: '🏨 Accommodation',  color: '#FFD700' },
    { id: 'shopping',      name: '🛍️ Shopping',       color: '#FF1493' },
    { id: 'activities',    name: '🎌 Activities',     color: '#6B5EA8' },
    { id: 'other',         name: '📌 Other',          color: '#8080C0' },
  ];

  /* ═══════════════════════════════════════════════════════════════
     DATA LAYER
  ═══════════════════════════════════════════════════════════════ */

  // ponytail: global — default display currency from saved pref / browser locale; JPY only for ja locale
  function defaultDisplayCurrency() {
    try {
      const saved = localStorage.getItem('homeCurrency');
      if (saved && CURRENCIES[saved]) return saved;
      const loc = (navigator.language || 'en').toLowerCase();
      const map = { 'en-gb': 'GBP', it: 'EUR', de: 'EUR', fr: 'EUR', es: 'EUR', pt: 'EUR', nl: 'EUR', ja: 'JPY', en: 'USD' };
      return map[loc] || map[loc.split('-')[0]] || 'EUR';
    } catch (_) { return 'EUR'; }
  }

  function getBudgetDB() {
    const stored = localStorage.getItem('BudgetDB');
    return stored ? JSON.parse(stored) : {
      totalBudget: 300000,
      currency: defaultDisplayCurrency(),
      expenses: [],
      categoryBudgets: {
        food:          100000,
        transport:      50000,
        accommodation: 100000,
        shopping:       30000,
        activities:     15000,
        other:           5000,
      }
    };
  }

  function saveBudgetDB(db) {
    localStorage.setItem('BudgetDB', JSON.stringify(db));
  }

  const RATE_CACHE_KEY = 'gj2027_fx_cache_v1';
  const RATE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  async function refreshRatesIfStale() {
    try {
      const cached = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || 'null');
      if (cached && (Date.now() - cached.ts) < RATE_TTL_MS) {
        Object.assign(CURRENCIES, cached.rates);
        return;
      }
      // open.er-api.com free tier (no key, 1500 req/month)
      const res = await fetch('https://open.er-api.com/v6/latest/JPY');
      if (!res.ok) return;
      const data = await res.json();
      if (data.result !== 'success' || !data.rates) return;
      const updates = {};
      Object.keys(CURRENCIES).forEach(code => {
        if (code !== 'JPY' && data.rates[code]) {
          CURRENCIES[code].rate = data.rates[code];
          updates[code] = { ...CURRENCIES[code] };
        }
      });
      localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: updates }));
    } catch (_) {}
  }

  function _rateAge() {
    try {
      const cached = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || 'null');
      if (!cached) return null;
      const mins = Math.round((Date.now() - cached.ts) / 60000);
      return mins < 60 ? `${mins}min fa` : `${Math.round(mins / 60)}h fa`;
    } catch (_) { return null; }
  }

  function convertCurrency(amount, fromCurrency, toCurrency) {
    const jpy = amount / CURRENCIES[fromCurrency].rate;
    return jpy * CURRENCIES[toCurrency].rate;
  }

  function getTotalSpent(db) {
    return db.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  function getSpentByCategory(db) {
    const spent = {};
    EXPENSE_CATEGORIES.forEach(c => spent[c.id] = 0);
    db.expenses.forEach(e => {
      if (Object.prototype.hasOwnProperty.call(spent, e.category)) spent[e.category] += e.amount;
    });
    return spent;
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDERER PRINCIPALE
  ═══════════════════════════════════════════════════════════════ */

  // Refresh rates once at module load (silent background fetch)
  refreshRatesIfStale();

  function renderBudgetView() {
    const T = window.t || ((k, f) => f || k);
    const db = getBudgetDB();
    const totalSpent    = getTotalSpent(db);
    const remaining     = db.totalBudget - totalSpent;
    const percentSpent  = (totalSpent / db.totalBudget * 100).toFixed(1);
    const spentByCategory = getSpentByCategory(db);

    const curr = CURRENCIES[db.currency];
    const displayCurr = (jpy) => {
      const converted = convertCurrency(jpy, 'JPY', db.currency);
      return curr.symbol + converted.toFixed(0);
    };

    // Giorni: usa itinerary unificato se disponibile
    const daysCount = Object.keys(window.state?.itineraryByDay || {}).filter(d => (window.state.itineraryByDay[d]?.length || 0) > 0).length || '?';

    const html = `
      <div class="budget-container">
        <!-- HEADER: Currency Selector + Budget Total -->
        <div class="budget-header">
          <div class="budget-title-row">
            <h2 style="margin:0">${T('budget.title')}</h2>
            <select id="currency-select" style="padding:6px 10px;background:#fff;border:2px solid #C8BDFF;border-radius:6px;color:var(--y2k-ink);font-weight:700;font-size:12px;cursor:pointer">
              ${Object.keys(CURRENCIES).map(c => `<option value="${c}" ${c === db.currency ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          ${db.currency !== 'JPY' ? `<div style="font-size:11px;color:var(--y2k-muted);margin-top:4px;">
            1 ${db.currency} = ¥${Math.round(1 / CURRENCIES[db.currency].rate).toLocaleString()}
            ${_rateAge() ? `<span style="opacity:0.6;">· aggiornato ${_rateAge()}</span>` : ''}
          </div>` : ''}

          <!-- Budget Progress Bar -->
          <div class="budget-progress-section">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span style="color:var(--y2k-ink);font-weight:700">${T('budget.spentVs')}</span>
              <span style="color:var(--y2k-muted);font-size:12px">${percentSpent}%</span>
            </div>
            <div class="budget-progress-bar">
              <div class="budget-progress-fill" style="width:${Math.min(percentSpent, 100)}%"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px">
              <span style="color:var(--y2k-muted)">${T('budget.spent')}: <strong>${displayCurr(totalSpent)}</strong></span>
              <span style="color:var(--y2k-muted)">${T('budget.remaining')}: <strong style="color:${remaining < 0 ? '#FF6B6B' : '#00AA55'}">${displayCurr(remaining)}</strong></span>
            </div>
          </div>
        </div>

        <!-- Budget Setup (Prominent) -->
        <div class="budget-setup-banner" ${db.totalBudget > 0 ? 'style="opacity:0.7"' : ''}>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="font-size:24px">💰</div>
            <div style="flex:1">
              <div style="color:var(--y2k-ink);font-weight:700;font-size:14px;margin-bottom:2px">${T('budget.setTitle')}</div>
              <div style="color:var(--y2k-muted);font-size:12px">${T('budget.setDesc')}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="config-total-budget-inline" type="number" value="${convertCurrency(db.totalBudget, 'JPY', db.currency).toFixed(0)}" placeholder="${convertCurrency(300000, 'JPY', db.currency).toFixed(0)}" style="flex:2;padding:10px 12px;background:#fff;border:2px solid #FF1493;border-radius:8px;color:var(--y2k-ink);font-weight:700;font-size:14px;box-sizing:border-box" />
            <span style="color:var(--y2k-muted);font-weight:700;font-size:14px">${curr.symbol}</span>
            <button id="config-save-inline" class="btn primary" style="padding:10px 20px;font-size:13px;flex:0.8">OK</button>
          </div>
        </div>

        <!-- Stat Cards -->
        <div class="budget-stats">
          <div class="stat-card">
            <div class="stat-label">${T('budget.total')}</div>
            <div class="stat-value">${displayCurr(db.totalBudget)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${T('budget.spent')}</div>
            <div class="stat-value" style="color:${totalSpent > db.totalBudget * 0.8 ? '#FF6B6B' : '#1A2560'}">${displayCurr(totalSpent)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${T('budget.daysLeft')}</div>
            <div class="stat-value">${daysCount}</div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="budget-categories">
          <h3 style="margin:0 0 14px 0;color:#A8005A;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;font-weight:700">${T('budget.byCategory')}</h3>
          ${EXPENSE_CATEGORIES.map(cat => {
            const budgeted = db.categoryBudgets[cat.id] || 0;
            const spent    = spentByCategory[cat.id]    || 0;
            const pct      = budgeted > 0 ? (spent / budgeted * 100).toFixed(0) : 0;
            return `
              <div class="category-row">
                <div style="display:flex;align-items:center;gap:8px;flex:1">
                  <div class="category-dot" style="background:${cat.color}"></div>
                  <div style="flex:1">
                    <div style="font-weight:700;color:var(--y2k-ink);font-size:13px">${cat.name}</div>
                    <div style="font-size:11px;color:var(--y2k-muted)">${T('budget.budgetLabel')}: ${displayCurr(budgeted)}</div>
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:700;color:var(--y2k-ink);font-size:13px">${displayCurr(spent)}</div>
                  <div style="font-size:11px;color:var(--y2k-muted)">${pct}%</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Add Expense Form -->
        <div class="budget-form-section">
          <h3 style="margin:0 0 14px 0;color:#A8005A;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;font-weight:700">${T('budget.addExpense')}</h3>
          <div class="budget-form">
            <div class="form-row">
              <label>${T('budget.category')}</label>
              <select id="expense-category" style="width:100%;padding:8px;background:#fff;border:2px solid #C8BDFF;border-radius:6px;color:var(--y2k-ink);font-weight:700;font-size:13px">
                ${EXPENSE_CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <label>${T('budget.amount')} (${db.currency})</label>
              <input id="expense-amount" type="number" placeholder="0" min="0" style="width:100%;padding:8px;background:#fff;border:2px solid #C8BDFF;border-radius:6px;color:var(--y2k-ink);font-weight:700;font-size:13px;box-sizing:border-box" />
            </div>
            <div class="form-row">
              <label>${T('budget.descOpt')}</label>
              <input id="expense-description" type="text" placeholder="es. Ramen a Shibuya" style="width:100%;padding:8px;background:#fff;border:2px solid #C8BDFF;border-radius:6px;color:var(--y2k-ink);font-weight:700;font-size:13px;box-sizing:border-box" />
            </div>
            <button id="expense-add-btn" class="btn primary" style="width:100%;padding:12px;font-size:14px">${T('budget.saveExpense')}</button>
          </div>
        </div>

        <!-- Recent Expenses -->
        <div class="budget-expenses-section">
          <h3 style="margin:0 0 14px 0;color:#A8005A;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;font-weight:700">${T('budget.recent')}</h3>
          ${db.expenses.length === 0 ? `
            <div style="text-align:center;padding:20px;color:var(--y2k-muted);font-size:13px">${T('budget.noExpenses')}</div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:10px">
              ${db.expenses.slice(-5).reverse().map((exp) => {
                const catInfo = EXPENSE_CATEGORIES.find(c => c.id === exp.category) || EXPENSE_CATEGORIES[0];
                const date = new Date(exp.date).toLocaleDateString('it-IT');
                // Cambio congelato: se la spesa fu inserita in una valuta diversa da
                // quella oggi selezionata, mostra quanto fu pagato davvero all'origine.
                const originalHint = (exp.entryCurrency && exp.entryCurrency !== db.currency)
                  ? ` · ${CURRENCIES[exp.entryCurrency]?.symbol || exp.entryCurrency}${exp.entryAmount}`
                  : '';
                return `
                  <div class="expense-item">
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:700;color:var(--l-ink);font-size:11px;margin-bottom:1px">${exp.description || catInfo.name}</div>
                      <div style="font-size:12px;color:var(--l-muted)">${date}${originalHint}</div>
                    </div>
                    <div style="text-align:right;flex-shrink:0">
                      <div style="font-weight:700;color:var(--l-ink);font-size:12px">${displayCurr(exp.amount)}</div>
                      <button class="expense-delete-btn" data-expense-index="${db.expenses.indexOf(exp)}" style="background:none;border:none;color:#FF6B6B;font-size:12px;cursor:pointer;font-weight:700;text-decoration:underline;padding:0;margin-top:1px">${T('common.delete')}</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>
    `;

    window.openSheet(T('budget.sheetTitle'), html);

    // Event handlers
    document.getElementById('currency-select').onchange = (e) => {
      db.currency = e.target.value;
      saveBudgetDB(db);
      renderBudgetView();
    };

    setTimeout(() => {
      const addBtn          = document.getElementById('expense-add-btn');
      const categorySelect  = document.getElementById('expense-category');
      const amountInput     = document.getElementById('expense-amount');
      const descriptionInput = document.getElementById('expense-description');

      if (addBtn) {
        addBtn.onclick = () => {
          const category    = categorySelect.value;
          const amount      = parseFloat(amountInput.value);
          const description = descriptionInput.value;

          if (!amount || amount <= 0) {
            window.toast('Inserisci un importo valido!');
            return;
          }

          const jpyAmount = convertCurrency(amount, db.currency, 'JPY');
          db.expenses.push({
            id:          Date.now(),
            category,
            amount:      jpyAmount,
            description,
            date:        new Date().toISOString(),
            // Cambio congelato: l'importo JPY sopra è già immutabile (convertito una
            // volta sola all'inserimento), ma senza questi due campi si perde per
            // sempre "quanto hai pagato davvero" se poi cambi valuta di visualizzazione.
            entryCurrency: db.currency,
            entryAmount:   amount,
          });

          saveBudgetDB(db);
          window.toast(`Spesa ${curr.symbol}${amount.toFixed(0)} registrata!`);

          amountInput.value      = '';
          descriptionInput.value = '';
          categorySelect.value   = EXPENSE_CATEGORIES[0].id;

          renderBudgetView();
        };
      }

      document.querySelectorAll('.expense-delete-btn').forEach(btn => {
        btn.onclick = (e) => {
          const idx = parseInt(e.target.dataset.expenseIndex, 10);
          db.expenses.splice(idx, 1);
          saveBudgetDB(db);
          renderBudgetView();
        };
      });
    }, 200);

    setTimeout(() => {
      const btn   = document.getElementById('config-save-inline');
      const input = document.getElementById('config-total-budget-inline');

      if (btn && input) {
        btn.onclick = () => {
          const newBudget = parseFloat(input.value);
          if (!newBudget || newBudget <= 0) {
            window.toast('Inserisci un budget valido!');
            return;
          }
          // ponytail: input is in display currency → store canonical JPY
          db.totalBudget = convertCurrency(newBudget, db.currency, 'JPY');
          saveBudgetDB(db);
          window.toast('Budget: ' + curr.symbol + newBudget.toFixed(0));
          renderBudgetView();
        };
      }
    }, 200);
  }

  /* ═══════════════════════════════════════════════════════════════
     ESPORTAZIONI PUBBLICHE
  ═══════════════════════════════════════════════════════════════ */
  window.renderBudgetView  = renderBudgetView;
  window.getBudgetDB       = getBudgetDB;
  window.CURRENCIES        = CURRENCIES;
  window.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
})();
