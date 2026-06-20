import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiBell, FiLogOut, FiMenu, FiCheck
} from 'react-icons/fi';
import { useLeads } from '../context/LeadContext';
import { api } from '../services/api';
import './TopNav.css';

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const TopNav = ({ toggleMobileMenu }) => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogoutClick = (e) => {
    e.stopPropagation();
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  const refreshCount = useCallback(async () => {
    if (!state.isAuthenticated) return;
    try { const { unread } = await api.getUnreadCount(); setUnread(unread || 0); }
    catch (e) { /* ignore transient errors */ }
  }, [state.isAuthenticated]);

  // Poll the unread badge every 60s.
  useEffect(() => {
    if (!state.isAuthenticated) return;
    refreshCount();
    const t = setInterval(refreshCount, 60000);
    return () => clearInterval(t);
  }, [state.isAuthenticated, refreshCount]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClick = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const togglePanel = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try { const { items, unread } = await api.getNotifications(); setItems(items || []); setUnread(unread || 0); }
      catch (e) { setItems([]); }
    }
  };

  const openItem = async (n) => {
    try { if (!n.is_read) await api.markNotificationRead(n.id); } catch (e) { /* ignore */ }
    setOpen(false);
    refreshCount();
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try { await api.markAllNotificationsRead(); } catch (e) { /* ignore */ }
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  return (
    <header className="top-nav-utility">
      <div className="nav-left-section">
        <button className="mobile-toggle-btn" onClick={toggleMobileMenu}>
          <FiMenu />
        </button>
        <div className="search-box-minimal">
           <FiSearch />
           <input type="text" placeholder="Search leads..." />
        </div>
      </div>

      <div className="nav-right-section">
         <div ref={panelRef} style={{ position: 'relative' }}>
            <div className="notif-icon-btn" onClick={togglePanel} style={{ cursor: 'pointer' }}>
               <FiBell />
               {unread > 0 && (
                 <span className="dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, borderRadius: 8, fontSize: 10, color: 'white', padding: '0 4px' }}>
                   {unread > 9 ? '9+' : unread}
                 </span>
               )}
            </div>

            {open && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 360, maxHeight: 440, overflowY: 'auto', background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 1000, border: '1px solid var(--border-color, #eee)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border-color, #eee)' }}>
                  <strong>Notifications</strong>
                  {unread > 0 && (
                    <button onClick={markAll} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <FiCheck /> Mark all read
                    </button>
                  )}
                </div>
                {items.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #888)', fontSize: '0.85rem' }}>You're all caught up.</div>
                ) : (
                  items.map((n) => (
                    <div key={n.id} onClick={() => openItem(n)}
                      style={{ padding: '12px 14px', borderBottom: '1px solid #f4f4f4', cursor: 'pointer', background: n.is_read ? 'white' : '#F5F9FF' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.title}</span>
                        <span style={{ fontSize: '0.7rem', color: '#999', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</span>
                      </div>
                      {n.message && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #666)', marginTop: 2 }}>{n.message}</div>}
                    </div>
                  ))
                )}
              </div>
            )}
         </div>
         <div 
           className="user-profile-utility" 
           onClick={handleProfileClick} 
           title="Click to View Profile"
           style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
         >
            {state.currentUser?.profile_image ? (
              <img 
                src={state.currentUser.profile_image} 
                alt="Avatar" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  marginRight: '10px', 
                  border: '1px solid var(--border-color)' 
                }} 
              />
            ) : state.currentUser?.signature_fields?.logo ? (
              <img 
                src={state.currentUser.signature_fields.logo} 
                alt="Avatar" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  marginRight: '10px', 
                  border: '1px solid var(--border-color)' 
                }} 
              />
            ) : (
              <div className="avatar-letter">{state.currentUser?.name?.charAt(0)}</div>
            )}
            <div className="user-meta">
               <span className="uname">{state.currentUser?.name}</span>
               <span className="urole">{state.currentUser?.role}</span>
            </div>
            <button 
              onClick={handleLogoutClick} 
              title="Logout" 
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                marginLeft: '10px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <FiLogOut />
            </button>
         </div>
      </div>
    </header>
  );
};

export default TopNav;
