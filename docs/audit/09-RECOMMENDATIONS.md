# Recomendaciones

## Objetivo inmediato

Dejar el estado existente confiable y recuperable, sin agregar features. La prioridad no es rediseñar pantallas ni expandir reporting: es impedir acceso indebido y corrupcion de dinero.

## Plan recomendado

### Fase 0 - Preservar y decidir (4-8 h)

1. Confirmar proyecto Supabase/hosting y obtener acceso controlado.
2. Hacer backup y restore de prueba; inventariar migraciones realmente aplicadas.
3. Crear rama de saneamiento desde el estado que el equipo elija.
4. Revisar los 35 commits remotos y seleccionar parches; no merge ciego.

### Fase 1 - P0/P1 de seguridad (16-30 h)

1. Actualizar Next a version parcheada compatible.
2. Guardas server-side obligatorias por pagina, action y handler.
3. RLS scoped por rol/asignacion; audit logs solo server/trigger.
4. Revisar/rotar usuarios del seed, retirar password/log y datos personales del repo.
5. Agregar Gitleaks/CodeQL/dependency audit en CI.

### Fase 2 - Integridad financiera (40-68 h)

1. Especificar invariantes y redondeos con ejemplos reales.
2. Crear RPC transaccionales con row locks e idempotency key.
3. Implementar anulacion por asiento compensatorio; nunca volver a snapshot historico.
4. Unificar transferencia, operaciones espejo, saldos y audit en una transaccion.
5. Agregar constraints e indices despues de auditar datos existentes.

### Fase 3 - Tests y arquitectura (36-56 h)

1. Adaptar reglas puras/ports de la rama remota sin cambiar UX.
2. Vitest para dinero, fechas, cierres y permisos.
3. Integracion real para RLS, migraciones, atomicidad y concurrencia.
4. Playwright para cinco flujos criticos.
5. Eliminar fallback silencioso y tipar DB desde Supabase.

### Fase 4 - Operacion (20-30 h)

1. Staging, variables validadas, health y smoke post-deploy.
2. Backup/restore, observabilidad y manejo seguro de errores.
3. README/runbook/ADR sincronizados.
4. Re-auditoria y decision de habilitar datos reales.

## Estado y avance

| Area | Estado |
| --- | --- |
| Arquitectura | Parcial |
| Frontend | Avanzado |
| Backend | Parcial |
| Base de datos | Parcial |
| Auth | Parcial |
| Usuarios | Inicial |
| Roles | Parcial |
| Logica de negocio | Parcial |
| Testing | No iniciado |
| Seguridad | Inicial |
| Deploy | No iniciado |
| Documentacion | Parcial |

**Avance global: 52%.**

**Codigo aprovechable: 70%.**

**Recomendacion: PARTIAL REWRITE**, limitada a mutaciones financieras/autorizacion, manteniendo UI y estructura de producto.

## Estimaciones

### A. Reconstruir lo existente desde cero

**220-320 horas.** Incluye UI actual, auth/roles, 19 tablas, bolsas, cajas, cierres, gastos, notas, auditoria, CSV, pruebas y base operativa. No incluye ideas futuras.

### B. Sanear el estado actual

**120-180 horas.** Incluye refactor, P0/P1, transacciones, migraciones, tests, seguridad, CI, backup/restore y documentacion. La rama remota puede ahorrar trabajo, pero no elimina la revision.

## Conceptos para aprender

1. **Transaccion e idempotencia:** una operacion de negocio debe persistir todo o nada y repetirse sin duplicar efectos.
2. **Defensa en profundidad:** proxy, pagina, action y RLS cubren fronteras distintas; un gate visual nunca es autorizacion.
3. **Ledger compensatorio:** en finanzas no se rebobina el saldo; se registra un movimiento inverso que conserva la historia.

## Siguiente paso

Autorizar una fase separada de saneamiento: primero backup/estado real de Supabase y revision de la rama remota; luego parche P0 con tests. No desarrollar features hasta cerrar esos bloqueantes.
