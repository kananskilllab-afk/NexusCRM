import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiDownload, FiSearch, FiRefreshCw,
  FiAlertCircle, FiCheckCircle, FiClock,
} from 'react-icons/fi';
import { MdCurrencyRupee } from 'react-icons/md';
import { DataTable, StatusPill, Button, KpiCard, SectionHeader } from '../components/ui';
import { voyageApi } from '../services/voyageApi';
import { generateInvoiceHTML, downloadDocument } from '../utils/generateDocument';
import './Invoices.css';

const FILTER_PILLS = [
  { label: 'All',     value: 'all'     },
  { label: 'Draft',   value: 'Draft'   },
  { label: 'Sent',    value: 'Sent'    },
  { label: 'Partial', value: 'Partial' },
  { label: 'Paid',    value: 'Paid'    },
  { label: 'Overdue', value: 'Overdue' },
];

const fmtMoney = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const buildColumns = (onDownload) => [
  {
    key: 'invoice_number',
    label: 'Invoice No',
    render: (val, row) => (
      <span className="iv-code">{val || `#${String(row.id || '').slice(-8).toUpperCase()}`}</span>
    ),
  },
  {
    key: 'contact_name',
    label: 'Contact',
    render: (val, row) => (
      <div className="iv-contact">
        <span className="iv-contact-name">{val || row.client || '—'}</span>
      </div>
    ),
  },
  {
    key: 'total_amount',
    label: 'Total',
    render: (val) => <span className="iv-amount">{fmtMoney(val)}</span>,
  },
  {
    key: 'paid_amount',
    label: 'Paid',
    render: (val) => <span className="iv-paid">{fmtMoney(val)}</span>,
  },
  {
    key: 'outstanding',
    label: 'Outstanding',
    render: (val, row) => {
      const out = val !== undefined
        ? Number(val)
        : Number(row.total_amount || 0) - Number(row.paid_amount || 0);
      return (
        <span className={`iv-outstanding${out > 0 ? ' iv-outstanding--due' : ''}`}>
          {fmtMoney(out)}
        </span>
      );
    },
  },
  {
    key: 'due_date',
    label: 'Due Date',
    render: (val) => {
      if (!val) return '—';
      const overdue = new Date(val) < new Date();
      return <span className={overdue ? 'iv-overdue-date' : ''}>{fmtDate(val)}</span>;
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
        className="iv-dl-btn"
        title="Download invoice"
        onClick={(e) => { e.stopPropagation(); onDownload(row); }}
        aria-label="Download invoice"
      >
        <FiDownload size={14} />
      </button>
    ),
  },
];

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    voyageApi.getInvoices()
      .then(data => { setInvoices(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = useCallback((invoice) => {
    const html = generateInvoiceHTML(invoice);
    const num  = invoice.invoice_number || invoice.id || 'invoice';
    downloadDocument(`Invoice_${num}.html`, html);
  }, []);

  const columns = useMemo(() => buildColumns(handleDownload), [handleDownload]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (filter !== 'all') list = list.filter(inv => inv.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        [r.invoice_number, r.contact_name, r.client]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [invoices, filter, search]);

  const kpis = useMemo(() => {
    const now          = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let outstanding = 0, overdue = 0, collectedMTD = 0;
    let collectionDaysTotal = 0, collectionCount = 0;

    invoices.forEach(inv => {
      const total = Number(inv.total_amount) || 0;
      const paid  = Number(inv.paid_amount)  || 0;
      const out   = total - paid;
      if (out > 0) outstanding += out;
      if (out > 0 && inv.due_date && new Date(inv.due_date) < now) overdue += out;
      if (paid > 0 && inv.paid_at && new Date(inv.paid_at) >= firstOfMonth) collectedMTD += paid;
      if (inv.status === 'Paid' && inv.invoice_date && inv.paid_at) {
        const days = Math.round((new Date(inv.paid_at) - new Date(inv.invoice_date)) / 86400000);
        if (days >= 0) { collectionDaysTotal += days; collectionCount++; }
      }
    });

    return {
      outstanding,
      overdue,
      collectedMTD,
      avgDays: collectionCount > 0 ? Math.round(collectionDaysTotal / collectionCount) : 0,
    };
  }, [invoices]);

  return (
    <div className="iv-page">
      <SectionHeader
        title="Invoices"
        subtitle="Track payments and outstanding balances"
      />

      {/* KPI row */}
      <div className="iv-kpis">
        <KpiCard
          label="Total Outstanding"
          value={fmtMoney(kpis.outstanding)}
          icon={<MdCurrencyRupee />}
          accentColor="var(--kanan-orange, #EF7F1A)"
        />
        <KpiCard
          label="Overdue Amount"
          value={fmtMoney(kpis.overdue)}
          icon={<FiAlertCircle />}
          accentColor="var(--kanan-red, #E53935)"
        />
        <KpiCard
          label="Collected MTD"
          value={fmtMoney(kpis.collectedMTD)}
          icon={<FiCheckCircle />}
          accentColor="var(--kanan-green, #009846)"
        />
        <KpiCard
          label="Avg Collection Days"
          value={kpis.avgDays > 0 ? `${kpis.avgDays}d` : '—'}
          icon={<FiClock />}
          accentColor="var(--kanan-sky, #00A0E3)"
        />
      </div>

      {/* Toolbar */}
      <div className="iv-toolbar">
        <div className="iv-search-wrap">
          <FiSearch className="iv-search-icon" size={14} />
          <input
            type="search"
            className="iv-search-input"
            placeholder="Search invoice no, contact…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search invoices"
          />
        </div>

        <div className="iv-pills" role="group" aria-label="Filter by status">
          {FILTER_PILLS.map(p => (
            <button
              key={p.value}
              className={`iv-pill${filter === p.value ? ' iv-pill--active' : ''}`}
              onClick={() => setFilter(p.value)}
              aria-pressed={filter === p.value}
            >
              {p.label}
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

      {error && <p className="iv-error">Failed to load invoices: {error}</p>}

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={
          loading          ? 'Loading invoices…' :
          filter !== 'all' ? `No ${filter.toLowerCase()} invoices.` :
                             'No invoices found.'
        }
        maxHeight="calc(100vh - 400px)"
      />
    </div>
  );
};

export default Invoices;
