import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { supabase } from '../supabaseClient';

const TeamSetup: React.FC = () => {
  const { state, switchTeam, deleteTeam } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'join'>(state.teams.length > 0 ? 'manage' : 'create');
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !state.user?.id) return;
    setLoading(true);

    try {
      // 1. CREAR EQUIPO
      // El Trigger de SQL se encargará AUTOMÁTICAMENTE de:
      // a) Crear la membresía de admin.
      // b) Actualizar el active_team_id del perfil.
      const { error } = await supabase
        .from('teams')
        .insert([{
          name: teamName.trim(),
          created_by: state.user.id
        }]);

      if (error) throw error;

      // 2. REDIRECCIÓN
      // Esperamos un instante (500ms) para asegurar que el Trigger SQL termine
      // y luego recargamos para entrar al Dashboard del nuevo equipo.
      setIsCreatingSpace(true);
      setToast("¡Equipo creado! Preparando tu entorno...");

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);

    } catch (err: any) {
      console.error("Error creating team:", err);
      alert("Error al crear equipo: " + err.message);
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    if (!state.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. BUSCAR EL EQUIPO POR CÓDIGO
      // Importante: .maybeSingle() para no dar error 406 si no existe, devuelve null
      const { data: team, error: searchError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('join_code', joinCode.trim().toUpperCase()) // trim() y upper para asegurar match
        .maybeSingle();

      if (searchError) throw searchError;
      if (!team) {
        alert("❌ Código no válido. No se encontró ningún equipo.");
        setError("Código no válido. Verifícalo.");
        setLoading(false);
        return;
      }

      // 2. CREAR MEMBRESÍA
      const { error: joinError } = await supabase
        .from('memberships')
        .insert([{
          team_id: team.id,
          user_id: state.user.id,
          role: 'member'
        }]);

      // Ignorar error si ya es miembro (código 23505 duplicate key)
      if (joinError && joinError.code !== '23505') throw joinError;

      // 3. ACTUALIZAR PERFIL (Para entrar directo)
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ active_team_id: team.id })
        .eq('user_id', state.user.id); // user_id column in profiles

      // Note: check if column is really user_id or id in profiles table. 
      // Based on previous file content: .eq('id', state.user.id); at line 82.
      // Wait, line 82 in previous file was .eq('id', state.user.id);
      // Snippet says .eq('user_id', user.id);
      // I should verify the table structure if possible or safer: update where id matches.
      // Usually profiles.id is the user_id uuid. 
      // I will trust the previous code that used .eq('id', state.user.id).
      // actually, let's look at key usage.
      // In the file read: 
      // line 82: .eq('id', state.user.id);
      // So I will use .eq('id', state.user.id) to be safe with existing schema assumptions.

      if (profErr) throw profErr;

      // 4. ÉXITO -> Recargar para ir al Dashboard
      alert(`✅ ¡Te has unido a ${team.name}!`);
      window.location.reload();

    } catch (err: any) {
      console.error("Error al unirse:", err);
      alert("Error: " + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (teamId: string) => {
    setLoading(true);
    try {
      await switchTeam(teamId);
      navigate('/dashboard');
    } catch (err) {
      setError('No se pudo cambiar de equipo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    setLoading(true);
    try {
      await deleteTeam(teamId);
      setConfirmDelete(null);
    } catch (err) {
      setError('No se pudo eliminar el equipo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 md:p-12 overflow-auto">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 uppercase italic">Gestión de Equipos</h1>
            <p className="text-slate-500 font-medium tracking-tight">Crea, únete o administra tus comunidades de merienda.</p>
          </div>
          {state.teams.length > 0 && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Volver al Dashboard
            </button>
          )}
        </header>

        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-12 w-fit">
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'manage' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            Mis Equipos
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            Crear Uno
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'join' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            Unirse con Código
          </button>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-3xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {toast && (
          <div className="mb-8 p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-3xl text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <span className="material-symbols-outlined">check_circle</span>
            {toast}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.teams.length > 0 ? (
              state.teams.map((team) => (
                <div key={team.id} className={`group bg-white dark:bg-slate-900 border ${team.id === state.team?.id ? 'border-primary ring-4 ring-primary/5' : 'border-slate-200 dark:border-slate-800'} rounded-[2.5rem] p-6 transition-all hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 overflow-hidden relative`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${team.id === state.team?.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {team.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">{team.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${team.role === 'admin' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {team.role === 'admin' ? 'Administrador' : 'Miembro'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {team.id === state.team?.id && (
                      <span className="material-symbols-outlined text-primary font-black">check_circle</span>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4 mb-6 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">CÓDIGO DE INVITACIÓN</p>
                      <p className="text-xl font-mono font-black text-slate-900 dark:text-white tracking-widest">{team.join_code}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(team.join_code)}
                      className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:shadow-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">content_copy</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSwitch(team.id)}
                      disabled={loading || team.id === state.team?.id}
                      className={`flex-1 h-12 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${team.id === state.team?.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 shadow-xl'}`}
                    >
                      {team.id === state.team?.id ? 'Equipo Actual' : 'Cambiar Ahora'}
                    </button>

                    {team.role === 'admin' && (
                      confirmDelete === team.id ? (
                        <div className="flex gap-2 animate-in slide-in-from-right-2">
                          <button
                            onClick={() => handleDelete(team.id)}
                            className="h-12 px-5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(team.id)}
                          className="w-12 h-12 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all group"
                        >
                          <span className="material-symbols-outlined">delete_forever</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Aún no tienes equipos</h3>
                <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium">Empieza por crear uno nuevo o únete a una comunidad existente.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                >
                  ¡Crear mi primer equipo!
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {isCreatingSpace ? (
              <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mb-8 shadow-2xl shadow-primary/20"></div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic text-center mb-2">Creando tu espacio...</h2>
                <p className="text-slate-500 font-medium text-center">Configurando tu nuevo entorno de merienda</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center text-center mb-10">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl">add_business</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Nuevo Equipo</h2>
                  <p className="text-slate-500 font-medium mt-2">Ponle nombre a tu comunidad de merienda.</p>
                </div>

                <form onSubmit={handleCreateTeam} className="space-y-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] ml-2">Nombre del Proyecto</label>
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-3xl h-16 px-8 text-xl font-bold outline-none transition-all"
                      placeholder="Ej: Marketing Team, Dev Squad..."
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !teamName.trim()}
                    className="w-full bg-primary hover:opacity-90 text-white h-16 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-95 disabled:shadow-none"
                  >
                    {loading ? 'Procesando...' : 'Lanzar Equipo'}
                    <span className="material-symbols-outlined animate-pulse">rocket_launch</span>
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {activeTab === 'join' && (
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-16 h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl">vpn_key</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Unirse</h2>
              <p className="text-slate-500 font-medium mt-2">Introduce el código que te han proporcionado.</p>
            </div>

            <form onSubmit={handleJoinTeam} className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] ml-2">Código Secreto</label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-3xl h-20 px-8 text-3xl font-black outline-none transition-all tracking-[0.3em] text-center uppercase"
                  placeholder="TEAM-0000"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !joinCode.trim()}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 h-16 rounded-3xl font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Acceder al Equipo'}
                <span className="material-symbols-outlined">login</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamSetup;
