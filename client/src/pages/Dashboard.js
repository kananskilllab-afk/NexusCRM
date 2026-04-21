import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, FiStar, FiRotateCw, FiCalendar, FiClock, FiCheckSquare, 
  FiGift, FiCheckCircle, FiBarChart2, FiPlus
} from 'react-icons/fi';
import { useLeads } from '../context/LeadContext';
import './Dashboard.css';

const Dashboard = () => {
  const { state } = useLeads();
  const navigate = useNavigate();
  const [onlyAssigned, setOnlyAssigned] = useState(true);
  
  // Dynamic Calculation
  const activeLeads = state.leads?.filter(l => !['Booked', 'Lost'].includes(l.status)).length || 0;
  const hotLeads = state.leads?.filter(l => l.priority === 'Hot').length || 0;
  const bookedLeads = state.leads?.filter(l => l.status === 'Booked').length || 0;
  const lostLeads = state.leads?.filter(l => l.status === 'Lost').length || 0;

  const kpis = [
    { title: 'Active Leads', count: activeLeads, icon: <FiCalendar className="red-icon" /> },
    { title: 'Hot Leads', count: hotLeads, icon: <FiStar className="red-icon" /> },
    { title: 'Booked', count: bookedLeads, icon: <FiRotateCw className="red-icon" /> },
    { title: 'Lost', count: lostLeads, icon: <FiRotateCw className="red-icon" /> },
  ];

  const utilityCards = [
    { title: 'Hot Leads', icon: <FiClock />, count: hotLeads, emptyMsg: 'No Hot Leads', color: '#ff5757' },
    { title: 'Reminder', icon: <FiCalendar />, emptyMsg: 'No Reminders', color: '#ff5757' },
    { title: 'To do list', icon: <FiCalendar />, emptyMsg: 'No Todo Task', hasAdd: true, color: '#ff5757' },
    { title: 'Upcoming Travel', icon: <FiGift />, emptyMsg: 'No Upcoming Travels', subtitle: 'Based on Vouchers Issued', color: '#ff5757' },
    { title: 'Birthday/Anniversary', icon: <FiCalendar />, emptyMsg: 'No Birthday /Anniversary', color: '#ff5757' },
    { title: 'Upcoming Bookings', icon: <FiCalendar />, emptyMsg: 'No Upcoming Travel', subtitle: 'Based on Leads Status Booked for Flight, Hotel, Other, Custom, Package & Transport', color: '#ff5757' },
  ];

  return (
    <div className="dashboard-container">
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
         <button className="btn btn-primary btn-load">Load User</button>
         <button className="btn btn-primary btn-load" style={{ marginLeft: 'auto' }}>Load Chart</button>
      </div>

      <div className="dashboard-filters-row card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center' }}>
         <label className="checkbox-custom">
            <input type="checkbox" checked={onlyAssigned} onChange={() => setOnlyAssigned(!onlyAssigned)} />
            <span className="checkmark"></span>
            Only show assign to you
         </label>
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
                 <div className="util-view-more">View More</div>
                 <div className="empty-msg">{card.emptyMsg}</div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default Dashboard;
