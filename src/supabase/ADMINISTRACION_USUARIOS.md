# Publicación del administrador de usuarios

La interfaz web nunca debe recibir la clave `service_role`. Las operaciones de Supabase Auth se ejecutan en la Edge Function autenticada `administrar-usuarios`.

## Publicar

Desde la carpeta raíz del proyecto, copia o mueve la carpeta `src/supabase/functions/administrar-usuarios` a `supabase/functions/administrar-usuarios` si la configuración de Supabase se encuentra en la raíz. Luego ejecuta:

```bash
supabase functions deploy administrar-usuarios
```

La verificación JWT debe permanecer habilitada. Supabase proporciona automáticamente `SUPABASE_URL`, `SUPABASE_SECRET_KEYS` y, para proyectos que aún usan claves heredadas, `SUPABASE_SERVICE_ROLE_KEY`. No copies ninguna de esas claves al frontend.

## Comprobación

1. Inicia sesión con un perfil cuyo rol sea `admin`.
2. Abre **Usuarios** y confirma que aparecen correo, estado y último ingreso.
3. Crea una cuenta de prueba con una contraseña temporal de al menos ocho caracteres.
4. Cierra la sesión e inicia con la cuenta nueva.
5. Bloquea la cuenta desde un administrador y comprueba que el acceso sea rechazado.

Mientras la función aún no esté publicada, la lista conserva el modo anterior de solo lectura de `perfiles`, pero crear y bloquear cuentas no estarán disponibles.
