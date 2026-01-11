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
    members: any[]; // Array de miembros para enviar emails
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
    isOpen, onClose, onEventCreated, teamId, userId, teamName, creatorName, members
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDateTime, setStartDateTime] = useState('');
    const [loading, setLoading] = useState(false);

    // Resetear formulario cuando se abre
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setLocation('');
            // Pre-rellenar con fecha actual + 1 hora
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            setStartDateTime(now.toISOString().slice(0, 16)); // Formato para input datetime-local
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDateTime) return alert("Por favor selecciona una fecha");
        setLoading(true);

        try {
            const startDate = new Date(startDateTime);
            const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 horas de duración

            // 1. Insertar Evento
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

            // 2. Enviar Email Real
            const recipients = members?.map(m => m.email).filter(Boolean) || [];
            await sendEventInvitation(event, teamName, creatorName, recipients);

            onEventCreated();
            onClose();
        } catch (err: any) {
            console.error("Error creando evento:", err);
            alert("Error al crear evento: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">🍩 Nueva Merienda</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título</label>
                        <input
                            type="text" required value={title} onChange={e => setTitle(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-300 p-2"
                            placeholder="Ej: Cumple de Ana"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha y Hora</label>
                        <input
                            type="datetime-local" required value={startDateTime} onChange={e => setStartDateTime(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-300 p-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                        <input
                            type="text" value={location} onChange={e => setLocation(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-300 p-2"
                            placeholder="Ej: Sala de Juntas / Cocina"
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Enviando...' : 'Crear e Invitar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
