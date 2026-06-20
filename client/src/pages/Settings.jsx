import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSettings, FiUsers, FiLayers, FiLink2, FiShield, FiCreditCard,
  FiSave, FiUserPlus, FiPlus, FiTrash2, FiCheck,
} from 'react-icons/fi';
import {
  DndContext, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatusPill, Button } from '../components/ui';
import { api } from '../services/api';
import './Settings.css';

// ── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'agency',       label: 'Agency',        icon: FiSettings   },
  { id: 'team',         label: 'Team',           icon: FiUsers      },
  { id: 'pipeline',     label: 'Pipeline',       icon: FiLayers     },
  { id: 'integrations', label: 'Integrations',   icon: FiLink2      },
  { id: 'privacy',      label: 'Data & Privacy', icon: FiShield     },
  { id: 'billing',      label: 'Billing',        icon: FiCreditCard },
];

// ── Default data ─────────────────────────────────────────────────────────────
const DEFAULT_AGENCY = {
  name:       'Kanan International',
  legal_name: 'Kanan International Pvt Ltd',
  gstin:      '24AABCK3843M1ZQ',
  address:    '301, Siddhi Vinayak Complex, RC Dutt Road, Vadodara — 390 007, Gujarat',
  phone:      '+91 265 234 5678',
  email:      'info@kanan.co',
  currency:   'INR',
  timezone:   'Asia/Kolkata',
};

// Stage colours per spec
const DEFAULT_STAGES = [
  { id: 's1', name: 'New Enquiry',  color: '#6B7280', probability: 10 },
  { id: 's2', name: 'Qualified',    color: '#E19D19', probability: 30 },
  { id: 's3', name: 'Quoted',       color: '#00A0E3', probability: 50 },
  { id: 's4', name: 'Negotiation',  color: '#EF7F1A', probability: 75 },
  { id: 's5', name: 'Confirmed',    color: '#009846', probability: 100 },
];

const INTEGRATIONS = [
  { id: 'whatsapp', name: 'WhatsApp Business', desc: 'Send messages and follow-ups via WhatsApp',   status: 'disconnected' },
  { id: 'gmail',    name: 'Gmail',             desc: 'Sync emails and send directly from the CRM',  status: 'connected'    },
  { id: 'zapier',   name: 'Zapier',            desc: 'Automate with 5,000+ apps via Zapier',        status: 'disconnected' },
  { id: 'razorpay', name: 'Razorpay',          desc: 'Accept online payments and track receipts',   status: 'disconnected' },
  { id: 'calendly', name: 'Calendly',          desc: 'Let clients book consultations automatically', status: 'disconnected' },
];

const PLAN_FEATURES = [
  '5 Users included',
  'Unlimited Leads & Contacts',
  'Pipeline, Bookings & Itinerary',
  'WhatsApp Integration',
  'Custom Reports & Export',
  'Priority Email & Chat Support',
];

const MOCK_TEAM = [
  { id: 1, name: 'Priya Mehta',  email: 'priya@kanan.co', role: 'Sales Manager',  status: 'Active'   },
  { id: 2, name: 'Rohan Shah',   email: 'rohan@kanan.co', role: 'Travel Advisor', status: 'Active'   },
  { id: 3, name: 'Anita Joshi',  email: 'anita@kanan.co', role: 'Travel Advisor', status: 'Active'   },
  { id: 4, name: 'Karan Patel',  email: 'karan@kanan.co', role: 'Back Office',    status: 'Inactive' },
];

