import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiSearch, FiLayers, FiList, FiChevronDown, FiChevronUp, 
  FiFilter, FiMapPin, FiEye, FiEdit2, FiTrash2, FiClock,
  FiUserPlus, FiGrid, FiPrinter
} from 'react-icons/fi';
import { useLeads } from '../context/LeadContext';
import AddLeadModal from '../components/AddLeadModal';
import { api } from '../services/api';
import './LeadList.css';

const LeadList = () => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);

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

  // Robust Search Logic (Requirement 4)
  const filteredLeads = useMemo(() => {
    if (!state.leads) return [];
    
    return state.leads.filter(lead => {
      const searchStr = filters.searchTable.toLowerCase();
      const matchesSearch = !searchStr || [
        lead.id,
        lead.first_name,
        lead.last_name,
        lead.email,
        lead.mobile,
        lead.destination
      ].some(val => val?.toLowerCase().includes(searchStr));

      const matchesStatus = filters.status === 'All' || lead.status === filters.status;
      const matchesPriority = filters.priority === 'All' || lead.priority === filters.priority;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [state.leads, filters.searchTable, filters.status, filters.priority]);

  const statusColors = { 
    New: '#10B981', 
    Working: '#3B82F6', 
    'Proposal Sent': '#8B5CF6', 
    Negotiating: '#F59E0B', 
    Booked: '#0D9488', 
    Lost: '#6B7280',
    Cancelled: 'var(--color-red)'
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
    if (window.confirm(`Are you sure you want to perform ${action} on ${selectedLeads.length} bookings?`)) {
      console.log(`Performing ${action} on:`, selectedLeads);
      // Implementation for bulk API calls
    }
  };

  const handleDeleteLead = async (id) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await api.deleteLead(id);
        dispatch({ type: 'SET_LEADS', payload: state.leads.filter(l => l.id !== id) });
      } catch (err) {
        alert('Failed to delete lead: ' + err.message);
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
          } catch (e) { alert(e.message); }
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
            <p>Loading bookings...</p>
          </div>
        ) : filteredLeads.length > 0 ? (
          <table className="leads-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}><input type="checkbox" onChange={toggleSelectAll} checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0} /></th>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Status</th>
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
                  <td className="lead-no">{lead.id}</td>
                  <td className="contact-name">{lead.first_name} {lead.last_name}</td>
                  <td>{lead.mobile}</td>
                  <td>{lead.lead_source}</td>
                  <td><span className="lead-status-pill" style={{ background: statusColors[lead.status] }}>{lead.status}</span></td>
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
                        <div className="icon-box red" title="Delete" onClick={() => handleDeleteLead(lead.id)}><FiTrash2 size={12}/></div>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
};

const FiRocket = ({ size, style }) => <FiLayers size={size} style={style} />;

export default LeadList;
