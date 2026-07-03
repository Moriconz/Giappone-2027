/**
 * itinerary-tickets.js — Vault biglietti/prenotazioni dell'itinerario
 *
 * Un'unica entità "ticket" con campo `type` (transport|entry|lodging|event),
 * salvata in window.state.tickets (localStorage via window.saveState, stesso
 * pattern di tutto il resto dell'app — niente IndexedDB).
 *
 * API pubblica:
 *   window.ITINERARY_TICKETS.addTicket(data)
 *   window.ITINERARY_TICKETS.updateTicketStatus(id, status)
 *   window.ITINERARY_TICKETS.deleteTicket(id)
 *   window.ITINERARY_TICKETS.getTicketsForDay(dayIdx)
 *   window.ITINERARY_TICKETS.getAllTickets()
 *
 * Dipendenze (window): state, saveState
 */
(function () {
  'use strict';

  function _tickets() {
    if (!Array.isArray(window.state.tickets)) window.state.tickets = [];
    return window.state.tickets;
  }

  function addTicket(data) {
    const t = {
      id: 'tk_' + Date.now(),
      type: data.type || 'transport',
      title: data.title || '',
      provider: data.provider || '',
      code: data.code || '',
      linkStopPoi: data.linkStopPoi || null,
      linkDay: (data.linkDay ?? null),
      startDateTime: data.startDateTime || '',
      status: data.status || 'booked',
      price: (data.price === '' || data.price == null) ? null : Number(data.price),
      currency: data.currency || '',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };
    _tickets().push(t);
    window.saveState?.();
    return t;
  }

  function updateTicketStatus(id, status) {
    const t = _tickets().find(x => x.id === id);
    if (!t) return null;
    t.status = status;
    window.saveState?.();
    return t;
  }

  function deleteTicket(id) {
    const arr = _tickets();
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return false;
    arr.splice(idx, 1);
    window.saveState?.();
    return true;
  }

  function getTicketsForDay(dayIdx) {
    return _tickets().filter(t => t.linkDay === dayIdx);
  }

  function getAllTickets() {
    return _tickets();
  }

  window.ITINERARY_TICKETS = { addTicket, updateTicketStatus, deleteTicket, getTicketsForDay, getAllTickets };
})();
