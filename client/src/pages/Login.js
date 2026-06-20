import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../context/LeadContext';
import { FiLock, FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import { api } from '../services/api';

const Login = () => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // If already authenticated, redirect
  useEffect(() => {
    if (state.isAuthenticated) navigate('/dashboard');
  }, [state.isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.login(formData.email, formData.password);
      dispatch({ type: 'LOGIN', payload: response });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="login-page" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--gradient-brand)', padding: '20px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-160px', right: '-120px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,160,227,0.45) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-180px', left: '-140px', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(176,203,31,0.28) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div className="login-card card" style={{ width: '100%', maxWidth: '420px', padding: '40px', boxShadow: 'var(--shadow-lg)', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/logo.png" alt="Kanan Travel CRM" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', marginBottom: '15px' }} />
          <p className="text-secondary" style={{ marginTop: '10px' }}>Enterprise Access Portal</p>
        </div>

        {error && <div style={{ background: 'var(--state-error-bg)', color: 'var(--state-error-text)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem' }}><FiMail size={14} /> Email Address</label>
            <input 
              type="email" 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@nexus.com"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '30px', position: 'relative' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem' }}><FiLock size={14} /> Password</label>
            <input 
              type={showPass ? 'text' : 'password'} 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
            />
            <button 
              type="button" 
              onClick={() => setShowPass(!showPass)}
              style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {showPass ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 600, marginBottom: '15px' }}>Sign In</button>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => navigate('/forgot-password')}>Forgot Password?</span>
          </div>

          <div style={{ position: 'relative', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid var(--border-color)' }}></div>
            <span style={{ position: 'relative', background: '#fff', padding: '0 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Or continue with</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
             <button type="button" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" style={{ width: 16, height: 16 }}/> Google
             </button>
             <button type="button" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="M" style={{ width: 16, height: 16 }}/> Microsoft
             </button>
          </div>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <p>Don't have an agency account? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('/register')}>Create one now</span>.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
