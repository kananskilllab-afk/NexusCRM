import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { 
  FiPlus, FiSearch, FiLayers, FiList, FiChevronDown, FiChevronUp, 
  FiMapPin, FiEye, FiEdit2, FiTrash2, FiClock, FiPhone, FiMessageCircle,
  FiUserPlus, FiUpload, FiDownload, FiUser, FiHome
} from 'react-icons/fi';
import './LeadList.css'; // Reusing established table styles

const Customers = () => {
  const { state } = useLeads();
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [filters, setFilters] = useState({
    type: 'Customer',
    salutation: 'All',
    firstName: '',
    lastName: '',
    mobileNumber: '',
    emailId: '',
    customerType: 'All',
    source: 'All',
    tags: '',
    limit: 10,
    searchTable: ''
  });

  const handleInputChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  const customers = state.leads || []; // Deriving from leads for demo

  return (
    <div className="lead-list-container">
      {/* Header */}
      <div className="lead-list-header card">
        <div className="header-title">
          <FiRocket size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <h3>All Customers</h3>
            <p>Check your all customers basic details.</p>
          </div>
        </div>
        <div className="header-actions">
           <button className="btn btn-outline"><FiSearch /> Search B2B Customer</button>
           <button className="btn btn-outline"><FiPlus /> Add Customer</button>
           <button className="btn btn-outline"><FiUpload /> Upload</button>
           <button className="btn btn-outline"><FiUserPlus /> Add B2B Company</button>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-section card">
         <div className="filter-toggle" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
            <button className="btn btn-outline btn-sm">
              Advanced Filter {isFilterExpanded ? <span className="icon-circle-small">−</span> : <span className="icon-circle-small">+</span>}
            </button>
         </div>

         {isFilterExpanded && (
           <div className="filter-content">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#666', cursor: 'pointer' }}>
                   <input type="radio" name="custType" checked={filters.type === 'Customer'} onChange={() => handleInputChange('type', 'Customer')} style={{ accentColor: 'var(--primary)' }} /> Customer
                 </label>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#666', cursor: 'pointer' }}>
                   <input type="radio" name="custType" checked={filters.type === 'Family'} onChange={() => handleInputChange('type', 'Family')} style={{ accentColor: 'var(--primary)' }} /> Family
                 </label>
              </div>

              <div className="filter-grid">
                <div className="filter-item">
                  <label>Salutation</label>
                  <select value={filters.salutation} onChange={e => handleInputChange('salutation', e.target.value)}>
                    <option>All</option><option>Mr.</option><option>Mrs.</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>First Name</label>
                  <input type="text" placeholder="Enter First Name" value={filters.firstName} onChange={e => handleInputChange('firstName', e.target.value)} />
                </div>
                <div className="filter-item">
                  <label>Last Name</label>
                  <input type="text" placeholder="Enter Last Name" value={filters.lastName} onChange={e => handleInputChange('lastName', e.target.value)} />
                </div>
                <div className="filter-item">
                  <label>Mobile Number</label>
                  <input type="text" placeholder="Enter Mobile Number" value={filters.mobileNumber} onChange={e => handleInputChange('mobileNumber', e.target.value)} />
                </div>
                <div className="filter-item">
                  <label>Email Id</label>
                  <input type="text" placeholder="Enter Email Id" value={filters.emailId} onChange={e => handleInputChange('emailId', e.target.value)} />
                </div>
                <div className="filter-item">
                  <label>Customer Type</label>
                  <select value={filters.customerType} onChange={e => handleInputChange('customerType', e.target.value)}>
                    <option>All</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Source</label>
                  <select value={filters.source} onChange={e => handleInputChange('source', e.target.value)}>
                    <option>All</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Tags</label>
                  <input type="text" value={filters.tags} onChange={e => handleInputChange('tags', e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <button className="btn btn-primary" style={{ padding: '8px 24px' }}>Search</button>
              </div>
           </div>
         )}
      </div>

      <div className="table-controls card">
         <div className="limit-box">
            <label>Limit</label>
            <select value={filters.limit} onChange={e => handleInputChange('limit', e.target.value)} style={{ width: '200px' }}>
              <option>10</option><option>25</option><option>50</option>
            </select>
         </div>
         <div className="search-table-box">
            <label>Search</label>
            <input type="text" placeholder="Search.." value={filters.searchTable} onChange={e => handleInputChange('searchTable', e.target.value)} style={{ width: '200px' }} />
         </div>
      </div>

      <div className="leads-table-wrapper card">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Contact Name <FiSearch size={12}/></th>
              <th>Phone <FiSearch size={12}/></th>
              <th>Email <FiSearch size={12}/></th>
              <th>City <FiSearch size={12}/></th>
              <th>Created By</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td style={{ color: 'var(--primary)', fontWeight: 500 }}>{c.first_name} {c.last_name}</td>
                <td>{c.mobile}</td>
                <td>—</td>
                <td>Vadodara</td>
                <td>—</td>
                <td className="actions-cell">
                   <div className="action-icons-grid" style={{ justifyContent: 'flex-end' }}>
                      <div className="icon-box green"><FiEye size={12}/></div>
                      <div className="icon-box orange"><FiEdit2 size={12}/></div>
                      <div className="icon-box red"><FiPhone size={12}/></div>
                      <div className="icon-box green"><FiMessageCircle size={12}/></div>
                      <div className="icon-box red"><FiTrash2 size={12}/></div>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FiRocket = ({ size, style }) => <FiLayers size={size} style={style} />;

export default Customers;
