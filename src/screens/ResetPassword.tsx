import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Necesitamos las variables de entorno para montar la URL de la API a mano
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        // 1. EXTRAER TOKEN PURO
        const hash = window.location.hash;
        console.log("🔍 Hash detectado:", hash);

        // Parsear manualmente para no depender de nadie
        const params = new URLSearchParams(hash.replace('#', '?'));
        const token = params.get('access_token');

        if (token) {
            console.log("🔑 Token capturado para uso directo.");
            setAccessToken(token);
            // Limpiar URL por estética
            window.history.replaceState(null, '', window.location.pathname);
        } else {
            setStatus({ type: 'error', msg: 'No se encontró el token de seguridad. El enlace está roto.' });
        }
    }, []);

    const handleDirectReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', msg: '' });

        if (!accessToken) {
            setStatus({ type: 'error', msg: 'Falta el token. Vuelve a pedir el correo.' });
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setStatus({ type: 'error', msg: 'Mínimo 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            console.log("🚀 Iniciando petición directa a la API...");

            // 2. LLAMADA DIRECTA A LA API (BYPASS DEL SDK)
            // Endpoint estándar de Supabase Auth
            const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,           // La llave pública
                    'Authorization': `Bearer ${accessToken}` // <--- AQUÍ ESTÁ LA MAGIA
                },
                body: JSON.stringify({
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || data.error_description || 'Error desconocido al actualizar');
            }

            console.log("✅ Respuesta API:", data);

            setStatus({ type: 'success', msg: '✅ ¡CONTRASEÑA CAMBIADA CORRECTAMENTE!' });

            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error("Fallo directo:", error);
            setStatus({ type: 'error', msg: 'Error: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    if (!accessToken && !status.msg) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center animate-pulse text-gray-500 font-bold">
                    Buscando llave maestra...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">

                <div className="text-center mb-6">
                    <span className="text-4xl">🛠️</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Restablecimiento Directo</h2>
                    {accessToken && (
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-mono block mt-2">
                            Modo API Directo Activo
                        </span>
                    )}
                </div>

                <form onSubmit={handleDirectReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Nueva clave definitiva"
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
                        disabled={loading || !accessToken}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all disabled:opacity-50"
                    >
                        {loading ? 'Enviando a API...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};
