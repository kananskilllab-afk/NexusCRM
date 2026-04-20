import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { FiBarChart2, FiDollarSign, FiUser, FiActivity, FiFileText, FiDownload, FiTrendingUp, FiTarget, FiAlertCircle } from 'react-icons/fi';
import './Reports.css';

const Reports = () => {
  const { state, dispatch } = useLeads();
  const [activeReport, setActiveReport] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  /* ── Computed Analytics ── */
  const leads = state.leads || [];
  const suppliers = state.suppliers || [];
  const bookings = state.bookings || [];

  const totalRevenue = leads.reduce((acc, l) => acc + (l.billing?.items || []).reduce((a, i) => a + i.qty * i.price, 0), 0);
  const totalPaid = leads.reduce((acc, l) => acc + (l.billing?.payments || []).reduce((a, p) => a + Number(p.amount), 0), 0);
  const totalOutstanding = totalRevenue - totalPaid;

  const leadsByStatus = leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});
  const leadsBySource = leads.reduce((acc, l) => { acc[l.lead_source || 'Unknown'] = (acc[l.lead_source || 'Unknown'] || 0) + 1; return acc; }, {});
  const leadsByAssignee = leads.reduce((acc, l) => { acc[l.assigned_to || 'Unassigned'] = (acc[l.assigned_to || 'Unassigned'] || 0) + 1; return acc; }, {});

  const conversionRate = leads.length > 0 ? ((leadsByStatus['Booked'] || 0) / leads.length * 100).toFixed(1) : 0;

  const categories = [
    {
      id: 'sales',
      title: 'Lead & Sales Reports',
      icon: <FiActivity />,
      reports: [
        { id: 'salesperson-wise', name: 'Salesperson Wise Report', data: leadsByAssignee },
        { id: 'lead-source', name: 'Lead Source Analysis', data: leadsBySource },
        { id: 'lead-status', name: 'Lead Status Distribution', data: leadsByStatus },
        { id: 'conversion', name: 'Conversion Rate Analysis', summary: `${conversionRate}% of leads converted to bookings`, data: { 'Converted': leadsByStatus['Booked'] || 0, 'Total': leads.length } },
        { id: 'hot-leads', name: 'Hot Leads Report', count: leads.filter(l => l.priority === 'Hot').length, data: { 'Hot Leads': leads.filter(l => l.priority === 'Hot').length } },
        { id: 'lost-leads', name: 'Lost Leads Analysis', count: leads.filter(l => l.status === 'Lost').length, data: { 'Lost Leads': leads.filter(l => l.status === 'Lost').length } }
      ]
    },
    {
      id: 'finance',
      title: 'Financial Reports',
      icon: <FiDollarSign />,
      reports: [
        { id: 'revenue', name: 'Revenue Summary', summary: `Total ₹${totalRevenue.toLocaleString()}`, data: { 'Invoiced': totalRevenue, 'Paid': totalPaid, 'Outstanding': totalOutstanding } },
        { id: 'outstanding', name: 'Outstanding Balances', summary: `₹${totalOutstanding.toLocaleString()} pending`, data: { 'Outstanding': totalOutstanding } },
        { id: 'payments', name: 'Payment Collection Report', summary: `₹${totalPaid.toLocaleString()} collected`, data: { 'Collected': totalPaid } }
      ]
    },
    {
      id: 'operations',
      title: 'Operations Reports',
      icon: <FiFileText />,
      reports: [
        { id: 'supplier-wise', name: 'Supplier Booking Report', count: suppliers.length, data: suppliers.reduce((acc, s) => { acc[s.name] = (acc[s.name] || 0) + (s.bookings?.length || 0); return acc; }, {}) },
        { id: 'booking-status', name: 'Booking Status Report', count: bookings.length, data: bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {}) },
        { id: 'followup', name: 'Follow-Up Summary Report', count: leads.reduce((a, l) => a + (l.followUps?.length || 0), 0), data: leads.reduce((acc, l) => { acc[l.first_name] = (l.followUps?.length || 0); return acc; }, {}) }
      ]
    }
  ];

  const filteredCategories = activeCategory === 'All' ? categories : categories.filter(c => c.id === activeCategory);

  const exportData = (reportId, reportName) => {
    dispatch({ type: 'LOG_EXPORT', payload: { type: reportName, count: leads.length } });
    const csvHeader = 'Report Name,Key,Value\n';
    const report = categories.flatMap(c => c.reports).find(r => r.id === reportId);
    let csvRows = '';
    if (report && report.data) {
      csvRows = Object.entries(report.data).map(([k, v]) => `"${reportName}","${k}","${v}"`).join('\n');
    } else {
      csvRows = `"${reportName}","Summary","${report?.summary || ''}"`;
    }
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderReportData = (reportId) => {
    if (!reportId) return null;
    const found = categories.flatMap(c => c.reports).find(r => r.id === reportId);
    if (!found) return null;
    return (
      <div className="card" style={{ marginTop: '1rem', borderTop: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{found.name}</h3>
          <button className="btn-icon" onClick={() => setActiveReport(null)}>✕</button>
        </div>
        {found.data ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'var(--bg-main)' }}>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.8rem' }}>Measure</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.8rem' }}>Value</th>
              {found.id.includes('lead') && <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.8rem' }}>%</th>}
            </tr></thead>
            <tbody>
              {Object.entries(found.data).map(([key, val]) => (
                <tr key={key} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '10px' }}>{key}</td>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{typeof val === 'number' && val > 1000 ? `₹${val.toLocaleString()}` : val}</td>
                  {found.id.includes('lead') && <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{(Number(val) / leads.length * 100).toFixed(1)}%</td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '8px' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary)' }}>{found.summary}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Reports & Analytics</h1>
          <p className="text-secondary">{categories.flatMap(c => c.reports).length} report modules available</p>
        </div>
        <div className="header-actions">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['All', ...categories.map(c => c.id)].map(cat => (
              <button key={cat} className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveCategory(cat)}>
                {cat === 'All' ? 'All' : categories.find(c => c.id === cat)?.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Leads', val: leads.length, icon: <FiActivity />, color: '#3B82F6' },
          { label: 'Conversion Rate', val: `${conversionRate}%`, icon: <FiTrendingUp />, color: '#10B981' },
          { label: 'Revenue Generated', val: `₹${(totalRevenue / 1000).toFixed(0)}k`, icon: <FiDollarSign />, color: '#F59E0B' },
          { label: 'Outstanding', val: `₹${(totalOutstanding / 1000).toFixed(0)}k`, icon: <FiAlertCircle />, color: '#EF4444' }
        ].map((kpi, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 40, height: 40, background: `${kpi.color}15`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>{kpi.icon}</div>
            <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{kpi.label}</p><h3 style={{ color: kpi.color, margin: 0 }}>{kpi.val}</h3></div>
          </div>
        ))}
      </div>

      <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="card report-card">
            <div className="report-category-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{ width: 32, height: 32, background: 'var(--primary-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>{cat.icon}</div>
              <h3 style={{ margin: 0 }}>{cat.title}</h3>
            </div>
            <ul className="report-list" style={{ listStyle: 'none', padding: 0 }}>
              {cat.reports.map(report => (
                <li key={report.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
                  <FiBarChart2 style={{ color: 'var(--text-muted)' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 500, fontSize: '0.88rem' }}>{report.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{report.summary || `${report.count} records`}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setActiveReport(activeReport === report.id ? null : report.id)}>
                      {activeReport === report.id ? 'Close' : 'View'}
                    </button>
                    <button className="btn btn-sm btn-icon" onClick={() => exportData(report.id, report.name)}><FiDownload /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {activeReport && renderReportData(activeReport)}

      {/* Staff Targets Section */}
      {(activeCategory === 'All' || activeCategory === 'staff') && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="section-header"><h3><FiTarget /> Staff Targets — April 2026</h3></div>
          <table className="data-table">
            <thead><tr>
              <th>Staff</th>
              <th>Target Bookings</th>
              <th>Achieved</th>
              <th>Target Revenue</th>
              <th>Achieved Revenue</th>
              <th>Progress</th>
            </tr></thead>
            <tbody>
              {(state.staffTargets || []).map(s => {
                const pct = Math.min(100, Math.round(s.achievedRevenue / s.targetRevenue * 100));
                return (
                  <tr key={s.userId}>
                    <td style={{ fontWeight: 600 }}>{s.userId}</td>
                    <td>{s.targetBookings}</td>
                    <td style={{ color: s.achievedBookings >= s.targetBookings ? 'var(--status-booked)' : 'inherit' }}>{s.achievedBookings}</td>
                    <td>₹{(s.targetRevenue / 1000).toFixed(0)}k</td>
                    <td>₹{(s.achievedRevenue / 1000).toFixed(0)}k</td>
                    <td style={{ minWidth: '120px' }}>
                      <div style={{ background: 'var(--bg-main)', borderRadius: '20px', height: 8 }}>
                        <div style={{ height: '100%', borderRadius: '20px', background: pct >= 100 ? '#10B981' : 'var(--primary)', width: `${pct}%`, transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;
