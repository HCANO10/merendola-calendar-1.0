import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { supabase } from '../supabaseClient';
import { useStore } from '../store';
import { RSVPStatus } from '../types';
import TeamSwitcher from '../src/components/TeamSwitcher';
import NotificationBell from '../src/components/NotificationBell';
import { CreateEventModal } from '../src/components/CreateEventModal';
import { sendEventInvitation } from '../src/utils/emailService';

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Dashboard: React.FC = () => {
  const { state, fetchUserData, respondToInvite } = useStore();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  // Layout state
  const [toast, setToast] = useState<string | null>(null);

  // 1. DATA ADAPTATION
  const rawEvents = Array.isArray(state.events) ? state.events : [];

  const calendarEvents = useMemo(() => {
    return rawEvents.map(ev => ({
      ...ev,
      title: ev.title || 'Sin título',
      start: new Date(ev.start_time),
      end: new Date(ev.end_time),
      resource: ev
    }));
  }, [rawEvents]);

  // 2. RENDERIZADO CONDICIONAL SIMPLE
  if (state.loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter animate-pulse">Sincronizando calendario...</p>
      </div>
    );
  }

  // 3. RENDERIZADO PRINCIPAL (SIEMPRE SI NO CARGA)

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot(slotInfo);
    setShowCreateModal(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  const handleRSVP = async (event_id: string, status: 'going' | 'not_going') => {
    if (!state.user?.id) return;
    try {
      const { error } = await supabase
        .from('event_participants')
        .upsert({
          event_id,
          user_id: state.user.id,
          status
        }, { onConflict: 'event_id, user_id' });
      if (error) throw error;
      setToast(status === 'going' ? "¡Te has apuntado! 🙋‍♂️" : "No asistirás 🙅‍♂️");
      setTimeout(() => setToast(null), 3000);
      fetchUserData(state.user.id); // Refresh data
    } catch (err) {
      console.error("Error in RSVP:", err);
    }
  };

  const birthdayEvents = (state.teamMembers || [])
    .filter(member => member.birthday)
    .map(member => {
      const today = new Date();
      const bday = new Date(member.birthday!);
      const eventDate = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      return {
        id: `bday-${member.id}`,
        title: `🎂 Cumple: ${member.name}`,
        start: eventDate,
        end: eventDate,
        allDay: true,
        resource: { type: 'birthday', user: member }
      };
    });

  const allEvents = useMemo(() => [...calendarEvents, ...birthdayEvents], [calendarEvents, birthdayEvents]);

  return (
    <div className="flex-1 flex flex-col h-full p-4 md:p-8 bg-slate-50 dark:bg-slate-950 overflow-auto">
      {toast && (
        <div className="fixed top-24 right-8 z-[100] bg-emerald-500 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-8 font-bold border-4 border-emerald-400">
          <span className="material-symbols-outlined font-black">check_circle</span>
          <span className="tracking-tight">{toast}</span>
        </div>
      )}

      {/* Team Header */}
      {/* Team Header REPLACEMENT */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Equipo Actual
            </label>
            <div className="relative">
              <select
                value={state.team?.id || ''}
                onChange={(e) => {
                  const newTeamId = e.target.value;
                  if (!newTeamId || !state.user?.id) return;
                  const updateTeam = async () => {
                    await supabase.from('profiles').update({ active_team_id: newTeamId }).eq('user_id', state.user!.id);
                    window.location.reload();
                  };
                  updateTeam();
                }}
                className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-lg min-w-[200px]"
              >
                {state.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {state.team?.join_code && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(state.team?.join_code || '');
                setToast("Código copiado: " + state.team?.join_code);
                setTimeout(() => setToast(null), 3000);
              }}
              className="mt-5 p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Copiar código de invitación"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
        >
          <span>🍩</span> Crear Merienda
        </button>
      </div>

      {/* Calendar Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl min-h-[700px] relative">
        <Calendar
          localizer={localizer}
          events={allEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', borderRadius: '1.5rem' }}
          messages={{
            next: "Siguiente", previous: "Anterior", today: "Hoy",
            month: "Mes", week: "Semana", day: "Día",
            agenda: "Agenda", date: "Fecha", time: "Hora", event: "Evento"
          }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          components={{
            event: ({ event }: any) => (
              <div className="flex items-center gap-1.5 px-2 py-0.5 overflow-hidden">
                <span className="text-sm font-bold truncate tracking-tight">{event.title}</span>
              </div>
            )
          }}
          eventPropGetter={(event: any) => ({
            style: {
              backgroundColor: event.resource?.type === 'birthday' ? '#ec4899' : '#3b82f6',
              borderRadius: '8px', opacity: 0.8, color: 'white', border: 'none', display: 'block', fontWeight: 'bold'
            }
          })}
        />
      </div>

      {/* MIS INVITACIONES - SECTION */}
      <div className="mt-8 bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl mb-24">
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <span className="text-2xl">💌</span> Mis Invitaciones
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-black text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-4">Evento</th>
                <th className="py-4 px-4">Cuándo</th>
                <th className="py-4 px-4 hidden md:table-cell">Dónde</th>
                <th className="py-4 px-4 text-center">Tu Respuesta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {state.events?.map((ev: any) => (
                <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-bold text-gray-900 dark:text-white">{ev.title}</p>
                    <p className="text-xs text-gray-500 md:hidden">{ev.location || 'Sin ubicación'}</p>
                  </td>
                  <td className="py-4 px-4 font-medium text-gray-600 dark:text-gray-300">
                    {new Date(ev.start_time).toLocaleDateString()} <span className="text-xs text-gray-400 block">{new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                    {ev.location || '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-max mx-auto">
                      <button
                        onClick={() => handleRSVP(ev.id, 'not_going')}
                        className="px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all hover:bg-white hover:text-red-500 hover:shadow-sm text-gray-400"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleRSVP(ev.id, 'going')}
                        className="px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all bg-white text-emerald-600 shadow-sm"
                      >
                        Si Voy
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!state.events || state.events.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 text-sm font-medium italic">
                    No tienes invitaciones pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FLOATING ACTION BUTTON (MOBILE) */}
      <button
        onClick={() => {
          setSelectedSlot(null);
          setShowCreateModal(true);
        }}
        className="fixed bottom-8 right-8 z-[100] md:hidden bg-primary text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform border-4 border-white dark:border-slate-800"
      >
        <span className="material-symbols-outlined text-3xl font-black">add</span>
      </button>

      {/* CREATE MODAL EXTRACTED */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={() => {
          setToast("¡Evento creado y notificaciones enviadas!");
          setTimeout(() => setToast(null), 5000);
          if (state.user?.id) fetchUserData(state.user.id); // Recargar datos
        }}
        teamId={state.team?.id || ''}
        userId={state.user?.id || ''}
        teamName={state.team?.name || ''}
        creatorName={state.user?.name || ''}
        members={state.teamMembers || []}
      />

      {/* DETAIL MODAL */}
      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowDetailModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-10 relative z-10 shadow-2xl border border-slate-100 dark:border-slate-800">
            {selectedEvent.resource?.type === 'birthday' ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/10 text-amber-500 rounded-full flex items-center justify-center mb-8"><span className="material-symbols-outlined text-5xl">cake</span></div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic mb-2">¡Cumpleaños!</h2>
                <p className="text-xl font-bold text-slate-500 mb-10">Es el día de {selectedEvent.resource.user.name}</p>
                <button onClick={() => setShowDetailModal(false)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 h-16 rounded-2xl font-black uppercase tracking-widest">¡Genial!</button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">restaurant</span></div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic leading-none">{selectedEvent.title}</h2>
                    <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">{format(selectedEvent.start, "EEEE, d 'de' MMMM", { locale: es })}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hora</p>
                    <p className="font-bold text-lg text-slate-900 dark:text-white">{format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lugar</p>
                    <p className="font-bold text-lg text-slate-900 dark:text-white">{selectedEvent.resource?.location || 'Por definir'}</p>
                  </div>
                </div>
                <div className="pt-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Organizado por</span>
                    <span className="text-sm font-black text-primary">{selectedEvent.resource?.userName || 'Un compañero'}</span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => { handleRSVP(selectedEvent.resource.id, 'not_going'); setShowDetailModal(false); }}
                      className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 border border-slate-100 hover:bg-slate-50 transition-all"
                    >
                      No voy 🙅‍♂️
                    </button>
                    <button
                      onClick={() => { handleRSVP(selectedEvent.resource.id, 'going'); setShowDetailModal(false); }}
                      className="flex-[2] bg-primary text-white h-14 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                    >
                      Me apunto 🙋‍♂️
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
