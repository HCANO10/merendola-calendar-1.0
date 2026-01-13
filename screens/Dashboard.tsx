import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

import { supabase } from '../src/supabaseClient';
import { CreateEventModal } from '../src/components/CreateEventModal'; // Adjusted import path
import { EventDetailsModal } from '../src/components/EventDetailsModal'; // Adjusted import path
import { NotificationBell } from '../src/components/NotificationBell'; // Adjusted import path

export const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // 1. Perfil y Equipos
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      const { data: memberships } = await supabase.from('memberships').select('teams(*)').eq('user_id', user.id);
      const teamsList = memberships?.map((m: any) => m.teams) || [];
      const activeTeam = teamsList.find((t: any) => t.id === profile?.active_team_id) || teamsList[0];

      setAllTeams(teamsList);
      setTeam(activeTeam);

      if (activeTeam) {
        // 2. Cargar Eventos
        const { data: rawEvents } = await supabase
          .from('events')
          .select(`
            *,
            event_participants ( status, user_id, profiles ( full_name, email ) ),
            profiles:created_by ( full_name )
          `)
          .eq('team_id', activeTeam.id);

        // 3. TRANSFORMACIÓN PARA FULLCALENDAR
        const formattedEvents = (rawEvents || []).map((e: any) => {
          // Determinar color según mi asistencia
          const myPart = e.event_participants?.find((p: any) => p.user_id === user.id);
          let color = '#4f46e5'; // Indigo (Default)
          if (myPart?.status === 'going') color = '#10b981'; // Verde
          if (myPart?.status === 'not_going') color = '#ef4444'; // Rojo

          return {
            id: e.id,
            title: e.title,
            start: e.start_time, // FullCalendar lee strings ISO perfectamente
            end: e.end_time,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { ...e } // Guardamos todos los datos originales aquí
          };
        });

        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (info: any) => {
    // Recuperamos los datos originales de extendedProps
    setSelectedEvent(info.event.extendedProps);
  };

  const handleTeamChange = async (e: any) => {
    await supabase.from('profiles').update({ active_team_id: e.target.value }).eq('user_id', user.id);
    window.location.reload();
  };

  const handleRSVP = async (eventId: string, status: string) => {
    // FIX: Removing 'e' arg to match EventDetailsModal signature (id, status)
    await supabase.from('event_participants').upsert({
      event_id: eventId, user_id: user.id, status
    });
    fetchUserData(); // Recargar para actualizar colores
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await supabase.from('events').delete().eq('id', eventId);
    fetchUserData();
    setSelectedEvent(null);
  };

  if (loading) return <div className="flex h-full items-center justify-center font-bold text-indigo-600">Cargando Calendario...</div>;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase">Equipo</label>
          <select
            value={team?.id}
            onChange={handleTeamChange}
            className="block w-full bg-transparent font-bold text-lg text-gray-800 border-none p-0 focus:ring-0 cursor-pointer"
          >
            {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-4">
          {user && <NotificationBell userId={user.id} />}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <span>📅</span> Nueva Merienda
          </button>
        </div>
      </div>

      {/* CALENDARIO FULLCALENDAR */}
      <div className="flex-1 bg-white p-4 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative z-0">
        <style>{`
          .fc-button-primary { background-color: #4f46e5 !important; border-color: #4f46e5 !important; }
          .fc-button-primary:hover { background-color: #4338ca !important; border-color: #4338ca !important; }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          locale={esLocale}
          events={events}
          eventClick={handleEventClick}
          height="100%"
          eventDisplay="block" // Hace que los eventos se vean como bloques de color
        />
      </div>

      {/* MODALES */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={fetchUserData}
        teamId={team?.id}
        creatorName={user?.email}
        teamName={team?.name}
        userId={user?.id} // FIX: Added missing userId prop
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
