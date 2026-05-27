/**
 * Plan 18 — Optimistic locking (Tier 1).
 *
 * `updateWithVersion` wraps Prisma's `updateMany` with a `where: { id, version }`
 * predicate so the UPDATE only matches if the client's expected version is
 * still current. On miss (`count === 0`) it refetches the row to return as
 * `current` so the UI can render a conflict dialog with the fresh server
 * state and the user can choose to discard local changes or force-save.
 *
 * Usage:
 *
 * ```ts
 * import { updateWithVersion } from "@/lib/concurrency/with-version";
 * import { prisma } from "@/lib/db";
 *
 * const result = await updateWithVersion({
 *   model: prisma.theme,
 *   id: input.id,
 *   expectedVersion: input.expectedVersion,
 *   data: { tokens: input.tokens },
 * });
 *
 * if (!result.ok) {
 *   // result.reason === "conflict" | "not_found"
 *   return result;
 * }
 *
 * return ok(result.data, result.version);
 * ```
 *
 * Why not just use `prisma.x.update`? `update` throws when the row doesn't
 * match, and Prisma doesn't expose a way to add an extra WHERE clause that
 * differentiates "missing row" from "version mismatch". `updateMany` returns
 * a `count` we can branch on without try/catch.
 */
import { conflict, notFound, ok, type SaveResult } from "./types";

/**
 * Minimal Prisma delegate surface we depend on. Each model client (`prisma.theme`,
 * `prisma.page`, etc.) satisfies this without us importing model-specific types.
 */
interface PrismaDelegateLike<TRow> {
  updateMany(args: {
    where: { id: string; version: number };
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
  findUnique(args: { where: { id: string } }): Promise<TRow | null>;
}

export interface UpdateWithVersionArgs<TRow> {
  /** Prisma model delegate, e.g. `prisma.theme`. */
  model: PrismaDelegateLike<TRow>;
  /** Row id to update. */
  id: string;
  /** Version the client believes is current (came from the last fetch). */
  expectedVersion: number;
  /**
   * Fields to update. The helper appends `version: { increment: 1 }` and
   * forwards everything to `updateMany`. Do NOT include `version` here.
   */
  data: Record<string, unknown>;
}

/**
 * Conditional UPDATE: only matches if `version === expectedVersion`.
 * Returns the post-update row on success, the current server row on conflict,
 * or `not_found` if the id never existed (versus losing a race).
 *
 * The post-update row is fetched in the same call because Prisma's
 * `updateMany` does not return the rows (it returns only `count`).
 */
export async function updateWithVersion<TRow extends { version: number }>(
  args: UpdateWithVersionArgs<TRow>,
): Promise<SaveResult<TRow>> {
  const { model, id, expectedVersion, data } = args;

  const result = await model.updateMany({
    where: { id, version: expectedVersion },
    data: { ...data, version: { increment: 1 } as unknown as number },
  });

  if (result.count === 1) {
    const fresh = await model.findUnique({ where: { id } });
    if (!fresh) {
      // Extremely unlikely: update succeeded but row vanished in the same
      // request window. Treat as not_found rather than silently 500ing.
      return notFound();
    }
    return ok(fresh, fresh.version);
  }

  // count === 0: either the row doesn't exist, or version didn't match.
  // Differentiate by refetching once.
  const current = await model.findUnique({ where: { id } });
  if (!current) {
    return notFound();
  }
  return conflict(current, current.version);
}

/**
 * Variant for when you want the conflict's `current` to be a different
 * shape than the updated row (e.g. include relations). Pass a `refetch`
 * function that returns the shape you want.
 */
export interface UpdateWithVersionAndRefetchArgs<TRow, TCurrent>
  extends Omit<UpdateWithVersionArgs<TRow>, "model"> {
  model: PrismaDelegateLike<TRow>;
  refetch: (id: string) => Promise<TCurrent | null>;
}

export async function updateWithVersionAndRefetch<
  TRow extends { version: number },
  TCurrent,
>(args: UpdateWithVersionAndRefetchArgs<TRow, TCurrent>): Promise<SaveResult<TCurrent>> {
  const { model, id, expectedVersion, data, refetch } = args;

  const result = await model.updateMany({
    where: { id, version: expectedVersion },
    data: { ...data, version: { increment: 1 } as unknown as number },
  });

  if (result.count === 1) {
    const fresh = await refetch(id);
    if (!fresh) return notFound();
    // We trust the caller's refetch returns something with a numeric `version`.
    const version =
      typeof (fresh as unknown as { version?: number }).version === "number"
        ? (fresh as unknown as { version: number }).version
        : expectedVersion + 1;
    return ok(fresh, version);
  }

  const current = await refetch(id);
  if (!current) return notFound();
  const serverVersion =
    typeof (current as unknown as { version?: number }).version === "number"
      ? (current as unknown as { version: number }).version
      : null;
  return conflict(current, serverVersion);
}
