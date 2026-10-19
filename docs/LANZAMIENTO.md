# Plan para el lanzamiento oficial

Hoy Platto está en **modo demo** para mostrar a socios e inversionistas: la PWA y la app (iOS y Android) funcionan con datos de ejemplo de Cúcuta y videos de Pexels, sin cuentas conectadas ni costos variables.

Este documento recoge lo que se decidió para el lanzamiento oficial (conversación del 19 de octubre de 2026). Nada de esto está activo todavía.

## 1. Videos: rápidos y sin cobros sorpresa

| Pieza | Servicio | Costo | Protección |
| --- | --- | --- | --- |
| Recepción, conversión y originales | Servidor Contabo (Cloud VPS 10 o superior) | ~€4,50 al mes, fijo | Tráfico sin cobro adicional |
| Entrega a los usuarios | Bunny CDN (zona *pull* con Contabo como origen) | US$0,01 por GB en Norteamérica, US$0,045 por GB en Suramérica | Saldo prepagado **sin recarga automática** + **tope mensual de ancho de banda** en la zona + límite de solicitudes por IP |

- **Se elimina Cloudflare Stream:** cobra por reproducción sin tope de gasto.
- **No se usa la CDN gratis de Cloudflare para los videos:** sus condiciones no permiten servir video guardado fuera de Cloudflare.
- **Tope de Bunny:** holgado frente al uso real, con alerta al 70 %. Si se alcanza, los videos se pausan hasta el mes siguiente en lugar de cobrar más.

### Calidad y rapidez
- **Lo que sube el restaurante:** video vertical en 1080 × 1920. Se guarda el original y se generan tres versiones en H.264 (MP4 preparado para arrancar mientras descarga):
  - **1080p** (3 a 5 MB): Wi-Fi o conexión rápida.
  - **720p** (1 a 2 MB): datos móviles.
  - **480p** (~0,5 MB): señal débil.
- **Elección automática:** la app escoge la calidad según la conexión. En el Perfil habrá un ajuste «Ver siempre en alta calidad».
- **Velocidad:**
  - Precarga de los 2 o 3 platos siguientes.
  - Caché de videos en el teléfono (`useCaching` de expo-video).
  - Foto de portada inmediata y reintento automático si una descarga falla.
- **Meta:** que un video precargado arranque en menos de 0,3 s en 4G.
- **HEVC:** todo se convierte a H.264, así los videos de iPhone en HEVC se reproducen en cualquier teléfono y navegador.

## 2. Base de datos y usuarios: Supabase con tope
- **Piloto:** plan gratis sin tarjeta. Al llegar al límite se frena; tras 7 días sin uso el proyecto se pausa.
- **Con restaurantes pagando:** plan Pro (US$25 al mes) con el **tope de gasto activado**, para que lo extra se bloquee en vez de cobrarse.

## 3. Reglas para evitar cobros excesivos
1. **Solo dos tipos de servicio:** de precio fijo o con tope que frene el uso. Nada que cobre por uso sin límite.
2. **Tarjeta virtual con cupo bajo,** separada de la cuenta principal. Sin tarjeta donde no haga falta.
3. **Alertas de facturación** al 50, 80 y 100 %, que lleguen a ambos socios. En Google Cloud los presupuestos solo avisan, así que ahí se usan cuotas diarias.
4. **Llave de Google Maps (Android):**
   - Restringida al paquete `co.platto.app` y solo a «Maps SDK for Android».
   - Con cuotas diarias.
   - Sin habilitar Places ni Geocoding.
5. **Protecciones en el código:**
   - Límites de solicitudes por usuario en las funciones del servidor.
   - Enlaces de subida que vencen en minutos, con tamaño máximo.
   - Interruptor de emergencia para apagar subidas o el feed.
6. **Revisión semanal** de consumos durante el piloto.
7. **Si aparece un cobro raro:**
   - Pausar el servicio.
   - Cambiar las llaves.
   - Escribir a soporte.
   - La tarjeta de cupo bajo limita el daño mientras tanto.

## 4. Pendientes técnicos para salir de la demo
- Conectar la PWA y la app a Supabase: inicio de sesión real y quitar los controles de demo.
- Montar la conversión de videos en Contabo y conectar Bunny (reemplaza `video-upload-url` y `stream-webhook` de Cloudflare).
- Páginas legales: términos, privacidad y tratamiento de datos (Ley 1581 de 2012).
- Registrar la marca «Platto» en la SIC (clases 9, 35, 42 y 43).
- **Cuentas de las tiendas:**
  - Apple Developer (US$99 al año).
  - Google Play (US$25 una vez).
  - Expo (gratis).
- Compilar con EAS y enviar a revisión (ver `apps/mobile/README.md`).
- Reemplazar los videos de Pexels por los videos reales de cada restaurante.
