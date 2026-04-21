import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLeads } from '../context/LeadContext';
import {
  FiGrid, FiLayers, FiUsers, FiCalendar, FiBriefcase, FiSettings,
  FiChevronDown, FiChevronLeft, FiMenu, FiUser, FiInfo, FiClock, FiActivity
} from 'react-icons/fi';
import { ROLE_HIERARCHY } from '../context/LeadContext';
import './Sidebar.css';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/', level: 0 },
  { id: 'leads', label: 'Leads', icon: <FiLayers />, path: '/leads', level: 1 },
  { id: 'users', label: 'Users', icon: <FiUsers />, path: '/users', level: 5 },
  { id: 'customers', label: 'Contact', icon: <FiInfo />, path: '/customers', level: 1 },
  { id: 'scheduler', label: 'Scheduler', icon: <FiClock />, path: '/scheduler', level: 2 },
  { id: 'reports', label: 'Reports', icon: <FiBriefcase />, path: '/reports', level: 1 },
  { id: 'manage', label: 'Manage', icon: <FiSettings />, path: '#', level: 4, 
    subItems: [
      { label: 'Hotels', path: '/manage/hotels' },
      { label: 'Packages', path: '/manage/packages' }
    ] 
  },
];

const Sidebar = ({ isCollapsed, toggleSidebar, isMobileMenuOpen, closeMobileMenu }) => {
  const { state } = useLeads();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  
  const userRole = state.currentUser?.role || 'Viewer';
  const userLevel = ROLE_HIERARCHY[userRole] || 0;

  const handleSubmenuToggle = (id) => {
    if (isCollapsed) return;
    setOpenSubmenu(openSubmenu === id ? null : id);
  };

  const filteredMenu = menuItems.filter(item => userLevel >= item.level);

  return (
    <div className={`sidebar-red ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
         <span className="logo-text">Nexus<span className="highlight">CRM</span></span>
         <button className="toggle-btn" onClick={toggleSidebar}>
            {isCollapsed ? <FiMenu /> : <FiChevronLeft />}
         </button>
      </div>

      <nav className="sidebar-nav">
        {filteredMenu.map((item) => (
          <div key={item.id} className="nav-item-wrapper">
            {item.subItems ? (
              <>
                <div
                  className={`nav-item ${openSubmenu === item.id ? 'open' : ''}`}
                  onClick={() => handleSubmenuToggle(item.id)}
                >
                  <span className="icon">{item.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="label">{item.label}</span>
                      <FiChevronDown className={`chevron ${openSubmenu === item.id ? 'rotate' : ''}`} />
                    </>
                  )}
                </div>
                {!isCollapsed && openSubmenu === item.id && (
                  <div className="submenu">
                    {item.subItems.map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        onClick={() => window.innerWidth <= 1024 && closeMobileMenu()}
                        className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={() => window.innerWidth <= 1024 && closeMobileMenu()}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="icon">{item.icon}</span>
                {!isCollapsed && <span className="label">{item.label}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
