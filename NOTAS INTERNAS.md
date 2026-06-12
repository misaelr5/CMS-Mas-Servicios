// PROMPT 2/6 — Login 12 horas, usuarios, roles y rutas protegidas
Continuá con la app interna de MAS SERVICIOS.

Objetivo de esta etapa:
Implementar autenticación, sesión persistente por 12 horas, roles básicos y protección de rutas.

No construyas todavía:
- Bolsas de divisas.
- Reporte diario.
- Cajas.
- Gastos.
- Cierres.
- Cálculos complejos.

Stack:
- Next.js App Router
- TypeScript
- Supabase Auth
- Tailwind CSS
- shadcn/ui

LOGIN Y SESIÓN:
La lógica de login debe ser:

- El usuario inicia sesión una vez.
- La sesión debe quedar abierta durante 12 horas.
- Durante esas 12 horas, si el usuario cierra la pestaña, recarga o vuelve a entrar, no debe tener que loguearse de nuevo.
- Pasadas las 12 horas, la app debe cerrar sesión o pedir login nuevamente.
- Si el usuario toca “Cerrar sesión”, se debe cerrar manualmente aunque no hayan pasado las 12 horas.

Implementación:
- Usar Supabase Auth.
- Persistir sesión en navegador.
- Controlar expiración lógica de sesión desde la app con un timestamp propio.
- Al iniciar sesión, guardar session_started_at.
- Calcular session_expires_at = session_started_at + 12 horas.
- En cada ruta protegida, validar:
  1. Hay sesión válida de Supabase.
  2. session_expires_at no venció.
- Si venció, ejecutar logout y redirigir a /login.

Crear helper:
- lib/auth/session.ts

Funciones sugeridas:
- setSessionWindow(userId)
- getSessionWindow()
- isSessionExpired()
- clearSessionWindow()
- requireValidSession()

Mensaje al vencer sesión:
“Tu sesión venció. Volvé a iniciar sesión.”

No agregar registro público de usuarios.
Los usuarios los crea el admin desde /usuarios.

Rutas protegidas:
- /dashboard
- /bolsas
- /bolsas/[id]
- /bolsas/nueva-operacion
- /cajas
- /cajas/[id]
- /cajas/[id]/cargar
- /reporte-diario
- /gastos
- /cierres
- /usuarios
- /configuracion

Si no hay sesión válida:
- Redirigir a /login.

Si hay sesión válida pero el rol no tiene permiso:
- Mostrar pantalla AccessDenied.

ROLES:
Crear sistema básico de roles:

1. admin
   - Ve todo.
   - Crea usuarios.
   - Configura bolsas.
   - Configura cajas.
   - Aprueba cierres.
   - Puede anular registros.

2. encargado
   - Ve bolsas, cajas, gastos y reportes.
   - Carga operaciones.
   - Crea ajustes con motivo.
   - No crea usuarios.

3. cajero
   - Carga operaciones asignadas.
   - Ve solo sus cajas o bolsas asignadas.

4. viewer
   - Solo lectura.

Crear tablas mínimas si hacen falta:
- profiles
- user_roles

profiles:
- id uuid primary key relacionado con auth.users
- full_name text
- email text
- status text default 'active'
- created_at timestamptz
- updated_at timestamptz

user_roles:
- id uuid primary key
- user_id uuid references profiles(id)
- role text
- created_at timestamptz

Pantallas:
1. /login
   - Formulario con email y password.
   - Branding MAS SERVICIOS.
   - Mobile-first.
   - Fondo oscuro.
   - Botón amarillo.

2. /usuarios
   - Listado básico.
   - Nombre.
   - Email.
   - Rol.
   - Estado.
   - Crear usuario solo admin.
   - No registro público.

3. /configuracion
   - Sección básica para ver roles y datos generales.
   - Todavía sin configuración avanzada.

Seguridad:
- Activar RLS donde corresponda.
- Admin puede ver todo.
- Viewer solo lectura.
- Cajero no debe poder entrar a /usuarios ni /configuracion si no tiene permiso.

UX:
- Mostrar loading mientras valida sesión.
- Mostrar mensaje claro si el acceso está denegado.
- Botón de cerrar sesión visible en Header o Sidebar.
- Mantener diseño MAS SERVICIOS.

Entregable de esta etapa:
1. Login funcional.
2. Sesión persistente por 12 horas.
3. Logout manual.
4. Rutas protegidas.
5. Roles básicos.
6. Pantalla /usuarios básica.
7. Pantalla AccessDenied.
8. README actualizado con la lógica de sesión.

