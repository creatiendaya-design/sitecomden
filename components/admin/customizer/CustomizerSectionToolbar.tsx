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
import { useThemeSectionsStore } from "./theme-sections-store"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import {
  detachProductSection,
  restoreProductSection,
} from "@/actions/theme-sections"
import type { OverlayRect, OverlayTarget } from "./useIframeSectionOverlay"

interface Props {
  target: OverlayTarget
  /** The iframe viewport rect — the toolbar is clamped inside it. */
  clip: OverlayRect
  /** Fase 3 — per-product override mode adds detach/restore (sections only). */
  productOverride: { productId: string; productSlug: string } | null
}

/** Sections that can't be moved / deleted (the obligatory product backbone). */
const UNMOVABLE = new Set(["PRODUCT_MAIN"])
const UNDELETABLE = new Set(["PRODUCT_MAIN", "COLLECTION_GRID"])

/**
 * Plan 19 — floating toolbar over the selected target in the customizer
 * preview. Handles BOTH theme sections (ThemeSection store) and page-builder
 * blocks (builder store), wiring the right move/hide/delete actions.
 */
export function CustomizerSectionToolbar({
  target,
  clip,
  productOverride,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Theme-section store (used when target.kind === "section")
  const group = target.group ?? "PRODUCT"
  const themeSections = useThemeSectionsStore((s) =>
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

  // Page-builder store (used when target.kind === "block")
  const builderBlocks = useBuilderStore((s) => s.blocks)
  const moveBlockRelative = useBuilderStore((s) => s.moveBlockRelative)
  const removeBlock = useBuilderStore((s) => s.removeBlock)

  // Position: anchor above the target, clamped inside the iframe viewport.
  const { rect } = target
  const visible =
    rect.top < clip.top + clip.height && rect.top + rect.height > clip.top
  const aboveTop = rect.top - 38
  const top =
    aboveTop >= clip.top + 4
      ? aboveTop
      : Math.min(rect.top + 6, clip.top + clip.height - 40)
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, clip.left + 90),
    clip.left + clip.width - 90,
  )

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  // ---- Resolve actions per kind ----
  let body: React.ReactNode = null

  if (target.kind === "block") {
    const idx = builderBlocks.findIndex((b) => b.id === target.id)
    if (idx < 0 || !visible) return null
    body = (
      <>
        <IconBtn
          label="Subir"
          disabled={idx <= 0}
          onClick={() => moveBlockRelative(target.id, "up")}
        >
          <ChevronUp className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Bajar"
          disabled={idx >= builderBlocks.length - 1}
          onClick={() => moveBlockRelative(target.id, "down")}
        >
          <ChevronDown className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Eliminar"
          destructive
          onClick={() => {
            if (window.confirm("¿Eliminar este bloque?")) removeBlock(target.id)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </IconBtn>
      </>
    )
  } else {
    const idx = themeSections.findIndex((s) => s.id === target.id)
    const section = idx >= 0 ? themeSections[idx] : null
    if (!section || !visible) return null

    const isOverride = !!productOverride
    const isInherited = isOverride && section.origin === "inherited"
    const unmovable = UNMOVABLE.has(section.type) || isOverride
    const undeletable = UNDELETABLE.has(section.type) || isOverride

    const move = (dir: -1 | 1) => {
      const tgt = idx + dir
      if (tgt < 0 || tgt >= themeSections.length) return
      const ordered = themeSections.map((s) => s.id)
      ;[ordered[idx], ordered[tgt]] = [ordered[tgt], ordered[idx]]
      reorderSections(group, ordered)
    }
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

    body = (
      <>
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
              disabled={unmovable || idx >= themeSections.length - 1}
              onClick={() => move(1)}
            >
              <ChevronDown className="h-4 w-4" />
            </IconBtn>
            <IconBtn
              label={section.enabled ? "Ocultar" : "Mostrar"}
              onClick={() => toggleEnabled(target.id)}
            >
              {section.enabled ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </IconBtn>
          </>
        )}

        {isOverride &&
          (isInherited ? (
            <IconBtn
              label="Personalizar solo este producto"
              disabled={isPending}
              onClick={() =>
                runOverride(
                  () =>
                    detachProductSection(productOverride!.productId, target.id),
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
                  () => restoreProductSection(target.id),
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
                removeSection(target.id)
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        )}
      </>
    )
  }

  return (
    <div
      className="pointer-events-auto fixed z-40 flex items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-lg"
      style={{ top, left, transform: "translateX(-50%)" }}
      onClick={stop}
      onMouseDown={stop}
      onPointerDown={stop}
    >
      {body}
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
