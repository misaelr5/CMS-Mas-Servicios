# CMS Más Servicios — análisis de reutilización de ledger

Fecha: 2026-08-31

Repositorio auditado: `CMS-Mas-Servicios`

Rama/commit: `master` / `bb7fe8698d0e112d432d22b2b89eafbd4a0a6129`

Alcance: comparación específica; no se implementó código, no se modificó la base, no se ejecutaron migraciones y no se hizo commit ni push.

## Respuesta ejecutiva

Conviene una **estrategia híbrida**: conservar las tablas y reglas de negocio del CMS, sustituir gradualmente el motor casero de saldos por el núcleo transaccional de `pgledger`, y adaptar patrones puntuales de autenticación/RLS del starter sin copiarlo ni introducir su modelo SaaS multi-tenant.

No hay un ahorro “drástico” sin costo de integración. La estimación razonable baja de **120–180 h** a **95–140 h**, un ahorro comparable de **25–40 h**. El valor principal no es escribir menos SQL: es reutilizar una implementación ya probada de locks ordenados, balance versionado, doble entrada y rollback. Aun así, el CMS necesita RPC propias que unan en **una misma transacción** el evento de negocio, los asientos, la auditoría y cualquier proyección derivada.

Decisión resumida:

- `pgledger`: **USE**, pero fijado a un commit, con su SQL revisado/vendorizado, funciones crudas sin acceso de cliente y wrappers propios.
- patrones del starter: **USE**, como referencia selectiva y corregida; **no** usar el repositorio como base ni migrar a organizaciones.
- Dinero.js: **DON'T USE por ahora**; no resuelve integridad ni atomicidad y agrega un modelo monetario adicional. Mantener `numeric`/strings en fronteras y usar una librería decimal más directa si los cálculos TypeScript siguen siendo necesarios.
- arquitectura financiera actual: **PARTIAL REPLACE**; se conserva el dominio y se reemplaza el mecanismo de movimientos/saldos/anulaciones.

## Evidencia y procedencia

Se inspeccionó el código local ya auditado y clones temporales de los tres proyectos, sin instalarlos en el CMS.

