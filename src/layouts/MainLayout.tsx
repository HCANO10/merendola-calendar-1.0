import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar'; // Asegúrate de que Sidebar se adapte al contenedor

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

            {/* 1. HEADER GLOBAL (Siempre visible) */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 justify-between shadow-sm z-30 flex-shrink-0">
                <div className="flex items-center gap-4">
                    {/* Botón Hamburguesa */}
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-indigo-600 focus:outline-none transition-colors"
                        title={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Logo / Título */}
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🍪</span>
                        <h1 className="font-bold text-gray-800 text-lg tracking-tight">Merendola Calendar</h1>
                    </div>
                </div>

                {/* (Opcional) Avatar o Info de usuario a la derecha */}
                <div className="text-sm font-medium text-gray-500">
                    {/* Aquí podrías poner el avatar del usuario si quisieras */}
                </div>
            </header>

            {/* 2. CUERPO PRINCIPAL (Sidebar + Contenido) */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* SIDEBAR (Estilo Push) */}
                <aside
                    className={`
            bg-[#0f172a] text-white flex-shrink-0
            transition-all duration-300 ease-in-out overflow-hidden
            ${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'}
          `}
                >
                    {/* Contenedor interno con ancho fijo para evitar deformaciones al cerrar */}
                    <div className="w-64 h-full flex flex-col border-r border-gray-800">
                        {/* Pasamos mobileClose aunque aquí no es estrictamente necesario cerrar al clickar, 
                 pero mantenemos la compatibilidad con el componente Sidebar existente */}
                        <Sidebar mobileClose={() => window.innerWidth < 768 && setSidebarOpen(false)} />
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL (Se ajusta al espacio restante) */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 relative custom-scrollbar">
                    {/* Capa de seguridad para móviles: Si está abierto en móvil, oscurecer el fondo para enfocar */}
                    {isSidebarOpen && (
                        <div
                            className="md:hidden absolute inset-0 bg-black/20 z-10 backdrop-blur-[1px]"
                            onClick={() => setSidebarOpen(false)}
                        ></div>
                    )}

                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
};
