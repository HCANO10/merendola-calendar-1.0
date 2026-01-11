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
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const isEmailValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(notificationEmail);
  }, [notificationEmail]);

  const isFormValid = useMemo(() => {
    return name.trim().length > 0 && birthday !== '' && isEmailValid;
  }, [name, birthday, isEmailValid]);

  const handleSave = async () => {
    if (!birthday) {
      setErrorStatus("La fecha de cumpleaños es obligatoria para el calendario");
      return;
    }
    if (!isFormValid || !state.user) return;
    setLoading(true);
    setErrorStatus(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          display_name: name,
          birthday: birthday,
          notification_email: notificationEmail,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', state.user.id);

      if (error) throw error;

      updateUser({
        name,
        birthday,
        notificationEmail
      });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setLoading(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrorStatus("Error al guardar el perfil.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 md:px-10">

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
                className={`w-full rounded-xl border ${!birthday && errorStatus ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-[#101a22] h-14 px-6 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                type="date"
                value={birthday}
                onChange={(e) => {
                  setBirthday(e.target.value);
                  if (e.target.value) setErrorStatus(null);
                }}
              />
              {!birthday && errorStatus && (
                <p className="text-red-500 text-xs font-bold">{errorStatus}</p>
              )}
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
