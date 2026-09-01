# CMS MAS SERVICIOS - Resumen ejecutivo

Fecha de auditoria: 2026-08-31

Repositorio: `misaelr5/CMS-Mas-Servicios`

Rama auditada: `master`

Commit: `bb7fe8698d0e112d432d22b2b89eafbd4a0a6129` (`Add weekly cash closure flow`, 2026-06-16)

Alcance: recuperacion local, lectura de codigo y SQL, ejecucion local sin credenciales, validaciones, seguridad y prior art. No se modifico funcionalidad.

## Resultado

- Repositorio clonado correctamente y limpio antes de la auditoria.
- `master` es la rama por defecto. Existe `origin/codex/exportaciones-6-2`, exactamente 35 commits por delante y sin commits exclusivos en `master`. Esa rama contiene tests, refactors y hardening, pero no esta integrada ni fue validada como estado principal.
- Instalacion reproducible: PASS con el lockfile (`corepack pnpm install --frozen-lockfile`).
- Lint: PASS.
- TypeScript estricto: PASS.
- Build de produccion: PASS; se generaron 17 rutas y el proxy.
- Servidor de desarrollo: YES. `/login` respondio 200, `/` redirigio a `/dashboard`, `/dashboard` redirigio a login sin configuracion y el CSV devolvio 401.
- Tests: NO EXISTEN en `master`; `pnpm run test` falla porque no hay script.
- Base Supabase real, migraciones aplicadas y flujos autenticados: **NO VERIFICADO**, porque no existe `.env.local` y no se inventaron credenciales.

## Hallazgos bloqueantes

| ID | Prioridad | Hallazgo | Evidencia |
| --- | --- | --- | --- |
| SEC-01 | P0 | Posible exposicion de datos si se evita el proxy: Next 16.2.9 tiene advisory alto de bypass del proxy y 8 paginas consultan datos con `service_role` sin un guard server-side `if (!auth)`. El gate cliente no protege el payload RSC. | `proxy.ts:8-74`; `app/(app)/bolsas/page.tsx:16-20`; `app/(app)/cajas/page.tsx:15-18`; `pnpm audit --prod` |
| FIN-01 | P0 | Anular una operacion de bolsa restaura el snapshot anterior de esa operacion sin comprobar movimientos posteriores; puede borrar su efecto del saldo actual. | `lib/bags/bag-service.ts:1190-1227` |
| FIN-02 | P1 | Operaciones, transferencias, cierres y altas de usuario hacen varias escrituras sin transaccion. Un fallo parcial o dos solicitudes concurrentes pueden dejar saldos, historial, lineas y auditoria inconsistentes. | `lib/bags/bag-service.ts:403-535`; `app/actions/weekly-cash-closure.ts:115-166`; `app/(app)/usuarios/actions.ts:33-76` |
| SEC-02 | P1 | RLS permite a cualquier autenticado leer gran parte de la operacion y permite falsificar filas de `audit_logs` con su propio `user_id`. | `supabase/migrations/20260611_operational_notes.sql:253-391`; migraciones siguientes |
| SEC-03 | P1 | Dependencias con 16 advisories: 9 altos y 7 moderados. Next 16.2.9 esta por debajo de 16.2.11 y `sharp` 0.34.5 por debajo de 0.35.0. | `pnpm audit --prod` |
| SEC-04 | P1 | Seed de admin inseguro: password debil hardcodeada e impresion de la password efectiva en consola. El repo publico contiene nombres, emails y UUID de personal. | `scripts/create-roman-user.mjs:18-25,114`; `scripts/seed-operational-data.mjs` |
| QA-01 | P1 | No hay tests, CI/CD ni validacion automatica de migraciones. La rama remota contiene candidatos, pero no cuenta como validacion de `master`. | `package.json`; ausencia de `.github/workflows`; GitHub reporta 0 workflows |

No se encontraron secretos reales en archivos actuales mediante busqueda de patrones; esto no sustituye un scan historico con Gitleaks.

## Estado por area

| Area | Estado | Motivo |
| --- | --- | --- |
| Arquitectura | Parcial | Capas UI/actions/services presentes, pero dominio y persistencia estan mezclados y los writes no son atomicos. |
| Frontend | Avanzado | Pantallas responsive y componentes para todos los flujos actuales; sin pruebas visuales/E2E en `master`. |
| Backend | Parcial | Server Actions y servicios cubren el negocio, con P0/P1 de integridad y autorizacion. |
| Base de datos | Parcial | 19 tablas, FK, `numeric` y RLS; migraciones manuales, constraints e indices incompletos. Instancia real no verificada. |
| Auth | Parcial | Supabase Auth y ventana de 12 h; cookie manipulable y dependencia excesiva del proxy. |
| Usuarios | Inicial | Listado y alta admin; no hay edicion, baja, reset ni ciclo de vida completo. |
| Roles | Parcial | Cuatro roles y checks en actions; RLS de lectura no respeta todo el alcance esperado. |
| Logica de negocio | Parcial | Flujos amplios, pero anulaciones/concurrencia impiden considerarla confiable. |
| Testing | No iniciado | No hay tests ni script en `master`. |
| Seguridad | Inicial | Existen RLS y checks, pero hay P0/P1 y dependencias vulnerables. |
| Deploy | No iniciado | Sin workflow, configuracion de hosting, deployments GitHub ni runbook en `master`. |
| Documentacion | Parcial | README detallado, pero lista de migraciones/tablas incompleta y notas internas mezclan especificacion y estado. |

**Avance global aproximado: 52%.** La cobertura visual y funcional es considerable, pero un CMS financiero no puede contarse como avanzado mientras integridad, autorizacion, tests y operacion real no esten verificadas.

## Decision

- Recomendacion global: **PARTIAL REWRITE**.
- Codigo aprovechable: **70% aproximado** (UI, rutas, modelos conceptuales, consultas de lectura, estilos y gran parte de las reglas).
- Reescritura acotada: motor de mutaciones financieras/anulaciones como transacciones PostgreSQL/RPC, mas guardas server-side y RLS.
- No se justifica un full rewrite.
- Valor tecnico de reconstruir lo existente: **220-320 h**.
- Horas para sanear el estado actual, incorporando selectivamente la rama remota: **120-180 h**.

Siguiente paso: congelar nuevas features, respaldar la base real, revisar y probar la rama remota, y corregir SEC-01/FIN-01/FIN-02 antes de cargar dinero real.
