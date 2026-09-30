# Notificaciones push

1. Ejecutar `supabase_notificaciones_push.sql` en SQL Editor.
2. Crear en Supabase la Edge Function `enviar-notificacion-push` con el contenido de `supabase/functions/enviar-notificacion-push/index.ts`.
3. Guardar estos secretos en la función:
   - `PUSH_VAPID_PUBLIC_KEY`
   - `PUSH_VAPID_PRIVATE_KEY`
4. Publicar la aplicación en Vercel.
5. Ingresar desde cada teléfono y activar las notificaciones desde la campana.

La clave privada VAPID nunca debe incorporarse al código de la aplicación ni a Git.
