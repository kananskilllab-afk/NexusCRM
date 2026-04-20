import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLeads } from '../context/LeadContext';
import {
  FiGrid, FiUsers, FiBook, FiTruck, FiBarChart2,
  FiSend, FiSettings, FiChevronDown, FiChevronLeft, FiMenu,
  FiUserCheck, FiCalendar, FiPackage, FiLayers, FiActivity
} from 'react-icons/fi';
import './Sidebar.css';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/', roles: ['Admin', 'Sales Person', 'Accountant'] },
  {
    id: 'leads',
    label: 'Leads',
    icon: <FiUsers />,
    roles: ['Admin', 'Sales Person'],
    subItems: [
      { label: 'All Leads', path: '/leads' },
      { label: 'Hot Leads', path: '/leads?priority=Hot' },
      { label: 'Booked', path: '/leads?status=Booked' },
      { label: 'Lost', path: '/leads?status=Lost' }
    ]
  },
  { id: 'scheduler', label: 'Scheduler', icon: <FiCalendar />, path: '/scheduler', roles: ['Admin', 'Sales Person'] },
  { id: 'customers', label: 'Customers', icon: <FiBook />, path: '/customers', roles: ['Admin', 'Sales Person', 'Accountant'] },
  { id: 'suppliers', label: 'Suppliers', icon: <FiTruck />, path: '/suppliers', roles: ['Admin', 'Accountant'] },
  {
    id: 'manage',
    label: 'Manage',
    icon: <FiLayers />,
    roles: ['Admin'],
    subItems: [
      { label: 'Packages', path: '/manage/packages' },
      { label: 'Hotel Masters', path: '/manage/hotels' },
      { label: 'Templates', path: '/manage/templates' },
      { label: 'Tags', path: '/manage/tags' }
    ]
  },
  { id: 'users', label: 'Users', icon: <FiUserCheck />, path: '/users', roles: ['Admin'] },
  { id: 'reports', label: 'Reports', icon: <FiBarChart2 />, path: '/reports', roles: ['Admin', 'Accountant'] },
  { id: 'settings', label: 'Settings', icon: <FiSettings />, path: '/settings', roles: ['Admin'] }
];

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { state } = useLeads();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  
  const userRole = state.currentUser?.role || 'Admin';

  const handleSubmenuToggle = (id) => {
    if (isCollapsed) return;
    setOpenSubmenu(openSubmenu === id ? null : id);
  };

  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          {!isCollapsed && <span className="logo-text">Nexus <span className="highlight">CRM</span></span>}
        </div>
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
                  className={`nav-item ${openSubmenu === item.id ? 'active' : ''}`}
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
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="icon">{item.icon}</span>
                {!isCollapsed && <span className="label">{item.label}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar-sm"><FiUserCheck /></div>
            <div>
              <p className="user-name-sm">{state.currentUser?.name || 'Guest'}</p>
              <p className="user-role-sm">{state.currentUser?.role || 'Guest'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
