import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiCalendar, FiMapPin, FiX, FiCheck, FiInfo } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';

const BookingsList = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalForm, setModalForm] = useState({
    destination: '',
    start_at: '',
    end_at: '',
    total_sell_cents: ''
  });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await voyageApi.getBookings();
      setBookings(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch bookings. Make sure the API server is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenModal = () => {
    setModalForm({
      destination: '',
      start_at: '',
      end_at: '',
      total_sell_cents: ''
    });
    setIsModalOpen(true);
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!modalForm.destination) {
      alert('Destination is required');
      return;
    }

    try {
      setModalLoading(true);
      // Map form fields to API format (cents multiplier for total_sell_cents)
      const payload = {
        destination: modalForm.destination,
        start_at: modalForm.start_at || undefined,
        end_at: modalForm.end_at || undefined,
        total_sell_cents: Math.round(parseFloat(modalForm.total_sell_cents || 0) * 100) || 0,
        reference: 'BKG-' + Math.floor(100000 + Math.random() * 900000)
      };

      const result = await voyageApi.createBooking(payload);
      setIsModalOpen(false);
      
      // Navigate to the newly created booking page immediately
      if (result.id) {
        navigate(`/bookings/${result.id}`);
      } else {
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create booking: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const term = searchTerm.toLowerCase();
    return (
      (b.destination || '').toLowerCase().includes(term) ||
      (b.id || '').toLowerCase().includes(term) ||
      (b.last_name || '').toLowerCase().includes(term) ||
      (b.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Bookings Library</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Manage all client bookings and itineraries.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiPlus /> Create Booking
        </button>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', top: 12, left: 15, color: '#999' }} />
          <input 
            type="text" 
            placeholder="Search by booking ref, client, or destination..." 
            className="form-control" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }} 
          />
        </div>
        <button className="btn btn-outline" onClick={fetchBookings} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="card" style={{ padding: '15px 20px', background: '#FEE2E2', color: '#991B1B', marginBottom: '20px', borderLeft: '4px solid #EF4444' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '200px', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0' }}>
            <div className="spinner" style={{ border: '3px solid #f3f3f3', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', marginBottom: '10px' }}></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fetching database bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <FiInfo size={40} style={{ color: 'var(--primary)', marginBottom: '10px', opacity: 0.7 }} />
            <h3>No Bookings Found</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '5px auto 0 auto' }}>
              {searchTerm ? 'No results matched your search term.' : 'There are no active bookings in the system yet. Click "Create Booking" to add one.'}
            </p>
          </div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Client</th>
                <th>Destination</th>
                <th>Travel Dates</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(b => {
                const totalValue = b.total_sell_cents ? b.total_sell_cents / 100 : 0;
                const formattedValue = totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const startDate = b.travel_dates?.start ? new Date(b.travel_dates.start).toLocaleDateString() : '—';
                
                return (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      {b.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td>{b.last_name || 'Walk-in Client'}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FiMapPin color="var(--text-secondary)"/> {b.destination}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FiCalendar color="var(--text-secondary)"/> {startDate}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)', marginRight: '2px' }}>₹</span>{formattedValue}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        ['confirmed', 'completed'].includes((b.status || '').toLowerCase()) ? 'success' : 'warning'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {b.status || 'Enquiry'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/bookings/${b.id}`)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Creation Modal (Glassmorphic & Ultra Premium) */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '500px',
            padding: 0,
            overflow: 'hidden',
            animation: 'scaleIn 0.25s ease',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-main)'
            }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiCalendar style={{ color: 'var(--primary)' }} /> Create Custom Booking
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBooking} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Destination / Trip Name *
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Maldives Family Getaway" 
                  required
                  value={modalForm.destination}
                  onChange={e => setModalForm(prev => ({ ...prev, destination: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Estimated Booking Value (INR)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 10, left: 12, color: 'var(--text-secondary)', fontSize: '1.1rem' }}>₹</span>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 5000.00" 
                    step="0.01"
                    min="0"
                    value={modalForm.total_sell_cents}
                    onChange={e => setModalForm(prev => ({ ...prev, total_sell_cents: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px 10px 32px', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Start Date
                  </label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={modalForm.start_at}
                    onChange={e => setModalForm(prev => ({ ...prev, start_at: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    End Date
                  </label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={modalForm.end_at}
                    onChange={e => setModalForm(prev => ({ ...prev, end_at: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '10px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={modalLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {modalLoading ? 'Creating...' : <><FiCheck /> Save & View</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList;
