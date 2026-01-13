import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    // En escritorio empieza abierto, en móvil cerrado
    const [isOpen, setIsOpen] = useState(window.innerWidth > 768);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            {/* 1. SIDEBAR WRAPPER (El que se encoge y estira) */}
            <aside
                className={`
          bg-white border-r border-gray-200 flex-shrink-0
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-64' : 'w-0'} 
          overflow-hidden
        `}
            >
                {/* Contenedor interno fijo para evitar que el texto baile al cerrar */}
                <div className="w-64 h-full">
                    <Sidebar mobileClose={() => window.innerWidth < 768 && setIsOpen(false)} />
                </div>
            </aside>

            {/* 2. MAIN CONTENT (Se adapta al espacio restante) */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* HEADER / TOP BAR */}
                <header className="bg-white h-16 border-b border-gray-200 flex items-center px-4 justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                            aria-label="Toggle Sidebar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="font-bold text-gray-800 text-lg">🍪 Merendola</h1>
                    </div>
                </header>

                {/* CONTENT BODY */}
                <main className="flex-1 overflow-y-auto p-4 relative">
                    {children}
                </main>
            </div>

        </div>
    );
};
