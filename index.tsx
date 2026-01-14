import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { StoreProvider } from './store'; // Importado desde la raíz

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}


// [AuthRecovery] Fix Double Hash Issue
// Captura el token si Supabase lo pone después de un segundo hash (ej: /#/route#access_token=...)
const captureSupabaseRecoveryDoubleHash = () => {
  const href = window.location.href;
  const idx = href.indexOf('#access_token=');

  // Solo intervenimos si vemos el patrón de token
  if (idx !== -1) {
    console.log("[AuthRecovery] Double hash detected. Capturing fragment...");

    // Extraer todo desde el access_token
    const fragment = href.slice(idx + 1); // remove leading '#'

    // Guardar en SessionStorage para que ResetPassword lo recupere
    sessionStorage.setItem('sb-recovery-fragment', fragment);
    sessionStorage.setItem('sb-recovery-active', '1');

    console.log("[AuthRecovery] captured_fragment=true");

    // Evitar bucle infinito si ya estamos intentando redirigir
    // (Aseguramos que no se recargue incesantemente si algo falla)
    const isAlreadyRedirecting = sessionStorage.getItem('sb-recovery-redirecting') === '1';

    if (!isAlreadyRedirecting) {
      sessionStorage.setItem('sb-recovery-redirecting', '1');
      // Redirigir limpio a la pantalla de reset
      window.location.replace(window.location.origin + '/#/reset-password');
      return true; // Stop execution
    }
  }

  // Limpieza de flag de redirect si ya cargamos bien
  sessionStorage.removeItem('sb-recovery-redirecting');
  return false;
};

// Ejecutar ANTES de montar React
if (captureSupabaseRecoveryDoubleHash()) {
  // Si capturamos y redirigimos, NO montamos la app aun para evitar parpadeos o errores
  console.log("[AuthRecovery] Redirecting to clean URL...");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <StoreProvider>
        <App />
      </StoreProvider>
    </React.StrictMode>
  );
}
