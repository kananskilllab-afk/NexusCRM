import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiSearch, FiChevronRight, FiRefreshCw, FiInbox } from 'react-icons/fi';
import { DataTable, StatusPill, Button, SectionHeader, EmptyState } from '../components/ui';
import LeadDetailDrawer from '../components/leads/LeadDetailDrawer';
import AddLeadModal from '../components/modals/AddLeadModal';
import { api } from '../services/api';
import { useLeads } from '../context/LeadContext';
import { useToast } from '../context/ToastContext';
import './Leads.css';

// ── Filter pill definitions ───────────────────────────────────
const FILTER_PILLS = [
  { label: 'All',          value: 'all'         },
  { label: 'Qualified',    value: 'Qualified'   },
  { label: 'Pending',      value: 'Pending'     },
  { label: 'Unqualified',  value: 'Unqualified' },
];

// ── Lead Score ring (SVG, conic-progress via stroke-dasharray) ─
const ScoreRing = ({ score = 0 }) => {
  const r    = 16;
  const sz   = 40;
  const cx   = sz / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;
  const color =
    pct >= 70 ? '#009846' :
    pct >= 50 ? '#E19D19' :
    '#E53935';

  return (
    <div className="ld-score-ring" title={`Score: ${pct}`}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} aria-hidden="true">
        {/* Track */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="var(--border-color, #E6E8F0)"
          strokeWidth={3}
        />
        {/* Progress */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        {/* Score label */}
        <text
          x={cx} y={cx + 4}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fontFamily="Poppins, sans-serif"
          fill={color}
        >
          {pct}
        </text>
      </svg>
    </div>
  );
};

// ── DataTable column definitions ──────────────────────────────
const buildColumns = () => [
  {
    key: 'lead_code',
    label: 'Lead ID',
    render: (val, row) => (
      <span className="ld-code">{val || (row.id?.slice(-8) ?? '—')}</span>
    ),
  },
  {
    key: 'first_name',
    label: 'Contact',
    render: (_, row) => (
      <div className="ld-contact">
        <span className="ld-contact-name">
          {`${row.first_name || ''} ${row.last_name || ''}`.trim() || '—'}
        </span>
        <span className="ld-contact-mobile">{row.mobile || '—'}</span>
      </div>
    ),
  },
  {
    key: 'enquiry_types',
    label: 'Type & Destination',
    render: (val, row) => {
      const type = Array.isArray(val) && val.length ? val[0] : (val || null);
      return (
        <div className="ld-dest">
          {type && <span className="ld-type">{type}</span>}
          {row.destination && <span className="ld-dest-name">{row.destination}</span>}
          {!type && !row.destination && '—'}
        </div>
      );
    },
  },
  {
    key: 'lead_score',
    label: 'Score',
    render: (val) => <ScoreRing score={Number(val) || 0} />,
  },
  {
    key: 'assigned_to',
    label: 'Agent',
    render: (val) =>
      val ? (
        <div className="ld-agent">
          <span className="ld-agent-avatar" aria-hidden="true">
            {val[0].toUpperCase()}
          </span>
          <span className="ld-agent-name">{val}</span>
        </div>
      ) : '—',
  },
  {
    key: 'budget_range',
    label: 'Est. Value',
    render: (val) => val ? <span className="ld-budget">{val}</span> : '—',
  },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <StatusPill status={val || 'New'} size="sm" />,
  },
  {
    key: '_arrow',
    label: '',
    render: () => <FiChevronRight className="ld-arrow" aria-hidden="true" />,
  },
];

const COLUMNS = buildColumns();

