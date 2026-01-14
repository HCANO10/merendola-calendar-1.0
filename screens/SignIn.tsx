import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { UI_TEXT } from '../constants';
import { supabase } from '../src/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';

const SignIn: React.FC = () => {
  const { signIn, signUp, resetPasswordForEmail, signOut } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Login Fix States
  const [showResendButton, setShowResendButton] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);

  useEffect(() => {
    // Escuchar eventos de AUTH solo para debug o limpieza, 
    // pero IGNORAMOS PASSWORD_RECOVERY aquí para que lo maneje ResetPassword.tsx
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log("⚠️ [SignIn] Evento PASSWORD_RECOVERY ignorado localmente. Delegando a /reset-password.");
        // No hacemos nada, dejamos que App.tsx redirija.
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname]);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Por favor, rellena todos los campos.');
      return;
    }

    setLoading(true);
    setShowResendButton(false);
    setTimeoutError(false);

    // 8s anti-stuck timeout
    const timer = setTimeout(() => {
      if (loading) {
        setTimeoutError(true);
        setLoading(false);
        showToast('La conexión está tardando demasiado. Reintenta.', 'error');
      }
    }, 8000);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        showToast('¡Registro iniciado! Revisa tu email para confirmar tu cuenta.', 'success');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            showToast('Correo o contraseña incorrectos.');
          } else if (error.message.includes('Email not confirmed')) {
            showToast('Tu correo no está confirmado. Revisa tu email.', 'error');
            setShowResendButton(true);
          } else if (error.message.includes('too many requests')) {
            showToast('Demasiados intentos. Espera unos minutos.');
          } else {
            showToast(error.message || 'Error al conectar con el servidor.');
          }
          return;
        }

        // Success: Clear any previous error and navigate EXPLICITLY
        showToast('¡Sesión iniciada!', 'success');

        // Final check to avoid rebounce: if we have session, we must go to dashboard
        if (data.session) {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('No se pudo completar la acción. Inténtalo de nuevo.');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/#/`
        }
      });
      if (error) throw error;
      showToast('Te hemos reenviado el email de confirmación.', 'success');
      setShowResendButton(false);
    } catch (err: any) {
      console.error('Resend error:', err);
      showToast('No se pudo enviar el correo. Reintenta en un momento.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes('@')) {
      showToast('Por favor, introduce un correo electrónico válido.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPasswordForEmail(email);
      if (error) throw error;
      showToast('Te hemos enviado un email para restablecer tu contraseña. Revisa spam si no lo ves.', 'success');
    } catch (err: any) {
      console.error('Recovery error:', err);
      showToast('No se pudo enviar el correo de recuperación. Reintenta en un momento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between border-b border-[#dbe1e6] dark:border-[#2a3942] bg-white dark:bg-[#1a262f] px-6 md:px-10 py-3">
        <div className="flex items-center gap-4">
          <div className="text-primary">
            <span className="material-symbols-outlined text-3xl">cookie</span>
          </div>
          <h1 className="text-lg font-bold leading-tight">{UI_TEXT.APP_NAME}</h1>
        </div>
        <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#60798a] dark:text-[#a0b3c1] text-sm font-bold hover:bg-gray-100 dark:hover:bg-white/5 px-4 py-2 rounded-lg transition-colors">
          {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark">
        {toast && (
          <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
            <span className="material-symbols-outlined">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
            <span className="font-bold">{toast.message}</span>
          </div>
        )}

        <div className="w-full max-w-[440px] bg-white dark:bg-[#1a262f] rounded-xl shadow-xl border border-[#dbe1e6] dark:border-[#2a3942] overflow-hidden">
          <div className="p-8">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <span className="material-symbols-outlined text-4xl">{isSignUp ? 'person_add' : 'login'}</span>
              </div>
              <h2 className="text-2xl font-bold leading-tight">{isSignUp ? 'Crear Cuenta' : UI_TEXT.SIGN_IN.TITLE}</h2>
              <p className="text-[#60798a] dark:text-[#a0b3c1] text-sm mt-2">{isSignUp ? 'Únete a tu equipo para merendar' : UI_TEXT.SIGN_IN.SUBTITLE}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">{UI_TEXT.SIGN_IN.EMAIL}</label>
                <div className="relative">
                  <input
                    className="w-full rounded-lg border-[#dbe1e6] dark:border-[#2a3942] bg-white dark:bg-[#101a22] h-12 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#60798a]">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold">{UI_TEXT.SIGN_IN.PASSWORD}</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-primary text-xs font-bold hover:underline"
                    >
                      {UI_TEXT.SIGN_IN.FORGOT}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    className="w-full rounded-lg border-[#dbe1e6] dark:border-[#2a3942] bg-white dark:bg-[#101a22] h-12 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#60798a]">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                </div>
              </div>

              <button
                className="w-full flex items-center justify-center rounded-lg h-12 bg-primary hover:bg-[#1a8de0] transition-all text-white text-base font-bold shadow-lg shadow-primary/30 gap-3 mt-4"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                  </svg>
                ) : null}
                <span>{isSignUp ? 'Registrarse' : UI_TEXT.SIGN_IN.CONTINUE}</span>
              </button>

              {showResendButton && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-primary hover:underline mt-2 p-2"
                >
                  <span className="material-symbols-outlined text-lg">forward_to_inbox</span>
                  Reenviar email de confirmación
                </button>
              )}

              {timeoutError && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center animate-in fade-in duration-300">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    La respuesta está tardando más de lo normal.
                  </p>
                  <button
                    onClick={handleSubmit as any}
                    className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100 underline decoration-2 underline-offset-4"
                  >
                    Intentar de nuevo ahora
                  </button>
                </div>
              )}

              <p className="text-center text-[#60798a] dark:text-[#a0b3c1] text-xs mt-6 cursor-pointer hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : UI_TEXT.SIGN_IN.NO_ACCOUNT}
              </p>
            </form>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-[#60798a] text-xs">
        <p>© 2024 {UI_TEXT.APP_NAME}. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default SignIn;
