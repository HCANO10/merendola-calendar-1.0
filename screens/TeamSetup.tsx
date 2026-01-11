
import React, { useState } from 'react';
import { useStore } from '../store';
import { UI_TEXT } from '../constants';


const TeamSetup: React.FC = () => {
  const { createTeam, joinTeam, signOut } = useStore();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState('Los Merendadores');
  const [inviteCode, setInviteCode] = useState(''); // New state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await createTeam(teamName);
      // Navigation handled by App.tsx detecting teamId change in user object
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Error al crear equipo: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await joinTeam(inviteCode);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Error al unirse: ' + e.message);
      if (e.message.includes('inválido') || e.message.includes('invalid')) {
        setErrorMsg('Código de invitación inválido o expirado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
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

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-bold text-center border border-red-100">
              {errorMsg}
            </div>
          )}

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
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">{UI_TEXT.TEAM_SETUP.INVITE_CODE}</p>
                <input
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-14 px-4 font-mono uppercase outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="ABC-123"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={loading || !inviteCode.trim()}
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
