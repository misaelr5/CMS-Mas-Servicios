# MAS SERVICIOS CMS interno

Base inicial de la app interna de **Más Servicios** para operar con **MAS SERVICIOS**.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui preparado
- Supabase preparado sin lógica de negocio

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

Crear un `.env.local` con estas claves cuando se empiece a conectar Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
