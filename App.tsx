
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import { supabase } from './supabaseClient';
import SignIn from './screens/SignIn';
import TeamSetup from './screens/TeamSetup';
import Profile from './screens/Profile';
import Dashboard from './screens/Dashboard';

const AppRoutes: React.FC = () => {
  const { state, authLoading, loadError, fetchUserData, session } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 0. Robust Recovery Detection
    const hasRecoveryHash = window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token=');

    if (hasRecoveryHash && !location.pathname.includes('reset-password')) {
      const currentHash = window.location.hash;
      console.log('Recovery hash detected, redirecting to /reset-password');
      window.location.hash = `#/reset-password${currentHash.startsWith('#') ? currentHash.substring(1) : currentHash}`;
      return;
    }

    // Auth and Data Rules Navigation
    // 1. If still loading the first session/data check, DO NOTHING (Wait for screen)
    if (authLoading) return;

    // 2. If NO SESSION -> Only allow public routes
    if (!session) {
      if (!['/', '/reset-password'].includes(location.pathname)) {
        console.log('No session, redirecting to login');
        navigate('/', { replace: true });
      }
      return;
    }

    // 3. IF SESSION EXISTS but we are on login page -> Prevent rebounce and guide
    if (location.pathname === '/') {
      console.log('Session exists on login page, starting data evaluation...');
    }

    // 4. Evaluate data completeness (Guards)
    if (state.user) {
      // Profile check
      const isProfileIncomplete = !state.user.birthday || !state.user.notificationEmail || !state.user.name;
      if (isProfileIncomplete) {
        if (location.pathname !== '/profile') {
          console.log('Incomplete profile, redirecting to /profile');
          navigate('/profile', { replace: true });
        }
        return;
      }

      // Team check
      const hasNoTeam = !state.team && !state.user.activeTeamId;
      if (hasNoTeam) {
        if (location.pathname !== '/team-setup') {
          console.log('No team, redirecting to /team-setup');
          navigate('/team-setup', { replace: true });
        }
        return;
      }

      // Final success redirection
      if (['/', '/reset-password', '/team-setup'].includes(location.pathname)) {
        console.log('Everything OK, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    } else if (!loadError) {
      // Session exists but user state is null (fetchUserData is still running)
      console.warn('Session exists but state.user is null. Waiting for fetchUserData...');
    }
  }, [state.user, state.team, authLoading, location.pathname, navigate, session, loadError]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold mb-1">Iniciando sesión</h3>
            <p className="text-[#60798a] text-sm animate-pulse">Cargando tus preferencias...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl">sync_problem</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Error de Sincronización</h2>
        <p className="text-[#60798a] dark:text-[#a0b3c1] mb-8 max-w-sm">
          Se inició sesión, pero no se pudieron cargar tus datos. Esto puede ser un problema de conexión o permisos.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button
            onClick={() => session?.user && fetchUserData(session.user.id)}
            className="w-full h-14 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">refresh</span>
            Reintentar ahora
          </button>
          <button
            onClick={() => {
              supabase.auth.signOut();
              window.location.href = '/';
            }}
            className="w-full h-12 text-[#60798a] font-bold hover:underline"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

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
