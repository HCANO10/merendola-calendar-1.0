import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../supabaseClient';
import { CreateEventModal } from '../components/CreateEventModal';
import { EventDetailsModal } from '../components/EventDetailsModal';
import { NotificationBell } from '../components/NotificationBell';

// 1. CONFIGURACIÓN ESTÁTICA (FUERA DEL COMPONENTE)
// Esto evita que React recree el localizador en cada render (Causa del Error 310)
moment.locale('es');
const localizer = momentLocalizer(moment);

export const Dashboard = () => {
    // Estados
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [team, setTeam] = useState<any>(null);
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]); // Array de eventos limpios
    const [myRsvps, setMyRsvps] = useState<Record<string, string>>({});

    // Modales y Vistas
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [view, setView] = useState(window.innerWidth < 768 ? Views.AGENDA : Views.MONTH);

    // Efecto de carga inicial
    useEffect(() => {
        fetchUserData();
    }, []);

    // Efecto Responsive
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768 && view !== Views.AGENDA) setView(Views.AGENDA);
            else if (window.innerWidth >= 768 && view === Views.AGENDA) setView(Views.MONTH);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [view]);

    // ---------------------------------------------------------
    // FUNCIÓN DE CARGA BLINDADA
    // ---------------------------------------------------------
    const fetchUserData = async () => {
        try {
            setLoading(true);
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return; // El Router se encargará de redirigir

            setUser(authUser);

            // 1. Perfil y Equipos
            const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', authUser.id).single();
            const { data: memberships } = await supabase.from('memberships').select('teams(*)').eq('user_id', authUser.id);

            const teamsList = memberships?.map((m: any) => m.teams) || [];
            const activeTeam = teamsList.find((t: any) => t.id === profile?.active_team_id) || teamsList[0];

            setAllTeams(teamsList);
            setTeam(activeTeam);

            if (activeTeam) {
                // 2. Cargar Eventos (Query Segura)
                const { data: rawEvents, error } = await supabase
                    .from('events')
                    .select(`
            *,
            event_participants ( status, user_id, profiles ( full_name, email ) ),
            profiles:created_by ( full_name )
          `)
                    .eq('team_id', activeTeam.id);

                if (error) console.error("Error DB:", error);

                // 3. SANITIZACIÓN DE DATOS (CRÍTICO)
                const cleanEvents = (rawEvents || [])
                    .map((e: any) => {
                        // Convertir strings a Objetos Date Reales
                        const start = new Date(e.start_time);
                        const end = new Date(e.end_time);

                        // Validar que sean fechas reales
                        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

                        return {
                            ...e,
                            start, // Propiedad directa para el calendario
                            end,   // Propiedad directa para el calendario
                            resourceId: e.id
                        };
                    })
                    .filter(Boolean); // Eliminar nulos (fechas inválidas)

                setEvents(cleanEvents);

                // Mapa de RSVPs
                const rsvpMap: Record<string, string> = {};
                cleanEvents.forEach((e: any) => {
                    const myPart = e.event_participants?.find((p: any) => p.user_id === authUser.id);
                    if (myPart) rsvpMap[e.id] = myPart.status;
                });
                setMyRsvps(rsvpMap);
            }
        } catch (error) {
            console.error("Fatal Error Fetch:", error);
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------
    const handleTeamChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTeamId = e.target.value;
        await supabase.from('profiles').update({ active_team_id: newTeamId }).eq('user_id', user.id);
        window.location.reload();
    };

    const handleRSVP = async (e: any, eventId: string, status: string) => {
        if (e) e.stopPropagation();
        // Optimistic Update
        setMyRsvps(prev => ({ ...prev, [eventId]: status }));
        await supabase.from('event_participants').upsert({
            event_id: eventId, user_id: user.id, status
        });
        fetchUserData(); // Refrescar background
    };

    const handleDeleteEvent = async (eventId: string) => {
        const { error } = await supabase.from('events').delete().eq('id', eventId);
        if (!error) {
            setEvents(prev => prev.filter(e => e.id !== eventId));
            setSelectedEvent(null);
        } else {
            alert("No se pudo borrar: " + error.message);
        }
    };

    // ---------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-indigo-600 font-bold animate-pulse">
                Cargando calendario...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">

            {/* HEADER DASHBOARD */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                {/* Selector de Equipo */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Tu Equipo</label>
                    <div className="flex items-center gap-2">
                        <select
                            value={team?.id || ''}
                            onChange={handleTeamChange}
                            className="text-lg font-bold text-gray-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                        >
                            {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        {team?.join_code && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-mono rounded border border-indigo-100">
                                {team.join_code}
                            </span>
                        )}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {user && <NotificationBell userId={user.id} />}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 text-sm"
                    >
                        <span>＋</span> <span className="hidden sm:inline">Nueva Merienda</span>
                    </button>
                </div>
            </div>

            {/* CALENDARIO */}
            <div className="flex-1 bg-white p-2 md:p-4 rounded-xl shadow-lg border border-gray-200 min-h-[500px]">
                <Calendar
                    localizer={localizer}
                    events={events}
                    // USAR ACCESSORS DIRECTOS (Clave para evitar Crash)
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%', minHeight: '500px' }}
                    view={view}
                    onView={setView}
                    onSelectEvent={(e) => setSelectedEvent(e)}
                    culture='es'
                    messages={{
                        next: "Sig", previous: "Ant", today: "Hoy", month: "Mes",
                        week: "Semana", day: "Día", agenda: "Lista",
                        noEventsInRange: "No hay meriendas planeadas."
                    }}
                    eventPropGetter={(event) => {
                        const status = myRsvps[event.id];
                        let bgColor = '#4f46e5'; // Default Indigo
                        if (status === 'not_going') bgColor = '#ef4444'; // Rojo
                        if (status === 'going') bgColor = '#10b981'; // Verde
                        return { style: { backgroundColor: bgColor } };
                    }}
                />
            </div>

            {/* MODALES */}
            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onEventCreated={fetchUserData}
                teamId={team?.id}
                creatorName={user?.email} // Fallback seguro
                teamName={team?.name}
                members={[]}
            />

            {selectedEvent && (
                <EventDetailsModal
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    event={selectedEvent}
                    currentUserId={user?.id}
                    onDelete={handleDeleteEvent}
                    onRSVP={handleRSVP}
                />
            )}
        </div>
    );
};

export default Dashboard;
