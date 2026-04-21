import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiSearch, FiLayers, FiList, FiChevronDown, FiChevronUp, 
  FiFilter, FiMapPin, FiEye, FiEdit2, FiTrash2, FiClock,
  FiUserPlus, FiGrid, FiPrinter
} from 'react-icons/fi';
import { useLeads } from '../context/LeadContext';
import AddLeadModal from '../components/AddLeadModal';
import './LeadList.css';

const LeadList = () => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Massive Filter State
  const [filters, setFilters] = useState({
    from: '27-3-2026',
    to: '21-4-2026',
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

  const handleInputChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const leads = state.leads || [];

  const statusColors = { 
    New: '#10B981', 
    Working: '#3B82F6', 
    'Proposal Sent': '#8B5CF6', 
    Negotiating: '#F59E0B', 
    Booked: '#0D9488', 
    Lost: '#6B7280' 
  };

  return (
    <div className="lead-list-container">
      {/* Top Action Header */}
      <div className="lead-list-header card">
        <div className="header-title">
          <FiRocket size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <h3>All Leads</h3>
            <p>View All leads and apply various filters.</p>
          </div>
        </div>
        <div className="header-actions">
           <button className="btn btn-outline btn-icon-label"><FiSearch /> Search</button>
           <button className="btn btn-outline">Bulk Change Lead User</button>
           <button className="btn btn-outline btn-icon-label"><FiList /> Follow Up Lead List</button>
           <button className="btn btn-outline btn-icon-label" onClick={() => setIsModalOpen(true)}><FiPlus /> Add Lead</button>
        </div>
      </div>

      <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={(data) => {
          dispatch({ type: 'ADD_LEAD', payload: { ...data, id: `L-${Date.now()}`, created_at: new Date().toISOString() } });
          setIsModalOpen(false);
      }} />

      {/* Advanced Filter Section */}
      <div className="filter-section card">
         <div className="filter-toggle" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
            <button className="btn btn-outline btn-sm">
              Advanced Filter {isFilterExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>
         </div>

         {isFilterExpanded && (
           <div className="filter-grid">
              <div className="filter-item">
                <label>From</label>
                <input type="text" value={filters.from} onChange={e => handleInputChange('from', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>To</label>
                <input type="text" value={filters.to} onChange={e => handleInputChange('to', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>Lead Priority</label>
                <select value={filters.priority} onChange={e => handleInputChange('priority', e.target.value)}>
                  <option>All</option><option>Hot</option><option>Normal</option><option>Cold</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Lead Status</label>
                <select value={filters.status} onChange={e => handleInputChange('status', e.target.value)}>
                  <option>All</option><option>New</option><option>Working</option><option>Proposal Sent</option><option>Booked</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Lead Sub Status</label>
                <select value={filters.subStatus} onChange={e => handleInputChange('subStatus', e.target.value)}>
                  <option>All</option><option>Awaiting Response</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Lead Source</label>
                <select value={filters.source} onChange={e => handleInputChange('source', e.target.value)}>
                  <option>All</option><option>Website</option><option>Referral</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Assigned To</label>
                <select value={filters.assignedTo} onChange={e => handleInputChange('assignedTo', e.target.value)}>
                  <option>All</option><option>Admin</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Enquiry Type</label>
                <input type="text" value={filters.enquiryType} onChange={e => handleInputChange('enquiryType', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>Lead Number</label>
                <input type="text" placeholder="Lead Number" value={filters.leadNumber} onChange={e => handleInputChange('leadNumber', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>Firstname</label>
                <input type="text" placeholder="Firstname" value={filters.firstName} onChange={e => handleInputChange('firstName', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>Lastname</label>
                <input type="text" placeholder="Lastname" value={filters.lastName} onChange={e => handleInputChange('lastName', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>Mobile Number</label>
                <input type="text" placeholder="Mobile Number" value={filters.mobileNumber} onChange={e => handleInputChange('mobileNumber', e.target.value)} />
              </div>
              <div className="filter-item" style={{ gridColumn: 'span 2' }}>
                <label>Email Id</label>
                <input type="text" placeholder="Enter Email Id" value={filters.emailId} onChange={e => handleInputChange('emailId', e.target.value)} />
              </div>
              <div className="filter-item">
                <label>Tags</label>
                <select value={filters.tags} onChange={e => handleInputChange('tags', e.target.value)}>
                  <option>All</option>
                </select>
              </div>
              <div className="filter-actions">
                 <button className="btn btn-primary" style={{ height: '38px', marginTop: '1.4rem' }}>Search</button>
              </div>
           </div>
         )}
      </div>

      <div className="table-controls card">
         <div className="limit-box">
            <label>Limit</label>
            <select value={filters.limit} onChange={e => handleInputChange('limit', e.target.value)}>
              <option>10</option><option>25</option><option>50</option>
            </select>
         </div>
         <div className="search-table-box">
            <label>Search</label>
            <input type="text" placeholder="Search.." value={filters.searchTable} onChange={e => handleInputChange('searchTable', e.target.value)} />
         </div>
      </div>

      {/* Leads Table */}
      <div className="leads-table-wrapper card">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Lead No. <FiLayers size={12}/></th>
              <th>Contact Name <FiUserPlus size={12}/></th>
              <th>Phone <FiSearch size={12}/></th>
              <th>Lead Source <FiSearch size={12}/></th>
              <th>Lead Status <FiSearch size={12}/></th>
              <th>Assigned <FiSearch size={12}/></th>
              <th>Current <FiSearch size={12}/></th>
              <th>Destination <FiMapPin size={12}/></th>
              <th>Trip Type <FiSearch size={12}/></th>
              <th>Enquiry Type <FiSearch size={12}/></th>
              <th>Tags <FiSearch size={12}/></th>
              <th>Tour Start <FiClock size={12}/></th>
              <th>Created <FiClock size={12}/></th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="clickable-row">
                <td className="lead-no">{lead.id}</td>
                <td className="contact-name">{lead.first_name} {lead.last_name}</td>
                <td>{lead.mobile}</td>
                <td>{lead.lead_source}</td>
                <td><span className="lead-status-pill" style={{ background: statusColors[lead.status] }}>{lead.status}</span></td>
                <td>{lead.assigned_to}</td>
                <td>{lead.assigned_to}</td>
                <td>{lead.destination}</td>
                <td>Other</td>
                <td>—</td>
                <td>—</td>
                <td>{lead.travel_start_date || '—'}</td>
                <td>
                  <div style={{ fontSize: '0.75rem' }}>{new Date(lead.created_at).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>{new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="actions-cell" onClick={e => e.stopPropagation()}>
                   <div className="action-icons-grid">
                      <div className="icon-box purple" title="Gift"><FiPlus size={12}/></div>
                      <div className="icon-box cyan" title="Documents"><FiPlus size={12}/></div>
                      <div className="icon-box orange" title="Tickets"><FiPlus size={12}/></div>
                      <div className="icon-box green" title="View"><FiEye size={12}/></div>
                      <div className="icon-box yellow" title="Edit"><FiEdit2 size={12}/></div>
                      <div className="icon-box red" title="Delete"><FiTrash2 size={12}/></div>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="table-footer">
           <p>Total Number Of Leads based on Above Search: {leads.length}</p>
           <div className="pagination">
              <span className="page-item active">1</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const FiRocket = ({ size, style }) => <FiLayers size={size} style={style} />; // Placeholder icon shift

export default LeadList;
