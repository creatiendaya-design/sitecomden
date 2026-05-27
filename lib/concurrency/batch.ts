/**
 * Plan 18 — Batch optimistic locking.
 *
 * Single-resource saves use `SaveResult<T>` + `updateWithVersion`. Batch
 * saves (page blocks, theme sections, menu trees) need a different result
 * shape because the conflict surface is per-row: two admins editing the
 * same page might collide on block #3 but not block #4. The dialog has to
 * say *which* rows would be lost.
 *
 * **Atomicity policy**: all-or-nothing. If ANY row in the batch has a
 * version mismatch against the DB, the WHOLE batch is rejected. The UI
 * shows every conflicting row so the user makes one informed choice:
 *
 *   - **Recargar** — discard local changes for the entire batch, pick up
 *     the server's state.
 *   - **Forzar guardado** — re-fetch the server versions and retry the
 *     batch with those (overwriting the other admin's writes on the
 *     conflicting rows specifically). The non-conflicting rows go through
 *     as before.
 *   - **Cerrar** — keep editing locally; nothing is saved.
 *
 * Why all-or-nothing instead of partial commit: from the editor's POV the
 * page is a single unit ("I just saved my page"). A partial commit leaves
 * the page in a hybrid state — Admin A's block 1 + Admin B's block 2 — and
 * the user has no clean mental model for "what just happened?".
 */
import { prisma } from "@/lib/db";

/**
 * Shape every row in a batch payload must satisfy. `id` is either an
 * existing row id or a "tmp-…" sentinel for rows created in this session.
 * `version` is required for existing rows and absent for new ones.
 */
export interface BatchRow {
  id: string;
  /** Omit (or set undefined) for new rows; required for existing rows. */
  version?: number;
}

/**
 * Per-row report returned by `precheckBatchConflicts`. `rowId` is the
 * client's id (which may be a "tmp-…" placeholder). `serverVersion` is
 * what the DB actually had at the time of the check.
 */
export interface BatchConflictEntry<TCurrent> {
  rowId: string;
  current: TCurrent | null;
  serverVersion: number | null;
}

/** Discriminated union returned by versioned batch save actions. */
export type BatchSaveResult<TData, TCurrent = TData> =
  | { ok: true; data: TData }
  | {
      ok: false;
      reason: "conflict";
      conflicts: BatchConflictEntry<TCurrent>[];
    }
  | { ok: false; reason: "validation"; message: string }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "error"; message: string };

/** Convenience constructors. */
export function batchOk<TData, TCurrent = TData>(
  data: TData,
): BatchSaveResult<TData, TCurrent> {
  return { ok: true, data };
}

export function batchConflict<TCurrent>(
  conflicts: BatchConflictEntry<TCurrent>[],
): BatchSaveResult<never, TCurrent> {
  return { ok: false, reason: "conflict", conflicts };
}

export function batchValidation(message: string): BatchSaveResult<never> {
  return { ok: false, reason: "validation", message };
}

export function batchUnauthorized(): BatchSaveResult<never> {
  return { ok: false, reason: "unauthorized" };
}

export function batchNotFound(): BatchSaveResult<never> {
  return { ok: false, reason: "not_found" };
}

export function batchErrored(message: string): BatchSaveResult<never> {
  return { ok: false, reason: "error", message };
}

/**
 * Read-only conflict pre-check. Compares each row's expected `version`
 * against the live DB row. Returns the subset of rows whose versions
 * disagree. Use this BEFORE attempting writes — if anything conflicts the
 * caller short-circuits and reports back, no DB mutation happens.
 *
 * Caveat: there is still a TOCTOU window between this pre-check and the
 * subsequent write transaction. Callers must wrap their writes in a
 * `$transaction` and re-check version via `updateMany where: { id, version }`
 * inside it. If the inner check fails, throw `BatchRaceError` (see below)
 * to trigger a rollback and re-collect conflicts.
 */
export async function precheckBatchConflicts<
  TModel extends {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true; version: true };
    }): Promise<Array<{ id: string; version: number }>>;
    findUnique(args: { where: { id: string } }): Promise<unknown>;
  },
  TCurrent,
>(args: {
  model: TModel;
  rows: BatchRow[];
  /**
   * Refetches the full row shape (with relations) for the conflict report.
   * Called only for rows that actually conflict — never for the clean path.
   */
  refetchForConflict: (id: string) => Promise<TCurrent | null>;
}): Promise<BatchConflictEntry<TCurrent>[]> {
  const versionedRows = args.rows.filter(
    (r): r is BatchRow & { version: number } =>
      typeof r.version === "number" && !r.id.startsWith("tmp-"),
  );
  if (versionedRows.length === 0) return [];

  const ids = versionedRows.map((r) => r.id);
  const existing = await args.model.findMany({
    where: { id: { in: ids } },
    select: { id: true, version: true },
  });
  const existingMap = new Map(existing.map((e) => [e.id, e.version]));

  const conflicts: BatchConflictEntry<TCurrent>[] = [];
  for (const row of versionedRows) {
    const serverVersion = existingMap.get(row.id);
    if (serverVersion === undefined) {
      // Row not found — was deleted by another admin. Treat as conflict so
      // the user knows their local copy references a stale row.
      conflicts.push({ rowId: row.id, current: null, serverVersion: null });
      continue;
    }
    if (serverVersion !== row.version) {
      const current = await args.refetchForConflict(row.id);
      conflicts.push({ rowId: row.id, current, serverVersion });
    }
  }
  return conflicts;
}

/**
 * Thrown from inside a batch save's transaction when an `updateMany` with
 * version predicate matched zero rows — meaning a concurrent admin slipped
 * a write in between our pre-check and our write. Wrap the catching code
 * around the `$transaction` call; the transaction itself rolls back
 * automatically when the error propagates.
 */
export class BatchRaceError extends Error {
  constructor(public rowId: string) {
    super(`Race detected on row ${rowId} during batch save.`);
    this.name = "BatchRaceError";
  }
}

/** Type guard for `BatchRaceError` across the module/process boundary. */
export function isBatchRaceError(err: unknown): err is BatchRaceError {
  return (
    err instanceof BatchRaceError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { name?: string }).name === "BatchRaceError")
  );
}

/**
 * Convenience: assert the DB used `prisma`. Just a type-anchor so the
 * concrete prisma client tracks model methods.
 */
export const prismaForBatch = prisma;
