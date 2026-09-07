import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiBell, FiLogOut, FiMenu, FiCheck, FiClock, FiX, FiFileText, FiTarget, FiUser, FiChevronRight
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

  // Global Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  // Due Follow-up state
  const [dueFollowUps, setDueFollowUps] = useState([]);
  const [dueOpen, setDueOpen] = useState(false);
  const duePanelRef = useRef(null);

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

  const refreshDue = useCallback(async () => {
    if (!state.isAuthenticated) return;
    try {
      const data = await api.getDueFollowUps();
      setDueFollowUps(data.items || []);
    } catch (e) { /* ignore transient */ }
  }, [state.isAuthenticated]);

  // Poll notifications and due reminders every 60s
  useEffect(() => {
    if (!state.isAuthenticated) return;
    refreshCount();
    refreshDue();
    const t = setInterval(() => {
      refreshCount();
      refreshDue();
    }, 60000);
    return () => clearInterval(t);
  }, [state.isAuthenticated, refreshCount, refreshDue]);

  // Global Search debounce (Requirement 5)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchGlobal(searchQuery.trim());
        setSearchResults(res);
        setShowSearchDropdown(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
      if (duePanelRef.current && !duePanelRef.current.contains(e.target)) setDueOpen(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const togglePanel = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setDueOpen(false);
      try { const { items, unread } = await api.getNotifications(); setItems(items || []); setUnread(unread || 0); }
      catch (e) { setItems([]); }
    }
  };

  const toggleDuePanel = () => {
    const next = !dueOpen;
    setDueOpen(next);
    if (next) {
      setOpen(false);
      refreshDue();
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

  const handleSelectSearchResult = (link) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    navigate(link);
  };

  return (
    <header className="top-nav-utility">
      <div className="nav-left-section">
        <button className="mobile-toggle-btn" onClick={toggleMobileMenu}>
          <FiMenu />
        </button>
        <div className="mobile-logo-box">
          <img src="/logo.png" alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
        </div>
        
        {/* Interactive Global Search (Requirement 5) */}
        <div className="search-box-minimal" ref={searchContainerRef} style={{ position: 'relative' }}>
           <FiSearch style={{ color: 'var(--text-muted)' }} />
           <input 
             type="text" 
             placeholder="Search leads, deals, customers..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             onFocus={() => { if (searchResults) setShowSearchDropdown(true); }}
             style={{ width: '100%' }}
           />
           {searchQuery && (
             <button 
               onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
               style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--text-muted)' }}>
               <FiX size={14} />
             </button>
           )}

           {/* Floating Search Results Dropdown */}
           {showSearchDropdown && (
             <div style={{
               position: 'absolute', left: 0, top: 'calc(100% + 8px)', width: 380, maxHeight: 420, overflowY: 'auto',
               background: 'white', borderRadius: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.18)', zIndex: 1100,
               border: '1px solid var(--border-color)', padding: '8px 0'
             }}>
               {isSearching ? (
                 <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                   Searching across CRM records...
                 </div>
               ) : searchResults?.total === 0 ? (
                 <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                   No leads, deals, or customers found for "{searchQuery}".
                 </div>
               ) : (
                 <>
                   {/* Leads Section */}
                   {searchResults?.leads?.length > 0 && (
                     <div>
                       <div style={{ padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', background: '#F8FAFC' }}>
                         Leads &amp; Inquiries ({searchResults.leads.length})
                       </div>
                       {searchResults.leads.map(l => (
                         <div 
                           key={l.id} 
                           onClick={() => handleSelectSearchResult(l.link)}
                           style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                           className="search-result-item">
                           <div>
                             <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{l.title}</div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l.subtitle}</div>
                           </div>
                           <span className="badge new" style={{ fontSize: '0.68rem' }}>{l.tag}</span>
                         </div>
                       ))}
                     </div>
                   )}

                   {/* Opportunities Section */}
                   {searchResults?.opportunities?.length > 0 && (
                     <div>
                       <div style={{ padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700, color: '#0E8BD4', textTransform: 'uppercase', background: '#F8FAFC' }}>
                         Deals &amp; Opportunities ({searchResults.opportunities.length})
                       </div>
                       {searchResults.opportunities.map(o => (
                         <div 
                           key={o.id} 
                           onClick={() => handleSelectSearchResult(o.link)}
                           style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                           className="search-result-item">
                           <div>
                             <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{o.title}</div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.subtitle}</div>
                           </div>
                           <span className="badge working" style={{ fontSize: '0.68rem' }}>{o.tag}</span>
                         </div>
                       ))}
                     </div>
                   )}

                   {/* Customers Section */}
                   {searchResults?.customers?.length > 0 && (
                     <div>
                       <div style={{ padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', background: '#F8FAFC' }}>
                         Customers ({searchResults.customers.length})
                       </div>
                       {searchResults.customers.map(c => (
                         <div 
                           key={c.id} 
                           onClick={() => handleSelectSearchResult(c.link)}
                           style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                           className="search-result-item">
                           <div>
                             <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.title}</div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.subtitle}</div>
                           </div>
                           <span className="badge" style={{ fontSize: '0.68rem', background: '#DCFCE7', color: '#166534' }}>Client</span>
                         </div>
                       ))}
                     </div>
                   )}
                 </>
               )}
             </div>
           )}
        </div>
      </div>

      <div className="nav-right-section" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
         {/* Due Follow-ups Reminder Badge for Counselors */}
         <div ref={duePanelRef} style={{ position: 'relative' }}>
            <div 
              className="notif-icon-btn" 
              onClick={toggleDuePanel} 
              title={`${dueFollowUps.length} follow-ups due today`}
              style={{ cursor: 'pointer', position: 'relative' }}>
               <FiClock color={dueFollowUps.length > 0 ? '#E19D19' : 'inherit'} />
               {dueFollowUps.length > 0 && (
                 <span style={{ position: 'absolute', top: -4, right: -4, background: '#E19D19', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                   {dueFollowUps.length > 9 ? '9+' : dueFollowUps.length}
                 </span>
               )}
            </div>

            {dueOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 340, maxHeight: 400, overflowY: 'auto', background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 1000, border: '1px solid var(--border-color)' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiClock color="#E19D19" /> Due Follow-Ups ({dueFollowUps.length})
                  </strong>
                </div>
                {dueFollowUps.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No follow-ups due today! You are all caught up.
                  </div>
                ) : (
                  dueFollowUps.map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => { setDueOpen(false); navigate(`/leads/${lead.id}`); }}
                      style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      className="search-result-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{lead.first_name} {lead.last_name || ''}</span>
                        <span style={{ fontSize: '0.72rem', color: '#E19D19', fontWeight: 600 }}>Due Today</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        #{lead.lead_code || lead.id} • {lead.mobile} • {lead.destination || 'Destination'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
         </div>

         {/* Notifications */}
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
