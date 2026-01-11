import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';
import MainLayout from '../src/layouts/MainLayout';
import { UI_TEXT } from '../constants';

const TeamSetup: React.FC = () => {
  const { state } = useStore();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !state.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Inserción del Equipo
      // Generamos un handle y un código de invitación (invite_code en DB)
      const handle = teamName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);
      const inviteCode = (teamName.substring(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000));

      const { data: newTeam, error: teamErr } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          handle: handle,
          invite_code: inviteCode
        })
        .select()
        .single();

      if (teamErr) throw teamErr;

      // 2. Inserción inmediata de Membership (Admin)
      const { error: memErr } = await supabase
        .from('memberships')
        .insert({
          team_id: newTeam.id,
          user_id: state.user.id,
          role: 'admin'
        });

      if (memErr) throw memErr;

      // 3. Actualizar active_team_id en el perfil para el flujo de guardas
      await supabase
        .from('profiles')
        .update({ active_team_id: newTeam.id })
        .eq('user_id', state.user.id);

      // 4. ÉXITO: Recarga vital para sincronizar todo el estado
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
      // 1. Buscar equipo por código (invite_code en DB)
      const { data: team, error: findErr } = await supabase
        .from('teams')
        .select('id')
        .eq('invite_code', joinCode.trim().toUpperCase())
        .single();

      if (findErr || !team) throw new Error('Equipo no encontrado. Revisa el código.');

      // 2. Insertar Membership (Member)
      const { error: memErr } = await supabase
        .from('memberships')
        .insert({
          team_id: team.id,
          user_id: state.user.id,
          role: 'member'
        });

      // Si el error es 23505 significa que ya es miembro, procedemos
      if (memErr && memErr.code !== '23505') throw memErr;

      // 3. Actualizar active_team_id
      await supabase
        .from('profiles')
        .update({ active_team_id: team.id })
        .eq('user_id', state.user.id);

      // 4. ÉXITO: Recarga
      window.location.reload();
    } catch (err: any) {
      console.error('Error joining team:', err);
      setError(err.message || 'Error al unirse al equipo');
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center py-12 px-4 md:px-10 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-[520px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black tracking-tight mb-2">Configura tu Equipo</h1>
            <p className="text-slate-500 dark:text-slate-400">Para empezar a usar el calendario, necesitas un equipo.</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-10">
            <button
              onClick={() => { setActiveTab('create'); setError(null); }}
              className={`flex-1 py-3 font-bold rounded-xl transition-all ${activeTab === 'create' ? 'bg-white dark:bg-slate-700 shadow-lg text-primary' : 'text-slate-500'}`}
            >
              Crear Equipo
            </button>
            <button
              onClick={() => { setActiveTab('join'); setError(null); }}
              className={`flex-1 py-3 font-bold rounded-xl transition-all ${activeTab === 'join' ? 'bg-white dark:bg-slate-700 shadow-lg text-primary' : 'text-slate-500'}`}
            >
              Unirse con Código
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {activeTab === 'create' ? (
            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Nombre del Equipo</label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 h-14 px-6 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ej: Marketing Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !teamName.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-white h-14 rounded-xl font-black shadow-xl shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? 'Creando...' : 'Crear y Continuar'}
                {!loading && <span className="material-symbols-outlined font-bold">rocket_launch</span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinTeam} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Código de Invitación</label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 h-14 px-6 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all tracking-widest text-center uppercase"
                  placeholder="XXX-0000"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !joinCode.trim()}
                className="w-full bg-slate-900 dark:bg-primary hover:opacity-90 text-white h-14 rounded-xl font-black shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? 'Buscando...' : 'Unirse al Equipo'}
                {!loading && <span className="material-symbols-outlined font-bold">login</span>}
              </button>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default TeamSetup;
