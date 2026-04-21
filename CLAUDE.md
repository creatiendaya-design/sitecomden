# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build (also runs type-checking)
npm run lint      # Run ESLint
npm start         # Start production server
```

Database commands:
```bash
npx prisma studio              # Open Prisma GUI
npx prisma migrate dev         # Create + apply migration
npx prisma db push             # Push schema without migration
npx prisma generate            # Regenerate Prisma client
npx tsx scripts/<script>.ts    # Run a utility script
```

There are no automated tests in this project.

## Architecture Overview

Full-stack e-commerce platform for Peru (ShopGood) built with **Next.js App Router**, **Prisma + PostgreSQL (Neon)**, and **Clerk** authentication.

### Dual Authentication System

- **Customers** — Clerk (`@clerk/nextjs`). Routes: `/iniciar-sesion`, `/registro`.
- **Admins** — Custom cookie-based sessions (`admin_session` cookie). Logic in `lib/auth.ts`. RBAC with granular per-user and per-role permissions via `lib/permissions.ts`.

Both systems are enforced in `middleware.ts`, which also sets security headers and detects suspicious requests.

#### Admin Auth Usage Patterns

In **API Routes** — use `requireAuth()` / `requirePermission()` / `requireRoleLevel()`:
```ts
const { user, response } = await requirePermission("products.create");
if (response) return response;
```

In **Server Components and Server Actions** — use `getCurrentUser()` or `protectRoute()` from `lib/protect-route.ts`:
```ts
await protectRoute("products:view");         // single permission, OR
await protectRouteAny(["orders:view", "orders:update"]); // any permission
await protectRouteAll(["orders:view", "orders:update"]); // all permissions
```

**Permission slug format**: API routes use dots (`products.create`); `lib/permissions.ts` uses colons (`products:create`). `requirePermission()` converts automatically.

**Role levels**: 1 = Staff, 3 = Editor, 5 = Manager, 10 = Admin, 100+ = Super Admin (bypasses all permission checks).

### Data Mutations: Server Actions vs API Routes

- **Server Actions** (`/actions/*.ts`) — used for all admin/internal mutations (orders, inventory, loyalty, shipping, etc.). These use Prisma directly.
- **API Routes** (`/app/api/`) — used for public/external endpoints: product search, payment gateway webhooks, coupon validation, newsletter signups, complaint submissions.

### App Router Structure

Route groups:
- `app/(shop)/` — Customer-facing storefront (Clerk-protected where needed)
- `app/(checkout)/` — Order and payment flow
- `app/admin/` — Admin dashboard (cookie-session protected)
- `app/admin-auth/` — Admin login/register (public)
- `app/api/admin/` — Admin API routes (require `requireAuth()` / `requirePermission()`)
- `app/api/` — Public API routes

### Key Lib Utilities

| File | Purpose |
|------|---------|
| `lib/db.ts` | Singleton Prisma client |
| `lib/auth.ts` | Admin session management + `requirePermission()` / `requireAuth()` |
| `lib/protect-route.ts` | `protectRoute()` helpers for Server Components |
| `lib/permissions.ts` | RBAC permission checking (uses colon format: `resource:action`) |
| `lib/culqi.ts` | Culqi (Peruvian) payment gateway |
| `lib/email.ts` | Transactional email via Resend |
| `lib/resend.ts` | Resend client singleton |
| `lib/site-settings.ts` | DB-backed site configuration |
| `lib/smart-collections.ts` | Auto-filter product collections |
| `lib/rate-limit.ts` | Upstash Redis rate limiting |
| `lib/order-status-logic.ts` | Order status transitions and business rules |
| `lib/validations.ts` | Zod schemas for shared validation |
| `lib/conversion-api.ts` | Meta/Facebook Conversions API integration |
| `lib/districts-peru.ts` | Peru address hierarchy data |

### State Management

Shopping cart uses **Zustand** with localStorage persistence (`store/cart.ts`). Cart key is `cart-storage`. All other state is server-driven via Server Actions and Next.js cache.

### UI Components

- `/components/ui/` — shadcn/ui base primitives (Radix UI)
- `/components/shop/` — Customer-facing storefront components
- `/components/admin/` — Admin dashboard components
- `/emails/` — React Email templates (sent via Resend)

### Database Schema Highlights

The Prisma schema (`prisma/schema.prisma`) has ~40 models. Key relationships:

- `Product` → `ProductVariant` (SKU/stock per variant) → `ProductOption`/`ProductOptionValue`
- `Order` → `OrderItem` (with product snapshot) → `PendingPayment` (manual verification flow)
- `Customer` → `PointTransaction` / `RewardRedemption` (loyalty program)
- `User` (admin) → `Role` → `Permission` (RBAC)
- `Category` supports smart collection rules (auto-filter by field conditions)
- `Setting` table stores all site config as key-value JSON pairs

### Checkout Flow

1. Cart → `/carrito` (Zustand store)
2. Address/shipping selection → creates `Order` record
3. Payment selection: Culqi (card), Yape, Plin, PayPal
4. Card payments go through `/orden/[orderId]/pago-tarjeta` (Culqi iframe)
5. Bank transfers go through `/orden/[orderId]/pago-pendiente` (manual upload → `PendingPayment`)
6. Admin approves/rejects pending payments via `/admin/pagos-pendientes`
7. Confirmation at `/orden/[orderId]/confirmacion`

### Peru-Specific Features

- `lib/districts-peru.ts` and `Department/Province/District` models for address hierarchy
- Payment methods include Culqi (card), Yape, Plin, PayPal
- Loyalty tiers: BRONZE → SILVER → GOLD → PLATINUM
- Complaints book (`/libro-reclamaciones`) with configurable fields

### Image & File Storage

Images are uploaded to **Vercel Blob** via `/api/upload`. The `next.config.ts` allows remote images from Vercel Blob and other configured hostnames. Sharp is used for server-side image processing.

### Utility Scripts

Located in `/scripts/` — run with `npx tsx scripts/<name>.ts`:
- `setup-permissions.ts` — initialize RBAC permissions
- `init-culqi-config.ts` — seed Culqi payment settings
- `init-complaints-config.ts` — seed complaint form fields
- `diagnose-permission-issue.ts` / `diagnose-super-admin-issue.ts` — debug auth
- `diagnostico-ordenes.ts` — inspect order state
