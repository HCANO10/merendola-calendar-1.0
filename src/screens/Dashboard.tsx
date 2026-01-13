import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CreateEventModal } from '../components/CreateEventModal';
import { NotificationBell } from '../components/NotificationBell';

// NOTA: Hemos quitado los imports del calendario temporalmente para evitar el crash

export const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [team, setTeam] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        const initData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setUser(user);

                // Cargar perfil y equipo
                const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
                if (profile?.active_team_id) {
                    const { data: teamData } = await supabase.from('teams').select('*').eq('id', profile.active_team_id).single();
                    setTeam(teamData);

                    // Cargar eventos (simple)
                    const { data: eventsData } = await supabase.from('events').select('*').eq('team_id', profile.active_team_id);
                    setEvents(eventsData || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    if (loading) return <div className="p-10 text-center text-indigo-600 font-bold animate-pulse">Cargando datos...</div>;

    return (
        <div className="p-8 space-y-6 max-w-5xl mx-auto h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard (Modo Seguro)</h1>
                    <p className="text-slate-500 font-medium">Equipo: <span className="text-indigo-600">{team?.name || 'Sin equipo'}</span></p>
                </div>
                <div className="flex gap-4 items-center">
                    {user && <NotificationBell userId={user.id} />}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all font-bold flex items-center gap-2 active:scale-95"
                    >
                        <span>＋</span> Nueva Merienda
                    </button>
                </div>
            </div>

            {/* Lista de Eventos */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                    <span>📅</span> Próximas Meriendas
                </h2>

                {events.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-slate-400 font-medium italic mb-2">No hay eventos registrados.</p>
                        <p className="text-slate-400 text-sm">¡Sé el primero en convocar una merendola!</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {events.map(ev => (
                            <div key={ev.id} className="p-5 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all bg-white group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

                                <h3 className="font-bold text-lg text-slate-900 mb-1">{ev.title}</h3>

                                <div className="space-y-1 mb-3">
                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <span className="text-indigo-500 material-symbols-outlined text-[1rem]">calendar_month</span>
                                        {new Date(ev.start_time).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <span className="text-indigo-500 material-symbols-outlined text-[1rem]">schedule</span>
                                        {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>

                                {ev.description && (
                                    <p className="text-sm text-slate-500 border-t border-slate-100 pt-3 mt-3">
                                        {ev.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onEventCreated={() => window.location.reload()}
                teamId={team?.id}
                creatorName={user?.email}
                teamName={team?.name}
                members={[]} // En modo seguro no cargamos miembros para evitar errores
            />
        </div>
    );
};

export default Dashboard;
