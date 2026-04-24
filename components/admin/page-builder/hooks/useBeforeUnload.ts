"use client"

import { useEffect } from "react"
import { useBuilderStore } from "../store"

/**
 * Show a native browser confirmation dialog when the user navigates away
 * with pending save status.
 */
export function useBeforeUnload() {
  const saveStatus = useBuilderStore((s) => s.saveStatus)

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus.status === "saving") {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [saveStatus.status])
}
