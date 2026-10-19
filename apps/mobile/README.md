# Platto · App para iOS y Android

Una sola app en **Expo SDK 58 (React Native 0.88, expo-router)** para iPhone y Android, con la identidad visual de Platto (fondo noche, naranja `#FF5A1F`, Poppins, logo de tenedor y plato con play).

Hoy corre en **modo demo**, con los mismos datos y reglas que la PWA (`packages/demo` y `packages/core`): cuatro restaurantes de Cúcuta, videos reales de Pexels y todo el flujo conectado. El siguiente paso es conectarla a Supabase; las pantallas no cambian.

## Qué tiene

| Lado | Pantallas |
| --- | --- |
| Bienvenida | Logo, lema y elección: explorar como comensal o ver como restaurante |
| Comensal | **Inicio**: un plato por pantalla en video vertical de 10 s, barra de 10 segmentos, zonas, guardar, compartir, sonido, promoción del día · **Explorar**: búsqueda, categorías con íconos, zonas, «Con promoción», **Cerca de mí** con la ubicación del teléfono, lista o **mapa** (Apple Maps en iOS, Google Maps en Android) · **Restaurante**: portada en video, promociones, menú en video, opiniones verificadas, información y horarios · **Reservar**: personas, día, franjas con cupo real, nota · **Mis reservas**: estado en vivo, cancelar, calificar · **Calificar**: 1 a 5, platos, etiquetas, comentario · **Perfil**: guardados |
| Restaurante | **Reservas**: solicitudes con cuenta regresiva, aceptar o rechazar, agenda del día (llegó / no llegó), pausar reservas · **Menú**: categorías, platos, disponible / agotado · **Plato**: datos y **video grabado o de la galería, máximo 10 s** (en iOS se recorta en el selector; en Android se rechaza el que dure más) · **Reseñas**: resumen y respuesta pública · **Cuenta**: plan, lo que más se ve, **promociones** (plan Pro) y planes |
| Administrador | Se queda en la web (PWA), que es donde se revisan videos y reseñas |

En **Perfil** y en **Cuenta** hay controles de la demo para pasar de un lado al otro, adelantar el reloj 2 horas (para poder calificar) y reiniciar.

## Demo publicada (para socios)

La app está publicada en Expo, en el proyecto `@jotadee-group/platto`, canal `demo`. Cualquiera la abre con Expo Go escaneando el código de [`docs/demo-app-qr.png`](../../docs/demo-app-qr.png) o con este enlace:

```
exp://u.expo.dev/d1c3f157-1b24-4c6f-92ce-07d36e520650?runtime-version=exposdk%3A58.0.0&channel-name=demo
```

Para publicar cambios (el mismo código QR muestra la versión nueva):

```bash
EXPO_TOKEN=<token del robot platto-claude> npx eas-cli@latest update --branch demo --environment preview --message "Qué cambió" --platform all --non-interactive
```

## Probarla en tu teléfono (sin compilar nada)

1. Instala **Expo Go** desde la App Store o Google Play.
2. En tu computador (Node 20 o superior):
   ```bash
   git clone https://github.com/jriverabu/platto.git
   cd platto/apps/mobile
   npm install
   npx expo start
   ```
3. Escanea el código QR que aparece: con la cámara en iPhone, o desde Expo Go en Android. El teléfono y el computador deben estar en la misma red Wi-Fi (si no, usa `npx expo start --tunnel`).

## Compilar para las tiendas

Requiere cuenta en expo.dev (gratis), Apple Developer (US$99 al año) y Google Play (US$25 una vez).

```bash
npm install -g eas-cli
eas login
eas init                      # crea el proyecto en expo.dev y te da el EAS_PROJECT_ID
eas build --profile preview --platform android   # APK para instalar y mostrar, sin tienda
eas build --profile production --platform all    # binarios para App Store y Play Store
eas submit --platform all                         # los envía a revisión
```

Antes de compilar Android para la tienda, crea en Google Cloud una llave de **Maps SDK for Android** (no tiene costo por uso en apps móviles) y guárdala como variable de entorno `GOOGLE_MAPS_ANDROID_KEY` en expo.dev (Project → Environment variables). En Expo Go el mapa funciona sin ella.

## Comandos

```bash
npx expo start                      # desarrollo con Expo Go
npx tsc --noEmit                    # revisión de tipos
npx expo export --platform web --output-dir dist && python3 scripts/smoke_web.py
                                    # recorrido completo en navegador (versión web de la app)
```

## Cómo está armada

- `src/app/`: pantallas con expo-router. `comensal/` y `negocio/` son las pestañas de cada lado; `restaurante/[id]`, `reservar/[id]`, `reserva/[id]`, `calificar/[id]`, `plato/[id]`, `promociones` y `planes` se abren encima.
- `src/components/`: interfaz (texto con Poppins, botones, chips, tarjetas, hojas, avisos), video con expo-video, mapa y logo.
- `metro.config.js`: usa `packages/core` y `packages/demo` del repositorio y los videos de `apps/web/public/videos`, sin copiarlos.
- Esta carpeta no está en los *workspaces* de npm de la raíz a propósito: tiene su propio `node_modules` con la versión de React que pide Expo, y así la PWA se sigue publicando rápido.
