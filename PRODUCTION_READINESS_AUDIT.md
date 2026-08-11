# 🚨 PRODUCTION READINESS AUDIT - MAS SERVICIOS CMS

**Fecha**: 2026-06-26 | **Plazo**: 4 días | **Severidad General**: ALTA

---

## 📊 RESUMEN EJECUTIVO

Se identificaron **26 hallazgos críticos** que bloquean producción:

| Categoría | Críticos | Altos | Medios | Estado |
|-----------|----------|-------|--------|--------|
| 🔐 **Seguridad** | 3 | 2 | 8 | ⛔ BLOQUEA PROD |
| 💰 **Dinero** | 5 | 8 | - | ⛔ BLOQUEA PROD |
| 📝 **Código** | 0 | 2 | 8 | ⚠️ Mejora |

---

## 🔴 BLOQUEANTES - ARREGLAR ANTES DE VIERNES

### Seguridad (CRÍTICO - 3 hallazgos)

1. **Session cookie sin HttpOnly** → Vulnerable a XSS
   - **Archivo**: `lib/auth/session.ts`
   - **Fix**: Mover session a Server Action, marcar cookie con `httpOnly: true`
   - **Tiempo**: 2 horas
   - **Impacto**: Session hijacking si hay XSS

2. **RLS policies con `using (true)`** → Cualquier usuario autenticado ve TODO
   - **Archivos**: `supabase/migrations/20260613_*.sql` (5 tablas)
   - **Tablas afectadas**: daily_reports, report_adjustments, expenses, weekly_cash_closures, cash_daily_reports
   - **Fix**: Implementar RLS basado en branch_id + rol
   - **Tiempo**: 4-6 horas (reescribir 5 políticas)
   - **Impacto**: Exposición de datos financieros de TODAS las sucursales

3. **Audit logs insertables por usuarios** → Integridad comprometida
   - **Archivo**: `supabase/migrations/20260611_*.sql` línea 325
   - **Fix**: Eliminar política de insert para authenticated users
   - **Tiempo**: 30 minutos
   - **Impacto**: Usuarios pueden falsificar logs

---

### Dinero (CRÍTICO - 5 hallazgos)

4. **Sin redondeo en profit calculations** → Errores flotantes acumulan
   - **Archivos**: `src/modules/daily-reports/domain/daily-report-rules.ts`, `lib/finance/daily-report-calculations.ts`
   - **Fix**: Aplicar `Math.round(value * 100) / 100` a todos los cálculos
   - **Tiempo**: 3 horas
   - **Impacto**: Pérdida de centavos en cada cierre (CRÍTICO)

5. **averageUsdCost sin redondeo** → Ganancias de divisas incorrectas
   - **Archivo**: `lib/bags/bag-calculations.ts`
   - **Fix**: Redondear promedio ponderado
   - **Tiempo**: 1 hora
   - **Impacto**: Ganancias de venta USD son incorrectas

6. **calculateUsdSaleProfit sin redondeo** → Ganancias truncadas
   - **Archivo**: `lib/bags/bag-calculations.ts`
   - **Fix**: Redondear resultado final
   - **Tiempo**: 30 minutos
   - **Impacto**: Pérdida de decimales en ventas de divisas

7. **calculateBagOperationImpact acumula errores** → Saldos inconsistentes
   - **Archivo**: `src/modules/bags/domain/bag-rules.ts`
   - **Fix**: Redondear cada operación
   - **Tiempo**: 2 horas
   - **Impacto**: Saldos de bolsas divergen de realidad

8. **branch_id check silently fails** → Encargado modifica bolsas de otra sucursal
   - **Archivo**: `app/actions/finance.ts` línea 296-298
   - **Fix**: Hacer JOIN con daily_reports para validar branch
   - **Tiempo**: 1 hora
   - **Impacto**: Cross-branch data modification

---

## ⚠️ IMPORTANTES - ARREGLAR EL VIERNES O ANTES DE PRIMER CIERRE

### Seguridad (HIGH - 2 hallazgos)

9. **`canAccessPath` fail-open** → Rutas nuevas son accesibles a todos
   - **Archivo**: `lib/auth/roles.ts` línea 42-50
   - **Fix**: Cambiar default a `false` en lugar de `true`
   - **Tiempo**: 15 minutos
   - **Impacto**: Cualquier nueva ruta es pública por defecto

10. **localStorage stores session** → XSS puede robar session
    - **Archivo**: `lib/auth/session.ts`
    - **Fix**: Eliminar localStorage, solo cookie HttpOnly
    - **Tiempo**: 1 hora
    - **Impacto**: Con #1

---

### Dinero (ALTO - 8 hallazgos)

11. **Estados de gasto ambiguos** → ¿"pagado" e "imputado" son iguales?
    - **Archivo**: `src/modules/expenses/domain/expense-rules.ts`
    - **Fix**: Documentar transiciones válidas, agregar constraint en DB
    - **Tiempo**: 2 horas
    - **Impacto**: Doble conteo de gastos potencial

12. **averageUsdCost no se resetea bien** → Dividir entre 0
    - **Archivo**: `lib/bags/bag-calculations.ts`
    - **Fix**: Agregar check `if (totalUsd === 0) return 0`
    - **Tiempo**: 30 minutos
    - **Impacto**: NaN en cálculos si bolsa se vacía

13-18. **(6 hallazgos más)** - Validación de saldos negativos, conversiones sin validar, etc.

---

## 📝 MEJORAS - DESPUÉS DE VIERNES

### Código (HIGH - 2 hallazgos)

