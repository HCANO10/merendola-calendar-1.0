
# Guía de Despliegue y Verificación (Runbook)

Sigue estos 4 pasos simples para asegurar tu aplicación.

## 1. Aplicar SQL
1. Ve al **SQL Editor** en tu Dashboard de Supabase.
2. Copia todo el contenido de `docs/supabase.sql`.
3. Pégalo y pulsa **RUN**.
   * *Si sale error "relation exists", no te preocupes, el script usa "if not exists" para ser seguro.*

## 2. Verificar Instalación
1. Borra el editor.
2. Copia el contenido de `docs/verify_supabase.sql`.
3. Pégalo y pulsa **RUN**.
4. Busca en los resultados:
   * `proname`: create_team, join_team...
   * `conname`: teams_invite_code_upper (si aparece, la base de datos protege los códigos).

## 3. Probar en la App
Abre tu aplicación y haz estas pruebas rápidas:

*   **Test A**: Intenta unirte con el código `hola-mundo` o `ABC 123` (con espacios).
    *   *OK*: Si te dice "Código inválido".
*   **Test B**: Crea una merendola nueva.
    *   *OK*: Si al entrar al detalle ves a los miembros del equipo en la lista de asistentes.
*   **Test C**: Quita tu cumpleaños del perfil.
    *   *OK*: Si ves un aviso amarillo en el Dashboard pidiendo que lo rellenes.

## 4. Solución de Problemas
*   Si al crear una merendola **no se crean asistentes**:
    *   Significa que el trigger falló por permisos. Asegúrate de haber ejecutado el SQL completo (incluye los `REVOKE/GRANT` correctos).
*   Si **no puedes unirte** ni con el código correcto:
    *   Revisa si el equipo se creó antes de aplicar el parche `upper()`. Crea un equipo nuevo para probar.
