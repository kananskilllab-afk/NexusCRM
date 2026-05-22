const API_URL = 'http://localhost:5000/api/voyage';

const getHeaders = () => {
  const stateStr = localStorage.getItem('nexusCRM_State_v2');
  let token = null;
  if(stateStr) {
    try {
      const state = JSON.parse(stateStr);
      token = state.token;
    } catch(e) {}
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const getAuthHeader = () => {
  const stateStr = localStorage.getItem('nexusCRM_State_v2');
  let token = null;
  if(stateStr) {
    try { token = JSON.parse(stateStr).token; } catch(e) {}
  }
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const voyageApi = {
  health: async () => {
    const res = await fetch(`${API_URL}/health`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Voyage API unreachable');
    return res.json();
  },
  
  // ─── BOOKINGS ───────────────────────────────────────────────────────────────
  getBookings: async () => {
    const res = await fetch(`${API_URL}/bookings`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch bookings');
    return res.json();
  },
  createBooking: async (data) => {
    const res = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create booking');
    return res.json();
  },
  
  // ─── PIPELINE ───────────────────────────────────────────────────────────────
  getPipeline: async () => {
    const res = await fetch(`${API_URL}/pipeline`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch pipeline');
    return res.json();
  },
  updateBookingStage: async (bookingId, newStageId) => {
    const res = await fetch(`${API_URL}/bookings/${bookingId}/stage`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ stage_id: newStageId })
    });
    if (!res.ok) throw new Error('Failed to update booking stage');
    return res.json();
  },
  
  // ─── ITINERARY ──────────────────────────────────────────────────────────────
  getItinerary: async (bookingId) => {
    const res = await fetch(`${API_URL}/itinerary/${bookingId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch itinerary');
    return res.json();
  },
  saveItinerary: async (bookingId, stateData) => {
    const res = await fetch(`${API_URL}/itinerary/${bookingId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ state_json: JSON.stringify(stateData) })
    });
    if (!res.ok) throw new Error('Failed to save itinerary');
    return res.json();
  },
  
  // ─── FINANCE ────────────────────────────────────────────────────────────────
  getQuotes: async () => {
    const res = await fetch(`${API_URL}/finance/quotes`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch quotes');
    return res.json();
  },
  getInvoices: async () => {
    const res = await fetch(`${API_URL}/finance/invoices`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },
  getCommissions: async () => {
    const res = await fetch(`${API_URL}/finance/commissions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch commissions');
    return res.json();
  },

  // ─── PASSENGERS ─────────────────────────────────────────────────────────────
  getPassengers: async (bookingId) => {
    const res = await fetch(`${API_URL}/passengers/${bookingId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch passengers');
    return res.json();
  },
  addPassenger: async (bookingId, data) => {
    const res = await fetch(`${API_URL}/passengers/${bookingId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add passenger');
    return res.json();
  },
  updatePassenger: async (bookingId, passengerId, data) => {
    const res = await fetch(`${API_URL}/passengers/${bookingId}/${passengerId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update passenger');
    return res.json();
  },
  deletePassenger: async (bookingId, passengerId) => {
    const res = await fetch(`${API_URL}/passengers/${bookingId}/${passengerId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete passenger');
    return res.json();
  },

  // ─── SEGMENTS ───────────────────────────────────────────────────────────────
  getSegments: async (bookingId) => {
    const res = await fetch(`${API_URL}/segments/${bookingId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch segments');
    return res.json();
  },
  addSegment: async (bookingId, data) => {
    const res = await fetch(`${API_URL}/segments/${bookingId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add segment');
    return res.json();
  },
  updateSegment: async (bookingId, segmentId, data) => {
    const res = await fetch(`${API_URL}/segments/${bookingId}/${segmentId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update segment');
    return res.json();
  },
  deleteSegment: async (bookingId, segmentId) => {
    const res = await fetch(`${API_URL}/segments/${bookingId}/${segmentId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete segment');
    return res.json();
  },

  // ─── SUPPLIER CONTRACTS ─────────────────────────────────────────────────────
  getContracts: async () => {
    const res = await fetch(`${API_URL}/contracts`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch contracts');
    return res.json();
  },
  getContractsBySupplier: async (supplierId) => {
    const res = await fetch(`${API_URL}/contracts/supplier/${supplierId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch contracts');
    return res.json();
  },
  createContract: async (data) => {
    const res = await fetch(`${API_URL}/contracts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create contract');
    return res.json();
  },
  updateContract: async (id, data) => {
    const res = await fetch(`${API_URL}/contracts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update contract');
    return res.json();
  },
  deleteContract: async (id) => {
    const res = await fetch(`${API_URL}/contracts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete contract');
    return res.json();
  },

  // ─── DOCUMENT VAULT ─────────────────────────────────────────────────────────
  getDocuments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/documents${query ? '?' + query : ''}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },
  uploadDocument: async (formData) => {
    const res = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },
  downloadDocument: async (id) => {
    const res = await fetch(`${API_URL}/documents/download/${id}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to download document');
    return res.blob();
  },
  deleteDocument: async (id) => {
    const res = await fetch(`${API_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // ─── EMAIL TEMPLATES ────────────────────────────────────────────────────────
  getEmailTemplates: async () => {
    const res = await fetch(`${API_URL}/emails/templates`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch email templates');
    return res.json();
  },
  createEmailTemplate: async (data) => {
    const res = await fetch(`${API_URL}/emails/templates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create email template');
    return res.json();
  },
  updateEmailTemplate: async (id, data) => {
    const res = await fetch(`${API_URL}/emails/templates/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update template');
    return res.json();
  },
  deleteEmailTemplate: async (id) => {
    const res = await fetch(`${API_URL}/emails/templates/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete template');
    return res.json();
  },

  // ─── EMAIL SENDS ────────────────────────────────────────────────────────────
  getEmailHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/emails/history${query ? '?' + query : ''}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch email history');
    return res.json();
  },
  sendEmail: async (data) => {
    const res = await fetch(`${API_URL}/emails/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to send email');
    return res.json();
  },
};
