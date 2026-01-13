import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasSession, setHasSession] = useState(false); // <--- EL PORTERO
    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        // 1. Verificar si YA tenemos sesión al cargar
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log("✅ Sesión detectada al inicio");
                setHasSession(true);
            }
        };
        checkSession();

        // 2. Escuchar si la sesión llega un poco más tarde (por el enlace mágico)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("🔔 Evento Auth en Reset:", event);
            if (session) {
                setHasSession(true);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        // DOBLE CHEQUEO DE SEGURIDAD
        if (!hasSession) {
            setStatus({ type: 'error', msg: '⏳ Esperando validación de seguridad... Intenta en 2 segundos.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', msg: '' });

        if (password.length < 6) {
            setStatus({ type: 'error', msg: 'Mínimo 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            // Ahora es seguro llamar a updateUser porque el Portero nos dejó pasar
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            setStatus({ type: 'success', msg: '✅ ¡Contraseña Actualizada! Redirigiendo...' });
            setTimeout(() => navigate('/dashboard'), 2000);

        } catch (error: any) {
            console.error(error);
            // Si falla, es posible que el enlace haya caducado de verdad
            setStatus({ type: 'error', msg: 'Error: ' + (error.message || 'El enlace ha caducado.') });
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERIZADO DEL PORTERO ---
    if (!hasSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg animate-pulse">
                    <h2 className="text-xl font-bold text-indigo-600 mb-2">Validando enlace seguro...</h2>
                    <p className="text-gray-500 text-sm">Estamos verificando tu identidad con Supabase.</p>
                    <p className="text-xs text-gray-400 mt-4">No cierres esta ventana.</p>
                </div>
            </div>
        );
    }

    // --- FORMULARIO REAL (Solo se ve si hay sesión) ---
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <span className="text-4xl">🔐</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Nueva Contraseña</h2>
                    <div className="bg-green-50 text-green-700 text-xs py-1 px-2 rounded-full inline-block mt-2 font-bold">
                        Identidad Verificada ✅
                    </div>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Clave</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all"
                    >
                        {loading ? 'Guardando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};