Al terminar:
- Mostrá resumen de archivos modificados.
- Indicá variables de entorno necesarias.
- Indicá cómo probar login, logout y expiración.
- Frená y esperá el siguiente prompt.

Commit:

git add .
git commit -m "add auth roles and protected routes"
PROMPT 3/6 — Base de datos, auditoría, seeds y notas internas
Continuá con la app interna de MAS SERVICIOS.

Objetivo de esta etapa:
Crear estructura de base de datos operativa, auditoría, seeds iniciales y módulo de notas internas.

No construyas todavía:
- Lógica completa de operaciones de divisas.
- Reporte diario completo.
- Cálculos de cajas.
- Cierres.
- Exportaciones.

MÓDULOS DE ESTA ETAPA:
1. Base de datos operativa.
2. Auditoría.
3. Seeds iniciales.
4. Sistema de notas contextuales.
5. Componentes visuales para notas.

Sucursales:
1. Centro
2. Terminal

Cajas/personas iniciales:
Centro:
- Lourdes
- Vicky
- Antonella mañana

Terminal:
- Román
- Anto tarde

Estos nombres deben poder modificarse después desde configuración.

Bolsas iniciales:
- Bolsa 1: base/límite $2.000.000
- Bolsa 2: base/límite $2.000.000
- Bolsa 3: base/límite $2.000.000
- Bolsa 4: base/límite $2.000.000
- Bolsa 5: base/límite $5.000.000

TABLAS SUGERIDAS:
- branches
- cash_registers
- bags
- bag_assignments
- audit_logs
- notes

branches:
- id uuid primary key
- name text
- slug text
- created_at timestamptz default now()

cash_registers:
- id uuid primary key
- branch_id uuid references branches(id)
- name text
- assigned_user_id uuid references profiles(id)
- status text default 'active'
- current_balance_ars numeric default 0
- created_at timestamptz default now()
- updated_at timestamptz default now()

bags:
- id uuid primary key
- name text
- base_limit_ars numeric not null
- current_cash_ars numeric default 0
- current_account_ars numeric default 0
- current_usd numeric default 0
- borrowed_ars numeric default 0
- average_usd_cost numeric default 0
- accumulated_profit_ars numeric default 0
- status text default 'ok'
- responsible_user_id uuid references profiles(id)
- created_at timestamptz default now()
- updated_at timestamptz default now()

bag_assignments:
- id uuid primary key
- bag_id uuid references bags(id)
- user_id uuid references profiles(id)
- created_at timestamptz default now()

audit_logs:
- id uuid primary key
- user_id uuid references profiles(id)
- action text
- entity_type text
- entity_id uuid
- old_data jsonb
- new_data jsonb
- reason text
- created_at timestamptz default now()

NOTAS:
Crear sistema de notas interno para dejar observaciones en:
1. Cada bolsa.
2. Cada caja.
3. Cada operación de bolsa.
4. Cada carga diaria de caja.
5. Cada cierre.
6. Cada gasto.
7. Cada reporte diario.
8. Notas generales.

Ejemplos:
- “Faltan $11.000, revisar con Nico.”
- “Bolsa prestó $30.000 para pasteles.”
- “PF debe a bolsa giro $1.100.000.”
- “Diferencia por sueldos.”
- “Caja pendiente de cerrar.”
- “Movimiento cargado tarde.”

Tabla notes:
- id uuid primary key
- entity_type text not null
- entity_id uuid
- title text
- content text not null
- priority text default 'normal'
- status text default 'abierta'
- created_by uuid references profiles(id)
- created_at timestamptz default now()
- resolved_at timestamptz
- resolved_by uuid references profiles(id)
- annulled_at timestamptz
- annulled_by uuid references profiles(id)
- annulment_reason text

Valores entity_type:
- bag
- bag_operation
- cash_register
- cash_daily_report
- daily_report
- expense
- closure
- general

Valores priority:
- normal
- importante
- urgente

Valores status:
- abierta
- resuelta
- anulada

Índices:
- entity_type, entity_id
- status
- priority
- created_at
- created_by

Reglas de notas:
- No borrar notas definitivamente.
- Permitir anular nota con motivo.
- Permitir marcar como resuelta.
- Permitir marcar como importante.
- Permitir marcar como urgente.
- No permitir edición libre de notas cerradas o anuladas.
- Cada acción sobre notas debe generar audit_log.

Acciones auditables:
- crear nota
- resolver nota
- marcar importante
- marcar urgente
- anular nota
- editar nota si se permite

Componentes UI:
- NotesPanel
- NoteCard
- NoteForm
- NoteStatusBadge
- ImportantNotesWidget

