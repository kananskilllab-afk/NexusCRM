import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiPlus, FiCalendar, FiUser, FiSearch, FiTrendingUp, FiTarget, FiAward, FiLayers,
} from 'react-icons/fi';
import { api } from '../../services/api';
import OpportunityModal from './OpportunityModal';
import '../voyage/pipeline/PipelineBoard.css';

// §5.1 seven-stage pipeline with column accents.
const STAGE_COLORS = {
  'Qualification': '#00A0E3',
  'Itinerary': '#0E8BD4',
  'Quote Sent': '#E19D19',
  'Negotiation': '#EF7F1A',
  'Verbal Confirm': '#7E57C2',
  'Closed-Won': '#009846',
  'Closed-Lost': '#E53935',
};

// §5.5 fixed loss-reason picklist (mandatory on Closed-Lost).
const LOSS_REASONS = ['Price', 'Timing', 'Went with competitor', 'Plan cancelled', 'No response', 'Budget'];

// Prompt for a valid loss reason; returns null if cancelled.
const promptLossReason = () => {
  const menu = LOSS_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n');
  const ans = window.prompt(`Reason for marking this opportunity Closed-Lost?\n\n${menu}\n\nEnter a number (1-${LOSS_REASONS.length}):`);
  if (ans === null) return null;
  const idx = parseInt(ans, 10) - 1;
  return LOSS_REASONS[idx] || LOSS_REASONS.find((r) => r.toLowerCase() === ans.trim().toLowerCase()) || null;
};

