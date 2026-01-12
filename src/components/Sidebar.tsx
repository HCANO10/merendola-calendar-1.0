import React from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

interface SidebarProps {
    mobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileClose }) => {
    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            localStorage.clear();
            window.location.href = '/';
        }
    };

    const navLinks = [
        { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
        { name: 'Mi Perfil', path: '/profile', icon: 'account_circle' },
        { name: 'Mi Equipo', path: '/team-setup', icon: 'group' },
    ];

    return (
        <div className="flex flex-col min-h-full p-4">
            {/* Logo Section */}
            <div className="mb-8 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                        <span className="material-symbols-outlined text-2xl">cookie</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">Merendola</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Calendar</p>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1 flex-1">
                {navLinks.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={mobileClose}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">{link.icon}</span>
                        <span className="text-sm">{link.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Logout Button */}
            <div className="mt-8 pt-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-3 text-red-400 font-bold rounded-xl hover:bg-red-400/10 transition-all group"
                >
                    <span className="material-symbols-outlined transition-transform group-hover:rotate-12">logout</span>
                    <span className="text-sm">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
};
