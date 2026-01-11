import React, { useState, useEffect } from 'react';
import { SlotInfo } from 'react-big-calendar';
import { format, addHours } from 'date-fns';
import { supabase } from '../../supabaseClient';
import { useStore } from '../../store';
import { sendEventInvitation } from '../utils/emailService';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSlot: SlotInfo | null;
    onEventCreated: (toastMsg: string) => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
    isOpen,
    onClose,
    selectedSlot,
    onEventCreated
}) => {
    const { state } = useStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [creating, setCreating] = useState(false);

    if (!isOpen) return null;

    const [startDateTime, setStartDateTime] = useState('');

    useEffect(() => {
        if (isOpen) {
            const initialDate = selectedSlot?.start || new Date();
            setStartDateTime(format(initialDate, "yyyy-MM-dd'T'HH:mm"));
        }
    }, [isOpen, selectedSlot]);

    // Default slot if none provided
    const effectiveSlot = selectedSlot || {
        start: new Date(),
        end: addHours(new Date(), 1),
        slots: [new Date()]
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!state.team?.id || !state.user?.id) return;

        setCreating(true);
        try {
            // 1. Insert event into Supabase
            // 1. Insert event into Supabase
            // Use manual date time from input
            const startTime = new Date(startDateTime);
            const endTime = addHours(startTime, 2);

            const { data: newEvent, error: insertError } = await supabase
                .from('events')
                .insert({
                    team_id: state.team.id,
                    created_by: state.user.id,
                    title: title.trim(),
                    description: description.trim(),
                    location: location.trim(),
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString()
                    // Fixed: Removed 'date' and 'time' columns which don't exist in SQL
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 2. Fetch recipients (members excluding creator)
            // We already have teamMembers in the store with unified emails
            const recipientEmails = (state.teamMembers || [])
                .map(m => m.email)
                .filter(email => !!email && email !== state.user?.email) as string[];

            // 3. Send Invitations
            if (recipientEmails.length > 0) {
                await sendEventInvitation(
                    newEvent, // Use the actual DB event reference

                    state.team.name,
                    state.user.name || 'Un compañero',
                    recipientEmails
                );
            }

            // 4. Success feedback and cleanup
            onEventCreated("¡Evento creado y notificaciones enviadas!");
            setTitle('');
            setDescription('');
            setLocation('');
            onClose();

            // Refresh to ensure full state sync
            window.location.reload();
        } catch (err: any) {
            console.error('Error in CreateEventModal:', err);
            alert('Error al crear el evento: ' + (err.message || 'Error desconocido'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            ></div>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-10 relative z-10 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic mb-8 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl font-black">celebration</span>
                    </div>
                    Nuevo Evento
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">¿Qué celebramos?</label>
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 h-16 rounded-2xl px-6 text-lg font-bold outline-none focus:border-primary transition-all"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Merendola, Pizza..."
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">¿Dónde?</label>
                        <div className="relative">
                            <input
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 h-16 rounded-2xl pl-12 pr-6 text-lg font-bold outline-none focus:border-primary transition-all"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Sala Relax, Terraza..."
                            />
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">location_on</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">¿Cuándo?</label>
                        <input
                            type="datetime-local"
                            required
                            value={startDateTime}
                            onChange={(e) => setStartDateTime(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 h-16 rounded-2xl px-6 text-lg font-bold outline-none focus:border-primary transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nota (Opcional)</label>
                        <textarea
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 text-lg font-medium outline-none focus:border-primary transition-all min-h-[100px]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="¿Algún detalle más?"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-16 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={creating || !title.trim()}
                            className="flex-[2] bg-primary text-white h-16 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                        >
                            {creating ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Lanzar Invitaciones
                                    <span className="material-symbols-outlined text-xl font-black">send</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEventModal;
