import React, { useState, useEffect, useCallback } from 'react';
import { useLeads } from '../context/LeadContext';
import { api } from '../services/api';
import { FiChevronLeft, FiChevronRight, FiClock, FiMapPin, FiCalendar, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';

const Scheduler = () => {
  const { state, dispatch } = useLeads();
  const location = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleBanner, setGoogleBanner] = useState(null); // { type: 'success'|'error', msg }
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Sync CRM data on mount
  useEffect(() => {
    const syncData = async () => {
      if (state.leads.length === 0) {
        dispatch({ type: 'FETCH_START' });
        try {
          const leads = await api.getLeads();
          dispatch({ type: 'SET_LEADS', payload: leads });
        } catch (e) {
          dispatch({ type: 'FETCH_ERROR', payload: e.message });
        }
      }
      if (state.customers.length === 0) {
        dispatch({ type: 'FETCH_START' });
        try {
          const customers = await api.getCustomers();
          dispatch({ type: 'SET_CUSTOMERS', payload: customers });
        } catch (e) {
          dispatch({ type: 'FETCH_ERROR', payload: e.message });
        }
      }
    };
    syncData();
  }, [dispatch, state.leads.length, state.customers.length]);

  // Check Google connection status and handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleParam = params.get('google');

    api.getGoogleStatus()
      .then(({ connected }) => {
        setGoogleConnected(connected);
        if (googleParam === 'connected') {
          setGoogleBanner({ type: 'success', msg: 'Google Calendar connected successfully!' });
          window.history.replaceState({}, '', '/scheduler');
        } else if (googleParam === 'error') {
          setGoogleBanner({ type: 'error', msg: 'Failed to connect Google Calendar. Please try again.' });
          window.history.replaceState({}, '', '/scheduler');
        }
      })
      .catch(() => setGoogleConnected(false));
  }, [location.search]);

  const buildEventsForSync = useCallback(() => {
    const events = [];

    state.leads.forEach(l => {
      (l.followUps || []).forEach(f => {
        const date = f.next_date || f.nextDate;
        if (date) {
          events.push({
            summary: `Follow-up: ${l.first_name} ${l.last_name || ''}`.trim(),
            description: `Lead follow-up — ${f.notes || f.type || ''}`,
            date: date.slice(0, 10),
            colorId: '1',
          });
        }
      });

      if (l.travel_start_date) {
        events.push({
          summary: `Travel Start: ${l.first_name} ${l.last_name || ''}`.trim(),
          description: `Travel to ${l.destination || 'TBD'}`,
          date: l.travel_start_date.slice(0, 10),
          colorId: '2',
        });
      }
    });

    (state.customers || []).forEach(c => {
      const dob = c.date_of_birth || c.dob;
      if (dob) {
        try {
          const d = new Date(dob);
          const thisYear = new Date().getFullYear();
          const dateStr = `${thisYear}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          events.push({
            summary: `Birthday: ${c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}`,
            description: 'Client birthday',
            date: dateStr,
            colorId: '5',
          });
        } catch (e) { /* skip invalid dates */ }
      }
    });

    return events;
  }, [state.leads, state.customers]);

  const handleGoogleConnect = async () => {
    setConnecting(true);
    try {
      const { url, error } = await api.getGoogleAuthUrl();
      if (error) {
        setGoogleBanner({ type: 'error', msg: error });
      } else {
        window.location.href = url;
      }
    } catch (err) {
      setGoogleBanner({ type: 'error', msg: 'Could not reach server. Make sure the backend is running.' });
    } finally {
      setConnecting(false);
    }
  };

  const handleGoogleSync = async () => {
    setSyncing(true);
    setGoogleBanner(null);
    try {
      const events = buildEventsForSync();
      if (!events.length) {
        setGoogleBanner({ type: 'error', msg: 'No events to sync. Add follow-ups or travel dates to your leads first.' });
        return;
      }
      const result = await api.syncToGoogle(events);
      if (result.error) {
        if (result.error.includes('not connected')) {
          setGoogleConnected(false);
          setGoogleBanner({ type: 'error', msg: 'Session expired. Please reconnect your Google account.' });
        } else {
          setGoogleBanner({ type: 'error', msg: result.error });
        }
      } else {
        setGoogleBanner({ type: 'success', msg: result.message });
      }
    } catch (err) {
      setGoogleBanner({ type: 'error', msg: 'Sync failed. Please try again.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Google Calendar account?')) return;
    await api.disconnectGoogle();
    setGoogleConnected(false);
    setGoogleBanner({ type: 'success', msg: 'Google Calendar disconnected.' });
  };

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const monthName = currentMonth.toLocaleString('default', { month: 'long' });
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const days = [];
  const totalDays = daysInMonth(month, year);
  const startDay = firstDayOfMonth(month, year);

  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const followUps = state.leads.flatMap(l =>
      (l.followUps || [])
        .filter(f => (f.next_date || f.nextDate || '').startsWith(dateStr))
        .map(f => ({ type: 'Follow-up', lead: `${l.first_name} ${l.last_name}`, color: 'var(--primary)', ...f }))
    );

    const travelStarts = state.leads
      .filter(l => l.travel_start_date === dateStr)
      .map(l => ({ type: 'Travel Start', lead: `${l.first_name} ${l.last_name}`, color: '#10B981', destination: l.destination }));

    const birthdays = (state.customers || [])
      .filter(c => {
        const dobVal = c.date_of_birth || c.dob;
        if (!dobVal) return false;
        try {
          const dobStr = typeof dobVal === 'string' ? dobVal : new Date(dobVal).toISOString();
          return dobStr.includes(`-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        } catch (e) {
          return false;
        }
      })
      .map(c => ({
        type: 'Birthday',
        lead: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Valued Customer',
        color: '#F59E0B'
      }));

    return [...followUps, ...travelStarts, ...birthdays];
  };

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(year, month + offset, 1));
  };

  return (
    <div className="scheduler-page" style={{ padding: '20px' }}>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="header-left">
          <h1><FiCalendar style={{ marginRight: 10 }} /> Scheduler</h1>
          <p className="text-secondary">Tracking follow-ups, travel dates, and client events.</p>
        </div>
        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', borderRadius: 0, border: 'var(--border-brutal)', boxShadow: '2px 2px 0px #000', overflow: 'hidden' }}>
            <button className="btn-icon" onClick={() => changeMonth(-1)}><FiChevronLeft /></button>
            <span style={{ padding: '0 20px', fontWeight: 700, minWidth: 160, textAlign: 'center' }}>{monthName} {year}</span>
            <button className="btn-icon" onClick={() => changeMonth(1)}><FiChevronRight /></button>
          </div>

          {googleConnected ? (
            <div style={{ display: 'flex', gap: 8, marginLeft: 10 }}>
              <button
                className="btn btn-primary"
                onClick={handleGoogleSync}
                disabled={syncing}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {syncing ? <><FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} /> Syncing…</> : <><FiCheck /> Sync to Google Calendar</>}
              </button>
              <button
                className="btn btn-outline"
                onClick={handleDisconnect}
                style={{ fontSize: '0.8rem' }}
                title="Disconnect Google Calendar"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ marginLeft: 10, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleGoogleConnect}
              disabled={connecting}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {connecting ? 'Connecting…' : 'Connect Google Calendar'}
            </button>
          )}
        </div>
      </div>

      {googleBanner && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: googleBanner.type === 'success' ? 'var(--state-success-bg, #dcfce7)' : 'var(--state-error-bg, #fee2e2)',
          color: googleBanner.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.9rem',
        }}>
          {googleBanner.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          {googleBanner.msg}
          <button onClick={() => setGoogleBanner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', background: '#000', border: 'var(--border-brutal)', boxShadow: 'var(--shadow-brutal)', overflow: 'hidden' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ background: 'var(--bg-main)', padding: '12px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>{d}</div>
        ))}
        {days.map((day, idx) => {
          const events = getEventsForDay(day);
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <div key={idx} style={{
              background: day ? 'var(--bg-card)' : 'var(--bg-main)',
              minHeight: '140px',
              padding: '8px',
              border: isToday ? '4px solid var(--primary)' : 'none'
            }}>
              {day && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isToday ? 'var(--primary)' : 'transparent',
                      color: isToday ? 'white' : 'inherit',
                      borderRadius: '50%'
                    }}>{day}</span>
                  </div>
                  <div className="events-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {events.map((ev, eIdx) => (
                      <div key={eIdx} style={{
                        fontSize: '0.7rem',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        background: `${ev.color}15`,
                        color: ev.color,
                        borderLeft: `3px solid ${ev.color}`,
                        fontWeight: 600,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                      }} title={`${ev.type}: ${ev.lead}`}>
                        {ev.type === 'Travel Start' ? '✈️ ' : ev.type === 'Follow-up' ? '📞 ' : '🎂 '}
                        {ev.lead}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--primary)' }}></span> Follow-ups</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#10B981' }}></span> Travel Starts</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#F59E0B' }}></span> Client Events</div>
        {googleConnected && (
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiCheck size={13} /> Google Calendar connected
          </div>
        )}
      </div>
    </div>
  );
};

export default Scheduler;
