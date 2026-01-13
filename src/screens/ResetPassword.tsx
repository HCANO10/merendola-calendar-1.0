import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false); // EL CERROJO
    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        // 1. Check inmediato por si la sesión ya estaba
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                console.log("✅ Sesión encontrada al inicio.");
                setIsAuthenticated(true);
            }
        });

        // 2. Escuchar cambios (Aquí es donde ocurre la magia del enlace)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Evento Auth: ${event}`);

            if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || session) {
                setIsAuthenticated(true);
            }

            if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                setStatus({ type: 'error', msg: 'La sesión se ha cerrado. Vuelve a pedir el enlace.' });
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', msg: '' });

        // DOBLE VERIFICACIÓN DE SEGURIDAD
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setStatus({ type: 'error', msg: '❌ Error Crítico: Se perdió la sesión. Recarga la página.' });
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setStatus({ type: 'error', msg: 'La contraseña debe tener al menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            // Ahora sí, actualización segura
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            setStatus({ type: 'success', msg: '✅ ¡Contraseña guardada! Redirigiendo...' });

            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error(error);
            setStatus({ type: 'error', msg: 'Error: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // --- MIENTRAS NO HAYA SESIÓN, MOSTRAMOS SPINNER ---
    // Esto evita que el usuario intente enviar el formulario antes de tiempo
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm mx-auto">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-800">Verificando Enlace...</h2>
                    <p className="text-gray-500 text-sm mt-2">Estamos validando tu seguridad con Supabase.</p>
                    <p className="text-xs text-gray-400 mt-4">Si esto tarda más de 10 segundos, el enlace ha caducado.</p>
                </div>
            </div>
        );
    }

    // --- FORMULARIO (SOLO VISIBLE SI isAuthenticated === true) ---
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100 animate-in fade-in zoom-in duration-300">

                <div className="text-center mb-6">
                    <span className="text-4xl">🔓</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Establecer Contraseña</h2>
                    <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold mt-2">
                        <span>✓</span> Sesión Segura Activa
                    </div>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            placeholder="Escribe tu nueva clave"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {status.msg && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {status.msg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Confirmar Cambio'}
                    </button>
                </form>

            </div>
        </div>
    );
};
