# MAS SERVICIOS CMS interno

Aplicacion interna de **Mas Servicios** con branding, layout, autenticacion, roles y base operativa preparada.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres con RLS

## Correr el proyecto

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm start
```

## Variables de entorno

Crear un `.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Reglas:

- `NEXT_PUBLIC_SUPABASE_*` puede usarse en navegador.
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en servidor y scripts.
- No hardcodear claves en componentes cliente.

## Logica de sesion

- Al iniciar sesion se guarda `session_started_at`.
- La app calcula `session_expires_at` con una ventana de 12 horas.
- Si la sesion vence, la ruta protegida redirige a `/login` con el mensaje `Tu sesion vencio. Volve a iniciar sesion.`
- El cierre manual limpia la sesion de Supabase y la ventana local de la app.

## Migraciones y seeds

Primero aplicar en Supabase SQL Editor:

```bash
supabase/schema.sql
supabase/migrations/20260611_operational_notes.sql
```

Despues, con `.env.local` cargado, correr seeds idempotentes:

```bash
pnpm seed:roman
pnpm seed:operational
```

El seed operativo deja:

- Sucursales: Centro, Terminal.
- Cajas: Lourdes/Centro, Vicky/Centro, Antonella manana/Centro, Roman/Terminal, Anto tarde/Terminal.
- Bolsas: Bolsa 1 a Bolsa 4 con base ARS 2.000.000 y Bolsa 5 con base ARS 5.000.000.

## Modulo de bolsas

Rutas disponibles:

- `/bolsas`
- `/bolsas/[id]`
- `/bolsas/nueva-operacion`
- `/bolsas/[id]/cierre-diario`
- `/api/bolsas/[id]/csv`

Flujo de prueba recomendado:

1. Entrar a `/bolsas`.
2. Abrir una bolsa.
3. Cargar una compra USD o venta USD desde `/bolsas/nueva-operacion`.
4. Verificar que la operacion quede en el historial.
5. Probar un ajuste manual con nota obligatoria.
6. Probar anulacion de una operacion con motivo.
7. Abrir `/bolsas/[id]/cierre-diario` y guardar un snapshot.
8. Exportar CSV desde el detalle de bolsa.

Validaciones principales:

- No vender mas USD que los disponibles.
- No cargar compra/venta sin cotizacion y cantidad.
- No permitir prestamo, ajuste o anulacion sin nota o motivo.
- Las operaciones quedan auditadas y pueden generar notas relacionadas.

## Tablas preparadas

- `profiles`
- `user_roles`
- `branches`
- `cash_registers`
- `bags`
- `bag_assignments`
- `audit_logs`
- `notes`
- `bag_operations`
- `bag_daily_snapshots`

## Notas internas

Las notas soportan:

- Entidades: `bag`, `bag_operation`, `cash_register`, `cash_daily_report`, `daily_report`, `expense`, `closure`, `general`.
- Prioridad: `normal`, `importante`, `urgente`.
- Estado: `abierta`, `resuelta`, `anulada`.
- Sin borrado fisico: una nota se resuelve o se anula con motivo.
- Auditoria por accion: crear, marcar prioridad, resolver y anular.

## Como probar notas

1. Iniciar sesion en `/login`.
2. Entrar a `/dashboard`, `/bolsas/[id]`, `/cajas/[id]`, `/gastos` o `/cierres`.
3. Crear una nota normal, importante o urgente.
4. Verificar que la nota aparece en el panel.
5. Si es importante o urgente y esta abierta, verificar que aparece en `Notas importantes` del dashboard.
6. Con rol admin o encargado, probar `Resolver`, `Marcar` y `Anular` con motivo.
7. Revisar `audit_logs` en Supabase para confirmar el registro de acciones.
8. Crear una nota desde una bolsa o desde una operacion y verificar que queda vinculada.

## Como verificar datos iniciales

En `/configuracion`, con rol admin, deben verse:

- 2 sucursales.
- 5 cajas.
- 5 bolsas.
- Las bolsas muestran saldos, USD, prestado, ganancia y estado operativo.
- Estado de fuente de datos: `Supabase` si la migracion existe, `Seeds locales` si todavia no esta aplicada.

## RLS a revisar

- Admin: lectura y escritura completa.
- Encargado: lectura operativa y gestion de notas.
- Cajero: lectura/acciones asignadas y creacion de notas operativas.
- Viewer: solo lectura.

Las politicas base estan en `supabase/migrations/20260611_operational_notes.sql` y deben revisarse antes de cargar operaciones reales.
