
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import { supabase } from './supabaseClient';
import SignIn from './screens/SignIn';
import TeamSetup from './screens/TeamSetup';
import Profile from './screens/Profile';
import Dashboard from './screens/Dashboard';
import MainLayout from './layouts/MainLayout';

const AppRoutes: React.FC = () => {
  const { state, authLoading, loadError, dbNotInitialized, dbErrorMessage, fetchUserData, session } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = React.useState<string | null>(null);

  useEffect(() => {
    // 0. Recovery Mode (Always Priority)
    const hasRecoveryHash = window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=');
    if (hasRecoveryHash && !location.pathname.includes('reset-password')) {
      navigate('/reset-password' + window.location.hash, { replace: true });
      return;
    }

    // 1. Wait for Auth/DB
    if (authLoading || dbNotInitialized) return;

    // 2. Public Access Guard
    if (!session) {
      if (!['/', '/reset-password'].includes(location.pathname)) {
        navigate('/', { replace: true });
      }
      return;
    }

    // 3. Authenticated Sequence
    if (state.user) {
      // STEP A: Profile Setup (Birthday is the blocker)
      const isProfileIncomplete = !state.user.birthday || !state.user.notificationEmail;
      if (isProfileIncomplete) {
        if (location.pathname !== '/profile') {
          console.log('[App] Guard: Profile incomplete -> Redirect to /profile');
          setToast("Completa tu perfil para continuar");
          setTimeout(() => setToast(null), 4000);
          navigate('/profile', { replace: true });
        }
        return;
      }

      // STEP B: Team Setup
      const hasNoTeam = !state.team && !state.user.activeTeamId;
      if (hasNoTeam) {
        if (location.pathname !== '/team-setup') {
          console.log('[App] Guard: No team -> Redirect to /team-setup');
          navigate('/team-setup', { replace: true });
        }
        return;
      }

      // STEP C: Fully Configured (Redirect to Dashboard if on setup pages)
      const onSetupPage = ['/', '/reset-password', '/team-setup'].includes(location.pathname);
      if (onSetupPage) {
        console.log('[App] Guard: Ready -> Redirect to /dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [state.user, state.team, authLoading, dbNotInitialized, location.pathname, navigate, session]);

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

        <div className="flex flex-col md:flex-row gap-4 w-full max-w-lg mb-8">
          <button
            onClick={() => copySql('/docs/supabase.sql')}
            className="flex-1 h-14 bg-white dark:bg-[#1a262f] border border-[#dbe1e6] dark:border-[#2a3942] rounded-2xl flex items-center justify-center gap-3 hover:border-primary transition-all font-bold"
          >
            <span className="material-symbols-outlined text-primary">content_paste</span>
            SQL Tablas
          </button>
          <button
            onClick={() => session?.user && fetchUserData(session.user.id)}
            className="flex-1 h-14 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all font-bold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">refresh</span>
            Reintentar
          </button>
        </div>

        <p className="text-xs text-[#a0b3c1] uppercase tracking-widest font-bold">
          Ejecuta <code className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">NOTIFY pgrst, 'reload schema';</code> al terminar
        </p>
      </div>
    );
  }

  // Global Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1">Cargando datos</h3>
            <p className="text-[#60798a] text-sm animate-pulse mb-6 text-center">Iniciando sincronización...</p>
            <button
              onClick={() => {
                supabase.auth.signOut().then(() => {
                  window.location.href = '/';
                });
              }}
              className="text-[#60798a] dark:text-[#a0b3c1] text-xs font-bold hover:underline"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Load Error Screen
  if (loadError) {
    const error = state.syncError;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl">sync_problem</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Error de Sincronización</h2>

        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-6 mb-8 max-w-sm w-full text-left">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Fallo en la etapa: {error?.step || 'general'}</p>
          <p className="text-sm text-red-800 dark:text-red-400 font-medium">{error?.message || 'Se inició sesión, pero no se pudieron cargar tus datos.'}</p>
          {error?.code && <p className="text-[10px] text-red-400 mt-2 font-mono">SUPABASE_CODE: {error.code}</p>}
        </div>

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
    <>
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white px-6 py-4 rounded-xl shadow-2xl font-bold animate-in fade-in slide-in-from-top-4">
          <p>{toast}</p>
        </div>
      )}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SignIn />} />
        <Route path="/reset-password" element={<SignIn />} />

        {/* Protected Routes */}
        <Route path="/team-setup" element={<TeamSetup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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
