# Opciones open source

Investigacion realizada el 2026-08-31 contra metadata actual de GitHub. La actividad es el ultimo `pushed_at`, no una garantia de calidad. Antes de instalar, revisar release concreta, changelog, advisories y bundle.

| Repo | Lenguaje/licencia | Actividad | Compatibilidad y uso posible | No copiar/adoptar |
| --- | --- | --- | --- | --- |
| [Supabase](https://github.com/supabase/supabase) | TypeScript, Apache-2.0 | 2026-09-01 | **INTEGRATE ya existente**: Auth, Postgres, RLS y CLI/migraciones | No usar `service_role` como sustituto de autorizacion/transaccion |
| [Apache Casbin Node](https://github.com/apache/casbin-node-casbin) | TypeScript, Apache-2.0 | 2026-08-13 | RBAC/ABAC potente si permisos crecen fuera de Postgres | No agregar ahora: duplica roles+RLS para cuatro roles simples |
| [decimal.js](https://github.com/MikeMcl/decimal.js) | JavaScript, MIT | 2026-08-30 | **INTEGRATE** para calculos ARS/USD deterministas | No reemplaza constraints ni atomicidad DB |
| [Dinero.js](https://github.com/dinerojs/dinero.js) | TypeScript, MIT | 2026-08-27 | Alternativa de dominio monetario y monedas | No mezclar simultaneamente con decimal.js; elegir una convencion |
| [Medici](https://github.com/flash-oss/medici) | TypeScript, MIT | 2026-07-29 | Referencia activa de doble partida | Usa Mongoose/MongoDB: incompatible con Postgres; no integrar |
| [BigCapital](https://github.com/bigcapitalhq/bigcapital) | TypeScript, **AGPL-3.0** | 2026-08-31 | Referencia de accounting/reporting | No copiar codigo ni incrustar sin decision legal/obligaciones AGPL |
| [pgAudit](https://github.com/pgaudit/pgaudit) | C, licencia PostgreSQL | 2026-07-30 | Auditoria DB adicional si Supabase permite extension/config | No reemplaza audit log de negocio ni resuelve contexto humano |
| [Zod](https://github.com/colinhacks/zod) | TypeScript, MIT | 2026-09-01 | **INTEGRATE** para schemas de FormData/env y mensajes consistentes | No confiar solo en cliente; validar en servidor y DB |
| [Vitest](https://github.com/vitest-dev/vitest) | TypeScript, MIT | 2026-08-31 | **INTEGRATE** unitarios rapidos; ya hay candidato en rama remota | No usar mocks como reemplazo de integracion Postgres |
| [Playwright](https://github.com/microsoft/playwright) | TypeScript, Apache-2.0 | 2026-08-31 | **INTEGRATE** E2E multi-browser; candidato en rama remota | No correr tests mutables contra produccion |
| [Recharts](https://github.com/recharts/recharts) | TypeScript, MIT | 2026-08-31 | Graficos React si aparecen decisiones que realmente los necesiten | No agregar por estetica al MVP |
| [Tremor](https://github.com/tremorlabs/tremor) | TypeScript, Apache-2.0 | 2025-10-10 | Componentes copy/paste compatibles conceptualmente | Actividad menor y riesgo de romper identidad actual; no migrar UI |
| [json2csv](https://github.com/juanjoDiaz/json2csv) | TypeScript, MIT | 2026-08-06 | CSV complejo/streaming y transformaciones | Export actual es pequeno; nativo es suficiente por ahora |
| [fast-csv](https://github.com/C2FO/fast-csv) | TypeScript, MIT | 2026-08-30 | Alternativa de CSV streaming | No instalar si no hay volumen o imports |
| [ExcelJS](https://github.com/exceljs/exceljs) | JavaScript, MIT | 2025-01-21 | XLSX con estilos si se vuelve requisito | Actividad de codigo baja y gran superficie; evaluar release/advisories |

## Decisiones build/reuse

| Componente | Decision | Razon |
| --- | --- | --- |
| RBAC | REUSE/ADAPT Supabase RLS | Ya cubre el modelo; Casbin seria duplicacion |
| Audit log de negocio | ADAPT el actual + triggers/append-only | Necesita semantica de actor, motivo y entidad propia |
| Auditoria DB | INTEGRATE pgAudit solo si hosting lo soporta | Defensa adicional, no fuente funcional |
| Dinero | INTEGRATE decimal.js o Dinero, no ambos | Evitar IEEE-754 y centralizar redondeo |
| Ledger | BUILD una capa Postgres pequena y transaccional | Ninguna opcion evaluada encaja sin cambiar DB/licencia/alcance |
| Accounting completo | NO INTEGRAR ahora | BigCapital es producto AGPL y sobredimensionado |
| Dashboard | KEEP UI actual | Recharts solo ante requerimiento analitico concreto |
| CSV | KEEP nativo + hardening de formula injection | Libreria solo con streaming/imports/formatos complejos |
| XLSX | INTEGRATE mas adelante tras evaluar ExcelJS | No es funcionalidad actual |
| Tests | ADAPT Vitest/Playwright desde rama remota | Alineados con stack y activos |
| Validacion | INTEGRATE Zod | Reduce duplicacion y errores de entrada |

El moat no esta en reimplementar auth, charts o CSV; esta en reglas correctas, trazabilidad, integridad transaccional y una UX operativa simple.
