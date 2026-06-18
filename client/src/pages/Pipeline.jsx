import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FiSearch, FiUser, FiCalendar, FiFilter } from 'react-icons/fi';
import { SectionHeader } from '../components/ui';
import { voyageApi } from '../services/voyageApi';
import './Pipeline.css';

// ── Stage colour palette (positional — 0-indexed) ─────────────
const STAGE_COLORS = [
  '#8A90A6', // New Inquiry  — kanan-mute
  '#E19D19', // Qualified    — kanan-gold
  '#00A0E3', // Quoted       — kanan-sky
  '#EF7F1A', // Negotiation  — kanan-orange
  '#009846', // Confirmed    — kanan-green
];

const stageColor = (idx) => STAGE_COLORS[idx] ?? STAGE_COLORS[STAGE_COLORS.length - 1];

// ── Helpers ───────────────────────────────────────────────────
const fmtMoney = (cents = 0) => {
  const v = Math.round((cents || 0) / 100);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  : null;

const shortId = (id) => id ? `#${String(id).slice(-6).toUpperCase()}` : '—';

const departure = (dateStr) => {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
  if (days < 0)  return { label: 'Departed',  cls: 'past'   };
  if (days === 0) return { label: 'Today',     cls: 'soon'   };
  if (days <= 3)  return { label: `in ${days}d`, cls: 'soon' };
  if (days <= 14) return { label: `in ${days}d`, cls: 'near' };
  if (days < 60)  return { label: `in ${Math.ceil(days / 7)}w`, cls: 'near' };
  return { label: `in ${Math.ceil(days / 30)}mo`, cls: 'future' };
};

const SEGMENTS = ['✈', '🏨', '🧭', '🚗'];

// ── BookingCard (pure display, no DnD) ───────────────────────
const BookingCard = ({ booking, color, overlay = false }) => {
  const dep = departure(booking.travel_dates?.start);
  const travelDateStr = fmtDate(booking.travel_dates?.start);

  return (
    <div
      className={`kb-card${overlay ? ' kb-card--overlay' : ''}`}
      style={{ '--_stage-color': color }}
    >
      <div className="kb-card-top">
        <span className="kb-card-id">{shortId(booking.id)}</span>
        {booking.priority && booking.priority !== 'medium' && (
          <span className={`kb-priority-tag kb-priority-tag--${booking.priority}`}>
            {booking.priority}
          </span>
        )}
      </div>

      <div className="kb-card-destination">{booking.destination || 'Custom Trip'}</div>

      <div className="kb-card-contact">
        <FiUser size={11} />
        {booking.contact_name || '—'}
      </div>

      <div className="kb-segments">
        {SEGMENTS.map((s) => (
          <span key={s} className="kb-seg-icon">{s}</span>
        ))}
      </div>

      <div className="kb-card-footer">
        <span className="kb-card-value">{fmtMoney(booking.total_sell_cents)}</span>
        <div className="kb-card-right">
          {travelDateStr && (
            <span className="kb-card-dates">
              <FiCalendar size={10} /> {travelDateStr}
            </span>
          )}
          {dep && (
            <span className={`kb-card-countdown kb-card-countdown--${dep.cls}`}>
              {dep.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── SortableCard (wraps BookingCard with @dnd-kit) ────────────
const SortableCard = ({ booking, color }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: booking.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'kb-card--dragging' : ''}
    >
      <BookingCard booking={booking} color={color} />
    </div>
  );
};

// ── PipelineColumn ────────────────────────────────────────────
const PipelineColumn = ({ stage, items, stageIdx }) => {
  const color = stageColor(stageIdx);
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totalCents = items.reduce((s, b) => s + (b.total_sell_cents || 0), 0);

  return (
    <div
      className={`kb-col${isOver ? ' kb-col--over' : ''}`}
      style={{ '--_stage-color': color }}
    >
      {/* Header */}
      <div className="kb-col-header">
        <div className="kb-col-header-top">
          <span className="kb-col-name">{stage.name}</span>
          <span className="kb-col-badge">{items.length}</span>
        </div>
        <div className="kb-col-value">{fmtMoney(totalCents)}</div>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="kb-col-body">
        <SortableContext
          items={items.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((b) => (
            <SortableCard key={b.id} booking={b} color={color} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="kb-col-empty">Drop deals here</div>
        )}
      </div>
    </div>
  );
};

// ── Pipeline page ─────────────────────────────────────────────
const Pipeline = () => {
  const [stages,   setStages]   = useState([]);
  const [bookings, setBookings] = useState([]);
  const [metrics,  setMetrics]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [activeId, setActiveId] = useState(null);

  // Filters
  const [destFilter,  setDestFilter]  = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');

  // Snapshot for optimistic-revert
  const snapshot = useRef(null);

  // ── Data loading ─────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await voyageApi.getPipeline();
      setStages(res.stages  || []);
      setBookings(res.bookings || []);
      setMetrics(res.metrics  || null);
    } catch (e) {
      setError(e.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ─────────────────────────────────────────────
  const orderedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const uniqueContacts = useMemo(
    () => [...new Set(bookings.map((b) => b.contact_name).filter(Boolean))].sort(),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (destFilter.trim()) {
      const q = destFilter.trim().toLowerCase();
      list = list.filter((b) => b.destination?.toLowerCase().includes(q));
    }
    if (agentFilter) {
      list = list.filter((b) => b.contact_name === agentFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((b) => b.travel_dates?.start && new Date(b.travel_dates.start) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      list = list.filter((b) => b.travel_dates?.start && new Date(b.travel_dates.start) <= to);
    }
    return list;
  }, [bookings, destFilter, agentFilter, dateFrom, dateTo]);

  const bookingsByStage = useMemo(() => {
    const map = {};
    orderedStages.forEach((s) => { map[s.id] = []; });
    filteredBookings.forEach((b) => {
      if (map[b.stage_id]) map[b.stage_id].push(b);
      // else the booking's stage isn't in the current list — skip
    });
    return map;
  }, [filteredBookings, orderedStages]);

  const activeBooking = useMemo(
    () => (activeId ? bookings.find((b) => b.id === activeId) : null),
    [activeId, bookings],
  );

  const activeStageIdx = useMemo(() => {
    if (!activeBooking) return 0;
    return orderedStages.findIndex((s) => s.id === activeBooking.stage_id);
  }, [activeBooking, orderedStages]);

  // ── DnD sensors ──────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── DnD handlers ─────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id);
    snapshot.current = bookings; // capture pre-drag state for revert
  }, [bookings]);

  const handleDragOver = useCallback(({ active, over }) => {
    if (!over) return;
    const activeId = active.id;
    const overId   = over.id;

    // Determine which stage the dragged card is moving into
    const overIsStage   = orderedStages.some((s) => s.id === overId);
    const targetStageId = overIsStage
      ? overId
      : bookings.find((b) => b.id === overId)?.stage_id;

    if (!targetStageId) return;

    const activeBooking = bookings.find((b) => b.id === activeId);
    if (!activeBooking || activeBooking.stage_id === targetStageId) return;

    // Optimistic move
    setBookings((prev) =>
      prev.map((b) => b.id === activeId ? { ...b, stage_id: targetStageId } : b),
    );
  }, [bookings, orderedStages]);

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveId(null);

    if (!over) {
      setBookings(snapshot.current); // cancelled — revert
      return;
    }

    const activeId   = active.id;
    const current    = bookings.find((b) => b.id === activeId);
    const original   = snapshot.current?.find((b) => b.id === activeId);

    if (!current || !original || current.stage_id === original.stage_id) return;

    try {
      await voyageApi.updateBookingStage(activeId, current.stage_id);
      snapshot.current = bookings; // commit
    } catch (err) {
      console.error('Stage move failed, reverting:', err);
      setBookings(snapshot.current); // revert
    }
  }, [bookings]);

  const clearFilters = () => {
    setDestFilter('');
    setAgentFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = destFilter || agentFilter || dateFrom || dateTo;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="kb-page">
      {/* Header */}
      <div className="kb-topbar">
        <div className="kb-topbar-left">
          <h2>Sales Pipeline</h2>
          <p>Drag deals across stages — changes sync automatically</p>
        </div>

        {/* Filter bar */}
        <div className="kb-filters">
          <div className="kb-filter-input-wrap">
            <FiSearch className="kb-filter-icon" size={13} />
            <input
              className="kb-filter-input"
              placeholder="Destination…"
              value={destFilter}
              onChange={(e) => setDestFilter(e.target.value)}
            />
          </div>

          <select
            className="kb-filter-select"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="">All Contacts</option>
            {uniqueContacts.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="kb-filter-divider" />

          <input
            type="date"
            className="kb-filter-date"
            title="Departure from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="kb-filter-date"
            title="Departure to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          {hasFilters && (
            <button className="kb-filter-clear" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Metrics strip */}
      {metrics && (
        <div className="kb-metrics">
          <div className="kb-metric">
            <div className="kb-metric-label">Open Deals</div>
            <div className="kb-metric-value">{metrics.open_count}</div>
            <div className="kb-metric-sub">{fmtMoney(metrics.open_value_cents)}</div>
          </div>
          <div className="kb-metric">
            <div className="kb-metric-label">Weighted Forecast</div>
            <div className="kb-metric-value">{fmtMoney(metrics.weighted_forecast_cents)}</div>
            <div className="kb-metric-sub">probability-adjusted</div>
          </div>
          <div className="kb-metric">
            <div className="kb-metric-label">Won</div>
            <div className="kb-metric-value">{fmtMoney(metrics.won_value_cents)}</div>
            <div className="kb-metric-sub">{metrics.won_count} deal(s)</div>
          </div>
          <div className="kb-metric">
            <div className="kb-metric-label">Win Rate</div>
            <div className="kb-metric-value">{metrics.win_rate}%</div>
            <div className="kb-metric-sub">avg {fmtMoney(metrics.avg_deal_cents)}</div>
          </div>
        </div>
      )}

      {error && <div className="kb-error">{error}</div>}

      {loading ? (
        <div className="kb-loading">
          <div className="kb-spinner" />
          Loading pipeline…
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="kb-board">
            {orderedStages.map((stage, idx) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                items={bookingsByStage[stage.id] || []}
                stageIdx={idx}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeBooking && (
              <BookingCard
                booking={activeBooking}
                color={stageColor(activeStageIdx)}
                overlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

export default Pipeline;
