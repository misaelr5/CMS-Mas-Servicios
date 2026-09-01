# Stack y arquitectura

## Stack comprobado

| Capa | Tecnologia real | Evidencia |
| --- | --- | --- |
| Lenguaje | TypeScript estricto, SQL y JavaScript ESM para seeds | `tsconfig.json`; `supabase/**/*.sql`; `scripts/*.mjs` |
| Framework | Next.js 16.2.9, App Router, React 19.2.7 | lockfile, `app/`, build |
| Frontend | React Server/Client Components, Tailwind CSS 3.4, Radix UI, componentes estilo shadcn, Lucide | `components/`, `tailwind.config.ts`, `components.json` |
| Backend | Next Server Actions, una Route Handler CSV y proxy de Next | `app/actions/`, `app/api/`, `proxy.ts` |
| Base de datos | Supabase Postgres | `lib/supabase/`, `supabase/` |
| ORM | Ninguno. Supabase JS/PostgREST con queries manuales | llamadas `.from()` en `lib/` y `app/actions/` |
| Auth | Supabase Auth email/password + cookie/localStorage de ventana propia de 12 h | `components/auth/login-form.tsx`; `lib/auth/session.ts` |
| Usuarios | Supabase Admin API + `profiles` + `user_roles` | `app/(app)/usuarios/` |
| Roles | `admin`, `encargado`, `cajero`, `viewer`; checks de ruta/action y RLS | `lib/auth/roles.ts`; SQL |
| Package manager | pnpm; lockfile v9. El repo no fija version de pnpm | `pnpm-lock.yaml`; `pnpm-workspace.yaml` |
| Runtime | Node; no existe `engines` ni `.nvmrc`. Auditado con Node 24.15.0 | `package.json`; entorno local |
| Infraestructura | Supabase externo. Hosting no declarado | `.env.example`; ausencia de config de hosting |
| Testing | Ninguno en `master` | `package.json`; ausencia de archivos test/spec |
| CI/CD | Ninguno | ausencia de workflows; GitHub API: 0 workflows y 0 deployments |

Las dependencias usan rangos como `next: "latest"`, aunque el lockfile fija las versiones efectivas. Esto hace que una regeneracion del lock pueda introducir upgrades mayores sin decision explicita.

## Arquitectura actual

Flujo principal:

1. La pagina App Router obtiene `AuthContext` y datos de servicios.
2. Los formularios invocan Server Actions.
3. Las actions validan manualmente rol y `FormData`.
4. Los servicios usan un cliente Supabase `service_role`, que evita RLS.
5. La action hace varias escrituras y agrega `audit_logs`/`notes`.
6. `revalidatePath` refresca vistas.

Es una arquitectura monolitica por capas, apropiada para el tamaño del MVP, pero el limite entre dominio y persistencia es debil: calculos, autorizacion, queries, compensaciones y mensajes viven juntos. El caso extremo es `lib/bags/bag-service.ts` con 1.131 lineas.

## Arbol principal

```text
.
|- app/
|  |- (app)/                 pantallas protegidas
|  |- (auth)/login/          autenticacion
|  |- actions/               mutaciones server-side
|  `- api/bolsas/[id]/csv/   unico endpoint HTTP de negocio
|- components/
|  |- auth/ bags/ cash/ closures/ expenses/ notes/ reports/
|  `- ui/                    primitivas visuales
|- lib/
|  |- audit/ auth/ bags/ cash/ finance/ notes/ operations/
|  |- db/types.ts
|  `- supabase/              clientes browser/server/admin
|- scripts/                  seeds administrativos
|- supabase/
|  |- schema.sql
|  `- migrations/            siete SQL manuales
|- proxy.ts                  autenticacion de rutas
|- package.json
|- pnpm-lock.yaml
`- README.md
```

## Rutas/pantallas

```text
/
/login
/dashboard
/bolsas
/bolsas/[id]
/bolsas/nueva-operacion
/bolsas/[id]/cierre-diario
/bolsas/[id]/vender-a-bolsa
/cajas
/cajas/[id]
/cajas/[id]/cargar
/reporte-diario
/gastos
/cierres
/usuarios
/configuracion
/api/bolsas/[id]/csv
```

No hay API REST general: casi toda mutacion usa Server Actions. El CSV valida autenticacion dentro del handler y limita a un cajero a sus bolsas.

## Estado Git relevante

- `master` y `origin/master`: `bb7fe869`, limpios al inicio.
- `origin/codex/exportaciones-6-2`: 35 commits adelante, 155 archivos cambiados, 11.855 inserciones y 4.604 eliminaciones.
- La rama remota agrega arquitectura modular en `src/modules`, Vitest, Playwright, hardening RLS, exportaciones y documentacion.
- No debe fusionarse a ciegas: conserva al menos el defecto de anulacion historica en el servicio de bolsas y no fue ejecutada durante esta auditoria.

## Evaluacion arquitectonica

- Mantener el monolito Next + Supabase: **KEEP**.
- Introducir microservicios: **REMOVE de alcance**; no se justifican.
- Separar reglas puras y puertos de persistencia: **ADAPT** desde la rama remota.
- Ejecutar movimientos financieros y anulaciones en funciones transaccionales de PostgreSQL: **BUILD**.
- Mantener `service_role` exclusivamente en servidor, con guardas previas obligatorias y funciones de dominio transaccionales: **REFACTOR**.
