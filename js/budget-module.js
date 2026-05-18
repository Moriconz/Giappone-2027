/**
 * Budget Module — Lazy-loaded
 * Loaded only when Budget tab is accessed
 */

export function init() {
  console.log('[BudgetModule] Initializing...');

  // Fallback: If inline budget code exists globally, use it
  if (window.initBudgetTab && typeof window.initBudgetTab === 'function') {
    window.initBudgetTab();
    return;
  }

  // Otherwise set up basic budget functionality
  setupBudgetBasics();
}

function setupBudgetBasics() {
  console.log('[BudgetModule] Setting up budget UI');

  const budgetForm = document.querySelector('[data-tab-content="budget"]');
  if (!budgetForm) return;

  // Example: Setup event handlers
  const addBtn = budgetForm.querySelector('[data-action="add-expense"]');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      console.log('[BudgetModule] Add expense clicked');
    });
  }
}
