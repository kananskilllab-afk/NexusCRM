import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeads, ROLE_HIERARCHY } from '../context/LeadContext';
import { useToast } from '../context/ToastContext';
import { 
  FiEdit2, FiMessageCircle, FiArrowLeft, FiAlertCircle, FiMail, 
  FiTarget, FiUser, FiUserCheck, FiCheck, FiSave, FiRotateCcw, FiXCircle, FiMessageSquare
} from 'react-icons/fi';
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

// §3.3 lead lifecycle — forward track + off-track branches
const LIFECYCLE = ['New', 'Attempting Contact', 'Working', 'Qualified', 'Converted'];
const BRANCHES = ['Nurturing', 'Unqualified', 'Lost', 'Cancelled'];

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

  const addToast = useToast();
  const [showTemplates, setShowTemplates] = useState(null); // 'WhatsApp' or 'Email'
  const [showConvert, setShowConvert] = useState(false);
  const [opp, setOpp] = useState(null);
  const [busy, setBusy] = useState(false);

  // Quick Remark state
  const [quickRemarkText, setQuickRemarkText] = useState('');
  const [quickNextDate, setQuickNextDate] = useState('');

  // Lost Inquiry Modal state
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('Price too high / Budget issue');
  const [lostNotes, setLostNotes] = useState('');

  // Load users into shared context so all child tabs (AboutTab etc.) also benefit.
  useEffect(() => {
    api.getUsers()
      .then(u => { if (Array.isArray(u) && u.length > 0) dispatch({ type: 'SET_USERS', payload: u }); })
      .catch(() => {});
  }, [dispatch]);

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

  // Quick Remark Save
  const handleSaveQuickRemark = async () => {
    if (!quickRemarkText.trim()) return;
    setBusy(true);
    try {
      await api.addFollowUp(id, {
        method: 'Phone',
        notes: quickRemarkText.trim(),
        outcome: 'Working',
        nextDate: quickNextDate || undefined
      });
      const updated = await api.updateLead(id, {
        notes: quickRemarkText.trim(),
        next_follow_up_date: quickNextDate || undefined
      });
      dispatch({ type: 'UPDATE_LEAD', payload: { id, data: updated } });
      addToast('Remark saved and added to timeline!', 'success');
      setQuickRemarkText('');
      setQuickNextDate('');
    } catch (err) {
      addToast(err.message || 'Failed to save remark', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Lost Confirm
  const handleConfirmLost = async () => {
    setBusy(true);
    try {
      const combinedReason = `${lostReason}${lostNotes ? ': ' + lostNotes.trim() : ''}`;
      const updated = await api.updateLead(id, {
        status: 'Lost',
        lost_reason: combinedReason,
        qualification_reason: combinedReason
      });
      dispatch({ type: 'UPDATE_LEAD', payload: { id, data: updated } });
      setShowLostModal(false);
      addToast(`Lead marked as Lost (${lostReason})`, 'info');
    } catch (err) {
      addToast(err.message || 'Failed to mark as lost', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Persist an assignment change (owner / assigned_to) to the server.
  const handleAssign = useCallback(async (payload) => {
    setBusy(true);
    try {
      const updated = await api.assignLead(id, payload);
      dispatch({ type: 'UPDATE_LEAD', payload: { id, data: updated } });
      addToast('Lead assignment updated', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update assignment', 'error');
    } finally {
      setBusy(false);
    }
  }, [id, dispatch, addToast]);

  const handleSendComm = (templateName, body) => {
    dispatch({ type: 'LOG_COMMUNICATION', payload: { leadId: id, comm: { id: Date.now(), type: showTemplates, template: templateName, status: 'Sent', sentAt: new Date().toISOString(), to: showTemplates === 'Email' ? lead.email : lead.mobile, body } } });
    dispatch({ type: 'ADD_ACTIVITY', payload: { leadId: id, activity: { id: Date.now(), date: new Date().toISOString(), text: `${showTemplates} sent: ${templateName}`, user: state.currentUser?.name } } });
    setShowTemplates(null);
    addToast(`${showTemplates} sent successfully (${templateName})`, 'success');
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
    if (newStatus === 'Lost') {
      setShowLostModal(true);
      return;
    }
    if (newStatus === 'Converted') {
      handleConvertToOpportunity();
      return;
    }
    if (!allowedNext.includes(newStatus)) {
      addToast(`Cannot move from "${lead.status}" to "${newStatus}".`, 'error');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.updateLead(id, { status: newStatus });
      dispatch({ type: 'UPDATE_LEAD', payload: { id, data: updated } });
      addToast(`Status updated to "${newStatus}"`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    } finally {
      setBusy(false);
    }
  };

  const priorityColor = { Hot: 'var(--color-red)', Normal: 'var(--primary)', Cold: 'var(--text-muted)' };

  // User-name options for the pickers (active users + whoever is already set).
  const names = Array.from(new Set([
    ...(state.users || []).filter(u => !u.status || u.status === 'Active').map(u => u.name),
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
          addToast(`Opportunity ${o?.opp_code || ''} ready. Opening deal pipeline.`, 'success');
          navigate('/opportunities');
        }}
      />

      {/* Lost Reason Modal */}
      {showLostModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowLostModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content card" style={{ maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ marginBottom: 10, color: '#E53935', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiXCircle /> Mark Inquiry as Lost
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Record why this inquiry was not closed. This helps in pipeline auditing and future re-targeting.
            </p>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Primary Lost Reason*</label>
              <select 
                value={lostReason} 
                onChange={(e) => setLostReason(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <option>Price too high / Budget issue</option>
                <option>Went with competitor (Other Agency/OTA)</option>
                <option>Trip cancelled / postponed</option>
                <option>No response after multiple calls</option>
                <option>Visa rejection / Documentation issue</option>
                <option>Flight/Hotel sold out or dates not matching</option>
                <option>Other reason</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Additional Counselor Notes</label>
              <textarea
                rows={3}
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                placeholder="e.g. Discussed with client, booked elsewhere for ₹10k less..."
                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setShowLostModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmLost} style={{ background: '#E53935', borderColor: '#E53935' }}>
                Confirm &amp; Mark as Lost
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button className="btn btn-outline btn-danger" onClick={() => setShowLostModal(true)} style={{ color: '#E53935', borderColor: '#E53935' }}>
              <FiXCircle /> Mark Lost
            </button>
          </div>
        </div>

        {/* Owner & assignment */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '12px 0' }}>
          <PersonPicker label="Owner" icon={<FiUserCheck size={13} style={{ marginRight: 3 }} />} value={lead.owner} field="owner" />
          <PersonPicker label="Assigned to" icon={<FiUser size={13} style={{ marginRight: 3 }} />} value={lead.assigned_to} field="assigned_to" />
          {isConverted && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(read-only — lead converted)</span>}
        </div>

        {/* Dedicated Quick Remarks Box (Requirement 9) */}
        <div className="card" style={{ padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 8, margin: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
              <FiMessageSquare color="var(--primary)" /> Counselor Remarks &amp; Process Update
            </span>
            {lead.next_follow_up_date && (
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                Next Follow-Up: {new Date(lead.next_follow_up_date).toLocaleDateString()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <textarea
              value={quickRemarkText}
              onChange={(e) => setQuickRemarkText(e.target.value)}
              placeholder="Enter current remark (e.g. Called client, agreed on hotel rate, sent revised quotation)..."
              rows={2}
              style={{ flex: '1 1 320px', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
              <input
                type="datetime-local"
                value={quickNextDate}
                onChange={(e) => setQuickNextDate(e.target.value)}
                title="Schedule Next Follow-Up"
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.78rem' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveQuickRemark}
                disabled={busy || !quickRemarkText.trim()}
                style={{ justifyContent: 'center' }}>
                <FiSave size={13} /> Save Remark
              </button>
            </div>
          </div>
          {lead.notes && (
            <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong>Latest Remark:</strong> {lead.notes}
            </div>
          )}
        </div>

        {/* Accidental Qualified safeguard banner (Requirement 6) */}
        {lead.status === 'Qualified' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 152, 70, 0.08)', border: '1px solid #009846', padding: '10px 16px', borderRadius: 8, margin: '10px 0' }}>
            <div>
              <strong style={{ color: '#009846', fontSize: '0.88rem' }}>✓ Lead is Qualified</strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                You can convert this lead to a deal or undo if clicked accidentally.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={handleConvertToOpportunity}>
                <FiTarget /> Convert to Deal
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => changeStatus('Working')} title="Undo and move back to Working">
                <FiRotateCcw /> Undo to Working
              </button>
            </div>
          </div>
        )}

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
