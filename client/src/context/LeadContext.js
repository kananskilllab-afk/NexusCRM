import React, { createContext, useContext, useReducer, useEffect } from 'react';

const LeadContext = createContext();

/* ── §3.3 Lead status workflow: allowed transitions ──
   The lead lifecycle ends at Qualified; conversion to an Opportunity is an
   explicit action (the Convert button), which sets status to Converted. */
const STATUS_TRANSITIONS = {
  'New': ['Attempting Contact', 'Working', 'Unqualified'],
  'Attempting Contact': ['Working', 'Nurturing', 'Unqualified'],
  'Working': ['Qualified', 'Nurturing', 'Unqualified'],
  'Nurturing': ['Working', 'Qualified', 'Unqualified'],
  'Qualified': ['Unqualified'],
  'Unqualified': ['New'],
  'Converted': []
};


const ROLE_HIERARCHY = {
  'Super Admin': 5,
  'Admin': 4,
  'Ops Manager': 3,
  'Ops Staff': 2,
  'Accountant': 1,
  'Viewer': 0
};

/* ── Seed Data ── */
const initialState = {
  isAuthenticated: false,
  currentUser: null,
  loginTimestamp: null,
  isLoading: false,
  error: null,
  preferredCurrency: 'INR',
  users: [],
  leads: [],
  notifications: [],
  unreadComms: 0,
  suppliers: [],
  customers: [],
  auditLog: [],
  statusTransitions: STATUS_TRANSITIONS
};

function leadReducer(state, action) {
  const logAudit = (act, table, recordId, details) => ({
    id: `audit-${Date.now()}`, user: state.currentUser?.name || 'System', action: act, table, recordId, details, timestamp: new Date().toISOString()
  });

  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_COMMS_UNREAD':
      return { ...state, unreadComms: action.payload };
    case 'SET_LEADS':
      return { ...state, isLoading: false, leads: action.payload };
    case 'SET_CUSTOMERS':
      return { ...state, isLoading: false, customers: action.payload };
    case 'SET_USERS':
      return { ...state, isLoading: false, users: action.payload };

    case 'LOGIN':
      return { 
        ...state, 
        isAuthenticated: true, 
        currentUser: action.payload.user,
        token: action.payload.token,
        loginTimestamp: Date.now() 
      };
    case 'LOGOUT':
      localStorage.removeItem('nexusCRM_State_v2');
      return { ...initialState };
    
    case 'UPDATE_SESSION':
      return { ...state, loginTimestamp: Date.now() };

    case 'ADD_LEAD':
      return {
        ...state,
        leads: [action.payload, ...state.leads],
        auditLog: [logAudit('CREATE', 'leads', action.payload.id, `Lead created`), ...state.auditLog]
      };
    
    case 'UPDATE_LEAD':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.id ? { ...l, ...action.payload.data } : l),
        auditLog: [logAudit('UPDATE', 'leads', action.payload.id, `Lead data updated`), ...state.auditLog]
      };

    // ... other cases remain the same but use state.leads

    case 'UPDATE_LEAD_STATUS':
      const leadForStatus = state.leads.find(l => l.id === action.payload.id);
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.id ? { 
          ...l, 
          status: action.payload.status,
          activities: [
            { id: Date.now(), date: new Date().toISOString(), text: `Status updated to ${action.payload.status} (from ${leadForStatus?.status || 'N/A'})`, user: state.currentUser?.name || 'System' },
            ...(l.activities || [])
          ]
        } : l),
        auditLog: [logAudit('STATUS_CHANGE', 'leads', action.payload.id, `Status changed to ${action.payload.status}`), ...state.auditLog]
      };

    case 'ADD_PAYMENT':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? { 
          ...l, 
          billing: {
            ...l.billing,
            payments: [...(l.billing?.payments || []), { ...action.payload.payment, id: `pay-${Date.now()}`, date: new Date().toISOString() }]
          },
          activities: [
            { id: Date.now(), date: new Date().toISOString(), text: `Payment of ₹${Number(action.payload.payment.amount).toLocaleString()} recorded (${action.payload.payment.method})`, user: state.currentUser?.name || 'System' },
            ...(l.activities || [])
          ]
        } : l),
      };

    case 'UPDATE_BILLING':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? { 
          ...l, 
          billing: { ...l.billing, ...action.payload.billingData }
        } : l),
      };

    case 'ASSIGN_SUPPLIER':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? { 
          ...l, 
          assignedSuppliers: [...(l.assignedSuppliers || []), { ...action.payload, id: `as-${Date.now()}` }],
          activities: [
            { id: Date.now(), date: new Date().toISOString(), text: `Supplier assigned: ${action.payload.supplierName} (${action.payload.serviceType}) at ₹${Number(action.payload.rate).toLocaleString()}`, user: state.currentUser?.name || 'System' },
            ...(l.activities || [])
          ]
        } : l),
      };

    case 'LOG_COMMUNICATION':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? { ...l, communications: [action.payload.comm, ...(l.communications || [])] } : l)
      };

    case 'LOG_EXPORT':
      return {
        ...state,
        exportLog: [{ id: `exp-${Date.now()}`, timestamp: new Date().toISOString(), user: state.currentUser?.name, ...action.payload }, ...state.exportLog]
      };

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIF_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    
    case 'ADD_USER':
      return {
        ...state,
        users: [...state.users, action.payload],
        auditLog: [logAudit('CREATE', 'users', action.payload.id, `User identity created: ${action.payload.name}`), ...state.auditLog]
      };
    
    case 'UPDATE_USER':
      const isSelf = state.currentUser && state.currentUser.id === action.payload.id;
      return {
        ...state,
        users: state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload.data } : u),
        ...(isSelf && { currentUser: { ...state.currentUser, ...action.payload.data } }),
        auditLog: [logAudit('UPDATE', 'users', action.payload.id, `User identity updated: ${action.payload.data.name || 'properties'}`), ...state.auditLog]
      };
    
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.payload),
        auditLog: [logAudit('DELETE', 'users', action.payload, `User identity deleted`), ...state.auditLog]
      };
    
    case 'DELETE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.filter(c => c.id !== action.payload),
        auditLog: [logAudit('DELETE', 'customers', action.payload, `Customer deleted`), ...state.auditLog]
      };

    case 'ADD_CUSTOMER':
      return {
        ...state,
        customers: [action.payload, ...state.customers],
        auditLog: [logAudit('CREATE', 'customers', action.payload.id, `Customer created: ${action.payload.first_name}`), ...state.auditLog]
      };

    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map(c => c.id === action.payload.id ? { ...c, ...action.payload.data } : c),
        auditLog: [logAudit('UPDATE', 'customers', action.payload.id, `Customer updated`), ...state.auditLog]
      };

    case 'ADD_FOLLOWUP':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          followUps: [action.payload.followUp, ...(l.followUps || [])]
        } : l)
      };

    case 'ADD_ACTIVITY':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          activities: [action.payload.activity, ...(l.activities || [])]
        } : l)
      };

    case 'ADD_SUPPLIER':
      return {
        ...state,
        suppliers: [...state.suppliers, action.payload]
      };

    case 'SET_SUPPLIERS':
      return {
        ...state,
        isLoading: false,
        suppliers: action.payload
      };

    case 'UPDATE_SUPPLIER':
      return {
        ...state,
        suppliers: state.suppliers.map(s => s.id === action.payload.id ? { ...s, ...action.payload.data } : s)
      };

    case 'DELETE_SUPPLIER':
      return {
        ...state,
        suppliers: state.suppliers.filter(s => s.id !== action.payload)
      };

    case 'ADD_FILES':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          files: [...(l.files || []), ...action.payload.files]
        } : l)
      };

    case 'REMOVE_FILE':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          files: (l.files || []).filter(f => f.id !== action.payload.fileId)
        } : l)
      };

    case 'ADD_NOTE':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          notes: l.notes ? `${l.notes}\n${action.payload.note.text}` : action.payload.note.text
        } : l)
      };

    case 'ADD_TRAVELLER':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          travellers: [...(l.travellers || []), action.payload.traveller]
        } : l)
      };

    case 'REMOVE_TRAVELLER':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          travellers: (l.travellers || []).filter(t => t.id !== action.payload.travellerId)
        } : l)
      };

    case 'ADD_REMINDER':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          reminders: [...(l.reminders || []), action.payload.reminder]
        } : l)
      };

    case 'TOGGLE_REMINDER':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.leadId ? {
          ...l,
          reminders: (l.reminders || []).map(r => r.id === action.payload.reminderId ? { ...r, completed: !r.completed } : r)
        } : l)
      };
    
    default:
      return state;
  }
}

