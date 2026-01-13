import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    // Estado del sidebar (abierto/cerrado)
    // En pantallas grandes empieza abierto, en móviles cerrado
    const [isOpen, setIsOpen] = useState(window.innerWidth > 768);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden w-full">

            {/* 1. SIDEBAR (Mecánica de Empuje) */}
            <aside
                className={`
          bg-slate-900 text-white flex-shrink-0
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-64' : 'w-0'} 
          border-r border-slate-800
        `}
            >
                {/* Contenedor interno con ancho fijo para evitar deformaciones del texto al cerrar */}
                <div className="w-64 h-full overflow-y-auto">
                    <Sidebar />
                </div>
            </aside>

            {/* 2. CONTENIDO PRINCIPAL (Se encoge al abrir sidebar) */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">

                {/* HEADER */}
                <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 justify-between shadow-sm z-10 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-lg text-gray-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors focus:outline-none"
                        >
                            {/* Icono Hamburguesa / X */}
                            {isOpen ? (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> // Icono siempre hamburguesa por petición, o puedes poner X
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>

                        {/* BRANDING CORREGIDO */}
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📅</span>
                            <h1 className="font-bold text-gray-800 text-xl tracking-tight">Merendola Calendar</h1>
                        </div>
                    </div>
                </header>

                {/* ZONA DE CONTENIDO (Scrollable) */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-0 relative">
                    {children}
                </main>
            </div>

        </div>
    );
};
