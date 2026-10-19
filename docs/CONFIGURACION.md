# Configuración de cuentas y servicios

Pasos para poner Platto en marcha con cuentas reales. Hazlos en orden; cada sección dice qué valor guardar para la siguiente. Ninguna llave secreta va en el repositorio: se guardan con `supabase secrets set`.

## 1. Supabase (base de datos, usuarios y servidor)

1. Crea una cuenta en supabase.com y un proyecto nuevo. Región recomendada: **South America (São Paulo)**, la más cercana a Colombia.
2. Guarda de *Project Settings → API*: la URL del proyecto, la `anon key` y la `service_role key` (esta última es secreta).
3. Instala la CLI de Supabase y conecta el repositorio:
   ```bash
   supabase login
   supabase link --project-ref <ref-del-proyecto>
   supabase db push          # aplica las 4 migraciones
   ```
4. En *Database → Extensions* confirma que `pg_cron` y `pg_net` estén activas.
5. Regístrate en la app (o en *Authentication → Users*) y conviértete en administrador desde el editor SQL:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'tu@correo.com');
   ```
6. En *Authentication → Providers* activa correo. Google y Apple se activan cuando tengas las cuentas de las secciones 5 y 6.

## 2. Cloudflare Stream (video)

1. Crea una cuenta en cloudflare.com y activa **Stream** (*Stream → Get started*). El plan mínimo es de US$5 al mes por 1.000 minutos almacenados.
2. Copia tu **Account ID** (barra lateral del panel).
3. Crea un token en *My Profile → API Tokens → Create Token* con el permiso **Account · Stream · Edit**.
4. Registra el webhook que avisa cuando un video está listo y guarda el `secret` que devuelve:
   ```bash
   curl -X PUT "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/stream/webhook" \
     -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{"notificationUrl":"https://<ref-del-proyecto>.supabase.co/functions/v1/stream-webhook"}'
   ```

## 3. Mercado Pago (cobro de suscripciones)

1. Crea una cuenta de vendedor en mercadopago.com.co a nombre de la empresa.
2. En *Tus integraciones* crea una aplicación y copia el **Access Token** (usa primero el de prueba).
3. En la aplicación, sección *Webhooks*, configura la URL `https://<ref-del-proyecto>.supabase.co/functions/v1/payments-webhook`, marca los eventos de **Planes y suscripciones** y guarda la **clave secreta** que muestra.
4. Define el precio de cada plan en la base de datos (en pesos, sin puntos):
   ```sql
   update public.plans set price_cop = 000000 where id = 'esencial';
   update public.plans set price_cop = 000000 where id = 'pro';
   ```
5. Prueba el flujo completo con usuarios de prueba de Mercado Pago antes de usar el token de producción.

**Antes de publicar en las tiendas:** Apple y Google tienen reglas sobre cobrar dentro de una app con medios de pago externos. El plan asume que la suscripción del restaurante es un servicio para su negocio, pagado fuera de la app; confirma con la versión vigente de las guías de revisión de cada tienda cómo mostrar ese pago en la app.

## 4. Publicar las funciones del servidor

```bash
supabase secrets set \
  CLOUDFLARE_ACCOUNT_ID=... \
  CLOUDFLARE_STREAM_TOKEN=... \
  CLOUDFLARE_STREAM_WEBHOOK_SECRET=... \
  MERCADOPAGO_ACCESS_TOKEN=... \
  MERCADOPAGO_WEBHOOK_SECRET=... \
  PLATTO_CHECKOUT_RETURN_URL=https://platto.co/pago

supabase functions deploy video-upload-url stream-webhook subscription-checkout payments-webhook send-notifications
```

Programa el envío de notificaciones cada minuto. Primero guarda la `service_role key` en *Project Settings → Vault* con el nombre `service_role_key`, y luego en el editor SQL:

```sql
select cron.schedule('platto-send-notifications', '* * * * *', $$
  select net.http_post(
    url := 'https://<ref-del-proyecto>.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);
```

El vencimiento de solicitudes sin respuesta ya queda programado por la migración 4.

## 5. Apple (App Store)

1. Inscríbete en el Apple Developer Program (US$99 al año). Si es a nombre de la empresa, Apple pide el número D-U-N-S; tramítalo con tiempo.
2. Crea el identificador `co.platto.app` y activa *Sign in with Apple* y *Push Notifications*.

## 6. Google (Play Store)

1. Crea una cuenta de desarrollador de Google Play (pago único de US$25).
2. En Google Cloud crea credenciales OAuth para iniciar sesión con Google y un proyecto de Firebase para las notificaciones de Android (FCM).

## 7. Expo (compilar y publicar la app)

1. Crea una cuenta en expo.dev y un token de acceso; guárdalo como `EXPO_ACCESS_TOKEN` en los secretos de Supabase (para las notificaciones).
2. Para probar sin compilar: Expo Go en el teléfono y `npx expo start` en `apps/mobile` (detalles en `apps/mobile/README.md`).
3. Para las tiendas: `eas init`, `eas build` genera los binarios y `eas submit` los envía. En Android agrega la variable `GOOGLE_MAPS_ANDROID_KEY` (llave gratuita de Maps SDK for Android) en expo.dev.

## 8. npm en el entorno de Claude

Ya funciona. El entorno en la nube enruta npm por fuera del proxy de salida; con estas variables pasa por el proxy y descarga sin problema:

```bash
export npm_config_noproxy=localhost,127.0.0.1 NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1
npm install
```

Otros dominios (por ejemplo bancos de video como Pexels) se habilitan en claude.ai, en **Configuración → Capacidades** (en planes Team o Enterprise, el administrador en *Configuración de la organización → Capacidades*). En tu computador no hace falta nada de esto: `npm install` funciona normal.
