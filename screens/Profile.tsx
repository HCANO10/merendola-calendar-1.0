
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { UI_TEXT } from '../constants';
import { supabase } from '../supabaseClient';

/**
 * Profile component to manage user information like name and birthday.
 * Includes strictly mandatory notification email.
 */
const Profile: React.FC = () => {
  const { state, updateUser, signOut } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState(state.user?.name || '');
  const [birthday, setBirthday] = useState(state.user?.birthday || '');
  const [notificationEmail, setNotificationEmail] = useState(state.user?.email || '');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const isEmailValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(notificationEmail);
  }, [notificationEmail]);

  const isFormValid = useMemo(() => {
    return name.trim().length > 0 && birthday !== '' && isEmailValid;
  }, [name, birthday, isEmailValid]);

  const handleSave = async () => {
    if (!isFormValid || !state.user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: name,
          birthday,
          notification_email: notificationEmail
        })
        .eq('user_id', state.user.id);

      if (error) throw error;

      // FIX ANTIGRAVITY: Forzar recarga para actualizar el estado global crítico
      window.location.reload();
    } catch (error) {
      console.error('Error saving profile:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // 1. Intentar cerrar sesión en Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      // 2. FUERZA BRUTA: Limpiar almacenamiento local y recargar navegador
      localStorage.clear(); // Opcional, por seguridad
      window.location.href = '/'; // Usar href, NO navigate(), para purgar el estado de memoria
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a262f] px-6 md:px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="text-primary">
            <span className="material-symbols-outlined text-3xl">account_circle</span>
          </div>
          <h2 className="text-lg font-bold">{UI_TEXT.APP_NAME}</h2>
        </div>
        <button
          onClick={handleLogout}
          className="text-red-500 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          {UI_TEXT.PROFILE.LOGOUT}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 md:px-10">
        <div className="w-full max-w-[520px] bg-white dark:bg-[#1a262f] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">{UI_TEXT.PROFILE.TITLE}</h1>
            <p className="text-[#60798a] dark:text-slate-400 mt-2">{UI_TEXT.PROFILE.BLOCK_MSG}</p>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-slate-400">{UI_TEXT.PROFILE.NAME}</label>
              <input
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-14 px-6 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-slate-400">{UI_TEXT.PROFILE.BIRTHDAY}</label>
              <input
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-14 px-6 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-slate-400">
                {UI_TEXT.PROFILE.EMAIL_LABEL}
              </label>
              <div className="relative">
                <input
                  className={`w-full rounded-xl border ${!isEmailValid && notificationEmail ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-[#101a22] h-14 px-6 pl-12 font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
              </div>
              {!isEmailValid && notificationEmail && (
                <p className="text-red-500 text-xs font-bold">{UI_TEXT.PROFILE.EMAIL_ERROR}</p>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={loading || !isFormValid}
              className={`w-full flex items-center justify-center rounded-xl h-14 text-base font-bold shadow-md transition-all ${isFormValid
                ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
              {loading ? UI_TEXT.COMMON.LOADING : UI_TEXT.PROFILE.SAVE}
            </button>
          </div>
        </div>

        {showToast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined">check_circle</span>
            {UI_TEXT.PROFILE.SUCCESS_MSG}
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
