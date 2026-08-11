# QA Checklist MAS SERVICIOS

Checklist operativo final.

## Login

- [ ] Ingresar a `/login` con usuario valido.
- [ ] Confirmar sesion de 12 horas.
- [ ] Cerrar sesion manualmente.
- [ ] Verificar redireccion al vencer la sesion.
- [ ] El mensaje de sesion vencida es claro.

## Roles

- [ ] `admin` ve todo.
- [ ] `encargado` ve operacion completa.
- [ ] `cajero` ve lo asignado.
- [ ] `viewer` solo lectura.
- [ ] No hay acciones visibles para roles que no las pueden usar.

## Dashboard

- [ ] `/dashboard` carga sin errores.
- [ ] Se entiende en menos de 30 segundos.
- [ ] Las metricas criticas quedan arriba.
- [ ] Centro y Terminal se leen rapido.
- [ ] Las bolsas muestran solo resumen simple.
- [ ] Las alertas son visibles y claras.

## Bolsas

- [ ] `/bolsas` carga las 5 bolsas.
- [ ] `/bolsas/[id]` muestra detalle e historial.
- [ ] `/bolsas/nueva-operacion` guarda una operacion.
- [ ] `/bolsas/[id]/vender-a-bolsa` funciona.
- [ ] La venta interna no suma ganancia.
- [ ] No se puede vender mas USD de los disponibles.
- [ ] No se puede vender a la misma bolsa.

## Vender a otra bolsa

- [ ] El traspaso descuenta y acredita de forma atomica.
- [ ] Si falla una parte, no queda inconsistencia.
- [ ] La operacion queda auditada.

## Cajas

- [ ] `/cajas` muestra las 5 cajas.
- [ ] La vista general no muestra ruido innecesario.
- [ ] Cada tarjeta muestra estado, operado, ganancia y ultima actualizacion.
- [ ] Centro y Terminal quedan separados visualmente.
- [ ] El cajero ve su caja asignada.

## Carga diaria

- [ ] `/cajas/[id]/cargar` guarda carga diaria.
- [ ] `Monto operado` y `Ganancia / comision` no se confunden.
- [ ] Se puede guardar parcial.
- [ ] No hay doble envio por doble click.
- [ ] El reporte cerrado bloquea edicion.
- [ ] La semana cerrada bloquea edicion.

## Reporte diario

- [ ] `/reporte-diario` carga por fecha.
- [ ] El resumen general se ve sin abrir detalles.
- [ ] Centro y Terminal se comparan rapido.
- [ ] Las tablas pesadas quedan bajo detalle opcional o plegable.
- [ ] No se muestran acciones sin permiso.

## Gastos

- [ ] `/gastos` lista gastos del dia.
- [ ] Los filtros funcionan.
- [ ] Se puede anular con motivo.
- [ ] Un gasto anulado no descuenta.

## Ajustes

- [ ] Los ajustes manuales se crean con motivo.
- [ ] Un ajuste anulado no impacta.
- [ ] Queda auditoria registrada.

## Cierre diario

- [ ] Se puede cerrar dia con permisos.
- [ ] Cajero no puede cerrar dia.
- [ ] Reabrir exige motivo.
- [ ] Un reporte cerrado bloquea edicion.

## Cierre semanal

- [ ] Se puede cerrar semana con permisos.
- [ ] Cajero no puede cerrar semana.
- [ ] Reabrir exige motivo.
- [ ] Una semana cerrada bloquea edicion.

## Exportaciones

- [ ] `/exportaciones` muestra solo lo permitido por rol.
- [ ] Viewer no puede exportar.
- [ ] Cajero no puede exportar todo.
- [ ] La exportacion no modifica datos.
- [ ] El CSV se genera correctamente.

## Auditoria

- [ ] Operaciones criticas quedan en `audit_logs`.
- [ ] Bolsa, caja, gasto, ajuste, cierre y exportacion quedan auditados.
- [ ] Se registra motivo cuando aplica.

## Notas

- [ ] Se pueden crear notas internas.
- [ ] Se pueden resolver o anular con motivo.
- [ ] Las notas urgentes aparecen en el dashboard.

## Permisos

- [ ] Cajero no puede anular gastos.
- [ ] Cajero no puede crear ajustes.
- [ ] Cajero no puede cerrar dia.
- [ ] Cajero no puede cerrar semana.
- [ ] Viewer no puede modificar datos.
- [ ] Viewer no puede exportar.

## Build

- [ ] Ejecutar `pnpm build`.
- [ ] Confirmar que termina sin errores.

## Deploy

- [ ] Variables cargadas.
- [ ] Build exitoso.
- [ ] Login probado.
- [ ] Rutas protegidas probadas.
- [ ] Supabase responde.
- [ ] Logs revisados.

## Backups

- [ ] Tabla critica respaldada o exportada.
- [ ] CSVs operativos guardados.
- [ ] Se conoce el rollback manual.
- [ ] El incidente queda documentado si hubo error.
