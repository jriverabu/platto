# Platto · PWA

Platto como app web instalable: se abre con un link o un QR y se agrega a la pantalla de inicio del teléfono. Incluye los tres lados del producto conectados entre sí:

- **Comensal:** feed de platos en video de 10 s, búsqueda por zona, cocina y precio, perfil del restaurante, reserva con franjas y cupo reales, mis reservas, calificación verificada.
- **Restaurante:** bandeja de solicitudes con cuenta regresiva, agenda del día (llegó / no llegó), menú con subida y recorte de video a 10 s, reseñas con respuesta, horarios y cupos, plan y estadísticas.
- **Administrador:** aprobación de videos, estado de restaurantes y suscripciones, moderación de reseñas.

Hoy corre en **modo demo**: los datos viven en el navegador (`src/data/store.ts`) y se aplican las mismas reglas que la base de datos usando `@platto/core`. Un botón **Demo** cambia de rol y adelanta el reloj para mostrar flujos que toman horas (calificar 2 h después, gracia de 7 días).

## Comandos

```bash
npm install
npm run build        # genera dist/
npm run dev          # compila al guardar y sirve en http://localhost:5173
npm run videos       # regenera los videos de demostración (Python + Playwright + ffmpeg)
python3 scripts/e2e.py   # recorrido completo en Chromium con capturas
```

## Publicar

`dist/` es un sitio estático. Cualquiera de estas opciones sirve y da HTTPS, necesario para instalar la PWA:

- **Vercel o Netlify:** directorio de salida `apps/web/dist`, comando `npm run build -w @platto/web`.
- **Cloudflare Pages:** igual, con el dominio `platto.co` apuntado ahí.

`dist/artifact.html` es la variante que se publica como página dentro de Claude.

## Conectar con Supabase

El siguiente paso es un segundo backend con la misma interfaz que `store.ts`, que llame a las funciones de `supabase/migrations` (`discover_feed`, `get_available_slots`, `create_reservation`, `respond_reservation`, etc.) y suba videos con la función `video-upload-url`. Las pantallas no cambian.
