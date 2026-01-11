
# Notas de Corrección y Diagnóstico (Hardening)

## 1. Cambios de Seguridad Aplicados
Hemos endurecido la base de datos de Supabase para prevenir inyecciones y accesos no autorizados.

*   **`SET search_path = public`**: En todas las funciones (`create_team`, `join_team`, `handle_new_merendola`). Esto evita que un atacante "secuestre" la resolución de nombres de tablas si logra insertar un esquema malicioso en el path.
*   **Permisos (Revoke/Grant)**:
    *   Las funciones RPC ahora tienen `REVOKE ALL FROM PUBLIC`.
    *   Solo el rol `authenticated` (usuarios logueados) tiene `GRANT EXECUTE`.
    *   El trigger handler no tiene permisos públicos, ya que solo lo invoca el sistema al insertar en la tabla.
*   **Input Normalization**: `join_team` ahora hace `upper(trim(code))` automáticamente, por lo que el usuario puede escribir " abc-123 " y funcionará.
*   **Gate de Perfil**: Se ha extendido el bloqueo de lectura/escritura a la tabla `attendees` si el usuario no tiene completos `birthday` y `notification_email`.

## 2. Cómo Diagnosticar Problemas

### Join Team falla con "Inválido"
*   Verifica que el código en la tabla `teams` esté en mayúsculas.
*   Aunque la función ahora normaliza, asegúrate que el invite_code original se guardó correctamente. La función `create_team` ya lo genera en mayúsculas.

### Trigger Attendees no funciona
*   Consulta la tabla `attendees` filtrando por `merendola_id` reciente.
*   Si no hay filas, verifica si el creador de la merendola es miembro del equipo en `memberships`. El trigger usa `NEW.team_id` y busca memberships coincidentes.

### RLS "No veo datos"
*   Asegúrate de que tus policies de `profiles`, `teams`, `memberships` no tengan errores circulares.
*   **Importante**: Si el usuario no tiene email/cumpleaños, las policies de `merendolas` y `attendees` retornarán 0 filas (efecto "fantasma").

## 3. Verificación
Ejecuta el script `docs/verify_supabase.sql` en el SQL Editor para confirmar que las funciones tienen la propiedad `proconfig` con el search_path correcto.
