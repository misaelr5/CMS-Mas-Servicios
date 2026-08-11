# Deploy

## Requisitos previos

- Proyecto de Supabase creado y migraciones aplicadas.
- Variables de entorno definidas en Vercel o en el entorno de deploy.
- Build local validado con `pnpm build`.

## Variables necesarias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Comandos locales

```bash
pnpm install
pnpm build
pnpm start
```

## Deploy en Vercel

1. Conectar el repo a Vercel.
2. Cargar las variables de entorno.
3. Ejecutar un deploy de preview.
4. Revisar la build antes de promocionar a produccion.

## Que verificar despues del deploy

- `/login` abre correctamente.
- Las rutas protegidas redirigen si no hay sesion.
- `/dashboard` carga sin errores.
- Supabase responde y la app muestra datos reales.
- Exportaciones y notas funcionan segun el rol.

## Como probar login

- Ingresar con un usuario valido.
- Confirmar que la sesion se mantiene segun la ventana de 12 horas.
- Cerrar sesion manualmente.
- Verificar redireccion al expirar.

## Como probar conexion Supabase

- Abrir `/dashboard` y revisar si carga data real.
- Validar que las tablas criticas existan en Supabase.
- Revisar que no haya errores de schema cache o tablas faltantes.

## Como revisar rutas protegidas

- Abrir una ruta protegida sin sesion.
- Confirmar redireccion a `/login`.
- Probar con un usuario sin permiso y confirmar `AccessDenied`.

## Como revisar logs

- Revisar logs de Vercel para errores de build o runtime.
- Revisar `audit_logs` en Supabase para acciones criticas.
- Revisar consola del servidor solo para errores tecnicos, no para secretos.

## Rollback manual

- Volver a un deployment anterior desde Vercel.
- Si hay un problema de datos, detener cambios y revisar la ultima migracion aplicada.
- No repetir acciones criticas sin verificar el estado de la base.
