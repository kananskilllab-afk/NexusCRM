import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMap, FiPlus, FiTrash2, FiCheck, FiX, FiUsers, FiLayers } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';

const SEGMENT_ICONS = { flight: '✈️', hotel: '🏨', transfer: '🚐', tour: '🗺️', cruise: '🚢', rail: '🚆', car_hire: '🚗', insurance: '🛡️', other: '📦' };
const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444', on_request: '#6366f1', waitlisted: '#8b5cf6' };

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Segments');
  const [passengers, setPassengers] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPassenger, setShowAddPassenger] = useState(false);
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [passengerForm, setPassengerForm] = useState({ first_name: '', last_name: '', dob: '', passport_num: '', passport_expiry: '', nationality: '' });
  const [segmentForm, setSegmentForm] = useState({ segment_type: 'flight', start_at: '', end_at: '', cost_cents: '', sell_cents: '', confirmation_ref: '', status: 'pending' });

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([
          voyageApi.getPassengers(id),
          voyageApi.getSegments(id)
        ]);
        setPassengers(p);
        setSegments(s);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleAddPassenger = async () => {
    try {
      await voyageApi.addPassenger(id, passengerForm);
      const updated = await voyageApi.getPassengers(id);
      setPassengers(updated);
      setShowAddPassenger(false);
      setPassengerForm({ first_name: '', last_name: '', dob: '', passport_num: '', passport_expiry: '', nationality: '' });
    } catch (e) { alert(e.message); }
  };

  const handleDeletePassenger = async (passengerId) => {
    if (!window.confirm('Remove this passenger?')) return;
    try {
      await voyageApi.deletePassenger(id, passengerId);
      setPassengers(prev => prev.filter(p => p.id !== passengerId));
    } catch (e) { alert(e.message); }
  };

  const handleAddSegment = async () => {
    try {
      await voyageApi.addSegment(id, {
        ...segmentForm,
        cost_cents: parseInt(segmentForm.cost_cents) || 0,
        sell_cents: parseInt(segmentForm.sell_cents) || 0
      });
      const updated = await voyageApi.getSegments(id);
      setSegments(updated);
      setShowAddSegment(false);
      setSegmentForm({ segment_type: 'flight', start_at: '', end_at: '', cost_cents: '', sell_cents: '', confirmation_ref: '', status: 'pending' });
    } catch (e) { alert(e.message); }
  };

  const handleDeleteSegment = async (segmentId) => {
    if (!window.confirm('Remove this segment?')) return;
    try {
      await voyageApi.deleteSegment(id, segmentId);
      setSegments(prev => prev.filter(s => s.id !== segmentId));
    } catch (e) { alert(e.message); }
  };

  const totalCost = segments.reduce((sum, s) => sum + (s.cost_cents || 0), 0);
  const totalSell = segments.reduce((sum, s) => sum + (s.sell_cents || 0), 0);
  const profit = totalSell - totalCost;
  const profitPct = totalSell > 0 ? ((profit / totalSell) * 100).toFixed(1) : '0.0';

  const tabs = ['Segments', 'Passengers', 'Itinerary', 'Financials', 'Communications', 'Settings'];

  return (
    <div style={{ padding: '20px' }}>
      <button id="btn-back-bookings" onClick={() => navigate('/bookings')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
        <FiArrowLeft /> Back to Bookings
      </button>

      <div className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0' }}>Booking: {id.substring(0, 8).toUpperCase()} <span className="badge badge-warning" style={{ fontSize: '0.8rem', verticalAlign: 'middle', marginLeft: '10px' }}>Active</span></h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            <FiUsers style={{ marginRight: 4 }} /> {passengers.length} passenger{passengers.length !== 1 ? 's' : ''} •
            <FiLayers style={{ marginRight: 4, marginLeft: 8 }} /> {segments.length} segment{segments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => navigate(`/itinerary/${id}/builder`)}><FiMap /> Itinerary Builder</button>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
         <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 20px', overflowX: 'auto' }}>
           {tabs.map(tab => (
             <button
               key={tab}
               id={`tab-${tab.toLowerCase()}`}
               onClick={() => setActiveTab(tab)}
               style={{ 
                 padding: '15px 20px', background: 'none', border: 'none', 
                 borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                 color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                 fontWeight: activeTab === tab ? 'bold' : 'normal', cursor: 'pointer', whiteSpace: 'nowrap'
               }}
             >
               {tab}
             </button>
           ))}
         </div>
         
         <div style={{ padding: '30px' }}>
           {/* ── SEGMENTS TAB ──────────────────────────────────────────────────── */}
           {activeTab === 'Segments' && (
             <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h3 style={{ margin: 0 }}>Travel Segments</h3>
                 <button id="btn-add-segment" className="btn btn-primary" onClick={() => setShowAddSegment(!showAddSegment)}><FiPlus /> Add Segment</button>
               </div>

               {showAddSegment && (
                 <div style={{ padding: '20px', border: '2px dashed var(--primary)', borderRadius: '8px', marginBottom: '20px', background: 'var(--bg-secondary, #f8fafc)' }}>
                   <h4 style={{ marginTop: 0 }}>New Segment</h4>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type</label>
                       <select value={segmentForm.segment_type} onChange={e => setSegmentForm(f => ({ ...f, segment_type: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                         {['flight','hotel','transfer','tour','cruise','rail','car_hire','insurance','other'].map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                       </select>
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Start Date</label>
                       <input type="date" value={segmentForm.start_at} onChange={e => setSegmentForm(f => ({ ...f, start_at: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>End Date</label>
                       <input type="date" value={segmentForm.end_at} onChange={e => setSegmentForm(f => ({ ...f, end_at: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cost (cents)</label>
                       <input type="number" placeholder="e.g. 150000" value={segmentForm.cost_cents} onChange={e => setSegmentForm(f => ({ ...f, cost_cents: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sell (cents)</label>
                       <input type="number" placeholder="e.g. 200000" value={segmentForm.sell_cents} onChange={e => setSegmentForm(f => ({ ...f, sell_cents: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confirmation Ref</label>
                       <input type="text" placeholder="PNR / Voucher #" value={segmentForm.confirmation_ref} onChange={e => setSegmentForm(f => ({ ...f, confirmation_ref: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                   </div>
                   <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                     <button className="btn btn-primary" onClick={handleAddSegment}><FiCheck /> Save Segment</button>
                     <button className="btn btn-outline" onClick={() => setShowAddSegment(false)}><FiX /> Cancel</button>
                   </div>
                 </div>
               )}

               {segments.length === 0 && !loading ? (
                 <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed #ccc', borderRadius: '8px' }}>
                   No travel segments yet. Click "Add Segment" to start building this booking.
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {segments.map(seg => (
                     <div key={seg.id} style={{ padding: '16px 20px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                         <span style={{ fontSize: '1.5rem' }}>{SEGMENT_ICONS[seg.segment_type] || '📦'}</span>
                         <div>
                           <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                             {seg.segment_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                             <span style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: 'white', background: STATUS_COLORS[seg.status] || '#999' }}>{seg.status}</span>
                           </div>
                           <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                             {seg.supplier !== 'N/A' && <span>{seg.supplier} • </span>}
                             {seg.start_at && <span>{seg.start_at}</span>}
                             {seg.end_at && <span> → {seg.end_at}</span>}
                             {seg.confirmation_ref && <span> • Ref: <strong>{seg.confirmation_ref}</strong></span>}
                           </div>
                         </div>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                         <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cost: ₹{(seg.cost_cents / 100).toLocaleString()} / Sell: ₹{(seg.sell_cents / 100).toLocaleString()}</div>
                           <div style={{ fontWeight: 'bold', color: seg.margin_cents >= 0 ? '#10b981' : '#ef4444' }}>Margin: ₹{(seg.margin_cents / 100).toLocaleString()} ({seg.margin_pct}%)</div>
                         </div>
                         <button className="btn btn-outline btn-sm" onClick={() => handleDeleteSegment(seg.id)} style={{ color: '#ef4444' }}><FiTrash2 /></button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}

               {segments.length > 0 && (
                 <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
                   <div className="card" style={{ flex: 1, background: '#f8fafc', padding: '15px' }}>
                     <div style={{ color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.85rem' }}>Total Cost</div>
                     <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>₹{(totalCost / 100).toLocaleString()}</div>
                   </div>
                   <div className="card" style={{ flex: 1, background: '#f8fafc', padding: '15px' }}>
                     <div style={{ color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.85rem' }}>Total Sell</div>
                     <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>₹{(totalSell / 100).toLocaleString()}</div>
                   </div>
                   <div className="card" style={{ flex: 1, background: profit >= 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${profit >= 0 ? '#10b981' : '#ef4444'}`, padding: '15px' }}>
                     <div style={{ color: profit >= 0 ? '#065f46' : '#991b1b', marginBottom: '5px', fontSize: '0.85rem' }}>Margin</div>
                     <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: profit >= 0 ? '#065f46' : '#991b1b' }}>₹{(profit / 100).toLocaleString()} ({profitPct}%)</div>
                   </div>
                 </div>
               )}
             </div>
           )}

           {/* ── PASSENGERS TAB ────────────────────────────────────────────────── */}
           {activeTab === 'Passengers' && (
             <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h3 style={{ margin: 0 }}>Passengers / Travellers</h3>
                 <button id="btn-add-passenger" className="btn btn-primary" onClick={() => setShowAddPassenger(!showAddPassenger)}><FiPlus /> Add Passenger</button>
               </div>

               {showAddPassenger && (
                 <div style={{ padding: '20px', border: '2px dashed var(--primary)', borderRadius: '8px', marginBottom: '20px', background: 'var(--bg-secondary, #f8fafc)' }}>
                   <h4 style={{ marginTop: 0 }}>New Passenger</h4>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>First Name *</label>
                       <input type="text" value={passengerForm.first_name} onChange={e => setPassengerForm(f => ({ ...f, first_name: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last Name *</label>
                       <input type="text" value={passengerForm.last_name} onChange={e => setPassengerForm(f => ({ ...f, last_name: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date of Birth</label>
                       <input type="date" value={passengerForm.dob} onChange={e => setPassengerForm(f => ({ ...f, dob: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Passport Number</label>
                       <input type="text" value={passengerForm.passport_num} onChange={e => setPassengerForm(f => ({ ...f, passport_num: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Passport Expiry</label>
                       <input type="date" value={passengerForm.passport_expiry} onChange={e => setPassengerForm(f => ({ ...f, passport_expiry: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nationality (ISO)</label>
                       <input type="text" maxLength={2} placeholder="IN" value={passengerForm.nationality} onChange={e => setPassengerForm(f => ({ ...f, nationality: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                     </div>
                   </div>
                   <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                     <button className="btn btn-primary" onClick={handleAddPassenger}><FiCheck /> Save Passenger</button>
                     <button className="btn btn-outline" onClick={() => setShowAddPassenger(false)}><FiX /> Cancel</button>
                   </div>
                 </div>
               )}

               {passengers.length === 0 && !loading ? (
                 <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed #ccc', borderRadius: '8px' }}>
                   No passengers added yet. Click "Add Passenger" to associate travelers with this booking.
                 </div>
               ) : (
                 <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                   <table className="leads-table">
                     <thead>
                       <tr>
                         <th>Name</th>
                         <th>Date of Birth</th>
                         <th>Passport #</th>
                         <th>Passport Expiry</th>
                         <th>Nationality</th>
                         <th>Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {passengers.map(p => (
                         <tr key={p.id}>
                           <td style={{ fontWeight: 'bold' }}>{p.first_name} {p.last_name}</td>
                           <td>{p.dob || '—'}</td>
                           <td style={{ fontFamily: 'monospace' }}>{p.passport_num || '—'}</td>
                           <td>{p.passport_expiry || '—'}</td>
                           <td>{p.nationality || '—'}</td>
                           <td>
                             <button className="btn btn-outline btn-sm" onClick={() => handleDeletePassenger(p.id)} style={{ color: '#ef4444' }}><FiTrash2 /></button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
           )}

           {/* ── ITINERARY TAB ─────────────────────────────────────────────────── */}
           {activeTab === 'Itinerary' && (
             <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>Itinerary Versions</h3>
                  <button className="btn btn-outline">Create New Version</button>
                </div>
                <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0' }}>Version 1 (Current)</h4>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Last modified today at 10:45 AM</p>
                  </div>
                  <div>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/itinerary/${id}/builder`)}>Edit</button>
                    <button className="btn btn-outline btn-sm" style={{ marginLeft: '10px' }} onClick={() => window.open(`/it/${id}`, '_blank')}>Preview Link</button>
                  </div>
                </div>
             </div>
           )}

           {/* ── FINANCIALS TAB ────────────────────────────────────────────────── */}
           {activeTab === 'Financials' && (
             <div>
               <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                 <div className="card" style={{ flex: 1, background: '#f8fafc' }}>
                   <div style={{ color: 'var(--text-secondary)', marginBottom: '5px' }}>Total Sale</div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{(totalSell / 100).toLocaleString()}</div>
                 </div>
                 <div className="card" style={{ flex: 1, background: '#f8fafc' }}>
                   <div style={{ color: 'var(--text-secondary)', marginBottom: '5px' }}>Total Cost</div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{(totalCost / 100).toLocaleString()}</div>
                 </div>
                 <div className="card" style={{ flex: 1, background: '#ecfdf5', border: '1px solid #10b981' }}>
                   <div style={{ color: '#065f46', marginBottom: '5px' }}>Expected Profit</div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065f46' }}>₹{(profit / 100).toLocaleString()} ({profitPct}%)</div>
                 </div>
               </div>
               <button className="btn btn-primary"><span style={{ marginRight: '5px' }}>₹</span> Create Quote</button>
             </div>
           )}

           {(activeTab === 'Communications' || activeTab === 'Settings') && (
             <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                {activeTab} Module implementation in progress.
             </div>
           )}
         </div>
      </div>
    </div>
  );
};

export default BookingDetail;