Diseño:
- Mobile-first.
- Cards simples.
- Notas importantes con badge amarillo.
- Notas urgentes con estado rojo.
- Notas resueltas con estado verde.
- Mantener branding MAS SERVICIOS.

Dónde preparar NotesPanel:
- /bolsas/[id]
- /cajas/[id]
- /gastos
- /cierres
- /dashboard

Dashboard parcial:
Agregar card “Notas importantes” en /dashboard:
- Últimas notas importantes.
- Notas urgentes abiertas.
- Notas sin resolver.
- Entidad relacionada: bolsa, caja, gasto, cierre, operación o general.
- Link preparado para ir al detalle correspondiente.

Seeds:
Crear datos iniciales para:
- Sucursales Centro y Terminal.
- 5 cajas.
- 5 bolsas.
- Categorías base vacías o preparadas si hace falta.

RLS:
- Activar RLS en tablas.
- Crear policies básicas según roles.
- Admin ve todo.
- Encargado ve registros operativos.
- Cajero ve registros asignados.
- Viewer solo lectura.

Entregable de esta etapa:
1. Migraciones SQL o schema completo.
2. Tipos TypeScript.
3. Seeds iniciales.
4. Audit logs.
5. Sistema de notas funcional.
6. Componentes de notas.
7. Card de notas importantes en dashboard.
8. Configuración básica mostrando sucursales, cajas y bolsas.
9. README actualizado.

Al terminar:
- Mostrar resumen de tablas creadas.
- Mostrar archivos modificados.
- Mostrar cómo correr migraciones/seeds.
- Frenar y esperar el siguiente prompt.

Commit:

git add .
git commit -m "add database audit seeds and notes"
PROMPT 4/6 — Módulo completo de bolsas de divisas
Continuá con la app interna de MAS SERVICIOS.

Objetivo de esta etapa:
Construir el módulo completo de bolsas de divisas.

Contexto:
La empresa trabaja con 5 bolsas de divisas:
- Bolsa 1: base/límite $2.000.000
- Bolsa 2: base/límite $2.000.000
- Bolsa 3: base/límite $2.000.000
- Bolsa 4: base/límite $2.000.000
- Bolsa 5: base/límite $5.000.000

Regla principal:
El control de bolsas de divisas se actualiza todos los días y después de cada operación.
Cada operación debe impactar automáticamente en el saldo de la bolsa.

Cada bolsa debe controlar:
- Pesos en efectivo.
- Pesos en cuenta.
- Dólares disponibles.
- Dinero prestado.
- Capital base o límite.
- Diferencia contra capital base.
- Ganancia estimada.
- Historial de movimientos.
- Responsable.
- Notas internas.
- Estado:
  - ok
  - revisar
  - diferencia
  - pendiente_cierre

TIPOS DE OPERACIÓN:
1. compra_usd
2. venta_usd
3. ingreso_pesos_efectivo
4. egreso_pesos_efectivo
5. ingreso_pesos_cuenta
6. egreso_pesos_cuenta
7. prestamo_entregado
8. prestamo_recibido
9. devolucion_prestamo
10. ajuste_manual
11. anulacion_operacion

Crear tabla bag_operations si todavía no existe.

Campos mínimos:
- id uuid primary key
- bag_id uuid references bags(id)
- operation_type text not null
- amount_usd numeric default 0
- rate_ars numeric default 0
- total_ars numeric default 0
- money_source text
- money_destination text
- profit_ars numeric default 0
- previous_cash_ars numeric default 0
- previous_account_ars numeric default 0
- previous_usd numeric default 0
- previous_borrowed_ars numeric default 0
- new_cash_ars numeric default 0
- new_account_ars numeric default 0
- new_usd numeric default 0
- new_borrowed_ars numeric default 0
- notes text
- status text default 'confirmada'
- created_by uuid references profiles(id)
- created_at timestamptz default now()
- annulled_at timestamptz
- annulled_by uuid references profiles(id)
- annulment_reason text

Crear tabla bag_daily_snapshots:
- id uuid primary key
- bag_id uuid references bags(id)
- date date not null
- cash_ars numeric
- account_ars numeric
- usd_amount numeric
- borrowed_ars numeric
- average_usd_cost numeric
- total_estimated_ars numeric
- base_limit_ars numeric
- difference_ars numeric
- profit_day_ars numeric
- status text
- created_by uuid references profiles(id)
- created_at timestamptz default now()

