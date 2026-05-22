import React, { useState, useEffect } from 'react';
import { useLeads } from '../context/LeadContext';
import { api } from '../services/api';
import { FiChevronLeft, FiChevronRight, FiClock, FiMapPin, FiCalendar } from 'react-icons/fi';

const Scheduler = () => {
  const { state, dispatch } = useLeads();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Sync data on mount
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

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const monthName = currentMonth.toLocaleString('default', { month: 'long' });
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const days = [];
  const totalDays = daysInMonth(month, year);
  const startDay = firstDayOfMonth(month, year);

  // Pad start
  for (let i = 0; i < startDay; i++) days.push(null);
  // Real days
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
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="header-left">
          <h1><FiCalendar style={{ marginRight: 10 }} /> Scheduler</h1>
          <p className="text-secondary">Tracking follow-ups, travel dates, and client events.</p>
        </div>
        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button className="btn-icon" onClick={() => changeMonth(-1)}><FiChevronLeft /></button>
            <span style={{ padding: '0 20px', fontWeight: 600, minWidth: 160, textAlign: 'center' }}>{monthName} {year}</span>
            <button className="btn-icon" onClick={() => changeMonth(1)}><FiChevronRight /></button>
          </div>
          <button className="btn btn-primary" style={{ marginLeft: 10 }}>Sync with Google</button>
        </div>
      </div>

      <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ background: 'var(--bg-main)', padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d}</div>
        ))}
        {days.map((day, idx) => {
          const events = getEventsForDay(day);
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <div key={idx} style={{ 
              background: day ? 'var(--card-bg)' : 'var(--bg-main)', 
              minHeight: '140px', 
              padding: '8px',
              border: isToday ? '2px solid var(--primary)' : 'none'
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

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--primary)' }}></span> Follow-ups</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#10B981' }}></span> Travel Starts</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#F59E0B' }}></span> Client Events</div>
      </div>
    </div>
  );
};

export default Scheduler;
