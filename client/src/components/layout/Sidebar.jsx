import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiGrid, FiUsers, FiActivity, FiCalendar,
  FiFileText, FiDollarSign, FiPackage, FiMessageCircle,
  FiBarChart2, FiSettings, FiGlobe, FiLogOut,
  FiTarget, FiUser, FiClock, FiFolder, FiMail,
  FiClipboard, FiTrendingUp, FiLayers, FiMap,
} from 'react-icons/fi';
import { useLeads, ROLE_HIERARCHY } from '../../context/LeadContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',      icon: FiGrid,          path: '/',                    exact: true, level: 0 },
  { id: 'leads',         label: 'Leads',           icon: FiLayers,        path: '/leads',               level: 1 },
  { id: 'opportunities', label: 'Opportunities',   icon: FiTarget,        path: '/opportunities',       level: 1 },
  { id: 'customers',     label: 'Customers',       icon: FiUser,          path: '/customers',           level: 1 },
  { id: 'pipeline',      label: 'Pipeline',        icon: FiActivity,      path: '/pipeline',            level: 1 },
  { id: 'bookings',      label: 'Bookings',        icon: FiCalendar,      path: '/bookings',            level: 1 },
  { id: 'itineraries',  label: 'Itineraries',     icon: FiMap,           path: '/itineraries',         level: 1 },
  { id: 'quotes',       label: 'Quotes',           icon: FiFileText,      path: '/finance/quotes',      level: 1 },
  { id: 'invoices',      label: 'Invoices',        icon: FiDollarSign,    path: '/finance/invoices',    level: 1 },
  { id: 'commissions',   label: 'Commissions',     icon: FiTrendingUp,    path: '/finance/commissions', level: 2 },
  { id: 'documents',     label: 'Documents',       icon: FiFolder,        path: '/documents',           level: 1 },
  { id: 'emails',        label: 'Emails',          icon: FiMail,          path: '/emails',              level: 1 },
  { id: 'contracts',     label: 'Contracts',       icon: FiClipboard,     path: '/supplier-contracts',  level: 2 },
  { id: 'suppliers',     label: 'Suppliers',       icon: FiPackage,       path: '/suppliers',           level: 3 },
  { id: 'scheduler',     label: 'Scheduler',       icon: FiClock,         path: '/scheduler',           level: 2 },
  { id: 'comms',         label: 'Communications',  icon: FiMessageCircle, path: '/comms',               level: 1, badge: true },
  { id: 'reports',       label: 'Reports',         icon: FiBarChart2,     path: '/reports',             level: 1 },
  { id: 'users',         label: 'Users',           icon: FiUsers,         path: '/users',               level: 5 },
  { id: 'settings',      label: 'Settings',        icon: FiSettings,      path: '/settings',            level: 3 },
];

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const Sidebar = ({
  unreadComms  = 0,
  isCollapsed  = false,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();

  const user      = state.currentUser ?? {};
  const userLevel = ROLE_HIERARCHY[user.role] ?? 0;

  const visibleItems = NAV_ITEMS.filter((item) => userLevel >= item.level);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  return (
    <aside
      className={
        `app-sidebar` +
        (isCollapsed  ? ' app-sidebar--collapsed'    : '') +
        (isMobileOpen ? ' app-sidebar--open'         : '')
      }
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo__icon" aria-hidden="true">
          <FiGlobe />
        </div>
        {!isCollapsed && (
          <div>
            <div className="sidebar-logo__name">Kanan Travel</div>
            <div className="sidebar-logo__sub">CRM</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {!isCollapsed && (
          <span className="sidebar-nav__section-label">Menu</span>
        )}

        {visibleItems.map((item) => {
          const Icon  = item.icon;
          const count = item.badge ? unreadComms : 0;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `sidebar-nav__item${isActive ? ' active' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
              aria-label={isCollapsed ? item.label : undefined}
              onClick={onMobileClose}
            >
              <span className="sidebar-nav__item__icon"><Icon /></span>

              {!isCollapsed && (
                <>
                  <span className="sidebar-nav__item__label">{item.label}</span>
                  {count > 0 && (
                    <span className="sidebar-badge" aria-label={`${count} unread`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </>
              )}

              {isCollapsed && count > 0 && (
                <span className="sidebar-badge sidebar-badge--dot" aria-hidden="true" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="sidebar-user">
        <div
          className="sidebar-user__avatar"
          aria-hidden="true"
          title={user.name}
        >
          {initials(user.name) || '?'}
        </div>
        {!isCollapsed && (
          <div className="sidebar-user__info">
            <div className="sidebar-user__name">{user.name || 'User'}</div>
            <div className="sidebar-user__role">{user.role || 'Viewer'}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          aria-label="Sign out"
          className="sidebar-logout-btn"
        >
          <FiLogOut size={15} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
