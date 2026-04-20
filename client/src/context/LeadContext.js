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

/* ── Seed Data ── */
const initialState = {
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
      booking_date: '', 
      created_at: new Date().toISOString(),
      activities: [{ id: 'act-1', date: new Date().toISOString(), text: 'Lead created via Website', user: 'System' }],
      notes: [{ id: 'n-1', text: 'Client interested in 4-star hotels near Marina', date: new Date().toISOString(), user: 'Bhargav' }],
      reminders: [{ id: 'r-1', text: 'Follow up on hotel preferences', date: new Date(Date.now() + 86400000).toISOString(), done: false }],
      files: [],
      travellers: [
        { id: 't-1', name: 'Rajesh Kumar', type: 'Adult', passport: 'P1234567', dob: '1988-03-15' },
        { id: 't-2', name: 'Priya Kumar', type: 'Adult', passport: 'P7654321', dob: '1990-07-22' },
        { id: 't-3', name: 'Aryan Kumar', type: 'Child', passport: 'P9876543', dob: '2018-11-05' }
      ],
      followUps: [{ id: 'f-1', date: new Date().toISOString(), method: 'Phone', notes: 'Discussed Dubai itinerary options', outcome: 'Interested', nextDate: new Date(Date.now() + 172800000).toISOString() }],
      assignedSuppliers: [],
      bookings: [],
      billing: {
        items: [{ id: 1, description: 'Dubai Holiday Package (7N/8D)', qty: 1, price: 85000, tax: 5 }],
        payments: [{ id: 'pay-1', amount: 25000, date: new Date().toISOString(), method: 'Bank Transfer', reference: 'TXN-001', note: 'Advance payment' }],
        paymentSchedule: [
          { id: 'ps-1', dueDate: new Date(Date.now() + 604800000).toISOString(), amount: 35000, status: 'Pending', reminderSent: false },
          { id: 'ps-2', dueDate: new Date(Date.now() + 1209600000).toISOString(), amount: 29250, status: 'Pending', reminderSent: false }
        ]
      },
      enquiry_data: {
        flight: { origin: 'DEL', destination: 'DXB', class: 'Economy', departure: '2026-05-10', return: '2026-05-17' },
        hotel: { city: 'Dubai Marina', stars: '4', checkin: '2026-05-10', checkout: '2026-05-17', rooms: 2, mealPlan: 'Breakfast' }
      },
      communications: [
        { id: 'c-1', type: 'Email', template: 'Welcome Email', sentAt: new Date().toISOString(), status: 'Delivered', to: 'rajesh@example.com' },
        { id: 'c-2', type: 'WhatsApp', template: 'Itinerary Share', sentAt: new Date(Date.now() - 3600000).toISOString(), status: 'Read', to: '9876543210' }
      ],
      currency: 'INR',
      exchangeRate: 1
    },
    {
      id: 'L-1002',
      first_name: 'Anita', last_name: 'Singh',
      mobile: '9988776655', email: 'anita.singh@gmail.com',
      status: 'Working', priority: 'Normal',
      no_adults: 4, no_children: 2,
      destination: 'Maldives',
      enquiry_types: ['Package', 'Visa'],
      lead_source: 'Referral',
      assigned_to: 'Priya',
      travel_start_date: '2026-06-15', travel_end_date: '2026-06-22',
      booking_date: '',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      activities: [{ id: 'act-2', date: new Date(Date.now() - 86400000).toISOString(), text: 'Lead created via Referral', user: 'System' }],
      notes: [], reminders: [], files: [], travellers: [],
      followUps: [], assignedSuppliers: [], bookings: [],
      billing: { items: [], payments: [], paymentSchedule: [] },
      enquiry_data: {},
      communications: [],
      currency: 'INR', exchangeRate: 1
    },
    {
      id: 'L-1003',
      first_name: 'Vikram', last_name: 'Seth',
      mobile: '8877665544', email: 'vikram@seth.co',
      status: 'Proposal Sent', priority: 'Hot',
      no_adults: 2, no_children: 0,
      destination: 'Switzerland',
      enquiry_types: ['Flight', 'Hotel', 'Visa'],
      lead_source: 'Facebook Ad',
      assigned_to: 'Bhargav',
      travel_start_date: '2026-07-01', travel_end_date: '2026-07-10',
      booking_date: '',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      activities: [
        { id: 'act-3', date: new Date(Date.now() - 172800000).toISOString(), text: 'Lead created via Facebook Ad', user: 'System' },
        { id: 'act-4', date: new Date(Date.now() - 86400000).toISOString(), text: 'Status changed to Working', user: 'Bhargav' },
        { id: 'act-5', date: new Date().toISOString(), text: 'Proposal sent via Email', user: 'Bhargav' }
      ],
      notes: [{ id: 'n-2', text: 'Wants luxury experience, budget ~3L', date: new Date().toISOString(), user: 'Bhargav' }],
      reminders: [], files: [],
      travellers: [
        { id: 't-4', name: 'Vikram Seth', type: 'Adult', passport: 'Q1122334', dob: '1985-01-20' },
        { id: 't-5', name: 'Meera Seth', type: 'Adult', passport: 'Q4433221', dob: '1987-09-10' }
      ],
      followUps: [], assignedSuppliers: [], bookings: [],
      billing: {
        items: [
          { id: 2, description: 'Zurich–Interlaken–Lucerne Tour', qty: 1, price: 280000, tax: 5 },
          { id: 3, description: 'Swiss Schengen Visa x2', qty: 2, price: 5500, tax: 18 }
        ],
        payments: [], paymentSchedule: []
      },
      enquiry_data: {
        flight: { origin: 'BOM', destination: 'ZRH', class: 'Business', departure: '2026-07-01', return: '2026-07-10' },
        hotel: { city: 'Interlaken', stars: '5', checkin: '2026-07-01', checkout: '2026-07-10', rooms: 1, mealPlan: 'Half Board' },
        visa: { country: 'Switzerland', type: 'Tourist', processingDays: 15 }
      },
      communications: [],
      currency: 'INR', exchangeRate: 1
    }
  ],

  suppliers: [
    { id: 'S-001', name: 'Skyline Hotels LLC', type: 'Hotel', contact: 'Ahmed Al Rashid', phone: '+971501234567', email: 'bookings@skylinehotels.ae', gst: '29AABCS1234F1Z5', paymentTerms: 'Net 30', creditLimit: 500000, balance: 125000, currency: 'AED', services: ['Hotel'], rating: 4.5, status: 'Active' },
    { id: 'S-002', name: 'EagleWings Aviation', type: 'Flight Consolidator', contact: 'Sanjay Mehta', phone: '9811234567', email: 'ops@eaglewings.in', gst: '07AABCE5678F1Z8', paymentTerms: 'Prepaid', creditLimit: 200000, balance: 0, currency: 'INR', services: ['Flight'], rating: 4.0, status: 'Active' },
    { id: 'S-003', name: 'Swift Visa Services', type: 'Visa Agency', contact: 'Fatima Khan', phone: '9922334455', email: 'apply@swiftvisa.com', gst: '27AABCV9012F1Z1', paymentTerms: 'Net 15', creditLimit: 100000, balance: 22000, currency: 'INR', services: ['Visa'], rating: 4.8, status: 'Active' },
    { id: 'S-004', name: 'Desert Safari Adventures', type: 'Activity Provider', contact: 'Omar Hassan', phone: '+971559876543', email: 'book@desertsafari.ae', gst: '', paymentTerms: 'Prepaid', creditLimit: 75000, balance: 0, currency: 'AED', services: ['Activity', 'Transport'], rating: 4.2, status: 'Active' }
  ],

  customers: [
    { id: 'C-001', name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '9876543210', totalBookings: 1, totalSpent: 85000, lastTrip: 'Dubai', status: 'Active' },
    { id: 'C-002', name: 'Vikram Seth', email: 'vikram@seth.co', phone: '8877665544', totalBookings: 0, totalSpent: 0, lastTrip: '-', status: 'Prospect' }
  ],

  bookings: [
    { id: 'B-001', leadId: 'L-1001', serviceType: 'Package', supplier: 'S-001', status: 'Confirmed', totalAmount: 85000, bookingDate: new Date().toISOString(), travelDate: '2026-05-10', cancellationPolicy: 'Free cancellation up to 7 days before', amendments: [], refunds: [] }
  ],

  auditLog: [],
  statusTransitions: STATUS_TRANSITIONS,
  bookingStatuses: BOOKING_STATUSES,

  currencyRates: {
    INR: 1, USD: 83.50, AED: 22.73, EUR: 90.10, GBP: 105.20, THB: 2.35
  },

  /* ── Users & Roles ── */
  users: [
    { id: 'U-001', name: 'Bhargav', email: 'bhargav@example.com', role: 'Admin', status: 'Active' },
    { id: 'U-002', name: 'Priya', email: 'priya@example.com', role: 'Sales Person', status: 'Active' },
    { id: 'U-003', name: 'Ravi', email: 'ravi@example.com', role: 'Accountant', status: 'Active' }
  ],
  currentUser: { id: 'U-001', name: 'Bhargav', role: 'Admin' },

  /* ── Real Notifications ── */
  notifications: [
    { id: 'n-1', title: 'New Lead Assigned', message: 'Lead L-1004 has been assigned to you', type: 'info', read: false, time: new Date().toISOString() },
    { id: 'n-2', title: 'Follow-up Overdue', message: 'Follow-up with Rajesh Kumar is pending', type: 'warning', read: false, time: new Date(Date.now() - 3600000).toISOString() }
  ],

  /* ── Master Data ── */
  packages: [
    { id: 'PKG-001', name: 'Luxury Dubai Getaway', days: 7, price: 125000, inclusions: '5* Hotel, Desert Safari, Burj Khalifa Tickets' }
  ],
  hotelsMaster: [
    { id: 'H-001', name: 'Atlantis The Palm', city: 'Dubai', star: '5' },
    { id: 'H-002', name: 'Burj Al Arab', city: 'Dubai', star: '5' }
  ],

  /* ── Operational Log ── */
  staffTargets: [
    { userId: 'Bhargav', month: 'April 2026', targetBookings: 15, targetRevenue: 1500000, achievedBookings: 3, achievedRevenue: 365000 },
    { userId: 'Priya', month: 'April 2026', targetBookings: 10, targetRevenue: 1000000, achievedBookings: 1, achievedRevenue: 120000 }
  ],

  exportLog: [],
  auditLog: [],

  cancellationPolicies: [
    { serviceType: 'Hotel', daysBeforeDeparture: 7, penaltyPercent: 0 },
    { serviceType: 'Hotel', daysBeforeDeparture: 3, penaltyPercent: 50 },
    { serviceType: 'Hotel', daysBeforeDeparture: 0, penaltyPercent: 100 }
  ]
};

