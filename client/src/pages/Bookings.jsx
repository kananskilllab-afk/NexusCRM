import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiPlus, FiSearch, FiRefreshCw,
  FiNavigation, FiHome, FiCompass, FiTruck, FiChevronRight,
} from 'react-icons/fi';
import { DataTable, StatusPill, Button, SectionHeader } from '../components/ui';
import BookingDetailModal from '../components/bookings/BookingDetailModal';
import { api } from '../services/api';
import './Bookings.css';

// ── Segment type icon strip ──────────────────────────────────────
const SEGMENT_DEFS = [
  { key: 'flight',    Icon: FiNavigation, title: 'Flight'    },
  { key: 'hotel',     Icon: FiHome,       title: 'Hotel'     },
  { key: 'excursion', Icon: FiCompass,    title: 'Excursion' },
  { key: 'transfer',  Icon: FiTruck,      title: 'Transfer'  },
];

const SegmentIcons = ({ types = [] }) => (
  <div className="bk-segs">
    {SEGMENT_DEFS.map(({ key, Icon, title }) => (
      <span
        key={key}
        className={`bk-seg-icon${types.includes(key) ? ' bk-seg-icon--on' : ''}`}
        title={title}
      >
        <Icon size={13} />
      </span>
    ))}
  </div>
);

// ── Filters ──────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { label: 'All',       value: 'all'       },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Enquiry',   value: 'enquiry'   },
  { label: 'On Hold',   value: 'on_hold'   },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// ── Helpers ──────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtCurrency = (cents, code = 'INR') => {
  if (!cents) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: code, maximumFractionDigits: 0,
  }).format(cents / 100);
};

// ── Column definitions ───────────────────────────────────────────
const buildColumns = () => [
  {
    key: 'booking_ref',
    label: 'Booking ID',
    render: (val, row) => (
      <span className="bk-ref">{val || row.id?.slice(-8)?.toUpperCase()}</span>
    ),
  },
  {
    key: 'contact_name',
    label: 'Contact',
    render: (val) => (
      <div className="bk-contact">
        <span className="bk-contact-name">{val || '—'}</span>
      </div>
    ),
  },
  {
    key: 'destination',
    label: 'Destination',
    render: (val) => <span className="bk-dest">{val || '—'}</span>,
  },
  {
    key: 'travel_dates',
    label: 'Dates',
    render: (val) => (
      <div className="bk-dates">
        <span>{fmtDate(val?.start)}</span>
        {val?.end && <span className="bk-dates-sep">→</span>}
        {val?.end && <span>{fmtDate(val.end)}</span>}
      </div>
    ),
  },
  {
    key: 'segment_types',
    label: 'Segments',
    render: (val) => <SegmentIcons types={val || []} />,
  },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <StatusPill status={val || 'enquiry'} size="sm" />,
  },
  {
    key: 'total_sell_cents',
    label: 'Value',
    render: (val, row) => (
      <span className="bk-value">{fmtCurrency(val, row.currency_code)}</span>
    ),
  },
  {
    key: 'travel_dates',
    label: 'Departure',
    render: (val) => <span className="bk-depart">{fmtDate(val?.start)}</span>,
  },
  {
    key: '_arrow',
    label: '',
    render: () => <FiChevronRight className="bk-arrow" size={16} aria-hidden="true" />,
  },
];

const COLUMNS = buildColumns();

// ── Page ─────────────────────────────────────────────────────────
const Bookings = () => {
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [activeFilter, setFilter]   = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const fetchBookings = useCallback(async (stage = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const params = stage && stage !== 'all' ? { stage } : {};
      const data = await api.getBookings(params);
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleFilterChange = useCallback((value) => {
    setFilter(value);
    fetchBookings(value);
  }, [fetchBookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [b.booking_ref, b.contact_name, b.destination, b.status, b.id]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [bookings, search]);

  return (
    <div className="bookings-page">
      <SectionHeader
        title="Bookings"
        subtitle="Manage all client travel bookings"
        action={
          <Button variant="primary" size="sm" icon={<FiPlus />}>
            New Booking
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="bookings-toolbar">
        <div className="bookings-search-wrap">
          <FiSearch className="bookings-search-icon" size={14} />
          <input
            type="search"
            className="bookings-search-input"
            placeholder="Search booking ID, contact, destination…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search bookings"
          />
        </div>

        <div className="bookings-pills" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`bookings-pill${activeFilter === f.value ? ' bookings-pill--active' : ''}`}
              onClick={() => handleFilterChange(f.value)}
              aria-pressed={activeFilter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon={<FiRefreshCw />}
          loading={loading}
          onClick={() => fetchBookings(activeFilter)}
          aria-label="Refresh bookings"
        />
      </div>

      {/* Stats */}
      <div className="bookings-stats">
        <span>
          <strong>{filtered.length}</strong>
          {filtered.length !== bookings.length && ` of ${bookings.length}`} bookings
        </span>
      </div>

      {error && <p className="bookings-error">Error loading bookings: {error}</p>}

      <DataTable
        columns={COLUMNS}
        data={filtered}
        onRowClick={(row) => setSelectedId(row.id)}
        emptyMessage={loading ? 'Loading bookings…' : 'No bookings found.'}
        maxHeight="calc(100vh - 300px)"
      />

      {selectedId && (
        <BookingDetailModal
          bookingId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};

export default Bookings;
