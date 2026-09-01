# Deuda tecnica priorizada

## Backlog

| ID | Pri. | Trabajo | Esfuerzo | Dependencia/nota |
| --- | --- | --- | --- | --- |
| SEC-01 | P0 | Parchar Next y agregar guard server-side a todas las rutas antes de queries admin | 8-16 h | Tests de acceso anon/roles |
| FIN-01 | P0 | Sustituir anulacion por compensacion/replay seguro | 16-28 h | Definir regla contable con negocio |
| FIN-02 | P1 | RPC transaccional para operacion y transferencia de bolsas con locks | 24-40 h | Backup y migracion |
| SEC-02 | P1 | RLS scoped y audit log append-only | 8-16 h | Adaptar migraciones remotas |
| SEC-03 | P1 | Upgrade controlado Next/sharp/PostCSS y lock estable | 4-8 h | Requiere tests |
| SEC-04 | P1 | Retirar defaults/logs, revisar cuentas/rotar passwords y PII del repo | 4-10 h | Acceso al proyecto real |
| DB-01 | P1 | Constraints, indices, cierre DB y migraciones reproducibles con Supabase CLI | 12-24 h | Limpiar datos previos |
| QA-01 | P1 | Vitest + integracion DB para dinero, cierres, RLS y concurrencia | 24-40 h | Motor transaccional definido |
| QA-02 | P1 | Playwright critico y CI CodeQL/Gitleaks/build/lint/test | 16-28 h | Staging |
| ARCH-01 | P2 | Adaptar puertos/dominio de rama remota y reducir servicios/actions grandes | 16-28 h | No mover codigo sin tests |
| DATA-01 | P2 | Eliminar fallback operativo/JSON-en-notas; modo demo explicito | 6-12 h | Decidir UX sin DB |
| SEC-05 | P2 | Zod, limites, errores seguros, headers y CSV injection | 10-18 h | Puede avanzar en paralelo |
| OPS-01 | P2 | Deploy/staging, health, backup/restore, monitoreo y runbook | 16-28 h | Elegir hosting |
| DOC-01 | P3 | Sincronizar README, modelo, ADR y operacion | 6-10 h | Tras decisiones finales |

Los esfuerzos se solapan; no deben sumarse mecanicamente. Rango consolidado para un estado tecnicamente sano: **120-180 h**.

## Rama remota recuperable

`origin/codex/exportaciones-6-2` contiene:

- Vitest y Playwright iniciales.
- RLS scoped y bloqueo de insert en audit logs.
- indices de integridad/rendimiento.
- validacion de env, health check, docs deploy/QA.
- modularizacion parcial y exportaciones.

Debe revisarse commit por commit o por grupos. No fusionar completa antes de corregir el motor financiero: su `annullBagOperation` conserva la restauracion historica insegura y un rollback incorrecto.

## Deuda producto/operacion

- No esta documentado quien aprueba ajustes, reaperturas o rotacion de responsables.
- No hay politica de retencion/backup/auditoria.
- No hay definicion formal de redondeo, fecha de corte y tipo de cambio.
- No se sabe si los seeds coinciden con produccion.
- No hay evidencia de despliegue ni dominio operativo.

Estas preguntas son parte de la correccion tecnica; no son nuevas funcionalidades.
