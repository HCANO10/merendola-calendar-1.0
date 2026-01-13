import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
// ⚠️ VERIFICA ESTA RUTA: Si tu archivo está en src/lib, usa '../lib/supabaseClient'
import { supabase } from '../../supabaseClient';

interface Props {
    mobileClose?: () => void;
}

export const Sidebar = ({ mobileClose }: Props) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleLinkClick = () => {
        if (mobileClose) mobileClose();
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { name: 'Mi Equipo', path: '/team-setup', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        { name: 'Mi Perfil', path: '/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    ];

    return (
        // CAMBIO: Fondo Blanco (bg-white) y borde derecho sutil
        <div className="flex flex-col h-full p-4 bg-white border-r border-gray-100">

            {/* TÍTULO/HEADER */}
            <div className="mb-8 px-2 mt-2">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Navegación
                </h2>
            </div>

            {/* NAVEGACIÓN */}
            <nav className="space-y-2 flex-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={handleLinkClick}
                        className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
              ${isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' // Activo: Morado vibrante
                                : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600' // Inactivo: Gris oscuro (visible) -> Hover: Morado
                            }
            `}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* BOTÓN LOGOUT */}
            <button
                onClick={handleLogout}
                className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all font-medium border border-transparent hover:border-red-100"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Salir</span>
            </button>
        </div>
    );
};
