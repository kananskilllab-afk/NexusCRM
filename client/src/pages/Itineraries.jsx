import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMap, FiCalendar, FiUser, FiEdit2, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { SectionHeader, StatusPill, Button } from '../components/ui';
import { api } from '../services/api';
import './Itineraries.css';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Itineraries() {
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBookings({ limit: 200 });
      setBookings(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (b.booking_ref || '').toLowerCase().includes(q) ||
      (b.lead_name   || '').toLowerCase().includes(q) ||
      (b.destination || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="itin-page">
      <SectionHeader
        title="Itineraries"
        subtitle={`${bookings.length} booking${bookings.length !== 1 ? 's' : ''} with itineraries`}
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={<FiRefreshCw />}
            onClick={load}
            loading={loading}
          >
            Refresh
          </Button>
        }
      />

      {/* Search bar */}
      <div className="itin-toolbar">
        <div className="itin-search-wrap">
          <FiSearch className="itin-search-icon" />
          <input
            className="itin-search"
            placeholder="Search by booking ID, traveller or destination…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="itin-error" role="alert">
          {error}
        </div>
      )}

      {loading && !bookings.length ? (
        <div className="itin-empty">
          <div className="itin-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="itin-empty">
          <FiMap size={40} className="itin-empty-icon" />
          <p>No itineraries found{search ? ' for that search' : ''}.</p>
        </div>
      ) : (
        <div className="itin-grid">
          {filtered.map((b) => (
            <div key={b._id || b.id} className="itin-card">
              <div className="itin-card__header">
                <span className="itin-card__ref">{b.booking_ref || String(b._id || b.id).slice(-8).toUpperCase()}</span>
                <StatusPill status={b.status || 'enquiry'} size="sm" />
              </div>

              <div className="itin-card__meta">
                <span className="itin-card__meta-row">
                  <FiUser size={13} />
                  {b.lead_name || b.customer_name || 'Unknown traveller'}
                </span>
                {b.destination && (
                  <span className="itin-card__meta-row">
                    <FiMap size={13} />
                    {b.destination}
                  </span>
                )}
                {b.travel_start && (
                  <span className="itin-card__meta-row">
                    <FiCalendar size={13} />
                    {fmtDate(b.travel_start)}
                    {b.travel_end ? ` → ${fmtDate(b.travel_end)}` : ''}
                  </span>
                )}
              </div>

              <div className="itin-card__footer">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<FiEdit2 />}
                  onClick={() => navigate(`/itinerary/${b._id || b.id}/builder`)}
                >
                  Open Builder
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
