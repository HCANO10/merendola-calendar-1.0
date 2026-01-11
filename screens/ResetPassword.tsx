import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UI_TEXT } from '../constants';

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const [hasSession, setHasSession] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setHasSession(false);
                showToast('Enlace inválido o expirado. Solicita otro email.');
            }
        });
    }, []);

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type });
        if (type === 'success') {
            setTimeout(() => navigate('/'), 3000);
        } else {
            setTimeout(() => setToast(null), 5000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            showToast('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            showToast('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            showToast('Contraseña actualizada con éxito. Redirigiendo...', 'success');
        } catch (err: any) {
            showToast(err.message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    if (!hasSession) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-background-light dark:bg-background-dark">
                <div className="w-full max-w-[440px] bg-white dark:bg-[#1a262f] p-8 rounded-xl shadow-xl border border-[#dbe1e6] dark:border-[#2a3942] text-center">
                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
                    <h2 className="text-2xl font-bold mb-2">Enlace inválido</h2>
                    <p className="text-[#60798a] dark:text-[#a0b3c1] mb-6">El enlace para restablecer tu contraseña ha expirado o es incorrecto.</p>
                    <button onClick={() => navigate('/')} className="w-full bg-primary text-white h-12 rounded-lg font-bold">Volver al inicio</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="flex items-center justify-between border-b border-[#dbe1e6] dark:border-[#2a3942] bg-white dark:bg-[#1a262f] px-6 md:px-10 py-3">
                <div className="flex items-center gap-4">
                    <div className="text-primary">
                        <span className="material-symbols-outlined text-3xl">lock_reset</span>
                    </div>
                    <h1 className="text-lg font-bold leading-tight">{UI_TEXT.APP_NAME}</h1>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark">
                {toast && (
                    <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                        }`}>
                        <span className="material-symbols-outlined">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                        <span className="font-bold">{toast.message}</span>
                    </div>
                )}

                <div className="w-full max-w-[440px] bg-white dark:bg-[#1a262f] rounded-xl shadow-xl border border-[#dbe1e6] dark:border-[#2a3942] overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold leading-tight">Nueva Contraseña</h2>
                            <p className="text-[#60798a] dark:text-[#a0b3c1] text-sm mt-2">Introduce tu nueva contraseña de acceso</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold">Nueva contraseña</label>
                                <div className="relative">
                                    <input
                                        className="w-full rounded-lg border-[#dbe1e6] dark:border-[#2a3942] bg-white dark:bg-[#101a22] h-12 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#60798a]">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold">Repetir contraseña</label>
                                <div className="relative">
                                    <input
                                        className="w-full rounded-lg border-[#dbe1e6] dark:border-[#2a3942] bg-white dark:bg-[#101a22] h-12 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#60798a]">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="w-full flex items-center justify-center rounded-lg h-12 bg-primary hover:bg-[#1a8de0] transition-all text-white text-base font-bold shadow-lg shadow-primary/30 gap-3 mt-4"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                                    </svg>
                                ) : null}
                                <span>Actualizar contraseña</span>
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ResetPassword;
