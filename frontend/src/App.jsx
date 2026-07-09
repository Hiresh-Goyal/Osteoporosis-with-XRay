import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import SignUpScreen from './components/SignUpScreen';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';
import { getSession } from './utils/api';
import { Toaster } from 'react-hot-toast';
import './index.css';

function ProtectedRoute({ children, allowedRoles }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RoleRedirect() {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  const { role } = session.user;
  if (role === 'Patient') return <Navigate to="/patient" replace />;
  if (role === 'Doctor') return <Navigate to="/doctor" replace />;
  if (role === 'Admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <>
      <Toaster position="top-center" toastOptions={{ className: 'font-medium text-sm rounded-xl shadow-lg' }} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignUpScreen />} />
        <Route path="/patient/*" element={
          <ProtectedRoute allowedRoles={['Patient']}>
            <PatientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/doctor/*" element={
          <ProtectedRoute allowedRoles={['Doctor']}>
            <DoctorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}
