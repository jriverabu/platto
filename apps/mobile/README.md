# Platto · App móvil (próxima fase)

Una sola app en **Expo (React Native + TypeScript)** para iOS, Android y web. El modo se decide por el rol del usuario: comensal, restaurante o administrador.

Se construye cuando el entorno de desarrollo tenga acceso al registro de npm (ver `docs/CONFIGURACION.md`, sección 8). El backend, las reglas y la marca ya están listos para conectarse.

## Pantallas

| Modo | Pantalla | Usa |
| --- | --- | --- |
| Comensal | Descubrir: feed vertical de platos, autoplay en silencio, barra de 10 segmentos | `discover_feed`, `dish_views` |
| Comensal | Buscar: por zona, cocina y precio | `list_restaurants` |
| Comensal | Restaurante: video de portada, calificación, menú por categorías, reseñas | `dishes`, `reviews`, `restaurant_rating` |
| Comensal | Reservar: personas, día, franja con cupo, nota | `get_available_slots`, `create_reservation` |
| Comensal | Mis reservas: estado en vivo, cancelar, calificar | `reservations`, `cancel_reservation` |
| Comensal | Calificar: 1 a 5, platos que pidió, etiquetas, comentario | `reviews` |
| Comensal | Perfil y guardados | `profiles`, `saved_dishes` |
| Restaurante | Reservas: solicitudes con cuenta regresiva, agenda del día, llegó / no llegó | `respond_reservation`, `mark_attendance`, Realtime |
| Restaurante | Menú: categorías, platos, precios, disponibilidad | `menu_categories`, `dishes` |
| Restaurante | Video del plato: grabar o elegir, recortar a 10 s, subir, estado de revisión | `video-upload-url`, `checkVideo` |
| Restaurante | Horarios: franjas, cupo y días cerrados | `availability_rules`, `blackout_dates` |
| Restaurante | Reseñas: leer y responder | `reply_review` |
| Restaurante | Suscripción y estadísticas | `subscription-checkout`, `restaurant_stats` |
| Admin | Restaurantes, videos por revisar, reseñas reportadas | `review_dish_video`, `set_review_hidden` |

## Librerías previstas

`expo-router` (navegación), `expo-video` (reproducción HLS con precarga), `expo-image-picker` (grabar y recortar; en iOS limita a 10 s con `videoMaxDuration`), `expo-notifications` (push), `@supabase/supabase-js` (datos y tiempo real), `@expo-google-fonts/*` (Big Shoulders Display, Figtree, DM Mono), `@platto/core` (reglas y marca de este repositorio).

## Diseño

La identidad visual sigue el prototipo de diseño del proyecto y está codificada en `packages/core/src/brand.ts`.
