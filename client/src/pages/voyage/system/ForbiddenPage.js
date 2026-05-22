import React from 'react';
import { Link } from 'react-router-dom';

const ForbiddenPage = () => {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>403 - Forbidden</h1>
      <p>You do not have permission to access this page.</p>
      <p>Please contact your agency owner if you believe this is a mistake.</p>
      <Link to="/" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>Return to Dashboard</Link>
    </div>
  );
};

export default ForbiddenPage;
