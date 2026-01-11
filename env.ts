/// <reference types="vite/client" />

/**
 * Validates that all required environment variables are present.
 * Throws a clear error in Spanish if any are missing to avoid silent failures.
 */
export const validateEnv = () => {
    const required = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
    ];

    const missing = required.filter((key) => !import.meta.env[key]);

    if (missing.length > 0) {
        const errorMsg = `Error crítico: Faltan las siguientes variables de entorno: ${missing.join(', ')}. 
    Por favor, revisa la configuración de producción (Netlify/Vercel) y vuelve a desplegar.`;

        // In production, we might want to show this in the UI
        if (typeof window !== 'undefined') {
            document.body.innerHTML = `
        <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #fff5f5; color: #c53030; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <h1 style="margin-bottom: 20px;">⚠️ Configuración incompleta</h1>
          <p style="font-size: 1.1rem; max-width: 600px; line-height: 1.6;">${errorMsg}</p>
        </div>
      `;
        }
        throw new Error(errorMsg);
    }

    return {
        SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
};

export const ENV = validateEnv();
