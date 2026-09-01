# Calidad de codigo

## Metricas

- 113 archivos TS/TSX/MJS/SQL y 11.544 lineas.
- 79 apariciones de `any` en TypeScript, concentradas en acceso Supabase.
- Archivos mayores: `lib/bags/bag-service.ts` 1.131 lineas; `app/actions/finance.ts` 551; `lib/finance/daily-report-service.ts` 406.
- No hay TODO/FIXME tecnicos reales.
- Duplicacion visible: `getString`, `safePath`, deteccion de tabla faltante, formateo de fecha/estado y helpers de permisos repetidos.

## Hallazgos

| Prioridad | Hallazgo | Impacto |
| --- | --- | --- |
| P0 | Anulacion no segura de movimientos anteriores | Corrupcion de saldos |
| P1 | Mutaciones multi-tabla sin unidad transaccional | Estados parciales y race conditions |
| P1 | Servicios de lectura/escritura dependen directamente de cliente admin | Acoplamiento, bypass accidental de RLS y tests dificiles |
| P1 | Fallback de operacion guardada como JSON en nota | Dos fuentes de verdad incompatibles |
| P1 | Auditoria best-effort: los resultados de `createAuditLog` se ignoran | Operacion exitosa sin pista de auditoria |
| P2 | Uso extendido de `any` y tipos DB escritos a mano | Drift silencioso entre SQL y TS |
| P2 | Validacion manual, sin limites de longitud/esquemas compartidos | Casos borde y errores inconsistentes |
| P2 | Catch silencioso convierte cualquier error de DB en seeds | Oculta incidentes y muestra datos ficticios como operativos |
| P2 | Archivos y paginas grandes con responsabilidades mezcladas | Mantenimiento y revision complejos |
| P3 | Helpers/markup repetidos | Costo de cambio y consistencia visual |

No se observo SQL construido por concatenacion; el cliente Supabase parametriza filtros. React escapa texto por defecto y no se encontro `dangerouslySetInnerHTML`, `eval` o `new Function`.

## KEEP / REFACTOR / REWRITE / REMOVE

| Modulo | Decision | Motivo |
| --- | --- | --- |
| Next App Router y monolito | KEEP | Adecuado para el MVP |
| Componentes UI, layout y rutas | KEEP | Cobertura amplia y build limpio |
| Calculos puros de reportes/bolsas | REFACTOR | Extraer, usar decimal y cubrir con tests |
| Servicios de lectura | REFACTOR | Puertos tipados y auth explicita |
| Motor de movimientos/anulaciones/transferencias | REWRITE | Debe ser atomico, concurrente y compensatorio |
| Actions de cajas/cierres/usuarios | REFACTOR | Validacion de esquema + transacciones |
| RLS y migraciones | REFACTOR | Scope, constraints e historial reproducible |
| Fallback operativo a seeds | REMOVE de produccion | No debe ocultar fallas de backend |
| Seeds de desarrollo | REFACTOR | Sin PII/passwords/defaults peligrosos |
| Rama `codex/exportaciones-6-2` | ADAPT selectivamente | Contiene trabajo valioso, pero no esta validada y conserva defectos |

## Recomendacion

No hacer un rewrite total. Extraer primero reglas puras y tests; luego sustituir cada write financiero por una funcion transaccional de Postgres. Mantener compatibilidad de UI y contratos durante la migracion.
