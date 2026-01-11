import React, { useState } from 'react';
import { useStore } from '../store';
import { UI_TEXT } from '../constants';
import { useNavigate } from 'react-router-dom';

const TeamSetup: React.FC = () => {
  const { createTeam, joinTeam, joinTeamByHandle, signOut } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [joinMode, setJoinMode] = useState<'code' | 'handle'>('code');
  const [teamName, setTeamName] = useState('Los Merendadores');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ handle: string; invite_code: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleCreate = async () => {
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      showToast('Escribe un nombre de equipo');
      return;
    }
    setLoading(true);
    try {
      const data = await createTeam(trimmedName);
      setSuccessData(data);
      showToast('¡Equipo creado con éxito!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error desconocido al crear equipo');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) {
      showToast(joinMode === 'code' ? 'Escribe un código de invitación' : 'Escribe el nombre del equipo');
      return;
    }
    setLoading(true);
    try {
      if (joinMode === 'code') {
        await joinTeam(trimmedInput);
      } else {
        await joinTeamByHandle(trimmedInput);
      }
      showToast('¡Te has unido al equipo!', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error desconocido al unirse');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-5xl">celebration</span>
        </div>
        <h1 className="text-3xl font-bold mb-4">¡Equipo listo!</h1>
        <p className="text-[#60798a] mb-10 max-w-sm">Comparte estos datos con tus amigos para que se unan.</p>

        <div className="w-full max-w-md bg-white dark:bg-[#1a262f] rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-xl space-y-6 mb-10">
          <div>
            <p className="text-xs font-bold text-[#a0b3c1] uppercase tracking-widest mb-2">Nombre Único (Handle)</p>
            <div className="bg-slate-50 dark:bg-white/5 py-4 px-6 rounded-xl font-mono text-xl font-bold text-primary">
              @{successData.handle}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#a0b3c1] uppercase tracking-widest mb-2">Código de Invitación</p>
            <div className="bg-slate-50 dark:bg-white/5 py-4 px-6 rounded-xl font-mono text-xl font-bold text-slate-800 dark:text-white">
              {successData.invite_code}
            </div>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full max-w-md h-16 bg-primary text-white text-lg font-bold rounded-2xl shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all flex items-center justify-center gap-3"
        >
          Ir al Dashboard
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {toast && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
          <span className="material-symbols-outlined">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="font-bold">{toast.message}</span>
        </div>
      )}

      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a262f] px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="text-primary">
            <span className="material-symbols-outlined text-3xl">group</span>
          </div>
          <h2 className="text-lg font-bold">{UI_TEXT.APP_NAME}</h2>
        </div>
        <button
          onClick={async () => { await signOut(); }}
          className="text-red-500 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          {UI_TEXT.PROFILE.LOGOUT}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 md:px-10">
        <div className="w-full max-w-[520px] bg-white dark:bg-[#1a262f] rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold leading-tight">{UI_TEXT.TEAM_SETUP.TITLE}</h1>
            <p className="text-[#60798a] dark:text-slate-400 mt-2">{UI_TEXT.TEAM_SETUP.SUBTITLE}</p>
          </div>

          <div className="mb-8">
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8 justify-center">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex flex-col items-center border-b-[3px] pb-3 transition-colors ${activeTab === 'create' ? 'border-primary text-primary' : 'border-transparent text-[#60798a]'}`}
              >
                <p className="text-sm font-bold">{UI_TEXT.TEAM_SETUP.CREATE_TAB}</p>
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex flex-col items-center border-b-[3px] pb-3 transition-colors ${activeTab === 'join' ? 'border-primary text-primary' : 'border-transparent text-[#60798a]'}`}
              >
                <p className="text-sm font-bold">{UI_TEXT.TEAM_SETUP.JOIN_TAB}</p>
              </button>
            </div>
          </div>

          {activeTab === 'create' ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end pb-1">
                  <p className="text-sm font-semibold">{UI_TEXT.TEAM_SETUP.TEAM_NAME}</p>
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check</span> {UI_TEXT.TEAM_SETUP.AVAILABLE}
                  </p>
                </div>
                <input
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-14 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  type="text"
                  placeholder="Ej: Los Merendadores"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={loading || !teamName.trim()}
                className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 text-white rounded-lg h-14 text-base font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
              >
                {loading ? UI_TEXT.COMMON.LOADING : UI_TEXT.TEAM_SETUP.CREATE_BTN}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50 dark:bg-white/5">
                <button
                  onClick={() => setJoinMode('code')}
                  className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${joinMode === 'code' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-[#60798a]'}`}
                >
                  POR CÓDIGO
                </button>
                <button
                  onClick={() => setJoinMode('handle')}
                  className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${joinMode === 'handle' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-[#60798a]'}`}
                >
                  POR NOMBRE (@handle)
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">
                  {joinMode === 'code' ? UI_TEXT.TEAM_SETUP.INVITE_CODE : 'Nombre del equipo (@handle)'}
                </p>
                <input
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-14 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  placeholder={joinMode === 'code' ? 'ABC-123' : 'losmerendadores'}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(joinMode === 'code' ? e.target.value.toUpperCase() : e.target.value.toLowerCase())}
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={loading || !inputValue.trim()}
                className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 text-white rounded-lg h-14 text-base font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
              >
                {loading ? UI_TEXT.COMMON.LOADING : UI_TEXT.TEAM_SETUP.JOIN_BTN}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeamSetup;
