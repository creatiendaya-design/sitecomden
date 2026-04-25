"use client"

import {
  Home,
  ShoppingCart,
  Package,
  FileText,
  LayoutGrid,
  Layers,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { ThemeRow } from "@/actions/themes"

interface SectionDef {
  key: string
  label: string
  description: string
  icon: typeof Home
  status: "active" | "coming-soon"
  comingPlan?: string
}

const SECTIONS: SectionDef[] = [
  {
    key: "product",
    label: "Producto",
    description: "Plantilla por defecto para landing de productos",
    icon: Package,
    status: "active",
  },
  {
    key: "home",
    label: "Home",
    description: "Página de inicio de la tienda",
    icon: Home,
    status: "coming-soon",
    comingPlan: "Plan 6",
  },
  {
    key: "collections",
    label: "Categorías",
    description: "Listado de productos por categoría",
    icon: LayoutGrid,
    status: "coming-soon",
    comingPlan: "Plan 7",
  },
  {
    key: "pages",
    label: "Páginas estáticas",
    description: "Nosotros, Términos, Privacidad, FAQ, Envíos…",
    icon: FileText,
    status: "active",
  },
  {
    key: "cart",
    label: "Cart",
    description: "Carrito de compras",
    icon: ShoppingCart,
    status: "coming-soon",
    comingPlan: "Plan 8",
  },
  {
    key: "header-footer",
    label: "Header & Footer",
    description: "Navegación principal y pie de tienda",
    icon: Layers,
    status: "active",
  },
]

interface Props {
  activeTheme: ThemeRow
  onEditProductDefault: () => void
}

export function ThemeSectionList({ activeTheme, onEditProductDefault }: Props) {
  const router = useRouter()
  return (
    <div className="space-y-2">
      {SECTIONS.map((section) => {
        const Icon = section.icon
        const isProduct = section.key === "product"
        const isComingSoon = section.status === "coming-soon"
        const productSummary = isProduct
          ? activeTheme.defaultProductLandingTemplateName ??
            "Sin plantilla por defecto"
          : null

        return (
          <button
            key={section.key}
            type="button"
            disabled={isComingSoon}
            onClick={
              isComingSoon
                ? undefined
                : section.key === "product"
                  ? onEditProductDefault
                  : section.key === "pages"
                    ? () => router.push("/admin/paginas")
                    : section.key === "header-footer"
                      ? () => router.push("/admin/menus")
                      : undefined
            }
            className={cn(
              "group flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors",
              isComingSoon
                ? "cursor-not-allowed opacity-60"
                : "hover:bg-muted/50 hover:border-primary/40",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                isComingSoon
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{section.label}</span>
                {isComingSoon && (
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Próximamente — {section.comingPlan}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {section.description}
              </p>
              {productSummary && (
                <p className="text-xs font-medium mt-1">
                  Plantilla actual:{" "}
                  <span className="text-primary">{productSummary}</span>
                </p>
              )}
            </div>

            {!isComingSoon && (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            )}
          </button>
        )
      })}
    </div>
  )
}
