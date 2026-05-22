import React, { createContext, useContext, useReducer } from 'react';

const VoyageContext = createContext();

const initialState = {
  // PRD State Slices
  authSlice: { user: null, tenant: null, role: null, permissions: [], sessionExpiry: null },
  uiSlice: { sidebarOpen: true, sidebarCollapsed: false, activeModal: null, toastQueue: [], commandPaletteOpen: false },
  navSlice: { expandedSections: [], breadcrumbs: [] },
  notificationSlice: { unreadCount: 0, notifications: [], lastFetched: null }
};

function voyageReducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, authSlice: { ...state.authSlice, ...action.payload } };
    case 'TOGGLE_SIDEBAR':
      return { ...state, uiSlice: { ...state.uiSlice, sidebarCollapsed: !state.uiSlice.sidebarCollapsed } };
    default:
      return state;
  }
}

export const VoyageProvider = ({ children }) => {
  const [state, dispatch] = useReducer(voyageReducer, initialState);
  return (
    <VoyageContext.Provider value={{ state, dispatch }}>
      {children}
    </VoyageContext.Provider>
  );
};

export const useVoyage = () => useContext(VoyageContext);
