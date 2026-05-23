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
 * Decide whether the given user has the given permission key.
 *
 * Precedence:
 *   1. Super admin role bypasses every check.
 *   2. A per-user `DENY` always wins over the role grant.
 *   3. A per-user `GRANT` wins over the role (even if the role lacks it).
 *   4. Otherwise, fall back to the role's permission list.
 */
export function checkPermission(
  user: UserPermissionView,
  permissionKey: string,
): boolean {
  if (user.role && user.role.level >= SUPER_ADMIN_LEVEL) {
    return true;
  }

  const custom = user.customPermissions.find(
    (cp) => cp.permission.key === permissionKey,
  );
  if (custom?.type === "DENY") return false;
  if (custom?.type === "GRANT") return true;

  return (
    user.role?.permissions.some(
      (rp) => rp.permission.key === permissionKey,
    ) ?? false
  );
}
