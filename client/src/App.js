import React, { useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { LeadProvider, useLeads, ROLE_HIERARCHY } from './context/LeadContext';
import { VoyageProvider } from './context/VoyageContext';
import { ToastProvider } from './context/ToastContext';
import CookieConsent from './components/common/CookieConsent';

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/"         element={<PR><AppLayout><Dashboard /></AppLayout></PR>} />
          <Route path="/dashboard" element={<PR><AppLayout><Dashboard /></AppLayout></PR>} />
          <Route path="/leads"    element={<PR level={1}><AppLayout><Leads /></AppLayout></PR>} />
          <Route path="/leads-legacy" element={<PR level={1}><AppLayout><LeadList /></AppLayout></PR>} />
          <Route path="/leads/:id" element={<PR level={1}><AppLayout><LeadDetail /></AppLayout></PR>} />
          <Route path="/scheduler" element={<PR level={2}><AppLayout><Scheduler /></AppLayout></PR>} />
          <Route path="/customers" element={<PR level={1}><AppLayout><Customers /></AppLayout></PR>} />
          <Route path="/customers/:id" element={<PR level={1}><AppLayout><CustomerDetail /></AppLayout></PR>} />
          <Route path="/pipeline" element={<PR level={1}><AppLayout><Pipeline /></AppLayout></PR>} />
          <Route path="/pipeline-legacy" element={<PR level={1}><AppLayout><PipelineBoard /></AppLayout></PR>} />
          <Route path="/opportunities" element={<PR level={1}><AppLayout><OpportunitiesBoard /></AppLayout></PR>} />
          <Route path="/contacts/:id" element={<PR level={1}><AppLayout><ContactDetail /></AppLayout></PR>} />
          <Route path="/bookings" element={<PR level={1}><AppLayout><Bookings /></AppLayout></PR>} />
          <Route path="/bookings/:id" element={<PR level={1}><AppLayout><BookingDetail /></AppLayout></PR>} />
          <Route path="/itineraries" element={<PR level={1}><AppLayout><Itineraries /></AppLayout></PR>} />
          <Route path="/itinerary/:id/builder" element={<PR level={1}><AppLayout><ItineraryBuilder /></AppLayout></PR>} />
          <Route path="/it/:token" element={<PublicItinerary />} />
          <Route path="/finance/quotes" element={<PR level={1}><AppLayout><Quotes /></AppLayout></PR>} />
          <Route path="/quotes"         element={<Navigate to="/finance/quotes" replace />} />
          <Route path="/finance/invoices" element={<PR level={1}><AppLayout><Invoices /></AppLayout></PR>} />
          <Route path="/invoices"         element={<Navigate to="/finance/invoices" replace />} />
          <Route path="/finance/commissions" element={<PR level={2}><AppLayout><Commissions /></AppLayout></PR>} />
          <Route path="/comms" element={<PR level={1}><AppLayout><Communications /></AppLayout></PR>} />
          <Route path="/communications"   element={<Navigate to="/comms" replace />} />
          <Route path="/comms/sequences" element={<PR level={2}><AppLayout><EmailSequenceBuilder /></AppLayout></PR>} />
          <Route path="/settings" element={<PR level={3}><AppLayout><Settings /></AppLayout></PR>} />
          <Route path="/suppliers" element={<PR level={3}><AppLayout><Suppliers /></AppLayout></PR>} />
          <Route path="/supplier-contracts" element={<PR level={2}><AppLayout><SupplierContracts /></AppLayout></PR>} />
          <Route path="/documents" element={<PR level={1}><AppLayout><DocumentVault /></AppLayout></PR>} />
          <Route path="/emails" element={<PR level={1}><AppLayout><EmailManager /></AppLayout></PR>} />
          <Route path="/manage/packages" element={<PR level={4}><AppLayout><ManagePackages /></AppLayout></PR>} />
          <Route path="/manage/hotels" element={<PR level={4}><AppLayout><ManageHotels /></AppLayout></PR>} />
          <Route path="/users" element={<PR level={5}><AppLayout><Users /></AppLayout></PR>} />
          <Route path="/reports" element={<PR level={1}><AppLayout><Reports /></AppLayout></PR>} />
          <Route path="/403" element={<AppLayout><ForbiddenPage /></AppLayout>} />
          <Route path="*"    element={<AppLayout><NotFoundPage /></AppLayout>} />
        </Routes>
      </Suspense>
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
