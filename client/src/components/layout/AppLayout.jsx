import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useLeads } from '../../context/LeadContext';
import './AppLayout.css';

const AppLayout = ({ children, onQuickAdd }) => {
  const { state } = useLeads();
  const [isCollapsed, setIsCollapsed]   = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  const toggleMobile = () => setIsMobileOpen((p) => !p);
  const closeMobile  = () => setIsMobileOpen(false);

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
        <TopBar onQuickAdd={onQuickAdd} onMenuToggle={toggleMobile} />
        <main className="app-layout__page" id="main-content" tabIndex={-1}>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
