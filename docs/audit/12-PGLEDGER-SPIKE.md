# CMS Más Servicios — pgledger spike

Fecha: 2026-08-31

Repositorio CMS: `master` / `bb7fe8698d0e112d432d22b2b89eafbd4a0a6129`

Resultado: **GO condicionado para una integración incremental; no se inició la migración.**

## Alcance y aislamiento

El objetivo fue validar experimentalmente concurrencia, FX atómico, rollback,
reversión, idempotencia y aislamiento por RPC antes de tocar el sistema real.

El spike:

- no accedió a Supabase productivo;
- no cargó migraciones, schema ni datos del CMS;
- no modificó código de aplicación;
- no agregó dependencias al `package.json`;
- no hizo merge, commit ni push;
- usó una base `pgledger_spike` dentro de un contenedor con almacenamiento
  `tmpfs`, destruido al finalizar cada ejecución.

Se ejecutó `git fetch --prune origin` como actualización no destructiva. El
resultado fue `HEAD...origin/master = 0/0`: no había cambios remotos que traer y
no se hizo merge/pull sobre los documentos locales sin commit.

## Entorno utilizado

| Componente | Resultado |
| --- | --- |
| Sistema host | Windows + PowerShell |
| Supabase CLI | No disponible |
| PostgreSQL/`psql` nativo | No disponible |
| Docker | Docker Desktop 29.4.3 |
| PostgreSQL | 17.6, `x86_64-pc-linux-musl` |
| Imagen | `postgres:17.6-alpine@sha256:747d5ed1fdeeb124b880fbe3d7c6557d2c4064ae41d6b6297d417882effce4be` |
| Isolation level | `read committed` |
| Puerto | Solo loopback: `127.0.0.1:55432` |
| Persistencia | `tmpfs`; se elimina con el contenedor |

Se prefirió PostgreSQL efímero porque Supabase CLI no estaba instalado y
`pgledger` es SQL PostgreSQL puro. El upstream declara y prueba compatibilidad
con PostgreSQL 15–18. Queda pendiente validar el wrapper a través de PostgREST
y JWT reales en Supabase local/staging durante la Fase A.

## pgledger fijado

- Repositorio: <https://github.com/pgr0ss/pgledger>
- Commit: `c18c7d267d46ab396641d5e44f1ce3166aeb9a6d`
- Fecha del commit: 2026-07-06
- Licencia: MIT
- Fecha de descarga/prueba: 2026-08-31

No se depende de `main`. El runner descarga desde GitHub Raw usando el hash de
commit completo y verifica estos SHA-256 antes de iniciar la base:

| Archivo | SHA-256 de bytes Raw/LF |
| --- | --- |
| `pgledger.sql` | `FC41721E718630C5D98E39788045C4E75CBA5DB922EF6BF00C63973933960720` |
| `uuid-to-ulid.sql` | `507CC0CF4890FC51F2DD900B52E5F5EEFB38F6C5150CDB9A32A886C3817AD04E` |
| `ulid-to-uuid.sql` | `6A4E559C956D1548AD6AB0C4D99755BF5E870A781AE15E0FF178F5D66F8DEB90` |
| `LICENSE` | `644EB6474436995540CEDA2D30188CEEF9284A5F64F5D87F7C3DCFC8CB8BDDC7` |

La primera descarga expuso una diferencia CRLF/LF entre el clone Git de
Windows y GitHub Raw. Se corrigió el manifest para verificar los bytes reales
de transporte. Ningún checksum queda calculado dinámicamente ni aceptado sin
comparación.

## Archivos agregados

El entorno reproducible está en [`spikes/pgledger-poc`](../../spikes/pgledger-poc/README.md):

