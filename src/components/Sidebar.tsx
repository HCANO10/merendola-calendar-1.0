import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const Sidebar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const navItems = [
        // CAMBIO AQUÍ: Dashboard -> Calendarios
        { name: 'Calendarios', path: '/dashboard', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { name: 'Mi Equipo', path: '/team-setup', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        { name: 'Mi Perfil', path: '/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    ];

    return (
        <div className="flex flex-col h-full p-4 bg-slate-900">

            <div className="mb-6 px-4 mt-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Navegación
                </span>
            </div>

            <nav className="space-y-2 flex-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
              ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 translate-x-1'
                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                            }
            `}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <button
                onClick={handleLogout}
                className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all font-medium border border-transparent"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Cerrar Sesión</span>
            </button>
        </div>
    );
};
