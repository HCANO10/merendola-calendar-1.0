# Guía de Despliegue: Merendola Calendar 1.0

Sigue estos pasos para que tu aplicación funcione correctamente en producción.

## 1. Configuración de Supabase (Obligatorio)

Si la aplicación te muestra el mensaje **"Base de Datos No Preparada"**, es porque faltan las tablas.

1. Entra a tu proyecto en [Supabase](https://supabase.com).
2. Ve al **SQL Editor**.
3. Abre el botón "Copiar Tablas SQL" en la App o abre localmente `docs/supabase.sql`.
4. Pega el contenido en el SQL Editor y dale a **Run**.
5. (Opcional) Pega y ejecuta el contenido de `docs/verify_db.sql` para confirmar que todo está OK.

## 2. Variables de Entorno (Netlify / Vercel)

Asegúrate de configurar las siguientes variables en tu panel de despliegue:

- `VITE_SUPABASE_URL`: Tu URL del proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: Tu clave anónima (public) de Supabase.

## 3. Resolución de Problemas

- **Bucle de carga**: Si la app se queda "pensando", revisa la consola del navegador. Si ves errores de 404 en las tablas, vuelve al Paso 1.
- **Error de sesión**: Si el login rebota, asegúrate de tener activado el "Email Confirmation" en Supabase Auth o desactívalo si prefieres acceso inmediato.

---
*Hecho con Antigravity MEGAFIX 1.0*