| Archivo | Propósito |
| --- | --- |
| `compose.yaml` | PostgreSQL 17.6 efímero, imagen por digest y puerto loopback |
| `run-spike.ps1` | Instala desde cero, ejecuta todos los tests y destruye el entorno |
| `scripts/fetch-pgledger.ps1` | Descarga el commit fijo y verifica checksums |
| `sql/10-spike-schema.sql` | Tablas mínimas, idempotencia y cuatro RPC de prueba |
| `sql/20-test-support.sql` | Fixture de cuentas y assertions SQL |
| `sql/30-fx-atomicity.sql` | Compra FX, doble entrada y rollback forzado |
| `sql/40-reversal.sql` | Venta y operación compensatoria |
| `sql/50-idempotency.sql` | Replay exacto y rechazo de payload distinto |
| `scripts/test-concurrency.sh` | Diez carreras simultáneas de USD 800/500 |
| `scripts/test-idempotency-concurrent.sh` | Dos submits simultáneos con la misma clave |
| `scripts/test-rpc-isolation.sh` | Pruebas negativas de tablas/API cruda y RPC autorizada |

`.cache/` contiene únicamente descargas verificadas y está ignorado por Git.

## Modelo mínimo

Cada reset crea solo las cuentas requeridas por los casos:

- `Caja A / ARS`;
- `Caja A / USD`;
- `Caja B / ARS`;
- `Caja B / USD`;
- `Clearing / ARS`;
- `Clearing / USD`;
- `Funding / ARS` y `Funding / USD` exclusivamente para cargar saldos de
  apertura mediante transferencias, sin editar balances directamente.

Las cuentas de caja usan `allow_negative_balance = false`. Clearing y funding
permiten ambos signos en el POC. En producción no existiría un funding libre:
el saldo inicial necesitará una cuenta de apertura/contrapartida definida y
autorizada por negocio.

El dominio mínimo adicional es:

- `spike_app.operations`: `operation_id` primario, tipo, actor, payload
  canónico, `reversal_of`, motivo y estado;
- `spike_app.operation_transfers`: vínculo ordenado 1..N entre operación y
  transferencias de `pgledger`.

Estas tablas demostraron el contrato necesario; no son todavía el schema final
del CMS.

## Patrón RPC probado

Se probaron cuatro wrappers conceptuales:

- `spike_api.execute_fx_purchase(...)`;
- `spike_api.execute_fx_sale(...)`;
- `spike_api.execute_internal_transfer(...)`;
- `spike_api.reverse_operation(...)`.

El patrón relevante está en
[`sql/10-spike-schema.sql`](../../spikes/pgledger-poc/sql/10-spike-schema.sql):

```sql
language plpgsql
security definer
set search_path = pg_catalog, public
```

Además:

1. se revoca `CREATE` sobre `public` a roles cliente;
2. se revoca acceso a tablas/vistas y `EXECUTE` de funciones crudas;
3. solo el rol no-login `spike_owner` puede usar internamente `pgledger`;
4. `authenticated` recibe `USAGE` en `spike_api` y `EXECUTE` únicamente sobre
   wrappers;
5. `actor_user_id` se obtiene de `auth.uid()` y no existe como parámetro;
6. si no hay actor, la RPC falla con `AUTHENTICATION_REQUIRED`;
7. las tablas de dominio tienen RLS activado y no se otorga DML cliente;
8. operación de dominio, transferencias y vínculos comparten una sola
   transacción PostgreSQL.

El `auth.uid()` del POC es un shim que lee `request.jwt.claim.sub`; sirve para
validar el contrato SQL, no para demostrar autenticidad del JWT. En Supabase,
PostgREST debe establecer ese claim después de verificar la sesión. Un cliente
de aplicación no debe tener conexión PostgreSQL directa.

### Hallazgo de `search_path`

Las funciones upstream usan referencias no calificadas como
`pgledger_accounts`. Al invocarlas desde un wrapper con
`search_path = pg_catalog`, fallaron con:

```text
ERROR: relation "pgledger_accounts" does not exist
```

La combinación viable probada fue:

```sql
set search_path = pg_catalog, public;
revoke create on schema public from public, anon, authenticated;
```

Así las funciones encuentran sus objetos y un rol cliente no puede plantar un
objeto homónimo. En la integración real se debe decidir entre conservar este
patrón o instalar el SQL vendorizado en un schema privado `ledger`; ambas
variantes requieren tests de migración y grants.

