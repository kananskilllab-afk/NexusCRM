const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

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

export const api = {
  // Auth
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    return res.json();
  },
  
  // Leads
  getLeads: async () => {
    const res = await fetch(`${API_URL}/leads`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },
  
  getLead: async (id) => {
    const res = await fetch(`${API_URL}/leads/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch lead');
    return res.json();
  },

  createLead: async (leadData) => {
    const res = await fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(leadData)
    });
    if (!res.ok) throw new Error('Failed to create lead');
    return res.json();
  },

  updateLead: async (id, updates) => {
    const res = await fetch(`${API_URL}/leads/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return res.json();
  },

  // Users
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  createUser: async (userData) => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  updateUser: async (id, updates) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update user');
    }
    return res.json();
  },

  deleteUser: async (id) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete user');
    }
    return res.json();
  },

  // Customers
  getCustomers: async () => {
    const res = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  createCustomer: async (customerData) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customerData)
    });
    if (!res.ok) throw new Error('Failed to create customer');
    return res.json();
  },

  updateCustomer: async (id, updates) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update customer');
    return res.json();
  },

  deleteCustomer: async (id) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete customer');
    }
    return res.json();
  },

  // Billing and Payments
  addBillingItem: async (leadId, itemData) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/billing-items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    if (!res.ok) throw new Error('Failed to add billing item');
    return res.json();
  },

  deleteBillingItem: async (leadId, itemId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/billing-items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete billing item');
    return res.json();
  },

  addPayment: async (leadId, paymentData) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    if (!res.ok) throw new Error('Failed to add payment');
    return res.json();
  },

  // --- Process-flow endpoints (12-stage CRM) ---
  qualifyLead: async (leadId, payload) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/qualify`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to qualify lead');
    return res.json();
  },

  movePipeline: async (leadId, stage) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/pipeline`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ stage })
    });
    if (!res.ok) throw new Error('Failed to move pipeline stage');
    return res.json();
  },

  autoAssign: async (leadId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/auto-assign`, {
      method: 'POST', headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to auto-assign');
    return res.json();
  },

  generateShareLink: async (leadId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/share-link`, {
      method: 'POST', headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to generate share link');
    return res.json();
  },

  closeTrip: async (leadId, payload) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/close-trip`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to close trip');
    return res.json();
  },

  // Quotes
  createQuote: async (payload) => {
    const res = await fetch(`${API_URL}/quotes`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create quote');
    return res.json();
  },
  getQuotesForLead: async (leadId) => {
    const res = await fetch(`${API_URL}/quotes?lead_id=${encodeURIComponent(leadId)}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load quotes');
    return res.json();
  },
  approveQuote: async (id) => {
    const res = await fetch(`${API_URL}/quotes/${id}/approve`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to approve quote');
    return res.json();
  },
  sendQuote: async (id) => {
    const res = await fetch(`${API_URL}/quotes/${id}/send`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to send quote');
    return res.json();
  },

  // Invoices
  createInvoice: async (payload) => {
    const res = await fetch(`${API_URL}/invoices`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create invoice');
    return res.json();
  },
  getInvoicesForLead: async (leadId) => {
    const res = await fetch(`${API_URL}/invoices?lead_id=${encodeURIComponent(leadId)}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load invoices');
    return res.json();
  },
  addSupplierConfirmation: async (invoiceId, payload) => {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}/supplier-confirmation`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to log supplier confirmation');
    return res.json();
  }
};
