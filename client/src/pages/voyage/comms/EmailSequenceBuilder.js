import React from 'react';
import { FiPlus, FiSettings, FiMail, FiClock } from 'react-icons/fi';

const EmailSequenceBuilder = () => {
  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Post-Booking Sequence</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Automated emails sent after a booking is confirmed.</p>
        </div>
        <button className="btn btn-primary"><FiSettings /> Sequence Settings</button>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
         <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ background: '#10b981', color: 'white', display: 'inline-block', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}>Trigger: Booking Status changes to "Confirmed"</div>
         </div>

         {/* Step 1 */}
         <div style={{ borderLeft: '2px solid #ccc', marginLeft: '50%', paddingLeft: '20px', paddingBottom: '30px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-15px', top: 0, width: '30px', height: '30px', background: 'white', border: '2px solid var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiMail size={14}/></div>
            <div className="card" style={{ marginLeft: '10px', marginTop: '-10px' }}>
               <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Send Email: "Booking Confirmation & Next Steps"</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sent immediately after trigger.</div>
            </div>
         </div>

         {/* Delay */}
         <div style={{ borderLeft: '2px solid #ccc', marginLeft: '50%', paddingLeft: '20px', paddingBottom: '30px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-15px', top: 0, width: '30px', height: '30px', background: 'white', border: '2px solid #f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><FiClock size={14}/></div>
            <div style={{ marginLeft: '10px', color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem' }}>Wait 3 days</div>
         </div>

         {/* Step 2 */}
         <div style={{ borderLeft: '2px solid #ccc', marginLeft: '50%', paddingLeft: '20px', paddingBottom: '30px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-15px', top: 0, width: '30px', height: '30px', background: 'white', border: '2px solid var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiMail size={14}/></div>
            <div className="card" style={{ marginLeft: '10px', marginTop: '-10px' }}>
               <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Send Email: "Prepare for your trip"</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Includes packing list template.</div>
            </div>
         </div>

         <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button className="btn btn-outline" style={{ borderRadius: '20px' }}><FiPlus /> Add Step</button>
         </div>
      </div>
    </div>
  );
};

export default EmailSequenceBuilder;
