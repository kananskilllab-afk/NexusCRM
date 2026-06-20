import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiDownload, FiSearch, FiRefreshCw, FiFileText } from 'react-icons/fi';
import { DataTable, StatusPill, Button, SectionHeader } from '../components/ui';
import { voyageApi } from '../services/voyageApi';
import { generateQuoteHTML, downloadDocument } from '../utils/generateDocument';
import './Quotes.css';

const FILTER_PILLS = [
  { label: 'All',      value: 'all'      },
  { label: 'Draft',    value: 'Draft'    },
  { label: 'Sent',     value: 'Sent'     },
  { label: 'Accepted', value: 'Accepted' },
  { label: 'Expired',  value: 'Expired'  },
];

const fmtMoney = (n) => {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const buildColumns = (onDownload) => [
  {
    key: 'quote_number',
    label: 'Quote No',
    render: (val, row) => (
      <span className="qv-code">{val || `#${String(row.id || '').slice(-8).toUpperCase()}`}</span>
    ),
  },
  {
    key: 'booking_ref',
    label: 'Booking',
    render: (val) => val
      ? <span className="qv-ref">{val}</span>
      : <span className="qv-muted">—</span>,
  },
  {
    key: 'contact_name',
    label: 'Contact',
    render: (val, row) => (
      <div className="qv-contact">
        <span className="qv-contact-name">{val || row.client || '—'}</span>
        {(row.contact_email || row.email) && (
          <span className="qv-contact-sub">{row.contact_email || row.email}</span>
        )}
      </div>
    ),
  },
  {
    key: 'total_amount',
    label: 'Total',
    render: (val) => <span className="qv-amount">{fmtMoney(val)}</span>,
  },
  {
    key: 'sent_date',
    label: 'Sent Date',
    render: (val, row) => fmtDate(val || row.created_at),
  },
  {
    key: 'expiry_date',
    label: 'Expires',
    render: (val, row) => {
      const d = val || row.expires_at;
      if (!d) return '—';
      const expired = new Date(d) < new Date();
      return <span className={expired ? 'qv-expired-date' : ''}>{fmtDate(d)}</span>;
    },
  },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <StatusPill status={val || 'Draft'} size="sm" />,
  },
  {
    key: '_dl',
    label: '',
    render: (_, row) => (
      <button
        className="qv-dl-btn"
        title="Download quote"
        onClick={(e) => { e.stopPropagation(); onDownload(row); }}
        aria-label="Download quote"
      >
        <FiDownload size={14} />
      </button>
    ),
  },
];

const Quotes = () => {
  const [quotes,  setQuotes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    voyageApi.getQuotes()
      .then(data => { setQuotes(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = useCallback((quote) => {
    const html = generateQuoteHTML(quote);
    const num  = quote.quote_number || quote.id || 'quote';
    downloadDocument(`Quote_${num}.html`, html);
  }, []);

  const columns = useMemo(() => buildColumns(handleDownload), [handleDownload]);

  const filtered = useMemo(() => {
    let list = quotes;
    if (filter !== 'all') list = list.filter(q => q.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        [r.quote_number, r.contact_name, r.client, r.booking_ref, r.destination]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [quotes, filter, search]);

  const counts = useMemo(() => {
    const c = { all: quotes.length };
    FILTER_PILLS.slice(1).forEach(p => {
      c[p.value] = quotes.filter(q => q.status === p.value).length;
    });
    return c;
  }, [quotes]);

  return (
    <div className="qv-page">
      <SectionHeader
        title="Quotes"
        subtitle="Manage and send pricing proposals to clients"
        action={
          <Button variant="primary" size="sm" icon={<FiFileText />}>
            New Quote
          </Button>
        }
      />

      <div className="qv-toolbar">
        <div className="qv-search-wrap">
          <FiSearch className="qv-search-icon" size={14} />
          <input
            type="search"
            className="qv-search-input"
            placeholder="Search quote no, contact, destination…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search quotes"
          />
        </div>

        <div className="qv-pills" role="group" aria-label="Filter by status">
          {FILTER_PILLS.map(p => (
            <button
              key={p.value}
              className={`qv-pill${filter === p.value ? ' qv-pill--active' : ''}`}
              onClick={() => setFilter(p.value)}
              aria-pressed={filter === p.value}
            >
              {p.label}
              {counts[p.value] > 0 && (
                <span className="qv-pill-count">{counts[p.value]}</span>
              )}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon={<FiRefreshCw />}
          loading={loading}
          onClick={load}
          aria-label="Refresh"
        />
      </div>

      {error && <p className="qv-error">Failed to load quotes: {error}</p>}

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={
          loading         ? 'Loading quotes…' :
          filter !== 'all' ? `No ${filter.toLowerCase()} quotes.` :
                             'No quotes found.'
        }
        maxHeight="calc(100vh - 310px)"
      />
    </div>
  );
};

export default Quotes;
