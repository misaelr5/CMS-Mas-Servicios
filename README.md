# MAS SERVICIOS CMS interno

Aplicación interna de **Más Servicios** con branding, layout y rutas base ya armadas.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth con sesión persistente de 12 horas

## Correr el proyecto

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm start
```

## Variables de entorno

Crear un `.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Lógica de sesión

- Al iniciar sesión se guarda `session_started_at`.
- La app calcula `session_expires_at` con una ventana de 12 horas.
- Si la sesión vence, la ruta protegida redirige a `/login` con el mensaje `Tu sesión venció. Volvé a iniciar sesión.`
- El cierre manual limpia la sesión de Supabase y la ventana local de la app.

## Cómo probar

1. Abrir `/login`.
2. Ingresar con un usuario creado por admin.
3. Confirmar acceso a `/dashboard`.
4. Cerrar la pestaña y volver a abrir dentro de las 12 horas.
5. Verificar que la sesión siga activa.
6. Cerrar sesión desde el header y confirmar que vuelve a `/login`.
7. Forzar la expiración local borrando la cookie `mas_servicios_session_window` o esperando 12 horas para validar la redirección.

## Base de datos

El archivo [`supabase/schema.sql`](./supabase/schema.sql) deja listas las tablas `profiles` y `user_roles` con RLS para la siguiente etapa.

## Crear el usuario Roman

Con las variables de Supabase cargadas, podés crear el usuario interno con:

```bash
pnpm seed:roman
```

Por defecto crea:

- Email: `roman@masservicios.com`
- Nombre: `Roman`
- Contraseña: `1234`

Si querés cambiar esos datos sin tocar el script, usá:

- `ROMAN_EMAIL`
- `ROMAN_FULL_NAME`
- `ROMAN_PASSWORD`
- `ROMAN_ROLE`
- `ROMAN_STATUS`
