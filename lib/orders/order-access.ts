/**
 * Order access control for the public post-checkout pages
 * (`/orden/[orderId]/{confirmacion,pago-tarjeta,pago-pendiente,pago-paypal}`).
 *
 * These pages are reached right after a purchase via `router.push` (no token in
 * the URL), so we can't rely on a URL token alone. We grant a short-lived,
 * httpOnly cookie when the order is created/paid, keyed by orderId → viewToken.
 * A page is viewable if EITHER:
 *   - the cookie holds a grant whose value equals the order's viewToken, OR
 *   - the URL carries `?token=` equal to the order's viewToken.
 *
 * Both paths compare against `viewToken` (a 64-char DB secret), so neither can
 * be forged without already knowing the secret — closing the IDOR where any
 * orderId (a CUID) exposed another customer's PII.
 *
 * `grantOrderAccess` MUST be called from a Server Action / Route Handler
 * (cookies are writable there). The `canViewOrder` reader works in Server
 * Components (read-only cookies).
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "order_access";
const MAX_GRANTS = 25; // bound cookie size (a buyer accumulates few orders)
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type GrantMap = Record<string, string>;

function parseGrants(raw: string | undefined): GrantMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as GrantMap) : {};
  } catch {
    return {};
  }
}

/**
 * Grant the current browser access to an order. Call from a Server Action /
 * Route Handler after creating or confirming the order. Never throws — access
 * control degrades to the URL-token path (and the email link) if it fails.
 */
export async function grantOrderAccess(
  orderId: string,
  viewToken: string,
): Promise<void> {
  try {
    const store = await cookies();
    const grants = parseGrants(store.get(COOKIE_NAME)?.value);
    grants[orderId] = viewToken;

    // Keep only the most recent grants to bound cookie size.
    const entries = Object.entries(grants);
    const trimmed =
      entries.length > MAX_GRANTS
        ? Object.fromEntries(entries.slice(-MAX_GRANTS))
        : grants;

    store.set(COOKIE_NAME, JSON.stringify(trimmed), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
  } catch {
    // best-effort; the URL token / verificar flow remains as fallback
  }
}

/** True when the browser holds a valid grant for this order. */
async function hasOrderGrant(orderId: string, viewToken: string): Promise<boolean> {
  try {
    const store = await cookies();
    const grants = parseGrants(store.get(COOKIE_NAME)?.value);
    return grants[orderId] === viewToken;
  } catch {
    return false;
  }
}

/**
 * Authoritative read used by the order pages. Returns true if the caller may
 * view the order, via a valid URL token OR a valid access-cookie grant.
 */
export async function canViewOrder(opts: {
  orderId: string;
  viewToken: string;
  urlToken?: string | string[] | null;
}): Promise<boolean> {
  const urlToken = Array.isArray(opts.urlToken) ? opts.urlToken[0] : opts.urlToken;
  if (urlToken && urlToken === opts.viewToken) return true;
  return hasOrderGrant(opts.orderId, opts.viewToken);
}
