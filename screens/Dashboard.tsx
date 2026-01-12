import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, SlotInfo, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { supabase } from '../supabaseClient';
import { useStore } from '../store';
import { RSVPStatus } from '../types';
import TeamSwitcher from '../src/components/TeamSwitcher';
import { NotificationBell } from '../src/components/NotificationBell';
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

  // Responsive View State
  const [view, setView] = useState<View>(window.innerWidth < 768 ? Views.AGENDA : Views.MONTH);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && view !== Views.AGENDA && view !== Views.DAY) {
        setView(Views.AGENDA);
      } else if (window.innerWidth >= 768 && view === Views.AGENDA) {
        setView(Views.MONTH);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [view]);

  // Layout state
  const [toast, setToast] = useState<string | null>(null);

  // 1. AÑADIR ESTADO PARA GUARDAR MIS RESPUESTAS
  const [myRsvps, setMyRsvps] = useState<Record<string, string>>({});

  // 2. EFECTO PARA CARGAR MIS RESPUESTAS (Al montar o cambiar de equipo)
  useEffect(() => {
    if (state.user && state.team) {
      const fetchRsvps = async () => {
        const { data } = await supabase
          .from('event_participants')
          .select('event_id, status')
          .eq('user_id', state.user.id);

        if (data) {
          const rsvpMap: Record<string, string> = {};
          data.forEach((item: any) => {
            rsvpMap[item.event_id] = item.status;
          });
          setMyRsvps(rsvpMap);
        }
      };
      fetchRsvps();
    }
  }, [state.user, state.team, state.events]); // Recargar si cambian eventos

  // EFECTO: AUTO-RSVP DESDE EMAIL
  useEffect(() => {
    const handleAutoRSVP = async () => {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const eventId = params.get('eventId');
      const status = params.get('status');

      // Solo actuar si vienen todos los datos y el usuario está logueado
      if (action === 'rsvp' && eventId && status && state.user) {
        console.log("🔗 Detectado RSVP desde Email:", { eventId, status });

        // 1. Guardar en Supabase
        const { error } = await supabase
          .from('event_participants')
          .upsert({
            event_id: eventId,
            user_id: state.user.id,
            status: status
          }, { onConflict: 'event_id, user_id' });

        if (!error) {
          // 2. Feedback visual
          alert(status === 'going' ? "✅ ¡Confirmado! Nos vemos en la merienda." : "❌ Entendido, te echaremos de menos.");

          // 3. Actualizar UI localmente
          setMyRsvps(prev => ({ ...prev, [eventId]: status }));

          // 4. Limpiar URL (Quitar lo feo de la barra de direcciones)
          const newUrl = window.location.pathname;
          // @ts-ignore
          window.history.replaceState({}, '', newUrl);
        } else {
          console.error("Error Auto-RSVP:", error);
        }
      }
    };

    // Ejecutar si hay usuario (si no, el usuario hará login y al volver a Dashboard debería ejecutarse si persisten params, 
    // o si redirige auth, habría que manejarlo, pero para MVP asumimos sesión activa o redirect simple).
    if (state.user) {
      handleAutoRSVP();
    }
  }, [state.user]); // Dependencia: user (para ejecutar en cuanto cargue la sesión)

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

  const handleRSVP = async (e: React.MouseEvent | undefined, eventId: string, status: 'going' | 'not_going') => {
    if (e) {
      e.preventDefault(); // ¡STOP recarga!
      e.stopPropagation(); // ¡STOP click en la fila!
    }
    if (!state.user?.id) return;

    // A) Actualización Optimista (Visual inmediata)
    setMyRsvps(prev => ({ ...prev, [eventId]: status }));
    setToast(status === 'going' ? "¡Te has apuntado! 🙋‍♂️" : "No asistirás 🙅‍♂️");
    setTimeout(() => setToast(null), 3000);

    // B) Guardado Real en Base de Datos
    try {
      const { error } = await supabase
        .from('event_participants')
        .upsert({
          event_id: eventId,
          user_id: state.user.id,
          status: status
        }, { onConflict: 'event_id, user_id' });

      if (error) {
        console.error("Error guardando RSVP:", error);
        alert("Hubo un error al guardar tu respuesta.");
      } else {
        fetchUserData(state.user.id); // Refresh global data silently
      }
    } catch (err) {
      console.error("Error in RSVP:", err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("¿Seguro que quieres cancelar este evento? Se borrará para todos.")) return;

    // 1. Borrar de Supabase
    const { error } = await supabase.from('events').delete().eq('id', eventId);

    if (error) {
      alert("Error al borrar: " + error.message);
    } else {
      // 2. Actualizar estado local (Reload simple)
      window.location.reload();
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

          {/* COMPONENTE VISUAL DE CÓDIGO DE EQUIPO */}
          <div className="mt-2 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Código de Invitación:</span>
            <code className="text-sm font-mono font-bold text-indigo-800 tracking-wide">
              {state.team?.join_code || 'Generando...'}
            </code>
            <button
              onClick={() => {
                if (state.team?.join_code) {
                  navigator.clipboard.writeText(state.team.join_code);
                  alert("✅ Código copiado: " + state.team.join_code);
                }
              }}
              className="p-1 hover:bg-indigo-200 rounded text-indigo-600 transition-colors"
              title="Copiar código"
            >
              {/* Icono Copiar */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* CAMPANA DE NOTIFICACIONES */}
          {state.user?.id && <NotificationBell userId={state.user.id} />}

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
          >
            <span>🍩</span> Crear Merienda
          </button>
        </div>
      </div>

      {/* Calendar Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[3rem] p-4 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl min-h-[500px] md:min-h-[700px] relative overflow-hidden">
        <style>{`
          .rbc-toolbar { flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 20px; }
          .rbc-toolbar-label { width: 100%; text-align: center; font-weight: 800; font-size: 1.2rem; order: -1; margin-bottom: 10px; }
          
          @media (min-width: 768px) {
             .rbc-toolbar-label { width: auto; order: 0; margin-bottom: 0; }
          }

          /* MOVILE SPECIFIC FIXES (REQUESTED) */
          @media (max-width: 768px) {
            .rbc-toolbar {
              flex-direction: column;
              gap: 10px;
              font-size: 12px;
            }
            .rbc-toolbar-label {
              margin: 5px 0;
              font-weight: bold;
              font-size: 16px;
            }
          }
        `}</style>
        <Calendar
          localizer={localizer}
          culture='es' // <--- CRÍTICO: Activa el formato de fecha español
          events={allEvents}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          style={{ height: 'calc(100vh - 200px)', borderRadius: '1.5rem', fontFamily: 'inherit' }}
          messages={{
            allDay: 'Todo el día',
            previous: 'Anterior',
            next: 'Siguiente',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'Sin meriendas en este rango.',
            showMore: total => `+ Ver más (${total})`
          }}
          formats={{
            dayHeaderFormat: (date: Date) => format(date, 'EEEE d MMMM', { locale: es }),
            monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: es })
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

      {/* MIS INVITACIONES - SECTION REPLACEMENT */}
      <div className="mt-8 bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl mb-24">
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <span className="text-2xl">💌</span> Mis Invitaciones
        </h3>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(!state.events || state.events.length === 0) ? (
            <p className="p-6 text-center text-gray-400 text-sm font-medium italic">No hay eventos próximos.</p>
          ) : (
            state.events.map((event: any) => {
              const myStatus = myRsvps[event.id] || 'pending'; // Estado actual

              return (
                <div key={event.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-xl">

                  {/* Info Evento */}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                      {event.title}
                      {state.user?.id === event.created_by && (
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                          title="Borrar evento"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <span>📅 {new Date(event.start_time).toLocaleString()}</span>
                      <span className="hidden md:inline">|</span>
                      <span>📍 {event.location || 'Sin ubicación'}</span>
                    </p>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center gap-3">

                    {/* Botón ASISTIRÉ */}
                    <button
                      onClick={(e) => handleRSVP(e, event.id, 'going')}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 shadow-sm
                            ${myStatus === 'going'
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-600'
                        }`}
                    >
                      {myStatus === 'going' && <span>✓</span>} Asistiré
                    </button>

                    {/* Botón NO IRÉ */}
                    <button
                      onClick={(e) => handleRSVP(e, event.id, 'not_going')}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 shadow-sm
                            ${myStatus === 'not_going'
                          ? 'bg-red-100 text-red-700 ring-2 ring-red-500 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600'
                        }`}
                    >
                      {myStatus === 'not_going' && <span>✕</span>} No iré
                    </button>

                  </div>
                </div>
              );
            })
          )}
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
                      onClick={() => { handleRSVP(undefined, selectedEvent.resource.id, 'not_going'); setShowDetailModal(false); }}
                      className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 border border-slate-100 hover:bg-slate-50 transition-all"
                    >
                      No voy 🙅‍♂️
                    </button>
                    <button
                      onClick={() => { handleRSVP(undefined, selectedEvent.resource.id, 'going'); setShowDetailModal(false); }}
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
