import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Guardamos el token en memoria localmente, sin depender de Supabase global
    const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);

    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        // 1. CAPTURA INMEDIATA DE TOKENS
        // No esperamos a eventos. Leemos la URL cruda.
        const hash = window.location.hash;
        console.log("🔍 Analizando URL:", hash);

        if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1)); // Quitar el #
            const aToken = params.get('access_token');
            const rToken = params.get('refresh_token');

            if (aToken) {
                console.log("💎 Token capturado y asegurado en memoria.");
                setRecoveryToken(aToken);
                setRefreshToken(rToken);
                // Limpiamos la URL para que no se vea feo, pero guardamos el token en React
                window.history.replaceState(null, '', window.location.pathname);
            } else {
                setStatus({ type: 'error', msg: 'Enlace dañado: Falta el token.' });
            }
        } else {
            // Si no hay hash, comprobamos si Supabase ya capturó la sesión por su cuenta
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    console.log("✅ Sesión global detectada.");
                    setRecoveryToken(session.access_token);
                } else {
                    setStatus({ type: 'error', msg: 'No se detectó el enlace de recuperación. Pide uno nuevo.' });
                }
            });
        }
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', msg: '' });

        if (!recoveryToken) {
            setStatus({ type: 'error', msg: '⛔ Error crítico: No tengo el token de seguridad. Reinicia el proceso.' });
            setLoading(false);
            return;
        }

        try {
            // 2. INYECCIÓN JUST-IN-TIME (El truco del experto)
            // Antes de actualizar, FORZAMOS la sesión con el token que guardamos
            console.log("💉 Inyectando sesión para autorización...");

            const { error: sessionError } = await supabase.auth.setSession({
                access_token: recoveryToken,
                refresh_token: refreshToken || recoveryToken, // Fallback si no hay refresh
            });

            if (sessionError) {
                console.warn("Aviso de sesión:", sessionError.message);
                // Intentamos seguir igualmente, a veces updateUser funciona si el token sigue vivo
            }

            // 3. ACTUALIZACIÓN BLINDADA
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setStatus({ type: 'success', msg: '✅ ¡CONTRASEÑA CAMBIADA! Entrando...' });

            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (error: any) {
            console.error("Fallo al actualizar:", error);
            setStatus({ type: 'error', msg: 'Error: ' + (error.message || 'Token expirado') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">

                <div className="text-center mb-6">
                    <span className="text-4xl">🔐</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Nueva Contraseña</h2>
                    {recoveryToken ? (
                        <span className="text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded">Token Seguro: OK</span>
                    ) : (
                        <span className="text-xs font-mono text-red-500 bg-red-50 px-2 py-1 rounded">Esperando Token...</span>
                    )}
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Clave</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Escribe tu nueva clave"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {status.msg && (
                        <div className={`p-3 rounded-lg text-sm font-bold text-center ${status.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {status.msg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !recoveryToken}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Procesando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};
