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
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(''); // NEW: Location field
  const [toast, setToast] = useState<string | null>(null);

  if (loading && state.team) return <div className="p-10 h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-bold text-slate-500 uppercase tracking-widest text-xs">Cargando eventos...</div>;

  if (!state.team) return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 h-full text-center">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-4">No tienes equipo seleccionado</h2>
      <button
        onClick={() => window.location.href = '/team-setup'}
        className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
      >
        Ir a Equipos
      </button>
    </div>
  );


  const fetchDashboardData = async () => {
    if (!state.team?.id) return;
    setLoading(true);
    try {
      // 1. Fetch Events
      const { data: merendolas, error: mErr } = await supabase
        .from('events')
        .select(`
                    *,
                    profiles:created_by (display_name),
                    attendees (*)
                `)
        .eq('team_id', state.team.id);

      if (mErr) throw mErr;

      // 2. Map Merendolas to Calendar Events
      const mappedMerendolas = (merendolas || []).map(m => {
        // Soporte para ambos formatos: start_time (ISO) o date+time (Legacy)
        const startDate = m.start_time ? new Date(m.start_time) : new Date(m.date + 'T' + (m.time || '00:00:00'));
        const endDate = m.end_time ? new Date(m.end_time) : new Date(startDate.getTime() + 3600000);

        return {
          id: m.id,
          title: `🍪 ${m.title}`,
          start: startDate,
          end: endDate,
          resource: {
            type: 'merendola',
            description: m.description,
            creator: m.profiles?.display_name,
            creatorId: m.created_by,
            attendees: m.attendees || []
          }
        };
      });

      // 3. Map Team Birthdays as All-Day Events
      const birthdayEvents = (state.teamMembers || [])
        .filter(member => member.birthday)
        .map(member => {
          const today = new Date();
          const bday = new Date(member.birthday!);
          // Set birthday to current calendar year
          const eventDate = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

          return {
            id: `bday-${member.id}`,
            title: `🎂 Cumple: ${member.name}`,
            start: eventDate,
            end: eventDate,
            allDay: true,
            resource: {
              type: 'birthday',
              user: member
            }
          };
        });

      setEvents([...mappedMerendolas, ...birthdayEvents]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback for UI robustness
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [state.team?.id, state.teamMembers]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.team?.id || !state.user?.id || !selectedSlot) return;

    setCreating(true);
    try {
      const dateStr = format(selectedSlot.start, 'yyyy-MM-dd');
      const timeStr = format(selectedSlot.start, 'HH:mm:ss');

      const { error } = await supabase
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
        });

      if (error) {
        console.error('Error in Supabase insert:', error);
        alert('Error al guardar el evento: ' + error.message);
        return;
      }

      // Success flow
      const eventDataForEmail = {
        title: title,
        start_time: selectedSlot.start.toISOString(),
        location: location
      };

      const recipientEmails = state.teamMembers
        .map(m => m.notificationEmail || m.email)
        .filter(email => !!email);

      const result = await sendEventInvitation(
        eventDataForEmail,
        state.team?.name || 'Equipo',
        state.user?.name || 'Un compañero',
        recipientEmails
      );

      setToast(`📧 Invitaciones enviadas a ${result.count} miembros del equipo.`);
      setTimeout(() => setToast(null), 5000);

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setLocation('');

      fetchDashboardData();
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleRSVP = async (status: RSVPStatus) => {
    if (!selectedEvent || selectedEvent.resource.type !== 'merendola') return;

    try {
      await respondToInvite(selectedEvent.id, status);
      setToast(`Respuesta enviada: ${status === 'si' ? 'Asistiré' : 'No iré'}`);
      setTimeout(() => setToast(null), 3000);
      fetchDashboardData();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error in RSVP:', error);
    }
  };

  const eventPropGetter = (event: any) => {
    const type = event.resource?.type;
    let backgroundColor = '#3b82f6'; // Default Blue

    if (type === 'birthday') backgroundColor = '#ec4899'; // Pink
    if (type === 'merendola') backgroundColor = '#f59e0b'; // Amber

    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity: 0.8,
        color: 'white',
        border: 'none',
        display: 'block',
        fontWeight: 'bold',
        padding: '2px 5px'
      }
    };
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot(slotInfo);
    setShowCreateModal(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full p-4 md:p-8 bg-slate-50 dark:bg-slate-950 overflow-auto">
      {toast && (
        <div className="fixed top-20 right-8 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
          <span className="material-symbols-outlined font-bold">check_circle</span>
          <span className="font-bold">{toast}</span>
        </div>
      )}

      {/* Panel de Información del Equipo */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 mb-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <TeamSwitcher />
          <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden lg:block mx-2"></div>
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Panel del Equipo</h2>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{state.team?.name}</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Gestiona y organiza las meriendas de tu comunidad.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 pl-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div className="py-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Código de Invitación</p>
              <p className="text-xl font-mono font-black text-primary tracking-tighter leading-none">{state.team?.join_code}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(state.team?.join_code || '');
                setToast("Código copiado al portapapeles");
                setTimeout(() => setToast(null), 3000);
              }}
              className="h-14 px-4 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm hover:bg-primary hover:text-white transition-all group gap-2"
              title="Copiar código"
            >
              <span className="material-symbols-outlined transition-transform group-active:scale-90 text-lg">content_copy</span>
              <span className="text-xs font-black uppercase">Copiar</span>
            </button>
          </div>

          <NotificationBell />
        </div>
      </div>

      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Calendario Semanal</h1>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Merienda
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div> Cumpleaños
          </div>
        </div>
      </header>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 280px)' }}
          messages={{
            next: "Sig.",
            previous: "Ant.",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
            agenda: "Agenda",
            date: "Fecha",
            time: "Hora",
            event: "Evento"
          }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventPropGetter}
          culture='es'
        />
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black mb-6">Programar Merienda</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="mb-6">
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Título de la Merienda</label>
                <input
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl h-14 px-6 font-bold text-lg outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all mb-4"
                  placeholder="Ej: Brioches y Café"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Ubicación</label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl h-14 px-6 font-bold text-lg outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all mb-4"
                  placeholder="Ej: Sala 302, Cocina..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Descripción (Opcional)</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-6 font-medium text-sm outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                  placeholder="¿Qué traemos? ¿Alguna nota especial?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-14 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-2 h-14 px-8 rounded-2xl font-black bg-primary text-white shadow-lg shadow-primary/30 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {creating ? 'Guardando...' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            {selectedEvent.resource.type === 'merendola' ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-black pr-4">{selectedEvent.title.replace('🍪 ', '')}</h2>
                  <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-4 py-1 rounded-full text-xs font-black">MERENDOLA</div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-bold">Organiza: {selectedEvent.resource.creator}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined">calendar_today</span>
                    <span className="font-bold">{format(selectedEvent.start, "EEEE d 'de' MMMM", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined">schedule</span>
                    <span className="font-bold">{format(selectedEvent.start, 'HH:mm')}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">¿Quiénes asisten?</h3>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                    {selectedEvent.resource.attendees.length > 0 ? (
                      selectedEvent.resource.attendees.map((a: any) => {
                        const member = state.teamMembers.find(tm => tm.id === a.user_id);
                        if (a.status !== 'si') return null;
                        return (
                          <div key={a.user_id} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-800/30">
                            {member?.name || 'Usuario'}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-slate-400 text-sm italic">Nadie ha confirmado aún</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleRSVP('no')}
                    className="h-14 rounded-2xl font-black bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">cancel</span> NO IRÉ
                  </button>
                  <button
                    onClick={() => handleRSVP('si')}
                    className="h-14 rounded-2xl font-black bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">check_circle</span> ASISTIRÉ
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl">cake</span>
                </div>
                <h2 className="text-2xl font-black mb-2">¡Cumpleaños de {selectedEvent.resource.user.name}!</h2>
                <p className="text-slate-500 mb-8">No olvides felicitarle hoy 🎉</p>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full h-14 rounded-2xl font-black bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all"
                >
                  Cerrar
                </button>
              </div>
            )}
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
