/**
 * Plan 18 — Optimistic locking (Tier 1).
 *
 * `SaveResult` is the return type of every server action that mutates a
 * versioned resource. Callers branch on `ok` and, when false, on `reason`
 * to decide the next step (show conflict dialog, redirect to login, surface
 * validation errors, etc.).
 *
 * Why a tagged union instead of throwing: Next.js Server Actions return
 * serializable values to the client. Errors thrown server-side reach the
 * client as opaque "An error occurred in the Server Components render" —
 * useless for conflict UX. Returning a discriminated union keeps the
 * conflict path first-class and gives the client the fresh server state
 * needed to render the recovery dialog.
 *
 * See docs/superpowers/guides/concurrency-and-locking.md.
 */
export type SaveResult<TData, TCurrent = TData> =
  | { ok: true; data: TData; version: number }
  | { ok: false; reason: "conflict"; current: TCurrent | null; serverVersion: number | null }
  | { ok: false; reason: "validation"; message: string }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "error"; message: string };

/**
 * Convenience constructors. Server actions can `return ok(updated)` instead
 * of repeating the object literal everywhere.
 */
export function ok<TData>(data: TData, version: number): SaveResult<TData> {
  return { ok: true, data, version };
}

export function conflict<TCurrent>(
  current: TCurrent | null,
  serverVersion: number | null,
): SaveResult<never, TCurrent> {
  return { ok: false, reason: "conflict", current, serverVersion };
}

export function validation(message: string): SaveResult<never> {
  return { ok: false, reason: "validation", message };
}

export function unauthorized(): SaveResult<never> {
  return { ok: false, reason: "unauthorized" };
}

export function notFound(): SaveResult<never> {
  return { ok: false, reason: "not_found" };
}

export function errored(message: string): SaveResult<never> {
  return { ok: false, reason: "error", message };
}