LÓGICA COMPRA USD:
Cuando el usuario carga compra USD:
- Elige bolsa.
- Ingresa cantidad USD.
- Ingresa cotización de compra.
- Elige desde dónde salen los pesos:
  - efectivo
  - cuenta
- La app calcula:
  total_ars = amount_usd × rate_ars
- Si sale desde efectivo:
  current_cash_ars disminuye.
- Si sale desde cuenta:
  current_account_ars disminuye.
- current_usd aumenta.
- Recalcular costo promedio USD.
- Guardar saldos anteriores y nuevos.
- Crear audit_log.
- Crear nota relacionada si el usuario escribió una observación.

LÓGICA VENTA USD:
Cuando el usuario carga venta USD:
- Elige bolsa.
- Ingresa cantidad USD.
- Ingresa cotización de venta.
- Elige dónde entran los pesos:
  - efectivo
  - cuenta
- La app calcula:
  total_ars = amount_usd × rate_ars
- Validar que no venda más USD de los disponibles.
- current_usd disminuye.
- Si entra a efectivo:
  current_cash_ars aumenta.
- Si entra a cuenta:
  current_account_ars aumenta.
- Calcular ganancia con costo promedio:
  profit_ars = (rate_ars - average_usd_cost) × amount_usd
- Sumar profit_ars a accumulated_profit_ars.
- Guardar saldos anteriores y nuevos.
- Crear audit_log.
- Crear nota relacionada si el usuario escribió una observación.
- Si no hay costo promedio suficiente, marcar operación como revisar.

LÓGICA INGRESO/EGRESO PESOS:
- ingreso_pesos_efectivo aumenta current_cash_ars.
- egreso_pesos_efectivo disminuye current_cash_ars.
- ingreso_pesos_cuenta aumenta current_account_ars.
- egreso_pesos_cuenta disminuye current_account_ars.
- Todo debe tener motivo/observación.

LÓGICA PRÉSTAMOS:
prestamo_entregado:
- Disminuye efectivo o cuenta.
- Aumenta borrowed_ars o registra deuda a favor según criterio.
- Debe tener nota obligatoria.

prestamo_recibido:
- Aumenta efectivo o cuenta.
- Registra deuda.
- Debe tener nota obligatoria.

devolucion_prestamo:
- Ajusta borrowed_ars.
- Aumenta o disminuye efectivo/cuenta según corresponda.
- Debe tener nota obligatoria.

AJUSTE MANUAL:
- Solo admin o encargado.
- Debe exigir motivo.
- Puede ajustar pesos, USD o prestado.
- Siempre crear audit_log.
- Siempre crear nota.

ANULACIÓN:
- No borrar operaciones.
- Marcar status = anulada.
- Guardar annulled_at, annulled_by, annulment_reason.
- Crear operación compensatoria o recalcular con cuidado.
- Debe quedar audit_log.
- Debe tener nota obligatoria.

VALIDACIONES:
- No vender más USD de los disponibles.
- No permitir saldos negativos salvo admin con confirmación.
- No permitir operación sin bolsa.
- No permitir cotización menor o igual a 0 en compra/venta.
- No permitir cantidad USD menor o igual a 0.
- No permitir ajuste sin motivo.
- No permitir anulación sin motivo.

PANTALLAS:
1. /bolsas
   - Lista de 5 bolsas.
   - Card por bolsa.
   - Mostrar:
     - Nombre.
     - Base/límite.
     - Pesos efectivo.
     - Pesos cuenta.
     - USD disponibles.
     - Dinero prestado.
     - Ganancia acumulada.
     - Diferencia estimada.
     - Estado.
   - Botón “Nueva operación”.

2. /bolsas/[id]
   - Detalle completo de una bolsa.
   - Historial de operaciones.
   - Filtros por fecha, tipo, usuario, estado.
   - Botón “Nueva operación”.
   - Botón “Crear ajuste”.
   - Botón “Cierre diario”.
   - Panel “Notas de la bolsa”.
   - Mostrar notas abiertas, importantes, urgentes y resueltas.

3. /bolsas/nueva-operacion
   - Formulario rápido.
   - Mobile-first.
   - Validaciones fuertes.
   - Campo opcional de nota.
   - Si es préstamo, ajuste o anulación, nota obligatoria.

4. /bolsas/[id]/cierre-diario
   - Crear snapshot diario.
   - Mostrar pesos, USD, prestado, base, diferencia, ganancia del día.
   - Estado OK / revisar.
   - Campo de nota.

Dashboard parcial de bolsas:
- Total pesos en efectivo.
- Total pesos en cuenta.
- Total USD.
- Total prestado.
- Ganancia divisas del día.
- Bolsas con diferencia.
- Operaciones pendientes de revisar.

