import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', msg: '' });

    // Guardamos los tokens para usarlos "Just-In-Time"
    const [recoveryTokens, setRecoveryTokens] = useState<{ access: string, refresh: string } | null>(null);

    useEffect(() => {
        const extractTokens = async () => {
            // 1. Intentar obtener de la URL (Prioridad Máxima)
            const hash = window.location.hash;
            const params = new URLSearchParams(hash.replace('#', '?'));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken) {
                console.log("🎟️ Tokens detectados en URL. Guardándolos para uso JIT.");
                setRecoveryTokens({ access: accessToken, refresh: refreshToken || '' });

                // Intentar establecer sesión inicial (para feedback visual)
                await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || ''
                });
            } else {
                // 2. Si no hay en URL, ver si ya hay sesión establecida
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setStatus({ type: 'error', msg: 'Enlace inválido o expirado.' });
                }
            }
        };
        extractTokens();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', msg: '' });

        if (password.length < 6) {
            setStatus({ type: 'error', msg: 'La contraseña debe tener al menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            // --- ESTRATEGIA JIT (JUST-IN-TIME) ---
            // Antes de actualizar, aseguramos la sesión por la fuerza bruta
            if (recoveryTokens) {
                console.log("💉 Inyección JIT de sesión antes del update...");
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: recoveryTokens.access,
                    refresh_token: recoveryTokens.refresh
                });
                if (sessionError) console.warn("Advertencia JIT:", sessionError);
            }

            // Verificación final de que TENEMOS algo
            const { data: { session: finalSession } } = await supabase.auth.getSession();
            if (!finalSession) {
                throw new Error("No se pudo establecer la sesión segura para el cambio.");
            }

            console.log("🔄 Intentando updateUser con sesión:", finalSession.user.id);

            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            setStatus({ type: 'success', msg: '✅ ¡CONTRASEÑA CAMBIADA! Entrando...' });

            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (error: any) {
            console.error("Error Reset:", error);
            setStatus({ type: 'error', msg: 'Error: ' + (error.message || 'Fallo desconocido') });
        } finally {
            setLoading(false);
        }
    };

    // Render condicional basado en si tenemos tokens o sesión
    const isReady = !!recoveryTokens;

    if (status.msg && status.type === 'error' && !isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error de Enlace</h2>
                    <p className="text-gray-600 mb-4">{status.msg}</p>
                    <button onClick={() => navigate('/')} className="text-indigo-600 underline">Volver al Inicio</button>
                </div>
            </div>
        );
    }

    if (!isReady && !status.msg) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-500">Analizando credenciales...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">

                <div className="text-center mb-6">
                    <span className="text-4xl">🔑</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Nueva Contraseña</h2>
                    <div className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full mt-2 font-bold">
                        Modo Recuperación Seguro
                    </div>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tu Nueva Clave</label>
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
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Cambiar Ahora'}
                    </button>
                </form>
            </div>
        </div>
    );
};
