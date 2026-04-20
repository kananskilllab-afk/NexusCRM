import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="main-layout">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <div className={`content-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
        <TopNav />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
