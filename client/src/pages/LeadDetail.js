import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeads, ROLE_HIERARCHY } from '../context/LeadContext';
import { FiEdit2, FiMessageCircle, FiClock, FiArrowLeft, FiAlertCircle, FiMail } from 'react-icons/fi';
import TemplateSelector from '../components/TemplateSelector';
import AboutTab from './LeadDetailTabs/AboutTab';
import BillingTab from './LeadDetailTabs/BillingTab';
import HistoryTab from './LeadDetailTabs/HistoryTab';
import RemindersTab from './LeadDetailTabs/RemindersTab';
import FilesTab from './LeadDetailTabs/FilesTab';
import NotesTab from './LeadDetailTabs/NotesTab';
import TravellerTab from './LeadDetailTabs/TravellerTab';
import FollowUpTab from './LeadDetailTabs/FollowUpTab';
import QuoteTab from './LeadDetailTabs/QuoteTab';
import SuppliersTab from './LeadDetailTabs/SuppliersTab';
import './LeadDetail.css';

const TABS = ['About', 'History', 'Reminders', 'Files', 'Notes', 'Traveller', 'Follow up', 'Quote', 'Suppliers', 'Billing'];

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useLeads();

  const lead = state.leads.find(l => l.id === id);
  const userRole = state.currentUser?.role;
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  
  const isAccountant = userRole === 'Accountant';
  const isOpsStaff = userRole === 'Ops Staff';

  // Security: Enforce lead ownership for Ops Staff
  const isOwner = lead && lead.assigned_to === state.currentUser?.name;
  const hasAccess = userLevel > 2 || isOwner || userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'Accountant';

  const [showTemplates, setShowTemplates] = useState(null); // 'WhatsApp' or 'Email'
  
  const handleSendComm = (templateName, body) => {
    dispatch({
      type: 'LOG_COMMUNICATION',
      payload: {
        leadId: id,
        comm: { 
          id: Date.now(), 
          type: showTemplates, 
          template: templateName, 
          status: 'Sent', 
          sentAt: new Date().toISOString(),
          to: showTemplates === 'Email' ? lead.email : lead.mobile,
          body: body
        }
      }
    });

    // Unified Timeline Integration (Requirement #1)
    dispatch({
      type: 'ADD_ACTIVITY',
      payload: {
        leadId: id,
        activity: { 
          id: Date.now(), 
          date: new Date().toISOString(), 
          text: `${showTemplates} sent: ${templateName}`, 
          user: state.currentUser?.name 
        }
      }
    });

    setShowTemplates(null);
    alert(`${showTemplates} sent successfully using template: ${templateName}`);
  };

  const [activeTab, setActiveTab] = useState(isAccountant ? 'Billing' : 'About');
  
  const accessibleTabs = isAccountant 
    ? ['History', 'Quote', 'Billing'] 
    : TABS;

  if (!lead || !hasAccess) return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
      <FiAlertCircle size={48} style={{ color: 'var(--status-hot)', marginBottom: '1rem' }} />
      <h3>{lead ? 'Access Restricted' : 'Lead Not Found'}</h3>
      <p className="text-muted">
        {lead ? 'You do not have security clearance to view this record. This event has been logged.' : 'The lead you are looking for does not exist.'}
      </p>
      <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/leads')}>Back to Leads</button>
    </div>
  );

  const STATUSES = ['Unqualified', 'New', 'Working', 'Proposal Sent', 'Negotiating', 'Booked', 'Lost'];
  const allowedNext = state.statusTransitions?.[lead.status] || [];
  const currentStatusIndex = STATUSES.indexOf(lead.status);

  const changeStatus = (newStatus) => {
    if (newStatus === lead.status) return;
    if (!allowedNext.includes(newStatus)) {
      alert(`Invalid transition: Cannot move from "${lead.status}" to "${newStatus}".\nAllowed: ${allowedNext.join(', ')}`);
      return;
    }
    dispatch({ type: 'UPDATE_LEAD_STATUS', payload: { id: lead.id, status: newStatus } });
  };

  const priorityColor = { Hot: '#EF4444', Normal: '#3B82F6', Cold: '#94A3B8' };

  return (
    <div className="lead-detail-container">
      {showTemplates && (
        <TemplateSelector 
          lead={lead} 
          type={showTemplates} 
          onClose={() => setShowTemplates(null)} 
          onSend={handleSendComm} 
        />
      )}
      <div className="lead-detail-header">
        <div className="header-top">
          <div className="lead-identity">
            <button className="btn-icon" onClick={() => navigate('/leads')} style={{ marginRight: '8px' }}>
              <FiArrowLeft />
            </button>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: priorityColor[lead.priority] || '#94A3B8', marginRight: '8px' }} />
            <div className={`badge-status ${(lead.status || 'New').toLowerCase().replace(' ', '-')}`}>{lead.status || 'New'}</div>
            <h1>{lead.first_name} {lead.last_name || ''}</h1>
            <span className="lead-no">#{lead.id}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>{lead.destination} • {lead.no_adults}A {lead.no_children > 0 ? `${lead.no_children}C` : ''}</span>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={() => setShowTemplates('WhatsApp')}>
              <FiMessageCircle /> WhatsApp
            </button>
            <button className="btn btn-outline" onClick={() => setShowTemplates('Email')}>
              <FiMail /> Email
            </button>
            <button className="btn btn-primary">
              <FiEdit2 /> Edit Lead
            </button>
          </div>
        </div>

        <div className="status-pipeline scroll-x">
          {STATUSES.map((status, index) => {
            const isActive = index === currentStatusIndex;
            const isCompleted = index < currentStatusIndex;
            const isAllowed = allowedNext.includes(status);
            return (
              <div
                key={status}
                className={`status-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => changeStatus(status)}
                title={isAllowed ? `Move to ${status}` : isActive ? 'Current status' : `Not allowed from ${lead.status}`}
                style={{ cursor: isAllowed ? 'pointer' : isActive ? 'default' : 'not-allowed', opacity: !isAllowed && !isActive && !isCompleted ? 0.4 : 1 }}
              >
                <div className="step-dot"></div>
                <span className="status-label">{status}</span>
                {index < STATUSES.length - 1 && <div className="step-line"></div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="tab-container">
        <div className="tab-nav scroll-x">
          {accessibleTabs.map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="tab-body">
          {activeTab === 'About' && <AboutTab lead={lead} />}
          {activeTab === 'History' && <HistoryTab lead={lead} />}
          {activeTab === 'Reminders' && <RemindersTab lead={lead} />}
          {activeTab === 'Files' && <FilesTab lead={lead} />}
          {activeTab === 'Notes' && <NotesTab lead={lead} />}
          {activeTab === 'Traveller' && <TravellerTab lead={lead} />}
          {activeTab === 'Follow up' && <FollowUpTab lead={lead} />}
          {activeTab === 'Quote' && <QuoteTab lead={lead} />}
          {activeTab === 'Suppliers' && <SuppliersTab lead={lead} />}
          {activeTab === 'Billing' && <BillingTab lead={lead} />}
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
