import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiPlus, FiUser, FiInfo, FiEdit, FiClock } from 'react-icons/fi';
import AddLeadModal from './AddLeadModal';
import StickyNotes from './StickyNotes';
import { useLeads } from '../context/LeadContext';
import './TopNav.css';

const TopNav = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();

  const unreadCount = state.notifications?.filter(n => !n.read).length || 0;

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      navigate(`/leads?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  const handleAddLead = (newData) => {
    const newLead = {
      ...newData,
      id: `L-${1000 + state.leads.length + 1}`,
      status: 'New',
      created_at: new Date().toISOString(),
      activities: [{ id: `act-${Date.now()}`, date: new Date().toISOString(), text: `Lead created via Quick Add`, user: state.currentUser.name }],
      notes: [], reminders: [], files: [], travellers: [],
      followUps: [], assignedSuppliers: [], bookings: [],
      billing: { items: [], payments: [], paymentSchedule: [] },
      enquiry_data: newData.enquiry_data || {},
      communications: []
    };
    dispatch({ type: 'ADD_LEAD', payload: newLead });
    navigate(`/leads/${newLead.id}`);
  };

  return (
    <header className="top-nav">
      <div className="search-container">
        <FiSearch className="search-icon" />
        <input 
          type="text" 
          placeholder="Search leads, customers, or bookings..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      <div className="right-controls">
        <button className="nav-tool-btn" title="Sticky Notes" onClick={() => setShowNotes(!showNotes)}>
          <FiEdit />
        </button>
        <button className="nav-tool-btn" title="Visa Info" onClick={() => navigate('/reports')}>
          <FiInfo />
        </button>
        
        <button className="quick-add-btn" onClick={() => setIsModalOpen(true)}>
          <FiPlus />
          <span>Quick Add</span>
        </button>
        
        <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddLead} />
        <StickyNotes isOpen={showNotes} onClose={() => setShowNotes(false)} />

        <div className="notification-wrapper">
          <div className="notification-badge" onClick={() => setShowNotifs(!showNotifs)}>
            <FiBell />
            {unreadCount > 0 && <span className="count">{unreadCount}</span>}
          </div>
          {showNotifs && (
            <div className="notification-dropdown card">
              <div className="notif-header">
                <h3>Notifications</h3>
                <button className="btn-text" onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}>Clear All</button>
              </div>
              <div className="notif-list">
                {state.notifications?.length > 0 ? state.notifications.map(n => (
                  <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`} onClick={() => dispatch({ type: 'MARK_NOTIF_READ', payload: n.id })}>
                    <div className={`notif-icon ${n.type}`}><FiClock /></div>
                    <div className="notif-body">
                      <p className="notif-title">{n.title}</p>
                      <p className="notif-msg">{n.message}</p>
                      <span className="notif-time">{new Date(n.time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                )) : <p className="empty-notif" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No new notifications</p>}
              </div>
            </div>
          )}
        </div>

        <div className="user-profile-wrapper">
          <div className="user-profile" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar"><FiUser /></div>
            <div className="user-info">
              <span className="user-name">{state.currentUser?.name || 'Guest'}</span>
              <span className="user-role">{state.currentUser?.role || 'Guest'}</span>
            </div>
          </div>
          {showUserMenu && (
            <div className="user-menu-dropdown card">
              <div className="menu-header">Switch Role / User</div>
              {(state.users || []).map(u => (
                <div key={u.id} className={`menu-item ${u.id === (state.currentUser?.id || '') ? 'active' : ''}`} onClick={() => { dispatch({ type: 'SWITCH_USER', payload: u }); setShowUserMenu(false); navigate('/dashboard'); }}>
                  <strong>{u.name}</strong>
                  <span>{u.role}</span>
                </div>
              ))}
              <div className="menu-divider"></div>
              <div className="menu-item logout" onClick={() => window.location.reload()}>Logout</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;
