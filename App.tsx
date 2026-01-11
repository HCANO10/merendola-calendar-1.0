import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import SignIn from './screens/SignIn';
import TeamSetup from './screens/TeamSetup';
import Profile from './screens/Profile';
import Dashboard from './screens/Dashboard';
import MainLayout from './src/layouts/MainLayout';

/**
 * AppRoutes handles the core navigation security and sequential data flow.
 * FLOW: Login -> Profile Setup -> Team Membership -> Dashboard.
 */
const AppRoutes: React.FC = () => {
  const { state, authLoading, session } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Step 0: Wait for authentication state to be determined
    if (authLoading) return;

    // Step 1: Unauthenticated users are forced to Login
    if (!session) {
      const isPublicRoute = ['/', '/reset-password'].includes(location.pathname);
      if (!isPublicRoute) {
        console.log('[Security] Guard: Session missing. Redirecting to Login.');
        navigate('/', { replace: true });
      }
      return;
    }

    // Step 2: Authenticated users follow a strict setup sequence
    if (state.user) {
      // SEQUENTIAL CHECK A: Profile Completeness (Birthday blocker)
      const needsProfileSetup = !state.user.birthday;
      if (needsProfileSetup) {
        if (location.pathname !== '/profile') {
          console.log('[Security] Guard: Profile incomplete (No Birthday). Forcing /profile');
          navigate('/profile', { replace: true });
        }
        return;
      }

      // SEQUENTIAL CHECK B: Team Membership
      const needsTeamSetup = !state.team;
      if (needsTeamSetup) {
        if (location.pathname !== '/team-setup') {
          console.log('[Security] Guard: No active team. Forcing /team-setup');
          navigate('/team-setup', { replace: true });
        }
        return;
      }

      // STEP 3: Successful Onboarding -> Permit Dashboard access
      // Redirect setup pages back to Dashboard if they try to access them while already setup
      const setupPages = ['/', '/team-setup'];
      if (setupPages.includes(location.pathname)) {
        console.log('[Security] Guard: Setup complete. Redirecting to Dashboard.');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [authLoading, session, state.user, state.team, location.pathname, navigate]);

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
      <Route path="/" element={<SignIn />} />
      <Route path="/reset-password" element={<SignIn />} />

      {/* Protected Flow */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/team-setup" element={<TeamSetup />} />

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
