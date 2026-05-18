/**
 * GF Verification Date Validator
 * Warning se info POI >12 mesi stale (ricalcolo dato)
 */

const VERIFICATION_STALE_DAYS = 365;
const VERIFICATION_WARNING_DAYS = 330; // Alert prima di 1 anno

/**
 * Check se POI info è stale
 */
function isGFVerificationStale(verificationDateISO) {
  if (!verificationDateISO) return true;

  const verDate = new Date(verificationDateISO);
  const now = new Date();
  const daysPassed = Math.floor((now - verDate) / (1000 * 60 * 60 * 24));

  return daysPassed > VERIFICATION_STALE_DAYS;
}

/**
 * Get warning status
 */
function getGFVerificationStatus(verificationDateISO) {
  if (!verificationDateISO) {
    return {
      status: 'unknown',
      icon: '❓',
      message: 'Verificazione data sconosciuta',
      color: '#FF9800'
    };
  }

  const verDate = new Date(verificationDateISO);
  const now = new Date();
  const daysPassed = Math.floor((now - verDate) / (1000 * 60 * 60 * 24));

  if (daysPassed < 30) {
    return {
      status: 'fresh',
      icon: '🟢',
      message: `Verificato ${daysPassed}d fa`,
      color: '#4CAF50'
    };
  }

  if (daysPassed < 90) {
    return {
      status: 'ok',
      icon: '🟡',
      message: `Verificato ${daysPassed}d fa`,
      color: '#FFC107'
    };
  }

  if (daysPassed < VERIFICATION_WARNING_DAYS) {
    return {
      status: 'warning',
      icon: '🟠',
      message: `Verificato ${daysPassed}d fa — richecka presto`,
      color: '#FF9800'
    };
  }

  return {
    status: 'stale',
    icon: '🔴',
    message: `Verificato ${daysPassed}d fa — AGGIORNA INFO`,
    color: '#FF5722'
  };
}

/**
 * Render badge per POI
 */
function renderGFVerificationBadge(poiElement, verificationDateISO) {
  const status = getGFVerificationStatus(verificationDateISO);

  const badge = document.createElement('div');
  badge.style.cssText = `
    display: inline-block;
    padding: 6px 12px;
    background: ${status.color};
    color: white;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: bold;
    margin-left: 8px;
  `;
  badge.textContent = `${status.icon} ${status.message}`;

  poiElement.appendChild(badge);

  return badge;
}

/**
 * Periodic check: ogni 24h notifica se data diventata stale
 */
function startVerificationCheckInterval() {
  setInterval(() => {
    // Check all POI sul DOM
    const poiElements = document.querySelectorAll('[data-poi-verification-date]');

    poiElements.forEach((el) => {
      const verDate = el.getAttribute('data-poi-verification-date');
      const status = getGFVerificationStatus(verDate);

      if (status.status === 'stale') {
        // Notifica utente
        const poiName = el.getAttribute('data-poi-name') || 'POI';
        console.warn(`[GFValidator] Stale data per ${poiName}`);

        // Toast notification
        if (typeof showToast === 'function') {
          showToast(
            `⚠️ Info stale: ${poiName}\nVerificato ${Math.floor((Date.now() - new Date(verDate)) / (1000 * 60 * 60 * 24))}d fa`,
            'warning'
          );
        }
      }
    });
  }, 24 * 60 * 60 * 1000); // 24h
}

/**
 * Export
 */
export {
  isGFVerificationStale,
  getGFVerificationStatus,
  renderGFVerificationBadge,
  startVerificationCheckInterval,
  VERIFICATION_STALE_DAYS,
  VERIFICATION_WARNING_DAYS
};
