
# Checklist de Pruebas (Smoke Tests)

Realiza estas 3 pruebas simples para dar por buena la versión.

## Test 1: Código de Invitación Inválido
*   **Acción**: En "Unirse a Equipo", introduce `XYZ-9999` (o cualquier inventado).
*   **Esperado**: Mensaje en rojo "Código de invitación inválido o expirado" (o similar). La app no debe romperse.

## Test 2: Generación Automática de Asistentes
*   **Acción**: Crea una nueva merendola "Prueba Trigger".
*   **Validación**:
    *   En UI: Deberías ver la merendola.
    *   En Supabase: La tabla `attendees` debe tener nuevas filas para esa merendola (una por cada miembro a la hora de crearla).

## Test 3: Gate de Perfil Incompleto
*   **Acción**: Ve a la tabla `profiles` en Supabase y pon `birthday` a NULL para tu usuario. Recarga la app.
*   **Esperado**: El Dashboard debe mostrar un aviso pidiendo completar el perfil, o simplemente no cargar las merendolas sensibles.
*   **Acción**: Rellena el perfil en la app.
*   **Esperado**: Las merendolas vuelven a aparecer.
