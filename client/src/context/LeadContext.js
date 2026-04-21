import React, { createContext, useContext, useReducer, useEffect } from 'react';

const LeadContext = createContext();

/* ── Status Workflow: defines allowed transitions ── */
const STATUS_TRANSITIONS = {
  'Unqualified': ['New', 'Lost'],
  'New': ['Working', 'Lost', 'Unqualified'],
  'Working': ['Proposal Sent', 'Lost', 'New'],
  'Proposal Sent': ['Negotiating', 'Working', 'Lost'],
  'Negotiating': ['Booked', 'Proposal Sent', 'Lost'],
  'Booked': ['Lost'],
  'Lost': ['New', 'Working']
};

const BOOKING_STATUSES = ['Confirmed', 'Ticketed', 'Vouchered', 'Amended', 'Cancelled', 'Refunded'];

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
  preferredCurrency: 'INR',
  users: [
    { id: 'U-001', name: 'SuperUser', email: 'superadmin@nexus.com', password: 'nexus123', role: 'Super Admin', status: 'Active' },
    { id: 'U-002', name: 'Bhargav', email: 'admin@nexus.com', password: 'nexus123', role: 'Admin', status: 'Active' },
    { id: 'U-003', name: 'Priya', email: 'ops@nexus.com', password: 'nexus123', role: 'Ops Staff', status: 'Active' },
    { id: 'U-004', name: 'Ravi', email: 'accounts@nexus.com', password: 'nexus123', role: 'Accountant', status: 'Active' },
    { id: 'U-005', name: 'Manager', email: 'manager@nexus.com', password: 'nexus123', role: 'Ops Manager', status: 'Active' }
  ],
  supplierRates: [
    { id: 'R-001', supplierId: 'S-001', service: 'Hotel', details: 'Deluxe Room', rate: 4500, currency: 'INR' },
    { id: 'R-002', supplierId: 'S-002', service: 'Hotel', details: 'Deluxe Room', rate: 4200, currency: 'INR' },
    { id: 'R-003', supplierId: 'S-003', service: 'Flight', details: 'Economy Return', rate: 12000, currency: 'INR' },
    { id: 'R-004', supplierId: 'S-001', service: 'Transport', details: 'Private AC Sedan', rate: 2500, currency: 'INR' }
  ],
  leads: [
    {
      id: 'L-1001',
      first_name: 'Rajesh', last_name: 'Kumar',
      mobile: '9876543210', email: 'rajesh@example.com',
      status: 'New', priority: 'Hot',
      no_adults: 2, no_children: 1,
      destination: 'Dubai',
      enquiry_types: ['Flight', 'Hotel'],
      lead_source: 'Website',
      assigned_to: 'Bhargav',
      travel_start_date: '2026-05-10', travel_end_date: '2026-05-17',
      created_at: new Date().toISOString(),
      activities: [{ id: 'act-1', date: new Date().toISOString(), text: 'Lead created via Website', user: 'System' }],
      followUps: [{ id: 'f-1', date: new Date().toISOString(), method: 'Phone', notes: 'Discussed Dubai itinerary options', outcome: 'Interested', nextDate: new Date(Date.now() + 172800000).toISOString() }],
      assignedSuppliers: [],
      bookings: [],
      billing: {
        items: [{ id: 1, description: 'Dubai Holiday Package (7N/8D)', qty: 1, price: 85000, tax: 5 }],
        payments: [{ id: 'pay-1', amount: 25000, date: new Date().toISOString(), method: 'Bank Transfer', reference: 'TXN-001', note: 'Advance payment' }],
        paymentSchedule: []
      },
      enquiry_data: { flight: {}, hotel: {} },
      communications: []
    }
    // ... add more seed leads to make dashboard look "working"
  ],
  notifications: [],
  suppliers: [],
  customers: [],
  bookings: [],
  auditLog: [],
  exportLog: [],
  statusTransitions: STATUS_TRANSITIONS
};

function leadReducer(state, action) {
  const logAudit = (act, table, recordId, details) => ({
    id: `audit-${Date.now()}`, user: state.currentUser?.name || 'System', action: act, table, recordId, details, timestamp: new Date().toISOString()
  });

  switch (action.type) {
    case 'LOGIN':
      return { 
        ...state, 
        isAuthenticated: true, 
        currentUser: action.payload, 
        loginTimestamp: Date.now() 
      };
    case 'LOGOUT':
      return { 
        ...state, 
        isAuthenticated: false, 
        currentUser: null, 
        loginTimestamp: null 
      };
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
        users: initialState.users, 
        isAuthenticated: false,
        currentUser: null 
      };
    } catch (e) { console.error(e); }
  }
  return initialState;
};

export const LeadProvider = ({ children }) => {
  const [state, dispatch] = useReducer(leadReducer, loadInitialState());

  useEffect(() => {
    localStorage.setItem('nexusCRM_State_v2', JSON.stringify(state));
  }, [state]);

  return (
    <LeadContext.Provider value={{ state, dispatch }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => useContext(LeadContext);
export { ROLE_HIERARCHY };
