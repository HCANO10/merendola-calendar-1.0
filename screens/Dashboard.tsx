import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';
import MainLayout from '../src/layouts/MainLayout';
import { UI_TEXT } from '../constants';

const Dashboard: React.FC = () => {
  const { state } = useStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchEvents = async () => {
    if (!state.team?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merendolas')
        .select('*')
        .eq('team_id', state.team.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [state.team?.id]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.team?.id || !state.user?.id) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('merendolas')
        .insert({
          title,
          date,
          time,
          team_id: state.team.id,
          user_id: state.user.id
        });

      if (error) throw error;

      // Recargar para ver los cambios como solicitó el usuario
      window.location.reload();
    } catch (error) {
      console.error('Error creating event:', error);
      setCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Panel de Control</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gestiona las meriendas de <span className="text-primary font-bold">{state.team?.name}</span>
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancelar' : 'Nueva Merienda'}
          </button>
        </header>

        {showForm && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-bold mb-6">Programar Nueva Merienda</h2>
            <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-slate-400">Título</label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 h-12 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Merienda de Viernes"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-slate-400">Fecha</label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 h-12 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-slate-400">Hora (Opcional)</label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 h-12 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={creating || !title || !date}
                  className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {creating ? 'Guardando...' : 'Guardar Merienda'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">Cargando eventos...</p>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">event</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(event.date).toLocaleDateString('es-ES', { weekday: 'short' })}</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      {new Date(event.date).getDate()} {new Date(event.date).toLocaleDateString('es-ES', { month: 'short' })}
                    </p>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{event.title}</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>{event.time || 'Sin hora'}</span>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Merienda Real</span>
                  <button className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
                    Ver detalles
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-20 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl">calendar_today</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No hay meriendas programadas</h3>
            <p className="text-slate-500 max-w-sm mb-8">Organiza la primera merienda de tu equipo para empezar a disfrutar.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm hover:border-primary transition-all"
            >
              Comenzar ahora
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