// ── Leads page ────────────────────────────────────────────────
const Leads = () => {
  const { state, dispatch }         = useLeads();
  const toast                       = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch]             = useState('');
  const [loadError, setLoadError]       = useState(null);

  // Active qualification filter from URL — ?status=Qualified
  const activeFilter = searchParams.get('status') || 'all';

  // ── Load leads (reuse context cache) ────────────────────────
  useEffect(() => {
    if (state.leads.length > 0) return;
    dispatch({ type: 'FETCH_START' });
    api.getLeads()
      .then(data => dispatch({ type: 'SET_LEADS', payload: data }))
      .catch(err => {
        dispatch({ type: 'FETCH_ERROR', payload: err.message });
        setLoadError(err.message);
      });
  }, [dispatch, state.leads.length]);

  // ── Refresh handler ──────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    dispatch({ type: 'FETCH_START' });
    setLoadError(null);
    api.getLeads()
      .then(data => dispatch({ type: 'SET_LEADS', payload: data }))
      .catch(err => {
        dispatch({ type: 'FETCH_ERROR', payload: err.message });
        setLoadError(err.message);
        toast('Failed to load leads: ' + err.message, 'error');
      });
  }, [dispatch, toast]);

  // ── Filter pill click → update URL ──────────────────────────
  const handlePillClick = useCallback((value) => {
    if (value === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status: value });
    }
  }, [setSearchParams]);

  // ── Derived filtered list ────────────────────────────────────
  const filteredLeads = useMemo(() => {
    let list = state.leads || [];

    // Qualification filter (from URL param)
    if (activeFilter !== 'all') {
      list = list.filter(l => l.qualification_status === activeFilter);
    }

    // Search filter (name, mobile, lead_code, destination, email)
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(l =>
        [l.first_name, l.last_name, l.mobile, l.lead_code, l.destination, l.email, l.id]
          .some(v => v?.toLowerCase().includes(q))
      );
    }

    return list;
  }, [state.leads, activeFilter, search]);

  // ── Stats for the header bar ─────────────────────────────────
  const stats = useMemo(() => {
    const all       = state.leads?.length ?? 0;
    const qualified = state.leads?.filter(l => l.qualification_status === 'Qualified').length ?? 0;
    const pending   = state.leads?.filter(l => l.qualification_status === 'Pending').length ?? 0;
    return { all, qualified, pending };
  }, [state.leads]);

  // ── After add: prepend new lead and close modal ──────────────
  const handleLeadSaved = useCallback((newLead) => {
    if (newLead) {
      dispatch({ type: 'SET_LEADS', payload: [newLead, ...(state.leads || [])] });
      toast('Lead created successfully', 'success');
    }
    setShowAddModal(false);
  }, [dispatch, state.leads, toast]);

  return (
    <div className="leads-page">
      {/* Page header */}
      <SectionHeader
        title="Leads"
        subtitle="Manage and track all inbound enquiries"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={<FiPlus />}
            onClick={() => setShowAddModal(true)}
          >
            New Lead
          </Button>
        }
      />

      {/* Toolbar row */}
      <div className="leads-toolbar">
        {/* Search */}
        <div className="leads-search-wrap">
          <FiSearch className="leads-search-icon" size={14} />
          <input
            type="search"
            className="leads-search-input"
            placeholder="Search name, mobile, lead ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search leads"
          />
        </div>

        {/* Filter pills */}
        <div className="leads-filter-pills" role="group" aria-label="Filter by qualification">
          {FILTER_PILLS.map(pill => (
            <button
              key={pill.value}
              className={`leads-pill${activeFilter === pill.value ? ' leads-pill--active' : ''}`}
              onClick={() => handlePillClick(pill.value)}
              aria-pressed={activeFilter === pill.value}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          icon={<FiRefreshCw />}
          loading={state.isLoading}
          onClick={handleRefresh}
          aria-label="Refresh leads"
        />
      </div>

      {/* Stats bar */}
      <div className="leads-stats">
        <span><strong>{stats.all}</strong> total</span>
        <span className="leads-stats-divider" />
        <span><strong>{stats.qualified}</strong> qualified</span>
        <span className="leads-stats-divider" />
        <span><strong>{stats.pending}</strong> pending review</span>
        {filteredLeads.length !== stats.all && (
          <>
            <span className="leads-stats-divider" />
            <span>showing <strong>{filteredLeads.length}</strong></span>
          </>
        )}
      </div>

      {/* Error state */}
      {loadError && !state.isLoading && (
        <p className="leads-error">Failed to load leads: {loadError}</p>
      )}

      {/* Data table */}
      <DataTable
        columns={COLUMNS}
        data={filteredLeads}
        onRowClick={setSelectedLead}
        loading={state.isLoading && filteredLeads.length === 0}
        emptyMessage={
          activeFilter !== 'all'
            ? (
              <EmptyState
                icon={FiSearch}
                title={`No ${activeFilter.toLowerCase()} leads`}
                description="Try clearing your filter to see all leads."
              />
            ) : (
              <EmptyState
                icon={FiInbox}
                title="No leads yet"
                description="Add your first enquiry to start tracking."
                action={
                  <Button variant="primary" size="sm" icon={<FiPlus />} onClick={() => setShowAddModal(true)}>
                    New Lead
                  </Button>
                }
              />
            )
        }
        maxHeight="calc(100vh - 310px)"
      />

      {/* Right-side drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* Add lead modal */}
      {showAddModal && (
        <AddLeadModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleLeadSaved}
        />
      )}
    </div>
  );
};

export default Leads;