// ── Helper: initials avatar ───────────────────────────────────────────────────
const Avatar = ({ name }) => (
  <div className="st-avatar" aria-hidden="true">
    {(name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
  </div>
);

// ── SortableStage ─────────────────────────────────────────────────────────────
const SortableStage = ({ stage, onChange, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`st-stage-row${isDragging ? ' st-stage-row--dragging' : ''}`}
    >
      <span className="st-stage-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        ⠿
      </span>
      <span className="st-stage-dot" style={{ background: stage.color }} />
      <input
        className="st-stage-name-input"
        value={stage.name}
        onChange={e => onChange(stage.id, 'name', e.target.value)}
        aria-label="Stage name"
      />
      <div className="st-stage-prob-wrap">
        <input
          type="number"
          className="st-stage-prob-input"
          value={stage.probability}
          min={0}
          max={100}
          onChange={e => onChange(stage.id, 'probability', Number(e.target.value))}
          aria-label="Win probability %"
        />
        <span className="st-stage-pct">%</span>
      </div>
      <button
        className="st-stage-del"
        onClick={() => onDelete(stage.id)}
        title="Delete stage"
        aria-label="Delete stage"
        disabled={DEFAULT_STAGES.length <= 1}
      >
        <FiTrash2 size={13} />
      </button>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const Settings = () => {
  const [activeTab, setActiveTab] = useState('agency');

  // Agency
  const [agency,       setAgency]       = useState(DEFAULT_AGENCY);
  const [agencySaving, setAgencySaving] = useState(false);
  const [agencyMsg,    setAgencyMsg]    = useState('');

  // Team
  const [team,      setTeam]      = useState(MOCK_TEAM);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState('Travel Advisor');
  const [inviting,    setInviting]    = useState(false);

  // Pipeline stages
  const [stages, setStages] = useState(DEFAULT_STAGES);

  // Integrations
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  // Load settings from API
  useEffect(() => {
    api.getSettings?.().then(data => {
      if (data?.agency) setAgency(prev => ({ ...prev, ...data.agency }));
      if (data?.stages) setStages(data.stages);
    }).catch(() => {});

    api.getTeam?.().then(data => {
      if (Array.isArray(data) && data.length) setTeam(data);
    }).catch(() => {});
  }, []);

  // ── Agency tab ────────────────────────────────────────────────────────────
  const handleAgencyChange = useCallback((field, value) => {
    setAgency(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAgencySave = useCallback(async () => {
    setAgencySaving(true);
    setAgencyMsg('');
    try {
      await (api.updateSettings?.({ agency }) || Promise.resolve());
      setAgencyMsg('Saved successfully.');
    } catch {
      setAgencyMsg('Failed to save. Please try again.');
    } finally {
      setAgencySaving(false);
      setTimeout(() => setAgencyMsg(''), 3000);
    }
  }, [agency]);

  // ── Team tab ──────────────────────────────────────────────────────────────
  const handleInvite = useCallback(async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await (api.inviteTeamMember?.({ email: inviteEmail, role: inviteRole }) || Promise.resolve());
      setTeam(prev => [...prev, {
        id:     Date.now(),
        name:   inviteEmail.split('@')[0],
        email:  inviteEmail,
        role:   inviteRole,
        status: 'Active',
      }]);
      setInviteEmail('');
    } catch {
      // invite failed silently
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteRole]);

  // ── Pipeline tab ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;
    setStages(prev => {
      const oldIdx = prev.findIndex(s => s.id === active.id);
      const newIdx = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, []);

  const handleStageChange = useCallback((id, field, value) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const handleStageDelete = useCallback((id) => {
    setStages(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleAddStage = useCallback(() => {
    setStages(prev => [...prev, {
      id:          `s_${Date.now()}`,
      name:        'New Stage',
      color:       '#8A90A6',
      probability: 20,
    }]);
  }, []);

  const handlePipelineSave = useCallback(async () => {
    setAgencySaving(true);
    try {
      await (api.updateSettings?.({ stages }) || Promise.resolve());
      setAgencyMsg('Pipeline saved.');
    } catch {
      setAgencyMsg('Failed to save pipeline.');
    } finally {
      setAgencySaving(false);
      setTimeout(() => setAgencyMsg(''), 3000);
    }
  }, [stages]);

  // ── Integrations ──────────────────────────────────────────────────────────
  const toggleIntegration = useCallback((id) => {
    setIntegrations(prev =>
      prev.map(i => i.id === id
        ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' }
        : i
      )
    );
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="st-page">
      {/* Left nav */}
      <aside className="st-sidebar">
        <p className="st-sidebar-heading">Settings</p>
        <nav aria-label="Settings navigation">
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`st-nav-item${activeTab === item.id ? ' st-nav-item--active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                <Icon size={15} className="st-nav-icon" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="st-content">
        {/* ── Agency ──────────────────────────────────────────── */}
        {activeTab === 'agency' && (
          <section>
            <h2 className="st-section-title">Agency Details</h2>
            <p className="st-section-sub">Your organisation's identity and contact information.</p>

            <div className="st-form-grid">
              {[
                { label: 'Agency Name',  field: 'name'       },
                { label: 'Legal Name',   field: 'legal_name' },
                { label: 'GSTIN',        field: 'gstin'      },
                { label: 'Phone',        field: 'phone'      },
                { label: 'Email',        field: 'email'      },
              ].map(({ label, field }) => (
                <div key={field} className="st-field">
                  <label className="st-label">{label}</label>
                  <input
                    className="st-input"
                    value={agency[field] || ''}
                    onChange={e => handleAgencyChange(field, e.target.value)}
                  />
                </div>
              ))}

              <div className="st-field st-field--full">
                <label className="st-label">Address</label>
                <textarea
                  className="st-input st-textarea"
                  rows={2}
                  value={agency.address || ''}
                  onChange={e => handleAgencyChange('address', e.target.value)}
                />
              </div>

              <div className="st-field">
                <label className="st-label">Currency</label>
                <select
                  className="st-input st-select"
                  value={agency.currency || 'INR'}
                  onChange={e => handleAgencyChange('currency', e.target.value)}
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="AED">AED — UAE Dirham</option>
                </select>
              </div>

              <div className="st-field">
                <label className="st-label">Timezone</label>
                <select
                  className="st-input st-select"
                  value={agency.timezone || 'Asia/Kolkata'}
                  onChange={e => handleAgencyChange('timezone', e.target.value)}
                >
                  <option value="Asia/Kolkata">IST — Asia/Kolkata</option>
                  <option value="Asia/Dubai">GST — Asia/Dubai</option>
                  <option value="Asia/Singapore">SGT — Asia/Singapore</option>
                  <option value="Europe/London">GMT — Europe/London</option>
                  <option value="America/New_York">EST — America/New_York</option>
                </select>
              </div>
            </div>

            <div className="st-actions">
              <Button variant="primary" size="sm" icon={<FiSave />} loading={agencySaving} onClick={handleAgencySave}>
                Save Changes
              </Button>
              {agencyMsg && (
                <span className={`st-msg${agencyMsg.includes('Failed') ? ' st-msg--err' : ''}`}>
                  {agencyMsg}
                </span>
              )}
            </div>
          </section>
        )}

        {/* ── Team ────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <section>
            <div className="st-section-header-row">
              <div>
                <h2 className="st-section-title">Team Members</h2>
                <p className="st-section-sub">{team.length} member{team.length !== 1 ? 's' : ''} in your workspace</p>
              </div>
            </div>

            {/* Invite form */}
            <form className="st-invite-form" onSubmit={handleInvite}>
              <input
                type="email"
                className="st-input st-invite-email"
                placeholder="colleague@email.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
                aria-label="Invite email"
              />
              <select
                className="st-input st-select st-invite-role"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                aria-label="Role"
              >
                {['Admin', 'Sales Manager', 'Travel Advisor', 'Back Office', 'Viewer'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <Button type="submit" variant="primary" size="sm" icon={<FiUserPlus />} loading={inviting}>
                Invite
              </Button>
            </form>

            {/* Member cards */}
            <div className="st-team-list">
              {team.map(member => (
                <div key={member.id} className="st-member-card">
                  <Avatar name={member.name} />
                  <div className="st-member-info">
                    <span className="st-member-name">{member.name}</span>
                    <span className="st-member-email">{member.email}</span>
                  </div>
                  <span className="st-member-role">{member.role}</span>
                  <StatusPill status={member.status} size="sm" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Pipeline ────────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <section>
            <h2 className="st-section-title">Pipeline Stages</h2>
            <p className="st-section-sub">Drag to reorder stages. Win probability is used for weighted forecasting.</p>

            <div className="st-stages-header">
              <span className="st-stages-col-label" style={{ flex: '0 0 28px' }} />
              <span className="st-stages-col-label" style={{ flex: '0 0 14px' }} />
              <span className="st-stages-col-label" style={{ flex: 1 }}>Stage Name</span>
              <span className="st-stages-col-label" style={{ width: 100 }}>Win %</span>
              <span className="st-stages-col-label" style={{ width: 32 }} />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {stages.map(stage => (
                  <SortableStage
                    key={stage.id}
                    stage={stage}
                    onChange={handleStageChange}
                    onDelete={handleStageDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="st-actions">
              <Button variant="ghost" size="sm" icon={<FiPlus />} onClick={handleAddStage}>
                Add Stage
              </Button>
              <Button variant="primary" size="sm" icon={<FiSave />} loading={agencySaving} onClick={handlePipelineSave}>
                Save Pipeline
              </Button>
              {agencyMsg && (
                <span className={`st-msg${agencyMsg.includes('Failed') ? ' st-msg--err' : ''}`}>
                  {agencyMsg}
                </span>
              )}
            </div>
          </section>
        )}

        {/* ── Integrations ─────────────────────────────────────── */}
        {activeTab === 'integrations' && (
          <section>
            <h2 className="st-section-title">Integrations</h2>
            <p className="st-section-sub">Connect NexusCRM with external tools and services.</p>

            <div className="st-integrations-list">
              {integrations.map(intg => (
                <div key={intg.id} className="st-integration-card">
                  <div className="st-integration-info">
                    <div className="st-integration-name">{intg.name}</div>
                    <div className="st-integration-desc">{intg.desc}</div>
                  </div>
                  <div className="st-integration-right">
                    <StatusPill status={intg.status === 'connected' ? 'Connected' : 'Disconnected'} size="sm" />
                    <Button
                      variant={intg.status === 'connected' ? 'ghost' : 'primary'}
                      size="sm"
                      onClick={() => toggleIntegration(intg.id)}
                    >
                      {intg.status === 'connected' ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Data & Privacy ───────────────────────────────────── */}
        {activeTab === 'privacy' && (
          <section>
            <h2 className="st-section-title">Data & Privacy</h2>
            <p className="st-section-sub">Manage data retention, exports, and compliance settings.</p>

            <div className="st-privacy-list">
              {[
                { label: 'Data Retention',       desc: 'Leads and contacts are retained for 3 years by default.',    action: 'Configure' },
                { label: 'Export All Data',       desc: 'Download a full CSV export of all your CRM data.',            action: 'Export'    },
                { label: 'Cookie Preferences',    desc: 'Control which cookies and tracking scripts are active.',      action: 'Manage'    },
                { label: 'Delete Account',        desc: 'Permanently delete your workspace and all associated data.',  action: 'Delete', danger: true },
              ].map(item => (
                <div key={item.label} className="st-privacy-item">
                  <div className="st-privacy-text">
                    <div className="st-privacy-label">{item.label}</div>
                    <div className="st-privacy-desc">{item.desc}</div>
                  </div>
                  <Button
                    variant={item.danger ? 'ghost' : 'ghost'}
                    size="sm"
                    className={item.danger ? 'st-btn-danger' : ''}
                  >
                    {item.action}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Billing ─────────────────────────────────────────── */}
        {activeTab === 'billing' && (
          <section>
            <h2 className="st-section-title">Billing & Plan</h2>
            <p className="st-section-sub">Manage your subscription and payment details.</p>

            {/* Plan card */}
            <div className="st-plan-card">
              <div className="st-plan-header">
                <div>
                  <div className="st-plan-name">Professional</div>
                  <div className="st-plan-price">₹4,999<span>/month</span></div>
                </div>
                <span className="st-plan-badge">Current Plan</span>
              </div>
              <ul className="st-plan-features">
                {PLAN_FEATURES.map(f => (
                  <li key={f}>
                    <FiCheck className="st-plan-check" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="st-plan-actions">
                <Button variant="ghost" size="sm">Change Plan</Button>
                <Button variant="ghost" size="sm">Download Invoice</Button>
              </div>
            </div>

            {/* Payment method */}
            <div className="st-payment-section">
              <h3 className="st-sub-heading">Payment Method</h3>
              <div className="st-payment-card">
                <FiCreditCard size={20} className="st-payment-icon" />
                <div>
                  <div className="st-payment-label">Visa ending in 4242</div>
                  <div className="st-payment-exp">Expires 08 / 2027</div>
                </div>
                <Button variant="ghost" size="sm" style={{ marginLeft: 'auto' }}>Update</Button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Settings;
