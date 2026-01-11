
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import SignIn from './screens/SignIn';
import TeamSetup from './screens/TeamSetup';
import Profile from './screens/Profile';
import Dashboard from './screens/Dashboard';

const AppRoutes: React.FC = () => {
  const { state } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 0. Robust Recovery Detection
    // If Supabase sends us back with a recovery hash, force redirection to /reset-password
    const hasRecoveryHash = window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token=');

    if (hasRecoveryHash && !location.pathname.includes('reset-password')) {
      // We use window.location.replace to ensure the hash is preserved and router doesn't block it
      const currentHash = window.location.hash;
      console.log('Recovery hash detected, redirecting to /reset-password');
      window.location.hash = `#/reset-password${currentHash.startsWith('#') ? currentHash.substring(1) : currentHash}`;
      return;
    }

    // Auth and Data Rules Navigation
    if (!state.user) {
      if (!['/', '/reset-password'].includes(location.pathname)) {
        navigate('/', { replace: true });
      }
      return;
    }

    if (!state.user.teamId && !state.user.activeTeamId) {
      if (location.pathname !== '/team-setup') {
        console.log('No team detected, redirecting to /team-setup');
        navigate('/team-setup', { replace: true });
      }
      return;
    }

    if (!state.user.birthday || !state.user.name) {
      if (location.pathname !== '/profile') {
        console.log('Incomplete profile detected, redirecting to /profile');
        navigate('/profile', { replace: true });
      }
      return;
    }

    // Redirect to dashboard if logged in and trying to access auth/setup pages
    if (['/', '/team-setup'].includes(location.pathname)) {
      navigate('/dashboard', { replace: true });
    }
  }, [state.user, state.user?.teamId, state.user?.birthday, navigate, location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route path="/team-setup" element={<TeamSetup />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/reset-password" element={<SignIn />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

import ErrorBoundary from './ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </StoreProvider>
    </ErrorBoundary>
  );
};

export default App;
