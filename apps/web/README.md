# Platto · PWA

Platto como app web instalable: se abre con un link o un QR y se agrega a la pantalla de inicio del teléfono. Incluye los tres lados del producto conectados entre sí:

- **Comensal:** feed de platos en video de 10 s, búsqueda por zona, cocina, precio y promoción, «Cerca de mí» en lista o mapa, perfil del restaurante, reserva con franjas y cupo reales, mis reservas, calificación verificada.
- **Restaurante:** bandeja de solicitudes con cuenta regresiva, agenda del día (llegó / no llegó), menú con subida y recorte de video a 10 s, reseñas con respuesta, horarios y cupos, promociones (plan Pro), plan y estadísticas.
- **Administrador:** aprobación de videos, estado de restaurantes y suscripciones, moderación de reseñas.

La identidad visual sigue el rediseño de octubre de 2026: logo de tenedor y plato con play, lema «Ve. Elige. Disfruta.», fondo noche y acento naranja. Los datos de ejemplo están en Cúcuta.

Hoy corre en **modo demo**: los datos viven en el navegador (`src/data/store.ts`) y se aplican las mismas reglas que la base de datos usando `@platto/core`. Un botón **Demo** cambia de rol y adelanta el reloj para mostrar flujos que toman horas (calificar 2 h después, gracia de 7 días).

## Comandos

```bash
npm install
npm run build        # genera dist/
npm run dev          # compila al guardar y sirve en http://localhost:5173
npm run videos       # regenera los videos ilustrados de demostración (Python + Playwright + ffmpeg)
python3 scripts/import_stock_videos.py <carpeta>   # cambia las ilustraciones por clips reales de uso libre
python3 scripts/e2e.py   # recorrido completo en Chromium con capturas
```

## Mapa

«Cerca de mí» usa [MapLibre](https://maplibre.org) con los mapas de [OpenFreeMap](https://openfreemap.org): gratis, sin llave ni límite de vistas y con uso comercial permitido (piden mantener el crédito a OpenStreetMap, que MapLibre muestra solo). MapLibre se descarga aparte (`dist/chunks/`) solo cuando alguien abre el mapa. Sin conexión, la app muestra un plano simple con los mismos puntos.

La ubicación del teléfono se pide solo al tocar «Cerca de mí», se usa en el teléfono para ordenar y no se guarda.

## Publicar

`dist/` es un sitio estático. Cualquiera de estas opciones sirve y da HTTPS, necesario para instalar la PWA:

- **Vercel o Netlify:** directorio de salida `apps/web/dist`, comando `npm run build -w @platto/web`.
- **Cloudflare Pages:** igual, con el dominio `platto.co` apuntado ahí.

`dist/artifact.html` es la variante que se publica como página dentro de Claude.

## Conectar con Supabase

El siguiente paso es un segundo backend con la misma interfaz que `store.ts`, que llame a las funciones de `supabase/migrations` (`discover_feed`, `get_available_slots`, `create_reservation`, `respond_reservation`, etc.) y suba videos con la función `video-upload-url`. Las pantallas no cambian.
