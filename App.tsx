import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './src/supabaseClient'; // Ahora seguro está aquí

// Layouts y Screens
import { MainLayout } from './src/layouts/MainLayout';
import SignIn from './screens/SignIn'; // Tu pantalla de Login (AuthScreen)
import Dashboard from './screens/Dashboard';
import TeamSetup from './screens/TeamSetup'; // Asegúrate de tener este archivo
import Profile from './screens/Profile';     // Asegúrate de tener este archivo
import { ResetPassword } from './src/screens/ResetPassword';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (Login, Logout, Reset Password)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔔 Evento Auth:", event);
      setSession(session);

      if (event === 'PASSWORD_RECOVERY') {
        // Redirección manual si el router no lo pilla
        window.location.hash = '/reset-password';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando Merendola...</div>;

  return (
    <Router>
      <Routes>
        {/* RUTAS PÚBLICAS (Sin Layout) */}
        <Route path="/" element={!session ? <SignIn /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* RUTAS PRIVADAS (Con MainLayout) */}
        <Route path="/dashboard" element={session ? <MainLayout><Dashboard /></MainLayout> : <Navigate to="/" />} />
        <Route path="/team-setup" element={session ? <MainLayout><TeamSetup /></MainLayout> : <Navigate to="/" />} />
        <Route path="/profile" element={session ? <MainLayout><Profile /></MainLayout> : <Navigate to="/" />} />

        {/* Catch-all: Si ruta no existe, ir a home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