El parámetro `p_force_second_leg_failure` de la RPC de compra existe solamente
para el fault injection del POC y **no debe pasar a producción**.

## Resultados

| Test | Resultado | Observaciones |
| --- | --- | --- |
| Concurrencia | **PASS** | 10/10 rondas: una venta confirmó y la otra falló; saldo final USD 200 o 500, nunca negativo |
| FX atómico | **PASS** | Una operación lógica produjo dos transferencias y cuatro entradas balanceadas |
| Rollback | **PASS** | Falla provocada en la segunda pierna revirtió balances, operación de dominio y transferencias |
| Reversión | **PASS** | Original y compensación quedaron visibles y relacionados; saldo restaurado |
| Idempotencia | **PASS** | Replay secuencial y simultáneo: una operación, dos transferencias efectivas; payload diferente rechazado |
| RPC wrapper | **PASS** | Tablas y API cruda denegadas; wrapper con actor válido permitido; sin actor rechazado |

Comando final ejecutado:

```powershell
Set-Location spikes/pgledger-poc
.\run-spike.ps1
```

La suite completa se ejecutó varias veces desde una base vacía. La última
ejecución terminó con los seis marcadores `PASS` y eliminó el contenedor.

## Test A — concurrencia

### Escenario

- saldo inicial de `Caja A / USD`: 1.000;
- sesión A: venta de USD 800;
- sesión B: venta de USD 500;
- ambas usan `execute_fx_sale` simultáneamente;
- isolation: PostgreSQL `READ COMMITTED`.

### Locks y comportamiento

`pgledger_create_transfers` reúne todas las cuentas del batch, elimina
duplicados, ordena los IDs y ejecuta `SELECT ... FOR UPDATE` en ese orden. Las
dos ventas comparten las cuentas de Caja A y clearing, por lo que una espera.
La primera confirma; la segunda reanuda contra el balance actualizado y el
constraint lógico de la cuenta rechaza el negativo.

Error real repetido:

```text
ERROR: Account (..., name=Caja A / USD) does not allow negative balance
```

En la última corrida, la venta de 800 ganó 3 rondas y la de 500 ganó 7. Ese
orden no es contractual. En las 10 rondas hubo exactamente una operación
confirmada:

- si ganó 800: saldo final USD 200;
- si ganó 500: saldo final USD 500;
- nunca hubo USD -300;
- nunca quedaron dos operaciones de dominio confirmadas.

No se necesitó `SERIALIZABLE`: el lock pesimista por cuenta fue suficiente para
esta regla. En el CMS todos los comandos sobre un mismo stock deben mapear al
mismo `pgledger_account_id`; de lo contrario, ningún lock puede proteger un
saldo fragmentado incorrectamente.

## Test B — compra FX y rollback

Compra ejecutada:

- USD 1.000;
- ARS 1.420/USD;
- total ARS 1.420.000.

Batch:

1. Caja A ARS -> Clearing ARS por 1.420.000;
2. Clearing USD -> Caja A USD por 1.000.

Resultado probado:

- Caja A ARS: 1.420.000 -> 0;
- Caja A USD: 0 -> 1.000;
- una fila de operación;
- dos `pgledger_transfers` vinculadas;
- cada transferencia con exactamente dos entradas cuya suma es cero.

### Fault injection

En una segunda ejecución, la segunda pierna apuntó deliberadamente de USD a
una cuenta ARS. El upstream procesó la primera pierna y luego lanzó:

```text
ERROR: Cannot transfer between different currencies (USD and ARS)
```

Al finalizar se comprobó:

- ARS seguía en 1.420.000;
- USD seguía en 0;
- no existía la operación `fx-purchase-forced-failure`;
- no existía ninguna transferencia etiquetada con ese `operation_id`.

Esto demuestra rollback tanto dentro del batch `pgledger` como a través del
wrapper que había intentado insertar el evento de dominio.

## Test C — reversión

Se creó una venta de USD 500 a ARS 1.470:

- después de la venta: USD 0, ARS 735.000;
- después de la compensación: USD 500, ARS 0.

Persistieron dos eventos confirmados:

