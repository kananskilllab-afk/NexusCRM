import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiStar, FiCheckCircle, FiXCircle, FiTrendingUp } from 'react-icons/fi';
import { useLeads } from '../context/LeadContext';
import './Dashboard.css';

const Dashboard = () => {
  const { state } = useLeads();
  const navigate = useNavigate();
  
  const activeLeads = state.leads.length;
  const hotLeads = state.leads.filter(l => l.priority === 'Hot').length;
  const bookedLeads = state.leads.filter(l => l.status === 'Booked').length;
  const lostLeads = state.leads.filter(l => l.status === 'Lost').length;
  
  const totalRevenue = state.leads.reduce((acc, lead) => {
    const items = lead.billing?.items || [];
    const leadTotal = items.reduce((iAcc, item) => iAcc + (item.qty * item.price), 0);
    return acc + leadTotal;
  }, 0);

  const kpis = [
    { title: 'Active Leads', count: activeLeads, icon: <FiUsers />, color: 'var(--status-followup)', trend: '+12%' },
    { title: 'Hot Leads', count: hotLeads, icon: <FiStar />, color: 'var(--status-hot)', trend: '+5%' },
    { title: 'Booked', count: bookedLeads, icon: <FiCheckCircle />, color: 'var(--status-booked)', trend: '+18%' },
    { title: 'Lost', count: lostLeads, icon: <FiXCircle />, color: 'var(--status-lost)', trend: '-2%' },
    { title: 'Revenue', count: `₹${(totalRevenue / 1000).toFixed(1)}k`, icon: <FiTrendingUp />, color: 'var(--primary)', trend: '+24%' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p className="text-muted">Welcome back, Bhargav! Here's what's happening today.</p>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi, index) => (
          <div key={index} className="card kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="kpi-content">
              <span className="kpi-label">{kpi.title}</span>
              <h3 className="kpi-value">{kpi.count}</h3>
            </div>
            <div className={`kpi-trend ${kpi.trend.startsWith('+') ? 'up' : 'down'}`}>
              {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card chart-section">
          <div className="section-header">
            <h3>Lead Distribution</h3>
            <button className="btn btn-outline" onClick={() => navigate('/reports')}>View Reports</button>
          </div>
          <div className="chart-placeholder">
             <FiTrendingUp size={48} color="var(--primary)" style={{ opacity: 0.2 }} />
             <p className="text-muted">Real-time distribution charts are active.</p>
          </div>
        </div>

        <div className="card recent-leads">
          <div className="section-header">
            <h3>Recent Active Leads</h3>
            <button className="btn-link" onClick={() => navigate('/leads')}>View All</button>
          </div>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Destination</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.leads.slice(0, 5).map(lead => (
                <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="clickable-row">
                  <td>{lead.first_name} {lead.last_name}</td>
                  <td>{lead.destination}</td>
                  <td>
                    <span className={`badge ${lead.status.toLowerCase()}`}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
