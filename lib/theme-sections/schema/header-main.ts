import { LayoutGrid } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerMainDefinition: ThemeSectionDefinition = {
  type: "HEADER_MAIN",
  groups: ["HEADER"],
  label: "Encabezado principal",
  description: "Logo, menú, buscador, sesión y carrito en una sola fila.",
  icon: LayoutGrid,
  maxPerGroup: 1,
  fields: [
    {
      type: "menu-picker",
      key: "menuId",
      label: "Menú a mostrar (escritorio)",
      helpText: "Si está vacío, usa el menú con slug 'main'.",
    },
    {
      type: "menu-picker",
      key: "mobileMenuId",
      label: "Menú a mostrar (móvil)",
      helpText:
        "Menú específico para el drawer en móvil. Si lo dejas vacío, usa el mismo menú que escritorio.",
    },
    { type: "switch", key: "showSearch", label: "Mostrar buscador" },
    { type: "switch", key: "showAuth", label: "Mostrar acceso de cliente" },
    { type: "switch", key: "showCart", label: "Mostrar carrito" },
  ],
  defaultContent: {
    showSearch: true,
    showAuth: true,
    showCart: true,
  },
  // Header is a full-width sticky bar — alignment / corner radius /
  // border / shadow don't produce a useful visual effect, so we hide
  // those controls from the Estilo tab to keep it focused on what the
  // admin can actually meaningfully change (colors + padding).
  styleSupport: {
    alignment: false,
    cornerRadius: false,
    border: false,
    shadow: false,
    // Expose "Fondo del drawer" / "Texto del drawer" in the Personalizado
    // section so admins can recolor the mobile menu drawer independently
    // from the header bar itself. When left empty, the drawer falls back
    // to the active scheme's `--theme-drawer-bg` / `--theme-drawer-text`.
    drawerColors: true,
  },
  // The mobile drawer (MobileMenu / Radix Sheet) is rendered in a portal
  // outside this section's wrapper, so it can't be reached by the normal
  // descendant CSS the live-preview hook injects. Declaring this bridge
  // lets the hook patch `--drawer-bg` / `--drawer-text` on the drawer's
  // SheetContent in the same tick as the admin edit — no autosave
  // roundtrip needed. The drawer is mobile-only so we read the mobile
  // side of the DeviceValue (with shared fallback).
  portalOverrides: [
    {
      selector: "[data-mobile-drawer]",
      device: "mobile",
      vars: {
        drawerBgColor: "--drawer-bg",
        drawerTextColor: "--drawer-text",
      },
    },
  ],
}
