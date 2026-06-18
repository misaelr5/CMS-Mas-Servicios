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
- [ ] Se muestran las 5 cajas separadas (Centro: 3, Terminal: 2) con estado, total operado y ganancia PF.
- [ ] Se muestran las 5 bolsas con efectivo, cuenta, USD, comprados hoy, vendidos hoy, ganancia hoy.
- [ ] La tabla consolidada muestra PF | Divisas | Total por sucursal, gastos y ganancia libre.
- [ ] Los StatCards del encabezado muestran PF total, divisas total, gastos y ganancia libre.
- [ ] Se ven alertas operativas (cajas pendientes, reporte sin cerrar, gastos pendientes, etc.).
- [ ] Se ve el resumen operativo de bolsas (efectivo total, cuenta total, USD total).
- [ ] Se ven las notas importantes y urgentes abiertas.
- [ ] Los links de "Nueva operacion" van a `/bolsas/nueva-operacion?bagId=...`.
- [ ] Los accesos rapidos respetan los permisos del rol actual.

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
- [ ] Se muestran las 5 cajas separadas por sucursal (Centro: 3 cajas, Terminal: 2 cajas).
- [ ] Se muestran las 5 bolsas separadas por sucursal (Centro: 3, Terminal: 1, General: 1).
- [ ] La planilla de categorias muestra las 10 filas con monto operado y ganancia PF.
- [ ] El total de ganancia PF suma solo `profit_amount_ars`, NO `operated_amount_ars`.
- [ ] Una venta USD a cliente suma ganancia divisas en la bolsa correspondiente.
- [ ] Una venta interna entre bolsas (`is_internal=true`) NO suma ganancia divisas.
- [ ] Una operacion con `affects_profit=false` NO suma ganancia divisas.
- [ ] Los totales por sucursal (Centro, Terminal) son correctos.
- [ ] La tabla de totales del dia muestra PF | Divisas | Total | Gastos | Ganancia libre.
- [ ] Los ajustes manuales se pueden crear y anular.
- [ ] El reporte se puede cerrar y reabrir.
- [ ] El estado del reporte se ve claro en el badge.

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
- [ ] `/exportaciones/reporte-diario` genera vista con filas por caja, bolsa, sucursal y totales.
- [ ] El CSV de reporte diario incluye columnas: row_type, sucursal, nombre, ganancia_pf_ars, ganancia_divisas_ars, ganancia_libre_ars.
- [ ] Las filas `caja` tienen ganancia_pf_ars correcta.
- [ ] Las filas `bolsa` tienen ganancia_divisas_ars correcta.
- [ ] Las filas `gasto` tienen gastos_ars correcta.
- [ ] Las filas `ajuste` son solo ajustes activos (no anulados).
- [ ] `/exportaciones/cierre-semanal` genera vista.
- [ ] `/exportaciones/gastos` exporta CSV.
- [ ] `/exportaciones/cargas-cajas` exporta CSV.
- [ ] `/exportaciones/bolsas` exporta CSV.

## Permisos

- [ ] Cajero no puede anular gastos.
- [ ] Cajero no puede crear ajustes.
- [ ] Cajero no puede cerrar dia ni semana.
- [ ] Viewer solo ve lectura.
- [ ] Cajero no puede exportar datos.
- [ ] Viewer no puede exportar datos.
- [ ] No hay uso de `SUPABASE_SERVICE_ROLE_KEY` en componentes cliente.

## Arquitectura

- [ ] Los calculos nuevos se agregan en `src/modules/*/domain`.
- [ ] Las pantallas no duplican formulas de negocio.
- [ ] Los accesos a Supabase quedan fuera de componentes visuales.

## Integridad

- [ ] Doble click en guardar operacion de bolsa no duplica registros.
- [ ] No se puede vender mas USD de los disponibles.
- [ ] No se puede vender USD a la misma bolsa.
- [ ] Una venta interna (`is_internal=true`) no suma ganancia divisas en reporte ni dashboard.
- [ ] Una operacion con `affects_profit=false` no suma ganancia divisas.
- [ ] Un gasto anulado no descuenta en los totales.
- [ ] Un ajuste anulado no impacta en el reporte.
- [ ] No se duplican reportes diarios por caja y fecha.
- [ ] No se duplican reportes diarios por sucursal y fecha.
- [ ] No se duplican cierres semanales por rango.
- [ ] No se duplican lineas de cierre semanal por caja.
- [ ] La ganancia libre en reporte diario = PF total + divisas total - gastos (pagados o imputados).

## Auditoria

- [ ] Crear operacion de bolsa y revisar `audit_logs`.
- [ ] Crear carga de caja y revisar `audit_logs`.
- [ ] Crear gasto y revisar `audit_logs`.
- [ ] Crear nota y revisar `audit_logs`.
- [ ] Exportar CSV y revisar `audit_logs`.
- [ ] Cerrar dia y revisar `audit_logs`.
- [ ] Cerrar semana y revisar `audit_logs`.

## Errores

- [ ] Cajero intentando cerrar dia ve un mensaje claro de permisos.
- [ ] Viewer intentando modificar ve `AccessDenied` o mensaje equivalente.
- [ ] Intentar reabrir dia sin motivo muestra validacion clara.
- [ ] Intentar anular gasto sin motivo muestra validacion clara.
- [ ] Intentar editar reporte cerrado muestra mensaje de reporte cerrado.
- [ ] Intentar editar semana cerrada muestra mensaje de semana cerrada.
- [ ] Error de Supabase no muestra stack ni detalle tecnico crudo.

## Build

- [ ] Ejecutar `pnpm build`.
- [ ] Confirmar que termina sin errores.

## Exportaciones - seguridad

- [ ] Viewer entra a `/exportaciones` y no ve botones.
- [ ] Viewer intenta llamar CSV por URL directa y recibe `403`.
- [ ] Cajero no puede exportar todo.
- [ ] Cajero solo puede exportar su caja asignada si la relación existe de forma confiable.
- [ ] Admin puede exportar todo.
- [ ] Encargado puede exportar reportes operativos.
- [ ] Exportación bloqueada no genera archivo.
- [ ] Exportación válida genera `audit_log`.

## Credenciales

- [ ] No se imprimen contraseñas en consola al crear usuarios.

## UX - simplificacion

- [ ] `/dashboard` se entiende en menos de 30 segundos.
- [ ] Las metricas criticas quedan arriba y el detalle debajo.
- [ ] Las bolsas muestran solo un resumen simple.
- [ ] Las cajas muestran estado, operado, ganancia y ultima actualizacion.
- [ ] `/cajas` no muestra tablas pesadas ni ruido innecesario.
- [ ] `/cajas/[id]` muestra solo las ultimas cargas y el historial completo queda como detalle opcional.
- [ ] `/cajas/[id]` deja las notas al final de la pantalla.
- [ ] `/cajas/[id]/cargar` deja claro que monto operado y ganancia son campos distintos.
- [ ] `/cajas/[id]/cargar` permite guardar parcial sin confundir al operador.
- [ ] `/reporte-diario` muestra el resumen general sin abrir nada.
- [ ] Centro y Terminal se comparan rapido.
- [ ] Los detalles avanzados quedan debajo o colapsados.
