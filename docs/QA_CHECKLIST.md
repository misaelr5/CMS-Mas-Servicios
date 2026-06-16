# QA Checklist MAS SERVICIOS

Checklist manual para validar el sistema antes de pasar a la siguiente etapa.

## Login

- [ ] Ingresar a `/login` con un usuario valido.
- [ ] Confirmar que la sesion se mantiene 12 horas.
- [ ] Cerrar sesion manualmente.
- [ ] Verificar redireccion al vencerse la sesion.

## Roles

- [ ] `admin` ve todo.
- [ ] `encargado` entra a modulos operativos.
- [ ] `cajero` solo ve lo asignado.
- [ ] `viewer` no puede modificar datos.

## Dashboard

- [ ] `/dashboard` carga sin errores.
- [ ] Se ven resumen del dia y de la semana.
- [ ] Se ven alertas operativas.
- [ ] Se ven accesos rapidos segun permisos.
- [ ] Los links de "Nueva operacion" van a `/bolsas/nueva-operacion?bagId=...`.

## Bolsas

- [ ] `/bolsas` carga las 5 bolsas.
- [ ] `/bolsas/[id]` muestra detalle e historial.
- [ ] `/bolsas/nueva-operacion` guarda una operacion.
- [ ] `/bolsas/[id]/vender-a-bolsa` funciona.

## Cajas

- [ ] `/cajas` muestra las 5 cajas.
- [ ] `/cajas/[id]` muestra detalle.
- [ ] `/cajas/[id]/cargar` guarda carga diaria.

## Reporte diario

- [ ] `/reporte-diario` carga por fecha.
- [ ] Las cajas cargadas se reflejan en el reporte.
- [ ] Las ganancias y gastos muestran totales correctos.
- [ ] El estado del reporte se ve claro.

## Gastos

- [ ] `/gastos` lista gastos del dia.
- [ ] Los filtros funcionan.
- [ ] Los gastos anulados no suman en totales.

## Cierres

- [ ] `/cierres` carga la semana operativa.
- [ ] Se ve el estado del cierre semanal.
- [ ] Se pueden revisar cajas pendientes y revisadas.

## Exportaciones

- [ ] `/exportaciones` muestra los modulos disponibles.
- [ ] `/exportaciones/reporte-diario` genera vista.
- [ ] `/exportaciones/cierre-semanal` genera vista.
- [ ] `/exportaciones/gastos` exporta CSV.
- [ ] `/exportaciones/cargas-cajas` exporta CSV.
- [ ] `/exportaciones/bolsas` exporta CSV.

## Permisos

- [ ] Cajero no puede anular gastos.
- [ ] Cajero no puede crear ajustes.
- [ ] Cajero no puede cerrar dia ni semana.
- [ ] Viewer solo ve lectura.
- [ ] No hay uso de `SUPABASE_SERVICE_ROLE_KEY` en componentes cliente.

## Arquitectura

- [ ] Los calculos nuevos se agregan en `src/modules/*/domain`.
- [ ] Las pantallas no duplican formulas de negocio.
- [ ] Los accesos a Supabase quedan fuera de componentes visuales.

## Auditoria

- [ ] Crear operacion de bolsa y revisar `audit_logs`.
- [ ] Crear carga de caja y revisar `audit_logs`.
- [ ] Crear gasto y revisar `audit_logs`.
- [ ] Crear nota y revisar `audit_logs`.

## Build

- [ ] Ejecutar `pnpm build`.
- [ ] Confirmar que termina sin errores.
