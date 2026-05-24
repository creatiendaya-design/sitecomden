/**
 * Pure permission resolution logic — no DB calls, no React `cache`, no
 * "use server". Lives in its own module so unit tests can exercise the
 * branching (super-admin bypass, DENY override, GRANT override, role
 * inheritance) without spinning up Prisma.
 *
 * lib/permissions.ts is the server-action wrapper: it loads the user
 * via Prisma and delegates the decision to this function.
 */

import { SUPER_ADMIN_LEVEL } from "@/lib/constants";

export interface PermissionRef {
  permission: { key: string };
}

export interface RoleWithPermissions {
  level: number;
  permissions: PermissionRef[];
}

export interface CustomPermissionEntry {
  permission: { key: string };
  type: "GRANT" | "DENY";
}

export interface UserPermissionView {
  role: RoleWithPermissions | null;
  customPermissions: CustomPermissionEntry[];
}

/**
 * Backward-compat alias map. Some permission keys evolved over time:
 *   - seed catalog used `:edit` (e.g. products:edit)
 *   - API routes / server actions adopted REST convention `:update`
 *   - one early API route uses `themes.update` (dot) instead of `themes:update`
 *
 * Roles created from the seed have the *old* keys, but the code asks for the
 * *new* keys → checks fail for everyone except super admin. Rather than force
 * a DB migration, we normalize both directions: if the caller asks for any
 * key listed below, we also accept its alias.
 *
 * Order: most-specific → most-generic (granular `settings:edit_*` count as
 * `settings:edit` and `settings:update`).
 */
const PERMISSION_ALIASES: Record<string, string[]> = {
  // CRUD: REST `update` ⇄ legacy `edit`
  "products:update": ["products:edit"],
  "products:edit": ["products:update"],
  "categories:update": ["categories:edit"],
  "categories:edit": ["categories:update"],
  "coupons:update": ["coupons:edit"],
  "coupons:edit": ["coupons:update"],
  "orders:update": ["orders:edit"],
  "orders:edit": ["orders:update"],
  "customers:update": ["customers:edit"],
  "customers:edit": ["customers:update"],

  // Settings: seed split it by area, code asks for the umbrella key.
  "settings:update": [
    "settings:edit",
    "settings:edit_general",
    "settings:edit_payments",
    "settings:edit_emails",
    "settings:edit_shipping",
  ],
  "settings:edit": [
    "settings:update",
    "settings:edit_general",
    "settings:edit_payments",
    "settings:edit_emails",
    "settings:edit_shipping",
  ],
};

/**
 * Normalize one requested key into the set of equivalent keys we accept
 * from the user's role / custom permissions. Dot ⇄ colon are treated as
 * the same separator (`themes.update` == `themes:update`).
 */
function expandAliases(requested: string): string[] {
  const colonForm = requested.replace(/\./g, ":");
  const out = new Set<string>([requested, colonForm]);
  for (const alias of PERMISSION_ALIASES[colonForm] ?? []) {
    out.add(alias);
  }
  return Array.from(out);
}

/**
 * Decide whether the given user has the given permission key.
 *
 * Precedence:
 *   1. Super admin role bypasses every check.
 *   2. A per-user `DENY` (on any accepted alias) always wins over the grant.
 *   3. A per-user `GRANT` (on any accepted alias) wins over the role.
 *   4. Otherwise, fall back to the role's permission list (any accepted alias).
 */
export function checkPermission(
  user: UserPermissionView,
  permissionKey: string,
): boolean {
  if (user.role && user.role.level >= SUPER_ADMIN_LEVEL) {
    return true;
  }

  const acceptedKeys = expandAliases(permissionKey);

  // DENY wins over GRANT — scan custom permissions first.
  let granted = false;
  for (const cp of user.customPermissions) {
    if (!acceptedKeys.includes(cp.permission.key)) continue;
    if (cp.type === "DENY") return false;
    if (cp.type === "GRANT") granted = true;
  }
  if (granted) return true;

  return (
    user.role?.permissions.some((rp) =>
      acceptedKeys.includes(rp.permission.key),
    ) ?? false
  );
}