| operation_id | kind | reversal_of | Estado |
| --- | --- | --- | --- |
| `sale-to-reverse` | `fx_sale` | — | `confirmed` |
| `reversal-sale-to-reverse` | `reversal` | `sale-to-reverse` | `confirmed` |

Cada evento conservó sus dos transferencias. La reversión creó transferencias
en dirección opuesta, guardó el motivo y no editó/borró el original. Un índice
único parcial impide más de una reversión confirmada por operación original.

## Test D — idempotencia

`pgledger` no trae idempotencia. La solución mínima probada fue:

1. `operation_id` como PK en `spike_app.operations`;
2. guardar un `request_payload` JSONB canónico;
3. `INSERT ... ON CONFLICT DO NOTHING` antes de mover dinero;
4. si existe la misma clave y el payload coincide, devolver el resultado ya
   confirmado con `replayed = true`;
5. si la clave existe con otro payload, lanzar
   `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`;
6. operación, ledger y estado `confirmed` en la misma transacción.

PostgreSQL hace que el segundo `INSERT ... ON CONFLICT` concurrente espere la
resolución del primero. En el doble submit simultáneo observado:

```text
submit A: test-sale-001 | replayed=true
submit B: test-sale-001 | replayed=false
operations=1 links=2 usd=0 ars=735000
```

La identidad del request que gana no importa. El contrato garantiza una sola
operación financiera efectiva y rechaza reutilizar la clave para USD 400.

Para producción, la clave debe generarse por comando desde la UI/API, tener
scope apropiado y política de retención. También deben persistirse resultados
necesarios para responder replays sin reconstrucciones ambiguas.

## Aislamiento RPC

Resultados reales con rol `authenticated`:

| Acción | Resultado observado |
| --- | --- |
| `SELECT pgledger_accounts` | `permission denied for table pgledger_accounts` |
| `INSERT pgledger_accounts` | `permission denied for table pgledger_accounts` |
| `pgledger_create_transfer(...)` directo | `permission denied for function pgledger_create_transfer` |
| Wrapper sin `auth.uid()` | `AUTHENTICATION_REQUIRED` |
| `execute_internal_transfer(...)` con actor | PASS; Caja A 90, Caja B 10 |

El actor persistido fue el claim autenticado, no un valor enviado al wrapper.
En producción falta agregar al inicio de cada RPC la autorización específica:
rol en `user_roles`, sucursal, caja o `bag_assignments`. El POC solo validó
presencia de usuario porque copiar toda la matriz de permisos habría dejado de
ser un spike desechable.

## Problemas y riesgos encontrados

1. **Dependencia de `search_path`.** El SQL upstream no califica objetos
   internos. Requiere schema seguro y una decisión de instalación explícita.
2. **Permisos no listos para Supabase.** `pgledger` no trae RLS ni grants y las
   funciones PostgreSQL reciben `EXECUTE` para `PUBLIC` por defecto. Debe
   aplicarse hardening en la misma migración de instalación.
3. **Saldo negativo permitido por defecto.** Cada cuenta de activo/custodia
   debe crearse explícitamente con `allow_negative_balance = false`.
4. **Idempotencia externa.** Se necesitan tabla de operación, payload canónico
   y vínculo único a transferencias.
5. **Reversión externa.** El upstream no conoce `reversal_of`, motivo, permiso
   ni protección contra doble reversión.
6. **Escala monetaria.** `numeric` no limita decimales. Los wrappers deben
   imponer ARS 2, USD 4 y tasas 4, además de redondeo acordado.
7. **Autorización de negocio.** `auth.uid()` identifica; no decide si el actor
   puede operar esa caja/bolsa.
8. **Proyecto joven.** Debe mantenerse vendorizado/fijado, con licencia y
   checksums; nunca seguir `main` automáticamente.
9. **Supabase real pendiente.** No se probaron PostgREST, JWT real, pooler ni
   una migration Supabase porque la CLI no estaba disponible.
10. **Dual-write futuro.** Conciliar ledger y saldos actuales seguirá siendo la
    parte de mayor riesgo de la integración.

