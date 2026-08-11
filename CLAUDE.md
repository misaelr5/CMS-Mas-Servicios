# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MAS SERVICIOS CMS** is an internal financial operations platform for managing currency exchange bags (bolsas de divisas), cash registers (cajas), daily reports, expenses, and closures. The system enforces role-based access control (RBAC) and maintains complete audit logs of all financial operations.

**Key Constraints**:
- All monetary calculations must handle proper rounding (no floating-point errors)
- Financial operations are immutable once daily report is closed
- Every action touching money/closures writes an audit log
- Session timeout is fixed at 12 hours
- All roles must be validated server-side (never trust client claims)

## Technology Stack

- **Frontend**: Next.js 15+ (App Router), React 19+, Tailwind CSS, Shadcn/UI (Radix primitives)
- **Backend**: Next.js Server Actions ("use server"), Node.js runtime
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Language**: TypeScript (strict mode, no `any`)
- **Auth**: Supabase Auth + custom session management + role-based gates

## Architecture: Domain-Driven Layers

The codebase is organized by **domain** with **layered architecture**:

```
src/modules/[domain]/
  ├── domain/          # Business rules (pure functions, no DB deps)
  │   └── *-rules.ts   # Validations, calculations, domain logic
  └── application/     # Use cases (coordinates domain + services)
      └── *-usecases.ts

lib/
  ├── [domain]/        # Service layer (DB access + coordination)
  │   ├── [domain]-service.ts
  │   └── [domain]-calculations.ts
  └── supabase/        # DB client, auth, RLS enforcement

app/actions/          # Server Actions ("use server" entry points)
components/[domain]/  # React components (grouped by domain, not by type)
```

**Why this structure**: Domain logic stays testable and independent. Services orchestrate domain + DB. Actions are thin wrappers over services. Components consume domain-aware services, not raw DB.

## Key Domains

| Domain | Purpose | Key Files |
|--------|---------|-----------|
| **daily-reports** | Daily PF profit, adjustments, manual corrections | `src/modules/daily-reports/domain/daily-report-rules.ts` |
| **bags** | Currency bags (USD cash, tracked cost, internal transfers) | `lib/bags/bag-service.ts`, `bag-calculations.ts` |
| **cash-registers** | Pago Facil cash registers, daily loads by category | `lib/cash/cash-service.ts`, `cash-calculations.ts` |
| **expenses** | Expense tracking (pendiente/pagado/imputado/anulado) | `lib/finance/expense-service.ts` |
| **weekly-closures** | Weekly cash closure (read-only after locked) | `lib/finance/weekly-cash-closure-service.ts` |
| **audit** | Audit log creation for critical operations | `lib/audit/audit-log.ts` |

## Common Development Commands

```bash
# Local development
pnpm dev                 # Start Next.js dev server (localhost:3000)

# Linting & type checking
pnpm lint               # Run ESLint

# Database
pnpm seed:roman         # Create/sync the roman@maservicios.ar user
pnpm seed:operational   # Load operational data (initial bags, cash registers)

# Build & production
pnpm build              # Build for production
pnpm start              # Start production server
```

**Environment**: Create `.env.local` with Supabase keys (see `.env.example`).

## How to Add a Feature

Follow this sequence:

1. **Domain logic first** (`src/modules/[domain]/domain/*-rules.ts`):
   - Write pure validation/calculation functions
   - No DB access, no side effects
   - Export types and validation functions
   - Example: `validateManualAdjustment()` returns `{ ok, message }`

2. **Service layer** (`lib/[domain]/*-service.ts`):
   - Fetch/mutate data via Supabase admin client
   - Call domain functions for business rules
   - Handle DB errors, map to user-friendly messages
   - Use `createAuditLog()` for critical operations

3. **Server Action** (`app/actions/[domain].ts`):
   - Mark with `"use server"`
   - Get current user/role via `getServerAuthContext()`
   - Check permissions: `const canWrite = role === "admin" || role === "encargado"`
   - Call service, return `{ ok: boolean, message: string }`
   - Revalidate paths: `revalidatePath("/reporte-diario")`

4. **Components** (`components/[domain]/`):
   - Call server actions via form or button handlers
   - Display error/success messages from action result
   - Use Shadcn UI components (Dialog, Table, Input, Button, etc.)

