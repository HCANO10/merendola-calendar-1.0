
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import { supabase } from './supabaseClient';
import SignIn from './screens/SignIn';
import TeamSetup from './screens/TeamSetup';
import Profile from './screens/Profile';
import Dashboard from './screens/Dashboard';

const AppRoutes: React.FC = () => {
  const { state, authLoading, loadError, dbNotInitialized, dbErrorMessage, fetchUserData, session } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 0. Robust Recovery Detection
    const hasRecoveryHash = window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token=');

    if (hasRecoveryHash && !location.pathname.includes('reset-password')) {
      console.log('[App] Recovery hash detected, moving to /reset-password');
      navigate('/reset-password' + window.location.hash, { replace: true });
      return;
    }

    // Auth and Data Rules Navigation
    // 1. If still loading the first session/data check, DO NOTHING (Wait for screen)
    if (authLoading || dbNotInitialized) return;

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
      // Profile check (Required birthday and name for routines)
      const isProfileIncomplete = !state.user.birthday || !state.user.name;
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
      console.warn('Session exists but state.user is null. Waiting for fetchUserData...');
    }
  }, [state.user, state.team, authLoading, dbNotInitialized, location.pathname, navigate, session, loadError]);

  // DB Missing Screen (Critical Fix)
  if (dbNotInitialized) {
    const copySql = async (path: string) => {
      try {
        const response = await fetch(path);
        const text = await response.text();
        await navigator.clipboard.writeText(text);
        alert('Script copiado. Pégalo en el SQL Editor de Supabase y ejecútalo.');
      } catch (err) {
        console.error('Error copying SQL:', err);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 text-center">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <span className="material-symbols-outlined text-6xl">database_off</span>
        </div>
        <h2 className="text-3xl font-bold mb-4">Base de Datos No Preparada</h2>
        <p className="text-[#60798a] dark:text-[#a0b3c1] mb-10 max-w-xl text-lg leading-relaxed">
          {dbErrorMessage || "Faltan las tablas necesarias en Supabase para que la aplicación funcione correctamente."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          <button
            onClick={() => copySql('/docs/supabase.sql')}
            className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-[#1a262f] border border-[#dbe1e6] dark:border-[#2a3942] rounded-2xl hover:border-primary transition-all group"
          >
            <span className="material-symbols-outlined text-primary text-3xl">content_paste</span>
            <span className="font-bold text-sm">1. Copiar Tablas SQL</span>
          </button>

          <button
            onClick={() => copySql('/docs/verify_db.sql')}
            className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-[#1a262f] border border-[#dbe1e6] dark:border-[#2a3942] rounded-2xl hover:border-primary transition-all group"
          >
            <span className="material-symbols-outlined text-emerald-500 text-3xl">verified</span>
            <span className="font-bold text-sm">2. Copiar Verificación</span>
          </button>

          <button
            onClick={() => session?.user && fetchUserData(session.user.id)}
            className="flex flex-col items-center gap-3 p-6 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined text-3xl">refresh</span>
            <span className="font-bold text-sm">3. Reintentar Ahora</span>
          </button>
        </div>

        <p className="mt-12 text-xs text-[#a0b3c1] uppercase tracking-widest font-bold">
          Paso final: ejecuta <code className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">NOTIFY pgrst, 'reload schema';</code> en Supabase
        </p>
      </div>
    );
  }

  // Global Loading Screen
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
            <p className="text-[#60798a] text-sm animate-pulse mb-6">Sincronizando con Supabase...</p>

            <button
              onClick={() => {
                supabase.auth.signOut().then(() => {
                  window.location.href = '/';
                });
              }}
              className="text-[#60798a] dark:text-[#a0b3c1] text-xs font-bold hover:underline"
            >
              ¿Tardando demasiado? Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Load Error Screen
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
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StoreProvider>
    </ErrorBoundary>
  );
};

export default App;
