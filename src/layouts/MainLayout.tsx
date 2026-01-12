import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    // Estado del menú: Por defecto CERRADO en móvil, ABIERTO en escritorio
    // (O puedes poner 'false' para que empiece siempre cerrado)
    const [isOpen, setIsOpen] = useState(window.innerWidth > 768);

    return (
        <div className="flex flex-col h-screen bg-gray-50">

            {/* 1. HEADER (Siempre fijo arriba) */}
            <header className="bg-white h-16 border-b border-gray-200 flex items-center px-4 justify-between flex-shrink-0 z-20">
                <div className="flex items-center gap-4">
                    {/* EL BOTÓN QUE ABRE Y CIERRA */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                    >
                        {/* Icono Hamburguesa */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        🍪 Merendola
                    </h1>
                </div>
            </header>

            {/* 2. CONTENEDOR FLEX (Cuerpo) */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* SIDEBAR DESLIZANTE */}
                {/* La magia está en la clase de ancho: w-64 vs w-0 */}
                <aside
                    className={`
            bg-[#0f172a] text-white
            transition-all duration-300 ease-in-out
            ${isOpen ? 'w-64' : 'w-0'}
            overflow-hidden flex-shrink-0
          `}
                >
                    {/* Contenedor interno de ancho fijo para que el texto no se deforme al cerrar */}
                    <div className="w-64 h-full flex flex-col">
                        <Sidebar mobileClose={() => {
                            // Si estamos en móvil, cerramos al hacer click en un link
                            if (window.innerWidth < 768) setIsOpen(false);
                        }} />
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 relative w-full">
                    {/* Overlay opcional para oscurecer en móvil si quieres, 
               pero con el sistema Push no es estrictamente necesario. 
               Lo dejamos limpio. */}
                    {children}
                </main>

            </div>
        </div>
    );
};
