import React from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UI_TEXT } from '../constants';

interface MainLayoutProps {
    children?: React.ReactNode;
}

/**
 * MainLayout provides a consistent shell for the application,
 * including a sidebar navigation and session management.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const location = useLocation();

    const handleLogout = async () => {
        try {
            // 1. Intentar cerrar sesión en Supabase
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        } finally {
            // 2. FUERZA BRUTA: Limpiar almacenamiento local y recargar navegador
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
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-[#1a262f] border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen overflow-hidden">
                {/* Brand */}
                <div className="p-8 flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30">
                        <span className="material-symbols-outlined text-2xl">calendar_today</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter leading-none">{UI_TEXT.APP_NAME}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Management Tool</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                `group flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 ${isActive
                                    ? 'bg-primary text-white shadow-2xl shadow-primary/40 scale-[1.02]'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:translate-x-1'
                                }`
                            }
                        >
                            <span className={`material-symbols-outlined text-2xl transition-transform duration-300 group-hover:scale-110`}>
                                {link.icon}
                            </span>
                            <span className="text-base tracking-tight">{link.name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User / Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-5 py-4 text-red-500 font-bold rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300 group"
                    >
                        <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">logout</span>
                        <span className="text-base">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
                {/* Mobile Top Bar */}
                <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1a262f] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-xl">calendar_today</span>
                        </div>
                        <span className="font-black text-lg tracking-tighter">{UI_TEXT.APP_NAME}</span>
                    </div>
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500">
                        <span className="material-symbols-outlined text-2xl">menu</span>
                    </button>
                </header>

                {/* Content View */}
                <main className="flex-1 overflow-x-hidden">
                    <div className="max-w-[1400px] mx-auto min-h-full">
                        {children || <Outlet />}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
