import React, { useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { LeadProvider, useLeads, ROLE_HIERARCHY } from './context/LeadContext';
import { VoyageProvider } from './context/VoyageContext';
import Profile from './pages/Profile';
import CookieConsent from './components/common/CookieConsent';
import MainLayout from './layouts/MainLayout';
import { ToastProvider } from './context/ToastContext';
import BookingsList from './pages/voyage/bookings/BookingsList';
import CommunicationsHub from './pages/voyage/comms/CommunicationsHub';
import SettingsDashboard from './pages/voyage/settings/SettingsDashboard';

/* ── Lazy page imports ───────────────────────────────────────────────────── */
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const LeadList           = lazy(() => import('./pages/LeadList'));
const Leads              = lazy(() => import('./pages/Leads'));
const LeadDetail         = lazy(() => import('./pages/LeadDetail'));
const Suppliers          = lazy(() => import('./pages/Suppliers'));
const Customers          = lazy(() => import('./pages/Customers'));
const CustomerDetail     = lazy(() => import('./pages/customers/CustomerDetail'));
const Reports            = lazy(() => import('./pages/Reports'));
const Users              = lazy(() => import('./pages/Users'));
const Scheduler          = lazy(() => import('./pages/Scheduler'));
const ManagePackages     = lazy(() => import('./pages/ManagePackages'));
const ManageHotels       = lazy(() => import('./pages/ManageHotels'));
const Login              = lazy(() => import('./pages/Login'));
const NotFoundPage       = lazy(() => import('./pages/voyage/system/NotFoundPage'));
const ForbiddenPage      = lazy(() => import('./pages/voyage/system/ForbiddenPage'));
const Register           = lazy(() => import('./pages/voyage/auth/Register'));
const ForgotPassword     = lazy(() => import('./pages/voyage/auth/ForgotPassword'));
const PipelineBoard      = lazy(() => import('./pages/voyage/pipeline/PipelineBoard'));
const Pipeline           = lazy(() => import('./pages/Pipeline'));
const OpportunitiesBoard = lazy(() => import('./pages/opportunities/OpportunitiesBoard'));
const ContactDetail      = lazy(() => import('./pages/voyage/contacts/ContactDetail'));
const Bookings           = lazy(() => import('./pages/Bookings'));
const BookingDetail      = lazy(() => import('./pages/voyage/bookings/BookingDetail'));
const ItineraryBuilder   = lazy(() => import('./pages/voyage/itinerary/ItineraryBuilder'));
const PublicItinerary    = lazy(() => import('./pages/voyage/itinerary/PublicItinerary'));
const Quotes             = lazy(() => import('./pages/Quotes'));
const Invoices           = lazy(() => import('./pages/Invoices'));
const Commissions        = lazy(() => import('./pages/voyage/finance/Commissions'));
const Communications     = lazy(() => import('./pages/Communications'));
const Itineraries        = lazy(() => import('./pages/Itineraries'));
const EmailSequenceBuilder = lazy(() => import('./pages/voyage/comms/EmailSequenceBuilder'));
const Settings           = lazy(() => import('./pages/Settings'));
const SupplierContracts  = lazy(() => import('./pages/voyage/suppliers/SupplierContracts'));
const DocumentVault      = lazy(() => import('./pages/voyage/documents/DocumentVault'));
const EmailManager       = lazy(() => import('./pages/voyage/emails/EmailManager'));

/* ── Page loading fallback ───────────────────────────────────────────────── */
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 200 }}>
    <div style={{
      width: 32, height: 32,
      border: '3px solid #E5E7EB',
      borderTopColor: '#009846',
      borderRadius: '50%',
      animation: 'kanan-spin 0.7s linear infinite',
    }} />
  </div>
);

/* ── Protected Route ─────────────────────────────────────────────────────── */
const ProtectedRoute = ({ children, requiredLevel = 0 }) => {
  const { state } = useLeads();
  const location  = useLocation();

  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userLevel = ROLE_HIERARCHY[state.currentUser?.role] || 0;
  if (userLevel < requiredLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/* ── Session & Security Wrapper ──────────────────────────────────────────── */
const SecurityWrapper = ({ children }) => {
  const { state, dispatch } = useLeads();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!state.isAuthenticated) return;
    const fetchLatestUser = async () => {
      try {
        const stateStr = localStorage.getItem('nexusCRM_State_v2');
        if (stateStr) {
          const parsed = JSON.parse(stateStr);
          if (parsed.token) {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';
            const res = await fetch(`${API_URL}/auth/me`, {
              headers: { 'Authorization': `Bearer ${parsed.token}` }
            });
            if (res.ok) {
              const userData = await res.json();
              dispatch({ 
                type: 'LOGIN', 
                payload: { token: parsed.token, user: userData } 
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching latest user details:', err);
      }
    };
    fetchLatestUser();
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated) return;

    const TIMEOUT_MS = 30 * 60 * 1000;
    const checkTimeout = () => {
      if (Date.now() - state.loginTimestamp > TIMEOUT_MS) handleLogout();
    };

    const interval = setInterval(checkTimeout, 60000);
    const reset    = () => dispatch({ type: 'UPDATE_SESSION' });

    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [state.isAuthenticated, state.loginTimestamp, dispatch, handleLogout]);

  return children;
};

/* ── Route tree ──────────────────────────────────────────────────────────── */
function AppRoutes() {
  const PR = ({ children, level = 0 }) => (
    <ProtectedRoute requiredLevel={level}>{children}</ProtectedRoute>
  );

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

        <Route path="/profile" element={
          <ProtectedRoute>
            <MainLayout><Profile /></MainLayout>
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
        <ToastProvider>
          <AppRoutes />
          <CookieConsent />
        </ToastProvider>
      </VoyageProvider>
    </LeadProvider>
  );
}

export default App;
