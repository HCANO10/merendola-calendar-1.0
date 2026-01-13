import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', msg: '' });

    // Verificar que el enlace nos ha logueado
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setStatus({ type: 'error', msg: '⚠️ No hay sesión activa. El enlace puede estar roto. Vuelve a pedirlo.' });
            }
        });
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', msg: '' });

        // Validación mínima de Supabase (6 caracteres)
        if (password.length < 6) {
            setStatus({ type: 'error', msg: 'La contraseña debe tener al menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            // TRUCO DE EXPERTO:
            // No usamos verifyOtp, usamos updateUser porque YA estamos logueados.
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setStatus({ type: 'success', msg: '✅ ¡Contraseña cambiada correctamente!' });

            // Esperar un poco y redirigir
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (error: any) {
            console.error(error);
            setStatus({ type: 'error', msg: 'Error: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">

                <div className="text-center mb-8">
                    <span className="text-4xl">🔐</span>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Nueva Contraseña</h2>
                    <p className="text-gray-500 text-sm">Escribe tu nueva clave definitiva.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Clave</label>
                        <input
                            type="password"
                            required
                            placeholder="Mínimo 6 caracteres"
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
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Confirmar Cambio'}
                    </button>
                </form>

            </div>
        </div>
    );
};
