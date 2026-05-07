import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { Role, User } from "@prisma/client";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const TOKEN_BYTES = 32; // 256 bits → 64 hex chars

export type AdminUserWithRole = User & { role: Role | null };

interface SessionMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

function newToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

function expiresFromNow(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

/**
 * Issue a new admin session and return the opaque token. Caller stores the
 * token in an httpOnly cookie. The token is the only thing that grants
 * authority — the row in `AdminSession` is the source of truth, so deleting
 * the row revokes the cookie immediately.
 */
export async function createAdminSession(
  userId: string,
  meta: SessionMeta = {},
): Promise<string> {
  const token = newToken();
  await prisma.adminSession.create({
    data: {
      token,
      userId,
      expiresAt: expiresFromNow(),
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  return token;
}

/**
 * Resolve a session token to the underlying user (with role). Returns null if
 * the token is unknown, expired, or belongs to a deactivated user/role.
 *
 * Touches `lastUsedAt` opportunistically (best-effort; failure is non-fatal).
 */
export async function getAdminSession(
  token: string,
): Promise<AdminUserWithRole | null> {
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { token },
    include: {
      user: {
        include: { role: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    // Expired: clean up so the unique index stays small.
    void prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.active) return null;
  if (session.user.role && !session.user.role.active) return null;

  void prisma.adminSession
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return session.user as AdminUserWithRole;
}

/**
 * Revoke a single session by its token (logout).
 */
export async function revokeAdminSession(token: string): Promise<void> {
  if (!token) return;
  await prisma.adminSession
    .delete({ where: { token } })
    .catch(() => {
      // Already gone — idempotent logout.
    });
}

/**
 * Revoke every session a user has (password change, account disabled,
 * "log out everywhere" action). Returns the number of sessions removed.
 */
export async function revokeAllAdminSessionsForUser(
  userId: string,
): Promise<number> {
  const result = await prisma.adminSession.deleteMany({
    where: { userId },
  });
  return result.count;
}
