import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CreateEventModal } from '../components/CreateEventModal';
import { NotificationBell } from '../components/NotificationBell';

// MODO SEGURO: SIN CALENDARIO GRÁFICO
export const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [team, setTeam] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setUser(user);

                // 1. Cargar Perfil
                const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();

                if (profile?.active_team_id) {
                    // 2. Cargar Equipo
                    const { data: teamData } = await supabase.from('teams').select('*').eq('id', profile.active_team_id).single();
                    setTeam(teamData);

                    // 3. Cargar Eventos (Simple)
                    const { data: eventsData } = await supabase
                        .from('events')
                        .select('*')
                        .eq('team_id', profile.active_team_id);

                    setEvents(eventsData || []);
                }
            } catch (error) {
                console.error("Error cargando datos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-10 text-center font-bold text-lg">Recuperando sistema...</div>;

    return (
        <div className="h-full flex flex-col space-y-6 p-4">
            {/* HEADER DE EMERGENCIA */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-red-100 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {team ? `Equipo: ${team.name}` : 'Cargando equipo...'}
                    </h1>
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-1">
                        Modo Seguro Activo
                    </span>
                </div>
                <div className="flex gap-4 items-center">
                    {user && <NotificationBell userId={user.id} />}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 transition"
                    >
                        + Nueva Merienda
                    </button>
                </div>
            </div>

            {/* LISTA DE EVENTOS (A prueba de fallos) */}
            <div className="flex-1 bg-white p-6 rounded-xl shadow-md border border-gray-200 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">📅 Listado de Meriendas</h2>

                {events.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <p>No hay eventos cargados o la base de datos está vacía.</p>
                        <p className="text-sm mt-2">Prueba a crear uno nuevo.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {events.map((event) => (
                            <div key={event.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 flex flex-col sm:flex-row justify-between gap-4 transition-colors">
                                <div>
                                    <h3 className="font-bold text-lg text-indigo-700">{event.title}</h3>
                                    <div className="text-sm text-gray-500 mt-1 flex flex-col gap-1">
                                        <span>🕒 {new Date(event.start_time).toLocaleString()}</span>
                                        <span>📍 {event.location || 'Sin ubicación'}</span>
                                    </div>
                                </div>
                                {event.description && (
                                    <div className="text-sm bg-gray-50 p-3 rounded text-gray-600 italic max-w-md">
                                        "{event.description}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL (Funcional) */}
            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onEventCreated={() => window.location.reload()}
                teamId={team?.id}
                creatorName={user?.email}
                teamName={team?.name}
                members={[]}
            />
        </div>
    );
};
