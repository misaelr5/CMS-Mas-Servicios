# Checklist de Deploy — MAS SERVICIOS CMS

## 1. Pre-deploy (local)

Gate en un solo comando: `pnpm predeploy` (corre `build` + `lint`).

- [x] `pnpm build` termina en verde (sin errores de TypeScript) — verificado
- [x] `pnpm lint` sin errores — verificado
- [x] `.env.local` NO está versionado (`git status` no lo muestra) — verificado
- [x] Sin secrets hardcodeados en el código — scan limpio (JWT/service_role/sk-)
- [x] Smoke en modo producción (`next start`): `/api/health` → 200 `{"status":"ok"}` y `/login` → 200 — verificado localmente

## 2. Base de datos (Supabase SQL Editor)

Aplicar migraciones en orden si la base es nueva:

```
supabase/schema.sql
supabase/migrations/20260611_operational_notes.sql
supabase/migrations/20260612_*.sql
supabase/migrations/20260613_daily_reports_expenses.sql
supabase/migrations/20260616_daily_report_closures.sql
supabase/migrations/20260617_*.sql
supabase/migrations/20260626_audit_logs_insert_lockdown.sql   <-- NUEVA, aplicar sí o sí
```

- [ ] **Migración `20260626_audit_logs_insert_lockdown` aplicada** (cierra el insert de audit_logs a usuarios autenticados)
- [ ] Seeds corridos si la base es nueva: `pnpm seed:roman`, `pnpm seed:operational`
- [ ] Backups/Point-in-time recovery habilitado en Supabase

## 3. Variables de entorno (Vercel)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (solo server; nunca expuesta al cliente)

> Al arrancar, si falta alguna, el log de startup la lista de forma clara
> (ver `instrumentation.ts`).

## 4. Post-deploy (verificación)

- [ ] `GET /api/health` devuelve `200` con `{ "status": "ok" }`
  - Si devuelve `503` → revisar `env.missing` (faltan variables) o `db.ok` (base inalcanzable)
- [ ] Login funciona (`/login`)
- [ ] Smoke test del flujo crítico:
  - [ ] Cargar una caja
  - [ ] Registrar una operación de bolsa
  - [ ] Crear y **anular** un ajuste en `/reporte-diario` (fix reciente)
  - [ ] Cerrar el día
  - [ ] Exportar un CSV
- [ ] Roles: un `viewer` no puede escribir; un `cajero` solo su operatoria

## 5. Rollback

- [ ] Tener a mano el deploy anterior en Vercel (Promote to Production del build previo)
- [ ] La migración de audit_logs es reversible recreando la policy anterior si hiciera falta

---

## Estado de seguridad (al 2026-06-26)

Corregido:
- Control de acceso fail-closed (`canAccessPath`)
- Validación/caps de inputs en server actions
- Bug funcional: anulación de ajustes (leía columna inexistente)
- `entity_href` solo rutas internas
- `audit_logs` insert restringido a service role (migración)
- Fallos de `createAuditLog` ahora se loguean
- Validación de env al arrancar + health-check

Evaluado y descartado como NO-bug (ver notas del equipo):
- RLS `using(true)` en lectura: consistente con el modelo de roles (todos los roles ven reportes/gastos en la UI; no hay scoping por sucursal en el modelo de datos)
- Redondeo de dinero: columnas `numeric(14,2)` redondean al persistir; el costo promedio mantiene precisión a propósito
- Cookie de sesión sin HttpOnly: es solo un timer de 12h, no el token de auth (ese lo maneja Supabase SSR con cookies httpOnly)
