
import React, { useState, useMemo } from 'react';
import MainLayout from '../layouts/MainLayout';
import { useStore } from '../store';
import { UI_TEXT } from '../constants';
import { RSVPStatus, Snack } from '../types';

/**
 * Componente interno para el Calendario Mensual
 */
const MonthCalendar: React.FC<{
  viewDate: Date;
  events: Snack[];
  onMonthChange: (offset: number) => void;
  onSelectEvent: (id: string) => void;
  onToday: () => void;
}> = ({ viewDate, events, onMonthChange, onSelectEvent, onToday }) => {
  const monthName = viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // First day of month (0=Sun, 1=Mon, ...)
    const firstDayDate = new Date(year, month, 1);
    const firstDayOfMonth = firstDayDate.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Adjust for Monday start (0=Mon, 1=Tue, ..., 6=Sun)
    const padding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const days = [];
    // Padding for previous month
    for (let i = 0; i < padding; i++) {
      days.push({ day: null, date: null, snacks: [] });
    }
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      // Format YYYY-MM-DD manually to match store format
      const dateObj = new Date(year, month, i);
      const dateStr = [
        dateObj.getFullYear(),
        String(dateObj.getMonth() + 1).padStart(2, '0'),
        String(dateObj.getDate()).padStart(2, '0')
      ].join('-');

      const snacksOnDay = events.filter(s => s.date === dateStr);
      days.push({ day: i, date: dateStr, snacks: snacksOnDay });
    }

    return days;
  }, [viewDate, events]);

  return (
    <div className="bg-white dark:bg-[#1a262f] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
      {/* Header del Calendario */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-bold capitalize">{monthName}</h3>
        <div className="flex bg-slate-50 dark:bg-black/20 rounded-lg p-1">
          <button onClick={() => onMonthChange(-1)} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors shadow-sm">
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button onClick={onToday} className="px-3 text-[10px] font-black uppercase hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors">Hoy</button>
          <button onClick={() => onMonthChange(1)} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors shadow-sm">
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/5">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
          <div key={day} className="py-2 text-center text-[10px] font-black uppercase text-slate-400">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr flex-1">
        {calendarDays.map((item, idx) => (
          <div
            key={idx}
            className={`min-h-[80px] p-1 border-r border-b border-slate-50 dark:border-white/5 transition-colors ${!item.day ? 'bg-slate-50/30 dark:bg-white/[0.02]' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
          >
            {item.day && (
              <>
                <div className="flex justify-center mb-1">
                  <span className={`text-xs font-bold leading-none w-6 h-6 flex items-center justify-center rounded-full ${item.date === new Date().toISOString().split('T')[0]
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-slate-500'
                    }`}>
                    {item.day}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {item.snacks?.map(snack => (
                    <button
                      key={snack.id}
                      onClick={() => onSelectEvent(snack.id)}
                      className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-1 rounded-[4px] text-left truncate hover:bg-primary/20 transition-all border border-transparent hover:border-primary/20 w-full"
                      title={snack.eventTitle}
                    >
                      {snack.eventTitle}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Dashboard principal
 */
const Dashboard: React.FC = () => {
  const { state, addSnack, deleteSnack, respondToInvite } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedSnackId, setSelectedSnackId] = useState<string | null>(null);

  // Estado del calendario mensual
  const [viewDate, setViewDate] = useState(new Date());

  const [newSnack, setNewSnack] = useState({
    eventTitle: '',
    contribution: '',
    date: new Date().toISOString().split('T')[0],
    time: '17:00',
    description: ''
  });

  const unreadNotifications = useMemo(() =>
    state.notifications.filter(n => !n.readAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.notifications]);

  // 1. Month Merendolas: Filtrar por mes visible para el Calendario
  const monthMerendolas = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    return state.snacks.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [state.snacks, viewDate]);

  // 2. Upcoming Merendolas: Próximos 14 días
  const upcomingMerendolas = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Copia el array y ordena por fecha
    return state.snacks
      .filter(s => {
        const d = new Date(s.date);
        // Reset hours for comparison to handle today correctly
        const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        const diffTime = dDate.getTime() - today.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        return diffDays >= 0 && diffDays <= 14;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [state.snacks]);


  const handleAddSnack = () => {
    if (!newSnack.eventTitle || !newSnack.contribution) return;
    addSnack(newSnack);
    setShowModal(false);
    setNewSnack({
      eventTitle: '',
      contribution: '',
      date: new Date().toISOString().split('T')[0],
      time: '17:00',
      description: ''
    });
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const getAttendeesByStatus = (snackId: string) => {
    const statuses: Record<RSVPStatus, any[]> = { si: [], no: [], pendiente: [] };

    state.teamMembers.forEach(member => {
      const invite = state.invites.find(i => i.merendolaId === snackId && i.userId === member.id);
      const status = invite ? invite.status : 'pendiente';
      statuses[status].push(member);
    });

    if (state.user && !state.teamMembers.find(m => m.id === state.user!.id)) {
      const myInvite = state.invites.find(i => i.merendolaId === snackId && i.userId === state.user!.id);
      const myStatus = myInvite ? myInvite.status : 'pendiente';
      statuses[myStatus].push(state.user);
    }

    return statuses;
  };

  return (
    <MainLayout>
      <div className="flex flex-col min-h-full">
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a262f] px-6 md:px-10 py-4 sticky top-0 z-40">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">cookie</span>
              Panel de Control
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{state.team?.name}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors relative"
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a262f]">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a262f] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h4 className="font-bold text-sm">{UI_TEXT.DASHBOARD.NOTIFICATIONS.TITLE}</h4>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {unreadNotifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-xs text-slate-400 font-medium">{UI_TEXT.DASHBOARD.NOTIFICATIONS.EMPTY}</p>
                      </div>
                    ) : (
                      unreadNotifications.map(n => (
                        <div key={n.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-50 dark:border-white/5 transition-colors">
                          <p className="text-xs font-bold text-primary mb-1">{n.payload.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {UI_TEXT.DASHBOARD.NOTIFICATIONS.INVITE_MSG(n.payload.creatorName)}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => { respondToInvite(n.payload.merendolaId, 'si'); setShowNotifications(false); }}
                              className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                            >
                              {UI_TEXT.DASHBOARD.NOTIFICATIONS.ACCEPT}
                            </button>
                            <button
                              onClick={() => respondToInvite(n.payload.merendolaId, 'no')}
                              className="bg-slate-100 dark:bg-white/10 text-[10px] font-bold px-3 py-1.5 rounded-lg"
                            >
                              {UI_TEXT.DASHBOARD.NOTIFICATIONS.REJECT}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span className="hidden xs:inline">{UI_TEXT.DASHBOARD.ADD_SNACK}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {!state.user?.birthday || !state.user?.notificationEmail ? (
            <div className="lg:col-span-12 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500">warning</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    Tu perfil está incompleto
                  </p>
                  <p className="text-sm text-amber-700">
                    Completa tu perfil (cumpleaños y email) para acceder al calendario y ver los eventos.
                  </p>
                </div>
                <a href="/profile" className="ml-auto text-sm font-bold text-amber-800 underline hover:text-amber-900">
                  Ir al Perfil
                </a>
              </div>
            </div>
          ) : null}

          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Calendario de Equipo
              </h2>
            </div>
            <div className="flex-1 min-h-[500px]">
              <MonthCalendar
                viewDate={viewDate}
                events={monthMerendolas}
                onMonthChange={changeMonth}
                onToday={() => setViewDate(new Date())}
                onSelectEvent={setSelectedSnackId}
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">upcoming</span>
              Próximas citas
            </h2>

            <div className="space-y-3">
              {upcomingMerendolas.length === 0 ? (
                <div className="bg-white dark:bg-[#1a262f] p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-slate-400 text-sm font-medium">No hay eventos próximos (14 días).</p>
                </div>
              ) : (
                upcomingMerendolas.map(snack => (
                  <div key={snack.id} className="bg-white dark:bg-[#1a262f] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex gap-3 relative group">
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary rounded-l-xl"></div>
                    <div className="bg-slate-50 dark:bg-white/5 min-w-[50px] rounded-lg flex flex-col items-center justify-center p-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{new Date(snack.date).toLocaleString('es-ES', { month: 'short' })}</span>
                      <span className="text-lg font-black text-slate-700 dark:text-slate-200 leading-none">{new Date(snack.date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate" title={snack.eventTitle}>{snack.eventTitle}</h4>
                      <p className="text-xs text-slate-500 mb-2 truncate">{snack.userName}</p>
                      <button
                        onClick={() => setSelectedSnackId(snack.id)}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Ver detalles
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        {/* Snack Details Modal */}
        {selectedSnackId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a262f] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              {state.snacks.find(s => s.id === selectedSnackId) && (
                <>
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold">{state.snacks.find(s => s.id === selectedSnackId)?.eventTitle}</h3>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                        {state.snacks.find(s => s.id === selectedSnackId)?.date} a las {state.snacks.find(s => s.id === selectedSnackId)?.time}
                      </p>
                    </div>
                    <button onClick={() => setSelectedSnackId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="mb-6">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{UI_TEXT.DASHBOARD.ATTENDEES.TITLE}</h4>
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(getAttendeesByStatus(selectedSnackId)).map(([status, members]) => (
                          <div key={status} className="flex flex-col gap-2">
                            <p className="text-[10px] font-bold text-slate-400 capitalize">{status === 'si' ? 'Asisten' : status === 'no' ? 'No asisten' : 'Pendientes'}</p>
                            <div className="flex -space-x-2">
                              {members.map(m => (
                                <img key={m.id} src={m.avatar || `https://i.pravatar.cc/150?u=${m.id}`} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1a262f] object-cover" title={m.name} alt={m.name} />
                              ))}
                              {members.length === 0 && <span className="text-[10px] text-slate-300 italic">Nadie</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl mb-6">
                      <p className="text-xs font-bold mb-1">Trae: <span className="text-primary">{state.snacks.find(s => s.id === selectedSnackId)?.contribution}</span></p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{state.snacks.find(s => s.id === selectedSnackId)?.description}</p>
                    </div>

                    {/* Botones de Asistencia */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-black/20 rounded-xl">
                      <button
                        onClick={() => respondToInvite(selectedSnackId, 'si')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all ${state.invites.find(i => i.merendolaId === selectedSnackId && i.userId === state.user?.id)?.status === 'si'
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                          : 'hover:bg-white dark:hover:bg-white/10 text-slate-500'
                          }`}
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Asistiré
                      </button>
                      <button
                        onClick={() => respondToInvite(selectedSnackId, 'no')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all ${state.invites.find(i => i.merendolaId === selectedSnackId && i.userId === state.user?.id)?.status === 'no'
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-500/20'
                          : 'hover:bg-white dark:hover:bg-white/10 text-slate-500'
                          }`}
                      >
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        No asistiré
                      </button>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50/50 dark:bg-black/10 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      {state.snacks.find(s => s.id === selectedSnackId)?.userId === state.user?.id && (
                        <button
                          onClick={() => { deleteSnack(selectedSnackId); setSelectedSnackId(null); }}
                          className="text-red-500 text-xs font-bold px-4 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          {UI_TEXT.DASHBOARD.DELETE}
                        </button>
                      )}
                    </div>
                    <button onClick={() => setSelectedSnackId(null)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-2 rounded-xl text-sm font-bold shadow-sm">Cerrar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Snack Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a262f] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">{UI_TEXT.DASHBOARD.ADD_SNACK}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase text-slate-400">{UI_TEXT.DASHBOARD.EVENT_TITLE}</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-12 px-4 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={newSnack.eventTitle}
                    onChange={(e) => setNewSnack({ ...newSnack, eventTitle: e.target.value })}
                    placeholder="Ej: Merienda de Viernes"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black uppercase text-slate-400">{UI_TEXT.DASHBOARD.DATE}</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-12 px-4 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      value={newSnack.date}
                      onChange={(e) => setNewSnack({ ...newSnack, date: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black uppercase text-slate-400">{UI_TEXT.DASHBOARD.TIME}</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-12 px-4 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      value={newSnack.time}
                      onChange={(e) => setNewSnack({ ...newSnack, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase text-slate-400">{UI_TEXT.DASHBOARD.CONTRIBUTION}</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101a22] h-12 px-4 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={newSnack.contribution}
                    onChange={(e) => setNewSnack({ ...newSnack, contribution: e.target.value })}
                    placeholder="Ej: Empanada y refrescos"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-black/10 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                <button
                  onClick={handleAddSnack}
                  disabled={!newSnack.eventTitle || !newSnack.contribution}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {UI_TEXT.DASHBOARD.SAVE}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;

