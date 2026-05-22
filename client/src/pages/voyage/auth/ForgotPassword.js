import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMail } from 'react-icons/fi';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
          <FiArrowLeft /> Back to Login
        </button>
        
        <h2 style={{ marginBottom: '10px' }}>Forgot Password</h2>
        
        {submitted ? (
          <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #10b981', padding: '15px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <FiMail size={24} style={{ marginTop: '2px' }}/>
            <div>
              <strong>Check your email</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>If an account exists for {email}, a password reset link has been sent.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.5' }}>Enter your work email address and we'll send you a secure link to reset your password.</p>
            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Email Address</label>
              <input type="email" className="form-control" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@agency.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}/>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontWeight: 'bold' }}>Send Reset Link</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
