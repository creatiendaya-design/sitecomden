"use client";

/**
 * Plan 18 — Batch conflict resolution dialog.
 *
 * Shown when a batch save (page blocks, theme sections, menu items,
 * landing blocks) returns `{ ok: false, reason: "conflict", conflicts }`.
 * Lists every row that diverged so the user understands the scope before
 * choosing.
 *
 * Recovery options (all-or-nothing per batch):
 *   - **Recargar** — discard local changes for the whole batch and refetch
 *     from server. Safer; default focus.
 *   - **Forzar guardado** — retry with the server's fresh versions on the
 *     conflicting rows, overwriting whatever the other admin saved on those.
 *     Non-conflicting rows go through as before.
 *   - **Cerrar** — keep editing locally. Nothing is saved.
 *
 * The dialog is shape-agnostic; the editor passes a `formatLabel` to render
 * each row in human terms ("HERO block #2", "Sección Header Main", etc.).
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import type { BatchConflictEntry } from "@/lib/concurrency/batch";

export interface BatchConflictDialogProps<TCurrent> {
  /** Controlled open state. */
  open: boolean;
  /** Called when dismissed via Escape / backdrop / explicit close. */
  onOpenChange: (next: boolean) => void;
  /**
   * List of rows whose `version` diverged. Each entry includes the current
   * server row (or null if it was deleted) and the server's `version`.
   */
  conflicts: BatchConflictEntry<TCurrent>[];
  /**
   * Discard local changes for the entire batch; the editor should refetch
   * + reset its store from the latest server state.
   */
  onReload: () => void;
  /**
   * Retry the save with the fresh server versions on conflicting rows.
   * Pass `undefined` to hide the force button for high-risk surfaces
   * (e.g. permission edits).
   */
  onForce?: () => void;
  /**
   * Resource label used in the body copy ("este menú", "esta página").
   * Defaults to "este recurso".
   */
  resourceLabel?: string;
  /**
   * Optional formatter that turns a conflict entry into a human label.
   * Defaults to showing the `rowId` (not pretty — editors should pass one).
   */
  formatLabel?: (entry: BatchConflictEntry<TCurrent>, index: number) => string;
  /** When true, disable the force button (e.g. while a retry is in flight). */
  allowForce?: boolean;
}

export function BatchConflictDialog<TCurrent>({
  open,
  onOpenChange,
  conflicts,
  onReload,
  onForce,
  resourceLabel = "este recurso",
  formatLabel,
  allowForce = true,
}: BatchConflictDialogProps<TCurrent>) {
  const count = conflicts.length;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {count === 1
              ? "Otro administrador editó 1 elemento"
              : `Otro administrador editó ${count} elementos`}{" "}
            de {resourceLabel}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Mientras editabas, alguien más guardó cambios en{" "}
            {count === 1 ? "el siguiente elemento" : "los siguientes elementos"}.
            Recargá para ver el estado actual del servidor, o forzá el guardado
            para sobrescribir esos cambios con los tuyos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-64 rounded-md border bg-muted/30 p-2">
          <ul className="text-xs space-y-1">
            {conflicts.map((c, i) => (
              <li
                key={c.rowId}
                className="font-mono text-foreground/80 truncate"
                title={c.rowId}
              >
                {formatLabel ? formatLabel(c, i) : c.rowId}
              </li>
            ))}
          </ul>
        </ScrollArea>

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
