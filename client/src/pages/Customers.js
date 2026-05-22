import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../context/LeadContext';
import { 
  FiPlus, FiSearch, FiLayers, FiList, FiChevronDown, FiChevronUp, 
  FiMapPin, FiEye, FiEdit2, FiTrash2, FiClock, FiPhone, FiMessageCircle,
  FiUserPlus, FiUpload, FiDownload, FiUser, FiHome
} from 'react-icons/fi';
import { api } from '../services/api';
import CustomerModal from '../components/CustomerModal';
import './LeadList.css'; // Reusing established table styles

const Customers = () => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view' | 'edit' | 'create'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
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

  // Fetch customers on mount if empty
  useEffect(() => {
    const fetchCustomers = async () => {
      if (state.customers.length === 0) {
        dispatch({ type: 'FETCH_START' });
        try {
          const data = await api.getCustomers();
          dispatch({ type: 'SET_CUSTOMERS', payload: data });
        } catch (error) {
          dispatch({ type: 'FETCH_ERROR', payload: error.message });
        }
      }
    };
    fetchCustomers();
  }, [dispatch, state.customers.length]);

  const handleInputChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  // Robust Search Logic
  const filteredCustomers = useMemo(() => {
    if (!state.customers) return [];
    
    return state.customers.filter(c => {
      const searchStr = filters.searchTable.toLowerCase();
      const matchesSearch = !searchStr || [
        c.first_name,
        c.last_name,
        c.email,
        c.mobile,
        c.city
      ].some(val => val?.toLowerCase().includes(searchStr));

      const matchesType = filters.type === 'All' || c.type === filters.type || !c.type;
      
      return matchesSearch && matchesType;
    });
  }, [state.customers, filters.searchTable, filters.type]);

  const handleWhatsApp = (mobile) => {
    if (!mobile) return alert('No mobile number available');
    window.open(`https://wa.me/${mobile.replace(/\D/g, '')}`, '_blank');
  };

  const handleDeleteCustomer = async (id, firstName, lastName) => {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'this customer';
    if (window.confirm(`Are you sure you want to delete ${fullName}?`)) {
      try {
        await api.deleteCustomer(id);
        dispatch({ type: 'DELETE_CUSTOMER', payload: id });
      } catch (error) {
        alert(error.message || 'Failed to delete customer');
      }
    }
  };

  const handleSaveCustomer = async (data) => {
    try {
      if (modalMode === 'create') {
        const newCustomer = await api.createCustomer(data);
        dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
      } else if (modalMode === 'edit' && selectedCustomer) {
        const updated = await api.updateCustomer(selectedCustomer.id, data);
        dispatch({ type: 'UPDATE_CUSTOMER', payload: { id: selectedCustomer.id, data: updated } });
      }
    } catch (err) {
      alert(err.message || 'Failed to save customer data');
    }
  };

  return (
    <div className="lead-list-container">
      {/* Header */}
      <div className="lead-list-header card">
        <div className="header-title">
          <FiRocket size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <h3>Customer Management</h3>
            <p>View and manage all customer profiles, loyalty points, and history.</p>
          </div>
        </div>
        <div className="header-actions">
           <button className="btn btn-outline" onClick={() => handleInputChange('searchTable', '')}><FiSearch /> Reset Search</button>
           <button className="btn btn-primary" onClick={() => { setSelectedCustomer(null); setModalMode('create'); setIsModalOpen(true); }}><FiPlus /> Add Customer</button>
           <button className="btn btn-outline"><FiUpload /> Import CSV</button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section card">
         <div className="filter-toggle" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
            <button className="btn btn-outline btn-sm">
              Advanced Filters {isFilterExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>
         </div>

         {isFilterExpanded && (
           <div className="filter-content">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#666', cursor: 'pointer' }}>
                   <input type="radio" name="custType" checked={filters.type === 'Customer'} onChange={() => handleInputChange('type', 'Customer')} style={{ accentColor: 'var(--primary)' }} /> All Customers
                 </label>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#666', cursor: 'pointer' }}>
                   <input type="radio" name="custType" checked={filters.type === 'Family'} onChange={() => handleInputChange('type', 'Family')} style={{ accentColor: 'var(--primary)' }} /> Corporate
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
                  <label>Mobile Number</label>
                  <input type="text" placeholder="Enter Mobile Number" value={filters.mobileNumber} onChange={e => handleInputChange('mobileNumber', e.target.value)} />
                </div>
                <div className="filter-item">
                  <label>Customer Type</label>
                  <select value={filters.customerType} onChange={e => handleInputChange('customerType', e.target.value)}>
                    <option>All</option><option>Regular</option><option>VIP</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <button className="btn btn-primary" onClick={() => setIsFilterExpanded(false)} style={{ padding: '8px 24px' }}>Apply Filters</button>
              </div>
           </div>
         )}
      </div>

      <div className="table-controls card">
         <div className="limit-box">
            <label>Show</label>
            <select value={filters.limit} onChange={e => handleInputChange('limit', e.target.value)} style={{ width: '100px' }}>
              <option>10</option><option>25</option><option>50</option>
            </select>
            <span>entries</span>
         </div>
         <div className="search-table-box">
            <label>Search Customer</label>
            <input 
              type="text" 
              placeholder="Name, Phone, Email..." 
              value={filters.searchTable} 
              onChange={e => handleInputChange('searchTable', e.target.value)} 
              style={{ width: '250px' }} 
            />
         </div>
      </div>

      <div className="leads-table-wrapper card">
        {state.isLoading ? (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading customers...</p>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact Information</th>
                <th>Location</th>
                <th>Loyalty Points</th>
                <th>Lead Score</th>
                <th>Tags</th>
                <th>Account Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--primary)', fontWeight: 500 }}>{c.first_name} {c.last_name}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{c.mobile}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{c.email || 'No email'}</div>
                  </td>
                  <td>{c.city || '—'}</td>
                  <td><span className="badge badge-info">{c.loyalty_points || 0} pts</span></td>
                  <td><span className="badge" style={{ background: c.lead_score > 80 ? '#fef3c7' : '#f3f4f6', color: c.lead_score > 80 ? '#92400e' : '#374151' }}>{c.lead_score || 0}</span></td>
                  <td>
                    {c.preferences_json && JSON.parse(c.preferences_json)?.tags?.length > 0 ? (
                      JSON.parse(c.preferences_json).tags.map(t => <span key={t} style={{ fontSize: '0.7rem', background: '#e0e7ff', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>{t}</span>)
                    ) : '—'}
                  </td>
                  <td><span className="badge badge-success">Active</span></td>
                  <td className="actions-cell">
                     <div className="action-icons-grid" style={{ justifyContent: 'flex-end' }}>
                        <div className="icon-box green" title="View Profile" onClick={() => { setSelectedCustomer(c); setModalMode('view'); setIsModalOpen(true); }}><FiUser size={12}/></div>
                        <div className="icon-box orange" title="Edit" onClick={() => { setSelectedCustomer(c); setModalMode('edit'); setIsModalOpen(true); }}><FiEdit2 size={12}/></div>
                        <div className="icon-box green" title="WhatsApp" onClick={() => handleWhatsApp(c.mobile)}><FiMessageCircle size={12}/></div>
                        <div className="icon-box red" title="Delete" onClick={() => handleDeleteCustomer(c.id, c.first_name, c.last_name)}><FiTrash2 size={12}/></div>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <FiUser size={48} color="#ccc" />
            <h3>No Customers Found</h3>
            <p>Try a different search term or check your filters.</p>
          </div>
        )}
      </div>

      <CustomerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
        mode={modalMode}
      />
    </div>
  );
};

const FiRocket = ({ size, style }) => <FiLayers size={size} style={style} />;

export default Customers;