19. **bag-service.ts es demasiado grande** (1413 líneas)
    - **Fix**: Dividir en 3 archivos
    - **Tiempo**: 4-6 horas
    - **Impacto**: Mantenibilidad

20. **console.log en producción** (2 hallazgos)
    - **Fix**: Eliminar o usar logger
    - **Tiempo**: 30 minutos
    - **Impacto**: Información sensible en logs

### Otros (MEDIUM - 8 hallazgos)

21-28. Input validation con Zod, reemplazar `any`, extraer validaciones repetidas, testing, etc.

---

## 📅 PLAN DE 4 DÍAS

### **DÍA 1 (Jueves 6/26) - Seguridad & Dinero Crítico**
```
9:00-11:00   → Arreglar #3 (RLS policies) - PRIORITARIO
11:00-13:00  → Arreglar #4-8 (Redondeos de dinero)
14:00-16:00  → Arreglar #1-2 (Session & audit logs)
16:00-17:00  → Test end-to-end (login → operación → cierre)
```
**Objetivo**: Regresar sin RLS fail-open, dinero correcto, session segura

---

### **DÍA 2 (Viernes 6/27) - Dinero Restante & Code Quality**
```
9:00-11:00   → Arreglar #9-12 (Estados, validaciones)
11:00-13:00  → Arreglar #8 (branch_id check)
14:00-16:00  → Code review: input validation, error handling
16:00-17:00  → Staging deployment test
```
**Objetivo**: Dinero 100% correcto, código sin vulnerabilidades obvias

---

### **DÍA 3 (Sábado 6/28) - QA & Buffer**
```
9:00-12:00   → QA manual: todos los flujos (operación → cierre → exportar)
12:00-14:00  → Feedback fixes, hotfixes
14:00-17:00  → Buffer para issues inesperados
```
**Objetivo**: Confianza en el sistema, no hay sorpresas

---

### **DÍA 4 (Domingo 6/29) - Deploy & Monitoreo**
```
Mañana       → Preparar deploy (variables, backups, rollback plan)
Tarde        → Deploy en staging final
Noche        → Deploy en producción + monitoring 24h
```

---

## ✅ CHECKLIST PRE-PRODUCCIÓN

### Seguridad
- [ ] RLS policies en todas las tablas críticas (5 políticas)
- [ ] Session cookie con `httpOnly: true`
- [ ] Audit logs solo insertables by service role
- [ ] `canAccessPath` default `false`
- [ ] Sin localStorage de session
- [ ] Env vars validadas en startup
- [ ] Sin hardcoded secrets en código

### Dinero
- [ ] Todos los cálculos con redondeo a 2 decimales
- [ ] averageUsdCost redondea correctamente
- [ ] Estados de gasto documentados
- [ ] Validación de saldos negativos con tolerancia
- [ ] Cierres son inmutables una vez cerrados
- [ ] Audit logs para cada operación financiera

### Código
- [ ] Sin console.log en producción
- [ ] Sin `any` types en áreas críticas
- [ ] Error messages son user-friendly (español)
- [ ] Input validation en todas las acciones
- [ ] Manejo de errores Supabase consistente

### Operacional
- [ ] Build exitoso (`pnpm build`)
- [ ] Tests pasan (si hay)
- [ ] E2E flujos críticos funcionan
- [ ] Backups definidos en Supabase
- [ ] Monitoring de RLS/auth configurado
- [ ] Plan de rollback en lugar

---

## 🎯 ORDEN RECOMENDADO (por urgencia + deps)

1. ✅ **Prioridad 1** (Jueves AM - 4h)
   - RLS policies (bloqueante)
   - Redondeos de dinero (bloqueante)

2. ✅ **Prioridad 2** (Jueves PM - 3h)
   - Session segura
   - Audit logs
   - branch_id check

3. ✅ **Prioridad 3** (Viernes AM - 2h)
   - Validaciones de dinero faltantes
   - Canales de acceso

4. ✅ **Prioridad 4** (Viernes PM - 1h)
   - Limpieza de código
   - Tests manual

---

## ⚡ ATAJOS PERMITIDOS (24h antes de deploy)

Si el tiempo se agota, puedes PAUSAR pero NO IGNORAR:

| Issue | ¿Pausable? | Riesgo si pausa |
|-------|-----------|-----------------|
| RLS policies | ❌ NO | Data breach |
| Redondeos dinero | ❌ NO | Pérdida de dinero |
| Session HttpOnly | ❌ NO | Session hijack |
| Input validation | ⚠️ CON CUIDADO | Inyección/DoS |
| Error messages | ✅ SÍ | UX pobre, no seguridad |
| Refactor bag-service | ✅ SÍ | Deuda técnica |

---

## 📞 CONTACTOS CRÍTICOS

Si necesitas ayuda:
- **cms-feature-builder** → Agregar features respetando arquitectura
- **cms-logic-validator** → Validar dinero antes de commit
- **cms-security-audit** → Revisar cambios de seguridad
- **code-review** → Revisar código antes de merge
- **verify** → Testear end-to-end

---

## 📌 NOTAS IMPORTANTES

1. **RLS es lo más crítico** — Sin arreglarlo, cualquier usuario ve todo
2. **Dinero es la segunda prioridad** — Redondeos rotos = dinero perdido
3. **Session segura es tercero** — Sin HttpOnly, cualquier XSS roba sesión
4. **Code quality puede esperar** — Después de las 3 anteriores
5. **Testing es recomendado** — Pero con 4 días, QA manual alcanza

