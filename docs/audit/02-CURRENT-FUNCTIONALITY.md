# Funcionalidad actual

## Funciona a nivel de codigo y build

| Modulo | Capacidades encontradas | Estado real |
| --- | --- | --- |
| Login/sesion | Login email/password, logout, ventana local de 12 h, refresh de Supabase, redireccion por rol | Compila y pagina responde; login real NO VERIFICADO |
| Dashboard | Totales de bolsas, cajas/reporte, gastos, cierre semanal y notas importantes | Implementado; datos reales NO VERIFICADO |
| Bolsas | Listado/detalle, asignacion visible, compra/venta USD, pesos, prestamos, ajustes, historial, notas, CSV | Implementado con P0 de anulacion y P1 de atomicidad |
| Transferencia entre bolsas | Compra/venta interna, dos operaciones espejo, notas y anulacion compensatoria | Implementado; no atomico |
| Cierre diario de bolsa | Snapshot con saldos, diferencia y ganancia | Implementado; falta UNIQUE en `bag_id,date` en `master` |
| Cajas Pago Facil | Listado, detalle, carga por categorias, parcial/cargado/revisado, responsable por caja | Implementado; DB real NO VERIFICADO |
| Reporte diario | Consolidacion por sucursal, ajustes, cierre/reapertura y bloqueo aplicativo | Implementado; cierre diario no tiene trigger DB equivalente al semanal |
| Gastos | Alta, filtros, estados, anulacion, notas e impacto sobre ganancia disponible | Implementado; no hay ciclo de edicion/pago dedicado |
| Cierre semanal | Semana viernes-jueves, consolidado, lineas por caja, cierre/reapertura y trigger de bloqueo | Implementado; writes de cabecera/lineas no atomicos |
| Notas | Entidades polimorficas, prioridad, resolver/anular, widget y audit log | Implementado; FK de entidad no comprobable |
| Usuarios | Listar perfiles/roles y crear usuario confirmado | Inicial; alta no atomica, sin editar/desactivar/resetear |
| Configuracion | Vista de roles, sucursales, cajas, bolsas y origen DB/fallback | Solo lectura |

## Operaciones de bolsa modeladas

`compra_usd`, `venta_usd`, ingresos/egresos de pesos en efectivo/cuenta, prestamos entregados/recibidos, devolucion, ajuste manual y anulacion. Las transferencias internas agregan tipos adicionales en DB. Evidencia: `lib/bags/bag-calculations.ts` y `lib/bags/bag-service.ts`.

## Endpoint

`GET /api/bolsas/[id]/csv` exporta historial de una bolsa. Devuelve 401 sin sesion y 403 si un cajero consulta una bolsa no asignada. No hay paginacion ni limite de filas.

## Lo que esta empezado o incompleto

- Conexion y esquema Supabase real: **NO VERIFICADO**.
- README omite dos migraciones existentes (`20260612_bag_responsibles.sql` y `20260612_bag_internal_transfers.sql`) y varias tablas.
- El fallback de seeds presenta configuracion y saldos plausibles cuando Supabase falta o falla; puede ocultar un backend roto.
- `processBagOperation` incluso serializa una operacion dentro de `notes` si falta `bag_operations`, creando dos modelos de persistencia incompatibles (`lib/bags/bag-service.ts:1052-1076`).
- Usuarios carece de edicion, desactivacion, reset de password, revocacion de sesiones y auditoria del alta.
- Reporting solo exporta CSV de bolsas; la rama remota agrega mas exportaciones, pero no pertenece a `master`.
- No hay observabilidad, health check, backup automatizado, runbook de deploy ni CI en `master`.
- No hay pruebas unitarias, integracion ni E2E.

## Codigo abandonado o paralelo

No hay marcadores `TODO/FIXME/HACK/XXX` tecnicos reales. Si existe trabajo abandonado, la mayor evidencia es la rama remota no fusionada. `NOTAS INTERNAS.md` es una especificacion extensa, no una lista confiable de funcionalidades terminadas.

## Mocks y hardcodeados

- Fallback local de 2 sucursales, 5 cajas, 10 categorias y 5 bolsas: `lib/operations/seed-data.ts`.
- Saldos iniciales ARS codificados y UUID deterministas.
- Nombres, emails y UUID de responsables codificados en migraciones/seeds.
- Seed de usuario Roman con email/rol/password por defecto.
- Regla de diferencia de bolsa fija en ARS 5.000: `lib/bags/bag-calculations.ts:34-39`.
- Zona horaria fija Buenos Aires; debe confirmarse como regla de negocio.

## Verificacion funcional

**TESTED:** instalacion, lint, TypeScript, build, arranque dev, `/login`, redirects y 401 del CSV.

**NOT TESTED:** login real, RLS contra Supabase, mutaciones, concurrencia, anulaciones, seeds, migraciones y UI en navegador.

**ASSUMED:** ninguna regla de negocio fuera de lo escrito en codigo/SQL; valores operativos deben validarse con el negocio.
