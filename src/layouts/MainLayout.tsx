import React from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { UI_TEXT } from '../../constants';

interface MainLayoutProps {
    children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

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
            {/* MOBILE HAMBURGER BUTTON */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
            >
                <span className="material-symbols-outlined">menu</span>
            </button>

            {/* MOBILE OVERLAY BACKDROP */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
                md:translate-x-0 md:static md:flex-shrink-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-2xl">cookie</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Merendola</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Calendar</p>
                        </div>
                        {/* Close button for mobile inside drawer */}
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden ml-auto p-1 text-slate-400 hover:text-white"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsSidebarOpen(false)} // Close on navigate
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
            <div className="flex-1 overflow-auto relative flex flex-col w-full">
                <main className="flex-1 min-h-full">
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
