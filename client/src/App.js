import React, { useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import LeadList from './pages/LeadList';
import LeadDetail from './pages/LeadDetail';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Scheduler from './pages/Scheduler';
import ManagePackages from './pages/ManagePackages';
import ManageHotels from './pages/ManageHotels';
import Login from './pages/Login';
import { LeadProvider, useLeads, ROLE_HIERARCHY } from './context/LeadContext';

// Protected Route Component
const ProtectedRoute = ({ children, requiredLevel = 0 }) => {
  const { state } = useLeads();
  const location = useLocation();

  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userLevel = ROLE_HIERARCHY[state.currentUser?.role] || 0;
  if (userLevel < requiredLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Session & Security Wrapper
const SecurityWrapper = ({ children }) => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!state.isAuthenticated) return;

    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    
    const checkTimeout = () => {
      const now = Date.now();
      if (now - state.loginTimestamp > TIMEOUT_MS) {
        handleLogout();
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    
    const resetTimer = () => {
      dispatch({ type: 'UPDATE_SESSION' });
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [state.isAuthenticated, state.loginTimestamp, dispatch, handleLogout]);

  return children;
};

function AppRoutes() {
  return (
    <SecurityWrapper>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout><Dashboard /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainLayout><Dashboard /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/leads" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><LeadList /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/leads/:id" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><LeadDetail /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/scheduler" element={
          <ProtectedRoute requiredLevel={2}>
            <MainLayout><Scheduler /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/customers" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><Customers /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/suppliers" element={
          <ProtectedRoute requiredLevel={3}>
            <MainLayout><Suppliers /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/manage/packages" element={
          <ProtectedRoute requiredLevel={4}>
            <MainLayout><ManagePackages /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/manage/hotels" element={
          <ProtectedRoute requiredLevel={4}>
            <MainLayout><ManageHotels /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute requiredLevel={5}>
            <MainLayout><Users /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><Reports /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SecurityWrapper>
  );
}

function App() {
  return (
    <LeadProvider>
      <AppRoutes />
    </LeadProvider>
  );
}

export default App;
