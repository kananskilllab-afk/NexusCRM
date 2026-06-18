import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiPlus, FiCheckCircle, FiMenu } from 'react-icons/fi';
import { useLeads } from '../../context/LeadContext';
import { api } from '../../services/api';
import './TopBar.css';

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const TopBar = ({ onQuickAdd, onMenuToggle }) => {
  const { state } = useLeads();
  const navigate  = useNavigate();
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);

  /* Poll unread count every 60 s */
  const refreshCount = useCallback(async () => {
    if (!state.isAuthenticated) return;
    try {
      const { unread: u } = await api.getUnreadCount();
      setUnread(u || 0);
    } catch (_) {}
  }, [state.isAuthenticated]);

  useEffect(() => {
    if (!state.isAuthenticated) return;
    refreshCount();
    const t = setInterval(refreshCount, 60000);
    return () => clearInterval(t);
  }, [state.isAuthenticated, refreshCount]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Close notification panel on Escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const togglePanel = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const res = await api.getNotifications(20);
        setItems(res?.items || []);
        setUnread(res?.unread || 0);
      } catch (_) { setItems([]); }
    }
  };

  const openItem = async (n) => {
    try {
      if (!n.is_read) {
        await api.markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
        setUnread((u) => Math.max(0, u - 1));
      }
    } catch (_) {}
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try { await api.markAllNotificationsRead(); } catch (_) {}
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/leads?search=${encodeURIComponent(query.trim())}`);
  };

  const handleQuickAdd = onQuickAdd ?? (() => navigate('/leads'));

  return (
    <header className="app-topbar" role="banner">

      {/* Left: hamburger (mobile) + search */}
      <div className="topbar-left">
        <button
          className="topbar-hamburger"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <FiMenu size={20} />
        </button>

        <form
          className="topbar-search"
          onSubmit={handleSearch}
          role="search"
          aria-label="Global search"
        >
          <span className="topbar-search__icon" aria-hidden="true">
            <FiSearch />
          </span>
          <input
            className="topbar-search__input"
            type="search"
            placeholder="Search leads, bookings, contacts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
        </form>
      </div>

      {/* Right: bell + quick-add */}
      <div className="topbar-right">

        {/* Notification bell */}
        <div className="topbar-notif-wrap" ref={panelRef}>
          <button
            className="topbar-bell"
            onClick={togglePanel}
            aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
            aria-expanded={open}
            aria-haspopup="true"
          >
            <FiBell />
            {unread > 0 && (
              <span className="topbar-bell__badge" aria-hidden="true">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div
              className="topbar-notif-panel"
              role="dialog"
              aria-label="Notifications panel"
            >
              <div className="topbar-notif-header">
                <span className="topbar-notif-title">Notifications</span>
                {unread > 0 && (
                  <button
                    className="topbar-notif-markall"
                    onClick={markAll}
                    aria-label="Mark all notifications as read"
                  >
                    <FiCheckCircle size={13} /> Mark all read
                  </button>
                )}
              </div>

              <ul className="topbar-notif-list">
                {items.length === 0 && (
                  <li className="topbar-notif-empty">No notifications yet.</li>
                )}
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`topbar-notif-item${n.is_read ? '' : ' topbar-notif-item--unread'}`}
                    onClick={() => openItem(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openItem(n)}
                  >
                    <div className="topbar-notif-body">
                      <p className="topbar-notif-text">{n.title}</p>
                      {n.message && <p className="topbar-notif-sub">{n.message}</p>}
                    </div>
                    <span className="topbar-notif-time">{timeAgo(n.created_at)}</span>
                    {!n.is_read && <span className="topbar-notif-dot" aria-hidden="true" />}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick add */}
        <button
          className="topbar-quickadd"
          onClick={handleQuickAdd}
          aria-label="Quick add new lead"
        >
          <FiPlus size={15} />
          Quick Add
        </button>

      </div>
    </header>
  );
};

export default TopBar;
