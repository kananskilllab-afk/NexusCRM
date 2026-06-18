import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiPlus, FiMoreVertical, FiCalendar, FiUser, FiEdit2, FiTrash2,
  FiChevronLeft, FiChevronRight, FiSearch, FiTrendingUp, FiTarget, FiAward, FiLayers,
} from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';
import EnquiryModal from './EnquiryModal';
import StageModal from './StageModal';
import './PipelineBoard.css';

// ── formatting helpers ──────────────────────────────────────────────────────
const formatMoney = (cents = 0) => `₹${Math.round((cents || 0) / 100).toLocaleString('en-IN')}`;
const formatCompact = (cents = 0) => {
  const v = Math.round((cents || 0) / 100);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
};
const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const PipelineBoard = () => {
  const [stages, setStages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  // modal state
  const [enquiryModal, setEnquiryModal] = useState({ open: false, mode: 'create', booking: null });
  const [stageModal, setStageModal] = useState({ open: false, mode: 'create', stage: null });

  const fetchBoard = useCallback(async () => {
    try {
      const res = await voyageApi.getPipeline();
      setStages(res.stages || []);
      setBookings(res.bookings || []);
      setMetrics(res.metrics || null);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Close any open column menu on outside click.
  useEffect(() => {
    if (openMenu == null) return undefined;
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenu]);

  const orderedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  // Bookings grouped by stage, filtered by search, ordered by board_position.
  const bookingsByStage = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = {};
    orderedStages.forEach((s) => { map[s.id] = []; });
    bookings.forEach((b) => {
      if (q && !(`${b.destination} ${b.contact_name}`.toLowerCase().includes(q))) return;
      if (map[b.stage_id]) map[b.stage_id].push(b);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => (a.board_position || 0) - (b.board_position || 0)));
    return map;
  }, [bookings, orderedStages, search]);

  // ── Drag & drop ─────────────────────────────────────────────────────────
  const onDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  // Compute a board_position that slots the card at `insertIndex` within a
  // column, using midpoints so sibling cards never need rewriting.
  const computePosition = (list, insertIndex) => {
    const siblings = list.filter((b) => b.id !== draggedId);
    const prev = siblings[insertIndex - 1];
    const next = siblings[insertIndex];
    if (!prev && !next) return 0;
    if (!prev) return (next.board_position || 0) - 1;
    if (!next) return (prev.board_position || 0) + 1;
    return ((prev.board_position || 0) + (next.board_position || 0)) / 2;
  };

  const moveCard = async (bookingId, targetStageId, position) => {
    const stage = stages.find((s) => s.id === targetStageId);
    const moved = bookings.find((b) => b.id === bookingId);
    if (!moved) return;

    let lost_reason;
    if (stage && stage.is_closed_lost && (!moved.stage_id || moved.stage_id !== targetStageId)) {
      lost_reason = window.prompt('Reason for marking this deal as lost? (optional)') || undefined;
    }

    // Optimistic update.
    setBookings((prev) => prev.map((b) =>
      b.id === bookingId ? { ...b, stage_id: targetStageId, board_position: position } : b));

    try {
      await voyageApi.updateBookingStage(bookingId, targetStageId, { board_position: position, lost_reason });
      fetchBoard(); // reconcile positions + metrics
    } catch (err) {
      console.error('Failed to move card:', err);
      fetchBoard(); // revert
    }
  };

  const onDropToColumn = (e, stageId) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedId) return;
    const list = bookingsByStage[stageId] || [];
    const position = computePosition(list, list.length); // append at end
    moveCard(draggedId, stageId, position);
    setDraggedId(null);
  };

  const onDropOnCard = (e, stageId, targetCardId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStage(null);
    if (!draggedId || draggedId === targetCardId) { setDraggedId(null); return; }
    const list = bookingsByStage[stageId] || [];
    const idx = list.findIndex((b) => b.id === targetCardId);
    const position = computePosition(list, idx);
    moveCard(draggedId, stageId, position);
    setDraggedId(null);
  };

  // ── Stage CRUD ────────────────────────────────────────────────────────────
  const saveStage = async (data) => {
    if (stageModal.mode === 'edit') {
      await voyageApi.updateStage(stageModal.stage.id, data);
    } else {
      await voyageApi.createStage(data);
    }
    await fetchBoard();
  };

  const deleteStage = async (stage) => {
    const count = (bookingsByStage[stage.id] || []).length;
    const msg = count > 0
      ? `Delete "${stage.name}"? Its ${count} deal(s) will move to the first remaining stage.`
      : `Delete the "${stage.name}" stage?`;
    if (!window.confirm(msg)) return;
    try {
      await voyageApi.deleteStage(stage.id);
      await fetchBoard();
    } catch (err) {
      alert(err.message);
    }
  };

  const reorderStage = async (stage, direction) => {
    const ids = orderedStages.map((s) => s.id);
    const idx = ids.indexOf(stage.id);
    const swap = idx + direction;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    // optimistic position update
    setStages((prev) => prev.map((s) => ({ ...s, position: ids.indexOf(s.id) + 1 })));
    try {
      await voyageApi.reorderStages(ids);
      fetchBoard();
    } catch (err) {
      fetchBoard();
    }
  };

  // ── Booking CRUD ────────────────────────────────────────────────────────────
  const saveEnquiry = async (payload) => {
    if (enquiryModal.mode === 'edit') {
      await voyageApi.updateBooking(enquiryModal.booking.id, payload);
    } else {
      await voyageApi.createBooking(payload);
    }
    await fetchBoard();
  };

  const deleteBooking = async (booking) => {
    if (!window.confirm(`Delete "${booking.destination}"? This cannot be undone.`)) return;
    try {
      await voyageApi.deleteBooking(booking.id);
      setEnquiryModal({ open: false, mode: 'create', booking: null });
      await fetchBoard();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading pipeline…</div>;

  return (
    <div className="pipeline-page">
      {/* Header */}
      <div className="pipeline-header">
        <div>
          <h2>Sales Pipeline</h2>
          <p>Drag deals across stages. Click a card to edit. Manage stages from the column menu.</p>
        </div>
        <div className="pipeline-actions">
          <div className="pipeline-search">
            <FiSearch color="var(--text-muted)" />
            <input placeholder="Search deals…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary"
            onClick={() => setEnquiryModal({ open: true, mode: 'create', booking: null })}>
            <FiPlus /> New Enquiry
          </button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="pipeline-metrics">
          <div className="metric-card">
            <div className="metric-label"><FiLayers style={{ verticalAlign: '-2px' }} /> Open Deals</div>
            <div className="metric-value">{metrics.open_count}</div>
            <div className="metric-sub">{formatCompact(metrics.open_value_cents)} total value</div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><FiTrendingUp style={{ verticalAlign: '-2px' }} /> Weighted Forecast</div>
            <div className="metric-value">{formatCompact(metrics.weighted_forecast_cents)}</div>
            <div className="metric-sub">probability-adjusted</div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><FiAward style={{ verticalAlign: '-2px' }} /> Won</div>
            <div className="metric-value">{formatCompact(metrics.won_value_cents)}</div>
            <div className="metric-sub">{metrics.won_count} deal(s)</div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><FiTarget style={{ verticalAlign: '-2px' }} /> Win Rate</div>
            <div className="metric-value">{metrics.win_rate}%</div>
            <div className="metric-sub">avg deal {formatCompact(metrics.avg_deal_cents)}</div>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="pipeline-board">
        {orderedStages.map((stage, stageIdx) => {
          const list = bookingsByStage[stage.id] || [];
          const stageValue = list.reduce((sum, b) => sum + (b.total_sell_cents || 0), 0);
          const overWip = stage.wip_limit > 0 && list.length > stage.wip_limit;

          return (
            <div
              key={stage.id}
              className={`pipeline-column ${dragOverStage === stage.id ? 'drag-over' : ''} ${overWip ? 'over-wip' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverStage(null); }}
              onDrop={(e) => onDropToColumn(e, stage.id)}
            >
              <div className="column-header" style={{ borderBottomColor: '#000' }}>
                <div className="column-header-top">
                  <span className="column-title">
                    <span className="column-dot" style={{ background: stage.color }} />
                    {stage.name}
                    <span className="column-count">{list.length}</span>
                  </span>
                  <div style={{ position: 'relative' }}>
                    <button className="column-menu-btn"
                      onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === stage.id ? null : stage.id); }}>
                      <FiMoreVertical />
                    </button>
                    {openMenu === stage.id && (
                      <div className="column-menu" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setStageModal({ open: true, mode: 'edit', stage }); setOpenMenu(null); }}>
                          <FiEdit2 /> Edit stage
                        </button>
                        <button disabled={stageIdx === 0} onClick={() => { reorderStage(stage, -1); setOpenMenu(null); }}>
                          <FiChevronLeft /> Move left
                        </button>
                        <button disabled={stageIdx === orderedStages.length - 1} onClick={() => { reorderStage(stage, 1); setOpenMenu(null); }}>
                          <FiChevronRight /> Move right
                        </button>
                        <button className="danger" onClick={() => { deleteStage(stage); setOpenMenu(null); }}>
                          <FiTrash2 /> Delete stage
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="column-meta">
                  <span>{formatCompact(stageValue)}</span>
                  <span className="column-prob-badge">{stage.probability}%</span>
                  {overWip && <span className="column-wip-warn">WIP {list.length}/{stage.wip_limit}</span>}
                </div>
              </div>

              <div className="column-body">
                {list.map((b) => (
                  <div
                    key={b.id}
                    className={`deal-card ${draggedId === b.id ? 'dragging' : ''}`}
                    style={{ borderLeftColor: stage.color }}
                    draggable
                    onDragStart={(e) => onDragStart(e, b.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDrop={(e) => onDropOnCard(e, stage.id, b.id)}
                    onClick={() => setEnquiryModal({ open: true, mode: 'edit', booking: b })}
                  >
                    <span className={`priority-tag priority-${b.priority || 'medium'}`}>{(b.priority || 'med').slice(0, 3)}</span>
                    <div className="deal-title">{b.destination}</div>
                    <div className="deal-client"><FiUser size={12} /> {b.contact_name}</div>
                    <div className="deal-row">
                      <span className="deal-amount">{formatMoney(b.total_sell_cents)}</span>
                      {(b.expected_close_date || (b.travel_dates && b.travel_dates.start)) && (
                        <span className="deal-date">
                          <FiCalendar size={12} />
                          {formatDate(b.expected_close_date || b.travel_dates.start)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {list.length === 0 && <div className="column-empty">Drop deals here</div>}
              </div>
            </div>
          );
        })}

        {/* Add stage */}
        <div className="add-stage-column">
          <button className="add-stage-btn" onClick={() => setStageModal({ open: true, mode: 'create', stage: null })}>
            <FiPlus /> Add Stage
          </button>
        </div>
      </div>

      <EnquiryModal
        isOpen={enquiryModal.open}
        mode={enquiryModal.mode}
        booking={enquiryModal.booking}
        stages={orderedStages}
        onClose={() => setEnquiryModal({ open: false, mode: 'create', booking: null })}
        onSave={saveEnquiry}
        onDelete={deleteBooking}
      />

      <StageModal
        isOpen={stageModal.open}
        mode={stageModal.mode}
        stage={stageModal.stage}
        onClose={() => setStageModal({ open: false, mode: 'create', stage: null })}
        onSave={saveStage}
      />
    </div>
  );
};

export default PipelineBoard;
