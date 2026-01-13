import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSessionValid, setIsSessionValid] = useState(false); // EL SEMÁFORO
    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        const forceSession = async () => {
            try {
                // 1. EXTRACTOR QUIRÚRGICO DE TOKENS
                // Buscamos el token directamente en la URL, sin esperar a Supabase
                const hash = window.location.hash;

                // Convertimos el hash en parámetros usables
                const params = new URLSearchParams(hash.replace('#', '?'));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (!accessToken) {
                    // Si no hay token en la URL, verificamos si ya había sesión guardada de antes
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        console.log("✅ Sesión existente recuperada.");
                        setIsSessionValid(true);
                        return;
                    }
                    throw new Error("No se encontró el token de recuperación. El enlace está roto.");
                }

                // 2. INYECCIÓN MANUAL DE SESIÓN
                console.log("💉 Inyectando sesión manualmente...");
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || '',
                });

                if (error) throw error;

                console.log("✅ Sesión establecida con fuerza bruta.");
                setIsSessionValid(true); // ABRIMOS EL SEMÁFORO

            } catch (error: any) {
                console.error("Fallo crítico de sesión:", error);
                setStatus({ type: 'error', msg: 'Enlace inválido o expirado. Pide uno nuevo.' });
            }
        };

        forceSession();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', msg: '' });

        if (!isSessionValid) {
            setStatus({ type: 'error', msg: '⛔ No hay sesión segura. Recarga la página.' });
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setStatus({ type: 'error', msg: 'La contraseña debe tener al menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            // 3. ACTUALIZACIÓN (Ahora es seguro porque forzamos la sesión arriba)
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            setStatus({ type: 'success', msg: '✅ ¡CONTRASEÑA ACTUALIZADA! Redirigiendo...' });

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

    // --- VISTA DE CARGA (MIENTRAS INYECTAMOS LA SESIÓN) ---
    if (!isSessionValid && !status.msg) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <h2 className="mt-4 text-xl font-bold text-gray-700">Validando Token de Seguridad...</h2>
                    <p className="text-gray-500 text-sm">No cierres esta ventana.</p>
                </div>
            </div>
        );
    }

    // --- VISTA DE ERROR FATAL ---
    if (status.msg && status.type === 'error' && !isSessionValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800">Enlace Caducado</h2>
                    <p className="text-gray-600 mt-2">{status.msg}</p>
                    <button onClick={() => navigate('/')} className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold w-full">
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    // --- FORMULARIO (SOLO SI EL TOKEN FUE VÁLIDO) ---
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">

                <div className="text-center mb-6">
                    <span className="text-4xl">🔐</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Restablecer Contraseña</h2>
                    <div className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-2 font-bold">
                        Conexión Segura Establecida
                    </div>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
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
            </div>
        </div>
    );
};
