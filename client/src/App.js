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
import { VoyageProvider } from './context/VoyageContext';
import NotFoundPage from './pages/voyage/system/NotFoundPage';
import ForbiddenPage from './pages/voyage/system/ForbiddenPage';
import Register from './pages/voyage/auth/Register';
import ForgotPassword from './pages/voyage/auth/ForgotPassword';
import PipelineBoard from './pages/voyage/pipeline/PipelineBoard';
import ContactDetail from './pages/voyage/contacts/ContactDetail';
import BookingsList from './pages/voyage/bookings/BookingsList';
import BookingDetail from './pages/voyage/bookings/BookingDetail';
import ItineraryBuilder from './pages/voyage/itinerary/ItineraryBuilder';
import PublicItinerary from './pages/voyage/itinerary/PublicItinerary';
import Quotes from './pages/voyage/finance/Quotes';
import Invoices from './pages/voyage/finance/Invoices';
import Commissions from './pages/voyage/finance/Commissions';
import CommunicationsHub from './pages/voyage/comms/CommunicationsHub';
import EmailSequenceBuilder from './pages/voyage/comms/EmailSequenceBuilder';
import SettingsDashboard from './pages/voyage/settings/SettingsDashboard';
import SupplierContracts from './pages/voyage/suppliers/SupplierContracts';
import DocumentVault from './pages/voyage/documents/DocumentVault';
import EmailManager from './pages/voyage/emails/EmailManager';
import CookieConsent from './components/common/CookieConsent';

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
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
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

        <Route path="/pipeline" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><PipelineBoard /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/contacts/:id" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><ContactDetail /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/bookings" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><BookingsList /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/bookings/:id" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><BookingDetail /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/itinerary/:id/builder" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><ItineraryBuilder /></MainLayout>
          </ProtectedRoute>
        } />

        {/* Public Route */}
        <Route path="/it/:token" element={<PublicItinerary />} />
        
        {/* Finance Routes */}
        <Route path="/finance/quotes" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><Quotes /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/finance/invoices" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><Invoices /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/finance/commissions" element={
          <ProtectedRoute requiredLevel={2}>
            <MainLayout><Commissions /></MainLayout>
          </ProtectedRoute>
        } />
        
        {/* Comms & Settings Routes */}
        <Route path="/comms" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><CommunicationsHub /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/comms/sequences" element={
          <ProtectedRoute requiredLevel={2}>
            <MainLayout><EmailSequenceBuilder /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute requiredLevel={3}>
            <MainLayout><SettingsDashboard /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/suppliers" element={
          <ProtectedRoute requiredLevel={2}>
            <MainLayout><Suppliers /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/supplier-contracts" element={
          <ProtectedRoute requiredLevel={2}>
            <MainLayout><SupplierContracts /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/documents" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><DocumentVault /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/emails" element={
          <ProtectedRoute requiredLevel={1}>
            <MainLayout><EmailManager /></MainLayout>
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

        <Route path="/403" element={<MainLayout><ForbiddenPage /></MainLayout>} />
        <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
      </Routes>
    </SecurityWrapper>
  );
}

function App() {
  return (
    <LeadProvider>
      <VoyageProvider>
        <AppRoutes />
        <CookieConsent />
      </VoyageProvider>
    </LeadProvider>
  );
}

export default App;
