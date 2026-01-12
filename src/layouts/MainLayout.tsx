import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar'; // Tu componente Sidebar actual

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        // CONTENEDOR FLEX PRINCIPAL (Ocupa toda la pantalla)
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            {/* 1. OVERLAY MÓVIL (Sombra oscura al abrir menú) - Solo visible en móvil si está abierto */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* 2. SIDEBAR HÍBRIDA */}
            {/* MÓVIL: 'fixed' (Flota sobre todo), oculta a la izquierda (-translate-x-full).
          DESKTOP: 'md:relative' (Ocupa espacio real), siempre visible (translate-x-0).
      */}
            <aside
                className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-white transition-transform duration-300 ease-in-out shadow-2xl flex flex-col
          md:relative md:translate-x-0 md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                {/* Botón Cerrar (Solo visible en Móvil dentro de la sidebar) */}
                <div className="md:hidden flex justify-end p-4 border-b border-gray-700">
                    <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Renderizamos el contenido de la Sidebar */}
                {/* Pasamos mobileClose para que los enlaces cierren el menú en móvil */}
                <div className="flex-1 overflow-y-auto">
                    <Sidebar mobileClose={() => setSidebarOpen(false)} />
                </div>
            </aside>

            {/* 3. ÁREA DE CONTENIDO (Se ajusta automáticamente al espacio que sobra) */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">

                {/* HEADER MÓVIL (Solo visible en pantallas pequeñas) */}
                <header className="md:hidden bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 z-30 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-2 font-bold text-indigo-900 text-lg">
                        🍪 Merendola
                    </div>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                    >
                        <span className="sr-only">Abrir menú</span>
                        {/* Icono Hamburguesa */}
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </header>

                {/* MAIN SCROLLABLE (Donde va el Calendario) */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar relative">
                    {children}
                </main>
            </div>

        </div>
    );
};
