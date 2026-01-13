import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false); // Semáforo manual
    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        const handleSessionRecovery = async () => {
            try {
                // 1. INTENTO AUTOMÁTICO (Lo normal)
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (currentSession) {
                    console.log("✅ Sesión detectada automáticamente.");
                    setSessionReady(true);
                    return;
                }

                // 2. INTENTO MANUAL (La solución Experta)
                // Si Supabase falló, leemos el hash nosotros mismos
                const hash = window.location.hash.substring(1); // Quitar el '#'
                const params = new URLSearchParams(hash);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const type = params.get('type');

                if (accessToken && (type === 'recovery' || type === 'magiclink')) {
                    console.log("🔧 Interceptando token manualmente...");

                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (error) throw error;

                    console.log("✅ Sesión forzada manualmente con éxito.");
                    setSessionReady(true);
                } else {
                    // Si no hay hash y no hay sesión, estamos perdidos
                    console.warn("⚠️ No se encontró sesión ni tokens en la URL.");
                }

            } catch (error: any) {
                console.error("Error recuperando sesión:", error);
                setStatus({ type: 'error', msg: 'El enlace es inválido o ha expirado. Pide uno nuevo.' });
            }
        };

        handleSessionRecovery();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!sessionReady) {
            setStatus({ type: 'error', msg: '⏳ No se ha establecido la conexión segura. Espera un momento.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', msg: '' });

        if (password.length < 6) {
            setStatus({ type: 'error', msg: 'La contraseña debe tener al menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            // 3. ACTUALIZACIÓN (Ahora sabemos 100% que hay sesión)
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            setStatus({ type: 'success', msg: '✅ ¡Contraseña cambiada! Redirigiendo...' });

            setTimeout(() => {
                // Intentamos ir al dashboard, si falla, al login
                navigate('/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error(error);
            setStatus({ type: 'error', msg: 'Error al guardar: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // VISTA DE CARGA (Mientras intentamos forzar la sesión)
    if (!sessionReady && !status.msg) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Validando credenciales de recuperación...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">

                <div className="text-center mb-6">
                    <span className="text-4xl">🔐</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Restablecer Password</h2>
                </div>

                {/* Si hubo error fatal al cargar token */}
                {status.msg && status.type === 'error' && !sessionReady ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center font-bold">
                        {status.msg}
                        <button onClick={() => navigate('/')} className="block w-full mt-4 text-sm underline text-red-800">
                            Volver al inicio
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Escribe tu nueva clave"
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
                            {loading ? 'Guardando...' : 'Cambiar y Entrar'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
