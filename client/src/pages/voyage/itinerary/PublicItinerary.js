import React from 'react';
import { useParams } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiClock, FiCheckCircle } from 'react-icons/fi';

const PublicItinerary = () => {
  const { token } = useParams();

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '50px' }}>
      <div style={{ height: '300px', background: 'url(https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=1200&q=80) center/cover', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)' }}></div>
        <div style={{ position: 'absolute', bottom: '40px', left: '10%', right: '10%', color: 'white' }}>
          <h1 style={{ fontSize: '3rem', margin: '0 0 10px 0', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Maldives Getaway</h1>
          <p style={{ fontSize: '1.2rem', display: 'flex', gap: '20px', opacity: 0.9 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FiCalendar /> Nov 15 - Nov 22, 2025</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FiMapPin /> Prepared for John Doe</span>
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '-30px auto 0', position: 'relative', zIndex: 10 }}>
        
        <div className="card" style={{ padding: '30px', marginBottom: '20px' }}>
           <h2 style={{ marginTop: 0, color: 'var(--primary)' }}>Day 1: Arrival & Transfer</h2>
           <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Monday, Nov 15, 2025</div>
           
           <div style={{ display: 'flex', borderLeft: '2px solid #e2e8f0', marginLeft: '10px', paddingLeft: '20px', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-29px', top: '0', background: 'white', color: 'var(--primary)', padding: '2px', borderRadius: '50%' }}>
                   <FiCheckCircle size={16} />
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', textTransform: 'uppercase' }}>Flight</div>
                  <h3 style={{ margin: '0 0 5px 0' }}>Emirates EK 345</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}><FiClock /> 10:30 AM - Arrival at MLE</p>
                </div>
              </div>

           </div>
        </div>

        <div className="card" style={{ padding: '30px', marginBottom: '20px' }}>
           <h2 style={{ marginTop: 0, color: 'var(--primary)' }}>Day 2: Island Tour</h2>
           <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Tuesday, Nov 16, 2025</div>
           
           <div style={{ display: 'flex', borderLeft: '2px solid #e2e8f0', marginLeft: '10px', paddingLeft: '20px', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-29px', top: '0', background: 'white', color: 'var(--primary)', padding: '2px', borderRadius: '50%' }}>
                   <FiCheckCircle size={16} />
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: '#d97706', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', textTransform: 'uppercase' }}>Activity</div>
                  <h3 style={{ margin: '0 0 5px 0' }}>Sunset Dolphin Cruise</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}><FiClock /> 4:00 PM</p>
                </div>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default PublicItinerary;
