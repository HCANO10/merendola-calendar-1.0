import React from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { UI_TEXT } from '../../constants';

interface MainLayoutProps {
    children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const location = useLocation();

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
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-900 text-white z-50">
                <div className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-2xl">cookie</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Merendola</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Calendar</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                `flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <span className="material-symbols-outlined">{link.icon}</span>
                            <span className="text-sm">{link.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 py-3 text-red-400 font-bold rounded-xl hover:bg-red-400/10 transition-all group"
                    >
                        <span className="material-symbols-outlined transition-transform group-hover:rotate-12">logout</span>
                        <span className="text-sm">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto relative flex flex-col">
                <main className="flex-1 min-h-full">
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
