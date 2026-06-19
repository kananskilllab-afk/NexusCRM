import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useLeads } from '../../context/LeadContext';
import AddLeadModal from '../modals/AddLeadModal';
import { api } from '../../services/api';
import './AppLayout.css';

const AppLayout = ({ children, onQuickAdd }) => {
  const { state, dispatch } = useLeads();
  const [isCollapsed, setIsCollapsed]     = useState(false);
  const [isMobileOpen, setIsMobileOpen]   = useState(false);
  const [quickAddOpen, setQuickAddOpen]   = useState(false);

  /* Sync collapse/mobile state with viewport width */
  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setIsCollapsed(false);
      } else if (w >= 768) {
        setIsCollapsed(true);
        setIsMobileOpen(false);
      } else {
        setIsCollapsed(false);
        setIsMobileOpen(false);
      }
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const toggleMobile   = () => setIsMobileOpen((p) => !p);
  const closeMobile    = () => setIsMobileOpen(false);
  const handleQuickAdd = onQuickAdd ?? (() => setQuickAddOpen(true));
  const handleSaveLead = (data) =>
    api.createLead(data)
      .then(newLead => dispatch({ type: 'ADD_LEAD', payload: newLead }))
      .catch(console.error);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="app-layout__overlay"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <Sidebar
        unreadComms={state.unreadComms ?? 0}
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onMobileClose={closeMobile}
      />

      <div className={`app-layout__body${isCollapsed ? ' app-layout__body--collapsed' : ''}`}>
        <TopBar onQuickAdd={handleQuickAdd} onMenuToggle={toggleMobile} />
        <main className="app-layout__page" id="main-content" tabIndex={-1}>
          {children ?? <Outlet />}
        </main>
      </div>
      <AddLeadModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSave={handleSaveLead}
      />
    </div>
  );
};

export default AppLayout;
