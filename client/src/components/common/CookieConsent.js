import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { getConsentDecision, setConsent } from '../../utils/cookies';

const overlay = {
  position: 'fixed',
  bottom: 20,
  left: 20,
  right: 20,
  maxWidth: 560,
  marginLeft: 'auto',
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
  borderRadius: 14,
  padding: '16px 20px',
  zIndex: 9999,
  display: 'flex',
  gap: 14,
  alignItems: 'flex-start',
};

const btnBase = {
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid transparent',
};

const btnPrimary = { ...btnBase, background: '#1F3A68', color: '#fff' };
const btnOutline = { ...btnBase, background: 'transparent', color: '#1F3A68', border: '1px solid #1F3A68' };
const closeBtn = {
  position: 'absolute',
  top: 8,
  right: 8,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#777',
};

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!getConsentDecision()) setShow(true);
  }, []);

  if (!show) return null;

  const accept = () => { setConsent(true); setShow(false); };
  const decline = () => { setConsent(false); setShow(false); };

  return (
    <div style={overlay} role="dialog" aria-label="Cookie preferences">
      <button style={closeBtn} onClick={decline} aria-label="Dismiss"><FiX /></button>
      <div style={{ flex: 1, paddingRight: 14 }}>
        <strong style={{ display: 'block', marginBottom: 4, color: '#1F3A68' }}>We use cookies</strong>
        <span style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.45 }}>
          We use cookies to remember your preferences and to auto-fill forms you
          fill in often — for example your last-used lead source, assigned
          agent, and any draft entries — so you don&apos;t have to retype them.
          No tracking, no third parties.
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'center' }}>
        <button style={btnPrimary} onClick={accept}>Accept</button>
        <button style={btnOutline} onClick={decline}>Decline</button>
      </div>
    </div>
  );
};

export default CookieConsent;
