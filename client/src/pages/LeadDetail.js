import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeads, ROLE_HIERARCHY } from '../context/LeadContext';
import { FiEdit2, FiMessageCircle, FiArrowLeft, FiAlertCircle, FiMail, FiTarget, FiUser, FiUserCheck, FiCheck } from 'react-icons/fi';
import { api } from '../services/api';
import TemplateSelector from '../components/common/TemplateSelector';
import ConversionModal from '../components/modals/ConversionModal';
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

// §3.3 lead lifecycle — the forward track + two off-track branches.
const LIFECYCLE = ['New', 'Attempting Contact', 'Working', 'Qualified', 'Converted'];
const BRANCHES = ['Nurturing', 'Unqualified'];

const STAGE_COLORS = {
  'Qualification': '#00A0E3', 'Itinerary': '#0E8BD4', 'Quote Sent': '#E19D19',
  'Negotiation': '#EF7F1A', 'Verbal Confirm': '#7E57C2', 'Closed-Won': '#009846', 'Closed-Lost': '#E53935',
};
const money = (v = 0) => `₹${Math.round(v || 0).toLocaleString('en-IN')}`;

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useLeads();

  const lead = state.leads.find(l => l.id === id);
  const userRole = state.currentUser?.role;
  const userLevel = ROLE_HIERARCHY[userRole] || 0;

  const isAccountant = userRole === 'Accountant';

  // Security: Enforce lead ownership for Ops Staff
  const isOwner = lead && (lead.assigned_to === state.currentUser?.name || lead.owner === state.currentUser?.name);
  const hasAccess = userLevel > 2 || isOwner || userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'Accountant';

  const [showTemplates, setShowTemplates] = useState(null); // 'WhatsApp' or 'Email'
  const [showConvert, setShowConvert] = useState(false);
  const [users, setUsers] = useState([]);
  const [opp, setOpp] = useState(null);
  const [busy, setBusy] = useState(false);

  // Load the user list (for owner/assignee pickers); degrade gracefully.
  useEffect(() => {
    api.getUsers().then((u) => setUsers(Array.isArray(u) ? u : [])).catch(() => setUsers([]));
  }, []);

  // Load the linked opportunity, if any.
  useEffect(() => {
    if (lead?.opportunity_id) {
      api.getOpportunity(lead.opportunity_id).then(setOpp).catch(() => setOpp(null));
    } else {
      setOpp(null);
    }
  }, [lead?.opportunity_id]);


  const handleConvertToOpportunity = () => {
    if (lead?.opportunity_id) { navigate(`/opportunities?open=${lead.opportunity_id}`); return; }
    setShowConvert(true);
  };

  // Persist an assignment change (owner / assigned_to) to the server.
  const handleAssign = useCallback(async (payload) => {
    setBusy(true);
    try {
      const updated = await api.assignLead(id, payload);
      dispatch({ type: 'UPDATE_LEAD', payload: { id, data: updated } });
    } catch (err) {
      alert(err.message || 'Failed to update assignment');
    } finally {
      setBusy(false);
    }
  }, [id, dispatch]);

  const handleSendComm = (templateName, body) => {
    dispatch({ type: 'LOG_COMMUNICATION', payload: { leadId: id, comm: { id: Date.now(), type: showTemplates, template: templateName, status: 'Sent', sentAt: new Date().toISOString(), to: showTemplates === 'Email' ? lead.email : lead.mobile, body } } });
    dispatch({ type: 'ADD_ACTIVITY', payload: { leadId: id, activity: { id: Date.now(), date: new Date().toISOString(), text: `${showTemplates} sent: ${templateName}`, user: state.currentUser?.name } } });
    setShowTemplates(null);
    alert(`${showTemplates} sent successfully using template: ${templateName}`);
  };

  const [activeTab, setActiveTab] = useState(isAccountant ? 'Billing' : 'About');
  const accessibleTabs = isAccountant ? ['History', 'Quote', 'Billing'] : TABS;

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

  const allowedNext = state.statusTransitions?.[lead.status] || [];
  const currentIndex = LIFECYCLE.indexOf(lead.status);
  const isConverted = lead.status === 'Converted';

  const changeStatus = async (newStatus) => {
    if (newStatus === lead.status) return;
    if (!allowedNext.includes(newStatus)) {
      alert(`Invalid transition: Cannot move from "${lead.status}" to "${newStatus}".\nAllowed: ${allowedNext.join(', ') || 'none'}`);
      return;
    }
    setBusy(true);
    try {
      const updated = await api.updateLead(id, { status: newStatus });
      dispatch({ type: 'UPDATE_LEAD', payload: { id, data: updated } });
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const priorityColor = { Hot: 'var(--color-red)', Normal: 'var(--primary)', Cold: 'var(--text-muted)' };

  // User-name options for the pickers (active users + whoever is already set).
  const names = Array.from(new Set([
    ...users.filter(u => !u.status || u.status === 'Active').map(u => u.name),
    lead.owner, lead.assigned_to,
  ].filter(Boolean)));

  const PersonPicker = ({ label, icon, value, field }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{icon}{label}</span>
      {names.length > 0 ? (
        <select value={value || ''} disabled={busy || isConverted}
          onChange={(e) => handleAssign({ [field]: e.target.value })}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.82rem', fontWeight: 600 }}>
          <option value="">— Unassigned —</option>
          {names.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      ) : (
        <strong style={{ fontSize: '0.82rem' }}>{value || '—'}</strong>
      )}
    </div>
  );

  return (
    <div className="lead-detail-container">
      {showTemplates && (
        <TemplateSelector lead={lead} type={showTemplates} onClose={() => setShowTemplates(null)} onSend={handleSendComm} />
      )}
      <ConversionModal
        isOpen={showConvert}
        leadId={id}
        onClose={() => setShowConvert(false)}
        onConverted={(o) => {
          setShowConvert(false);
          alert(`Opportunity ${o?.opp_code || ''} ready. Opening the deal pipeline.`);
          navigate('/opportunities');
        }}
      />
      <div className="lead-detail-header">
        <div className="header-top">
          <div className="lead-identity">
            <button className="btn-icon" onClick={() => navigate('/leads')} style={{ marginRight: '8px' }}>
              <FiArrowLeft />
            </button>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: priorityColor[lead.priority] || '#94A3B8', marginRight: '8px' }} />
            <div className={`badge-status ${(lead.status || 'New').toLowerCase().replace(' ', '-')}`}>{lead.status || 'New'}</div>
            {lead.rating && (
              <span title={`Lead score ${lead.lead_score ?? 0}/100`} style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, color: 'white', background: lead.rating === 'Hot' ? '#E53935' : lead.rating === 'Warm' ? '#E19D19' : '#90A4AE' }}>
                {lead.rating} · {lead.lead_score ?? 0}
              </span>
            )}
            <h1>{lead.first_name} {lead.last_name || ''}</h1>
            <span className="lead-no">#{lead.lead_code || lead.id}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>{lead.destination} • {lead.no_adults}A {lead.no_children > 0 ? `${lead.no_children}C` : ''}</span>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={() => setShowTemplates('WhatsApp')}><FiMessageCircle /> WhatsApp</button>
            <button className="btn btn-outline" onClick={() => setShowTemplates('Email')}><FiMail /> Email</button>
            <button className="btn btn-outline" onClick={handleConvertToOpportunity}
              title={lead.opportunity_id ? 'Open the linked opportunity' : 'Create a pipeline opportunity from this lead'}>
              <FiTarget /> {lead.opportunity_id ? 'View Opportunity' : 'Convert to Opportunity'}
            </button>
            <button className="btn btn-primary"><FiEdit2 /> Edit Lead</button>
          </div>
        </div>

        {/* Owner & assignment */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '12px 0' }}>
          <PersonPicker label="Owner" icon={<FiUserCheck size={13} style={{ marginRight: 3 }} />} value={lead.owner} field="owner" />
          <PersonPicker label="Assigned to" icon={<FiUser size={13} style={{ marginRight: 3 }} />} value={lead.assigned_to} field="assigned_to" />
          {isConverted && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(read-only — lead converted)</span>}
        </div>

        {/* Lifecycle progress bar (§3.3) */}
        <div className="status-pipeline scroll-x">
          {LIFECYCLE.map((status, index) => {
            const isActive = index === currentIndex;
            const isCompleted = currentIndex >= 0 && index < currentIndex;
            const isAllowed = allowedNext.includes(status);
            return (
              <div key={status}
                className={`status-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => isAllowed && !busy && changeStatus(status)}
                title={isAllowed ? `Move to ${status}` : isActive ? 'Current status' : `Not allowed from ${lead.status}`}
                style={{ cursor: isAllowed && !busy ? 'pointer' : isActive ? 'default' : 'not-allowed', opacity: !isAllowed && !isActive && !isCompleted ? 0.45 : 1 }}>
                <div className="step-dot">{isCompleted ? <FiCheck size={11} /> : null}</div>
                <span className="status-label">{status}</span>
                {index < LIFECYCLE.length - 1 && <div className="step-line"></div>}
              </div>
            );
          })}
        </div>

        {/* Off-track branches */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {BRANCHES.map((b) => {
            const isCurrent = lead.status === b;
            const isAllowed = allowedNext.includes(b);
            return (
              <button key={b} disabled={!isAllowed && !isCurrent}
                onClick={() => isAllowed && changeStatus(b)}
                title={isAllowed ? `Move to ${b}` : isCurrent ? 'Current status' : `Not allowed from ${lead.status}`}
                style={{
                  padding: '4px 12px', borderRadius: 14, fontSize: '0.75rem', fontWeight: 600,
                  border: `1px solid ${b === 'Unqualified' ? '#E53935' : '#E19D19'}`,
                  background: isCurrent ? (b === 'Unqualified' ? '#E53935' : '#E19D19') : 'transparent',
                  color: isCurrent ? 'white' : (b === 'Unqualified' ? '#E53935' : '#B07400'),
                  cursor: isAllowed ? 'pointer' : 'default', opacity: !isAllowed && !isCurrent ? 0.4 : 1,
                }}>
                {b}
              </button>
            );
          })}
        </div>

        {/* Linked opportunity */}
        {opp && (
          <div className="card" onClick={() => navigate(`/opportunities?open=${opp.id}`)}
            style={{ marginTop: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderLeft: `4px solid ${STAGE_COLORS[opp.stage] || '#284695'}` }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}><FiTarget size={12} /> Linked Opportunity</div>
              <div style={{ fontWeight: 600 }}>{opp.name || opp.destination || 'Opportunity'} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {opp.opp_code}</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{money(opp.estimated_value)}</div>
              <span className="badge" style={{ background: STAGE_COLORS[opp.stage] || '#284695', color: 'white', fontSize: '0.7rem' }}>{opp.stage}</span>
              {typeof opp.win_likelihood === 'number' && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Win {opp.win_likelihood}%</span>}
            </div>
          </div>
        )}
      </div>

      <div className="tab-container">
        <div className="tab-nav scroll-x">
          {accessibleTabs.map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
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
          {activeTab === 'Quote' && (
            <QuoteTab
              lead={lead}
              opp={opp}
              onQuoteSent={() => {
                if (lead?.opportunity_id) {
                  api.getOpportunity(lead.opportunity_id).then(setOpp).catch(() => {});
                }
              }}
            />
          )}
          {activeTab === 'Suppliers' && <SuppliersTab lead={lead} />}
          {activeTab === 'Billing' && <BillingTab lead={lead} opp={opp} />}
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
