import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiX, FiDownload, FiSend, FiPlus,
  FiNavigation, FiHome, FiCompass, FiTruck, FiMapPin,
} from 'react-icons/fi';
import { StatusPill, Button, KpiCard, DataTable } from '../ui';
import { api } from '../../services/api';
import './BookingDetailModal.css';

// ── Helpers ───────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtCurrency = (cents, code = 'INR') => {
  if (!cents) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: code, maximumFractionDigits: 0,
  }).format(cents / 100);
};

const fmtCurrencyPlain = (cents, code = 'INR') => {
  if (!cents) return '—';
  return `${code} ${(cents / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

// ── Segment icons map ─────────────────────────────────────────────
const SEGMENT_ICONS = {
  flight:    <FiNavigation size={14} />,
  hotel:     <FiHome      size={14} />,
  excursion: <FiCompass   size={14} />,
  transfer:  <FiTruck     size={14} />,
  car:       <FiTruck     size={14} />,
};

// ── Tabs ──────────────────────────────────────────────────────────
const TABS = ['Itinerary', 'Segments', 'Financial', 'Communications'];

// ── Download helpers ──────────────────────────────────────────────
const triggerDownload = (html, filename) => {
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const baseHtmlShell = (title, bodyContent) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Poppins', system-ui, sans-serif; color: #1A1A2E; background: #fff; padding: 40px; font-size: 14px; }
  h1 { color: #393185; font-size: 22px; margin-bottom: 4px; }
  h2 { color: #393185; font-size: 16px; margin: 24px 0 12px 0; border-bottom: 2px solid #009846; padding-bottom: 4px; }
  .meta { color: #6B7280; font-size: 13px; margin-bottom: 28px; }
  .meta span { margin-right: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #393185; color: #fff; padding: 9px 12px; text-align: left; font-size: 12px; letter-spacing: 0.04em; }
  td { padding: 9px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
  tr:nth-child(even) td { background: #F5F7FA; }
  .footer { margin-top: 48px; font-size: 11px; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>${bodyContent}</body>
</html>`;

const buildItineraryHTML = (booking) => {
  const dateRange = booking.travel_dates?.start
    ? `${fmtDate(booking.travel_dates.start)} – ${fmtDate(booking.travel_dates.end)}`
    : '';

  const days = (booking.segments || []).reduce((acc, seg) => {
    const d = seg.day || 1;
    if (!acc[d]) acc[d] = [];
    acc[d].push(seg);
    return acc;
  }, {});
  const dayKeys = Object.keys(days).sort((a, b) => Number(a) - Number(b));

  const timelineRows = dayKeys.length
    ? dayKeys.map((day) => `
        <h2>Day ${day}</h2>
        <table>
          <thead><tr><th>Time</th><th>Supplier</th><th>Description</th><th>Cost</th></tr></thead>
          <tbody>
            ${days[day].map((s) => `
              <tr>
                <td>${s.time || '—'}</td>
                <td>${s.supplier || '—'}</td>
                <td>${s.description || '—'}</td>
                <td>${fmtCurrencyPlain(s.cost_cents, booking.currency_code)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`).join('')
    : '<p style="color:#6B7280;padding:16px 0">No itinerary details added yet.</p>';

  const body = `
    <h1>${booking.destination || 'Travel Itinerary'}</h1>
    <div class="meta">
      <span><b>Ref:</b> ${booking.booking_ref || booking.id}</span>
      <span><b>Client:</b> ${booking.contact_name || '—'}</span>
      ${dateRange ? `<span><b>Dates:</b> ${dateRange}</span>` : ''}
    </div>
    ${timelineRows}
    <div class="footer">
      Kanan International Pvt Ltd &nbsp;·&nbsp; Vadodara, Gujarat &nbsp;·&nbsp;
      Generated ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
    </div>`;

  return baseHtmlShell(`Itinerary — ${booking.destination}`, body);
};

const buildDocHTML = (booking, type) => {
  const isQuote   = type === 'quote';
  const docTitle  = isQuote ? 'Quotation' : 'Tax Invoice';
  const sell      = booking.total_sell_cents || 0;
  const cost      = booking.total_cost_cents || 0;
  const margin    = sell - cost;
  const paid      = (booking.payments || []).reduce((s, p) => s + (p.amount_cents || 0), 0);
  const outstanding = Math.max(0, sell - paid);
  const currency  = booking.currency_code || 'INR';

  const lineItems = (booking.segments || []).length
    ? booking.segments.map((s) => `
        <tr>
          <td>${s.description || s.type || 'Travel Service'}</td>
          <td style="text-align:right">${fmtCurrencyPlain(s.sell_cents || s.cost_cents, currency)}</td>
        </tr>`).join('')
    : `<tr>
        <td>${booking.destination || 'Travel Package'}</td>
        <td style="text-align:right">${fmtCurrencyPlain(sell, currency)}</td>
      </tr>`;

  const body = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
      <div>
        <h1 style="margin-bottom:2px">Kanan International Pvt Ltd</h1>
        <div style="color:#6B7280;font-size:13px">Travel &amp; Hospitality &nbsp;·&nbsp; Vadodara, Gujarat</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:24px;font-weight:700;color:#393185">${docTitle.toUpperCase()}</div>
        <div style="color:#6B7280;font-size:13px">${booking.booking_ref || booking.id}</div>
        <div style="color:#6B7280;font-size:13px">
          ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>

    <div style="background:#F5F7FA;padding:16px;border-radius:8px;margin-bottom:24px;font-size:13px">
      <div><b>Client:</b> ${booking.contact_name || '—'}</div>
      <div><b>Destination:</b> ${booking.destination || '—'}</div>
      ${booking.travel_dates?.start ? `<div><b>Travel Dates:</b> ${fmtDate(booking.travel_dates.start)} – ${fmtDate(booking.travel_dates.end)}</div>` : ''}
    </div>

    <table>
      <thead><tr><th>Description</th><th style="text-align:right">Amount (${currency})</th></tr></thead>
      <tbody>${lineItems}</tbody>
    </table>

    <div style="text-align:right;font-size:13px;margin-bottom:4px">
      Subtotal: ${fmtCurrencyPlain(sell, currency)}
    </div>
    ${!isQuote ? `
    <div style="text-align:right;font-size:13px;margin-bottom:4px;color:#6B7280">
      Paid: ${fmtCurrencyPlain(paid, currency)}
    </div>
    <div style="text-align:right;font-size:16px;font-weight:700;color:#009846">
      Outstanding: ${fmtCurrencyPlain(outstanding, currency)}
    </div>` : `
    <div style="text-align:right;font-size:16px;font-weight:700;color:#393185">
      Total: ${fmtCurrencyPlain(sell, currency)}
    </div>`}

    <div class="footer">
      Kanan International Pvt Ltd &nbsp;·&nbsp; Vadodara, Gujarat &nbsp;·&nbsp;
      Generated ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
    </div>`;

  return baseHtmlShell(`${docTitle} — ${booking.booking_ref}`, body);
};

// ═══════════════════════════════════════════════════════════════════
// Tab: Itinerary
// ═══════════════════════════════════════════════════════════════════
const ItineraryTab = ({ booking, onDownload }) => {
  const segments = booking?.segments || [];
  const days = segments.reduce((acc, seg) => {
    const d = seg.day || 1;
    if (!acc[d]) acc[d] = [];
    acc[d].push(seg);
    return acc;
  }, {});
  const dayKeys = Object.keys(days).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="bdm-itinerary">
      <div className="bdm-tab-actions">
        <Button variant="secondary" size="sm" icon={<FiDownload />} onClick={onDownload}>
          Download Itinerary
        </Button>
      </div>

      {dayKeys.length === 0 ? (
        <div className="bdm-empty">
          No itinerary details yet. Add segments to build the day-by-day plan.
        </div>
      ) : (
        <div className="bdm-timeline">
          {dayKeys.map((day) => (
            <div key={day} className="bdm-day">
              <div className="bdm-day-label">Day {day}</div>
              {days[day].map((seg, i) => (
                <div key={i} className="bdm-tl-row">
                  <span className="bdm-tl-icon">
                    {SEGMENT_ICONS[seg.type] || <FiMapPin size={14} />}
                  </span>
                  <span className="bdm-tl-time">{seg.time || '—'}</span>
                  <span className="bdm-tl-supplier">{seg.supplier || '—'}</span>
                  <span className="bdm-tl-desc">{seg.description || '—'}</span>
                  <span className="bdm-tl-cost">
                    {fmtCurrency(seg.cost_cents, booking.currency_code)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Tab: Segments
// ═══════════════════════════════════════════════════════════════════
const marginClass = (pct) => {
  if (pct > 15) return 'seg-margin--good';
  if (pct > 10) return 'seg-margin--ok';
  return 'seg-margin--low';
};

const SEG_COLUMNS = [
  {
    key: 'type',
    label: 'Type',
    render: (val) => (
      <span className="seg-type-pill">
        {SEGMENT_ICONS[val] || <FiMapPin size={12} />}
        {val || '—'}
      </span>
    ),
  },
  { key: 'supplier',    label: 'Supplier'    },
  { key: 'description', label: 'Description' },
  { key: 'date',        label: 'Date',  render: (val) => fmtDate(val)                              },
  { key: 'cost_cents',  label: 'Cost',  render: (val, row) => fmtCurrency(val, row.currency_code)  },
  { key: 'sell_cents',  label: 'Sell',  render: (val, row) => fmtCurrency(val, row.currency_code)  },
  {
    key: 'margin_pct',
    label: 'Margin',
    render: (val) => {
      const pct = Number(val) || 0;
      return <span className={`seg-margin ${marginClass(pct)}`}>{pct}%</span>;
    },
  },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <StatusPill status={val || 'pending'} size="sm" />,
  },
];

const SegmentsTab = ({ booking }) => {
  const segments = booking?.segments || [];

  return (
    <div className="bdm-segments">
      <div className="bdm-tab-actions">
        <Button variant="primary" size="sm" icon={<FiPlus />}>
          Add Segment
        </Button>
      </div>
      {segments.length === 0 ? (
        <div className="bdm-empty">No segments added yet.</div>
      ) : (
        <DataTable columns={SEG_COLUMNS} data={segments} emptyMessage="No segments." />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Tab: Financial
// ═══════════════════════════════════════════════════════════════════
const PAY_COLUMNS = [
  { key: 'date',         label: 'Date',        render: (val) => fmtDate(val)                           },
  { key: 'description',  label: 'Description'                                                           },
  { key: 'amount_cents', label: 'Amount', render: (val, row) => fmtCurrency(val, row.currency_code)     },
  { key: 'status', label: 'Status', render: (val) => <StatusPill status={val || 'pending'} size="sm" /> },
];

const FinancialTab = ({ booking }) => {
  const sell      = booking?.total_sell_cents || 0;
  const cost      = booking?.total_cost_cents || 0;
  const gross     = sell - cost;
  const marginPct = sell > 0 ? Math.round((gross / sell) * 100) : 0;
  const paid      = (booking?.payments || []).reduce((s, p) => s + (p.amount_cents || 0), 0);
  const outstanding = Math.max(0, sell - paid);
  const currency  = booking?.currency_code || 'INR';

  const downloadDoc = (type) => {
    const html = buildDocHTML(booking, type);
    triggerDownload(html, `${type}-${booking?.booking_ref || booking?.id}.html`);
  };

  return (
    <div className="bdm-financial">
      <div className="bdm-kpis">
        <KpiCard label="Total Cost"     value={fmtCurrency(cost,        currency)} accentColor="var(--kanan-blue)"   />
        <KpiCard label="Total Sell"     value={fmtCurrency(sell,        currency)} accentColor="var(--kanan-sky)"    />
        <KpiCard label="Gross Margin"   value={`${marginPct}%`}                    accentColor="var(--kanan-green)"  />
        <KpiCard label="Outstanding"    value={fmtCurrency(outstanding, currency)} accentColor="var(--kanan-orange)" />
      </div>

      <div className="bdm-payments-section">
        <div className="bdm-section-title">Payment Schedule</div>
        {(booking?.payments || []).length === 0 ? (
          <div className="bdm-empty">No payments recorded yet.</div>
        ) : (
          <DataTable columns={PAY_COLUMNS} data={booking.payments} />
        )}
      </div>

      <div className="bdm-fin-actions">
        <Button variant="secondary" size="sm" icon={<FiDownload />} onClick={() => downloadDoc('quote')}>
          Download Quote
        </Button>
        <Button variant="secondary" size="sm" icon={<FiDownload />} onClick={() => downloadDoc('invoice')}>
          Download Invoice
        </Button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Tab: Communications
// ═══════════════════════════════════════════════════════════════════
const CommunicationsTab = ({ booking }) => {
  const [replyText, setReplyText] = useState('');
  const emails = booking?.emails || [];

  const handleSend = useCallback(() => {
    if (!replyText.trim()) return;
    // TODO: wire to POST /api/comms/email when email sending is implemented
    setReplyText('');
  }, [replyText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
  };

  return (
    <div className="bdm-comms">
      <div className="bdm-email-thread">
        {emails.length === 0 ? (
          <div className="bdm-empty">No email history for this booking yet.</div>
        ) : (
          emails.map((email, i) => (
            <div key={i} className={`bdm-bubble bdm-bubble--${email.direction === 'sent' ? 'sent' : 'received'}`}>
              <div className="bdm-bubble-meta">
                <span className="bdm-bubble-from">{email.from || '—'}</span>
                <span className="bdm-bubble-date">{fmtDate(email.sent_at)}</span>
              </div>
              {email.subject && <div className="bdm-bubble-subject">{email.subject}</div>}
              <div className="bdm-bubble-body">{email.body || email.snippet || '—'}</div>
            </div>
          ))
        )}
      </div>

      <div className="bdm-reply">
        <textarea
          className="bdm-reply-input"
          placeholder="Type a reply… (Ctrl+Enter to send)"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          aria-label="Reply message"
        />
        <Button variant="primary" size="sm" icon={<FiSend />} onClick={handleSend}>
          Send
        </Button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Main modal
// ═══════════════════════════════════════════════════════════════════
const BookingDetailModal = ({ bookingId, onClose }) => {
  const [booking, setBooking]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('Itinerary');
  const overlayRef                = useRef(null);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    api.getBooking(bookingId)
      .then(setBooking)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const downloadItinerary = useCallback(() => {
    if (!booking) return;
    const html = buildItineraryHTML(booking);
    triggerDownload(html, `itinerary-${booking.booking_ref || booking.id}.html`);
  }, [booking]);

  if (!bookingId) return null;

  return (
    <div className="bdm-overlay" ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="bdm-modal">

        {/* ── Header ── */}
        <div className="bdm-header">
          <div className="bdm-header-left">
            <h2 className="bdm-destination">
              {loading ? 'Loading…' : (booking?.destination || 'Booking')}
            </h2>
            {booking && (
              <div className="bdm-meta">
                <StatusPill status={booking.status} size="sm" />
                <span className="bdm-ref">#{booking.booking_ref || booking.id?.slice(-8)?.toUpperCase()}</span>
                {booking.contact_name && (
                  <span className="bdm-contact-tag">{booking.contact_name}</span>
                )}
                {booking.agent && (
                  <span className="bdm-agent-tag">Agent: {booking.agent}</span>
                )}
              </div>
            )}
          </div>
          <button className="bdm-close" onClick={onClose} aria-label="Close booking detail">
            <FiX size={20} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="bdm-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`bdm-tab${activeTab === tab ? ' bdm-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="bdm-body" role="tabpanel">
          {loading ? (
            <div className="bdm-loading">Loading booking details…</div>
          ) : (
            <>
              {activeTab === 'Itinerary'      && <ItineraryTab      booking={booking} onDownload={downloadItinerary} />}
              {activeTab === 'Segments'       && <SegmentsTab       booking={booking} />}
              {activeTab === 'Financial'      && <FinancialTab      booking={booking} />}
              {activeTab === 'Communications' && <CommunicationsTab booking={booking} />}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default BookingDetailModal;
