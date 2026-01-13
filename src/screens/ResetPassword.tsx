import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) return alert("Las contraseñas no coinciden");

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("✅ Contraseña actualizada. Ahora sí, entrando al Dashboard...");
            window.location.href = '/dashboard';
        }
        setLoading(false);
    };

    return (
        // ESTILO "PUSH SCREEN" / SIGN-IN IDÉNTICO
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">

                <div className="text-center mb-8">
                    <span className="text-4xl">🔐</span>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">Nueva Contraseña</h2>
                    <p className="text-gray-500 text-sm mt-2">Introduce tu nueva clave dos veces para confirmarla.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                </form>

            </div>
        </div>
    );
};
