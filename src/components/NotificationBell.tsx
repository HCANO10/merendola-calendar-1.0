import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export const NotificationBell = ({ userId }: { userId: string }) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cargar inicial + Realtime
    useEffect(() => {
        const fetchNotifs = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (data) setNotifications(data);
        };
        fetchNotifs();

        // Suscripción a eventos INSERT (Nuevas notificaciones en vivo)
        const subscription = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, [userId]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Lógica de apertura y "Marcar como leído"
    const handleOpen = async () => {
        if (!isOpen) {
            setIsOpen(true);
            // Identificar no leídas
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);

            if (unreadIds.length > 0) {
                // Actualizar en BD silenciosamente
                await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);

                // Efecto visual: Mantenerlas como "nuevas" 2 segundos y luego apagarlas
                setTimeout(() => {
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                }, 2000);
            }
        } else {
            setIsOpen(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="relative z-40" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className="relative p-2 text-gray-500 hover:text-indigo-600 transition-all transform hover:scale-105 focus:outline-none"
                title="Notificaciones"
            >
                {/* Icono Campana */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* BADGE CHIQUITITO */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-white">
                        <span className="text-[10px] font-bold text-white leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* DROPDOWN */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animation-fade-in-down origin-top-right">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-800">Notificaciones</h3>
                        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Últimas 24h</span>
                    </div>

                    <div className="max-h-[24rem] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-8 px-4 text-center">
                                <p className="text-2xl mb-2">😴</p>
                                <p className="text-sm text-gray-500">Todo al día.</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`p-4 border-b border-gray-50 transition-colors hover:bg-gray-50
                    ${notif.is_read
                                            ? 'bg-white opacity-70 grayscale-[0.5]' /* LEÍDO: Apagado */
                                            : 'bg-indigo-50/40 border-l-4 border-indigo-500' /* NO LEÍDO: Destacado */
                                        }
                  `}
                                >
                                    <p className={`text-sm ${notif.is_read ? 'font-medium text-gray-600' : 'font-bold text-gray-900'}`}>
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notif.message}</p>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                                        <span>🕒 {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
