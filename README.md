# MAS SERVICIOS CMS interno

Aplicacion interna para operar MAS SERVICIOS con foco en cajas Pago Facil, bolsas de divisas, reporte diario, gastos, cierres, notas y exportaciones.

## Modulos implementados

- Login con Supabase Auth y ventana de sesion de 12 horas.
- Dashboard operativo.
- Bolsas de divisas con operaciones, historial y venta entre bolsas.
- Cajas Pago Facil con carga diaria por categoria.
- Reporte diario con ajustes manuales y ganancia libre.
- Gastos con filtros, anulacion y auditoria.
- Cierres diarios y semanales.
- Notas internas.
- Exportaciones CSV y vistas imprimibles.
- Usuarios y configuracion base.

## Roles

- `admin`: acceso total.
- `encargado`: acceso operativo completo.
- `cajero`: acceso a su operatoria asignada.
- `viewer`: solo lectura.

## Flujo diario recomendado

1. Iniciar sesion en `/login`.
2. Revisar `/dashboard`.
3. Cargar cajas en `/cajas` o `/cajas/[id]/cargar`.
4. Registrar operaciones de bolsas en `/bolsas`.
5. Revisar `/reporte-diario`.
6. Cargar o revisar `/gastos`.
7. Registrar notas internas cuando haga falta.
8. Revisar exportaciones si se necesita respaldo.

## Flujo semanal recomendado

1. Revisar `/cierres`.
2. Confirmar cajas cargadas y pendientes.
3. Verificar el estado del cierre semanal.
4. Reabrir solo si hay motivo valido y permiso.
5. Exportar CSV o imprimir si hace falta respaldo operativo.

## Variables de entorno

Crear en `.env.local` o configurar en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL=`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
- `SUPABASE_SERVICE_ROLE_KEY=`

Reglas:

- `NEXT_PUBLIC_*` puede usarse en cliente.
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe usarse en cliente.
- No subir `.env.local`.
- No pegar claves en chats, README ni logs.

## Correr localmente

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm start
```

## Tests

```bash
pnpm test
pnpm e2e
```

`pnpm test` corre pruebas unitarias rapidas sobre reglas de dinero y dominio.
`pnpm e2e` corre Playwright contra la app.

## Scripts disponibles

- `pnpm dev`: desarrollo local.
- `pnpm build`: build de produccion.
- `pnpm start`: arranque en modo produccion.
- `pnpm lint`: lint del proyecto.
- `pnpm test`: tests unitarios de dominio.
- `pnpm e2e`: tests end-to-end con Playwright.
- `pnpm predeploy`: build + lint + tests unitarios.
- `pnpm seed:roman`: crea o sincroniza el usuario principal.
- `pnpm seed:operational`: carga datos operativos iniciales.

## Usuario de desarrollo

Para pruebas locales, el usuario principal queda alineado con Supabase en:

- Email: `roman@maservicios.ar`
- Password: `Rom5an`

El seed tambien reconoce alias viejos si aparecieran en bases anteriores, pero la referencia vigente es `.ar`.

## Migraciones Supabase

Aplicar primero en el SQL Editor de Supabase:

```bash
supabase/schema.sql
supabase/migrations/20260611_operational_notes.sql
supabase/migrations/20260612_bag_internal_transfers.sql
supabase/migrations/20260612_bag_responsibles.sql
supabase/migrations/20260612_cash_pay_facil.sql
supabase/migrations/20260613_daily_reports_expenses.sql
supabase/migrations/20260616_daily_report_closures.sql
supabase/migrations/20260617_integrity_hardening.sql
supabase/migrations/20260617_weekly_cash_closures.sql
supabase/migrations/20260626_audit_logs_insert_lockdown.sql
supabase/migrations/20260627_rls_scope_hardening.sql
```

La migracion `20260627_rls_scope_hardening.sql` es critica: cierra lecturas y escrituras directas por REST fuera del rol/asignacion correspondiente.

Despues correr seeds si hace falta:

```bash
pnpm seed:roman
pnpm seed:operational
```

## Exportar reportes

- `/exportaciones`
- `/exportaciones/reporte-diario`
- `/exportaciones/cierre-semanal`
- `/exportaciones/gastos`
- `/exportaciones/cargas-cajas`
- `/exportaciones/bolsas`

Permisos:

- `admin` y `encargado` exportan todo.
- `cajero` tiene acceso restringido segun asignacion.
- `viewer` no exporta.

## Revisar auditoria

Las acciones criticas escriben en `audit_logs`.

Revisar especialmente:

- Operaciones de bolsa.
- Venta a otra bolsa.
- Cargas de caja.
- Gastos y anulaciones.
- Ajustes y anulaciones.
- Cierre y reapertura diaria.
- Cierre y reapertura semanal.
- Exportaciones.
- Notas.

## Errores comunes

- Falta de variables de entorno en local o Vercel.
- Migraciones no aplicadas en Supabase.
- Usuario sin perfil o sin rol.
- Ruta protegida sin sesion valida.
- Service role usado por error en cliente.

## Antes de usar en produccion

- Build exitoso.
- Variables cargadas.
- Migraciones aplicadas.
- `20260627_rls_scope_hardening.sql` aplicado en Supabase.
- `pnpm predeploy` exitoso.
- Usuario admin creado.
- Roles revisados.
- Exportaciones probadas.
- Backups definidos.
- QA_CHECKLIST ejecutado.
- `SUPABASE_SERVICE_ROLE_KEY` fuera del cliente.
- `.env.local` no versionado.

## Pendientes a futuro

- Mayor automatizacion en cierres.
- Exportaciones PDF dedicadas.
- Analitica historica mas profunda.
- Mas validaciones de consistencia operacional.
- Mejoras de asistencia para el usuario cajero.
