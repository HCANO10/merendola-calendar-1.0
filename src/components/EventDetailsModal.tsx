import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    event: any;         // Objeto con datos del evento, participantes y perfil del creador
    currentUserId: string;
    onDelete: (id: string) => void;
    onRSVP: (id: string, status: string) => void;
}

export const EventDetailsModal = ({ isOpen, onClose, event, currentUserId, onDelete, onRSVP }: Props) => {
    if (!isOpen || !event) return null;

    // Detectar si soy el creador para mostrar la basura
    const isCreator = event.created_by === currentUserId;

    // Extraer nombre del creador (Asumimos que viene en event.profiles.full_name o similar tras el join)
    const creatorName = event.profiles?.full_name || event.creator_name || 'Un compañero misterioso';

    // Clasificar listas
    const going = event.event_participants?.filter((p: any) => p.status === 'going') || [];
    const notGoing = event.event_participants?.filter((p: any) => p.status === 'not_going') || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* CABECERA */}
                <div className="bg-indigo-600 p-6 text-white shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">✕</button>

                    <h2 className="text-2xl font-bold leading-tight">{event.title}</h2>

                    {/* AUTORÍA (Nuevo) */}
                    <div className="flex items-center gap-2 mt-2 text-indigo-100 text-sm font-medium bg-indigo-700/50 w-fit px-2 py-1 rounded">
                        <span>👑 Organizado por {creatorName}</span>
                    </div>

                    <div className="mt-4 flex flex-col gap-1 text-indigo-100 text-sm">
                        <p>📅 {new Date(event.start_time).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
                        <p>📍 {event.location || 'Ubicación pendiente'}</p>
                    </div>
                </div>

                {/* CUERPO (Scrollable) */}
                <div className="p-6 overflow-y-auto">
                    {event.description && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-600 italic">
                            "{event.description}"
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* COLUMNA SI */}
                        <div className="border border-green-100 rounded-xl overflow-hidden">
                            <div className="bg-green-50 px-3 py-2 border-b border-green-100">
                                <h3 className="font-bold text-green-800 text-sm">✅ Van ({going.length})</h3>
                            </div>
                            <ul className="p-3 text-sm space-y-2">
                                {going.length === 0 && <li className="text-gray-400 text-xs italic">Sé el primero...</li>}
                                {going.map((p: any) => (
                                    <li key={p.user_id} className="text-gray-700 font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        {p.profiles?.full_name || p.profiles?.email || 'Usuario'}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* COLUMNA NO */}
                        <div className="border border-red-100 rounded-xl overflow-hidden">
                            <div className="bg-red-50 px-3 py-2 border-b border-red-100">
                                <h3 className="font-bold text-red-800 text-sm">❌ No van ({notGoing.length})</h3>
                            </div>
                            <ul className="p-3 text-sm space-y-2">
                                {notGoing.length === 0 && <li className="text-gray-400 text-xs italic">¡Todos disponibles!</li>}
                                {notGoing.map((p: any) => (
                                    <li key={p.user_id} className="text-gray-400 line-through decoration-red-300 decoration-2">
                                        {p.profiles?.full_name || 'Usuario'}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 shrink-0 flex justify-between items-center gap-4">
                    <div className="flex gap-2 w-full">
                        <button onClick={() => onRSVP(event.id, 'going')} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition shadow-sm">👍 ¡Voy!</button>
                        <button onClick={() => onRSVP(event.id, 'not_going')} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition shadow-sm">👎 No puedo</button>
                    </div>

                    {isCreator && (
                        <button
                            onClick={() => onDelete(event.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Borrar evento permanentemente"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