Exportación:
- Exportar movimientos de una bolsa a CSV.

Seguridad:
- Admin ve todo.
- Encargado ve y carga.
- Cajero ve solo bolsas asignadas.
- Viewer solo lectura.

Entregable:
1. Módulo bolsas funcional.
2. Operaciones de compra y venta USD.
3. Cálculo de saldo.
4. Cálculo de ganancia por costo promedio.
5. Ajustes y anulaciones.
6. Cierre diario de bolsas.
7. Notas dentro de cada bolsa.
8. Auditoría conectada.
9. Exportación CSV.
10. Validaciones.
11. README actualizado.

Al terminar:
- Mostrar resumen de archivos modificados.
- Mostrar cómo probar compra, venta, ajuste, anulación y cierre diario.
- Frenar y esperar el siguiente prompt.

Commit:

git add .
git commit -m "add currency bags module"
PROMPT 5/6 — Cajas Pago Fácil, reporte diario y gastos
Continuá con la app interna de MAS SERVICIOS.

Objetivo de esta etapa:
Construir los módulos de cajas Pago Fácil, reporte diario y gastos.

Contexto:
La empresa tiene dos sucursales:
1. Centro
2. Terminal

Cajas/personas:
Centro:
- Lourdes
- Vicky
- Antonella mañana

Terminal:
- Román
- Anto tarde

Estos nombres ya deberían estar en cash_registers y deben poder modificarse desde configuración.

REGLA IMPORTANTE:
No mezclar saldo de caja con ganancia.

Definiciones:
- Saldo de caja = plata física o cuenta disponible.
- Ganancia de caja = comisión/utilidad generada.
- Gasto = plata usada/descontada.
- Ganancia libre = ganancia final después de gastos.

CATEGORÍAS DE REPORTE PAGO FÁCIL:
- Envíos internacionales
- Pagos internacionales
- Envíos nacionales
- Pagos nacionales
- Extracciones
- Billetera virtual
- Cobro facturas crédito
- Transferencia x efectivo
- Depósito CBU
- Impresiones / CUS-ISA / tickets

Para cada caja/persona y categoría cargar:
- Monto operado.
- Ganancia/comisión.
- Observación opcional.

La app debe calcular:
- Total operado por caja.
- Ganancia por caja.
- Ganancia por sucursal.
- Ganancia total Pago Fácil.
- Ganancia Centro.
- Ganancia Terminal.
- Estado de carga: pendiente, parcial, cargado, revisado.

TABLAS SUGERIDAS:
cash_report_categories:
- id uuid primary key
- name text
- sort_order integer
- active boolean default true
- created_at timestamptz default now()

cash_daily_reports:
- id uuid primary key
- cash_register_id uuid references cash_registers(id)
- branch_id uuid references branches(id)
- report_date date not null
- total_operated_ars numeric default 0
- total_profit_ars numeric default 0
- status text default 'pendiente'
- created_by uuid references profiles(id)
- created_at timestamptz default now()
- updated_at timestamptz default now()

cash_daily_report_lines:
- id uuid primary key
- cash_daily_report_id uuid references cash_daily_reports(id)
- category_id uuid references cash_report_categories(id)
- operated_amount_ars numeric default 0
- profit_amount_ars numeric default 0
- notes text
- created_at timestamptz default now()
- updated_at timestamptz default now()

daily_reports:
- id uuid primary key
- branch_id uuid references branches(id)
- report_date date not null
- automatic_pf_profit_ars numeric default 0
- manual_pf_adjustment_ars numeric default 0
- automatic_currency_profit_ars numeric default 0
- manual_currency_adjustment_ars numeric default 0
- gross_profit_ars numeric default 0
- expenses_ars numeric default 0
- available_profit_ars numeric default 0
- status text default 'abierto'
- created_by uuid references profiles(id)
- created_at timestamptz default now()
- updated_at timestamptz default now()

report_adjustments:
- id uuid primary key
- daily_report_id uuid references daily_reports(id)
- adjustment_type text
- amount_ars numeric
- reason text
- created_by uuid references profiles(id)
- created_at timestamptz default now()
- annulled_at timestamptz
- annulled_by uuid references profiles(id)
- annulment_reason text

expenses:
- id uuid primary key
- branch_id uuid references branches(id)
- date date not null
- amount_ars numeric not null
- category text
- detail text
- status text default 'pendiente'
- paid_from text
- created_by uuid references profiles(id)
- created_at timestamptz default now()
- annulled_at timestamptz
- annulled_by uuid references profiles(id)
- annulment_reason text

