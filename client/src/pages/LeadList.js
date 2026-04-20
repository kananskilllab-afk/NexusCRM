import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiPlus, FiFilter, FiDownload, FiSearch, FiEye, FiAlertCircle } from 'react-icons/fi';
import { useLeads } from '../context/LeadContext';
import AddLeadModal from '../components/AddLeadModal';
import './LeadList.css';

const LeadList = () => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Sync search from URL query params (for global search support)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    const statusParam = params.get('status');
    const priorityParam = params.get('priority');
    
    if (searchParam) setSearch(searchParam);
    if (statusParam) setStatusFilter(statusParam);
    if (priorityParam) setPriorityFilter(priorityParam);
  }, [location.search]);

  const handleAddLead = (newData) => {
    const newLead = {
      ...newData,
      id: `L-${1000 + state.leads.length + 1}`,
      status: 'New',
      created_at: new Date().toISOString(),
      activities: [{ id: `act-${Date.now()}`, date: new Date().toISOString(), text: `Lead created via ${newData.lead_source || 'Manual'}`, user: 'Admin' }],
      notes: [], reminders: [], files: [], travellers: [],
      followUps: [], assignedSuppliers: [], bookings: [],
      billing: { items: [], payments: [], paymentSchedule: [] },
      enquiry_data: {},
      communications: []
    };
    dispatch({ type: 'ADD_LEAD', payload: newLead });
    setIsModalOpen(false); // Fix: Ensure modal closes
  };

  const leads = state.leads || [];
  const filtered = leads.filter(lead => {
    const matchSearch = `${lead.first_name} ${lead.last_name} ${lead.mobile} ${lead.destination}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchPriority = priorityFilter === 'All' || lead.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const exportLeads = () => {
    dispatch({ type: 'LOG_EXPORT', payload: { type: 'Leads Export', count: filtered.length } });
    const csvHeader = 'Lead ID,Name,Mobile,Email,Status,Priority,Destination,Created\n';
    const csvRows = filtered.map(l => `${l.id},"${l.first_name} ${l.last_name}",${l.mobile},${l.email},${l.status},${l.priority},${l.destination},${new Date(l.created_at).toLocaleDateString()}`).join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColors = { New: 'new', Working: 'working', 'Proposal Sent': 'proposal-sent', Negotiating: 'negotiating', Booked: 'booked', Lost: 'lost', Unqualified: 'unqualified' };
  const priorityColor = { Hot: '#EF4444', Normal: '#3B82F6', Cold: '#94A3B8' };

  return (
    <div className="lead-list-page">
      <div className="page-header">
        <div className="header-left">
          <h1>All Leads</h1>
          <p className="text-secondary">{filtered.length} of {leads.length} leads shown</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={exportLeads}><FiDownload /> Export CSV</button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><FiPlus /> Add Lead</button>
        </div>
      </div>

      <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddLead} />

      <div className="filter-bar card">
        <div className="filter-group">
          <FiSearch className="icon" />
          <input type="text" placeholder="Search by name, phone, destination..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-group" style={{ maxWidth: '200px' }}>
          <FiFilter className="icon" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {['Unqualified', 'New', 'Working', 'Proposal Sent', 'Negotiating', 'Booked', 'Lost'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group" style={{ maxWidth: '180px' }}>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="All">All Priorities</option>
            <option>Hot</option><option>Normal</option><option>Cold</option>
          </select>
        </div>
      </div>

      <div className="table-container card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Travel Date</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="clickable-row">
                <td><strong style={{ color: 'var(--primary)' }}>{lead.id}</strong></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 30, height: 30, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                      {lead.first_name?.charAt(0)}
                    </div>
                    <span>{lead.first_name} {lead.last_name}</span>
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lead.mobile}</td>
                <td>{lead.destination}</td>
                <td><span className={`badge ${statusColors[lead.status] || 'working'}`}>{lead.status}</span></td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: priorityColor[lead.priority] }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor[lead.priority] || '#94A3B8', display: 'inline-block' }} />
                    {lead.priority}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lead.travel_start_date || '—'}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(lead.created_at).toLocaleDateString()}</td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" onClick={() => navigate(`/leads/${lead.id}`)} title="View Lead"><FiEye /></button>
                  {lead.isDuplicate && <FiAlertCircle style={{ color: '#EF4444', marginLeft: 4 }} title="Possible duplicate" />}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No leads found matching your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadList;
