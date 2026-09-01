# Testing y validacion automatica

## Ejecucion realizada

| Comando/check | Resultado |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | PASS, 415 paquetes |
| `corepack pnpm lint` | PASS |
| `corepack pnpm exec tsc --noEmit` | PASS |
| `corepack pnpm build` | PASS, 17 rutas + proxy |
| `corepack pnpm dev` | PASS, listo en localhost:3000 |
| HTTP `/login` | 200 |
| HTTP `/` | 307 a `/dashboard` |
| HTTP `/dashboard` sin env/sesion | 307 a login |
| HTTP CSV sin sesion | 401 |
| `corepack pnpm run test` | FAIL esperado: script inexistente |
| `corepack pnpm audit --prod` | FAIL: 16 vulnerabilidades |

No se probaron UI en navegador, Supabase, migraciones o negocio autenticado. La ausencia de credenciales impide esas pruebas sin inventar datos.

## Necesarias ahora

- **ESLint y TypeScript:** ya existen y deben ser gates de CI.
- **Vitest:** reglas puras de dinero, fechas, cierres, permisos, saldos y anulaciones. La rama remota incluye un inicio adaptable.
- **Tests de integracion Postgres/Supabase:** aplicar migraciones desde cero y probar RPC transaccionales/RLS con roles reales. Es mas importante que aumentar snapshots UI.
- **Playwright:** login, cajero asignado/no asignado, alta/anulacion, cierre/reapertura y CSV. Usar proyecto Supabase de staging, nunca produccion.
- **Gitleaks:** historial completo y cada PR.
- **CodeQL:** analisis TypeScript en GitHub Actions.
- **Audit de dependencias:** `pnpm audit --prod` como gate con politica de severidad.

## Utiles despues

- **Semgrep:** reglas de service-role, auth guard y sinks especificos del repo.
- **OWASP ZAP:** DAST contra staging ya desplegado, con contexto autenticado y exclusion de mutaciones destructivas.
- **SonarQube/SonarCloud:** cuando el equipo necesite tendencias/cobertura; hoy agrega operacion antes de resolver P0.
- **Trivy:** si se agrega Docker, IaC o imagenes; hoy no hay artefactos de contenedor.
- **Sentry u observabilidad equivalente:** errores de actions, fallas de audit y latencia, sin loguear datos financieros sensibles.

## Innecesarias para este proyecto

- `pytest`: no hay Python.
- `PHPStan` y `PHPUnit`: no hay PHP.
- Trivy de contenedores hoy: no existe Dockerfile/imagen.
- Jest ademas de Vitest: duplicaria runner sin beneficio.

## Piramide minima

1. Unitarios: calculos y politicas puras.
2. Integracion DB: constraints, RLS, concurrencia y transacciones.
3. E2E: 5-8 recorridos criticos, no toda combinacion visual.
4. Checks operativos: migracion limpia, backup/restore, health y smoke post-deploy.

Criterio de salida antes de dinero real: todos los P0/P1 cubiertos por una regresion automatica, migraciones aplicables desde cero y restore probado.
