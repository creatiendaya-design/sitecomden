"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { ColorSchemeArray } from "@/lib/themes/color-schemes"

/**
 * Plan 13.1 — bridge that makes the active theme's color schemes
 * available to the page-builder StyleTab without hard-coupling the
 * builder to theme/customizer concerns. The customizer wraps its
 * RightSidebar in this provider; non-customizer page builders (e.g.
 * /admin/paginas/[id]) get an empty array so the picker hides itself.
 */
const ColorSchemesContext = createContext<ColorSchemeArray>([])

export function ColorSchemesProvider({
  schemes,
  children,
}: {
  schemes: ColorSchemeArray
  children: ReactNode
}) {
  return (
    <ColorSchemesContext.Provider value={schemes}>
      {children}
    </ColorSchemesContext.Provider>
  )
}

export function useColorSchemes(): ColorSchemeArray {
  return useContext(ColorSchemesContext)
}
