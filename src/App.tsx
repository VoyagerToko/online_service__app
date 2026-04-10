import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { UserDashboard } from './pages/UserDashboard';
import { BookingFlow } from './pages/BookingFlow';
import { ProfessionalDashboard } from './pages/ProfessionalDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ServicesPage } from './pages/ServicesPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import { ProfessionalProfilePage } from './pages/ProfessionalProfilePage';
import { MessagesPage } from './pages/MessagesPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { InfoPage } from './pages/InfoPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<LoginPage requiredRole="admin" />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/professionals" element={<ProfessionalsPage />} />
          <Route path="/professionals/:proId" element={<ProfessionalProfilePage />} />
          <Route path="/about" element={<InfoPage />} />
          <Route path="/careers" element={<InfoPage />} />
          <Route path="/blog" element={<InfoPage />} />
          <Route path="/contact" element={<InfoPage />} />
          <Route path="/privacy" element={<InfoPage />} />
          <Route path="/terms" element={<InfoPage />} />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardSwitcher />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/book/:proId" 
            element={
              <ProtectedRoute roles={['user']}>
                <BookingFlow />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/pro-dashboard" 
            element={
              <ProtectedRoute roles={['professional']}>
                <ProfessionalDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Add more routes as needed */}
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

const DashboardSwitcher = () => {
  const { user } = useAuth();
  
  if (user?.role === 'professional') return <ProfessionalDashboard />;
  if (user?.role === 'admin') return <AdminDashboard />;
  return <UserDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
