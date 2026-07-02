const API_URL = process.env.REACT_APP_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5005/api' : '/api');

let activeToken = null;

// Global fetch interceptor to handle 401 Unauthorized errors and force redirect to login
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const res = await originalFetch(...args);
  if (res.status === 401 && !args[0].includes('/auth/login')) {
    activeToken = null;
    localStorage.removeItem('nexusCRM_State_v2');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  return res;
};

const getHeaders = () => {
  let token = activeToken;
  if (!token) {
    const stateStr = localStorage.getItem('nexusCRM_State_v2');
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        token = state.token;
      } catch (e) {}
    }
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const api = {
  // Auth
  login: async (email, password) => {
    let res;
    try {
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch (_) {
      throw new Error('Cannot reach the server. Make sure the backend is running.');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || (res.status === 503 ? 'Server is starting up, please try again in a moment.' : 'Login failed'));
    }
    const data = await res.json();
    activeToken = data.token;
    return data;
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

  assignLead: async (id, payload) => {
    const res = await fetch(`${API_URL}/leads/${id}`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to assign lead');
    }
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

  // --- Opportunities (Stage 5 deal pipeline) ---
  getOpportunities: async () => {
    const res = await fetch(`${API_URL}/opportunities`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch opportunities');
    return res.json();
  },
  getOpportunityBoard: async () => {
    const res = await fetch(`${API_URL}/opportunities/board`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch opportunity board');
    return res.json();
  },
  getOpportunity: async (id) => {
    const res = await fetch(`${API_URL}/opportunities/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch opportunity');
    return res.json();
  },
  createOpportunity: async (payload) => {
    const res = await fetch(`${API_URL}/opportunities`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create opportunity');
    }
    return res.json();
  },
  convertLeadToOpportunity: async (leadId, payload = {}) => {
    const res = await fetch(`${API_URL}/opportunities/from-lead/${leadId}`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to convert lead');
    }
    return res.json();
  },
  previewConversion: async (leadId) => {
    const res = await fetch(`${API_URL}/opportunities/from-lead/${leadId}/preview`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load conversion preview');
    return res.json();
  },
  getCustomerOpportunities: async (customerId) => {
    const res = await fetch(`${API_URL}/opportunities/by-customer/${customerId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch customer opportunities');
    return res.json();
  },
  createOpportunityForCustomer: async (customerId, payload = {}) => {
    const res = await fetch(`${API_URL}/opportunities/from-customer/${customerId}`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create opportunity');
    }
    return res.json();
  },
  updateOpportunity: async (id, updates) => {
    const res = await fetch(`${API_URL}/opportunities/${id}`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update opportunity');
    return res.json();
  },
  moveOpportunityStage: async (id, stage, extra = {}) => {
    const res = await fetch(`${API_URL}/opportunities/${id}/stage`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ stage, ...extra })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to move opportunity');
    }
    return res.json();
  },

  // --- Notifications ---
  getNotifications: async (limit = 30) => {
    const res = await fetch(`${API_URL}/notifications?limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },
  getUnreadCount: async () => {
    const res = await fetch(`${API_URL}/notifications/unread-count`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch unread count');
    return res.json();
  },
  markNotificationRead: async (id) => {
    const res = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to update notification');
    return res.json();
  },
  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_URL}/notifications/read-all`, { method: 'PATCH', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to update notifications');
    return res.json();
  },

  // --- Analytics (§10 dashboards) ---
  getLeadFunnel: async () => {
    const res = await fetch(`${API_URL}/analytics/lead-funnel`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch lead funnel');
    return res.json();
  },
  getPipelineAnalytics: async () => {
    const res = await fetch(`${API_URL}/analytics/pipeline`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch pipeline analytics');
    return res.json();
  },
  getAgentLeaderboard: async () => {
    const res = await fetch(`${API_URL}/analytics/agents`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch agent leaderboard');
    return res.json();
  },
  getSalesVelocity: async () => {
    const res = await fetch(`${API_URL}/analytics/velocity`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch sales velocity');
    return res.json();
  },
  getForecast: async () => {
    const res = await fetch(`${API_URL}/analytics/forecast`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch forecast');
    return res.json();
  },
  getRevenueTrend: async () => {
    const res = await fetch(`${API_URL}/analytics/revenue`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch revenue trend');
    return res.json();
  },
  deleteOpportunity: async (id) => {
    const res = await fetch(`${API_URL}/opportunities/${id}`, {
      method: 'DELETE', headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete opportunity');
    }
    return res.json();
  },


  // Communications
  getConversations: async () => {
    const res = await fetch(`${API_URL}/communications`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },
  getMessages: async (contactId) => {
    const res = await fetch(`${API_URL}/communications/${contactId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },
  sendMessage: async (contactId, data) => {
    const res = await fetch(`${API_URL}/communications/${contactId}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  // Bookings
  getBookings: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/voyage/bookings${qs ? '?' + qs : ''}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch bookings');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.bookings || []);
  },
  getBooking: async (id) => {
    const res = await fetch(`${API_URL}/voyage/bookings/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch booking');
    return res.json();
  },
  updateBooking: async (id, payload) => {
    const res = await fetch(`${API_URL}/voyage/bookings/${id}`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update booking');
    return res.json();
  },

  // Users
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  testSmtp: async (smtpConfig) => {
    const res = await fetch(`${API_URL}/users/test-smtp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(smtpConfig)
    });
    return res.json();
  },

  // Google Calendar
  getGoogleAuthUrl: async () => {
    const res = await fetch(`${API_URL}/google/auth-url`, { headers: getHeaders() });
    return res.json();
  },
  getGoogleStatus: async () => {
    const res = await fetch(`${API_URL}/google/status`, { headers: getHeaders() });
    return res.json();
  },
  syncToGoogle: async (events) => {
    const res = await fetch(`${API_URL}/google/sync`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ events }),
    });
    return res.json();
  },
  disconnectGoogle: async () => {
    const res = await fetch(`${API_URL}/google/disconnect`, { method: 'DELETE', headers: getHeaders() });
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

  getCustomer: async (id) => {
    const res = await fetch(`${API_URL}/customers/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch customer');
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
  },

  // Suppliers
  getSuppliers: async () => {
    const res = await fetch(`${API_URL}/suppliers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    return res.json();
  },

  createSupplier: async (supplierData) => {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(supplierData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create supplier');
    }
    return res.json();
  },

  updateSupplier: async (id, updates) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update supplier');
    }
    return res.json();
  },

  deleteSupplier: async (id) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete supplier');
    }
    return res.json();
  },
  // --- Packages ---
  getPackages: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/packages${qs ? '?' + qs : ''}`, { headers: getHeaders() });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to fetch packages'); }
    return res.json();
  },
  createPackage: async (payload) => {
    const res = await fetch(`${API_URL}/packages`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to create package'); }
    return res.json();
  },
  updatePackage: async (id, payload) => {
    const res = await fetch(`${API_URL}/packages/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to update package'); }
    return res.json();
  },
  deletePackage: async (id) => {
    const res = await fetch(`${API_URL}/packages/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to delete package'); }
    return res.json();
  },

  // --- Hotels ---
  getHotels: async () => {
    const res = await fetch(`${API_URL}/hotels`, { headers: getHeaders() });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to fetch hotels'); }
    return res.json();
  },
  createHotel: async (payload) => {
    const res = await fetch(`${API_URL}/hotels`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to create hotel'); }
    return res.json();
  },
  updateHotel: async (id, payload) => {
    const res = await fetch(`${API_URL}/hotels/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to update hotel'); }
    return res.json();
  },
  deleteHotel: async (id) => {
    const res = await fetch(`${API_URL}/hotels/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to delete hotel'); }
    return res.json();
  },

  updateProfile: async (payload) => {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update profile');
    }
    return res.json();
  }
};
