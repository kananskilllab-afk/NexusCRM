import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiSearch, FiLayers, FiList, FiChevronDown, FiChevronUp, 
  FiFilter, FiMapPin, FiEye, FiEdit2, FiTrash2, FiClock,
  FiUserPlus, FiGrid, FiPrinter, FiX
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

  // Massive Filter State
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    priority: 'All',
    status: 'All',
    subStatus: 'All',
    source: 'All',
    assignedTo: 'All',
    enquiryType: '',
    leadNumber: '',
    firstName: '',
    lastName: '',
    mobileNumber: '',
    emailId: '',
    tags: 'All',
    limit: 10,
    searchTable: ''
  });

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

  const handleInputChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

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

  // Robust Search Logic & Lost Inquiries Filter (Requirement 4)
  const filteredLeads = useMemo(() => {
    if (!state.leads) return [];
    
    return state.leads.filter(lead => {
      const searchStr = filters.searchTable.toLowerCase();
      const matchesSearch = !searchStr || [
        lead.id,
        lead.lead_code,
        lead.first_name,
        lead.last_name,
        lead.email,
        lead.mobile,
        lead.destination,
        lead.lost_reason,
        lead.notes
      ].some(val => val?.toLowerCase().includes(searchStr));

      // Tab filter
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

      const matchesStatus = filters.status === 'All' || lead.status === filters.status;
      const matchesPriority = filters.priority === 'All' || lead.priority === filters.priority;
      
      return matchesSearch && matchesTab && matchesStatus && matchesPriority;
    });
  }, [state.leads, filters.searchTable, filters.status, filters.priority, filters.statusFilterTab]);

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
    if (selectedLeads.length === 0) return alert('Please select at least one booking');
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
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await api.deleteLead(id);
        dispatch({ type: 'SET_LEADS', payload: state.leads.filter(l => l.id !== id) });
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
          <FiRocket size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <h3>All Enquiries</h3>
            <p>Manage your travel enquiries and leads with real-time status updates.</p>
          </div>
        </div>
        <div className="header-actions">
           <button className="btn btn-outline btn-icon-label" onClick={() => handleInputChange('searchTable', '')}><FiSearch /> Clear Filters</button>
           <button className="btn btn-outline" onClick={() => setIsFilterExpanded(!isFilterExpanded)}><FiFilter /> {isFilterExpanded ? 'Hide' : 'Show'} Filters</button>
           <button className="btn btn-outline btn-icon-label" onClick={() => setIsModalOpen(true)}><FiPlus /> New Enquiry</button>
        </div>
      </div>

      <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={async (data) => {
          try {
            const newLead = await api.createLead(data);
            dispatch({ type: 'ADD_LEAD', payload: newLead });
            setIsModalOpen(false);
            addToast(`Lead ${newLead.lead_code || newLead.id} created successfully!`, 'success');
          } catch (e) {
            addToast(e.message || 'Failed to create lead', 'error');
          }
      }} />

      {/* Advanced Filter Section */}
      {isFilterExpanded && (
        <div className="filter-section card">
           <div className="filter-grid">
              <div className="filter-item">
                <label>From Date</label>
                <input type="date" value={filters.from} onChange={e => handleInputChange('from', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>To Date</label>
                <input type="date" value={filters.to} onChange={e => handleInputChange('to', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>Priority</label>
                <select value={filters.priority} onChange={e => handleInputChange('priority', e.target.value)}>
                  <option>All</option><option>Hot</option><option>Normal</option><option>Cold</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Status</label>
                <select value={filters.status} onChange={e => handleInputChange('status', e.target.value)}>
                  <option>All</option><option>New</option><option>Working</option><option>Proposal Sent</option><option>Booked</option><option>Cancelled</option>
                </select>
              </div>
              <div className="filter-actions" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-end' }}>
                 <button className="btn btn-primary" onClick={() => setIsFilterExpanded(false)} style={{ width: '100%' }}>Apply Advanced Filters</button>
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
                    <th>Source</th>
                    <th>Status</th>
                    <th>Lost Reason / Remarks</th>
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
                      <td style={{ maxWidth: 200, fontSize: '0.78rem' }}>
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
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            {lead.notes ? (lead.notes.length > 30 ? lead.notes.slice(0, 30) + '...' : lead.notes) : '—'}
                          </span>
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
                    <span className="lead-status-pill" style={{ background: statusColors[lead.status] }}>{lead.status}</span>
                  </div>
                  <div className="mobile-card-body">
                    <div className="detail-row">
                      <span className="detail-label">Customer:</span>
                      <span className="detail-value">{lead.first_name} {lead.last_name}</span>
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
