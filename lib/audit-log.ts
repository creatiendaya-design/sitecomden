import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Append-only audit logger for admin actions.
 *
 * Design notes:
 * - Inserts are best-effort. Failures are swallowed (logged, not thrown) so a
 *   broken AuditLog can never block a legitimate admin action. The cost of
 *   silent gaps in the trail is lower than the cost of breaking writes.
 * - `userId` is a plain string column (not a Prisma relation) so deleting a
 *   user never cascades or blocks history.
 * - Use sparingly: write one row per *meaningful* action, not per HTTP call.
 *   Reads should not be logged. Login/logout, permission changes, payment
 *   approvals, deletions of catalog/orders/users, RBAC edits — yes.
 *   Listing products, opening forms — no.
 */

export interface AuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

async function getRequestContext(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    const userAgent = h.get("user-agent") ?? null;
    return { ip, userAgent };
  } catch {
    // headers() throws outside a request scope (e.g. background jobs).
    return { ip: null, userAgent: null };
  }
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  const { ip, userAgent } = await getRequestContext();

  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        before: (input.before ?? null) as never,
        after: (input.after ?? null) as never,
        metadata: (input.metadata ?? null) as never,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("[audit-log] failed to record event", {
      action: input.action,
      entityType: input.entityType,
      error,
    });
  }
}
