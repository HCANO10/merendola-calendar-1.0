import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { CreateEventModal } from '../src/components/CreateEventModal';
import { NotificationBell } from '../src/components/NotificationBell';

// --- COMPONENTE SEGURO (SIN CALENDARIO GRÁFICO) ---
export const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    // Carga de datos simple y robusta
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Deja que App.tsx maneje la redirección
        setUser(user);

        // 1. Perfil
        const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();

        if (profile?.active_team_id) {
          // 2. Equipo
          const { data: teamData } = await supabase.from('teams').select('*').eq('id', profile.active_team_id).single();
          setTeam(teamData);

          // 3. Eventos
          const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .eq('team_id', profile.active_team_id)
            .order('start_time', { ascending: true });

          setEvents(eventsData || []);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl font-bold text-indigo-600 animate-pulse">
          Recuperando sistema...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">

      {/* HEADER: INFO EQUIPO + ACCIONES */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {team ? team.name : 'Sin Equipo'}
          </h1>
          {team?.join_code && (
            <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
              Código: {team.join_code}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user && <NotificationBell userId={user.id} />}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold shadow transition-transform active:scale-95"
          >
            + Nueva Merienda
          </button>
        </div>
      </div>

      {/* LISTA DE EVENTOS (A prueba de fallos) */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-700">📅 Próximas Meriendas</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>No hay eventos programados.</p>
              <p className="text-sm">¡Crea el primero!</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-4 border border-gray-100 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all bg-white group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      🗓 {new Date(event.start_time).toLocaleDateString()} &nbsp;•&nbsp;
                      ⏰ {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-gray-500">
                      📍 {event.location || 'Sin ubicación'}
                    </p>
                  </div>
                  <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase">
                    Evento
                  </div>
                </div>
                {event.description && (
                  <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    "{event.description}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE CREACIÓN */}
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

export default Dashboard;
