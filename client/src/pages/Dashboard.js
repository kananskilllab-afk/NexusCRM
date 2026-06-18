import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
  FiDollarSign, FiUsers, FiTrendingUp, FiCalendar,
  FiAlertCircle, FiBarChart2, FiCheckCircle, FiCreditCard,
  FiBell, FiClock, FiUser,
} from 'react-icons/fi';
import { KpiCard, SectionHeader } from '../components/ui';
import { api } from '../services/api';
import './Dashboard.css';

const fmtMoney = (v = 0) => {
  const n = Math.round(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const diffMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NOTIF_META = {
  info:              { Icon: FiBell,         color: '#00A0E3' },
  sla_breach:        { Icon: FiAlertCircle,  color: '#EF7F1A' },
  followup_due:      { Icon: FiClock,        color: '#E19D19' },
  lead_stale:        { Icon: FiUser,         color: '#6B7280' },
  opp_rotting:       { Icon: FiAlertCircle,  color: '#EF7F1A' },
  nurture_closed:    { Icon: FiCheckCircle,  color: '#009846' },
  booking_confirmed: { Icon: FiCheckCircle,  color: '#009846' },
  payment_received:  { Icon: FiCreditCard,   color: '#009846' },
};

// TODO: /api/dashboard/kpis endpoint not yet implemented — replace mock when available
const MOCK_DEPARTURES = 8;

const STAGE_COLORS = ['#00A0E3', '#284695', '#393185', '#009846', '#B0CB1F', '#EF7F1A'];

const ConversionPill = ({ rate }) => {
  const bg = rate >= 55 ? '#009846' : rate >= 45 ? '#E19D19' : '#E53935';
  return (
    <span className="db-conv-pill" style={{ background: bg }}>
      {rate}%
    </span>
  );
};

const Dashboard = () => {
  const [funnel,        setFunnel]        = useState(null);
  const [pipeline,      setPipeline]      = useState(null);
  const [agents,        setAgents]        = useState([]);
  const [trend,         setTrend]         = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.getLeadFunnel().catch(() => null),
      api.getPipelineAnalytics().catch(() => null),
      api.getAgentLeaderboard().catch(() => []),
      api.getRevenueTrend().catch(() => []),
      api.getNotifications(12).catch(() => ({ items: [] })),
    ]).then(([f, p, a, t, n]) => {
      if (!alive) return;
      setFunnel(f);
      setPipeline(p);
      setAgents(Array.isArray(a) ? a : []);
      setTrend(Array.isArray(t) ? t : []);
      setNotifications(n?.items || []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Revenue MTD = latest month in trend
  const revenueMTD = trend.length ? (trend[trend.length - 1]?.revenue || 0) : 0;
  const activeLeads = funnel ? funnel.total - (funnel.converted || 0) : null;

  // ── Area chart ─────────────────────────────────────────────────────────────
  const trendMonths   = trend.map(d => d.month);
  const trendRevenues = trend.map(d => d.revenue);

  const areaOptions = useMemo(() => ({
    chart: {
      id: 'db-revenue-trend',
      type: 'area',
      height: 240,
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'Poppins, sans-serif',
      animations: { enabled: false },
    },
    colors: ['#009846'],
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 100] },
    },
    grid: {
      borderColor: '#E5E7EB',
      xaxis: { lines: { show: false } },
      padding: { left: 4, right: 4 },
    },
    xaxis: {
      categories: trendMonths,
      labels: { style: { colors: '#6B7280', fontSize: '10px', fontFamily: 'Poppins, sans-serif' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: v => fmtMoney(v),
        style: { colors: '#6B7280', fontSize: '10px', fontFamily: 'Poppins, sans-serif' },
      },
    },
    tooltip: {
      theme: 'dark',
      style: { fontFamily: 'Poppins, sans-serif', fontSize: '12px' },
      y: { formatter: v => fmtMoney(v) },
    },
    dataLabels: { enabled: false },
  }), [trendMonths]);

  // ── Donut chart ────────────────────────────────────────────────────────────
  const sourceEntries = Object.entries(funnel?.by_source || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const sourceLabels = sourceEntries.map(([k]) => k);
  const sourceValues = sourceEntries.map(([, v]) => v);
  const sourcesTotal = sourceValues.reduce((s, v) => s + v, 0);

  const donutOptions = useMemo(() => ({
    chart: {
      type: 'donut',
      height: 240,
      background: 'transparent',
      fontFamily: 'Poppins, sans-serif',
    },
    colors: ['#009846', '#00A0E3', '#393185', '#EF7F1A', '#B0CB1F'],
    labels: sourceLabels,
    legend: {
      position: 'bottom',
      fontSize: '12px',
      fontFamily: 'Poppins, sans-serif',
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Sources',
              fontSize: '11px',
              color: '#6B7280',
              fontFamily: 'Poppins, sans-serif',
              formatter: () => `${sourcesTotal}`,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: {
      theme: 'dark',
      style: { fontFamily: 'Poppins, sans-serif', fontSize: '12px' },
    },
  }), [sourceLabels, sourcesTotal]);

  // ── Pipeline funnel ────────────────────────────────────────────────────────
  const stageData = pipeline?.by_stage || [];
  const maxCount  = Math.max(1, ...stageData.map(s => s.count));

  return (
    <div className="db-container">
      {loading && <div className="db-loading-bar" />}

      {/* ── 1. KPI Grid ──────────────────────────────────────────────────── */}
      <div className="db-kpi-grid">
        <KpiCard
          label="Revenue MTD"
          value={loading ? '—' : fmtMoney(revenueMTD)}
          icon={<FiDollarSign />}
          accentColor="var(--kanan-green)"
          className="db-kpi-accented"
        />
        <KpiCard
          label="Active Leads"
          value={activeLeads === null ? '—' : activeLeads}
          icon={<FiUsers />}
          accentColor="var(--kanan-sky)"
          className="db-kpi-accented"
        />
        <KpiCard
          label="Conversion Rate"
          value={funnel ? `${funnel.conversion_rate}%` : '—'}
          icon={<FiTrendingUp />}
          accentColor="var(--kanan-blue)"
          className="db-kpi-accented"
        />
        {/* TODO: departures need /api/dashboard/kpis; using mock until endpoint exists */}
        <KpiCard
          label="Departures (7 days)"
          value={MOCK_DEPARTURES}
          icon={<FiCalendar />}
          accentColor="var(--kanan-navy)"
          className="db-kpi-accented"
        />
        <KpiCard
          label="Overdue Follow-ups"
          value={pipeline ? pipeline.stale_count : '—'}
          icon={<FiAlertCircle />}
          accentColor="var(--kanan-orange)"
          className="db-kpi-accented"
        />
        <KpiCard
          label="Pipeline Value"
          value={pipeline ? fmtMoney(pipeline.open_value) : '—'}
          icon={<FiBarChart2 />}
          accentColor="var(--kanan-gold)"
          className="db-kpi-accented"
        />
      </div>

      {/* ── 2 + 3. Charts row ────────────────────────────────────────────── */}
      <div className="db-charts-row">
        <div className="db-card db-chart-main">
          <SectionHeader title="Revenue Trend" subtitle="12-month area view" />
          {trend.length > 0 ? (
            <ReactApexChart
              options={areaOptions}
              series={[{ name: 'Revenue', data: trendRevenues }]}
              type="area"
              height={240}
            />
          ) : (
            <div className="db-empty">No revenue data available yet.</div>
          )}
        </div>

        <div className="db-card db-chart-side">
          <SectionHeader title="Lead Sources" subtitle="Enquiry origin breakdown" />
          {sourceValues.length > 0 ? (
            <ReactApexChart
              options={donutOptions}
              series={sourceValues}
              type="donut"
              height={240}
            />
          ) : (
            <div className="db-empty">No source data available yet.</div>
          )}
        </div>
      </div>

      {/* ── 4 + 5. Pipeline funnel + Activity feed ───────────────────────── */}
      <div className="db-mid-row">
        <div className="db-card db-funnel-wrap">
          <SectionHeader title="Pipeline Funnel" subtitle="Deals per stage with close probability" />
          <div className="db-funnel-list">
            {stageData.length === 0 && (
              <p className="db-empty">No pipeline data yet.</p>
            )}
            {stageData.map((stage, idx) => (
              <div key={stage.stage} className="db-funnel-item">
                <span className="db-funnel-label">{stage.stage}</span>
                <div className="db-funnel-track">
                  <div
                    className="db-funnel-bar"
                    style={{
                      width: `${Math.max(4, (stage.count / maxCount) * 100)}%`,
                      background: `linear-gradient(90deg, #00A0E3, ${STAGE_COLORS[idx % STAGE_COLORS.length]})`,
                    }}
                  />
                </div>
                <span className="db-funnel-count">{stage.count}</span>
                <span className="db-funnel-pct">{stage.probability}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="db-card db-activity-wrap">
          <SectionHeader title="Live Activity" subtitle="Recent system events" />
          <ul className="db-activity-list">
            {notifications.length === 0 && (
              <li className="db-empty">No recent activity.</li>
            )}
            {notifications.map((notif) => {
              const meta = NOTIF_META[notif.type] || NOTIF_META.info;
              const { Icon } = meta;
              return (
                <li key={notif.id} className="db-activity-item">
                  <span
                    className="db-activity-icon"
                    style={{ color: meta.color, background: `${meta.color}1a` }}
                  >
                    <Icon size={13} />
                  </span>
                  <div className="db-activity-body">
                    <p className="db-activity-title">{notif.title}</p>
                    {notif.message && (
                      <p className="db-activity-msg">{notif.message}</p>
                    )}
                  </div>
                  <div className="db-activity-right">
                    <span className="db-activity-time">{fmtTime(notif.created_at)}</span>
                    {!notif.is_read && <span className="db-unread-dot" />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ── 6. Agent Leaderboard ─────────────────────────────────────────── */}
      <div className="db-card">
        <SectionHeader title="Agent Leaderboard" subtitle="Performance rankings by confirmed revenue" />
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Agent</th>
                <th>Leads</th>
                <th>Confirmed</th>
                <th>Revenue</th>
                <th>Conversion</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} className="db-table-empty">No agent data yet.</td>
                </tr>
              )}
              {agents.map((a, idx) => (
                <tr key={a.agent}>
                  <td className="db-rank">{idx + 1}</td>
                  <td className="db-agent-cell">
                    <span className="db-avatar">
                      {(a.agent || '?')[0].toUpperCase()}
                    </span>
                    <span className="db-agent-name">{a.agent || 'Unassigned'}</span>
                  </td>
                  <td>{a.leads}</td>
                  <td>{a.won_count}</td>
                  <td className="db-revenue-cell">{fmtMoney(a.won_value)}</td>
                  <td><ConversionPill rate={a.conversion_rate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