**Example**: Adding a new adjustment type for daily reports:
- Add type to `DailyReportAdjustmentType` in `lib/db/types.ts`
- Add validation in `src/modules/daily-reports/domain/daily-report-rules.ts`
- Add `adjustmentTypeLabels` entry in `lib/finance/daily-report-calculations.ts`
- Update the adjustment form component
- Test with `/cms-logic-validator` before merging

## Database & RLS Strategy

**Supabase schema** lives in `supabase/schema.sql` + migrations in `supabase/migrations/`.

**Row-Level Security (RLS)** policies enforce:
- Users see only their branch/assigned cash registers
- Admins/encargados see all
- Cajeros see only assigned registers
- Audit logs are always readable (append-only)

**Run migrations locally**:
- Apply in Supabase SQL Editor first
- Then `pnpm seed:*` to load initial data
- RLS policies attach automatically on INSERT/UPDATE/DELETE

## Money Handling & Rounding

**Critical**: All monetary calculations use `Number` (never float precision errors). Apply rounding at presentation layer only.

```typescript
// In domain/daily-report-rules.ts:
export function calculateDailyReportTotals({ cashReports, adjustments, expenses }) {
  // Sum amounts as integers (cents)
  const total = cashReports.reduce((sum, r) => sum + Number(r.total_profit_ars ?? 0), 0);
  return { total }; // Never Math.round here
}

// In components: format for display
const formatted = (total / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
```

**Signs matter**:
- `pf_manual_negative` → negate the absolute value
- `currency_manual_positive` → keep positive
- Expenses subtract from gross profit

**Validations in domain**:
- Amount > 0
- Reason is not empty
- Adjustment type is one of the allowed values

## Roles & Access Control

```typescript
type Role = "admin" | "encargado" | "cajero" | "viewer";

// Typical gate:
const canWrite = role === "admin" || role === "encargado";
if (!canWrite) return { ok: false, message: "No tienes permiso." };
```

- **admin**: Full access, can unlock closures, modify any audit record
- **encargado**: Operational manager, can load cajas, see all reports, close day
- **cajero**: Load own cash register only
- **viewer**: Read-only

**Every server action must gate by role**. Check in `app/actions/` before calling service.

## Error Handling

**User-facing errors** should be Spanish and specific:
```typescript
const { ok, error } = await supabaseAdminClient.from("...").select(...);
if (error) {
  const message = getFriendlySupabaseErrorMessage(error);
  return { ok: false as const, message };
}
```

**Common Supabase errors**:
- Schema cache issues → "Tabla no encontrada, contacta admin"
- RLS violation → "No tienes acceso a este registro"
- Constraint violation → specific message (e.g., "Bolsa ya existe")

**Use `createAuditLog()`** for any monetary operation, closure change, or user-facing action. It captures user ID, action, entity ID, changes, and timestamps.

## Testing the App Locally

1. **Auth flow**: `/login` with `roman@maservicios.ar` / `Rom5an`
2. **Dashboard**: `/dashboard` shows operational summary
3. **Add cajas**: `/cajas` → `/cajas/[id]/cargar` to load daily cash
4. **Add bolsas**: `/bolsas/nueva-operacion` for currency operations
5. **Daily report**: `/reporte-diario` with adjustments and expense tracking
6. **Closures**: `/cierres` for daily/weekly finalization
7. **Exportaciones**: `/exportaciones/[tipo]` for CSV/print backups

**Before submitting a PR**:
- [ ] Feature works end-to-end locally (login → action → export)
- [ ] Audit logs are created for money operations
- [ ] Role gates prevent unauthorized access
- [ ] Error messages are user-friendly Spanish
- [ ] Monetary calculations are correct (test with edge cases: 0, very large amounts, negative adjustments)

## Next Steps (Active ECC Skills)

When working with this repo:

- **`/cms-feature-builder`** — Add features respecting domain layers
- **`/cms-logic-validator`** — Validate money calculations before merge (catches rounding bugs, sign errors)
- **`/cms-security-audit`** — Review RLS, role gates, and secret exposure (runs before commit)
- **`/code-review`** — Review code quality, patterns, and adherence to architecture
- **`/verify`** — Test the feature end-to-end in the running app

