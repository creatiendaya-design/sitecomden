"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Local-mirror + debounced upstream commit for high-frequency text/color/
 * number inputs in the page-builder forms. Solves the input-lag problem
 * where every keystroke writes to the global Zustand `blocks` store and
 * fans out re-renders across the entire builder UI.
 *
 * Behavior:
 *  - `local` mirrors `value` and is what the input should bind to.
 *  - Calling `set(next)` updates `local` immediately (input feels instant)
 *    and schedules a debounced commit to upstream `onChange`.
 *  - `flush()` commits any pending value right now (call on blur).
 *  - On unmount, any pending value is flushed using the onChange that was
 *    in effect at the time — this is what lets `key={block.id}` on the
 *    form root safely flush per-block edits when the admin switches
 *    blocks. The captured onChange points at the OLD block's id, so we
 *    write to the correct block, not the newly selected one.
 *  - External `value` changes (e.g. another component mutated the same
 *    field) reset `local` and cancel the pending timer.
 */
export function useDebouncedCommit<T>(
  value: T,
  onChange: (v: T) => void,
  delayMs: number,
): {
  local: T
  set: (v: T) => void
  flush: () => void
} {
  const [local, setLocal] = useState<T>(value)
  // Tracks the last value we either received from props or committed
  // upstream. Used to distinguish "external change" from "our own commit
  // bouncing back through props".
  const lastCommittedRef = useRef<T>(value)
  // Mirrors `local` synchronously so flush() / unmount cleanup can read
  // the latest value without depending on a stale closure.
  const localRef = useRef<T>(local)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // onChange is captured per render so flush always uses the freshest
  // closure (which captures the block.id current at that render).
  const onChangeRef = useRef(onChange)
  // eslint-disable-next-line react-hooks/refs -- intentional "latest-ref" pattern; only read inside effects/handlers, never during render
  onChangeRef.current = onChange

  useEffect(() => {
    if (value !== lastCommittedRef.current) {
      // External change — discard pending local edit and resync.
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      lastCommittedRef.current = value
      localRef.current = value
      setLocal(value)
    }
  }, [value])

  const set = useCallback(
    (next: T) => {
      localRef.current = next
      setLocal(next)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        lastCommittedRef.current = next
        onChangeRef.current(next)
      }, delayMs)
    },
    [delayMs],
  )

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (localRef.current !== lastCommittedRef.current) {
      lastCommittedRef.current = localRef.current
      onChangeRef.current(localRef.current)
    }
  }, [])

  // Unmount-flush. Critical for the `key={block.id}` pattern: when the
  // admin switches blocks, the form remounts and the OLD field's cleanup
  // fires here — committing any half-typed value to the OLD block via
  // the captured onChange closure.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        if (localRef.current !== lastCommittedRef.current) {
          onChangeRef.current(localRef.current)
        }
      }
    }
    // Cleanup-on-unmount only; dependencies intentionally empty.
  }, [])

  return { local, set, flush }
}
