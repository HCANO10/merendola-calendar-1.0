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

            // 2. Enviar Invitaciones Reales
            const recipients = members?.map(m => m.email).filter(Boolean) || [];
            console.log("📧 Enviando invitaciones a:", recipients);

            await sendEventInvitation(event, teamName, creatorName, recipients);

            // 3. Cerrar y Refrescar
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60 transition-all">
            <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">

                {/* HEADER CON GRADIANT */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {/* Icono Donut SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Organizar Merienda
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* BODY */}
                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">

                    {/* TÍTULO */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">¿Qué vamos a celebrar?</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400 text-lg">🎉</span>
                            </div>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="pl-10 block w-full rounded-lg border-gray-300 bg-gray-50 border focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm transition"
                                placeholder="Ej: Cumpleaños de Alex, Viernes de Pizza..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* FECHA Y HORA */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">¿Cuándo?</label>
                            <div className="relative">
                                <input
                                    type="datetime-local"
                                    required
                                    value={startDateTime}
                                    onChange={e => setStartDateTime(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 bg-gray-50 border focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm"
                                />
                            </div>
                        </div>

                        {/* UBICACIÓN */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">¿Dónde?</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400">📍</span>
                                </div>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    className="pl-10 block w-full rounded-lg border-gray-300 bg-gray-50 border focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm"
                                    placeholder="Ej: Cocina, Sala B..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Detalles Extra</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="block w-full rounded-lg border-gray-300 bg-gray-50 border focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm resize-none"
                            placeholder="¿Hay que traer algo? ¿Hay opciones veganas?..."
                        />
                    </div>

                </form>

                {/* FOOTER */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`
              flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-all
              ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}
            `}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Enviando avisos...
                            </>
                        ) : (
                            <>
                                <span>🚀</span> Crear Merienda
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
