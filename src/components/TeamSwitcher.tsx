import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';

const TeamSwitcher: React.FC = () => {
    const { state, switchTeam } = useStore();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitch = async (teamId: string) => {
        if (teamId === state.team?.id) {
            setIsOpen(false);
            return;
        }

        setSwitching(true);
        try {
            await switchTeam(teamId);
            setIsOpen(false);
        } catch (error) {
            console.error('Error switching team:', error);
        } finally {
            setSwitching(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl hover:border-primary transition-all shadow-sm group"
            >
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-black text-sm uppercase">
                    {state.team?.name?.substring(0, 2)}
                </div>
                <div className="text-left hidden md:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Equipo Activo</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{state.team?.name}</p>
                </div>
                <span className={`material-symbols-outlined text-slate-400 group-hover:text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tus Equipos ({state.teams.length})</p>
                    </div>

                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                        {state.teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => handleSwitch(team.id)}
                                disabled={switching}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${team.id === state.team?.id
                                    ? 'bg-primary/5 border border-primary/20 cursor-default'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${team.id === state.team?.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {team.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${team.id === state.team?.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {team.name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-tighter">
                                        {team.inviteCode}
                                    </p>
                                </div>
                                {team.id === state.team?.id && (
                                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mt-2 p-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => { navigate('/team-setup'); setIsOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 p-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Nuevo Equipo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamSwitcher;
