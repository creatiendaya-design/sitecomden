"use client";

/**
 * Plan 18 — `useVersionAwareBatchSave` hook.
 *
 * Counterpart to `useVersionAwareSave` for actions that take an entire list
 * of rows (page blocks, theme sections, menu items). Unlike the single-
 * resource hook, the "version" lives PER ROW inside the payload itself,
 * not in a separate counter — so the hook doesn't track versions globally.
 * Its job is:
 *
 *   1. Serialize writes (queue collapsing) so concurrent autosaves can't
 *      stomp each other.
 *   2. Surface batch conflicts as state for the dialog.
 *   3. Provide an `acceptServerCopy` + `forceOverwrite` recovery path.
 *      For force-overwrite, the caller's `buildForcePayload` callback
 *      receives the server's conflict entries and produces a fresh payload
 *      with updated versions baked in.
 */
import { useCallback, useRef, useState } from "react";
import type { BatchConflictEntry, BatchSaveResult } from "@/lib/concurrency/batch";

export interface UseVersionAwareBatchSaveArgs<TPayload, TData, TCurrent> {
  /** Server Action to call. Must return a BatchSaveResult. */
  action: (payload: TPayload) => Promise<BatchSaveResult<TData, TCurrent>>;
  /**
   * Build a fresh payload that resolves the given conflicts in favor of
   * the local edits. The hook calls this when the user clicks *Forzar*.
   * The function receives the last attempted payload + the server's
   * conflict report; it returns a new payload with each conflicting row's
   * `version` bumped to the server value so the conditional update matches.
   */
  buildForcePayload: (
    lastPayload: TPayload,
    conflicts: BatchConflictEntry<TCurrent>[],
  ) => TPayload;
  /** Called on success with the persisted data. */
  onSuccess?: (data: TData) => void;
  /**
   * Called when the user picks *Recargar*. Typically `router.refresh()`
   * plus a store reset.
   */
  onReload: () => void;
  /** Called on non-conflict failure. Typically `toast.error`. */
  onError?: (message: string) => void;
}

export interface BatchSaveState<TCurrent> {
  saving: boolean;
  hasConflict: boolean;
  conflicts: BatchConflictEntry<TCurrent>[];
  lastError: string | null;
}

export interface BatchSaveHandle<TPayload, TData, TCurrent> {
  state: BatchSaveState<TCurrent>;
  save: (payload: TPayload) => Promise<BatchSaveResult<TData, TCurrent>>;
  acceptServerCopy: () => void;
  forceOverwrite: () => Promise<BatchSaveResult<TData, TCurrent> | null>;
  dismissConflict: () => void;
}

export function useVersionAwareBatchSave<TPayload, TData, TCurrent>(
  args: UseVersionAwareBatchSaveArgs<TPayload, TData, TCurrent>,
): BatchSaveHandle<TPayload, TData, TCurrent> {
  const { action, buildForcePayload, onSuccess, onReload, onError } = args;

  const inFlightRef = useRef(false);
  const queuedPayloadRef = useRef<TPayload | null>(null);
  const lastPayloadRef = useRef<TPayload | null>(null);

  const [state, setState] = useState<BatchSaveState<TCurrent>>({
    saving: false,
    hasConflict: false,
    conflicts: [],
    lastError: null,
  });

  const runSave = useCallback(
    async (payload: TPayload): Promise<BatchSaveResult<TData, TCurrent>> => {
      lastPayloadRef.current = payload;
      setState((prev) => ({ ...prev, saving: true }));
      const result = await action(payload);

      if (result.ok) {
        setState((prev) => ({
          ...prev,
          hasConflict: false,
          conflicts: [],
          lastError: null,
        }));
        onSuccess?.(result.data);
      } else if (result.reason === "conflict") {
        setState((prev) => ({
          ...prev,
          hasConflict: true,
          conflicts: result.conflicts,
          lastError: null,
        }));
      } else {
        const message =
          "message" in result
            ? result.message
            : result.reason === "unauthorized"
              ? "Sesión expirada o sin permiso para esta acción."
              : result.reason === "not_found"
                ? "El recurso ya no existe."
                : "Error al guardar.";
        setState((prev) => ({ ...prev, lastError: message }));
        onError?.(message);
      }
      return result;
    },
    [action, onError, onSuccess],
  );

  const save = useCallback(
    async (payload: TPayload): Promise<BatchSaveResult<TData, TCurrent>> => {
      if (inFlightRef.current) {
        queuedPayloadRef.current = payload;
        return { ok: false, reason: "error", message: "queued" };
      }
      inFlightRef.current = true;
      try {
        let lastResult = await runSave(payload);
        while (queuedPayloadRef.current && lastResult.ok) {
          const queued = queuedPayloadRef.current;
          queuedPayloadRef.current = null;
          lastResult = await runSave(queued);
        }
        return lastResult;
      } finally {
        inFlightRef.current = false;
        setState((prev) =>
          prev.saving === false ? prev : { ...prev, saving: false },
        );
      }
    },
    [runSave],
  );

  const acceptServerCopy = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasConflict: false,
      conflicts: [],
    }));
    onReload();
  }, [onReload]);

  const forceOverwrite = useCallback(async (): Promise<
    BatchSaveResult<TData, TCurrent> | null
  > => {
    const payload = lastPayloadRef.current;
    const conflicts = state.conflicts;
    if (payload === null || conflicts.length === 0) return null;
    const forcedPayload = buildForcePayload(payload, conflicts);
    setState((prev) => ({
      ...prev,
      hasConflict: false,
      conflicts: [],
    }));
    return save(forcedPayload);
  }, [buildForcePayload, save, state.conflicts]);

  const dismissConflict = useCallback(() => {
    setState((prev) => ({ ...prev, hasConflict: false }));
  }, []);

  return {
    state,
    save,
    acceptServerCopy,
    forceOverwrite,
    dismissConflict,
  };
}
