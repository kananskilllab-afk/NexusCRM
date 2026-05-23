import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, FiStar, FiRotateCw, FiCalendar, FiClock, FiCheckSquare, 
  FiGift, FiCheckCircle, FiBarChart2, FiPlus, FiActivity
} from 'react-icons/fi';
import { useLeads } from '../context/LeadContext';
import { api } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();
  const [onlyAssigned, setOnlyAssigned] = useState(false);

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
    };
    syncData();
  }, [dispatch, state.leads.length]);
  
  // Dynamic Calculation
  const leadsToCount = onlyAssigned && state.currentUser 
    ? state.leads.filter(l => l.assigned_to === state.currentUser.name)
    : state.leads;

  const activeLeads = leadsToCount?.filter(l => !['Booked', 'Lost', 'Cancelled'].includes(l.status)).length || 0;
  const hotLeads = leadsToCount?.filter(l => l.priority === 'Hot').length || 0;
  const bookedLeads = leadsToCount?.filter(l => l.status === 'Booked').length || 0;
  const lostLeads = leadsToCount?.filter(l => l.status === 'Lost').length || 0;

  const kpis = [
    { title: 'Active Leads', count: activeLeads, icon: <FiCalendar className="primary-icon" /> },
    { title: 'Hot Leads', count: hotLeads, icon: <FiStar className="primary-icon" /> },
    { title: 'Booked', count: bookedLeads, icon: <FiCheckCircle className="primary-icon" /> },
    { title: 'Lost/Cancelled', count: lostLeads + (state.leads?.filter(l => l.status === 'Cancelled').length || 0), icon: <FiRotateCw className="primary-icon" /> },
  ];

  const utilityCards = [
    { title: 'Hot Leads', icon: <FiClock />, count: hotLeads, emptyMsg: 'No Hot Leads', color: 'var(--color-red)' },
    { title: 'Reminder', icon: <FiCalendar />, emptyMsg: 'No Reminders', color: 'var(--color-blue-cyan)' },
    { title: 'To do list', icon: <FiCheckSquare />, emptyMsg: 'No Todo Task', hasAdd: true, color: 'var(--color-purple-deep)' },
    { title: 'Upcoming Travel', icon: <FiGift />, emptyMsg: 'No Upcoming Travels', subtitle: 'Based on Vouchers Issued', color: 'var(--color-green)' },
  ];

  return (
    <div className="dashboard-container">
      {state.isLoading && (
        <div className="loading-bar-animated"></div>
      )}

      {/* Top Stats */}
      <div className="kpi-grid-modern">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="card kpi-card-modern">
            <div className="icon-wrapper">{kpi.icon} <span className="kpi-num">{kpi.count}</span></div>
            <div className="kpi-label-modern">{kpi.title}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-actions">
         <button className="btn btn-primary btn-load" onClick={() => window.location.reload()}>Refresh Stats</button>
         <button className="btn btn-secondary" onClick={() => navigate('/analytics')}>Advanced Analytics</button>
         <button className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={() => navigate('/leads')}>New Enquiry</button>
         <button className="btn btn-primary btn-load" onClick={() => navigate('/bookings')}>New Booking</button>
      </div>

      <div className="dashboard-filters-row card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
         <label className="checkbox-custom">
            <input type="checkbox" checked={onlyAssigned} onChange={() => setOnlyAssigned(!onlyAssigned)} />
            <span className="checkmark"></span>
            Only show assigned to you ({state.currentUser?.name || 'Guest'})
         </label>
      </div>

      {/* New Enhanced Widgets Row */}
      <div className="enhanced-widgets-row">
        <div className="card widget-card">
          <div className="widget-header">
            <h3><FiCheckSquare /> Today's Tasks</h3>
          </div>
          <div className="widget-body">
            {state.leads?.some(l => l.status === 'Working') ? (
              <ul className="activity-list">
                {state.leads.filter(l => l.status === 'Working').slice(0, 3).map(l => (
                  <li key={l.id} className="activity-item">Follow up with {l.first_name} regarding {l.destination}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-msg">No tasks for today. <span className="link" onClick={() => navigate('/leads')}>View all tasks</span></p>
            )}
          </div>
        </div>
        
        <div className="card widget-card">
          <div className="widget-header">
            <h3><FiActivity /> Recent Activity Feed</h3>
          </div>
          <div className="widget-body">
            <ul className="activity-list">
              {state.auditLog?.length > 0 ? (
                state.auditLog.slice(0, 5).map(log => (
                  <li key={log.id} className="activity-item">
                    <strong>{log.user}:</strong> {log.details} ({new Date(log.timestamp).toLocaleTimeString()})
                  </li>
                ))
              ) : (
                <>
                  <li className="activity-item">System: Application initialized</li>
                  <li className="activity-item">System: Connected to MongoDB Atlas cluster</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Utility Grid */}
      <div className="utility-grid">
         {utilityCards.map((card, idx) => (
           <div key={idx} className="card utility-card">
              <div className="util-head">
                 <div className="util-title" style={{ color: card.color }}>
                    {card.icon} {card.title}
                 </div>
                 {card.hasAdd && <button className="add-purple-btn">Add</button>}
              </div>
              <div className="util-body">
                 {card.subtitle && <p className="util-subtitle">{card.subtitle}</p>}
                 <div className="util-view-more" onClick={() => navigate('/leads')}>View More</div>
                 <div className="empty-msg">{card.count > 0 ? `You have ${card.count} items` : card.emptyMsg}</div>
              </div>
           </div>
         ))}
      </div>

      {/* VOYAGE PRD ADDITIONS: Advanced Dashboard Section */}
      <div style={{ marginTop: '40px', padding: '20px 0', borderTop: '1px solid var(--border-color)' }}>
         <h2 style={{ marginBottom: '20px' }}>Voyage CRM Insights</h2>
         
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '20px' }}>
               <h3 style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}><FiBarChart2 style={{ marginRight: '8px' }}/> Revenue Forecast</h3>
               <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '5px' }}>₹45,200</div>
               <div style={{ fontSize: '0.85rem', color: '#10b981' }}>+12% from last month</div>
               <div style={{ height: '100px', background: 'var(--bg-main)', marginTop: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                 [Chart Placeholder: Revenue Trend]
               </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
               <h3 style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}><FiUsers style={{ marginRight: '8px' }}/> Pipeline Conversion</h3>
               <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '5px' }}>24.8%</div>
               <div style={{ fontSize: '0.85rem', color: '#10b981' }}>+2.1% win rate</div>
               <div style={{ height: '100px', background: 'var(--bg-main)', marginTop: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                 [Chart Placeholder: Funnel]
               </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
               <h3 style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}><FiActivity style={{ marginRight: '8px' }}/> Commission Earned</h3>
               <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '5px' }}>₹3,850</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pending: ₹1,200</div>
               <div style={{ height: '100px', background: 'var(--bg-main)', marginTop: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                 [Chart Placeholder: Commissions]
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};


export default Dashboard;
