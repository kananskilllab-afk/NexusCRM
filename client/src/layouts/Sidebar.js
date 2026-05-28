import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLeads } from '../context/LeadContext';
import {
  FiGrid, FiLayers, FiUsers, FiCalendar, FiBriefcase, FiSettings,
  FiChevronDown, FiChevronLeft, FiMenu, FiUser, FiInfo, FiClock, FiActivity, FiDollarSign, FiMessageCircle,
  FiFolder, FiMail, FiFileText
} from 'react-icons/fi';
import { ROLE_HIERARCHY } from '../context/LeadContext';
import './Sidebar.css';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/', level: 0 },
  { id: 'pipeline', label: 'Pipeline', icon: <FiActivity />, path: '/pipeline', level: 1 },
  { id: 'bookings', label: 'Bookings', icon: <FiBriefcase />, path: '/bookings', level: 1 },
  { id: 'leads', label: 'Leads', icon: <FiLayers />, path: '/leads', level: 1 },
  { id: 'users', label: 'Users', icon: <FiUsers />, path: '/users', level: 5 },
  { id: 'customers', label: 'Contact', icon: <FiInfo />, path: '/customers', level: 1 },
  { id: 'scheduler', label: 'Scheduler', icon: <FiClock />, path: '/scheduler', level: 2 },
  { id: 'reports', label: 'Reports', icon: <FiBriefcase />, path: '/reports', level: 1 },
  { id: 'finance', label: 'Finance', icon: <FiDollarSign />, path: '#', level: 1, 
    subItems: [
      { label: 'Quotes', path: '/finance/quotes' },
      { label: 'Invoices', path: '/finance/invoices' },
      { label: 'Commissions', path: '/finance/commissions' }
    ] 
  },
  { id: 'documents', label: 'Documents', icon: <FiFolder />, path: '/documents', level: 1 },
  { id: 'emails', label: 'Emails', icon: <FiMail />, path: '/emails', level: 1 },
  { id: 'contracts', label: 'Contracts', icon: <FiFileText />, path: '/supplier-contracts', level: 2 },
  { id: 'comms', label: 'Inbox', icon: <FiMessageCircle />, path: '/comms', level: 1 },
  { id: 'manage', label: 'Manage', icon: <FiSettings />, path: '#', level: 4, 
    subItems: [
      { label: 'Hotels', path: '/manage/hotels' },
      { label: 'Packages', path: '/manage/packages' },
      { label: 'System Settings', path: '/settings' }
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
    <div className={`sidebar-brand ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
         {!isCollapsed && (
           <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0 10px' }}>
             <img src="/logo.png" alt="Kanan Travel CRM" style={{ maxWidth: '100%', height: 'auto', maxHeight: '45px', objectFit: 'contain' }} />
           </div>
         )}
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
