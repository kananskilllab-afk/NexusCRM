import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiPlus, FiUser, FiMail, FiPhone, FiMapPin, FiTag, FiCalendar, FiTarget,
} from 'react-icons/fi';
import { api } from '../../services/api';
import OpportunityModal from '../opportunities/OpportunityModal';

const STAGE_COLORS = {
  Inquiry: '#00A0E3',
  Quoted: '#E19D19',
  Negotiation: '#EF7F1A',
  Won: '#009846',
  Lost: '#E53935',
};

const formatMoney = (v = 0) => `₹${Math.round(v || 0).toLocaleString('en-IN')}`;
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [opps, setOpps] = useState([]);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [c, o] = await Promise.all([
        api.getCustomer(id),
        api.getCustomerOpportunities(id),
      ]);
      setCustomer(c);
      setOpps(o);
    } catch (err) {
      console.error('Failed to load customer:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveOpp = async (payload) => {
    await api.createOpportunityForCustomer(id, payload);
    await fetchAll();
    setTab('opportunities');
  };

  if (loading) return <div style={{ padding: 20 }}>Loading customer…</div>;
  if (!customer) return <div style={{ padding: 20 }}>Customer not found.</div>;

  const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  const totalValue = opps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

  return (
    <div className="lead-list-container">
      <div className="card" style={{ marginBottom: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/customers')} style={{ marginBottom: 12 }}>
          <FiArrowLeft /> Back to Customers
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 600 }}>
              {(customer.first_name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{fullName || 'Customer'}</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {customer.customer_type || 'Individual'} · {customer.city || 'No location'}
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <FiPlus /> New Opportunity
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          {['profile', 'opportunities'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '14px 22px', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: 600, textTransform: 'capitalize',
                color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              }}
            >
              {t === 'opportunities' ? `Opportunities (${opps.length})` : 'Profile'}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {tab === 'profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <Field icon={<FiUser />} label="Full Name" value={fullName} />
              <Field icon={<FiMail />} label="Email" value={customer.email} />
              <Field icon={<FiPhone />} label="Mobile" value={customer.mobile || customer.phone} />
              <Field icon={<FiMapPin />} label="City" value={customer.city} />
              <Field icon={<FiTag />} label="Source" value={customer.source} />
              <Field icon={<FiTarget />} label="Lead Score" value={customer.lead_score ?? 0} />
              <Field icon={<FiCalendar />} label="Created" value={formatDate(customer.created_at)} />
              <Field icon={<FiTag />} label="Loyalty Points" value={`${customer.loyalty_points || 0} pts`} />
            </div>
          )}

          {tab === 'opportunities' && (
            <div>
              <div style={{ marginBottom: 14, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {opps.length} opportunity(ies) · {formatMoney(totalValue)} total value
              </div>
              {opps.length === 0 ? (
                <div className="empty-state">
                  <FiTarget size={42} color="#ccc" />
                  <h3>No opportunities yet</h3>
                  <p>Create one for a package or service this customer is taking.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {opps.map((o) => (
                    <div
                      key={o.id}
                      className="card"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', borderLeft: `4px solid ${STAGE_COLORS[o.stage] || '#284695'}` }}
                      onClick={() => navigate('/opportunities')}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{o.name || o.destination || 'Opportunity'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {o.opp_code} · {(o.line_items || []).length} item(s)
                          {o.expected_close_date ? ` · closes ${formatDate(o.expected_close_date)}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatMoney(o.estimated_value)}</div>
                        <span className="badge" style={{ background: STAGE_COLORS[o.stage] || '#284695', color: 'white', fontSize: '0.7rem' }}>{o.stage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <OpportunityModal
        isOpen={modalOpen}
        mode="create"
        customer={customer}
        onClose={() => setModalOpen(false)}
        onSave={saveOpp}
      />
    </div>
  );
};

const Field = ({ icon, label, value }) => (
  <div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      {icon} {label}
    </div>
    <div style={{ fontWeight: 500 }}>{value || '—'}</div>
  </div>
);

export default CustomerDetail;
