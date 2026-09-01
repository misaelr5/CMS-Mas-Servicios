# Seguridad

## Resumen

El proyecto tiene una base razonable (Supabase Auth, RLS, roles y checks en Server Actions), pero no esta listo para datos financieros reales. La combinacion de framework vulnerable, paginas sin guard server-side y consultas `service_role` es un P0.

## Hallazgos

### P0

1. **Bypass de autenticacion con impacto potencial en datos.** `pnpm audit --prod` detecto el advisory alto de bypass del proxy para Next 16.2.9 (App Router/Turbopack/single locale, condiciones presentes). Ocho paginas de bolsas/cajas consultan con servicios admin aun si `auth` es null. `RouteGate` corre en cliente y no impide que los datos viajen en el payload RSC. Actualizar Next y agregar `requireServerAuth/requireRole` dentro de cada pagina antes de consultar.
2. **Corrupcion financiera por anulacion.** Es seguridad de integridad: cualquier admin/encargado autorizado puede anular una operacion antigua y devolver la bolsa a un saldo historico, eliminando logicamente movimientos posteriores.

### P1

1. **RLS de lectura demasiado amplia / IDOR.** Policies `using (true)` permiten a cualquier usuario autenticado leer bolsas, operaciones, cajas, reportes, gastos y cierres mediante la REST API de Supabase, aunque la UI intente limitar al cajero.
2. **Audit log falsificable.** La policy permite insert directo si `user_id = auth.uid()`, incluyendo `action`, entidad y JSON arbitrarios. La rama remota contiene una migracion candidata para eliminar esa policy.
3. **Dependencias vulnerables.** Audit: 9 altas y 7 moderadas. Principales fixes indicados por el gestor: Next >=16.2.11, sharp >=0.35.0 y cadenas PostCSS/nanoid actualizadas. Debe actualizarse en rama separada con build/tests.
4. **Credenciales inseguras en seed.** Password debil hardcodeada, admin por defecto y log de password efectiva. Si se ejecuto sin overrides, la cuenta es trivial de comprometer. Estado en DB real: NO VERIFICADO.
5. **Repo publico con informacion operativa.** Nombres, emails corporativos previstos, UUID de usuarios, estructura de sucursales y saldos iniciales facilitan phishing/reconocimiento. No son secretos criptograficos, pero deben revisarse.
6. **Ventana de sesion manipulable.** La cookie JSON se escribe desde JS, no es `HttpOnly` ni esta firmada; un usuario autenticado puede extender su `session_expires_at`. Supabase sigue validando al usuario, pero la regla interna de 12 h no es confiable.
7. **Mutaciones con service role no atomicas.** Un fallo deja datos parciales y RLS no ayuda porque el cliente admin la evita.

### P2/P3

- Validacion manual sin longitud maxima, esquemas compartidos ni normalizacion exhaustiva.
- Alta de usuario confirma email automaticamente y no impone politica propia de password.
- Alta de auth + perfil + rol no es atomica; puede dejar usuario huerfano.
- No hay headers declarados (CSP, frame-ancestors/X-Frame-Options, Referrer-Policy, Permissions-Policy). HSTS normalmente se delega al hosting, hoy NO VERIFICADO.
- No hay rate limiting/captcha aplicativo; Supabase puede aplicar limites de Auth, configuracion real NO VERIFICADO.
- Errores crudos de Supabase se muestran en varias actions; pueden filtrar detalles internos.
- CSV puede abrir riesgo de formula injection si se importa en Excel cuando campos controlables comienzan con `=`, `+`, `-` o `@`.
- `safePath` solo exige prefijo `/`; es redireccion interna, pero conviene una allowlist de rutas.

## OWASP

| Riesgo | Evaluacion |
| --- | --- |
| Broken Access Control / IDOR | P0/P1 por proxy, guards faltantes y RLS amplia |
| Cryptographic failures | No se implementa criptografia propia; TLS/hosting NO VERIFICADO |
| Injection | SQL injection no evidente; CSV injection P2 |
| Insecure design | Writes financieros no atomicos y anulacion historica P0/P1 |
| Security misconfiguration | Dependencias vulnerables, headers/CI ausentes |
| Vulnerable components | P1 confirmado por audit |
| Authentication failures | Seed/password y ventana manipulable P1 |
| Integrity failures | Audit log falsificable y sin CI P1 |
| Logging/monitoring | Audit best-effort, sin monitoreo/alertas |
| SSRF | Advisory de Next menciona Server Actions/custom server; explotabilidad exacta NO VERIFICADO |

## Secretos y entorno

- `.env.local` no existe; solo `.env.example` con nombres vacios.
- `.gitignore` cubre `.env.local` y `.env.*.local`, pero no un `.env` generico. Agregarlo antes de uso.
- Busqueda actual por patrones: sin claves reales; dos hits de variables/password de formulario/seed.
- Historial completo con Gitleaks: NO EJECUTADO (herramienta no instalada); es necesario antes de produccion.

## Orden de remediacion

1. Parchear Next y agregar guardas server-side a todas las paginas/actions/handlers.
2. Rotar/verificar cuentas creadas por seeds y retirar password/log defaults.
3. Aplicar RLS scoped y bloquear inserts cliente en auditoria.
4. Reescribir writes financieros transaccionales y anulaciones compensatorias.
5. Zod/limites, headers, errores seguros, CSV seguro y rate limiting.
6. Gitleaks + CodeQL en CI; ZAP sobre staging autenticado.
