const API_URL = 'http://localhost:5000/api';

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

  // Customers
  getCustomers: async () => {
    const res = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  }
};
