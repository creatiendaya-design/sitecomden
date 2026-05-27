"use client";

/**
 * Plan 18 — `useVersionAwareSave` hook.
 *
 * Wraps any Server Action that returns `SaveResult<T>` (see
 * `@/lib/concurrency/types`). The hook:
 *
 *   1. Tracks the current `version` (initialized from server state).
 *   2. Calls the action with that version on every save.
 *   3. On `{ ok: true }` → updates the tracked version so the next save
 *      uses the fresh one.
 *   4. On `{ ok: false, reason: "conflict" }` → exposes the conflict state
 *      so the caller can show `<ConflictDialog>`.
 *   5. Provides `acceptServerCopy()` (reload) and `forceOverwrite()`
 *      (retry with server version) recovery callbacks.
 *
 * Why a hook and not just calling the action directly: keeping the
 * version state, the in-flight guard (serialize writes per-resource), and
 * the conflict recovery path in one place means every editor gets the same
 * behavior without copy-pasting.
 */
import { useCallback, useRef, useState } from "react";
import type { SaveResult } from "@/lib/concurrency/types";

export interface UseVersionAwareSaveArgs<TPayload, TData> {
  /**
   * Server Action to call. Must accept `(expectedVersion, payload)` and
   * return `SaveResult<TData>`.
   */
  action: (expectedVersion: number, payload: TPayload) => Promise<SaveResult<TData>>;
  /** Initial version (from the server-fetched resource). */
  initialVersion: number;
  /**
   * Called when the action succeeds. The handler receives the fresh data
   * so the editor can update its store. The hook itself does NOT touch
   * any external store — that's the caller's responsibility.
   */
  onSuccess?: (data: TData) => void;
  /**
   * Called when the user picks *Recargar* in the conflict dialog. Typically
   * `router.refresh()` plus a store reset.
   */
  onReload: () => void;
  /**
   * Called when the action returns `{ reason: "validation" }` (or any
   * non-conflict failure). Usually surfaces a toast. Conflict is handled
   * separately by the dialog state.
   */
  onError?: (message: string) => void;
}

export interface VersionAwareSaveState<TData> {
  /** True while a save is in flight (or while a queued save waits). */
  saving: boolean;
  /** True when the last save returned a conflict. Bind to ConflictDialog.open. */
  hasConflict: boolean;
  /** Server state from the conflict response, if any. */
  conflictCurrent: TData | null;
  /** Server `version` from the conflict response, if any. */
  serverVersion: number | null;
  /** Last error message from a non-conflict failure. */
  lastError: string | null;
}

export interface VersionAwareSaveHandle<TPayload, TData> {
  state: VersionAwareSaveState<TData>;
  /** Trigger a save. Returns the SaveResult for callers that want it. */
  save: (payload: TPayload) => Promise<SaveResult<TData>>;
  /**
   * Resolve the conflict by accepting the server copy. Closes the dialog,
   * calls the caller's `onReload`. The caller should refresh data afterward.
   */
  acceptServerCopy: () => void;
  /**
   * Resolve the conflict by overwriting the server with our last attempted
   * payload, using the fresh server `version`. Closes the dialog on success.
   */
  forceOverwrite: () => Promise<SaveResult<TData> | null>;
  /** Manually close the conflict dialog without choosing (e.g. Escape). */
  dismissConflict: () => void;
  /** Reset the tracked version (e.g. after an external refresh). */
  setVersion: (next: number) => void;
}

export function useVersionAwareSave<TPayload, TData>(
  args: UseVersionAwareSaveArgs<TPayload, TData>,
): VersionAwareSaveHandle<TPayload, TData> {
  const { action, initialVersion, onSuccess, onReload, onError } = args;

  // Refs (not state) for version + last payload — we don't want a render
  // for every internal bookkeeping change. State is reserved for things
  // the UI binds to (saving, conflict).
  const versionRef = useRef(initialVersion);
  const lastPayloadRef = useRef<TPayload | null>(null);
  const inFlightRef = useRef(false);
  const queuedPayloadRef = useRef<TPayload | null>(null);

  const [state, setState] = useState<VersionAwareSaveState<TData>>({
    saving: false,
    hasConflict: false,
    conflictCurrent: null,
    serverVersion: null,
    lastError: null,
  });

  const setSaving = (saving: boolean) => {
    setState((prev) => (prev.saving === saving ? prev : { ...prev, saving }));
  };

  const runSave = useCallback(
    async (payload: TPayload): Promise<SaveResult<TData>> => {
      lastPayloadRef.current = payload;
      setSaving(true);

      const result = await action(versionRef.current, payload);

      if (result.ok) {
        versionRef.current = result.version;
        setState((prev) => ({
          ...prev,
          hasConflict: false,
          conflictCurrent: null,
          serverVersion: null,
          lastError: null,
        }));
        onSuccess?.(result.data);
      } else if (result.reason === "conflict") {
        setState((prev) => ({
          ...prev,
          hasConflict: true,
          conflictCurrent: result.current,
          serverVersion: result.serverVersion,
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
    async (payload: TPayload): Promise<SaveResult<TData>> => {
      // Serialize writes per-resource: if a save is already running, store
      // the latest payload and collapse intermediate ones. When the in-flight
      // save returns, fire the queued payload.
      if (inFlightRef.current) {
        queuedPayloadRef.current = payload;
        return { ok: false, reason: "error", message: "queued" };
      }

      inFlightRef.current = true;
      try {
        const result = await runSave(payload);

        // Drain the queue: keep firing as long as something is queued and
        // the previous result wasn't a conflict (don't queue past a conflict).
        let lastResult = result;
        while (queuedPayloadRef.current && lastResult.ok) {
          const queued = queuedPayloadRef.current;
          queuedPayloadRef.current = null;
          lastResult = await runSave(queued);
        }

        return lastResult;
      } finally {
        inFlightRef.current = false;
        setSaving(false);
      }
    },
    [runSave],
  );

  const acceptServerCopy = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasConflict: false,
      conflictCurrent: null,
      serverVersion: null,
    }));
    onReload();
  }, [onReload]);

  const forceOverwrite = useCallback(async (): Promise<SaveResult<TData> | null> => {
    const payload = lastPayloadRef.current;
    const serverVersion = state.serverVersion;
    if (payload === null || serverVersion === null) return null;
    versionRef.current = serverVersion;
    setState((prev) => ({
      ...prev,
      hasConflict: false,
      conflictCurrent: null,
      serverVersion: null,
    }));
    return save(payload);
  }, [save, state.serverVersion]);

  const dismissConflict = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasConflict: false,
    }));
  }, []);

  const setVersion = useCallback((next: number) => {
    versionRef.current = next;
  }, []);

  return {
    state,
    save,
    acceptServerCopy,
    forceOverwrite,
    dismissConflict,
    setVersion,
  };
}
