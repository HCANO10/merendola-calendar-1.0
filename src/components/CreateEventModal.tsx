import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Asegúrate de que esta ruta es correcta
import { sendEventInvitation } from '../utils/emailService'; // Asegúrate de que esta ruta es correcta

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: () => void;
    teamId: string;
    userId: string;
    teamName: string;
    creatorName: string;
    members: any[];
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
    isOpen, onClose, onEventCreated, teamId, userId, teamName, creatorName, members
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDateTime, setStartDateTime] = useState('');
    const [loading, setLoading] = useState(false);

    // Inicializar fecha
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setLocation('');
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setStartDateTime(localIso);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDateTime) return alert("📅 Selecciona fecha y hora.");
        setLoading(true);

        try {
            const startDate = new Date(startDateTime);
            const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            // 1. Insertar
            const { data: event, error } = await supabase
                .from('events')
                .insert([{
                    title, description, location,
                    start_time: startDate.toISOString(),
                    end_time: endDate.toISOString(),
                    team_id: teamId, created_by: userId
                }])
                .select().single();

            if (error) throw error;

            // 2. Email (Silencioso para no bloquear)
            try {
                const recipients = members?.map(m => m.email).filter(Boolean) || [];
                await sendEventInvitation(event, teamName, creatorName, recipients);
            } catch (emailErr) {
                console.warn("No se pudo enviar email:", emailErr);
            }

            onEventCreated();
            onClose();

        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        // CAPA 1: Overlay Oscuro (Tapa el calendario)
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">

            {/* CAPA 2: El Modal (Blanco Sólido, Scrollable) */}
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* HEADER (Fijo arriba) */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        🍩 Nueva Merienda
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none">
                        &times;
                    </button>
                </div>

                {/* BODY (Scrollable si la pantalla es pequeña) */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="create-event-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* Título */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Título del Evento</label>
                            <input
                                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Ej: Cumpleaños sorpresa..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Fecha */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha y Hora</label>
                                <input
                                    type="datetime-local" required value={startDateTime} onChange={e => setStartDateTime(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* Ubicación */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Ubicación</label>
                                <input
                                    type="text" value={location} onChange={e => setLocation(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Sala B..."
                                />
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                            <textarea
                                rows={3} value={description} onChange={e => setDescription(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Detalles adicionales..."
                            />
                        </div>

                    </form>
                </div>

                {/* FOOTER (Fijo abajo) */}
                <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-end gap-3">
                    <button
                        type="button" onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit" form="create-event-form" disabled={loading}
                        className={`px-6 py-2 text-white rounded-lg font-bold shadow-md transition-all ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {loading ? 'Creando...' : 'Crear Merienda'}
                    </button>
                </div>

            </div>
        </div>
    );
};
