import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiSearch, FiLayers, FiList, FiChevronDown, FiChevronUp, 
  FiFilter, FiMapPin, FiEye, FiEdit2, FiTrash2, FiClock,
  FiUserPlus, FiGrid, FiPrinter, FiX, FiRotateCcw
} from 'react-icons/fi';
import { useLeads, ROLE_HIERARCHY } from '../context/LeadContext';
import { useToast } from '../context/ToastContext';
import AddLeadModal from '../components/modals/AddLeadModal';
import { api } from '../services/api';
import { voyageApi } from '../services/voyageApi';
import './LeadList.css';

const LeadList = () => {
  const { state, dispatch } = useLeads();
  const addToast = useToast();
  const navigate = useNavigate();

  const userRole = state.currentUser?.role || 'Viewer';
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);

  // Fetch templates when modal opens
  useEffect(() => {
    if (showBulkEmailModal && emailTemplates.length === 0) {
      const fetchTemplates = async () => {
        try {
          const list = await voyageApi.getEmailTemplates();
          setEmailTemplates(list.filter(t => t.is_active));
        } catch (e) {
          console.error('Failed to load email templates', e);
        }
      };
      fetchTemplates();
    }
  }, [showBulkEmailModal, emailTemplates.length]);

  const initialFilters = {
    from: '',
    to: '',
    priority: 'All',
    status: 'All',
    source: 'All',
    assignedTo: 'All',
    owner: 'All',
    enquiryType: 'All',
    destination: '',
    statusFilterTab: 'All',
    limit: 25,
    searchTable: ''
  };

  const [filters, setFilters] = useState(initialFilters);

  // Fetch leads on mount if empty
  useEffect(() => {
    const fetchLeads = async () => {
      if (state.leads.length === 0) {
        dispatch({ type: 'FETCH_START' });
        try {
          const data = await api.getLeads();
          dispatch({ type: 'SET_LEADS', payload: data });
        } catch (error) {
          dispatch({ type: 'FETCH_ERROR', payload: error.message });
        }
      }
    };
    fetchLeads();
  }, [dispatch, state.leads.length]);

  // Ensure users are loaded for counselor & owner dropdowns
  useEffect(() => {
    if ((state.users || []).length === 0) {
      api.getUsers()
        .then(u => { if (Array.isArray(u) && u.length > 0) dispatch({ type: 'SET_USERS', payload: u }); })
        .catch(() => {});
    }
  }, [state.users, dispatch]);

  const handleInputChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  // Distinct lists for dynamic dropdown filters
  const uniqueAssignedTo = useMemo(() => {
    const s = new Set();
    (state.leads || []).forEach(l => { if (l.assigned_to) s.add(l.assigned_to); });
    (state.users || []).forEach(u => { if (u.name) s.add(u.name); });
    return Array.from(s).sort();
  }, [state.leads, state.users]);

  const uniqueOwners = useMemo(() => {
    const s = new Set();
    (state.leads || []).forEach(l => { if (l.owner) s.add(l.owner); });
    (state.users || []).forEach(u => { if (u.name) s.add(u.name); });
    return Array.from(s).sort();
  }, [state.leads, state.users]);

  const uniqueSources = useMemo(() => {
    const s = new Set(['Google Ad', 'Phone Call', 'Referral', 'Walk-in', 'WhatsApp', 'Other']);
    (state.leads || []).forEach(l => { if (l.lead_source) s.add(l.lead_source); });
    return Array.from(s).sort();
  }, [state.leads]);

  const ENQUIRY_CATEGORIES = ['Flight', 'Hotel', 'Visa', 'Package', 'Passport Assistance'];

  const CATEGORY_STYLES = {
    'Flight': { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD', icon: '✈️' },
    'Hotel': { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', icon: '🏨' },
    'Visa': { bg: '#EDE9FE', color: '#6D28D9', border: '#DDD6FE', icon: '🛂' },
    'Package': { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0', icon: '🎒' },
    'Passport Assistance': { bg: '#E0E7FF', color: '#4338CA', border: '#C7D2FE', icon: '📘' },
    'Custom': { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB', icon: '📋' }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priority !== 'All') count++;
    if (filters.status !== 'All') count++;
    if (filters.source !== 'All') count++;
    if (filters.assignedTo !== 'All') count++;
    if (filters.owner !== 'All') count++;
    if (filters.enquiryType !== 'All') count++;
    if (filters.destination) count++;
    if (filters.from) count++;
    if (filters.to) count++;
    return count;
  }, [filters]);

  // Inactivity SLA Helper (§6)
  const getStaleness = (lead) => {
    if (['Lost', 'Cancelled', 'Unqualified', 'Booked', 'Converted'].includes(lead.status)) return null;
    const lastActive = new Date(lead.updated_at || lead.updatedAt || lead.created_at || lead.createdAt || Date.now());
    if (isNaN(lastActive.getTime())) return null;
    const diffHours = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);
    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      return { isStale: true, days, hours: Math.floor(diffHours) };
    }
    return null;
  };

  // Robust Search Logic & Multi-Dimensional Advanced Filters
  const filteredLeads = useMemo(() => {
    if (!state.leads) return [];
    
    return state.leads.filter(lead => {
      const searchStr = (filters.searchTable || '').toLowerCase().trim();
      const matchesSearch = !searchStr || [
        lead.id,
        lead.lead_code,
        lead.first_name,
        lead.last_name,
        lead.email,
        lead.mobile,
        lead.destination,
        lead.lost_reason,
        lead.notes,
        lead.assigned_to,
        lead.owner
      ].some(val => val?.toLowerCase().includes(searchStr));

      // Quick Tab filter
      let matchesTab = true;
      if (filters.statusFilterTab === 'Lost') {
        matchesTab = ['Lost', 'Cancelled', 'Unqualified'].includes(lead.status);
      } else if (filters.statusFilterTab === 'Active') {
        matchesTab = !['Lost', 'Cancelled', 'Unqualified', 'Converted', 'Booked'].includes(lead.status);
      } else if (filters.statusFilterTab === 'Qualified') {
        matchesTab = lead.status === 'Qualified';
      } else if (filters.statusFilterTab === 'Stale') {
        const stale = getStaleness(lead);
        matchesTab = !!stale?.isStale;
      } else if (filters.statusFilterTab === 'Booked') {
        matchesTab = ['Booked', 'Converted'].includes(lead.status);
      }

      // Dropdown filters
      const matchesStatus = filters.status === 'All' || lead.status === filters.status;
      const matchesPriority = filters.priority === 'All' || lead.priority === filters.priority;
      const matchesSource = filters.source === 'All' || lead.lead_source === filters.source;
      const matchesAssigned = filters.assignedTo === 'All' || lead.assigned_to === filters.assignedTo;
      const matchesOwner = filters.owner === 'All' || lead.owner === filters.owner;
      
      const matchesCategory = filters.enquiryType === 'All' || (
        Array.isArray(lead.enquiry_types)
          ? lead.enquiry_types.includes(filters.enquiryType)
          : (lead.category === filters.enquiryType)
      );

      const matchesDestination = !filters.destination || (lead.destination || '').toLowerCase().includes(filters.destination.toLowerCase().trim());

      // Date Range filter (created_at)
      let matchesDate = true;
      if (filters.from || filters.to) {
        const createdDate = new Date(lead.created_at || lead.createdAt || 0);
        if (filters.from) {
          const fromDate = new Date(filters.from);
          fromDate.setHours(0, 0, 0, 0);
          if (createdDate < fromDate) matchesDate = false;
        }
        if (filters.to && matchesDate) {
          const toDate = new Date(filters.to);
          toDate.setHours(23, 59, 59, 999);
          if (createdDate > toDate) matchesDate = false;
        }
      }

      return matchesSearch && matchesTab && matchesStatus && matchesPriority && matchesSource && matchesAssigned && matchesOwner && matchesCategory && matchesDestination && matchesDate;
    });
  }, [state.leads, filters]);

  const statusColors = { 
    New: '#10B981', 
    'Attempting Contact': '#6366F1',
    Working: '#3B82F6', 
    Qualified: '#009846',
    'Proposal Sent': '#8B5CF6', 
    Negotiating: '#F59E0B', 
    Booked: '#0D9488', 
    Converted: '#059669',
    Lost: '#EF4444',
    Cancelled: 'var(--color-red)',
    Unqualified: '#9CA3AF'
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const toggleSelectLead = (e, id) => {
    e.stopPropagation();
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (action) => {
    if (selectedLeads.length === 0) return addToast('Please select at least one booking', 'error');
    if (action === 'Email') {
      setShowBulkEmailModal(true);
      return;
    }
    if (window.confirm(`Are you sure you want to perform ${action} on ${selectedLeads.length} bookings?`)) {
      console.log(`Performing ${action} on:`, selectedLeads);
      // Implementation for other bulk API calls
    }
  };

  const handleSendBulkEmails = async () => {
    if (!selectedTemplateId) {
      addToast('Please select an email template.', 'error');
      return;
    }
    setSendingBulk(true);
    try {
      const response = await voyageApi.sendBulkEmails({
        booking_ids: selectedLeads,
        template_id: selectedTemplateId
      });
      addToast(response.message || `Bulk email process finished successfully!`, 'success');
      setSelectedLeads([]);
      setShowBulkEmailModal(false);
    } catch (e) {
      addToast(e.message || 'Failed to send bulk emails', 'error');
    }
    setSendingBulk(false);
  };

  const handleDeleteLead = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this lead?')) {
      try {
        await api.deleteLead(id);
        dispatch({ type: 'DELETE_LEAD', payload: id });
        addToast('Lead deleted successfully', 'info');
      } catch (err) {
        addToast('Failed to delete lead: ' + err.message, 'error');
      }
    }
  };

  return (
    <div className="lead-list-container">
      {/* Top Action Header */}
      <div className="lead-list-header card">
        <div className="header-title">
          <FiLayers size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <h3>All Enquiries</h3>
            <p>Manage your travel enquiries and leads with real-time status updates.</p>
          </div>
        </div>
        <div className="header-actions">
            <button className="btn btn-outline btn-icon-label" onClick={handleResetFilters}><FiRotateCcw /> Clear Filters</button>
            <button className="btn btn-outline" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <FiFilter /> {isFilterExpanded ? 'Hide Filters' : 'Filter by Counselor / Type'}
              {activeFilterCount > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button className="btn btn-outline btn-icon-label" onClick={() => setIsModalOpen(true)}><FiPlus /> New Enquiry</button>
        </div>
      </div>

      <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={async (data) => {
        const newLead = await api.createLead(data);
        dispatch({ type: 'ADD_LEAD', payload: newLead });
        addToast(`Lead ${newLead.lead_code || newLead.id} created successfully!`, 'success');
        return newLead;
      }} />

      {/* Advanced Filter Section */}
      {isFilterExpanded && (
        <div className="filter-section card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiFilter color="var(--primary)" size={16} />
              <strong style={{ fontSize: '0.9rem' }}>Advanced Inquiry Filters</strong>
              {activeFilterCount > 0 && (
                <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 12, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {activeFilterCount} Active
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button 
                type="button" 
                className="btn btn-sm btn-outline" 
                onClick={handleResetFilters} 
                style={{ fontSize: '0.75rem', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <FiRotateCcw size={12} /> Reset All
              </button>
            )}
          </div>
          <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="filter-item">
              <label>Inquiry Category / Service</label>
              <select value={filters.enquiryType} onChange={e => handleInputChange('enquiryType', e.target.value)}>
                <option value="All">All Categories</option>
                {ENQUIRY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Assigned Counselor</label>
              <select value={filters.assignedTo} onChange={e => handleInputChange('assignedTo', e.target.value)}>
                <option value="All">All Counselors</option>
                {uniqueAssignedTo.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Created By (Owner)</label>
              <select value={filters.owner} onChange={e => handleInputChange('owner', e.target.value)}>
                <option value="All">All Owners</option>
                {uniqueOwners.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Lead Source</label>
              <select value={filters.source} onChange={e => handleInputChange('source', e.target.value)}>
                <option value="All">All Sources</option>
                {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Priority</label>
              <select value={filters.priority} onChange={e => handleInputChange('priority', e.target.value)}>
                <option value="All">All Priorities</option>
                <option value="Hot">Hot</option>
                <option value="Normal">Normal</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div className="filter-item">
              <label>Stage / Status</label>
              <select value={filters.status} onChange={e => handleInputChange('status', e.target.value)}>
                <option value="All">All Statuses</option>
                {['New', 'Attempting Contact', 'Working', 'Qualified', 'Proposal Sent', 'Negotiating', 'Booked', 'Converted', 'Lost', 'Cancelled', 'Unqualified'].map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>Destination / Country</label>
              <input 
                type="text" 
                placeholder="e.g. Dubai, Canada..." 
                value={filters.destination} 
                onChange={e => handleInputChange('destination', e.target.value)} 
              />
            </div>
            <div className="filter-item">
              <label>Created From Date</label>
              <input type="date" value={filters.from} onChange={e => handleInputChange('from', e.target.value)} />
            </div>
            <div className="filter-item">
              <label>Created To Date</label>
              <input type="date" value={filters.to} onChange={e => handleInputChange('to', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Quick Status Filter Tabs (Requirement 4) */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 0 10px', flexWrap: 'wrap' }}>
        {[
          { label: 'All Inquiries', value: 'All' },
          { label: 'Active Pipeline', value: 'Active' },
          { label: 'Qualified', value: 'Qualified' },
          { label: '⏰ Stale (>24h)', value: 'Stale' },
          { label: '⚠️ Lost Inquiries', value: 'Lost' },
          { label: 'Won / Booked', value: 'Booked' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => handleInputChange('statusFilterTab', tab.value)}
            className={`btn btn-sm ${filters.statusFilterTab === tab.value ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: 20, padding: '4px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="table-controls card">
         <div className="limit-box">
            <label>Limit</label>
            <select value={filters.limit} onChange={e => handleInputChange('limit', e.target.value)}>
              <option>10</option><option>25</option><option>50</option>
            </select>
         </div>
         <div className="bulk-toolbar" style={{ margin: '0 20px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => handleBulkAction('Cancel')}>Bulk Cancel</button>
            <button className="btn btn-outline btn-sm" onClick={() => handleBulkAction('Invoice')}>Bulk Invoice</button>
            <button className="btn btn-outline btn-sm" onClick={() => handleBulkAction('Email')}>Bulk Email</button>
         </div>
         <div className="search-table-box">
            <label>Global Search</label>
            <input 
              type="text" 
              placeholder="Search by ID, Name, Destination..." 
              value={filters.searchTable} 
              onChange={e => handleInputChange('searchTable', e.target.value)} 
            />
         </div>
      </div>

      {/* Leads Table */}
      <div className="leads-table-wrapper card">
        {state.isLoading ? (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading inquiries...</p>
          </div>
        ) : filteredLeads.length > 0 ? (
          <>
            <div className="desktop-table-view">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}><input type="checkbox" onChange={toggleSelectAll} checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0} /></th>
                    <th>Lead ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Category</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Latest Remark / Discussion</th>
                    <th>Assigned To</th>
                    <th>Destination</th>
                    <th>Tour Start</th>
                    <th>Created</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className={`clickable-row ${selectedLeads.includes(lead.id) ? 'selected' : ''}`}>
                      <td onClick={e => toggleSelectLead(e, lead.id)}>
                        <input type="checkbox" checked={selectedLeads.includes(lead.id)} readOnly />
                      </td>
                      <td className="lead-no">{lead.lead_code || lead.id}</td>
                      <td className="contact-name">{lead.first_name} {lead.last_name}</td>
                      <td>{lead.mobile}</td>
                      <td>
                        {(() => {
                          const cats = Array.isArray(lead.enquiry_types) && lead.enquiry_types.length > 0 
                            ? lead.enquiry_types 
                            : [lead.category || 'Package'];
                          return (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {cats.map(c => {
                                const style = CATEGORY_STYLES[c] || CATEGORY_STYLES['Custom'];
                                return (
                                  <span
                                    key={c}
                                    style={{
                                      background: style.bg,
                                      color: style.color,
                                      border: `1px solid ${style.border}`,
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <span>{style.icon}</span> {c}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>
                      <td>{lead.lead_source}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span className="lead-status-pill" style={{ background: statusColors[lead.status] || '#6B7280' }}>{lead.status}</span>
                          {(() => {
                            const stale = getStaleness(lead);
                            if (stale?.isStale) {
                              return (
                                <span title={`No counselor activity for ${stale.hours} hours`} style={{ background: '#FFF3E0', color: '#E65100', border: '1px solid #FFE0B2', borderRadius: 10, padding: '1px 6px', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                  ⏰ {stale.days > 0 ? `${stale.days}d` : `${stale.hours}h`}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220, fontSize: '0.78rem' }}>
                        {['Lost', 'Cancelled', 'Unqualified'].includes(lead.status) ? (
                          <div>
                            <span style={{ color: '#EF4444', fontWeight: 600 }}>
                              {lead.lost_reason || lead.qualification_reason || 'Lost'}
                            </span>
                            {lead.snooze_until && (
                              <div style={{ fontSize: '0.7rem', color: '#009846', fontWeight: 600, marginTop: 2 }}>
                                ⏰ Snoozed until {new Date(lead.snooze_until).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : lead.notes ? (
                          <div title={lead.notes}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.3 }}>
                              💬 {lead.notes.length > 55 ? lead.notes.slice(0, 55) + '…' : lead.notes}
                            </div>
                            {lead.next_follow_up_date && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: 2 }}>
                                ⏰ Next: {new Date(lead.next_follow_up_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>{lead.assigned_to}</td>
                      <td>{lead.destination}</td>
                      <td>{lead.travel_start_date || '—'}</td>
                      <td>
                        <div style={{ fontSize: '0.75rem' }}>{new Date(lead.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="actions-cell" onClick={e => e.stopPropagation()}>
                         <div className="action-icons-grid" style={{ justifyContent: 'flex-end' }}>
                            <div className="icon-box green" title="View" onClick={() => navigate(`/leads/${lead.id}`)}><FiEye size={12}/></div>
                            <div className="icon-box yellow" title="Edit" onClick={() => navigate(`/leads/${lead.id}`)}><FiEdit2 size={12}/></div>
                            {userLevel >= 4 && (
                              <div className="icon-box red" title="Delete" onClick={() => handleDeleteLead(lead.id)}><FiTrash2 size={12}/></div>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list">
              {filteredLeads.map(lead => (
                <div key={lead.id} className="mobile-lead-card" onClick={() => navigate(`/leads/${lead.id}`)}>
                  <div className="mobile-card-header">
                    <span className="lead-no">{lead.lead_code || lead.id}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {lead.enquiry_types && lead.enquiry_types[0] && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: (CATEGORY_STYLES[lead.enquiry_types[0]] || CATEGORY_STYLES['Custom']).color }}>
                          {(CATEGORY_STYLES[lead.enquiry_types[0]] || CATEGORY_STYLES['Custom']).icon} {lead.enquiry_types[0]}
                        </span>
                      )}
                      <span className="lead-status-pill" style={{ background: statusColors[lead.status] }}>{lead.status}</span>
                    </div>
                  </div>
                  <div className="mobile-card-body">
                    <div className="detail-row">
                      <span className="detail-label">Customer:</span>
                      <span className="detail-value">{lead.first_name} {lead.last_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Category:</span>
                      <span className="detail-value">{lead.enquiry_types?.join(', ') || lead.category || 'Package'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{lead.mobile}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Destination:</span>
                      <span className="detail-value">{lead.destination}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Assigned To:</span>
                      <span className="detail-value">{lead.assigned_to || '—'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Tour Start:</span>
                      <span className="detail-value">{lead.travel_start_date || '—'}</span>
                    </div>
                    {lead.notes && (
                      <div className="detail-row">
                        <span className="detail-label">Last Talk:</span>
                        <span className="detail-value" style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>💬 "{lead.notes}"</span>
                      </div>
                    )}
                  </div>
                  <div className="mobile-card-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/leads/${lead.id}`)}>View Details</button>
                    {userLevel >= 4 && (
                      <button className="btn btn-outline btn-sm btn-danger" onClick={() => handleDeleteLead(lead.id)} style={{ color: 'var(--color-red)', borderColor: 'var(--color-red)' }}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <FiLayers size={48} color="#ccc" />
            <h3>No Bookings Found</h3>
            <p>Try adjusting your search or filters to find what you're looking for.</p>
            <button className="btn btn-outline" onClick={() => setFilters(prev => ({ ...prev, searchTable: '', status: 'All', priority: 'All' }))}>Clear All Filters</button>
          </div>
        )}
        
        <div className="table-footer">
           <p>Showing {filteredLeads.length} of {state.leads.length} records</p>
           <div className="pagination">
              <span className="page-item active">1</span>
           </div>
        </div>
      </div>

      {showBulkEmailModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Bulk Email Selection</h3>
              <button className="close-btn" onClick={() => setShowBulkEmailModal(false)}><FiX /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                You have selected <strong>{selectedLeads.length}</strong> bookings. Choose a template to send them bulk emails.
              </p>
              <div className="form-group">
                <label>Select Email Template *</label>
                <select 
                  value={selectedTemplateId} 
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: 'var(--border-brutal)' }}
                >
                  <option value="">— Choose a template —</option>
                  {emailTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              {selectedTemplateId && (
                <div style={{ padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: '0.8rem', borderRadius: '4px' }}>
                  <strong>Subject Preview:</strong> {emailTemplates.find(t => t.id === selectedTemplateId)?.subject}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowBulkEmailModal(false)} disabled={sendingBulk}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendBulkEmails} disabled={sendingBulk || !selectedTemplateId}>
                {sendingBulk ? 'Sending...' : 'Send Bulk Emails'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FiRocket = ({ size, style }) => <FiLayers size={size} style={style} />;

export default LeadList;
