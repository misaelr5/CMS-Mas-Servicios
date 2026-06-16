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
supabase/migrations/20260612_cash_pay_facil.sql
supabase/migrations/20260613_daily_reports_expenses.sql
supabase/migrations/20260616_daily_report_closures.sql
supabase/migrations/20260617_weekly_cash_closures.sql
```

Despues, con `.env.local` cargado, correr seeds idempotentes:

```bash
pnpm seed:roman
pnpm seed:operational
```

El seed operativo deja:

- Sucursales: Centro, Terminal.
- Cajas: Caja 1 Lourdes, Caja 2 Victoria, Caja 3 Antonella, Caja 4 Román, Caja 5 Antonella.
- Categorías Pago Fácil: 10 categorías base.
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

## Exportaciones

El modulo de exportaciones queda disponible en:

- `/exportaciones`
- `/exportaciones/reporte-diario`
- `/exportaciones/cierre-semanal`
- `/exportaciones/gastos`
- `/exportaciones/cargas-cajas`
- `/exportaciones/bolsas`

Desde cada vista se puede:

- Filtrar por fecha y otros parametros segun el tipo de reporte.
- Ver la tabla consolidada en pantalla.
- Descargar CSV.
- Abrir una vista imprimible.

Permisos actuales:

- `admin` y `encargado`: exportan todo.
- `viewer`: solo lectura y exportaciones visibles.
- `cajero`: acceso limitado a `cargas-cajas`.

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
- `cash_report_categories`
- `cash_daily_reports`
- `cash_daily_report_lines`
- `weekly_cash_closures`
- `weekly_cash_closure_lines`
- `bags`
- `bag_assignments`
- `audit_logs`
- `notes`
- `bag_operations`
- `bag_daily_snapshots`

## Modulo de cajas

Rutas disponibles:

- `/cajas`
- `/cajas/[id]`
- `/cajas/[id]/cargar`

Flujo de prueba recomendado:

1. Entrar a `/cajas` con rol admin, encargado o cajero.
2. Verificar el orden de las 5 cajas.
3. Abrir una caja y revisar el historial.
4. Cargar un reporte diario desde `/cajas/[id]/cargar`.
5. Confirmar que se recalculan total operado y ganancia.
6. Crear una nota de caja o de reporte y revisar `audit_logs`.

Reglas principales:

- Admin y encargado cargan y revisan todo.
- Cajero solo carga su caja asignada.
- Viewer ve solo lectura.
- Cada carga se guarda por caja y fecha, sin duplicar registros.
- Las cargas de hoy alimentan el bloque parcial del dashboard.

## Reporte diario y gastos

Rutas disponibles:

- `/reporte-diario`
- `/gastos`

Flujo de prueba recomendado:

1. Entrar a `/reporte-diario` con rol admin o encargado.
2. Cambiar la fecha y confirmar que el resumen por sucursal se actualiza.
3. Crear un ajuste manual y luego anularlo con motivo.
4. Entrar a `/gastos`, crear un gasto, filtrarlo por fecha/sucursal/estado/categoría y anularlo.
5. Revisar el dashboard para verificar gastos hoy, ganancia libre y estado del reporte diario.

Reglas principales:

- Los montos operados no se confunden con la ganancia.
- Los gastos se descuentan de la ganancia libre.
- Los ajustes manuales siempre llevan motivo.
- No se borra nada: ajustes y gastos se anulan.

## Cierre diario

Flujo de prueba:

1. Entrar a `/reporte-diario` con rol admin o encargado.
2. Revisar el estado de cada sucursal.
3. Completar o dejar pendientes algunas cajas.
4. Presionar `Cerrar día` y confirmar.
5. Verificar si quedó `Cerrado` o `Revisar` según el estado de las cajas.
6. Probar `Reabrir día` con motivo obligatorio.
7. Confirmar que, cuando el día está cerrado, no se pueden guardar ajustes, gastos ni cargas de caja.

Validaciones:

- `Cerrar día` crea auditoría y nota si se escribe observación.
- `Reabrir día` exige motivo y crea auditoría y nota obligatoria.
- Un reporte cerrado bloquea edición de ajustes, gastos y cargas de caja.
- El cierre diario no reinicia cajas ni toca bolsas.

## Cierre semanal de Pago Facil

Rutas disponibles:

- `/cierres`

La semana operativa va de viernes a jueves. El selector de fecha toma una fecha cualquiera dentro de esa semana y consolida el rango completo.

Flujo de prueba:

1. Entrar a `/cierres` con rol admin o encargado.
2. Elegir una fecha dentro de la semana a revisar.
3. Verificar el resumen por sucursal, el detalle por caja y el ultimo cierre.
4. Cerrar la semana con una nota opcional.
5. Confirmar que la semana quede en estado `Cerrado` o `Revisar` segun el estado de las cargas.
6. Volver a `/cajas/[id]/cargar` para comprobar que una semana cerrada bloquea nuevas cargas.
7. Reabrir la semana con motivo obligatorio y nota obligatoria.

Reglas principales:

- Solo admin o encargado pueden cerrar o reabrir.
- `Cerrar semana` guarda auditoria y crea nota si se escribe observacion.
- `Reabrir semana` exige motivo y nota obligatoria.
- Si la semana esta cerrada, no se pueden guardar nuevas cargas de caja hasta reabrirla.
- El cierre semanal no modifica bolsas ni operaciones de USD.

## Como verificar auditoria

1. Abrir las tablas de `audit_logs` en Supabase.
2. Buscar acciones `daily_report.closed`, `daily_report.reopened`, `expense.created`, `expense.annulled`, `daily_report_adjustment.created` y `daily_report_adjustment.annulled`.
3. Revisar que el `entity_type` y el `reason` coincidan con la accion realizada.

## Notas internas

Las notas soportan:

- Entidades: `bag`, `bag_operation`, `cash_register`, `cash_daily_report`, `daily_report`, `weekly_cash_closure`, `expense`, `closure`, `general`.
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
