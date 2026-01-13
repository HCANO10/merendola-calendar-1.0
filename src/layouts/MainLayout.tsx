import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Header */}
            <header className="bg-white h-16 border-b border-gray-200 flex items-center px-4 justify-between flex-shrink-0 z-30 relative">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded hover:bg-gray-100">
                        ☰
                    </button>
                    <h1 className="font-bold text-gray-800 text-lg">🍪 Merendola</h1>
                </div>
            </header>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <aside className={`
          absolute md:relative z-20 h-full bg-white transition-all duration-300 ease-in-out border-r border-gray-200 shadow-xl md:shadow-none
          ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:-translate-x-0'}
        `}>
                    <div className="w-64 h-full overflow-hidden">
                        <Sidebar mobileClose={() => window.innerWidth < 768 && setIsOpen(false)} />
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 w-full relative">
                    {/* Backdrop móvil */}
                    {isOpen && (
                        <div className="md:hidden absolute inset-0 bg-black/20 z-10 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
};
