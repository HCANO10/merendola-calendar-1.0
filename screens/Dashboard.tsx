import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; // IMPORTANTE PARA EL CLIC
import esLocale from '@fullcalendar/core/locales/es';

import { supabase } from '../src/supabaseClient';
import { CreateEventModal } from '../src/components/CreateEventModal';
import { EventDetailsModal } from '../src/components/EventDetailsModal';
import { NotificationBell } from '../src/components/NotificationBell';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [clickedDate, setClickedDate] = useState<Date | null>(null); // Para guardar donde hizo clic

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // Perfil y Equipos
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      const { data: memberships } = await supabase.from('memberships').select('teams(*)').eq('user_id', user.id);

      const teamsList = memberships?.map((m: any) => m.teams) || [];
      const activeTeam = teamsList.find((t: any) => t.id === profile?.active_team_id) || teamsList[0];

      setAllTeams(teamsList);
      setTeam(activeTeam);

      if (activeTeam) {
        // Cargar Eventos
        const { data: rawEvents } = await supabase
          .from('events')
          .select(`
            *,
            event_participants ( status, user_id, profiles ( full_name, email ) ),
            profiles:created_by ( full_name )
          `)
          .eq('team_id', activeTeam.id);

        const formatted = (rawEvents || []).map((e: any) => {
          const myPart = e.event_participants?.find((p: any) => p.user_id === user.id);
          let bgColor = '#4f46e5';
          if (myPart?.status === 'going') bgColor = '#10b981';
          if (myPart?.status === 'not_going') bgColor = '#ef4444';

          return {
            id: e.id,
            title: e.title,
            start: e.start_time,
            end: e.end_time,
            backgroundColor: bgColor,
            borderColor: bgColor,
            extendedProps: { ...e }
          };
        });

        setCalendarEvents(formatted);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- INTERACCIÓN: CLIC EN FECHA (CREAR) ---
  const handleDateClick = (arg: any) => {
    setClickedDate(arg.date); // Guardamos la fecha del clic
    setIsCreateModalOpen(true); // Abrimos modal
  };

  // --- INTERACCIÓN: CLIC EN EVENTO (DETALLES) ---
  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.extendedProps);
  };

  // Resto de handlers
  const handleTeamChange = async (e: any) => {
    await supabase.from('profiles').update({ active_team_id: e.target.value }).eq('user_id', user.id);
    window.location.reload();
  };

  // Corrección de firma: eliminamos 'e' para coincidir con EventDetailsModal
  const handleRSVP = async (eventId: string, status: string) => {
    await supabase.from('event_participants').upsert({
      event_id: eventId, user_id: user.id, status
    });
    fetchUserData();
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("¿Borrar merienda?")) return;
    await supabase.from('events').delete().eq('id', eventId);
    fetchUserData();
    setSelectedEvent(null);
  };

  if (loading) return <div className="flex h-full items-center justify-center text-indigo-600 font-bold">Cargando...</div>;

  return (
    <div className="flex flex-col h-full space-y-4 p-4">

      {/* HEADER DASHBOARD */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-auto">
          <label className="text-xs font-bold text-gray-400 uppercase block">Equipo</label>
          <select
            value={team?.id}
            onChange={handleTeamChange}
            className="bg-transparent font-bold text-lg text-gray-800 border-none p-0 focus:ring-0 cursor-pointer w-full"
          >
            {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-4">
          {user && <NotificationBell userId={user.id} />}
          <button
            onClick={() => { setClickedDate(new Date()); setIsCreateModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold shadow-md transition flex items-center gap-2"
          >
            <span>＋</span> Crear Merienda
          </button>
        </div>
      </div>

      {/* CALENDARIO */}
      <div className="flex-1 bg-white p-2 md:p-4 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          locale={esLocale}
          events={calendarEvents}

          // ACTIVAMOS INTERACCIONES
          dateClick={handleDateClick}  // Clic en celda vacía -> Crear
          eventClick={handleEventClick} // Clic en evento -> Detalles

          height="100%"
          editable={false}
          selectable={true}
          dayMaxEvents={true}
        />
      </div>

      {/* MODALES */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={fetchUserData} // Esto asegura que aparezca el evento al guardar
        teamId={team?.id}
        creatorName={user?.email}
        teamName={team?.name}
        members={[]}
        initialDate={clickedDate} // Pasamos la fecha del clic
        userId={user?.id} // Corrección: Añadido userId
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
