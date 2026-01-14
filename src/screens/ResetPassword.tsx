import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Necesitamos las variables de entorno para montar la URL de la API a mano
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [isBootstrapComplete, setIsBootstrapComplete] = useState(false);

    useEffect(() => {
        console.log("[AuthRecoveryDebug] mounted ResetPassword");
        const bootstrapSession = async () => {
            // 1. EXTRAER TOKEN Y REFRESH TOKEN
            let hash = window.location.hash;
            console.log("🔍 [AuthRecovery] Hash detectado:", hash);

            // Intentar recuperar fragmento capturado por index.tsx (Fix Doble Hash)
            const capturedFragment = sessionStorage.getItem('sb-recovery-fragment');
            if (capturedFragment) {
                console.log("📦 [AuthRecovery] Found captured fragment in storage. Using it.");
                hash = '#' + capturedFragment; // Simular que vino del hash

                // Limpiar storage para no reutilizarlo erróneamente
                sessionStorage.removeItem('sb-recovery-fragment');
                sessionStorage.removeItem('sb-recovery-active');
            }

            // Parsear manualmente
            // Nota: manejar tanto /#/reset-password#access_token... como search params
            const params = new URLSearchParams(hash.substring(hash.indexOf('#', 1) + 1) || hash.replace('#', '?'));

            // Fix robustez: si el hash es solo "#/reset-password", params estará vacío o mal.
            // Si usamos el capturedFragment, ese string suele ser "access_token=...&..." 
            // así que new URLSearchParams(capturedFragment) funciona directo.

            let token = params.get('access_token');
            let refreshToken = params.get('refresh_token');

            // Fallback directo si params falló por formato raro
            if (!token && capturedFragment) {
                const directParams = new URLSearchParams(capturedFragment);
                token = directParams.get('access_token');
                refreshToken = directParams.get('refresh_token');
            }

            if (token) {
                console.log("🔑 [AuthRecovery] Token encontrado. Iniciando bootstrap...");
                setAccessToken(token);

                // ESTRATEGIA: Bootstrap de sesión (Intento de hidratar SDK)
                // Aunque usamos Direct API Call, esto ayuda a que la app 'sienta' la sesión si es posible.
                if (refreshToken) {
                    try {
                        const { error } = await supabase.auth.setSession({
                            access_token: token,
                            refresh_token: refreshToken,
                        });
                        if (error) console.warn("⚠️ [AuthRecovery] setSession warning:", error);
                        else console.log("✅ [AuthRecovery] reset_bootstrap session_present=true");
                    } catch (e) {
                        console.warn("⚠️ [AuthRecovery] setSession failed (ignorable for Direct API Call):", e);
                    }
                } else {
                    console.log("ℹ️ [AuthRecovery] No refresh_token found. Skipping full session hydration.");
                }

                // Limpiar URL por seguridad
                window.history.replaceState(null, '', window.location.pathname);
                setIsBootstrapComplete(true);

            } else {
                console.error("❌ [AuthRecovery] Token missing in hash or storage.");
                setStatus({ type: 'error', msg: 'Enlace inválido o expirado.' });
                setIsBootstrapComplete(true);
            }
        };

        bootstrapSession();
    }, []);

    const handleDirectReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', msg: '' });

        if (!accessToken) {
            setStatus({ type: 'error', msg: 'Falta el token de seguridad.' });
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setStatus({ type: 'error', msg: 'La contraseña debe tener al menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            console.log("🚀 [AuthRecovery] Iniciando petición directa a la API...");

            // 2. LLAMADA DIRECTA A LA API (BYPASS DEL SDK - ESTRATEGIA 2)
            const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || data.error_description || 'Error desconocido al actualizar');
            }

            console.log("✅ [AuthRecovery] Respuesta API:", data);
            setStatus({ type: 'success', msg: '✅ ¡CONTRASEÑA CAMBIADA CORRECTAMENTE!' });

            // LIMPIEZA FINAL
            await supabase.auth.signOut(); // Cerramos para obligar a login limpio

            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (error: any) {
            console.error("❌ [AuthRecovery] Fallo directo:", error);
            setStatus({ type: 'error', msg: 'Error: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // UI: CARGANDO BOOTSTRAP
    if (!isBootstrapComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                </svg>
            </div>
        );
    }

    // UI: LINK INVÁLIDO
    if (!accessToken && status.type === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-red-100 text-center">
                    <span className="text-4xl">⚠️</span>
                    <h2 className="text-xl font-bold text-gray-800 mt-4">Enlace no válido</h2>
                    <p className="text-gray-500 mt-2 mb-6">Este enlace de recuperación ha expirado o ya ha sido utilizado.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    // UI: FORMULARIO
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">

                <div className="text-center mb-6">
                    <span className="text-4xl">🔐</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Nueva Contraseña</h2>
                    <p className="text-sm text-gray-500">Introduce tu nueva clave para acceder.</p>
                </div>

                <form onSubmit={handleDirectReset} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            required
                            minLength={6}
                            disabled={loading || status.type === 'success'}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:bg-gray-100"
                            placeholder="Introduce nueva contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {status.msg && (
                        <div className={`p-3 rounded-lg text-sm font-bold text-center animate-in fade-in slide-in-from-top-2 ${status.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {status.msg}
                        </div>
                    )}

                    {!status.type.includes('success') && (
                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                                </svg>
                            )}
                            {loading ? 'Guardando...' : 'Actualizar Contraseña'}
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};
