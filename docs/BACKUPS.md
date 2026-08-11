# Backups

## Datos criticos

La informacion operativa mas sensible es:

- Usuarios y roles.
- Sucursales y cajas.
- Bolsas y operaciones.
- Reportes diarios.
- Cargas de caja.
- Gastos y ajustes.
- Cierres diarios y semanales.
- Auditoria.
- Notas internas.

## Tablas criticas a respaldar

- `profiles`
- `user_roles`
- `branches`
- `cash_registers`
- `cash_daily_reports`
- `cash_daily_report_lines`
- `bags`
- `bag_operations`
- `daily_reports`
- `expenses`
- `report_adjustments`
- `weekly_cash_closures`
- `weekly_cash_closure_lines`
- `audit_logs`
- `notes`

## Frecuencia recomendada

- Diario: exportacion de tablas criticas o backup administrado.
- Antes de migraciones nuevas: backup completo.
- Antes de cierres semanales importantes: exportacion puntual de CSV.
- Antes de cambios operativos grandes: snapshot manual.

## Responsable operativo

- Admin o encargado designado.
- No delegar el control de backups a cuentas sin permisos de revision.

## Exportar manualmente desde Supabase

- Entrar al SQL Editor o a la vista de tablas.
- Exportar las tablas criticas si el plan lo permite.
- Guardar el archivo con fecha y alcance claro.

## Guardar reportes CSV del sistema

- Usar `/exportaciones`.
- Descargar CSV de reporte diario, cierre semanal, gastos, cargas de cajas y bolsas.
- Guardarlos con nombre y fecha.

## Si una operacion queda inconsistente

- No repetir la accion varias veces.
- Revisar `audit_logs`.
- Revisar la entidad afectada.
- Corregir el estado desde una accion segura o desde el admin de base.
- Documentar el incidente antes de seguir.

## Documentar un incidente

Registrar:

- Fecha y hora.
- Usuario involucrado.
- Ruta o accion.
- Entidad afectada.
- Resultado observado.
- Resolucion aplicada.

## Que NO hacer

- No borrar tablas a mano sin backup.
- No usar el service role en cliente.
- No guardar contraseñas en README o logs.
- No repetir cierres o anulaciones sin revisar primero.
- No confiar solo en la UI para proteger datos.