| Proyecto | Revisión inspeccionada | Licencia | Señales de mantenimiento al 2026-08-31 | Evaluación |
| --- | --- | --- | --- | --- |
| [`pgr0ss/pgledger`](https://github.com/pgr0ss/pgledger) | `c18c7d267d46ab396641d5e44f1ce3166aeb9a6d` | MIT | Creado en 2025; actividad y releases recientes; CI contra PostgreSQL 15–18; ~489 stars y ~18 forks | Código pequeño y activo, pero joven, API todavía evolutiva y muy concentrado en un mantenedor |
| [`Edraid/nextjs-supabase-saas-starter`](https://github.com/Edraid/nextjs-supabase-saas-starter) | `f92b8a894d237bc16d839f13b342e89b9a4a6dc7` | MIT | Creado en 2026; actualización reciente; sin adopción visible relevante, tests o CI | Referencia de patrones, no dependencia ni base de producción |
| [`dinerojs/dinero.js`](https://github.com/dinerojs/dinero.js) | `76b969e519dc44675d4af898d25629995d0b16f2` | MIT | Activo, CI, release 2.0.2, comunidad y adopción amplias | Maduro, pero no es la pieza que resuelve el riesgo prioritario del CMS |

La instancia Supabase real sigue **no verificada**: no hay credenciales locales ni una base reproducible enlazada. Las conclusiones de esquema corresponden a las ocho piezas SQL versionadas en el repositorio.

## 1. pgledger

### Cómo funciona

`pgledger` es un ledger de doble entrada implementado completamente en PostgreSQL. Cada movimiento transfiere un importe positivo entre dos cuentas de la misma moneda. La dirección `from -> to` genera dos entradas de igual magnitud y signo opuesto; el balance queda materializado en la cuenta y cada entrada conserva el balance anterior, el nuevo y la versión de la cuenta.

No es un ERP ni un libro contable completo: no conoce sucursales, cajas, bolsas, responsables, tipos de compra/venta, costo promedio, ganancia, gastos, cierres o motivos de anulación. Es un motor de movimientos consistente sobre el cual debe operar el dominio del CMS.

### Tablas y vistas

| Objeto | Contenido | Garantía relevante |
| --- | --- | --- |
| `pgledger_accounts` | `id`, nombre, moneda, balance `numeric`, versión, restricciones de signo, metadata y timestamps | Una cuenta tiene una sola moneda; el balance y la versión se actualizan bajo lock |
| `pgledger_transfers` | cuenta origen/destino, importe, `event_at`, metadata y timestamp | `amount > 0`, origen distinto de destino y misma moneda validada por función |
| `pgledger_entries` | cuenta, transferencia, importe con signo, balance anterior/actual y versión | Dos entradas por transferencia cuando se usa la API pública |
| `pgledger_accounts_view` | interfaz de lectura de cuentas | Evita acoplar consumidores a la tabla, aunque la API aún no está versionada |
| `pgledger_transfers_view` | interfaz de lectura de transferencias | Expone el movimiento registrado |
| `pgledger_entries_view` | entradas más `event_at` y metadata del movimiento | Permite historia y conciliación |

### Funciones PostgreSQL

- `pgledger_create_account(...)`: crea una cuenta con moneda y reglas de saldo.
- `pgledger_create_transfer(...)`: wrapper para una transferencia.
- `pgledger_create_transfers(transfer_request[], event_at, metadata)`: registra varias transferencias de manera atómica.
- `pgledger_create_transfers(VARIADIC ...)`: variante de conveniencia.
- `pgledger_check_account_balance_constraints(...)`: impide signo negativo/positivo según la configuración.
- `pgledger_uuidv7_exists`, `pgledger_uuidv7_microsecond`, `pgledger_uuidv7` y `pgledger_generate_id`: generan IDs texto con prefijos `pgla_`, `pglt_` y `pgle_` a partir de UUIDv7/ULID.

La función múltiple deduplica y ordena IDs de cuenta, adquiere `SELECT ... FOR UPDATE` siempre en ese orden y luego procesa los movimientos. Eso serializa operaciones que tocan una misma cuenta y reduce deadlocks. Cualquier excepción revierte toda la sentencia/transacción.

### Double-entry, balances y atomicidad

Por cada transferencia:

1. bloquea las cuentas involucradas;
2. resta el importe de la cuenta origen e incrementa su versión;
3. suma el importe a la cuenta destino e incrementa su versión;
4. valida las restricciones de saldo;
5. valida que las monedas coincidan;
6. inserta la transferencia;
7. inserta dos entradas, negativa y positiva, con balances y versiones.

Esto aporta:

- conservación del valor por moneda dentro del ledger;
- escritura atómica de uno o varios movimientos;
- serialización de escrituras concurrentes sobre una misma cuenta;
- rechazo de saldos negativos si la cuenta se crea con `allow_negative_balance = false`;
- historia inmutable de transferencias/entradas si el CMS revoca DML directo;
- balance de lectura O(1) y trazabilidad por versión.

No aporta por sí solo:

- atomicidad entre `pgledger` y las tablas del CMS si se realizan RPC/queries separadas;
- idempotencia o clave externa única;
- una primitiva nativa de reversión;
- permisos/RLS apropiados para Supabase;
- plan de cuentas o semántica contable del negocio;
- costo promedio, ganancia realizada, cierres o conciliación de caja;
- migraciones versionadas del upstream (su README todavía las marca como pendiente);
- unicidad de nombres de cuenta, catálogo de monedas o escala por moneda.

Por eso la integración debe agregar wrappers PostgreSQL propios, una clave idempotente única y tablas de vínculo dominio-ledger. Las funciones crudas de `pgledger` no deben quedar ejecutables por `anon` ni `authenticated`.

### Multi-moneda

Una transferencia de `pgledger` siempre es de una sola moneda. Un cambio ARS/USD requiere cuatro cuentas y dos transferencias dentro de una llamada a `pgledger_create_transfers`:

- una transferencia ARS entre la cuenta de custodia y una contraparte/liquidez ARS;
- una transferencia USD en sentido complementario entre la contraparte/liquidez USD y la cuenta de custodia.

El tipo de cambio, el monto cotizado, el responsable y el ID de la operación pertenecen al dominio/metadata. `pgledger` no calcula ni valida el tipo de cambio, y tampoco determina por sí solo ganancia o costo promedio.

### Riesgos de adopción

1. **Proyecto joven.** La implementación es clara y tiene integración/CI, pero no tiene la madurez organizacional de PostgreSQL o Supabase. Debe fijarse el commit, guardar el SQL revisado en el repo y controlar cualquier actualización.
2. **Superficie Supabase no endurecida.** No trae RLS, `REVOKE/GRANT`, ownership ni wrappers autorizados. Exponer las funciones originales permitiría movimientos no autorizados.
3. **Modelo deliberadamente pequeño.** No hay batch/header de negocio, idempotency key, reversal, chart of accounts ni FK al dominio.
4. **IDs texto y ULID vendorizado.** El CMS usa UUID. Conviene mantener IDs propios en el dominio y una tabla de vínculo, no propagar IDs `pglt_*` por toda la UI.
5. **`numeric` sin escala declarada.** El wrapper del CMS debe normalizar ARS a 2 decimales y USD/tasas a 4, con regla explícita de redondeo.
6. **Balance materializado.** Es una ventaja de rendimiento, pero requiere impedir DML directo y agregar pruebas de conciliación `balance = suma(entries)`.
7. **No es contabilidad general completa.** Las cuentas de contrapartida, gastos e ingresos deben diseñarse con criterio de negocio/contable; el motor no decide su significado.

## 2. Comparación con las 19 tablas reales

`Mantener`, `Adaptar` y `Reemplazar` indican el destino recomendado. No se propone reemplazar ninguna tabla de negocio completa en la primera migración.

| Nuestra tabla | Función actual | Mantener | Adaptar | Reemplazar | pgledger relacionado |
| --- | --- | :---: | :---: | :---: | --- |
| `profiles` | Perfil interno ligado a `auth.users` | Sí | — | — | Ninguno |
| `user_roles` | Rol global por usuario | — | Sí | — | Ninguno; endurecer CHECK/RLS y complementar alcance |
| `branches` | Sucursales | Sí | — | — | Metadata/vínculo de cuentas, no reemplazo |
| `cash_registers` | Cinco cajas, sucursal y responsable | Sí | Sí | — | Una caja/custodia puede vincular varias `pgledger_accounts` por moneda/medio |
| `bags` | Identidad de bolsa y saldos/estado/costo/ganancia agregados | Sí | Sí | Solo sus columnas de saldo como fuente de verdad | Varias `pgledger_accounts`; saldo pasa a ledger/proyección |
| `bag_assignments` | Acceso usuario-bolsa | Sí | Sí | — | Autoriza wrappers; no es contabilidad |
| `audit_logs` | Auditoría de aplicación actualmente falsificable | — | Sí | Diseño/policies actuales | No equivale a `pgledger_entries`; debe registrar quién y por qué |
| `notes` | Notas operativas polimórficas | Sí | Sí | — | Puede referenciar operación/reversión, no sustituir asientos |
| `bag_operations` | Evento de compra/venta/ajuste/préstamo, snapshots de saldo y ganancia | Sí | Sí | Columnas `previous_*`/`new_*` como mecanismo contable | Evento de dominio ligado a 1..N `pgledger_transfers` |
| `bag_daily_snapshots` | Corte diario de bolsa | Sí | Sí | — | Captura balances/versiones del ledger para cierre y conciliación |
| `bag_internal_transfers` | Cabecera de transferencia y vínculo a operaciones espejo | Sí | Sí | Operaciones espejo como fuente financiera | Una transferencia o batch de `pgledger_transfers` |
| `cash_report_categories` | Catálogo de categorías de operación Pago Fácil | Sí | — | — | Opcionalmente mapea a cuentas de ingresos/gastos, no reemplazo |
| `cash_daily_reports` | Cabecera diaria de caja, operado y ganancia | Sí | Sí | — | Reporte de negocio; solo movimientos de fondos reales se contabilizan |
| `cash_daily_report_lines` | Desglose por categoría | Sí | Sí | — | Read model/reporte; no cada importe “operado” es saldo transferido |
| `daily_reports` | Consolidado diario y ganancia disponible | Sí | Sí | — | Proyección derivada/conciliada con ledger |
| `report_adjustments` | Ajustes manuales de reporte | Sí | Sí | — | Si cambia dinero real, genera transferencia; si solo corrige reporting, no |
| `expenses` | Gasto ARS, concepto, origen y estado | Sí | Sí | — | Transferencia desde activo a cuenta de gasto al pagar/imputar |
| `weekly_cash_closures` | Cabecera semanal, estado y reapertura | Sí | Sí | — | Marca de corte/conciliación; no es un movimiento por sí misma |
| `weekly_cash_closure_lines` | Snapshot semanal por caja | Sí | Sí | — | Guarda balances/versiones de cuenta al cerrar |

Tablas nuevas mínimas del CMS, además de las tres de `pgledger`:

- `ledger_account_bindings`: relación única entre entidad (`bag`, `cash_register`, tesorería/sistema), propósito, moneda y `pgledger_account_id`.
- `ledger_links`: relación 1..N entre un evento de dominio y sus `pgledger_transfer_id`, con constraint único para evitar doble contabilización.

Puede añadirse una cabecera `financial_events` si la idempotencia/reversión no encaja limpiamente en `bag_operations`, `bag_internal_transfers` y `expenses`; no debe agregarse antes de comprobar esa necesidad.

No retiraríamos una tabla completa inicialmente. Solo después de conciliación estable podrían dejar de persistirse los saldos `bags.current_*`, `borrowed_ars` y los snapshots `previous_*`/`new_*` de `bag_operations`, reemplazándolos por vistas/proyecciones. Mantenerlos temporalmente permite dual-write y rollback.

## 3. BUSINESS LOGIC vs FINANCIAL LEDGER

### BUSINESS LOGIC — se mantiene en el CMS

- quién operó y con qué rol;
- sucursal, caja o bolsa asignada;
- compra/venta y contraparte/cliente conceptual;
- cotización elegida, validaciones comerciales y redondeo presentado;
- efectivo vs cuenta, concepto de gasto y categoría;
- costo promedio, ganancia comercial y reglas de préstamo;
- estados de reportes, revisión, cierre/reapertura y notas;
- motivo y autorización de una anulación;
- alcance de dueño/admin, encargado y cajero.

### FINANCIAL LEDGER — se delega a pgledger + wrappers del CMS

- cuentas de custodia por moneda y medio;
- débitos/créditos balanceados;
- saldo actual y versión de cada cuenta;
- prohibición de saldo negativo donde corresponda;
- locks de concurrencia;
- batch atómico de uno o varios movimientos;
- trazabilidad de la transferencia original y su compensación;
- conciliación entre saldos y entradas.

Ejemplo: “Juan vendió USD 500 desde la bolsa X, recibió ARS en la cuenta y usó cotización 1.470” es un evento `bag_operations`. “USD -500 y ARS +735.000, cada uno con contrapartida balanceada” son dos transferencias del ledger ligadas a ese evento.

## 4. Modelado objetivo de cuentas

No usar el nombre visible como identidad ni FK: `pgledger_accounts.name` no es único. El identificador estable es `pgledger_account_id`, vinculado mediante `ledger_account_bindings`.

Propuesta de clave lógica legible:

```text
asset:branch:{branch_id}:cash-register:{cash_register_id}:cash:ARS
asset:branch:{branch_id}:cash-register:{cash_register_id}:bank:ARS
asset:branch:{branch_id}:cash-register:{cash_register_id}:cash:USD
asset:bag:{bag_id}:cash:ARS
asset:bag:{bag_id}:bank:ARS
asset:bag:{bag_id}:cash:USD
asset:treasury:cash:ARS
asset:treasury:cash:USD
clearing:external:ARS
clearing:external:USD
expense:{category_key}:ARS
```

El nombre humano puede ser “Sucursal Centro / Caja 1 / Efectivo ARS”, pero no debe codificar permisos ni relaciones.

Reglas:

- una cuenta por combinación entidad + propósito + moneda;
- `allow_negative_balance = false` para activos/custodia que no pueden sobregirarse;
- cuentas de clearing o pasivo pueden permitir el signo requerido, documentándolo explícitamente;
- moneda limitada por CHECK/catálogo (`ARS`, `USD` inicialmente);
- ARS 2 decimales y USD 4 decimales en el wrapper;
- cuentas inactivas se congelan, no se eliminan;
- los totales “operados” de Pago Fácil no crean cuentas automáticamente: primero hay que confirmar si representan custodia real o solo volumen/reporting.

## 5. Casos reales

En los ejemplos, `clearing:external:*` representa la contraparte agregada. En producción puede refinarse a cliente, proveedor o liquidez, pero no hace falta crear una cuenta por cliente para este negocio pequeño.

### Compra de USD 1.000 a ARS 1.420

Evento de dominio (`bag_operations`): tipo compra, bolsa/caja, `amount_usd = 1000`, `rate_ars = 1420`, `total_ars = 1420000`, medio de pago, actor y metadata comercial.

Batch del ledger, atómico:

1. ARS 1.420.000 desde `asset:...:ARS` hacia `clearing:external:ARS`.
2. USD 1.000 desde `clearing:external:USD` hacia `asset:...:USD`.

Resultado de custodia: ARS -1.420.000, USD +1.000. `ledger_links` relaciona la operación con ambas transferencias.

### Venta de USD 500 a ARS 1.470

Evento de dominio: tipo venta, cotización, destino del ARS, actor y cálculo de ganancia/costo promedio.

Batch del ledger:

1. USD 500 desde `asset:...:USD` hacia `clearing:external:USD`.
2. ARS 735.000 desde `clearing:external:ARS` hacia `asset:...:ARS`.

Resultado: USD -500, ARS +735.000. El ledger garantiza fondos USD si la cuenta no admite negativo; el CMS conserva el cálculo de ganancia.

### Caja 1 transfiere USD 5.000 a Caja 2

- Dominio: una fila `bag_internal_transfers` o una nueva variante de transferencia de caja, origen, destino, actor, nota y estado.
- Ledger: una transferencia USD 5.000 desde la cuenta de custodia de Caja 1 a la de Caja 2.
- No son necesarios dos movimientos financieros espejo del CMS; las dos entradas ya existen en `pgledger_entries`.

Si una “transferencia interna” actual también intercambia ARS por USD entre bolsas, son dos transferencias monetarias en un único batch, no una transferencia simple.

### Anulación de una venta incorrecta

- No se borra ni se reescribe el movimiento original.
- Se crea un evento de dominio de reversión con `reversal_of`, motivo obligatorio y actor autenticado.
- El wrapper lee las transferencias originales y crea otras nuevas en sentido inverso por los mismos importes.
- Original, compensación, cambios de estado y audit log se confirman juntos.

`pgledger` no incluye esta función: `reverse_financial_event(...)` debe ser del CMS, idempotente y autorizada. Esto elimina el P0 actual donde `annullBagOperation` restaura `previous_*` y pisa operaciones posteriores.

### Gasto ARS

- Dominio (`expenses`): sucursal, fecha, categoría, detalle, `paid_from`, estado y actor.
- Al pasar a pagado/imputado: transferencia desde la cuenta ARS realmente utilizada hacia `expense:{category}:ARS`.
- Si se anula, asiento compensatorio; nunca `DELETE` ni restauración de snapshot.

## 6. Atomicidad

| Flujo | Arquitectura actual | Propuesta con pgledger | Lógica adicional necesaria |
| --- | --- | --- | --- |
| Compra USD | `bag_operations` y actualización de `bags` son requests separados con `service_role` | Dos transferencias ARS/USD atómicas y con locks | RPC del CMS que valida actor/rol, inserta dominio, llama ledger, enlaza, audita y actualiza proyección en una transacción |
| Venta USD | Read-modify-write en TypeScript; riesgo de saldo USD negativo concurrente | Lock de cuenta USD y constraint de saldo | Normalización de escala, costo promedio/ganancia e idempotencia |
| Transferencia | Cabecera, dos operaciones espejo, enlaces, dos bolsas, notas y logs en múltiples writes | Una transferencia o batch atómico entre cuentas | Wrapper que incluya cabecera de dominio, notas necesarias y audit; `pgledger` solo no cubre esas tablas |
| Anulación | Restaura `previous_*`; puede borrar movimientos posteriores | Nuevas transferencias inversas preservan historia | Función de reversión del CMS, autorización, motivo, `reversal_of` y protección contra doble reversión |
| Gasto | Fila/estado y reportes pueden divergir; no hay asiento de fondos | Transferencia activo -> gasto | Definir en qué estado impacta saldo y qué cuenta corresponde a `paid_from` |
| Cierre diario/semanal | Cabecera y líneas se escriben por separado; semanal borra/reinserta líneas | El ledger entrega balances/versiones consistentes a una hora de corte | Transacción propia para cabecera+líneas+audit; el cierre no debe generar dinero salvo ajuste real |

Conclusión: `pgledger` resuelve el núcleo de **movimientos y concurrencia**, pero no vuelve atómica una secuencia de llamadas Supabase. La garantía completa existe solo si una función PostgreSQL del CMS ejecuta dominio + ledger + auditoría dentro de la misma transacción.

## 7. Concurrencia: USD 1.000, ventas simultáneas de 800 y 500

### Hoy

Ambas requests pueden leer `current_usd = 1000`. Una calcula 200 y la otra 500; ambas insertan historial y actualizan la bolsa sin lock/version check. Según el orden de llegada, gana la última escritura. El saldo final puede ser 200 o 500 aunque se hayan confirmado ventas por USD 1.300, y una falla parcial puede dejar todavía otra combinación.

### Con pgledger

Ambas operaciones apuntan a la misma cuenta real de custodia USD:

1. la primera adquiere `FOR UPDATE` sobre la cuenta;
2. la segunda espera;
3. si la venta de 800 confirma primero, el saldo queda 200;
4. la venta de 500 reanuda, intenta llevarlo a -300;
5. con `allow_negative_balance = false`, la función lanza excepción y revierte por completo el segundo evento.

Requisitos adicionales:

- todas las ventas de ese stock deben usar el mismo `pgledger_account_id`;
- `allow_negative_balance = false` en la cuenta USD;
- wrapper único; no hacer primero el dominio y después el RPC del ledger;
- clave `idempotency_key` única por comando para que un retry no duplique ventas;
- scale/rounding consistente;
- opcionalmente version esperada para mensajes de conflicto más claros, aunque el lock ya protege el saldo;
- pruebas con sesiones PostgreSQL concurrentes reales, no mocks.

## 8. Supabase SaaS Starter: patrones reutilizables

El starter usa `@supabase/ssr`, cookies de request, `auth.getUser()` server-side, cliente anon sujeto a RLS y cliente admin reservado para webhooks. También propone roles/membership y helpers `SECURITY DEFINER` para evitar recursión en RLS.

No debe copiarse completo. La revisión encontró problemas concretos:

- el onboarding intenta insertar `organizations` y luego el primer `organization_members`, pero las policies mostradas no habilitan ese bootstrap de forma consistente;
- `accept_invitation` es invocado desde la app pero no está definido en las migraciones inspeccionadas;
- `notify_new_member` inserta `notifications.org_id` y `notifications.message`, columnas que la tabla inicial no crea (`body` es el nombre real);
- `log_audit_event` es `SECURITY DEFINER`, acepta `p_user_id` y no incluye `REVOKE EXECUTE FROM PUBLIC`; por defecto puede convertirse precisamente en un audit log falsificable;
- varias policies `FOR ALL` no separan claramente `USING`/`WITH CHECK`, y la policy de API keys no puede garantizar “solo cambia `revoked_at`” como afirma el comentario;
- no hay tests ni CI que demuestren esas promesas;
- el modelo `organizations/subscriptions/invitations` no aporta al CMS de una sola empresa con dos sucursales.

| Área | CMS actual | Starter | Recomendación |
| --- | --- | --- | --- |
| SSR auth | `proxy.ts` más cookie/localStorage propia; 8 páginas pueden consultar con admin sin guard | `createServerClient` por request y `auth.getUser()` en middleware/layout/actions | **Adaptar** cliente SSR oficial y guard server-side en cada frontera; no confiar solo en proxy |
| Autorización | Checks dispersos en actions/UI; lecturas admin evitan RLS | Reconsulta membership y rol server-side antes de admin writes | **Adaptar** defense-in-depth, pero centralizar helpers del CMS |
| RLS | Lecturas `using (true)` y writes amplios; `service_role` frecuente | Helpers `auth.user_org_role()` y policies por membership | **Adaptar el patrón**, no las policies; scope por sucursal/caja/bolsa |
| Roles | `admin`, `encargado`, `cajero`, `viewer`, un rol global | `owner`, `admin`, `member`, `viewer` por organización | Mantener roles del negocio; no traducirlos mecánicamente |
| Membership | `bag_assignments` y responsable de caja; falta alcance uniforme de sucursal | `organization_members` con UNIQUE y helper de rol | Crear/normalizar asignaciones de alcance solo si una policy lo necesita; no agregar organizaciones |
| Audit logs | Insert directo autenticado y writes best-effort | Tabla sin policies DML, pero función privilegiada acepta actor arbitrario | Rehacer función: actor = `auth.uid()`, grants explícitos, audit dentro de la transacción |
| `SECURITY DEFINER` | Helpers y service role, con hardening inconsistente | `SET search_path`, pero sin grants/actor seguro en todos los casos | Usar wrappers mínimos, `SET search_path`, nombres calificados, `REVOKE`, validación interna de rol |
| Server Actions | Existen y hacen múltiples calls admin | Ejemplos revalidan auth con `getUser()` y dejan RLS actuar | Mantener Actions como adaptador HTTP/UI; una Action llama una RPC transaccional, no orquesta writes |
| Validación | Validación manual/mixta | Zod en varias rutas | Reutilizar el enfoque, no necesariamente su versión/dependencias sin revisión |

### Dueño, encargado, cajero, sucursal y caja

- **Dueño**: no crear un rol nuevo solo por nomenclatura si `admin` ya expresa control total. Si legalmente se requiere un dueño no removible, modelarlo como regla separada y explícita.
- **Encargado**: rol operacional, normalmente con scope a una o varias sucursales; el rol global actual no expresa ese alcance.
- **Cajero**: acceso a cajas asignadas y, cuando corresponde, bolsas asignadas. `responsible_user_id` solo no cubre reemplazos/turnos; una tabla de asignación temporal puede ser necesaria.
- **Sucursal**: frontera de lectura/escritura para encargados, reportes, gastos y cierres.
- **Caja**: frontera más fina para cajeros; la autorización se evalúa en RLS y nuevamente dentro de RPC financiera.

El patrón útil del starter es “rol + membership consultado por helper sin recursión”. En este CMS la membresía debe ser `branch/cash_register/bag`, no `organization`.

## 9. Audit log no falsificable

Campos mínimos:

- `id` UUID;
- `actor_user_id` obtenido internamente de `auth.uid()`;
- `action` con catálogo/check;
- `occurred_at` generado por DB;
- `entity_type` y `entity_id`;
- `reason` obligatorio en anulaciones/ajustes;
- `metadata` sanitizada (sin secretos);
- `request_id`/`idempotency_key` y, cuando corresponda, vínculo al evento/transferencias del ledger.

Diseño de seguridad:

1. revocar `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` sobre `audit_logs` a `anon` y `authenticated`;
2. no crear una función pública genérica `log(actor, action, ...)`;
3. cada RPC de negocio valida `auth.uid()`, rol y asignación, realiza la operación y escribe el audit internamente;
4. el actor nunca llega como argumento desde frontend;
5. funciones `SECURITY DEFINER` con `SET search_path` seguro, objetos calificados, owner dedicado y `REVOKE EXECUTE FROM PUBLIC`, otorgando solo wrappers concretos;
6. `UPDATE/DELETE` bloqueados también por trigger defensivo o privilegios del owner operativo;
7. el servidor usa el cliente SSR autenticado para RPC, no `service_role`, de modo que `auth.uid()` exista; reservar service role para administración/webhooks controlados;
8. auditoría y movimiento financiero confirman o fallan juntos.

De la migración `004_audit_log.sql` del starter se puede reutilizar la forma general de la tabla, índices y la idea append-only. No se debe reutilizar su función `log_audit_event` sin corregir actor y grants.

## 10. Dinero.js

**DON'T USE por ahora.**

Sí aporta objetos inmutables, moneda explícita, escalas y calculadora `bigint`, y es mucho más seguro que convertir `numeric` a `Number`. No obstante:

- no reemplaza `numeric`, constraints, locks ni transacciones de PostgreSQL;
- obliga a definir serialización de `bigint`, escalas ARS/USD y conversión en cada frontera Supabase;
- duplica el modelo monetario durante una migración que ya será compleja;
- el cálculo crítico debe quedar dentro de wrappers DB y persistirse como `numeric`.

Primero deben eliminarse conversiones IEEE-754 en el camino financiero: transportar decimales como strings, normalizar en PostgreSQL y devolver valores formateados. Si queda cálculo de costo/ganancia complejo en TypeScript, reevaluar Dinero.js frente a `decimal.js`; para las fórmulas actuales, una librería decimal directa tiene menor fricción.

## 11. Migración incremental recomendada

### Fase A — Fundación y shadow ledger

**Objetivo:** agregar el ledger sin cambiar el comportamiento visible.

- Archivos: nueva migración `supabase/migrations/<timestamp>_ledger_foundation.sql`; tipos en `lib/db/types.ts`; documentación operativa.
- Tablas: agrega las tres de `pgledger`, `ledger_account_bindings` y `ledger_links`; no altera aún las 19 como fuente de lectura.
- Trabajo: fijar commit/licencia, revisar SQL, revocar acceso crudo, catálogo/escala de moneda, cuentas iniciales, idempotencia, reconciliar saldos de apertura.
- Riesgos: mapping incorrecto, saldos iniciales no conciliados, grants inseguros.
- Tests: migración desde DB vacía, permisos anon/auth/service, invariantes, signos, escalas, reconciliación de apertura.
- Rollback: feature flag apagada y tablas nuevas sin consumidores; no borrar datos, retirar grants si hay incidente.

### Fase B — Transferencias internas

**Objetivo:** migrar el flujo más naturalmente equivalente a `from -> to`.

- Archivos: `lib/bags/bag-service.ts`, `app/actions/bags.ts`, nueva RPC/migración y tipos.
- Tablas: `bag_internal_transfers`, `bag_operations`, `bags`, `ledger_links` y tablas `pgledger_*`.
- Trabajo: una RPC crea cabecera, ledger, vínculos y audit; dual-write temporal de saldos actuales para comparar.
- Riesgos: semántica actual compra/venta interna ARS/USD, operaciones espejo consumidas por UI/CSV.
- Tests: fondos insuficientes, dos transferencias simultáneas, falla inducida en cada paso, retry idempotente, paridad UI/CSV.
- Rollback: volver la Action al flujo anterior mediante flag mientras se conservan movimientos ledger; no revertir/destruir asientos ya confirmados.

### Fase C — Compra/venta USD

**Objetivo:** contabilizar FX como dos transferencias en un batch.

- Archivos: `lib/bags/bag-service.ts`, `lib/bags/bag-calculations.ts`, `app/actions/bags.ts`, RPC/migración y formularios solo si cambian errores.
- Tablas: `bag_operations`, `bags`, `ledger_links`, `pgledger_*`.
- Trabajo: normalización ARS/USD, clearing accounts, validación de saldo, mantener costo promedio/ganancia como dominio.
- Riesgos: redondeo, saldos prestados, dirección de fondos, divergencia entre proyección `bags` y ledger.
- Tests: ejemplos 1000×1420 y 500×1470, límites de escala, compra/venta concurrente, costo promedio, préstamo, rollback total.
- Rollback: ledger en shadow y lectura aún desde `bags`; corregir con asientos compensatorios si ya hubo producción.

### Fase D — Gastos y anulaciones

**Objetivo:** retirar la restauración histórica insegura y contabilizar salidas.

- Archivos: `lib/bags/bag-service.ts`, `lib/finance/expense-service.ts`, `app/actions/bags.ts`, `app/actions/finance.ts`, RPC/migración.
- Tablas: `expenses`, `bag_operations`, `bag_internal_transfers`, `audit_logs`, `ledger_links`, `pgledger_*`.
- Trabajo: wrappers de pago/imputación, `reverse_financial_event`, motivo obligatorio y protección contra doble reversión.
- Riesgos: decidir qué estados de gasto mueven fondos; datos históricos con anulaciones ya corruptas; permisos de encargado/admin.
- Tests: anular operación vieja con movimientos posteriores, doble click/retry, gasto pagado/anulado, actor/motivo no falsificables.
- Rollback: desactivar nuevos comandos; cualquier operación ya posteada se corrige hacia adelante, nunca se borra.

### Fase E — Balances, snapshots, reportes y cierres

**Objetivo:** cambiar lecturas de saldo después de demostrar paridad.

- Archivos: `lib/operations/operational-data.ts`, `lib/bags/bag-service.ts`, servicios en `lib/finance/*`, `lib/cash/cash-service.ts`, actions de cierres y vistas/RPC SQL.
- Tablas: `bags`, `bag_daily_snapshots`, `cash_daily_reports`, `cash_daily_report_lines`, `daily_reports`, `report_adjustments`, `weekly_cash_closures`, `weekly_cash_closure_lines`, ledger.
- Trabajo: vistas/proyecciones de balances, guardar versión/hora de corte, transacción cabecera+líneas, definir cuáles ajustes representan dinero.
- Riesgos: confundir volumen operado con custodia; diferencias históricas; cierres abiertos durante cutover.
- Tests: paridad por día/sucursal/caja, zona horaria, cierre/reapertura, snapshot único, conciliación ledger-reportes.
- Rollback: switch de lectura a columnas actuales durante la ventana de dual-write; mantener snapshots previos.

### Fase F — Retiro controlado de lógica vieja

**Objetivo:** una sola fuente financiera.

- Archivos: limpieza de `lib/bags/bag-service.ts`, `lib/bags/bag-calculations.ts`, `lib/db/types.ts`, seeds y documentación.
- Tablas: dejar de escribir `bags.current_*`, `borrowed_ars` y `bag_operations.previous_*/new_*`; convertirlos en proyección/vista o retirarlos en una migración posterior separada.
- Riesgos: consumidores ocultos, exports/CSV, soporte de datos históricos.
- Tests: búsqueda de referencias, suite completa, migración forward/backward en copia, restore, E2E de todos los comandos financieros.
- Rollback: antes de eliminar columnas, mantener una release completa sin escritores viejos; después de eliminar, rollback exige migración forward/restore probado. No hacer DROP en el mismo release del cambio de lectura.

## 12. Estimación de horas

Las horas incluyen diseño, implementación, revisión, pruebas y documentación del alcance indicado. No incluyen depuración de datos reales desconocidos, capacitación contable ni features nuevas. Los rangos por fila son aditivos; el total se redondea por incertidumbre.

### A — Reparar la arquitectura actual: 120–180 h

| Trabajo | Horas |
| --- | ---: |
| Auth/RLS | 14–20 |
| Ledger transaccional propio | 22–32 |
| Migración | 8–12 |
| Operaciones | 10–14 |
| Transferencias | 8–12 |
| Anulaciones | 12–18 |
| Tests | 24–34 |
| Refactor | 10–16 |
| Security | 8–12 |
| Deploy | 4–8 |
| **Total calculado** | **120–178** |

La estimación anterior se mantiene: aunque no se adopte un ledger, hay que construir exactamente locks, balance, reversión, idempotencia y conciliación que `pgledger` ya trae parcialmente resueltos.

### B — Integrar pgledger + starter ampliamente: 130–190 h

| Trabajo | Horas |
| --- | ---: |
| Auth/RLS y adaptación multi-tenant | 14–22 |
| Ledger | 14–22 |
| Migración | 14–22 |
| Operaciones | 10–16 |
| Transferencias | 8–12 |
| Anulaciones | 10–16 |
| Tests | 26–38 |
| Refactor | 10–16 |
| Security | 10–14 |
| Deploy | 6–10 |
| **Total calculado** | **132–188** |

No ahorra: migrar roles a organizaciones y copiar un starter defectuoso introduce trabajo ajeno al negocio. Este escenario se incluye para demostrar que “usar ambos repos” no equivale automáticamente a reutilización efectiva.

### C — Híbrida recomendada: 95–140 h

| Trabajo | Horas |
| --- | ---: |
| Auth/RLS selectivo | 10–14 |
| Ledger pgledger + wrappers | 10–16 |
| Migración incremental | 10–14 |
| Operaciones | 8–12 |
| Transferencias | 6–8 |
| Anulaciones | 8–12 |
| Tests | 24–32 |
| Refactor | 8–12 |
| Security | 8–12 |
| Deploy | 4–6 |
| **Total calculado** | **96–138** |

Rango comunicado: **95–140 h**. Ahorro comparable contra A: **25–40 h**. No se reduce tests ni seguridad: el ahorro proviene del motor de ledger y de no rehacer UI, dominio, reportes ni tenancy.

## 13. Decisión final

```text
CMS MAS SERVICIOS — DECISIÓN ARQUITECTÓNICA

PGLEDGER:
USE

SUPABASE STARTER PATTERNS:
USE

DINERO.JS:
DON'T USE

Arquitectura financiera actual:
PARTIAL REPLACE

Tablas que conservaríamos:
profiles, branches, cash_registers, bags, bag_assignments, notes,
bag_operations, bag_daily_snapshots, bag_internal_transfers,
cash_report_categories, cash_daily_reports, cash_daily_report_lines,
daily_reports, report_adjustments, expenses, weekly_cash_closures y
weekly_cash_closure_lines.

Tablas que modificaríamos:
user_roles, cash_registers, bags, bag_assignments, audit_logs, notes,
bag_operations, bag_daily_snapshots, bag_internal_transfers,
cash_daily_reports, cash_daily_report_lines, daily_reports,
report_adjustments, expenses, weekly_cash_closures y
weekly_cash_closure_lines; además agregaríamos pgledger_accounts,
pgledger_transfers, pgledger_entries, ledger_account_bindings y ledger_links.

Tablas que eventualmente retiraríamos:
Ninguna tabla de dominio completa. Retiraríamos gradualmente columnas de saldo
duplicado en bags, snapshots previous_*/new_* como mecanismo contable y las
operaciones espejo usadas solo para simular doble entrada.

P0 simplificados:
Las anulaciones pasan a asientos compensatorios; la adopción del cliente SSR y
guardas server-side reduce el bypass de auth, aunque el parche de Next sigue
siendo obligatorio.

P1 simplificados:
pgledger aporta locks, atomicidad interna, double-entry, balance versionado y
restricción de saldo; los patrones SSR/RLS ayudan a retirar service_role del
camino normal. Audit, wrappers, idempotencia y tests siguen siendo propios.

Nuevos riesgos:
Proyecto pgledger joven, SQL/API upstream evolutiva, grants Supabase, mapping
dominio-ledger, migración/conciliación y doble fuente temporal durante dual-write.

Horas reparando lo actual:
120–180 h

Horas estrategia recomendada:
95–140 h

Ahorro estimado:
25–40 h

Complejidad:
HIGH

Recomendación final:
Adoptar parcialmente pgledger, fijado y encapsulado detrás de RPC propias;
conservar las 19 tablas como dominio/reporting; adaptar solo auth SSR, helpers
de membership/RLS y append-only audit del starter, corrigiendo sus fallas.
Migrar por shadow ledger, primero transferencias y luego FX/anulaciones.

Primer cambio que harías:
Antes de instalar nada, escribir y ejecutar contra una Supabase/Postgres local
un spike desechable con el caso concurrente 800/500, una compra FX de dos
transferencias, reversión e idempotencia; solo si pasa, congelar el contrato de
cuentas/RPC y comenzar la Fase A.
```
