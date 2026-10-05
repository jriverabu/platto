# Reglas del negocio

Cada regla vive en dos lugares que deben coincidir: `packages/core/src/rules.ts` (lo que la app muestra y valida al instante) y la base de datos (que tiene la última palabra). Si cambias una cifra, cámbiala en ambos y corre `npm test`.

| Regla | Valor | App (`RULES.…`) | Base de datos |
| --- | --- | --- | --- |
| Duración máxima del video de un plato | 10 s | `videoMaxSeconds` | `check` en `dishes.duration_seconds`; `maxDurationSeconds` en `video-upload-url`; `stream-webhook` |
| Duración mínima del video | 4 s | `videoMinSeconds` | `stream-webhook` |
| Video vertical (alto / ancho) | ≥ 1,7 | `videoMinAspect` | `stream-webhook` |
| Tiempo del restaurante para responder | 2 h | `responseWindowMinutes` | `private.response_window()` |
| Anticipación mínima para reservar | 1 h | `minLeadMinutes` | `private.min_lead()` |
| Reservar hasta | 30 días | `bookingHorizonDays` | `private.booking_horizon()` |
| Personas por reserva | 1 a 12 | `maxPartySize` | `private.max_party()` y `check` en `reservations` |
| Cancelar una reserva confirmada | hasta 2 h antes | `cancelCutoffMinutes` | `private.cancel_cutoff()` |
| Marcar llegada | desde 30 min antes | `attendanceOpensBeforeMinutes` | `private.attendance_opens_before()` |
| Calificar | de 2 h a 14 días después, solo visitas completadas, una vez | `reviewOpensAfterMinutes`, `reviewClosesAfterDays` | trigger `reviews_validate` |
| Comentario de reseña | hasta 300 caracteres | `reviewCommentMax` | `check` en `reviews.comment` |
| Mostrar promedio público | con 5 reseñas o más | `minReviewsForAverage` | `public.restaurant_rating()` |
| Respuesta del restaurante | una por reseña, hasta 500 caracteres | — | `public.reply_review()` |
| Gracia por pago fallido | 7 días | `subscriptionGraceDays` | `private.restaurant_is_listed()`, `payments-webhook` |
| Platos del plan Esencial | 30 | `PLANS.esencial.maxDishes` | `plans.max_dishes` + trigger `dishes_guard` |

## Garantías que da la base de datos

- **No se sobrevende una franja.** `create_reservation` bloquea el restaurante mientras revisa el cupo, así que dos solicitudes simultáneas no pueden pasar ambas.
- **Ningún video de más de 10 segundos se publica.** Lo impiden Cloudflare al subir, el webhook al procesar y un `check` en la tabla.
- **Un restaurante no puede publicar un video sin revisión,** ni cambiar su estado, ni editar o borrar reseñas.
- **Solo califica quien fue,** y el nombre visible se guarda abreviado ("Camila R.").
- **Un restaurante con pago vencido desaparece** del feed y de las búsquedas después de la gracia, sin perder su menú ni sus videos.
