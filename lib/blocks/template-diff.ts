import type { BlockInstance } from "./types"

export interface TemplateDiff {
  added: BlockInstance[]
  modified: { before: BlockInstance; after: BlockInstance }[]
  removed: BlockInstance[]
}

/**
 * Compute the diff between two BlockInstance arrays — used to:
 *  1. Drive the "N cambios pendientes" counter in the template editor topbar.
 *  2. Render the save-and-propagate dialog's per-block summary.
 *
 * Comparison key is `block.id`. A block in `current` but not in `original` is
 * "added". A block in `original` but not in `current` is "removed". A block
 * in both whose content/position/type differs is "modified".
 */
export function computeTemplateDiff(
  original: BlockInstance[],
  current: BlockInstance[],
): TemplateDiff {
  const originalById = new Map(original.map((b) => [b.id, b]))
  const currentById = new Map(current.map((b) => [b.id, b]))

  const added: BlockInstance[] = []
  const removed: BlockInstance[] = []
  const modified: { before: BlockInstance; after: BlockInstance }[] = []

  for (const [id, after] of currentById) {
    const before = originalById.get(id)
    if (!before) {
      added.push(after)
      continue
    }
    if (
      before.type !== after.type ||
      before.position !== after.position ||
      JSON.stringify(before.content) !== JSON.stringify(after.content)
    ) {
      modified.push({ before, after })
    }
  }

  for (const [id, before] of originalById) {
    if (!currentById.has(id)) {
      removed.push(before)
    }
  }

  return { added, modified, removed }
}

/**
 * Sum of changes — convenience for the topbar counter. Equivalent to
 * `added.length + modified.length + removed.length`.
 */
export function diffCount(diff: TemplateDiff): number {
  return diff.added.length + diff.modified.length + diff.removed.length
}
