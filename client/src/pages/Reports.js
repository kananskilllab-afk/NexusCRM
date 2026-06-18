import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
  FiBarChart2, FiDollarSign, FiActivity, FiFileText,
  FiDownload, FiTrendingUp, FiTarget, FiAlertCircle,
} from 'react-icons/fi';
import { KpiCard, SectionHeader, Button } from '../components/ui';
import { api } from '../services/api';
import { useLeads } from '../context/LeadContext';
import { downloadDocument } from '../utils/generateDocument';
import './Reports.css';

// ── Money formatter ───────────────────────────────────────────────────────────
const fmtMoney = (v = 0) => {
  const n = Math.round(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

// ── ApexCharts shared config ─────────────────────────────────────────────────
const CHART_FONT  = { fontFamily: 'Poppins, sans-serif' };
const GRID        = { borderColor: '#E5E7EB', xaxis: { lines: { show: false } }, padding: { left: 4, right: 8 } };
const AXIS_STYLE  = { style: { colors: '#6B7280', fontSize: '10px', fontFamily: 'Poppins, sans-serif' } };
const TT_STYLE    = { theme: 'dark', style: { fontFamily: 'Poppins, sans-serif', fontSize: '12px' } };

// ── HTML export builder ───────────────────────────────────────────────────────
const buildExportHTML = ({ months, revenues, bookingCounts, destinations, agents, totalRevenue, totalLeads }) => {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Performance Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Poppins',sans-serif;background:#fff;color:#1A1A2E;font-size:14px}
.hdr{background:#393185;color:#fff;padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-start}
.logo{font-size:22px;font-weight:700}.logo span{color:#009846}
.hdr-meta{text-align:right;font-size:11px;opacity:.85;line-height:1.7}
.body{padding:32px 40px}.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
.kpi{border:1px solid #E5E7EB;border-radius:10px;padding:18px;text-align:center}
.kpi-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#8A90A6;margin-bottom:6px}
.kpi-value{font-size:20px;font-weight:700;color:#393185}.section{margin-bottom:36px}
h3{color:#393185;font-size:15px;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #393185}
table{width:100%;border-collapse:collapse}th{background:#393185;color:#fff;padding:10px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
td{padding:10px 14px;border-bottom:1px solid #E5E7EB;font-size:13px}tr:nth-child(even) td{background:#F5F7FA}
.sky{color:#00A0E3;font-weight:600}.green{color:#009846;font-weight:600}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:11px;color:#8A90A6}
</style></head><body>
<div class="hdr"><div><div class="logo">Kanan <span>International</span></div><div style="font-size:11px;opacity:.7;margin-top:4px;">Pvt Ltd</div></div>
<div class="hdr-meta"><div>301, Siddhi Vinayak Complex, RC Dutt Road, Vadodara — 390 007</div><div>GSTIN: 24AABCK3843M1ZQ &middot; info@kanan.co</div>
<div style="margin-top:6px;font-size:12px;font-weight:600;opacity:1;">Performance Report &middot; ${today}</div></div></div>
<div class="body">
<div class="kpi-row">
<div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmtMoney(totalRevenue)}</div></div>
<div class="kpi"><div class="kpi-label">Total Leads</div><div class="kpi-value">${totalLeads}</div></div>
<div class="kpi"><div class="kpi-label">Total Bookings</div><div class="kpi-value">${bookingCounts.reduce((s,v)=>s+v,0)}</div></div>
<div class="kpi"><div class="kpi-label">Agents</div><div class="kpi-value">${agents.length}</div></div>
</div>
${months.length ? `<div class="section"><h3>Revenue &amp; Bookings by Month</h3><table><thead><tr><th>Month</th><th>Revenue</th><th>Bookings</th></tr></thead><tbody>
${months.map((m,i)=>`<tr><td>${m}</td><td class="sky">${fmtMoney(revenues[i])}</td><td class="green">${bookingCounts[i]||0}</td></tr>`).join('')}</tbody></table></div>` : ''}
${destinations.length ? `<div class="section"><h3>Top Destinations</h3><table><thead><tr><th>Destination</th><th>Enquiries</th></tr></thead><tbody>
${destinations.map(([d,c])=>`<tr><td>${d}</td><td class="green">${c}</td></tr>`).join('')}</tbody></table></div>` : ''}
${agents.length ? `<div class="section"><h3>Agent Performance</h3><table><thead><tr><th>#</th><th>Agent</th><th>Leads</th><th>Revenue</th><th>Win Rate</th></tr></thead><tbody>
${agents.map((a,i)=>{const wr=a.win_rate??a.winRate;return `<tr><td>${i+1}</td><td>${a.name||a.agent||'—'}</td><td>${a.leads??a.lead_count??0}</td><td class="sky">${fmtMoney(a.revenue||0)}</td><td class="green">${wr!==undefined?wr+'%':'—'}</td></tr>`;}).join('')}</tbody></table></div>` : ''}
<div class="footer"><div>Generated by NexusCRM &middot; www.kanan.co</div><div>Confidential — For internal use only</div></div>
</div></body></html>`;
};

// ── CSV export (original per-report download) ─────────────────────────────────
const exportCSV = (reportId, reportName, data) => {
  const csvHeader = 'Report Name,Key,Value\n';
  let csvRows = '';
  if (data && typeof data === 'object') {
    csvRows = Object.entries(data).map(([k, v]) => `"${reportName}","${k}","${v}"`).join('\n');
  } else {
    csvRows = `"${reportName}","Summary","${data || ''}"`;
  }
  const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ── Reports page ──────────────────────────────────────────────────────────────
const Reports = () => {
  const { state, dispatch } = useLeads();

  // Chart API data
  const [trend,    setTrend]   = useState([]);
  const [agents,   setAgents]  = useState([]);
  const [loading,  setLoading] = useState(true);

  // Original UI state
  const [activeReport,   setActiveReport]   = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.getRevenueTrend().catch(() => []),
      api.getAgentLeaderboard().catch(() => []),
    ]).then(([t, a]) => {
      if (!alive) return;
      setTrend(Array.isArray(t) ? t : []);
      setAgents(Array.isArray(a) ? a : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // ── Original computed analytics from lead state ───────────────────────────
  const leads     = useMemo(() => state.leads     || [], [state.leads]);
  const suppliers = useMemo(() => state.suppliers || [], [state.suppliers]);
  const bookings  = useMemo(() => state.bookings  || [], [state.bookings]);

  const totalRevenue     = leads.reduce((acc, l) => acc + (l.billing?.items || []).reduce((a, i) => a + i.qty * i.price, 0), 0);
  const totalPaid        = leads.reduce((acc, l) => acc + (l.billing?.payments || []).reduce((a, p) => a + Number(p.amount), 0), 0);
  const totalOutstanding = totalRevenue - totalPaid;

  const leadsByStatus   = leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});
  const leadsBySource   = leads.reduce((acc, l) => { acc[l.lead_source || 'Unknown'] = (acc[l.lead_source || 'Unknown'] || 0) + 1; return acc; }, {});
  const leadsByAssignee = leads.reduce((acc, l) => { acc[l.assigned_to || 'Unassigned'] = (acc[l.assigned_to || 'Unassigned'] || 0) + 1; return acc; }, {});
  const conversionRate  = leads.length > 0 ? ((leadsByStatus['Booked'] || 0) / leads.length * 100).toFixed(1) : 0;

  // ── Top destinations from leads ───────────────────────────────────────────
  const destinations = useMemo(() => {
    const counts = {};
    leads.forEach(l => { if (l.destination) counts[l.destination] = (counts[l.destination] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [leads]);

  // ── Chart data from API trend ─────────────────────────────────────────────
  const months        = trend.map(d => d.month);
  const revenues      = trend.map(d => d.revenue || 0);
  const bookingCounts = trend.map(d => d.bookings || d.booking_count || 0);
  const chartRevenue  = revenues.reduce((s, v) => s + v, 0);

  // ── Original report categories ────────────────────────────────────────────
  const categories = [
    {
      id: 'sales',
      title: 'Lead & Sales Reports',
      icon: <FiActivity />,
      reports: [
        { id: 'salesperson-wise', name: 'Salesperson Wise Report',  data: leadsByAssignee },
        { id: 'lead-source',      name: 'Lead Source Analysis',     data: leadsBySource   },
        { id: 'lead-status',      name: 'Lead Status Distribution', data: leadsByStatus   },
        { id: 'conversion',       name: 'Conversion Rate Analysis', summary: `${conversionRate}% of leads converted to bookings`, data: { 'Converted': leadsByStatus['Booked'] || 0, 'Total': leads.length } },
        { id: 'hot-leads',        name: 'Hot Leads Report',         count: leads.filter(l => l.priority === 'Hot').length, data: { 'Hot Leads': leads.filter(l => l.priority === 'Hot').length } },
        { id: 'lost-leads',       name: 'Lost Leads Analysis',      count: leads.filter(l => l.status === 'Lost').length,  data: { 'Lost Leads': leads.filter(l => l.status === 'Lost').length  } },
      ],
    },
    {
      id: 'finance',
      title: 'Financial Reports',
      icon: <FiDollarSign />,
      reports: [
        { id: 'revenue',          name: 'Revenue Summary',             summary: `Total ₹${totalRevenue.toLocaleString()}`, data: { 'Invoiced': totalRevenue, 'Paid': totalPaid, 'Outstanding': totalOutstanding } },
        { id: 'outstanding',      name: 'Outstanding Balances',        summary: `₹${totalOutstanding.toLocaleString()} pending`, data: { 'Outstanding': totalOutstanding } },
        { id: 'payments',         name: 'Payment Collection Report',   summary: `₹${totalPaid.toLocaleString()} collected`, data: { 'Collected': totalPaid } },
        { id: 'profit-margins',   name: 'Profit Margin Analysis',      summary: 'Average margin: 18%', data: { 'High Margin': 12, 'Average Margin': 45, 'Low Margin': 8 } },
        { id: 'commissions-summary', name: 'Supplier Commissions Tracker', summary: '₹4,500 pending collection', data: { 'Settled': 12500, 'Pending': 4500, 'Overdue': 1200 } },
      ],
    },
    {
      id: 'operations',
      title: 'Operations Reports',
      icon: <FiFileText />,
      reports: [
        { id: 'supplier-wise',  name: 'Supplier Booking Report', count: suppliers.length, data: suppliers.reduce((acc, s) => { acc[s.name] = (acc[s.name] || 0) + (s.bookings?.length || 0); return acc; }, {}) },
        { id: 'booking-status', name: 'Booking Status Report',   count: bookings.length,  data: bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {}) },
        { id: 'followup',       name: 'Follow-Up Summary Report', count: leads.reduce((a, l) => a + (l.followUps?.length || 0), 0), data: leads.reduce((acc, l) => { acc[l.first_name] = (l.followUps?.length || 0); return acc; }, {}) },
      ],
    },
  ];

  const allReports          = categories.flatMap(c => c.reports);
  const filteredCategories  = activeCategory === 'All' ? categories : categories.filter(c => c.id === activeCategory);

  const handleExportCSV = useCallback((reportId, reportName) => {
    dispatch({ type: 'LOG_EXPORT', payload: { type: reportName, count: leads.length } });
    const report = allReports.find(r => r.id === reportId);
    exportCSV(reportId, reportName, report?.data);
  }, [dispatch, leads.length, allReports]);

  const handleExportHTML = useCallback(() => {
    const html = buildExportHTML({ months, revenues, bookingCounts, destinations, agents, totalRevenue: chartRevenue || totalRevenue, totalLeads: leads.length });
    const date  = new Date().toISOString().slice(0, 10);
    downloadDocument(`KananCRM_Report_${date}.html`, html);
  }, [months, revenues, bookingCounts, destinations, agents, chartRevenue, totalRevenue, leads.length]);

  // ── Inline report detail ──────────────────────────────────────────────────
  const renderReportData = (reportId) => {
    if (!reportId) return null;
    const found = allReports.find(r => r.id === reportId);
    if (!found) return null;
    return (
      <div className="rp-card rp-detail" style={{ borderTop: '4px solid var(--kanan-blue, #284695)' }}>
        <div className="rp-detail-header">
          <h3>{found.name}</h3>
          <button className="rp-detail-close" onClick={() => setActiveReport(null)}>✕</button>
        </div>
        {found.data ? (
          <table className="rp-detail-table">
            <thead><tr style={{ background: 'var(--bg-subtle, #F8F9FD)' }}>
              <th>Measure</th>
              <th>Value</th>
              {found.id.includes('lead') && <th>%</th>}
            </tr></thead>
            <tbody>
              {Object.entries(found.data).map(([key, val]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td style={{ fontWeight: 600 }}>
                    {typeof val === 'number' && val > 1000 ? `₹${val.toLocaleString()}` : val}
                  </td>
                  {found.id.includes('lead') && (
                    <td style={{ color: 'var(--text-muted)' }}>
                      {leads.length > 0 ? (Number(val) / leads.length * 100).toFixed(1) : 0}%
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="rp-detail-summary">{found.summary}</div>
        )}
      </div>
    );
  };

  // ── Chart options ─────────────────────────────────────────────────────────
  const barOptions = useMemo(() => ({
    chart: { type: 'bar', height: 260, toolbar: { show: false }, background: 'transparent', ...CHART_FONT },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    colors: ['#00A0E3', '#393185'],
    dataLabels: { enabled: false },
    grid: GRID,
    xaxis: { categories: months, labels: AXIS_STYLE, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: [
      { labels: { formatter: v => fmtMoney(v), ...AXIS_STYLE } },
      { opposite: true, labels: { formatter: v => `${v}`, ...AXIS_STYLE } },
    ],
    legend: { position: 'top', fontSize: '12px', fontFamily: 'Poppins, sans-serif' },
    tooltip: { ...TT_STYLE, y: [{ formatter: v => fmtMoney(v) }, { formatter: v => `${v} bookings` }] },
  }), [months]);

  const destOptions = useMemo(() => ({
    chart: { type: 'bar', height: 280, toolbar: { show: false }, background: 'transparent', ...CHART_FONT },
    plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '55%' } },
    colors: ['#009846'],
    dataLabels: { enabled: false },
    grid: { ...GRID, yaxis: { lines: { show: false } } },
    xaxis: { labels: AXIS_STYLE, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { categories: destinations.map(([d]) => d), labels: { style: { colors: '#454C66', fontSize: '11px', fontFamily: 'Poppins, sans-serif' } } },
    tooltip: { ...TT_STYLE, y: { formatter: v => `${v} enquiries` } },
  }), [destinations]);

  const trendOptions = useMemo(() => ({
    chart: { type: 'line', height: 220, toolbar: { show: false }, background: 'transparent', ...CHART_FONT },
    colors: ['#009846'],
    stroke: { curve: 'smooth', width: 2.5 },
    markers: { size: 5, colors: ['#E19D19'], strokeColors: '#fff', strokeWidth: 2, hover: { size: 7 } },
    dataLabels: { enabled: false },
    grid: GRID,
    xaxis: { categories: months, labels: AXIS_STYLE, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: v => `${v}`, ...AXIS_STYLE } },
    tooltip: { ...TT_STYLE, y: { formatter: v => `${v} bookings` } },
  }), [months]);

  const hasChartData = months.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rp-page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <SectionHeader
        title="Reports & Analytics"
        subtitle={`${allReports.length} report modules available`}
        action={
          <Button variant="primary" size="sm" icon={<FiDownload />} onClick={handleExportHTML}>
            Export Report
          </Button>
        }
      />

      {/* ── KPI Strip ──────────────────────────────────────────── */}
      <div className="rp-kpis">
        {[
          { label: 'Total Leads',      val: leads.length,                           icon: <FiActivity />,    color: 'var(--kanan-sky, #00A0E3)'    },
          { label: 'Conversion Rate',  val: `${conversionRate}%`,                   icon: <FiTrendingUp />,  color: 'var(--kanan-green, #009846)'  },
          { label: 'Revenue Generated',val: fmtMoney(totalRevenue || chartRevenue), icon: <FiDollarSign />,  color: 'var(--kanan-gold, #E19D19)'   },
          { label: 'Outstanding',      val: fmtMoney(totalOutstanding),             icon: <FiAlertCircle />, color: 'var(--kanan-red, #E53935)'    },
        ].map(kpi => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.val} icon={kpi.icon} accentColor={kpi.color} />
        ))}
      </div>

      {/* ── Charts row: Revenue vs Bookings + Top Destinations ─── */}
      <div className="rp-charts-row">
        <div className="rp-card">
          <SectionHeader title="Revenue vs Bookings" subtitle="Monthly — sky = revenue, navy = bookings count" />
          {hasChartData ? (
            <ReactApexChart
              options={barOptions}
              series={[{ name: 'Revenue', data: revenues }, { name: 'Bookings', data: bookingCounts }]}
              type="bar"
              height={260}
            />
          ) : (
            <div className="rp-empty">{loading ? 'Loading chart data…' : 'No trend data yet.'}</div>
          )}
        </div>

        <div className="rp-card">
          <SectionHeader title="Top Destinations" subtitle="By enquiry volume" />
          {destinations.length > 0 ? (
            <ReactApexChart
              options={destOptions}
              series={[{ name: 'Enquiries', data: destinations.map(([, c]) => c) }]}
              type="bar"
              height={280}
            />
          ) : (
            <div className="rp-empty">No destination data in leads yet.</div>
          )}
        </div>
      </div>

      {/* ── Monthly Booking Trend ───────────────────────────────── */}
      <div className="rp-card">
        <SectionHeader title="Monthly Booking Trend" subtitle="Bookings closed per month — green line, gold markers" />
        {hasChartData ? (
          <ReactApexChart
            options={trendOptions}
            series={[{ name: 'Bookings', data: bookingCounts }]}
            type="line"
            height={220}
          />
        ) : (
          <div className="rp-empty">{loading ? 'Loading…' : 'No booking trend data yet.'}</div>
        )}
      </div>

      {/* ── Agent Performance table ─────────────────────────────── */}
      {agents.length > 0 && (
        <div className="rp-card">
          <SectionHeader title="Agent Performance" subtitle="Leads, revenue, and win rate per agent" />
          <div className="rp-table-wrap">
            <table className="rp-agent-table">
              <thead>
                <tr><th>#</th><th>Agent</th><th>Leads</th><th>Revenue</th><th>Win Rate</th><th>Avg Score</th></tr>
              </thead>
              <tbody>
                {agents.map((a, i) => {
                  const winRate  = a.win_rate  ?? a.winRate;
                  const avgScore = a.avg_score ?? a.avgScore;
                  return (
                    <tr key={a.id || a.name || i}>
                      <td><span className="rp-rank">{i + 1}</span></td>
                      <td>
                        <div className="rp-agent-cell">
                          <span className="rp-avatar">{(a.name || a.agent || '?')[0].toUpperCase()}</span>
                          <span className="rp-agent-name">{a.name || a.agent || '—'}</span>
                        </div>
                      </td>
                      <td>{a.leads ?? a.lead_count ?? 0}</td>
                      <td className="rp-money">{fmtMoney(a.revenue || 0)}</td>
                      <td>{winRate !== undefined ? <span className="rp-winrate">{winRate}%</span> : '—'}</td>
                      <td className="rp-score">{avgScore ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ ORIGINAL REPORT LIBRARY ══════════════════════ */}
      <div className="rp-library-header">
        <h2 className="rp-library-title">Report Library</h2>
        <div className="rp-category-pills">
          {['All', ...categories.map(c => c.id)].map(cat => (
            <button
              key={cat}
              className={`rp-pill${activeCategory === cat ? ' rp-pill--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'All' ? 'All' : categories.find(c => c.id === cat)?.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="rp-reports-grid">
        {filteredCategories.map(cat => (
          <div key={cat.id} className="rp-card rp-report-card">
            <div className="rp-report-category-header">
              <div className="rp-report-category-icon">{cat.icon}</div>
              <h3>{cat.title}</h3>
            </div>
            <ul className="rp-report-list">
              {cat.reports.map(report => (
                <li key={report.id}>
                  <FiBarChart2 className="rp-report-icon" />
                  <div className="rp-report-text">
                    <span className="rp-report-name">{report.name}</span>
                    <span className="rp-report-meta">
                      {report.summary || (report.count !== undefined ? `${report.count} records` : '')}
                    </span>
                  </div>
                  <div className="rp-report-actions">
                    <button
                      className="rp-report-btn"
                      onClick={() => setActiveReport(activeReport === report.id ? null : report.id)}
                    >
                      {activeReport === report.id ? 'Close' : 'View'}
                    </button>
                    <button
                      className="rp-report-btn rp-report-btn--icon"
                      title="Download CSV"
                      onClick={() => handleExportCSV(report.id, report.name)}
                    >
                      <FiDownload size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Inline detail view */}
      {activeReport && renderReportData(activeReport)}

      {/* ── Staff Targets ───────────────────────────────────────── */}
      {(activeCategory === 'All' || activeCategory === 'staff') && (state.staffTargets || []).length > 0 && (
        <div className="rp-card">
          <div className="rp-report-category-header">
            <div className="rp-report-category-icon"><FiTarget /></div>
            <h3>Staff Targets — {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="rp-table-wrap">
            <table className="rp-agent-table">
              <thead>
                <tr><th>Staff</th><th>Target Bookings</th><th>Achieved</th><th>Target Revenue</th><th>Achieved Revenue</th><th>Progress</th></tr>
              </thead>
              <tbody>
                {(state.staffTargets || []).map(s => {
                  const pct = Math.min(100, Math.round(s.achievedRevenue / s.targetRevenue * 100));
                  return (
                    <tr key={s.userId}>
                      <td style={{ fontWeight: 600 }}>{s.userId}</td>
                      <td>{s.targetBookings}</td>
                      <td style={{ color: s.achievedBookings >= s.targetBookings ? 'var(--kanan-green)' : 'inherit' }}>{s.achievedBookings}</td>
                      <td>₹{(s.targetRevenue / 1000).toFixed(0)}k</td>
                      <td>₹{(s.achievedRevenue / 1000).toFixed(0)}k</td>
                      <td style={{ minWidth: 120 }}>
                        <div className="rp-progress-track">
                          <div className="rp-progress-bar" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--kanan-green)' : 'var(--kanan-blue)' }} />
                        </div>
                        <span className="rp-progress-pct">{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
