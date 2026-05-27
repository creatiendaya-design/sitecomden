"use client";

/**
 * Plan 18 — Conflict resolution dialog.
 *
 * Shown when a versioned save returns `{ ok: false, reason: "conflict" }`.
 * Two recovery paths:
 *
 *   - **Recargar (recommended)** — discard the user's local changes and
 *     pull the server state. The safer option; the dialog defaults to it.
 *
 *   - **Forzar guardado** — push the local changes again with the fresh
 *     server `version`, overwriting whatever the other admin saved. Hidden
 *     for high-risk resources (passed via the `allowForce` prop).
 *
 * The dialog is **resource-agnostic**: it doesn't know what changed. Any
 * editor that wraps a server action with `useVersionAwareSave` gets this
 * dialog for free.
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface ConflictDialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Called when the user dismisses without choosing (Escape, backdrop). */
  onOpenChange: (next: boolean) => void;
  /**
   * Discard local changes and refetch. Most editors will then call
   * `router.refresh()` or reset their store from the latest server state.
   */
  onReload: () => void;
  /**
   * Push local changes again with the fresh server version, overwriting
   * the other admin's save. Only call this when the user has reviewed the
   * conflict and consciously chosen to win. Pass `undefined` to hide the
   * button entirely (e.g. for orders / inventory / payments).
   */
  onForce?: () => void;
  /**
   * Resource label used in the body copy. Examples: "este tema", "esta
   * página", "este menú". Defaults to "este recurso".
   */
  resourceLabel?: string;
  /**
   * Whether the *Forzar guardado* button is enabled. Defaults to `true`
   * when `onForce` is provided. Pass `false` to render the button disabled
   * (e.g. while a force-save request is in flight).
   */
  allowForce?: boolean;
}

export function ConflictDialog({
  open,
  onOpenChange,
  onReload,
  onForce,
  resourceLabel = "este recurso",
  allowForce = true,
}: ConflictDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Otro administrador actualizó {resourceLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Mientras editabas, alguien más guardó cambios en {resourceLabel}.
            Para evitar perder su trabajo, recarga para ver la versión más
            reciente. Si estás seguro de que tus cambios deben prevalecer,
            puedes forzar el guardado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {onForce ? (
            <Button
              variant="ghost"
              onClick={onForce}
              disabled={!allowForce}
              type="button"
            >
              Forzar guardado
            </Button>
          ) : null}
          <AlertDialogCancel asChild>
            <Button variant="outline" type="button">
              Cerrar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={onReload} type="button">
              Recargar
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
