import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FiArrowLeft, FiSave, FiEye, FiSearch, FiMapPin, FiClock, FiPlus } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';

const ItineraryBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [days, setDays] = useState([]);
  const [items, setItems] = useState({});

  useEffect(() => {
    const loadItinerary = async () => {
      try {
        const res = await voyageApi.getItinerary(id);
        if (res.state_json) {
          const state = JSON.parse(res.state_json);
          setDays(state.days || []);
          setItems(state.items || {});
        } else {
          // Default empty state
          setDays([{ id: 'day-1', date: 'Nov 15, 2025', title: 'Arrival & Transfer', items: ['item-1'] }]);
          setItems({ 'item-1': { id: 'item-1', type: 'Flight', title: 'Emirates EK 345 to MLE', time: '10:30 AM' } });
        }
      } catch (e) {
        console.error("Failed to load itinerary", e);
      } finally {
        setLoading(false);
      }
    };
    loadItinerary();
  }, [id]);

  const handleSave = async () => {
    try {
      await voyageApi.saveItinerary(id, { days, items });
      alert('Itinerary saved to database!');
    } catch (e) {
      console.error(e);
      alert('Failed to save');
    }
  };

  const onDragEnd = (result) => {
    // simplified mock
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading builder...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      <div style={{ background: 'white', padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate(`/bookings/${id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FiArrowLeft size={20}/></button>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Itinerary Builder: {id}</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => window.open(`/it/${id}`, '_blank')}><FiEye /> Preview</button>
          <button className="btn btn-primary" onClick={handleSave}><FiSave /> Save Itinerary</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <div style={{ width: '300px', background: 'white', borderRight: '1px solid var(--border-color)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem' }}>Library</h3>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <FiSearch style={{ position: 'absolute', top: 10, left: 10, color: '#999' }} />
            <input type="text" placeholder="Search components..." style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
             <div style={{ padding: '10px', border: '1px dashed #ccc', borderRadius: '4px', marginBottom: '10px', textAlign: 'center', color: '#666', cursor: 'pointer' }}>+ Create Custom Segment</div>
             {['Flight', 'Hotel', 'Transfer', 'Activity'].map(type => (
               <div key={type} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '10px', background: '#f8fafc', cursor: 'grab' }}>
                 <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{type} Template</div>
                 <div style={{ fontSize: '0.9rem' }}>Drag to add</div>
               </div>
             ))}
          </div>
        </div>

        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <DragDropContext onDragEnd={onDragEnd}>
            {days.map((day, index) => (
              <div key={day.id} style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Day {index + 1}: {day.date}</h3>
                  <input type="text" value={day.title} onChange={() => {}} style={{ border: 'none', background: '#f3f4f6', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' }} />
                </div>
                
                <Droppable droppableId={day.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: '50px' }}>
                      {day.items.map((itemId, idx) => {
                        const item = items[itemId];
                        return (
                          <Draggable key={item.id} draggableId={item.id} index={idx}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '10px', background: 'white', display: 'flex', alignItems: 'center', gap: '15px', ...provided.draggableProps.style }}>
                                <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '8px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.type}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}><FiClock /> {item.time}</div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button style={{ background: 'none', border: '1px dashed #ccc', padding: '8px 20px', borderRadius: '4px', color: '#666', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <FiPlus /> Add Item
                  </button>
                </div>
              </div>
            ))}
          </DragDropContext>
          <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setDays([...days, { id: 'day-' + (days.length + 1), date: 'New Day', title: 'New Segment', items: [] }])}><FiPlus /> Add Day</button>
        </div>

        <div style={{ width: '350px', background: '#e2e8f0', borderLeft: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ textAlign: 'center', color: '#64748b' }}>
             <FiMapPin size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
             <p>Google Maps Preview</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryBuilder;
