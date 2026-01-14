import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './src/supabaseClient';

// Layouts y Screens
import { MainLayout } from './src/layouts/MainLayout';
import SignIn from './screens/SignIn';
import Dashboard from './screens/Dashboard';
import TeamSetup from './screens/TeamSetup';
import Profile from './screens/Profile';
import { ResetPassword } from './src/screens/ResetPassword';

/**
 * Componente interno para manejar redirecciones de Auth dentro del RouterContext.
 * Esto nos permite usar useNavigate de forma segura y preservar el hash.
 */
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {

      if (event === 'PASSWORD_RECOVERY') {
        console.log("🔔 [AuthRecovery] app_handler=PASSWORD_RECOVERY detected.");

        // Evitamos redirecciones en bucle si ya estamos ahí
        if (location.pathname === '/reset-password') {
          console.log("ℹ️ Ya estamos en /reset-password. No se requiere acción.");
          return;
        }

        console.log("🔀 [AuthRecovery] redirecting_to=/reset-password (Preserving Hash).");

        // REDIRECCIÓN DETERMINISTA:
        // Usamos navigate para ir a la ruta correcta, pero IMPORTANTE:
        // pasamos 'window.location.hash' para no perder el access_token que viene del email.
        navigate({
          pathname: '/reset-password',
          hash: window.location.hash
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null; // Este componente no renderiza nada visual, es solo lógico.
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios de sesión (Login/Logout) para actualizar estado global
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔔 Evento Auth (App):", event);
      setSession(session);

      // NOTA: La redirección de PASSWORD_RECOVERY ahora la maneja <AuthRedirectHandler />
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando Merendola...</div>;

  return (
    <Router>
      <AuthRedirectHandler />
      <Routes>
        {/* RUTAS PÚBLICAS */}
        <Route path="/" element={
          !session
            ? (
              window.location.hash.includes('reset-password')
                ? (() => { console.log("[AuthRecovery] bypass_auth_redirect_on_reset=true"); return <Navigate to="/reset-password" replace />; })()
                : <SignIn />
            )
            : <Navigate to="/dashboard" />
        } />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* RUTAS PRIVADAS */}
        <Route path="/dashboard" element={session ? <MainLayout><Dashboard /></MainLayout> : <Navigate to="/" />} />
        <Route path="/team-setup" element={session ? <MainLayout><TeamSetup /></MainLayout> : <Navigate to="/" />} />
        <Route path="/profile" element={session ? <MainLayout><Profile /></MainLayout> : <Navigate to="/" />} />

        {/* CATCH-ALL */}
        <Route path="*" element={
          window.location.hash.includes('reset-password')
            ? (() => { console.log("[AuthRecovery] bypass_auth_redirect_on_reset=true"); return <Navigate to="/reset-password" replace />; })()
            : <Navigate to="/" />
        } />
      </Routes>
    </Router>
  );
}
