# Platto

**Descubre restaurantes por sus platos en video de 10 segundos, reserva en dos toques y califica solo si fuiste.**

Platto es un marketplace para Colombia (piloto en Bogotá): los comensales ven cada plato en video vertical, reservan mesa y dejan calificaciones verificadas; los restaurantes pagan una suscripción mensual para aparecer, gestionar su menú y recibir reservas.

## Estado del proyecto

| Parte | Estado | Dónde |
| --- | --- | --- |
| Reglas del negocio (franjas, reservas, calificaciones, suscripciones, video) | Listo, 24 pruebas | [`packages/core`](packages/core) |
| Base de datos, permisos y lógica en Supabase | Listo, probado contra Postgres real | [`supabase/migrations`](supabase/migrations) |
| Funciones del servidor: subida de video (límite 10 s), procesamiento, pagos, notificaciones | Listo, falta conectar cuentas | [`supabase/functions`](supabase/functions) |
| App iOS y Android (Expo) | Pendiente: requiere acceso a npm | [`apps/mobile`](apps/mobile) |
| Guía para crear y conectar las cuentas | Lista | [`docs/CONFIGURACION.md`](docs/CONFIGURACION.md) |

## Cómo funciona

```
Comensal (app)                     Restaurante (app, modo restaurante)        Platto (admin)
─────────────                      ──────────────────────────────────         ──────────────
Descubrir: feed de platos  ◀─────  Sube video ≤ 10 s ──▶ Cloudflare Stream ──▶ Revisa y aprueba
Reservar: elige franja     ─────▶  Recibe solicitud en tiempo real
                                   Acepta / rechaza (2 h para responder)
Recibe confirmación        ◀─────
Llega al restaurante              Marca "llegó" / "no llegó"
Califica (2 h a 14 días)   ─────▶  Ve la reseña y responde una vez
                                   Paga suscripción (Mercado Pago) ──────────▶ Activa / suspende
```

Detalle técnico en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Todas las cifras de las reglas están en [`docs/REGLAS.md`](docs/REGLAS.md).

## Estructura

```
apps/mobile/          App Expo (iOS, Android y web) — próxima fase
packages/core/        Reglas del negocio y marca, sin dependencias, compartidas por todo
supabase/
  migrations/         Esquema, seguridad (RLS) y funciones de negocio
  functions/          Edge Functions (Deno): video, pagos, notificaciones
  seed.sql            Tres restaurantes de ejemplo en Bogotá
  tests/              Pruebas de la base de datos
docs/                 Arquitectura, reglas y configuración de cuentas
scripts/test-db.sh    Corre las pruebas de base de datos en un Postgres limpio
```

## Probarlo

Requisitos: Node 20 o superior y Postgres 15 o superior (o Docker con la CLI de Supabase).

```bash
npm install
npm run test:core                                   # reglas del negocio
PGHOST=localhost PGUSER=postgres npm run test:db    # base de datos completa
```

Con la CLI de Supabase y Docker se levanta todo el backend localmente:

```bash
supabase start        # base de datos, autenticación, API y funciones en tu computador
supabase db reset     # aplica migraciones y datos de ejemplo
```

## Siguiente paso

Construir la app en `apps/mobile` sobre este backend. Ver [`apps/mobile/README.md`](apps/mobile/README.md).

---

© 2026 Platto. Todos los derechos reservados.