Estados de gastos:
- pendiente
- pagado
- imputado
- anulado

REPORTE DIARIO:
Debe reemplazar una planilla donde se cargan:
- Ganancia Pago Fácil.
- Ganancia divisas.
- Gastos.
- Totales por sucursal.

El reporte diario debe mostrar por sucursal:
- Centro.
- Terminal.

Para cada sucursal:
- Ganancia Pago Fácil automática.
- Ajuste manual de ganancia Pago Fácil.
- Ganancia divisas automática.
- Ajuste manual de ganancia divisas.
- Total bruto.
- Gastos imputados/pagados.
- Ganancia libre/disponible.

REGLA DEL AJUSTE:
Necesito una ganancia automática calculada desde las cajas, pero también un campo manual abajo para sumar ajustes adicionales.

Ejemplo:
- Ganancia Pago Fácil automática.
- Ajuste manual Ganancia Pago Fácil.
- Ganancia divisas automática.
- Ajuste manual Ganancia Divisas.
- Total final.

Fórmulas:
Ganancia bruta =
automatic_pf_profit_ars
+ manual_pf_adjustment_ars
+ automatic_currency_profit_ars
+ manual_currency_adjustment_ars

Ganancia libre =
gross_profit_ars - expenses_ars

Gastos:
Los gastos deben cargarse como registros individuales, no como texto suelto.

Pantalla /gastos:
- Crear gasto.
- Listar gastos.
- Filtrar por fecha, sucursal, estado y categoría.
- Anular gasto con motivo.
- Campo de nota.
- Estados visibles.

Formulario de gasto:
- Fecha.
- Sucursal.
- Monto.
- Categoría.
- Detalle.
- Estado.
- Pagado desde:
  - caja
  - ganancia
  - cuenta
  - otro
- Nota opcional.

PANTALLAS:
1. /cajas
   - Lista de 5 cajas.
   - Sucursal.
   - Responsable.
   - Estado de carga del día.
   - Total operado.
   - Ganancia.
   - Botón cargar.

2. /cajas/[id]
   - Detalle de caja.
   - Historial de cargas.
   - Notas de la caja.
   - Estado.
   - Total de hoy.
   - Ganancia de hoy.

3. /cajas/[id]/cargar
   - Formulario mobile-first.
   - Categorías fijas.
   - Dos campos por categoría:
     - Monto operado.
     - Ganancia/comisión.
   - Observación opcional por categoría.
   - Campo de nota general.
   - Guardado parcial.
   - Validaciones.

4. /reporte-diario
   - Selector de fecha.
   - Bloque Centro.
   - Bloque Terminal.
   - Ganancia Pago Fácil automática.
   - Ajuste manual Pago Fácil.
   - Ganancia divisas automática.
   - Ajuste manual divisas.
   - Gastos.
   - Total bruto.
   - Ganancia libre/disponible.
   - Estado de cada caja.
   - Estado del reporte.

5. /gastos
   - Listado.
   - Crear gasto.
   - Anular gasto.
   - Filtros.
   - Totales por fecha y sucursal.

NOTAS:
Incluir NotesPanel en:
- /cajas/[id]
- /reporte-diario
- /gastos si aplica

Auditoría:
Generar audit_log para:
- Crear carga de caja.
- Editar carga.
- Crear ajuste manual.
- Anular ajuste.
- Crear gasto.
- Anular gasto.
- Cerrar reporte diario.

Validaciones:
- No permitir montos negativos.
- No permitir ganancia negativa salvo ajuste autorizado.
- No permitir gasto sin detalle.
- No permitir ajuste manual sin motivo.
- No borrar registros.
- Anular con motivo.

Seguridad:
- Admin ve todo.
- Encargado ve y carga todo.
- Cajero carga solo su caja asignada.
- Viewer solo lectura.

Entregable:
1. Módulo cajas funcional.
2. Carga diaria por caja.
3. Reporte diario por Centro y Terminal.
4. Ajustes manuales.
5. Gastos.
6. Cálculo de ganancia libre.
7. Notas en cajas.
8. Auditoría.
9. Validaciones.
10. README actualizado.

Al terminar:
- Mostrar resumen de archivos modificados.
- Mostrar cómo probar carga de caja, reporte diario y gastos.
- Frenar y esperar el siguiente prompt.

Commit:

git add .
git commit -m "add cash registers daily reports and expenses"
PROMPT 6/6 — Dashboard Nico, cierres, exportaciones, QA y pulido final
Continuá con la app interna de MAS SERVICIOS.

