import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';

const TeamSetup: React.FC = () => {
  const { state } = useStore();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // DELEGACIÓN AL BACKEND: El trigger se encarga de Membership y Profile Update
      const { error: teamErr } = await supabase
        .from('teams')
        .insert({ name: teamName.trim() });

      if (teamErr) throw teamErr;

      // ÉXITO: Recarga vital para que las guardas detecten el nuevo active_team_id
      window.location.reload();
    } catch (err: any) {
      console.error('Error creating team:', err);
      setError(err.message || 'Error al crear el equipo');
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !state.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Buscar equipo por código de invitación
      const { data: team, error: findErr } = await supabase
        .from('teams')
        .select('id')
        .eq('invite_code', joinCode.trim().toUpperCase())
        .single();

      if (findErr || !team) throw new Error('Código de equipo no válido.');

      // 2. Insertar Membership (El trigger actualizará el active_team_id del perfil)
      const { error: memErr } = await supabase
        .from('memberships')
        .insert({
          team_id: team.id,
          user_id: state.user.id
        });

      if (memErr && memErr.code !== '23505') throw memErr;

      // 3. ÉXITO: Recarga
      window.location.reload();
    } catch (err: any) {
      console.error('Error joining team:', err);
      setError(err.message || 'Error al unirse al equipo');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 md:px-10 min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-[500px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 md:p-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight mb-3">Tu Equipo</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configura dónde vas a organizar tus meriendas.</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-8">
          <button
            onClick={() => { setActiveTab('create'); setError(null); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'create' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Crear Nuevo
          </button>
          <button
            onClick={() => { setActiveTab('join'); setError(null); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'join' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Tengo un Código
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 animate-shake">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        {activeTab === 'create' ? (
          <form onSubmit={handleCreateTeam} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Nombre del equipo</label>
              <input
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 h-14 px-6 font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-lg"
                placeholder="Ej: Los Merendadores"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="w-full bg-primary hover:opacity-90 text-white h-14 rounded-2xl font-black shadow-xl shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg group"
            >
              {loading ? 'Procesando...' : 'Crear Equipo'}
              {!loading && <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform">arrow_forward</span>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinTeam} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Código de invitación</label>
              <input
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 h-14 px-6 font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all tracking-[0.25em] text-center uppercase text-xl"
                placeholder="ABC-1234"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !joinCode.trim()}
              className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 text-white h-14 rounded-2xl font-black shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
            >
              {loading ? 'Verificando...' : 'Unirse ahora'}
              {!loading && <span className="material-symbols-outlined font-bold">login</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TeamSetup;
