import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { sendEventInvitation } from '../utils/emailService';

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

    // Inicialización segura al abrir
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setLocation('');
            // Fecha por defecto: Hoy + 1 hora, redondeada
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            // Ajuste de zona horaria local para el input
            const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setStartDateTime(localIso);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDateTime) return alert("📅 Por favor, selecciona una fecha y hora.");

        setLoading(true);

        try {
            const startDate = new Date(startDateTime);
            const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 horas de duración fija

            // 1. Guardar en Base de Datos
            const { data: event, error } = await supabase
                .from('events')
                .insert([{
                    title,
                    description,
                    location,
                    start_time: startDate.toISOString(),
                    end_time: endDate.toISOString(),
                    team_id: teamId,
                    created_by: userId
                }])
                .select()
                .single();

            if (error) throw error;

            // 2. Enviar Invitaciones Reales (No bloqueante)
            try {
                const recipients = members?.map(m => m.email).filter(Boolean) || [];
                console.log("📧 Enviando invitaciones a:", recipients);
                await sendEventInvitation(event, teamName, creatorName, recipients);
            } catch (emailErr) {
                console.error("El evento se creó, pero el email falló:", emailErr);
                alert("Evento creado ✅. (Nota: No se pudo enviar el email automático).");
            }

            // 3. Cerrar y Refrescar (Siempre, porque el evento SÍ se creó)
            onEventCreated();
            onClose();

        } catch (err: any) {
            console.error("Error creando evento:", err);
            alert("❌ Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-gray-900 bg-opacity-90 backdrop-blur-sm transition-all">
            <div className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all border border-gray-100">

                {/* HEADER */}
                <div className="bg-white px-8 py-6 flex justify-between items-center border-b border-gray-100">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                            <span className="text-3xl">🍩</span>
                            Nueva Merienda
                        </h2>
                        <p className="text-sm font-medium text-gray-500 mt-1">Organiza un evento para tu equipo</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* BODY */}
                <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">

                    {/* TÍTULO */}
                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Título del Evento</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-4 text-lg font-bold transition-all placeholder:text-gray-400"
                            placeholder="Ej: Cumpleaños de..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* FECHA Y HORA */}
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Fecha y Hora</label>
                            <input
                                type="datetime-local"
                                required
                                value={startDateTime}
                                onChange={e => setStartDateTime(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-3.5 font-medium"
                            />
                        </div>

                        {/* UBICACIÓN */}
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Ubicación</label>
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-3.5 font-medium placeholder:text-gray-400"
                                placeholder="Sala, Planta 2..."
                            />
                        </div>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Notas Adicionales</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-3.5 font-medium resize-none placeholder:text-gray-400"
                            placeholder="Detalles extra, que traer..."
                        />
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3.5 text-sm font-bold text-gray-500 bg-transparent hover:bg-gray-50 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`
                                flex items-center gap-3 px-8 py-3.5 text-sm font-bold text-white rounded-xl shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95
                                ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
                            `}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creando...
                                </>
                            ) : (
                                <>
                                    Crear Evento 🚀
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