Ninguno exige un microservicio ni infraestructura permanente. Todos se pueden
resolver en PostgreSQL/Supabase, pero los wrappers no son opcionales.

## Lógica adicional requerida del CMS

- mapping entidad/moneda/medio -> cuenta ledger;
- autorización por admin/encargado/cajero y asignación;
- idempotency key y payload canónico;
- evento de dominio y vínculos 1..N;
- escala/redondeo ARS/USD;
- costo promedio y ganancia de FX;
- cuentas de apertura, clearing, gastos y préstamo;
- motivo/aprobación y política de reversión;
- audit log no falsificable dentro de la misma RPC;
- shadow ledger, backfill, conciliación y feature flags;
- pruebas Supabase reales, migraciones desde cero, backup/restore y CI.

## GO / NO-GO

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Concurrencia | PASS | 10/10 carreras, exactamente un commit y saldo no negativo |
| Atomicidad | PASS | Dos piernas FX en un batch lógico |
| Rollback | PASS | Fallo de moneda revirtió dominio, transferencias y balances |
| Reversión | PASS | Compensación visible, relacionada y balance restaurado |
| Idempotencia clara | PASS | PK + payload canónico + `ON CONFLICT`; secuencial y concurrente |
| RPC segura viable | PASS | Grants negativos, `SECURITY DEFINER`, actor interno y wrapper permitido |
| Complejidad operacional proporcionada | PASS | PostgreSQL puro; sin servicio o runtime adicional |

Decisión: **GO condicionado**. Se aprueba `pgledger` como motor interno, no como
API directa ni reemplazo del dominio. Las condiciones antes de producción son:
validación en Supabase real, hardening/grants en una migration reproducible,
autorización por alcance, audit atómico y período de shadow reconciliation.

## Estimación posterior al spike

Integración de `pgledger` al CMS, sin incluir el resto de P0/P1 de framework y
producto: **70–105 h**.

| Trabajo | Horas |
| --- | ---: |
| Fundación, vendor/checksum, schema y grants | 10–15 |
| Cuentas, bindings y saldos de apertura | 8–12 |
| RPC compra/venta/transferencia/gasto | 14–20 |
| Reversión, idempotencia y audit | 10–16 |
| Shadow ledger, backfill y conciliación | 12–18 |
| Tests Supabase/concurrencia/migraciones | 12–18 |
| Deploy, observabilidad y rollback | 4–6 |
| **Total** | **70–105** |

El POC reduce incertidumbre, pero su SQL es demostrativo: no se debe copiar a
producción sin adaptar tablas reales, permisos, auditoría y migración.

## Decisión final

```text
CMS MAS SERVICIOS — PGLEDGER SPIKE

Environment:
Docker Desktop 29.4.3 + PostgreSQL 17.6 efímero en tmpfs,
isolation READ COMMITTED. Supabase CLI no disponible.

pgledger commit:
c18c7d267d46ab396641d5e44f1ce3166aeb9a6d

CONCURRENCY:
PASS

FX ATOMICITY:
PASS

ROLLBACK:
PASS

REVERSAL:
PASS

IDEMPOTENCY:
PASS

RPC ISOLATION:
PASS

Problems:
Funciones upstream dependientes de search_path; no incluye permisos Supabase,
idempotencia, reversión, escala monetaria ni autorización de negocio.
Supabase/PostgREST real todavía no fue probado.

Additional CMS logic required:
Bindings de cuentas, roles/asignaciones, payload idempotente, escala/redondeo,
costo/ganancia, audit atómico, reversión y shadow reconciliation.

Complexity:
MEDIUM para el motor aislado; HIGH para la migración completa del CMS.

Estimated integration hours:
70–105 h

PGLEDGER FINAL DECISION:
GO

Reason:
Los seis criterios críticos pasaron repetidamente y el motor puede ocultarse
tras RPC PostgreSQL sin infraestructura adicional. El GO está condicionado a
hardening y validación Supabase real antes de datos productivos.

Next recommended step:
Diseñar la Fase A en un plan separado: contrato de cuentas/bindings, migration
vendorizada, grants, auth/roles y shadow ledger. No ejecutarla automáticamente.
```
