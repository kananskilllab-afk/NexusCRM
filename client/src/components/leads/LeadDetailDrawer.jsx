import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FiX, FiMail, FiPhone, FiMessageSquare, FiPlusCircle,
  FiFileText, FiAlertCircle, FiExternalLink,
} from 'react-icons/fi';
import { StatusPill } from '../ui';
import { api } from '../../services/api';
import './LeadDetailDrawer.css';

const ACTIVITY_ICONS = {
  Note:     { Icon: FiFileText,    cls: 'ldd-tl-dot--note'   },
  Email:    { Icon: FiMail,        cls: 'ldd-tl-dot--email'  },
  Call:     { Icon: FiPhone,       cls: 'ldd-tl-dot--call'   },
  System:   { Icon: FiAlertCircle, cls: 'ldd-tl-dot--system' },
  WhatsApp: { Icon: FiMessageSquare, cls: 'ldd-tl-dot--call' },
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMins < 1)    return 'just now';
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
};

const ScoreBar = ({ score = 0 }) => {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70 ? 'var(--kanan-green)' :
    pct >= 50 ? 'var(--kanan-gold)'  :
    'var(--kanan-red)';
  return (
    <div className="ldd-score-section">
      <div className="ldd-score-label-row">
        <span className="ldd-score-label">Lead Score</span>
        <span className="ldd-score-value" style={{ color }}>{pct} / 100</span>
      </div>
      <div className="ldd-score-track">
        <div
          className="ldd-score-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          }}
        />
      </div>
    </div>
  );
};

const InfoGrid = ({ lead }) => {
  const items = [
    { key: 'Source',      val: lead.lead_source     },
    { key: 'Type',        val: Array.isArray(lead.enquiry_types) ? lead.enquiry_types.join(', ') : lead.enquiry_types },
    { key: 'Destination', val: lead.destination     },
    { key: 'Agent',       val: lead.assigned_to     },
    { key: 'Mobile',      val: lead.mobile          },
    { key: 'Email',       val: lead.email           },
    { key: 'Budget',      val: lead.budget_range    },
    { key: 'Travel Date', val: lead.travel_start_date },
  ];
  return (
    <>
      <p className="ldd-section-title">Lead Information</p>
      <div className="ldd-info-grid">
        {items.map(({ key, val }) => (
          <div key={key} className="ldd-info-item">
            <div className="ldd-info-key">{key}</div>
            <div className="ldd-info-val">{val || '—'}</div>
          </div>
        ))}
      </div>
    </>
  );
};

const Timeline = ({ activities = [] }) => {
  if (activities.length === 0) {
    return (
      <>
        <p className="ldd-section-title">Activity Timeline</p>
        <p className="ldd-tl-empty">No activity recorded yet.</p>
      </>
    );
  }
  return (
    <>
      <p className="ldd-section-title">Activity Timeline</p>
      <div className="ldd-timeline">
        {activities.map((act) => {
          const meta = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.Note;
          const { Icon, cls } = meta;
          return (
            <div key={act.id} className="ldd-tl-item">
              <div className={`ldd-tl-dot ${cls}`}>
                <Icon size={12} />
              </div>
              <div className="ldd-tl-body">
                <p className="ldd-tl-text">{act.text}</p>
                <div className="ldd-tl-meta">
                  {act.user_name && (
                    <span className="ldd-tl-user">{act.user_name}</span>
                  )}
                  <span className="ldd-tl-time">{fmtTime(act.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const SkeletonBody = () => (
  <div style={{ paddingTop: 16 }}>
    {[100, 75, 50, 100, 60, 80].map((w, i) => (
      <div
        key={i}
        className="ldd-skeleton ldd-sk-row"
        style={{ width: `${w}%` }}
      />
    ))}
  </div>
);

const LeadDetailDrawer = ({ lead: initialLead, onClose }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Fetch full lead detail (with activities, followUps, etc.)
  useEffect(() => {
    if (!initialLead?.id) return;
    let alive = true;
    setLoadingDetail(true);
    setDetail(null);
    api.getLead(initialLead.id)
      .then(d => { if (alive) { setDetail(d); setLoadingDetail(false); } })
      .catch(() => { if (alive) { setDetail(initialLead); setLoadingDetail(false); } });
    return () => { alive = false; };
  }, [initialLead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const lead = detail || initialLead;
  const fullName = `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || 'Unknown';

  const handleEmail = useCallback(() => {
    if (lead?.email) window.location.href = `mailto:${lead.email}`;
  }, [lead?.email]);

  const handleCall = useCallback(() => {
    if (lead?.mobile) window.location.href = `tel:${lead.mobile}`;
  }, [lead?.mobile]);

  const handleWhatsApp = useCallback(() => {
    const num = lead?.mobile?.replace(/\D/g, '');
    if (num) window.open(`https://wa.me/91${num}`, '_blank', 'noopener');
  }, [lead?.mobile]);

  const handleViewFull = useCallback(() => {
    onClose();
    navigate(`/leads/${lead?.id}`);
  }, [navigate, onClose, lead?.id]);

  return ReactDOM.createPortal(
    <>
      <div className="ldd-backdrop" onClick={onClose} aria-hidden="true" />

      <aside className="ldd-panel" role="dialog" aria-modal="true" aria-label={`Lead details — ${fullName}`}>
        {/* Header */}
        <div className="ldd-header">
          <div className="ldd-header-meta">
            <div className="ldd-lead-code">{lead?.lead_code || lead?.id || '—'}</div>
            <div className="ldd-contact-name">{fullName}</div>
          </div>
          <StatusPill status={lead?.status || 'New'} size="sm" />
          <button
            className="ldd-full-btn"
            onClick={handleViewFull}
            title="Open full lead detail"
            aria-label="View full profile"
          >
            <FiExternalLink size={14} />
          </button>
          <button className="ldd-close-btn" onClick={onClose} aria-label="Close panel">
            <FiX size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="ldd-body">
          {/* Action buttons */}
          <div className="ldd-actions">
            <button className="ldd-action-btn ldd-action-btn--email" onClick={handleEmail}>
              <FiMail size={13} /> Email
            </button>
            <button className="ldd-action-btn" onClick={handleCall}>
              <FiPhone size={13} /> Call
            </button>
            <button className="ldd-action-btn ldd-action-btn--whatsapp" onClick={handleWhatsApp}>
              <FiMessageSquare size={13} /> WhatsApp
            </button>
            <button className="ldd-action-btn ldd-action-btn--primary">
              <FiPlusCircle size={13} /> New Booking
            </button>
          </div>

          {/* Score bar */}
          <ScoreBar score={lead?.lead_score || 0} />

          {loadingDetail ? (
            <SkeletonBody />
          ) : (
            <>
              <InfoGrid lead={lead} />
              <Timeline activities={detail?.activities || []} />
            </>
          )}

          {/* Full profile link */}
          <button className="ldd-view-full-btn" onClick={handleViewFull}>
            <FiExternalLink size={13} /> View Full Profile (all tabs)
          </button>
        </div>
      </aside>
    </>,
    document.body
  );
};

export default LeadDetailDrawer;
