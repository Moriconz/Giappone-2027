/**
 * BUDGET — Spese tracking + settlement
 * Extracted from index.html
 */

import { state, showToast } from './core.js';

export let transactions = [];
export let members = {};
export let idbDatabase = null;

export const budgetState = {
  currency: 'JPY',
  totalSpent: 0,
  balances: {} // { memberId: amount }
};

// ============================================================================
// INDEXEDDB PERSISTENCE
// ============================================================================

export async function initBudgetIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SafeEatsBudget', 1);

    request.onerror = () => {
      console.error('[Budget] IDB init error:', request.error);
      reject(request.error);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
      console.log('[Budget] IDB store created');
    };

    request.onsuccess = () => {
      idbDatabase = request.result;
      console.log('[Budget] ✓ IndexedDB initialized');
      resolve(idbDatabase);
    };
  });
}

function saveTransactionToIDB(tx) {
  return new Promise((resolve, reject) => {
    if (!idbDatabase) {
      reject(new Error('IDB not initialized'));
      return;
    }

    const txn = idbDatabase.transaction('transactions', 'readwrite');
    const store = txn.objectStore('transactions');
    const request = store.put(tx);

    request.onsuccess = () => resolve(tx);
    request.onerror = () => reject(request.error);
  });
}

export async function loadTransactionsFromIDB() {
  return new Promise((resolve, reject) => {
    if (!idbDatabase) {
      reject(new Error('IDB not initialized'));
      return;
    }

    const txn = idbDatabase.transaction('transactions', 'readonly');
    const store = txn.objectStore('transactions');
    const request = store.getAll();

    request.onsuccess = () => {
      transactions = request.result;
      budgetState.totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      recalculateBalances();
      console.log('[Budget] ✓ Loaded', transactions.length, 'transactions from IDB');
      resolve(transactions);
    };

    request.onerror = () => {
      console.error('[Budget] IDB load error:', request.error);
      reject(request.error);
    };
  });
}

function deleteTransactionFromIDB(txId) {
  return new Promise((resolve, reject) => {
    if (!idbDatabase) {
      reject(new Error('IDB not initialized'));
      return;
    }

    const txn = idbDatabase.transaction('transactions', 'readwrite');
    const store = txn.objectStore('transactions');
    const request = store.delete(txId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export async function addTransaction(amount, description, paidBy, splitAmong = []) {
  const tx = {
    id: `tx_${Date.now()}_${Math.random()}`,
    amount: parseFloat(amount),
    description: description,
    paidBy: paidBy,
    splitAmong: splitAmong || [paidBy],
    timestamp: new Date().toISOString(),
    currency: budgetState.currency,
    category: 'meal'
  };

  transactions.push(tx);
  budgetState.totalSpent += tx.amount;

  // Recalculate balances
  recalculateBalances();

  // Save to IndexedDB
  if (idbDatabase) {
    await saveTransactionToIDB(tx);
  }

  console.log('[Budget] Transaction added:', description, tx.amount, budgetState.currency);
  showToast(`€ ${tx.amount} aggiunto`, 'success');

  return tx;
}

export function getTransactions(limit = null) {
  if (limit) {
    return transactions.slice(-limit);
  }
  return transactions;
}

export async function deleteTransaction(txId) {
  const idx = transactions.findIndex(t => t.id === txId);
  if (idx !== -1) {
    const tx = transactions[idx];
    budgetState.totalSpent -= tx.amount;
    transactions.splice(idx, 1);
    recalculateBalances();

    // Delete from IndexedDB
    if (idbDatabase) {
      await deleteTransactionFromIDB(txId);
    }

    console.log('[Budget] Transaction deleted:', txId);
  }
}

// ============================================================================
// BALANCE CALCULATION
// ============================================================================

export function recalculateBalances() {
  budgetState.balances = {};

  // Initialize all members
  Object.keys(members).forEach(id => {
    budgetState.balances[id] = 0;
  });

  // Process transactions
  transactions.forEach(tx => {
    // Add to payer
    budgetState.balances[tx.paidBy] = (budgetState.balances[tx.paidBy] || 0) + tx.amount;

    // Subtract from split
    const perPerson = tx.amount / tx.splitAmong.length;
    tx.splitAmong.forEach(memberId => {
      budgetState.balances[memberId] = (budgetState.balances[memberId] || 0) - perPerson;
    });
  });

  console.log('[Budget] Balances recalculated', budgetState.balances);
}

export function getBalance(memberId) {
  return budgetState.balances[memberId] || 0;
}

export function getTotalSpent() {
  return budgetState.totalSpent;
}

// ============================================================================
// SETTLEMENT
// ============================================================================

export function getSettlements() {
  const settlements = [];
  const balances = { ...budgetState.balances };

  // Simple algorithm: match debtors with creditors
  const debtors = Object.entries(balances)
    .filter(([, balance]) => balance < 0)
    .map(([id, balance]) => ({ id, amount: Math.abs(balance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(balances)
    .filter(([, balance]) => balance > 0)
    .map(([id, balance]) => ({ id, amount: balance }))
    .sort((a, b) => b.amount - a.amount);

  for (let debtor of debtors) {
    for (let creditor of creditors) {
      if (debtor.amount <= 0 || creditor.amount <= 0) continue;

      const amount = Math.min(debtor.amount, creditor.amount);
      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: parseFloat(amount.toFixed(2)),
        description: `Payment for expenses`
      });

      debtor.amount -= amount;
      creditor.amount -= amount;
    }
  }

  return settlements;
}

// ============================================================================
// RENDERING
// ============================================================================

export function renderBudgetSummary() {
  const panel = document.getElementById('budget-summary');
  if (!panel) return;

  const settlements = getSettlements();

  panel.innerHTML = `
    <div style="padding: 16px;">
      <h3>Total Spent: ${budgetState.totalSpent.toFixed(2)} ${budgetState.currency}</h3>

      <h4 style="margin-top: 16px;">Settlements:</h4>
      ${settlements.length > 0
        ? settlements
            .map(s => `<div style="padding: 8px; background: rgba(255,255,255,0.1); margin: 4px 0; border-radius: 4px;">
            ${members[s.from]?.name || s.from} → ${members[s.to]?.name || s.to}: ${s.amount.toFixed(2)} ${budgetState.currency}
          </div>`)
            .join('')
        : '<p style="opacity: 0.7;">No settlements needed</p>'}

      <h4 style="margin-top: 16px;">Balances:</h4>
      ${Object.entries(budgetState.balances)
        .map(([id, balance]) => `
        <div style="padding: 8px; margin: 4px 0; ${balance > 0 ? 'color: #4CAF50;' : 'color: #FF5252;'}">
          ${members[id]?.name || id}: ${balance > 0 ? '+' : ''}${balance.toFixed(2)} ${budgetState.currency}
        </div>
      `)
        .join('')}
    </div>
  `;
}

// ============================================================================
// INIT
// ============================================================================

// Auto-initialize IndexedDB and load persisted data
(async () => {
  try {
    await initBudgetIDB();
    await loadTransactionsFromIDB();
  } catch (err) {
    console.warn('[Budget] IDB init failed, running in-memory mode:', err);
  }
})();

console.log('[Budget] ✓ Budget module loaded');
