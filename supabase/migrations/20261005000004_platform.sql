-- ============================================================================
-- Platto · 4/4 · Integraciones de la plataforma Supabase
-- Tiempo real para la bandeja de reservas y tareas programadas.
-- Cada bloque revisa que la extensión exista, para que la migración también
-- corra en un Postgres local de pruebas.
-- ============================================================================

-- Tiempo real: el restaurante ve llegar las solicitudes sin recargar.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.reservations;
  else
    raise notice 'Publicación supabase_realtime no encontrada: se omite (entorno local).';
  end if;
end $$;

-- Vencer solicitudes sin respuesta cada 5 minutos.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'platto-expire-pending-reservations',
      '*/5 * * * *',
      'select public.expire_pending_reservations();'
    );
  else
    raise notice 'pg_cron no está disponible: se omite la tarea de vencimiento (entorno local).';
  end if;
end $$;

-- El envío de notificaciones (send-notifications) se programa desde el panel de
-- Supabase con pg_net, porque necesita la URL del proyecto y su llave: ver docs/CONFIGURACION.md.
