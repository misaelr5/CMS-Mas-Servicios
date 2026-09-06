# MAS Servicios — Business Management System

Production-oriented internal management platform built for a real multi-branch business operation.

The system centralizes cash registers, USD purchase/sale operations, expenses, daily reports, weekly closings, operational notes and audit trails in a single role-based application.

## Why this project matters

This is not a tutorial project. It was designed around real operational workflows, permissions, financial controls and traceability requirements.

The goal is to replace disconnected spreadsheets, notes and manual processes with one consistent internal system.

## Core features

- Multi-role authentication and authorization
- Branch and cash-register management
- USD purchase and sale operations
- Daily cash reports
- Daily business closings
- Weekly Pago Fácil closings
- Expense tracking
- Manual adjustments with mandatory reasons
- Operational notes with priorities and status
- Audit logs for sensitive actions
- CSV exports
- Protected routes and session expiration
- Row Level Security policies in PostgreSQL/Supabase

## Stack

- **Next.js** — App Router
- **React**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Supabase Auth**
- **PostgreSQL**
- **Supabase Row Level Security**
- **Vitest**

## Architecture

The application separates UI, server-side access control and persistence concerns.

Important operations are validated on the server and recorded for traceability. The database model covers users, roles, branches, cash registers, bags, financial operations, reports, expenses, notes and audit events.

### Main domain areas

```text
Authentication & Roles
        │
        ├── Branches
        │    └── Cash Registers
        │         └── Daily Reports
        │
        ├── USD Bags
        │    ├── Operations
        │    ├── Transfers
        │    └── Daily Snapshots
        │
        ├── Expenses
        ├── Daily Closings
        ├── Weekly Closings
        ├── Notes
        └── Audit Logs
```

## Roles

The application supports different permission levels for operational use:

- **Admin** — full management access
- **Manager** — operational management and review
- **Cashier** — assigned cash-register operations
- **Viewer** — read-only access

Authorization is reinforced through server-side guards and database-level policies.

## Business rules

Examples of rules enforced by the system:

- USD cannot be sold above available stock.
- Financial operations require valid amounts and exchange rates.
- Adjustments, cancellations and reopen actions require a reason.
- Closed periods block additional changes until explicitly reopened.
- Sensitive changes are recorded instead of silently deleted.
- Operational notes remain linked to their related entities.

## Local development

### Requirements

- Node.js
- pnpm
- Supabase project

### Installation

```bash
pnpm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Then run:

```bash
pnpm dev
```

## Validation

```bash
pnpm build
pnpm test
pnpm audit --prod
```

## Security considerations

- Protected application routes
- Server-side authorization checks
- Supabase Row Level Security
- Service-role credentials restricted to server-side usage
- Audit trail for critical actions
- Explicit cancellation/reopen flows instead of destructive deletion

## Project status

The project is under active development and continues to evolve around the real operational requirements of MAS Servicios.

---

**Author:** [Misael Ledesma](https://github.com/misaelr5)
