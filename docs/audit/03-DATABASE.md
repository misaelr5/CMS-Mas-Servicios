# Base de datos

## Estado

El diseño declarado es Supabase Postgres con RLS y SQL manual. No hay Supabase CLI (`supabase/config.toml`), herramienta local ni credenciales; por lo tanto, existencia de tablas, version de migraciones, datos y politicas desplegadas son **NO VERIFICADO**.

## Modelo declarado (19 tablas)

| Tabla | PK y relaciones principales | Proposito |
| --- | --- | --- |
| `profiles` | PK/FK `id -> auth.users` | Perfil interno |
| `user_roles` | PK `id`, UNIQUE/FK `user_id -> profiles` | Un rol por usuario |
| `branches` | PK `id`, UNIQUE `slug` | Sucursales |
| `cash_registers` | FK `branch_id`, UNIQUE `slug`, UNIQUE `(branch_id,name)` | Cajas |
| `bags` | UNIQUE `slug`, FK responsable | Saldos agregados de bolsa |
| `bag_assignments` | FK bolsa/usuario, UNIQUE par | Asignaciones |
| `bag_operations` | FK bolsa/usuario y, tras migracion, transferencias relacionadas | Historial financiero |
| `bag_internal_transfers` | FK bolsas y operaciones espejo | Transferencias internas |
| `bag_daily_snapshots` | FK bolsa | Corte diario |
| `cash_report_categories` | UNIQUE `name` | Categorias Pago Facil |
| `cash_daily_reports` | FK caja/sucursal, UNIQUE `(cash_register_id,report_date)` | Cabecera diaria de caja |
| `cash_daily_report_lines` | FK reporte/categoria, UNIQUE par | Detalle diario |
| `daily_reports` | FK sucursal, UNIQUE `(branch_id,report_date)` | Consolidado diario |
| `report_adjustments` | FK reporte | Ajustes manuales |
| `expenses` | FK sucursal | Gastos |
| `weekly_cash_closures` | UNIQUE `week_start_date` | Cabecera semanal |
| `weekly_cash_closure_lines` | FK cierre/caja/sucursal, UNIQUE cierre-caja | Snapshot semanal |
| `notes` | `entity_id` polimorfico sin FK | Notas operativas |
| `audit_logs` | FK actor; entidad polimorfica | Auditoria aplicativa |

## Dinero y precision

La DB usa correctamente `numeric(14,2)` para ARS y `numeric(14,4)` para USD/cotizaciones; no se encontro `float`, `real` ni `money`. Sin embargo, Supabase devuelve numeric como valores que el codigo convierte repetidamente con `Number`, y los calculos usan IEEE-754 (`amountUsd * rateArs`). Esto puede introducir centavos/residuos antes de persistir. Usar Decimal o enteros de unidad minima y redondeo explicito por frontera.

## Integridad y rendimiento

| Prioridad | Hallazgo | Evidencia/recomendacion |
| --- | --- | --- |
| P0 | Anulacion historica restaura valores `previous_*` sin recomputar movimientos siguientes | Reemplazar por asiento compensatorio atomico o reconstruccion ordenada |
| P1 | Read-modify-write de saldos sin lock/transaccion | RPC Postgres con `SELECT ... FOR UPDATE` e insercion+saldo+audit en una transaccion |
| P1 | Transferencias escriben cabecera, dos operaciones, enlaces, dos bolsas, notas y logs por separado | Una funcion DB atomica para alta/anulacion |
| P1 | `bag_operations.operation_type/status` no tienen CHECK | Agregar enum/check y constraints de anulacion |
| P1 | `user_roles.role` y `profiles.status` no tienen CHECK | Restringir valores y normalizar |
| P1 | `audit_logs` es falsificable desde cliente autenticado | Eliminar policy insert; solo service role/trigger |
| P2 | Falta UNIQUE `(bag_id,date)` en snapshots | La rama remota incluye indice candidato; revisar duplicados antes de aplicar |
| P2 | `cash_daily_reports.branch_id` y lineas semanales duplican sucursal de caja sin constraint cruzado | Resolver por FK compuesta/trigger o no duplicar |
| P2 | Entidades polimorficas de notas/logs no tienen FK | Validar en action/trigger; documentar borrado y retencion |
| P2 | Indices de consultas por estado+fecha incompletos | Adaptar `20260617_integrity_hardening.sql` de la rama remota |
| P2 | El cierre diario se bloquea solo en codigo; el semanal tiene trigger DB | Agregar enforcement DB coherente |

## Migraciones

Orden real requerido por dependencias:

1. `supabase/schema.sql`
2. `20260611_operational_notes.sql`
3. `20260612_bag_responsibles.sql` (requiere perfiles existentes para asignar)
4. `20260612_bag_internal_transfers.sql`
5. `20260612_cash_pay_facil.sql`
6. `20260613_daily_reports_expenses.sql`
7. `20260616_daily_report_closures.sql`
8. `20260617_weekly_cash_closures.sql`

README solo enumera seis de estos ocho pasos. No hay tabla/versionado de migraciones administrado en repo ni prueba automatica desde una DB vacia.

## Seeds

Los seeds son parcialmente idempotentes, pero mezclan datos de estructura con nombres, UUID y saldos de negocio. `seed-operational-data.mjs` puede fallar por FK si los responsables hardcodeados no existen. Separar fixtures de desarrollo, catalogos de produccion y asignaciones de personas; nunca usar passwords por defecto.
