import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import SignIn from './screens/SignIn';
import TeamSetup from './screens/TeamSetup';
import Profile from './screens/Profile';
import Dashboard from './screens/Dashboard';
import { ResetPassword } from './src/screens/ResetPassword';
import { MainLayout } from './src/layouts/MainLayout';
import { RequireProfile, RequireTeam } from './src/components/Guards';

/**
 * AppRoutes handles the core navigation security and sequential data flow.
 * FLOW: Login -> Profile Setup -> Team Membership -> Dashboard.
 */
const AppRoutes: React.FC = () => {
  const { authLoading, session } = useStore();
  const location = useLocation();

  // Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-2xl shadow-primary/20 mb-6"></div>
        <h3 className="text-white text-xl font-bold animate-pulse">Cargando Merendola...</h3>
        <p className="text-slate-400 mt-2 text-sm font-medium">Validando seguridad y flujo de datos</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={!session ? <SignIn /> : <Navigate to="/dashboard" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes (Require Session) */}
      <Route element={session ? <MainLayout><Outlet /></MainLayout> : <Navigate to="/" state={{ from: location }} replace />}>

        {/* Profile is the first step after login */}
        <Route path="/profile" element={<Profile />} />

        {/* Team Setup requires Profile to be complete */}
        <Route path="/team-setup" element={
          <RequireProfile>
            <TeamSetup />
          </RequireProfile>
        } />

        {/* Dashboard requires Profile AND Team to be complete */}
        <Route path="/dashboard" element={
          <RequireProfile>
            <RequireTeam>
              <Dashboard />
            </RequireTeam>
          </RequireProfile>
        } />
      </Route>

      {/* Global Redirect Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </StoreProvider>
  );
};

export default App;