Objetivo de esta etapa:
Cerrar la app con dashboard para Nico, cierres, exportaciones, alertas, pruebas manuales y pulido final.

MÓDULOS:
1. Dashboard general.
2. Cierre diario de divisas.
3. Cierre semanal Pago Fácil.
4. Exportaciones.
5. Alertas internas.
6. Validaciones finales.
7. Pulido UX.
8. Checklist de pruebas.

DASHBOARD PARA NICO:
Crear /dashboard como vista principal del dueño.

Debe mostrar cards claras:
- Ganancia Pago Fácil hoy.
- Ganancia divisas hoy.
- Gastos hoy.
- Ganancia libre hoy.
- Ganancia Centro.
- Ganancia Terminal.
- Bolsas OK.
- Bolsas con diferencia.
- Cajas cargadas.
- Cajas pendientes.
- Último cierre semanal.
- Cierre semanal pendiente si corresponde.
- Notas importantes.
- Notas urgentes abiertas.
- Operaciones pendientes de revisar.

Diseño:
- Mobile-first.
- Cards grandes.
- Números claros.
- Alto contraste.
- Acciones principales en amarillo.
- Estados OK en verde.
- Estados revisar en amarillo.
- Diferencias/error en rojo.

ALERTAS:
Crear sistema de alertas internas calculadas.

Alertas sugeridas:
- Caja pendiente de cargar.
- Bolsa con diferencia.
- Gasto alto.
- Ganancia libre negativa.
- Operación anulada.
- Cierre semanal pendiente.
- Venta de USD con costo promedio no calculable.
- Nota urgente abierta.
- Reporte diario sin cerrar.
- Bolsa sin cierre diario.

Las alertas pueden ser calculadas desde datos existentes.
No hace falta notificación push todavía.
Mostrar en dashboard.

CIERRE DIARIO DE DIVISAS:
Cada bolsa debe poder tener snapshot diario.

Ya existe o debe existir:
bag_daily_snapshots.

Pantalla:
- /cierres
- Sección “Cierre diario divisas”
- Selector de fecha.
- Listado de 5 bolsas.
- Estado:
  - cerrado
  - pendiente
  - revisar
- Botón para cerrar cada bolsa.
- Botón para ver detalle.

El cierre diario debe guardar:
- Pesos en efectivo.
- Pesos en cuenta.
- USD disponibles.
- Prestado.
- Costo promedio USD.
- Total estimado.
- Base/límite.
- Diferencia.
- Ganancia del día.
- Estado.
- Usuario.
- Fecha/hora.
- Nota opcional.

CIERRE SEMANAL PAGO FÁCIL:
Regla:
- El ciclo operativo va de viernes a jueves.
- Todos los jueves a la noche se cierra la caja Pago Fácil.
- Después del cierre, las cajas quedan en $0.
- No se borra historial.
- Se guarda snapshot semanal.
- Si hay diferencia, debe quedar marcada como “revisar”.

Crear tablas si todavía no existen:

weekly_closures:
- id uuid primary key
- week_start date
- week_end date
- closed_at timestamptz
- status text
- total_pf_profit_ars numeric
- total_expenses_ars numeric
- total_available_profit_ars numeric
- created_by uuid references profiles(id)
- created_at timestamptz default now()

weekly_closure_lines:
- id uuid primary key
- weekly_closure_id uuid references weekly_closures(id)
- cash_register_id uuid references cash_registers(id)
- branch_id uuid references branches(id)
- total_operated_ars numeric
- total_profit_ars numeric
- final_balance_ars numeric
- difference_ars numeric
- status text
- notes text
- created_at timestamptz default now()

Pantalla /cierres:
Debe tener:
1. Cierre diario divisas.
2. Cierre semanal Pago Fácil.
3. Historial de cierres.

Cierre semanal Pago Fácil:
- Mostrar semana actual: viernes a jueves.
- Mostrar 5 cajas.
- Mostrar total operado semanal.
- Mostrar ganancia semanal.
- Mostrar diferencias.
- Confirmar cierre.
- Al confirmar:
  - Crear weekly_closure.
  - Crear weekly_closure_lines.
  - Dejar current_balance_ars de cajas en 0.
  - Mantener historial.
  - Crear audit_log.
  - Crear nota si se escribe observación.

No borrar ningún reporte diario.

EXPORTACIONES:
Agregar:
1. Exportar reporte diario a PDF.
2. Exportar reporte diario a CSV.
3. Exportar movimientos de bolsa a CSV.
4. Exportar cierre semanal a PDF.
5. Exportar gastos por fecha a CSV.