/* ── Reducer ── */
function leadReducer(state, action) {
  const logAudit = (act, table, recordId, details) => ({
    id: `audit-${Date.now()}`, user: state.currentUser.name, action: act, table, recordId, details, timestamp: new Date().toISOString()
  });

  const pushNotify = (title, message, type = 'info') => ({
    id: `notif-${Date.now()}`, title, message, type, read: false, time: new Date().toISOString()
  });

  switch (action.type) {
    /* ── AUTH & USER ── */
    case 'SWITCH_USER':
      return { ...state, currentUser: action.payload };

    case 'ADD_USER':
      return { ...state, users: [...state.users, { ...action.payload, id: `U-${Date.now()}` }] };

    /* ── NOTIFICATIONS ── */
    case 'MARK_NOTIF_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n)
      };
    
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'ADD_LEAD': {
      // Duplicate detection
      const dupe = state.leads.find(l =>
        l.mobile === action.payload.mobile && l.email === action.payload.email
      );
      const newLead = { ...action.payload, isDuplicate: !!dupe, duplicateOf: dupe?.id || null };
      return {
        ...state,
        leads: [...state.leads, newLead],
        auditLog: [logAudit('CREATE', 'leads', newLead.id, `Lead created: ${newLead.first_name} ${newLead.last_name}`), ...state.auditLog]
      };
    }

    case 'UPDATE_LEAD':
      return {
        ...state,
        leads: state.leads.map(l => l.id === action.payload.id ? { ...l, ...action.payload.data } : l),
        auditLog: [logAudit('UPDATE', 'leads', action.payload.id, `Lead updated`), ...state.auditLog]
      };

    case 'UPDATE_LEAD_STATUS': {
      const lead = state.leads.find(l => l.id === action.payload.id);
      if (!lead) return state;
      const allowed = STATUS_TRANSITIONS[lead.status] || [];
      if (!allowed.includes(action.payload.status) && action.payload.status !== lead.status) {
        return state; // block invalid transition
      }
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.id
            ? {
                ...l,
                status: action.payload.status,
                booking_date: action.payload.status === 'Booked' ? new Date().toISOString() : l.booking_date,
                activities: [
                  { id: `act-${Date.now()}`, date: new Date().toISOString(), text: `Status changed from ${l.status} to ${action.payload.status}`, user: 'Admin' },
                  ...l.activities
                ]
              }
            : l
        ),
        auditLog: [logAudit('STATUS_CHANGE', 'leads', action.payload.id, `${lead.status} → ${action.payload.status}`), ...state.auditLog]
      };
    }

    /* ── NOTES ── */
    case 'ADD_NOTE':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, notes: [{ id: `n-${Date.now()}`, ...action.payload.note, date: new Date().toISOString() }, ...l.notes] }
            : l
        )
      };

    /* ── REMINDERS ── */
    case 'ADD_REMINDER':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, reminders: [...l.reminders, { id: `r-${Date.now()}`, ...action.payload.reminder, done: false }] }
            : l
        )
      };

    case 'TOGGLE_REMINDER':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, reminders: l.reminders.map(r => r.id === action.payload.reminderId ? { ...r, done: !r.done } : r) }
            : l
        )
      };

    /* ── FILES ── */
    case 'ADD_FILES':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, files: [...action.payload.files, ...l.files] }
            : l
        )
      };

    case 'REMOVE_FILE':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, files: l.files.filter(f => f.id !== action.payload.fileId) }
            : l
        )
      };

    /* ── TRAVELLERS ── */
    case 'ADD_TRAVELLER':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, travellers: [...l.travellers, { id: `t-${Date.now()}`, ...action.payload.traveller }] }
            : l
        )
      };

    case 'REMOVE_TRAVELLER':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, travellers: l.travellers.filter(t => t.id !== action.payload.travellerId) }
            : l
        )
      };

    /* ── FOLLOW UPS ── */
    case 'ADD_FOLLOWUP':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? {
                ...l,
                followUps: [...l.followUps, { id: `f-${Date.now()}`, ...action.payload.followUp, date: new Date().toISOString() }],
                activities: [{ id: `act-${Date.now()}`, date: new Date().toISOString(), text: `Follow-up recorded: ${action.payload.followUp.method}`, user: 'Admin' }, ...l.activities]
              }
            : l
        )
      };

    /* ── BILLING ── */
    case 'UPDATE_BILLING':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, billing: { ...l.billing, ...action.payload.billingData } }
            : l
        )
      };

    case 'ADD_PAYMENT':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? {
                ...l,
                billing: { ...l.billing, payments: [...l.billing.payments, { id: `pay-${Date.now()}`, ...action.payload.payment, date: new Date().toISOString() }] },
                activities: [{ id: `act-${Date.now()}`, date: new Date().toISOString(), text: `Payment received: ₹${action.payload.payment.amount}`, user: 'Admin' }, ...l.activities]
              }
            : l
        )
      };

    /* ── COMMUNICATION LOG ── */
    case 'LOG_COMMUNICATION':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, communications: [{ id: `comm-${Date.now()}`, ...action.payload.comm, sentAt: new Date().toISOString() }, ...l.communications] }
            : l
        )
      };

    /* ── ACTIVITIES ── */
    case 'ADD_ACTIVITY':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? { ...l, activities: [{ id: `act-${Date.now()}`, ...action.payload.activity, date: new Date().toISOString() }, ...l.activities] }
            : l
        )
      };

    /* ── ASSIGN SUPPLIER TO LEAD ── */
    case 'ASSIGN_SUPPLIER':
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.leadId
            ? {
                ...l,
                assignedSuppliers: [...l.assignedSuppliers, { supplierId: action.payload.supplierId, serviceType: action.payload.serviceType, rate: action.payload.rate, notes: action.payload.notes }],
                activities: [{ id: `act-${Date.now()}`, date: new Date().toISOString(), text: `Supplier assigned: ${action.payload.supplierName} for ${action.payload.serviceType}`, user: 'Admin' }, ...l.activities]
              }
            : l
        )
      };

    /* ── BOOKINGS ── */
    case 'ADD_BOOKING':
      return {
        ...state,
        bookings: [...state.bookings, { id: `B-${String(state.bookings.length + 1).padStart(3, '0')}`, ...action.payload, bookingDate: new Date().toISOString(), amendments: [], refunds: [] }],
        auditLog: [logAudit('CREATE', 'bookings', `B-${String(state.bookings.length + 1).padStart(3, '0')}`, `Booking created for lead ${action.payload.leadId}`), ...state.auditLog]
      };

    case 'UPDATE_BOOKING_STATUS':
      return {
        ...state,
        bookings: state.bookings.map(b =>
          b.id === action.payload.bookingId
            ? { ...b, status: action.payload.status }
            : b
        ),
        auditLog: [logAudit('STATUS_CHANGE', 'bookings', action.payload.bookingId, `Booking status → ${action.payload.status}`), ...state.auditLog]
      };

    case 'ADD_REFUND':
      return {
        ...state,
        bookings: state.bookings.map(b =>
          b.id === action.payload.bookingId
            ? { ...b, refunds: [...b.refunds, { id: `ref-${Date.now()}`, ...action.payload.refund, processedAt: new Date().toISOString() }] }
            : b
        )
      };

    /* ── SUPPLIERS ── */
    case 'ADD_SUPPLIER':
      return {
        ...state,
        suppliers: [...state.suppliers, { id: `S-${String(state.suppliers.length + 1).padStart(3, '0')}`, ...action.payload, status: 'Active' }],
        auditLog: [logAudit('CREATE', 'suppliers', `S-${String(state.suppliers.length + 1).padStart(3, '0')}`, `Supplier added: ${action.payload.name}`), ...state.auditLog]
      };

    case 'UPDATE_SUPPLIER':
      return {
        ...state,
        suppliers: state.suppliers.map(s => s.id === action.payload.id ? { ...s, ...action.payload.data } : s)
      };

    /* ── CUSTOMERS ── */
    case 'ADD_CUSTOMER':
      return {
        ...state,
        customers: [...state.customers, { id: `C-${String(state.customers.length + 1).padStart(3, '0')}`, ...action.payload, status: 'Active' }]
      };

    /* ── EXPORT LOG ── */
    case 'LOG_EXPORT':
      return {
        ...state,
        exportLog: [{ id: `exp-${Date.now()}`, user: 'Admin', type: action.payload.type, count: action.payload.count, timestamp: new Date().toISOString() }, ...state.exportLog]
      };

    default:
      return state;
  }
}

const loadInitialState = () => {
  const saved = localStorage.getItem('nexusCRM_State');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge with current default structure to handle updates
      return { ...initialState, ...parsed };
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    }
  }
  return initialState;
};

export const LeadProvider = ({ children }) => {
  const [state, dispatch] = useReducer(leadReducer, loadInitialState());

  useEffect(() => {
    localStorage.setItem('nexusCRM_State', JSON.stringify(state));
  }, [state]);

  return (
    <LeadContext.Provider value={{ state, dispatch }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => {
  const context = useContext(LeadContext);
  if (!context) throw new Error('useLeads must be used within a LeadProvider');
  return context;
};
