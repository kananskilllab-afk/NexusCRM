import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { LeadProvider, useLeads } from './context/LeadContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { state } = useLeads();
  const userRole = state.currentUser?.role || 'Admin';

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <LeadProvider>
      <MainLayout>
        <Routes>
        <Route path="/" element={<Dashboard />} />
        
        <Route path="/leads" element={
          <ProtectedRoute allowedRoles={['Admin', 'Sales Person']}>
            <LeadList />
          </ProtectedRoute>
        } />
        
        <Route path="/leads/:id" element={
          <ProtectedRoute allowedRoles={['Admin', 'Sales Person']}>
            <LeadDetail />
          </ProtectedRoute>
        } />

        <Route path="/scheduler" element={
          <ProtectedRoute allowedRoles={['Admin', 'Sales Person']}>
            <Scheduler />
          </ProtectedRoute>
        } />

        <Route path="/customers" element={<Customers />} />
        
        <Route path="/suppliers" element={
          <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
            <Suppliers />
          </ProtectedRoute>
        } />

        {/* Manage Masters */}
        <Route path="/manage/packages" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <ManagePackages />
          </ProtectedRoute>
        } />
        <Route path="/manage/hotels" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <ManageHotels />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Users />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
    </LeadProvider>
  );
}

export default App;
