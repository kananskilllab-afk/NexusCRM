import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 4) setStep(step + 1);
    else handleRegister();
  };

  const handleRegister = () => {
    // Implement API call to register
    alert('Agency Registration successful!');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
          <FiArrowLeft /> Back to Login
        </button>
        
        <h2>Agency Onboarding Wizard</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginTop: '20px' }}>
           {[1,2,3,4].map(s => (
             <div key={s} style={{ color: step >= s ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step === s ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
               {step > s ? <FiCheck /> : s}. {['Agency', 'Owner', 'Setup', 'Review'][s-1]}
             </div>
           ))}
        </div>

        <form onSubmit={handleNext}>
          {step === 1 && (
            <div>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Agency Name</label>
                 <input type="text" className="form-control" required placeholder="My Travel Agency" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
               </div>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Country</label>
                 <select className="form-control" required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}><option>United States</option><option>United Kingdom</option><option>India</option><option>Australia</option></select>
               </div>
            </div>
          )}
          {step === 2 && (
            <div>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Owner Full Name</label>
                 <input type="text" className="form-control" required placeholder="John Doe" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
               </div>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Work Email</label>
                 <input type="email" className="form-control" required placeholder="john@agency.com" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
               </div>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Password</label>
                 <input type="password" className="form-control" required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
               </div>
            </div>
          )}
          {step === 3 && (
            <div>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Team Size</label>
                 <select className="form-control" required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}><option>Solo Agent</option><option>2-5 Agents</option><option>6-15 Agents</option><option>16+ Agents</option></select>
               </div>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Primary GDS</label>
                 <select className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}><option>Amadeus</option><option>Sabre</option><option>Travelport</option><option>None</option></select>
               </div>
            </div>
          )}
          {step === 4 && (
            <div>
               <h4>Review your details</h4>
               <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Please confirm your agency details to complete registration. By clicking 'Create Agency', you agree to our Terms of Service.</p>
               <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', cursor: 'pointer' }}>
                 <input type="checkbox" required style={{ width: '18px', height: '18px' }}/> 
                 I accept the Terms and Conditions and GDPR Data Privacy Agreement.
               </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
            {step > 1 ? (
               <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)} style={{ padding: '10px 20px' }}>Back</button>
            ) : <div></div>}
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 30px' }}>{step === 4 ? 'Create Agency' : 'Next Step'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
