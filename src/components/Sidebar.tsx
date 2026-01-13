import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const Sidebar = ({ mobileClose }: { mobileClose?: () => void }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            // No necesitamos navigate('/') forzado porque App.tsx detectará el cambio de sesión
            // pero por seguridad lo dejamos:
            navigate('/');
        } catch (error) {
            console.error("Error al salir:", error);
            navigate('/'); // Forzar salida visual aunque falle API
        }
    };

    const links = [
        { name: 'Dashboard', path: '/dashboard', icon: '🏠' },
        { name: 'Mi Equipo', path: '/team-setup', icon: '👥' },
        { name: 'Perfil', path: '/profile', icon: '👤' },
    ];

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200 text-gray-700">
            <div className="p-6 font-bold text-gray-400 uppercase text-xs tracking-wider">Menú</div>
            <nav className="flex-1 px-4 space-y-2">
                {links.map(link => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={mobileClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'
                            }`
                        }
                    >
                        <span className="text-xl">{link.icon}</span>
                        <span>{link.name}</span>
                    </NavLink>
                ))}
            </nav>
            <button onClick={handleLogout} className="m-4 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors font-medium">
                <span>🚪</span> Salir
            </button>
        </div>
    );
};
