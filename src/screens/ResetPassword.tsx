import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom'; // Asumiendo React Router v6

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Comprobamos si el enlace mágico nos ha logueado correctamente
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setMessage('⚠️ No detectamos una sesión válida. Vuelve a pedir el correo.');
            }
        };
        checkSession();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        // Validación mínima obligatoria de Supabase (6 chars)
        if (password.length < 6) {
            setMessage('⚠️ La contraseña debe tener al menos 6 caracteres (norma de seguridad).');
            setLoading(false);
            return;
        }

        try {
            // AL ESTAR YA LOGUEADOS POR EL ENLACE, SOLO ACTUALIZAMOS EL USUARIO
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            alert("✅ ¡Contraseña guardada! Entrando...");
            navigate('/dashboard'); // O window.location.href = '/dashboard';

        } catch (error: any) {
            console.error(error);
            setMessage('❌ Error: ' + (error.message || 'No se pudo guardar.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                    Nueva Contraseña
                </h2>
                <p className="text-center text-gray-500 mb-6 text-sm">
                    Introduce tu nueva clave para guardarla.
                </p>

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2 text-sm">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Escribe aquí..."
                            autoFocus
                        />
                    </div>

                    {message && (
                        <div className={`text-sm p-3 rounded ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md"
                    >
                        {loading ? 'Guardando...' : 'Guardar y Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};