const formatMoney = (v = 0) => `₹${Math.round(v || 0).toLocaleString('en-IN')}`;
const formatCompact = (v = 0) => {
  const n = Math.round(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null);
const priorityClass = (p) => `priority-${(p || 'Normal') === 'Hot' ? 'high' : (p === 'Cold' ? 'low' : 'medium')}`;

const OpportunitiesBoard = () => {
  const location = useLocation();
  const [stages, setStages] = useState([]);
  const [opps, setOpps] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [modal, setModal] = useState({ open: false, mode: 'create', opp: null });

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.getOpportunityBoard();
      setStages(res.stages || []);
      const flat = Object.values(res.columns || {}).flat();
      setOpps(flat);
      setMetrics(res.metrics || null);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Auto-open a specific opportunity when navigated from a lead's "Linked Opportunity"
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    const openId = params.get('open');
    if (!openId) return;
    const target = opps.find((o) => o.id === openId);
    if (target) setModal({ open: true, mode: 'edit', opp: target });
  }, [loading, location.search, opps]);

  const oppsByStage = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = {};
    stages.forEach((s) => { map[s.name] = []; });
    opps.forEach((o) => {
      if (q && !(`${o.name || ''} ${o.customer_name} ${o.destination} ${o.opp_code}`.toLowerCase().includes(q))) return;
      if (map[o.stage]) map[o.stage].push(o);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => (a.board_position || 0) - (b.board_position || 0)));
    return map;
  }, [opps, stages, search]);

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const onDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const computePosition = (list, insertIndex) => {
    const siblings = list.filter((o) => o.id !== draggedId);
    const prev = siblings[insertIndex - 1];
    const next = siblings[insertIndex];
    if (!prev && !next) return 0;
    if (!prev) return (next.board_position || 0) - 1;
    if (!next) return (prev.board_position || 0) + 1;
    return ((prev.board_position || 0) + (next.board_position || 0)) / 2;
  };

  const moveCard = async (id, targetStage, position) => {
    const moved = opps.find((o) => o.id === id);
    if (!moved) return;

    let lost_reason;
    if (targetStage === 'Closed-Lost' && moved.stage !== 'Closed-Lost') {
      lost_reason = promptLossReason();
      if (!lost_reason) return; // cancelled or invalid — abort the move
    }

    setOpps((prev) => prev.map((o) =>
      o.id === id ? { ...o, stage: targetStage, board_position: position } : o));

    try {
      await api.moveOpportunityStage(id, targetStage, { board_position: position, lost_reason });
      fetchBoard();
    } catch (err) {
      // Surface gating / validation messages (e.g. "add a line item before Quote Sent").
      alert(err.message || 'Failed to move opportunity');
      fetchBoard(); // revert the optimistic move
    }
  };

  const onDropToColumn = (e, stageName) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedId) return;
    const list = oppsByStage[stageName] || [];
    moveCard(draggedId, stageName, computePosition(list, list.length));
    setDraggedId(null);
  };

  const onDropOnCard = (e, stageName, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStage(null);
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return; }
    const list = oppsByStage[stageName] || [];
    const idx = list.findIndex((o) => o.id === targetId);
    moveCard(draggedId, stageName, computePosition(list, idx));
    setDraggedId(null);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveOpp = async (payload) => {
    if (modal.mode === 'edit') await api.updateOpportunity(modal.opp.id, payload);
    else await api.createOpportunity(payload);
    await fetchBoard();
  };

  const deleteOpp = async (opp) => {
    if (!window.confirm(`Delete opportunity ${opp.opp_code}? This cannot be undone.`)) return;
    try {
      await api.deleteOpportunity(opp.id);
      setModal({ open: false, mode: 'create', opp: null });
      await fetchBoard();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading opportunities…</div>;

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <div>
          <h2>Opportunities</h2>
          <p>Qualified leads become deals here. Drag across stages to update; click a card to edit.</p>
        </div>
        <div className="pipeline-actions">
          <div className="pipeline-search">
            <FiSearch color="var(--text-muted)" />
            <input placeholder="Search deals…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', opp: null })}>
            <FiPlus /> New Opportunity
          </button>
        </div>
      </div>

      {metrics && (
        <div className="pipeline-metrics">
          <div className="metric-card">
            <div className="metric-label"><FiLayers style={{ verticalAlign: '-2px' }} /> Open Deals</div>
            <div className="metric-value">{metrics.open_count}</div>
            <div className="metric-sub">{formatCompact(metrics.open_value)} total value</div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><FiTrendingUp style={{ verticalAlign: '-2px' }} /> Weighted Forecast</div>
            <div className="metric-value">{formatCompact(metrics.weighted_forecast)}</div>
            <div className="metric-sub">probability-adjusted</div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><FiAward style={{ verticalAlign: '-2px' }} /> Won</div>
            <div className="metric-value">{formatCompact(metrics.won_value)}</div>
            <div className="metric-sub">{metrics.won_count} deal(s)</div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><FiTarget style={{ verticalAlign: '-2px' }} /> Win Rate</div>
            <div className="metric-value">{metrics.win_rate}%</div>
            <div className="metric-sub">avg deal {formatCompact(metrics.avg_deal)}</div>
          </div>
        </div>
      )}

      <div className="pipeline-board">
        {stages.map((stage) => {
          const list = oppsByStage[stage.name] || [];
          const color = STAGE_COLORS[stage.name] || '#284695';
          const stageValue = list.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

          return (
            <div
              key={stage.name}
              className={`pipeline-column ${dragOverStage === stage.name ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.name); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverStage(null); }}
              onDrop={(e) => onDropToColumn(e, stage.name)}
            >
              <div className="column-header">
                <div className="column-header-top">
                  <span className="column-title" title={stage.guidance || ''}>
                    <span className="column-dot" style={{ background: color }} />
                    {stage.name}
                    <span className="column-count">{list.length}</span>
                  </span>
                </div>
                <div className="column-meta">
                  <span>{formatCompact(stageValue)}</span>
                  <span className="column-prob-badge">{stage.probability}%</span>
                </div>
              </div>

              <div className="column-body">
                {list.map((o) => (
                  <div
                    key={o.id}
                    className={`deal-card ${draggedId === o.id ? 'dragging' : ''}`}
                    style={{ borderLeftColor: color }}
                    draggable
                    onDragStart={(e) => onDragStart(e, o.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDrop={(e) => onDropOnCard(e, stage.name, o.id)}
                    onClick={() => setModal({ open: true, mode: 'edit', opp: o })}
                  >
                    <span className={`priority-tag ${priorityClass(o.priority)}`}>{(o.priority || 'Normal').slice(0, 3)}</span>
                    {o.stale && (
                      <span title={`No activity for ${o.stale_days} days`}
                        style={{ float: 'right', color: '#E53935', fontSize: '0.7rem', fontWeight: 700 }}>
                        ● Stale {o.stale_days}d
                      </span>
                    )}
                    <div className="deal-title">{o.name || o.destination || o.customer_name}</div>
                    <div className="deal-client"><FiUser size={12} /> {o.customer_name} · {o.opp_code}</div>
                    <div className="deal-row">
                      <span className="deal-amount">{formatMoney(o.estimated_value)}</span>
                      {o.expected_close_date && (
                        <span className="deal-date"><FiCalendar size={12} /> {formatDate(o.expected_close_date)}</span>
                      )}
                    </div>
                    {typeof o.win_likelihood === 'number' && o.status === 'Open' && (
                      <div title="Predicted win likelihood"
                        style={{ marginTop: 4, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Win {o.win_likelihood}%
                      </div>
                    )}
                  </div>
                ))}
                {list.length === 0 && <div className="column-empty">Drop deals here</div>}
              </div>
            </div>
          );
        })}
      </div>

      <OpportunityModal
        isOpen={modal.open}
        mode={modal.mode}
        opp={modal.opp}
        onClose={() => setModal({ open: false, mode: 'create', opp: null })}
        onSave={saveOpp}
        onDelete={deleteOpp}
      />
    </div>
  );
};

export default OpportunitiesBoard;