Los PDF deben ser simples, claros y con branding MAS SERVICIOS:
- Logo textual.
- Fecha.
- Sucursal.
- Totales.
- Detalle.
- Notas importantes.
- Pie con fecha de generación.

No usar diseños recargados.
Priorizar legibilidad.

PULIDO UX:
Revisar:
- Mobile-first.
- Formularios simples.
- Inputs grandes.
- Botones grandes.
- Estados visuales claros.
- Carga y error states.
- Confirmaciones antes de anular.
- Confirmaciones antes de cerrar semana.
- Mensajes de éxito/error.
- Formato de moneda argentina.
- Formato de USD.
- Fechas en formato local.

Formato monetario:
- ARS con separador de miles.
- USD separado y claro.
- No mezclar pesos y USD en la misma celda sin etiqueta.

AUDITORÍA:
Asegurar audit_log para:
- Crear operación de bolsa.
- Anular operación.
- Crear ajuste.
- Crear carga de caja.
- Editar carga de caja.
- Crear gasto.
- Anular gasto.
- Crear nota.
- Resolver nota.
- Anular nota.
- Cierre diario de bolsa.
- Cierre semanal Pago Fácil.
- Logout opcional si ya está implementado.

SEGURIDAD:
Revisar permisos:
- Admin ve todo.
- Encargado ve y carga operaciones.
- Cajero solo carga su caja o bolsa asignada.
- Viewer solo lectura.
- /usuarios solo admin.
- /configuracion solo admin o encargado según corresponda.

CHECKLIST DE PRUEBAS MANUALES:
Crear una página o sección en README con este checklist:

1. Login:
   - Iniciar sesión.
   - Recargar página y verificar que sigue logueado.
   - Cerrar sesión.
   - Simular sesión vencida y verificar redirección a login.

2. Bolsas:
   - Crear compra USD.
   - Ver que bajan pesos y suben USD.
   - Crear venta USD.
   - Ver que bajan USD y suben pesos.
   - Ver ganancia calculada.
   - Intentar vender más USD de los disponibles y verificar bloqueo.
   - Crear ajuste manual con motivo.
   - Anular operación con motivo.
   - Crear nota en bolsa.
   - Marcar nota como resuelta.

3. Cajas:
   - Cargar reporte de Lourdes.
   - Cargar reporte de Vicky.
   - Cargar reporte de Antonella mañana.
   - Cargar reporte de Román.
   - Cargar reporte de Anto tarde.
   - Ver totales por caja.
   - Ver totales por sucursal.

4. Reporte diario:
   - Ver ganancia Pago Fácil automática.
   - Agregar ajuste manual Pago Fácil.
   - Ver ganancia divisas automática.
   - Agregar ajuste manual divisas.
   - Registrar gasto.
   - Ver ganancia libre.
   - Ver Centro y Terminal separados.

5. Gastos:
   - Crear gasto.
   - Filtrar por fecha.
   - Filtrar por sucursal.
   - Anular gasto con motivo.
   - Ver impacto en ganancia libre.

6. Cierres:
   - Crear cierre diario de una bolsa.
   - Crear cierre diario de las 5 bolsas.
   - Crear cierre semanal Pago Fácil.
   - Confirmar que las 5 cajas quedan en 0.
   - Confirmar que el historial no se borra.

7. Dashboard:
   - Ver ganancias.
   - Ver gastos.
   - Ver cajas pendientes.
   - Ver bolsas con diferencia.
   - Ver notas importantes.
   - Ver alertas.

8. Exportaciones:
   - Exportar reporte diario PDF.
   - Exportar cierre semanal PDF.
   - Exportar movimientos de bolsa CSV.
   - Exportar gastos CSV.

ENTREGABLE FINAL:
1. Dashboard Nico completo.
2. Cierre diario de divisas.
3. Cierre semanal Pago Fácil.
4. Exportaciones.
5. Alertas internas.
6. Auditoría revisada.
7. Permisos revisados.
8. UX pulida.
9. README final.
10. Checklist de pruebas manuales.

Al terminar:
- Mostrar resumen final de rutas creadas.
- Mostrar tablas creadas.
- Mostrar archivos principales.
- Mostrar pendientes técnicos si queda algo.
- No inventar integraciones externas.
- No integrar sistemas financieros reales.

Commit final:

git add .
git commit -m "add dashboard closures exports and qa"
Regla para no perder trabajo

Después de cada prompt:

npm run lint
npm run build
git add .
git commit -m "mensaje del modulo" //


Ideas a sumar:
Que Nico pueda avisar por el sistema a cuanto compramos y vendemos dolares y euros, 