export const formatCurrency = (amount, currency = 'INR') => {
  const symbols = { 'INR': '₹', 'USD': '$', 'EUR': '€' };
  const symbol = symbols[currency] || currency;
  return `${symbol}${Number(amount).toLocaleString()}`;
};

const loadInitialState = () => {
  // Use V2 key to force-reset any old corrupted states
  const saved = localStorage.getItem('nexusCRM_State_v2');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...initialState,
        ...parsed,
        users: Array.isArray(parsed.users) ? parsed.users : []
      };
    } catch (e) { console.error(e); }
  }
  return initialState;
};

export const LeadProvider = ({ children }) => {
  const [state, dispatch] = useReducer(leadReducer, loadInitialState());

  useEffect(() => {
    // Only persist auth-critical fields — leads/customers grow large and hit storage limits
    const toSave = {
      isAuthenticated: state.isAuthenticated,
      currentUser: state.currentUser,
      token: state.token,
      loginTimestamp: state.loginTimestamp,
      preferredCurrency: state.preferredCurrency,
    };
    try {
      localStorage.setItem('nexusCRM_State_v2', JSON.stringify(toSave));
    } catch (e) {
      // QuotaExceededError — session continues but won't survive a refresh
      console.warn('localStorage quota exceeded');
    }
  }, [state.isAuthenticated, state.currentUser, state.token, state.loginTimestamp, state.preferredCurrency]);

  return (
    <LeadContext.Provider value={{ state, dispatch }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => useContext(LeadContext);
export { ROLE_HIERARCHY };
