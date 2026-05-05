import { describe, it, expect } from "vitest"
import { computeTemplateDiff, diffCount, type TemplateDiff } from "./template-diff"
import type { BlockInstance } from "./types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// TODO: extract this into tests/factories/block-instance.ts once more tests share it
function makeBlock(id: string, overrides: Partial<BlockInstance> = {}): BlockInstance {
  // TODO: return a valid BlockInstance with sensible defaults:
  // { id, type: "HERO", position: 0, content: { data: {}, style: {}, media: {} }, ...overrides }
  return {} as BlockInstance
}

// ---------------------------------------------------------------------------
// computeTemplateDiff — empty inputs
// ---------------------------------------------------------------------------

describe("computeTemplateDiff — empty inputs", () => {
  it("returns an empty diff when both arrays are empty", () => {
    // TODO: const diff = computeTemplateDiff([], [])
    // TODO: expect(diff.added).toHaveLength(0)
    // TODO: expect(diff.modified).toHaveLength(0)
    // TODO: expect(diff.removed).toHaveLength(0)
  })

  it("reports all original blocks as removed when current is empty", () => {
    // TODO: const original = [makeBlock("a"), makeBlock("b")]
    // TODO: const diff = computeTemplateDiff(original, [])
    // TODO: expect(diff.removed).toHaveLength(2)
    // TODO: expect(diff.added).toHaveLength(0)
  })

  it("reports all current blocks as added when original is empty", () => {
    // TODO: const current = [makeBlock("a"), makeBlock("b")]
    // TODO: const diff = computeTemplateDiff([], current)
    // TODO: expect(diff.added).toHaveLength(2)
    // TODO: expect(diff.removed).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// computeTemplateDiff — unchanged blocks
// ---------------------------------------------------------------------------

describe("computeTemplateDiff — unchanged blocks", () => {
  it("produces an empty diff when original and current are identical", () => {
    // TODO: const blocks = [makeBlock("a"), makeBlock("b")]
    // TODO: const diff = computeTemplateDiff(blocks, blocks)
    // TODO: expect(diffCount(diff)).toBe(0)
  })

  it("treats structurally equal content as unchanged (uses JSON.stringify)", () => {
    // Two separate object references with the same shape should NOT appear in modified
    // TODO: const a = makeBlock("a", { content: { data: { title: "Hello" }, style: {}, media: {} } })
    // TODO: const aCopy = makeBlock("a", { content: { data: { title: "Hello" }, style: {}, media: {} } })
    // TODO: expect(computeTemplateDiff([a], [aCopy]).modified).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// computeTemplateDiff — added blocks
// ---------------------------------------------------------------------------

describe("computeTemplateDiff — added blocks", () => {
  it("detects a single new block by id", () => {
    // TODO: const diff = computeTemplateDiff([makeBlock("a")], [makeBlock("a"), makeBlock("b")])
    // TODO: expect(diff.added).toHaveLength(1)
    // TODO: expect(diff.added[0].id).toBe("b")
  })

  it("puts new blocks in diff.added, not diff.modified", () => {
    // TODO: verify new blocks don't bleed into other buckets
  })
})

// ---------------------------------------------------------------------------
// computeTemplateDiff — removed blocks
// ---------------------------------------------------------------------------

describe("computeTemplateDiff — removed blocks", () => {
  it("detects a single removed block by id", () => {
    // TODO: const diff = computeTemplateDiff([makeBlock("a"), makeBlock("b")], [makeBlock("a")])
    // TODO: expect(diff.removed).toHaveLength(1)
    // TODO: expect(diff.removed[0].id).toBe("b")
  })
})

// ---------------------------------------------------------------------------
// computeTemplateDiff — modified blocks
// ---------------------------------------------------------------------------

describe("computeTemplateDiff — modified blocks", () => {
  it("detects a content change as modified", () => {
    // TODO: const before = makeBlock("a", { content: { data: { title: "Old" }, style: {}, media: {} } })
    // TODO: const after  = makeBlock("a", { content: { data: { title: "New" }, style: {}, media: {} } })
    // TODO: const diff = computeTemplateDiff([before], [after])
    // TODO: expect(diff.modified).toHaveLength(1)
    // TODO: expect(diff.modified[0].before.id).toBe("a")
    // TODO: expect(diff.modified[0].after.id).toBe("a")
  })

  it("detects a position change as modified", () => {
    // TODO: const before = makeBlock("a", { position: 0 })
    // TODO: const after  = makeBlock("a", { position: 1 })
    // TODO: expect(computeTemplateDiff([before], [after]).modified).toHaveLength(1)
  })

  it("detects a type change as modified", () => {
    // TODO: const before = makeBlock("a", { type: "HERO" })
    // TODO: const after  = makeBlock("a", { type: "TICKER" })
    // TODO: expect(computeTemplateDiff([before], [after]).modified).toHaveLength(1)
  })

  it("does NOT flag a block as modified when only its array index changes but id/content/position stay the same", () => {
    // Reorder the array without changing content — should produce 0 modified
    // (Diff is keyed by id, so array order doesn't matter)
    // TODO: const blocks = [makeBlock("a", { position: 0 }), makeBlock("b", { position: 1 })]
    // TODO: const reversed = [blocks[1], blocks[0]]   // same content, just different JS array order
    // TODO: expect(computeTemplateDiff(blocks, reversed).modified).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// computeTemplateDiff — combined changes
// ---------------------------------------------------------------------------

describe("computeTemplateDiff — combined changes", () => {
  it("correctly classifies simultaneous add + remove + modify", () => {
    // Original: [a, b, c]
    // Current:  [a (modified), c, d (new)]  — b removed
    // TODO: set up the three arrays and verify each bucket
  })
})

// ---------------------------------------------------------------------------
// diffCount
// ---------------------------------------------------------------------------

describe("diffCount", () => {
  it("returns 0 for an empty diff", () => {
    // TODO: expect(diffCount({ added: [], modified: [], removed: [] })).toBe(0)
  })

  it("sums added + modified + removed lengths", () => {
    // TODO: const diff: TemplateDiff = { added: [{}] as any, modified: [{} as any], removed: [{}, {}] as any }
    // TODO: expect(diffCount(diff)).toBe(4)
  })

  it("matches manual sum of each bucket length", () => {
    // Property-test style: generate a diff and verify diffCount == sum of lengths
    // TODO: build a real diff from computeTemplateDiff and compare diffCount to manual sum
  })
})
