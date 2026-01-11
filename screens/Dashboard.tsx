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
import CreateEventModal from '../src/components/CreateEventModal';
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
        });
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
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 mb-10 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative overflow-hidden group">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>
        <div className="flex items-center gap-6 relative z-10">
          <TeamSwitcher />
          <button
            onClick={() => {
              setSelectedSlot(null);
              setShowCreateModal(true);
            }}
            className="hidden md:flex bg-primary text-white h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all items-center gap-3 border-2 border-primary/20"
          >
            <span className="material-symbols-outlined text-lg font-black">add_circle</span>
            Crear Merienda
          </button>
          <div className="h-16 w-px bg-slate-100 dark:bg-slate-800 hidden lg:block mx-2"></div>
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 font-display">Estás en</h2>
            <p className="text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tighter uppercase italic">{state.team?.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 relative z-10">
          {state.team?.join_code ? (
            <div className="bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-primary/5 group/code transition-all hover:border-primary/40">
              <div className="text-center md:text-left">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-1">Invita a tu equipo</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Comparte este código para unirse</p>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-primary/10 shadow-inner">
                <code className="px-4 py-2 font-mono text-2xl font-black text-primary tracking-[0.2em]">
                  {state.team.join_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(state.team?.join_code || '');
                    setToast("¡Código copiado! Compártelo con tu equipo.");
                    setTimeout(() => setToast(null), 3000);
                  }}
                  className="h-12 px-6 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm font-black">content_copy</span>
                  Copiar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-[2.5rem] p-6 flex items-center gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando código...</span>
            </div>
          )}
          <NotificationBell />
        </div>
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

      {/* CREATE MODAL EXTRACTED */}
      <CreateEventModal
        isOpen={showCreateModal}
        selectedSlot={selectedSlot}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={(msg) => {
          setToast(msg);
          setTimeout(() => setToast(null), 5000);
          if (state.user?.id) fetchUserData(state.user.id); // Recargar datos
        }}
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
