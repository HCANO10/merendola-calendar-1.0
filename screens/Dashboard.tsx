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
  const { state, respondToInvite } = useStore();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.team?.id || !state.user?.id || !selectedSlot) return;

    setCreating(true);
    try {
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          team_id: state.team.id,
          created_by: state.user.id,
          title: title,
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
          date: format(selectedSlot.start, 'yyyy-MM-dd'),
          time: format(selectedSlot.start, 'HH:mm:ss'),
          description: description,
          location: location
        })
        .select()
        .single();

      if (error) throw error;

      const recipientEmails = (state.teamMembers || [])
        .map(m => m.notificationEmail || m.email)
        .filter(email => !!email) as string[];

      await sendEventInvitation(
        { title, start_time: selectedSlot.start.toISOString(), location },
        state.team.name,
        state.user.name || 'Un compañero',
        recipientEmails
      );

      setToast("¡Evento creado y notificaciones enviadas!");
      setTimeout(() => setToast(null), 5000);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setLocation('');

      // Full refresh to ensure clean state
      window.location.reload();
    } catch (err: any) {
      console.error('Error creating event:', err);
      alert('Error al crear el evento: ' + (err.message || 'Error desconocido'));
    } finally {
      setCreating(false);
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot(slotInfo);
    setShowCreateModal(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
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
          <div className="h-16 w-px bg-slate-100 dark:bg-slate-800 hidden lg:block mx-2"></div>
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 font-display">Estás en</h2>
            <p className="text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tighter uppercase italic">{state.team?.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
          {state.team?.join_code && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-2 pl-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm">
              <div className="py-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Código de Invitación</p>
                <p className="text-3xl font-mono font-black text-primary tracking-tighter leading-none">{state.team.join_code}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(state.team?.join_code || '');
                  setToast("Código copiado al portapapeles");
                  setTimeout(() => setToast(null), 3000);
                }}
                className="h-16 px-6 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-all group gap-3 border border-slate-100 dark:border-slate-700"
              >
                <span className="material-symbols-outlined text-2xl font-black">content_copy</span>
              </button>
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

      {/* CREATE MODAL */}
      {showCreateModal && selectedSlot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowCreateModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-10 relative z-10 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic mb-8 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">celebration</span>
              </div>
              Nuevo Evento
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">¿Qué celebramos?</label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 h-16 rounded-2xl px-6 text-lg font-bold outline-none focus:border-primary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Merendola, Pizza..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">¿Dónde?</label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 h-16 rounded-2xl px-6 text-lg font-bold outline-none focus:border-primary"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Sala Relax, Terraza..."
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-100">Cancelar</button>
                <button type="submit" disabled={creating || !title.trim()} className="flex-[2] bg-primary text-white h-16 rounded-2xl font-black uppercase tracking-widest">
                  {creating ? 'Guardando...' : 'Lanzar Invitaciones'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <button onClick={async () => { await respondToInvite(selectedEvent.resource.id, 'no'); setShowDetailModal(false); }} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] tracking-widest text-red-500 border border-red-100">No puedo</button>
                    <button onClick={async () => { await respondToInvite(selectedEvent.resource.id, 'si'); setShowDetailModal(false); }} className="flex-[2] bg-primary text-white h-14 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">¡Asistiré!</button>
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
