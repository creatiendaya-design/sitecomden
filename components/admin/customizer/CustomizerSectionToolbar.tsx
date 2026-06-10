"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Link2,
  SplitSquareHorizontal,
  Trash2,
} from "lucide-react"
import type { ThemeSectionGroup } from "@prisma/client"
import { useThemeSectionsStore } from "./theme-sections-store"
import {
  detachProductSection,
  restoreProductSection,
} from "@/actions/theme-sections"
import type { OverlayRect } from "./useIframeSectionOverlay"

interface Props {
  sectionId: string
  group: ThemeSectionGroup
  rect: OverlayRect
  /** Fase 3 — per-product override mode adds detach/restore. */
  productOverride: { productId: string; productSlug: string } | null
}

/** Sections that can't be moved / deleted (the obligatory product backbone). */
const UNMOVABLE = new Set(["PRODUCT_MAIN"])
const UNDELETABLE = new Set(["PRODUCT_MAIN", "COLLECTION_GRID"])

/**
 * Plan 19 — floating toolbar over the selected section in the customizer
 * preview. Mirrors the page-builder's BlockFloatingToolbar but wired to the
 * theme-sections store. Lives in the parent overlay (pointer-events-auto)
 * anchored above the section's rect.
 */
export function CustomizerSectionToolbar({
  sectionId,
  group,
  rect,
  productOverride,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const sections = useThemeSectionsStore((s) =>
    group === "HEADER"
      ? s.header
      : group === "FOOTER"
        ? s.footer
        : group === "COLLECTION"
          ? s.collection
          : s.product,
  )
  const reorderSections = useThemeSectionsStore((s) => s.reorderSections)
  const toggleEnabled = useThemeSectionsStore((s) => s.toggleSectionEnabled)
  const removeSection = useThemeSectionsStore((s) => s.removeSection)

  const idx = sections.findIndex((s) => s.id === sectionId)
  const section = idx >= 0 ? sections[idx] : null
  if (!section) return null

  const isOverride = !!productOverride
  const isInherited = isOverride && section.origin === "inherited"
  const unmovable = UNMOVABLE.has(section.type) || isOverride
  const undeletable = UNDELETABLE.has(section.type) || isOverride

  const move = (dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const ordered = sections.map((s) => s.id)
    ;[ordered[idx], ordered[target]] = [ordered[target], ordered[idx]]
    reorderSections(group, ordered)
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  const runOverride = (fn: () => Promise<unknown>, okMsg: string) =>
    startTransition(async () => {
      try {
        await fn()
        toast.success(okMsg)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error")
      }
    })

  // Anchor above the section, clamped to stay on-screen.
  const top = Math.max(rect.top - 38, 6)
  const left = rect.left + rect.width / 2

  return (
    <div
      className="pointer-events-auto fixed z-40 flex items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-lg"
      style={{ top, left, transform: "translateX(-50%)" }}
      onClick={stop}
      onMouseDown={stop}
    >
      {!isInherited && (
        <>
          <IconBtn
            label="Subir"
            disabled={unmovable || idx <= 0}
            onClick={() => move(-1)}
          >
            <ChevronUp className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            label="Bajar"
            disabled={unmovable || idx >= sections.length - 1}
            onClick={() => move(1)}
          >
            <ChevronDown className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            label={section.enabled ? "Ocultar" : "Mostrar"}
            onClick={() => toggleEnabled(sectionId)}
          >
            {section.enabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </IconBtn>
        </>
      )}

      {/* Fase 3 — override detach/restore */}
      {isOverride &&
        (isInherited ? (
          <IconBtn
            label="Personalizar solo este producto"
            disabled={isPending}
            onClick={() =>
              runOverride(
                () =>
                  detachProductSection(productOverride!.productId, sectionId),
                "Sección personalizada",
              )
            }
          >
            <SplitSquareHorizontal className="h-4 w-4" />
          </IconBtn>
        ) : (
          <IconBtn
            label="Volver a heredar de la plantilla"
            disabled={isPending}
            onClick={() =>
              runOverride(
                () => restoreProductSection(sectionId),
                "Sección restaurada",
              )
            }
          >
            <Link2 className="h-4 w-4" />
          </IconBtn>
        ))}

      {!isOverride && (
        <IconBtn
          label="Eliminar"
          disabled={undeletable}
          destructive
          onClick={() => {
            if (undeletable) return
            if (window.confirm("¿Eliminar esta sección?")) {
              removeSection(sectionId)
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </IconBtn>
      )}
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors ${
        disabled
          ? "opacity-30 cursor-not-allowed"
          : destructive
            ? "hover:bg-destructive/10 hover:text-destructive"
            : "hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}
