# Arquitectura — Hexagonal (Ports & Adapters)

Migración incremental hacia arquitectura hexagonal. El objetivo es que el
**núcleo de dominio/aplicación no dependa de la infraestructura** (Supabase):
el dominio define **puertos** (interfaces) y la infraestructura provee
**adapters** que los implementan. La dependencia se invierte.

## Capas por módulo

Cada dominio vive en `src/modules/<dominio>/` con esta estructura:

```
src/modules/<dominio>/
  domain/            # Entidades, reglas puras y PUERTOS (interfaces). Sin infra.
  application/       # Casos de uso. Dependen de puertos, no de Supabase.
  infrastructure/    # ADAPTERS: implementan los puertos (Supabase, etc.).
  index.ts           # Composition root: cablea adapter -> use case.
```

Regla de dependencias (solo hacia adentro):

```
app/actions  ->  application (use case)  ->  domain (puerto)
                                   ^                 |
                                   |                 v
                        infrastructure (adapter implementa el puerto)
```

- `domain/` no importa nada de `lib/`, `app/` ni `@supabase/*`.
- `application/` importa solo `domain/`.
- `infrastructure/` importa `domain/` + la infra concreta.
- `index.ts` es el único lugar que instancia el adapter concreto.

## Slice de referencia: módulo `audit`

Ya migrado de punta a punta. Usalo como plantilla:

| Archivo | Rol |
|---------|-----|
| `domain/audit-log.ts` | Entidad `AuditLogEntry` + puerto `AuditLogRepository` |
| `application/record-audit-log.ts` | `makeRecordAuditLog(repo)` — caso de uso, depende del puerto |
| `infrastructure/supabase-audit-log-repository.ts` | `SupabaseAuditLogRepository` — adapter |
| `index.ts` | Composition root: instancia el adapter y arma el use case |
| `lib/audit/audit-log.ts` | Facade público (`createAuditLog`) que delega en el composition root |

**Clave:** la firma pública `createAuditLog(input)` no cambió, así que los
callers (`app/actions/*`) siguen igual. La inversión de dependencia es interna.

### Testeo (beneficio del puerto)

```ts
import { makeRecordAuditLog } from "@/src/modules/audit";

const fakeRepo = { save: async () => ({ ok: true as const }) };
const recordAuditLog = makeRecordAuditLog(fakeRepo);
// ...ejercitar el caso de uso sin tocar Supabase.
```

## Checklist de rollout (post-deploy, dominio por dominio)

Cada dominio se migra con el mismo patrón, manteniendo la firma pública del
service en `lib/` como facade para no romper callers:

- [x] **audit** — referencia
- [x] **notes** — `lib/notes/notes-service.ts` (lecturas: list / listImportant)
- [ ] **expenses** — `lib/finance/expense-service.ts`
- [ ] **cash-registers** — `lib/cash/cash-service.ts`
- [ ] **daily-reports** — `lib/finance/daily-report-service.ts`
- [ ] **weekly-closures** — `lib/finance/weekly-cash-closure-service.ts`
- [ ] **bags** — `lib/bags/bag-service.ts` (el más grande; conviene dividirlo al migrar)
- [ ] **exports** — `lib/exportaciones/export-service.ts`

### Pasos por dominio

1. Definir el/los **puerto(s)** en `domain/` (ej. `BagRepository` con
   `findById`, `save`, etc.) a partir de las operaciones que el service ya usa.
2. Crear el **adapter** en `infrastructure/` que implementa el puerto con
   Supabase (mover ahí las queries actuales del service).
3. Reescribir el **caso de uso** en `application/` para depender del puerto
   y orquestar con las reglas puras de `domain/*-rules.ts`.
4. Cablear en `index.ts` (composition root).
5. Convertir el service de `lib/` en **facade** que delega en el composition
   root, conservando su firma pública.
6. Verificar: `pnpm build`, `pnpm lint`, `pnpm e2e`.

> No migrar todo de una. Un dominio por PR, verificado, para mantener el
> deploy estable.
