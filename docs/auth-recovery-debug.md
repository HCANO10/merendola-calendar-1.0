# Auditoría de Bug: AuthSessionMissingError en Recuperación de Contraseña

**Objetivo**: Identificar el origen exacto del error `AuthSessionMissingError: Auth session missing!` durante el flujo de recuperación.

## 1. Origen del Error
El error se dispara en el archivo `src/screens/SignIn.tsx`, específicamente en la función `handleUpdatePassword`.

- **Archivo**: `src/screens/SignIn.tsx`
- **Línea del Log**: 76 (`console.error('Update password error:', err);`)
- **Función Culpable**: `handleUpdatePassword`
- **Llamada Supabase**: `await supabase.auth.updateUser({ password: newPassword });` (Línea 63)

## 2. Flujo de Ejecución Real
Actualmente existen **dos** manejadores del evento `PASSWORD_RECOVERY` compitiendo:

1.  **Componente `SignIn` (Ruta `/`)**:
    *   Escucha `onAuthStateChange`.
    *   Al recibir `PASSWORD_RECOVERY`, abre su propio modal (`setShowResetModal(true)`).
    *   El usuario introduce la contraseña en ESTE modal.
    *   Se ejecuta `supabase.auth.updateUser` usando el SDK.
    *   **Resultado**: Falla con `AuthSessionMissingError` porque la sesión no se ha hidratado correctamente en el cliente de Supabase en este contexto.

2.  **Componente `App` (Router)**:
    *   Escucha `onAuthStateChange`.
    *   Intenta redirigir a `/reset-password` (`window.location.hash = '/reset-password'`).
    *   **Conflicto**: Si el usuario está en `/`, el componente `SignIn` ya está montado y captura la interacción antes o al mismo tiempo que la redirección, o el usuario interactúa con el modal de `SignIn` ignorando la redirección.

## 3. Análisis de la URL y Estado
*   **URL de Entrada**: `https://<dominio>/#access_token=...&type=recovery`
*   **Evento**: `supabase.auth.onAuthStateChange` emite `PASSWORD_RECOVERY`.
*   **Estado**: El token está en el hash, pero `supabase-js` parece no haber establecido la sesión interna "persistente" cuando `SignIn` intenta usar `updateUser`.

## 4. Orden de Eventos Observado
1.  Carga de la App.
2.  `Supabase SDK` detecta hash en URL.
3.  Dispara evento `PASSWORD_RECOVERY`.
4.  `SignIn.tsx` (Líneas 36-40) intercepta evento -> Abre Modal Local.
5.  `App.tsx` (Líneas 29-32) intercepta evento -> Intenta cambiar hash a `/reset-password`.
6.  **Race Condition**: El usuario ve el modal de `SignIn` (o se queda abierto mientras cambia la URL) y lo usa.
7.  `SignIn` llama a `updateUser` (SDK estándar).
8.  **Error**: `AuthSessionMissingError` porque el SDK no tiene sesión válida en ese instante para esa llamada.

## 5. Conclusión
El error ocurre porque se está utilizando la lógica legacy de `SignIn.tsx` en lugar de la nueva pantalla dedicada `ResetPassword.tsx` que implementa la estrategia "Direct API Call" (Bypass SDK). La existencia del modal de recuperación dentro de `SignIn.tsx` está ocultando la nueva implementación.
