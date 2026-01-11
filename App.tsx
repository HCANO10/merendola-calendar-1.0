
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import SignIn from './screens/SignIn';
import TeamSetup from './screens/TeamSetup';
import Profile from './screens/Profile';
import Dashboard from './screens/Dashboard';
import ResetPassword from './screens/ResetPassword';

const AppRoutes: React.FC = () => {
  const { state } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Auth and Data Rules Navigation
    if (!state.user) {
      if (!['/', '/reset-password'].includes(location.pathname)) {
        navigate('/', { replace: true });
      }
      return;
    }

    if (!state.user.teamId) {
      if (location.pathname !== '/team-setup') {
        navigate('/team-setup', { replace: true });
      }
      return;
    }

    if (!state.user.birthday) {
      if (location.pathname !== '/profile') {
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
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </StoreProvider>
  );
};

export default App;
