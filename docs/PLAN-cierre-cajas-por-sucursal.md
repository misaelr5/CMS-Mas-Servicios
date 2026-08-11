# Plan — Cierre semanal de cajas POR SUCURSAL (B)

> Pendiente para después del deploy. Toca lógica financiera de cierres + triggers
> de lock, por eso va como cambio aparte, bien testeado.

## Contexto / necesidad

Los depósitos de Pago Fácil son **semanales y en días distintos por sucursal**:

- **Centro**: cajas 1, 2 y 3 → su propio cierre/depósito.
- **Terminal**: cajas 4 y 5 → su cierre/depósito en otro día.

Hoy no se pueden cerrar independientes.

## Estado actual (global por semana)

- `weekly_cash_closures`: **una fila por semana** (`week_start_date` único), un solo `status`.
- `is_weekly_cash_closure_locked(date)`: bloquea la semana **entera** (ambas sucursales).
- `weekly_cash_closure_week_start`: semana fija que arranca el **viernes**.
- La vista (`getWeeklyCashClosureViewData`) **ya** desglosa por sucursal y por caja
  (`branches[]`, `closureLines` con `branch_id`), pero el cierre/lock es global.

## Cambios propuestos

### 1. Migración (nueva, p.ej. `20260628_weekly_closure_per_branch.sql`)
- Agregar `branch_id uuid` a `weekly_cash_closures` (FK a `branches`).
- Cambiar la unicidad: de `unique (week_start_date)` a `unique (week_start_date, branch_id)`.
- Reescribir `is_weekly_cash_closure_locked` para que reciba/considere la sucursal:
  `is_weekly_cash_closure_locked(target_date, branch_id)`.
- Ajustar `prevent_weekly_cash_closure_edit`: derivar el `branch_id` del
  `cash_daily_report` y pasarlo al lock por sucursal.
- Migrar datos existentes: si hay cierres globales previos, duplicarlos por sucursal
  o marcarlos legacy.

### 2. Service (`weekly-cash-closure-service`)
- `closeWeekForBranch({ date, branchId, actorId, note })` y
  `reopenWeekForBranch({ date, branchId, actorId, reason })`.
- `getWeeklyCashClosureLockState(date, branchId)` por sucursal.
- Recalcular totales por sucursal (ya se calculan en la vista).

### 3. Server Actions (`app/actions/weekly-cash-closure.ts`)
- `closeWeeklyCashClosureForBranchAction` / `reopenWeeklyCashClosureForBranchAction`
  (gate admin/encargado), revalidar `/cierres`.

### 4. UI (`/cierres`)
- Botón **Cerrar semana** y **Reabrir** por cada sucursal (Centro / Terminal),
  con su propio estado y fecha de cierre.
- Mostrar lock independiente por sucursal.

## Riesgos
- Cambia la semántica de lock de cierres (financiero) → migración + E2E del flujo
  completo (cargar caja → cerrar Centro → intentar editar Centro bloqueado →
  cerrar Terminal en otro día → reabrir).
- Considerar semanas con días de inicio distintos por sucursal si hiciera falta
  (hoy el inicio de semana es viernes para todos).

## Verificación al implementarlo
- E2E gateado (muta datos): cerrar Centro deja editar Terminal; reabrir desbloquea
  solo la sucursal reabierta.
- `pnpm build`, `pnpm lint`, smoke E2E.
