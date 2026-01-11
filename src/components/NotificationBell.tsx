import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { supabase } from '../../supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
    const { state, markNotificationRead } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter unread
    const unreadCount = state.notifications.filter(n => !n.readAt).length;

    // Close click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            markNotificationRead(id);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-primary transition-all shadow-sm group"
            >
                <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-2 flex justify-between items-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notificaciones</p>
                        {unreadCount > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black">
                                {unreadCount} NUEVAS
                            </span>
                        )}
                    </div>

                    <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                        {state.notifications.length > 0 ? (
                            state.notifications.slice().reverse().map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => !n.readAt && handleMarkAsRead(n.id)}
                                    className={`p-3 rounded-2xl transition-all cursor-pointer ${!n.readAt
                                        ? 'bg-primary/5 hover:bg-primary/10'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 opacity-60'}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.readAt ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <span className="material-symbols-outlined text-lg">
                                                {n.type === 'MERENDOLA_INVITE' ? 'cookie' : 'info'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1">
                                                {n.payload.title}
                                            </p>
                                            <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">
                                                {n.payload.creatorName} te ha invitado a una merienda el {format(new Date(n.payload.date), "d 'de' MMMM", { locale: es })}.
                                            </p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                {format(new Date(n.createdAt), 'PPP', { locale: es })}
                                            </p>
                                        </div>
                                        {!n.readAt && (
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center">
                                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">notifications_off</span>
                                <p className="text-sm font-bold text-slate-400">No tienes notificaciones</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-2 p-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button className="w-full p-2 text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-all">
                            Ver todo el historial
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
