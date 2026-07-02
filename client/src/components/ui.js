import React from 'react';
import { FiInbox } from 'react-icons/fi';

// ─── Status colour map ────────────────────────────────────────────────────────
const STATUS_MAP = {
  // Lead
  New:                  { bg: '#E3F2FD', color: '#1565C0' },
  'Attempting Contact': { bg: '#FFF3E0', color: '#E65100' },
  Working:              { bg: '#E8F5E9', color: '#2E7D32' },
  Nurturing:            { bg: '#EDE7F6', color: '#4527A0' },
  Qualified:            { bg: '#E0F7FA', color: '#006064' },
  Unqualified:          { bg: '#FFEBEE', color: '#B71C1C' },
  Converted:            { bg: '#E8F5E9', color: '#1B5E20' },
  // Invoice / Quote
  Draft:    { bg: '#F3F4F6', color: '#6B7280' },
  Sent:     { bg: '#EFF6FF', color: '#1D4ED8' },
  Paid:     { bg: '#ECFDF5', color: '#065F46' },
  Overdue:  { bg: '#FEF2F2', color: '#991B1B' },
  Accepted: { bg: '#ECFDF5', color: '#065F46' },
  Rejected: { bg: '#FEF2F2', color: '#991B1B' },
  Expired:  { bg: '#FEF3C7', color: '#92400E' },
  Cancelled:{ bg: '#F9FAFB', color: '#374151' },
  // Bookings / Itinerary
  Confirmed:   { bg: '#ECFDF5', color: '#065F46' },
  Pending:     { bg: '#FEF3C7', color: '#92400E' },
  Cancelled2:  { bg: '#FEF2F2', color: '#991B1B' },
  Completed:   { bg: '#E0F2FE', color: '#0C4A6E' },
  // Generic
  Active:   { bg: '#ECFDF5', color: '#065F46' },
  Inactive: { bg: '#F3F4F6', color: '#6B7280' },
  Open:     { bg: '#EFF6FF', color: '#1D4ED8' },
  Closed:   { bg: '#F3F4F6', color: '#374151' },
};

// ─── KpiCard ──────────────────────────────────────────────────────────────────
export const KpiCard = ({ label, value, icon, accentColor }) => (
  <div className="kpi-card card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 140 }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: accentColor ? `${accentColor}18` : 'var(--bg-secondary, #f0f0f0)',
      color: accentColor || 'var(--primary)', fontSize: 18, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: accentColor || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  </div>
);

// ─── SectionHeader ────────────────────────────────────────────────────────────
export const SectionHeader = ({ title, subtitle, action, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
    <div>
      {title && <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>}
      {subtitle && <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {action}
      {children}
    </div>
  </div>
);

// ─── Button ───────────────────────────────────────────────────────────────────
export const Button = ({ variant = 'primary', size = 'md', icon, onClick, disabled, children, style = {}, type = 'button' }) => {
  const isOutline = variant === 'outline' || variant === 'ghost' || variant === 'secondary';
  const isDanger  = variant === 'danger';
  const isSmall   = size === 'sm' || size === 'xs';

  let className = 'btn ';
  if (isDanger)  className += 'btn-danger';
  else if (isOutline) className += 'btn-outline';
  else className += 'btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: isSmall ? '6px 12px' : '8px 16px',
        fontSize: isSmall ? '0.8rem' : '0.875rem',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};

// ─── StatusPill ───────────────────────────────────────────────────────────────
export const StatusPill = ({ status, size = 'md' }) => {
  const style = STATUS_MAP[status] || { bg: '#F3F4F6', color: '#6B7280' };
  const isSmall = size === 'sm' || size === 'xs';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: style.bg, color: style.color,
      borderRadius: 20,
      padding: isSmall ? '2px 8px' : '4px 12px',
      fontSize: isSmall ? '0.7rem' : '0.78rem',
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon = FiInbox, title = 'Nothing here', description, action }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
    <Icon size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
    <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 6px', color: 'var(--text-secondary)' }}>{title}</p>
    {description && <p style={{ fontSize: '0.82rem', margin: '0 0 16px' }}>{description}</p>}
    {action && <div>{action}</div>}
  </div>
);

// ─── DataTable ────────────────────────────────────────────────────────────────
// columns: [{ key, label, render?, width?, align? }]
// data: array of row objects
export const DataTable = ({ columns = [], data = [], onRowClick, loading, emptyMessage, maxHeight }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'kanan-spin 0.7s linear infinite', margin: '0 auto 12px' }} />
        Loading…
      </div>
    );
  }

  if (!data.length) {
    return emptyMessage ? (
      <div>{emptyMessage}</div>
    ) : (
      <EmptyState title="No data found" />
    );
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: maxHeight ? 'auto' : 'visible', maxHeight }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '10px 14px', textAlign: col.align || 'left',
                fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase',
                letterSpacing: '0.5px', color: 'var(--text-muted)',
                whiteSpace: 'nowrap', width: col.width,
                background: 'var(--bg-secondary, #f9f9f9)',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || row._id || i}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                borderBottom: '1px solid var(--border-color)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = 'var(--bg-secondary, #f5f5f5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            >
              {columns.map(col => (
                <td key={col.key} style={{ padding: '10px 14px', textAlign: col.align || 'left', color: 'var(--text-primary)', verticalAlign: 'middle' }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
