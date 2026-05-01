"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ensureCartPageForTheme,
  ensureHomePageForTheme,
  type ThemeRow,
} from "@/actions/themes"
import type { TemplateRow } from "@/actions/landing-templates"
import { savePageBlocks, type PageRow } from "@/actions/pages"
import type { MenuRow } from "@/actions/menus"
import { saveCategoryBlocks } from "@/actions/categories-blocks"
import {
  saveThemeSectionGroup,
  type ThemeSectionRow,
} from "@/actions/theme-sections"
import type { BlockInstance } from "@/lib/blocks/types"
import type { ThemeSectionCatalog } from "@/lib/theme-sections/types"
import {
  CustomizerToolbar,
  type DeviceMode,
} from "./CustomizerToolbar"
import { CustomizerPreview } from "./CustomizerPreview"
import { CustomizerTokensPanel } from "./CustomizerTokensPanel"
import { ZoneList } from "./ZoneList"
import { ColorSchemesProvider } from "./color-schemes-context"
import { RightSidebar } from "@/components/admin/page-builder/RightSidebar/RightSidebar"
import { ThemeSectionRightSidebar } from "./ThemeSectionRightSidebar"
import {
  useThemeSectionsStore,
  type SectionDraft,
} from "./theme-sections-store"
import type { EditorBlock } from "./EmbeddedBlocksEditor"
import {
  buildPageTargets,
  findTarget,
} from "./page-targets"

/**
 * Plan 14 — the customizer can edit either a Page (home, cart, static
 * page) or a Category landing. The surface kind drives which save action
 * the EmbeddedBlocksEditor wires.
 */
export type EditableSurface =
  | { kind: "page"; id: string; title: string | null }
  | { kind: "category"; id: string; title: string }

interface Props {
  theme: ThemeRow
  // landingTemplates kept in props for backward compatibility with the
  // page route, but the picker for it lives outside the customizer now
  // (theme metadata page) — pending product-section analysis.
  landingTemplates: TemplateRow[]
  pages: PageRow[]
  menus: MenuRow[]
  /** All Pages + Categories the page picker should expose. The customize
   *  page server-fetches these and forwards them so the picker dropdown
   *  can list real options. */
  categoryTargets: { id: string; name: string; slug: string }[]
  sampleProductSlug: string | null
  sampleCategorySlug: string | null
  targetKey: string
  editableSurface: EditableSurface | null
  initialBlocks: BlockInstance[]
  /** Plan 16 — server-fetched ordered HEADER theme sections (with blocks). */
  headerSections: ThemeSectionRow[]
  /** Plan 16 — server-fetched ordered FOOTER theme sections (with blocks). */
  footerSections: ThemeSectionRow[]
  /** Plan 16 — per-theme allowed section types per group. */
  sectionCatalog: ThemeSectionCatalog
}

/**
 * Plan 13 — Customizer split-screen shell (Shopify-style).
 *
 * Layout:
 *  - Toolbar (top): page picker, device toggle, Salir
 *  - Left column: single ZoneList with three zones (Encabezado /
 *    Plantilla / Pie de página). All settings auto-save — no Save button.
 *  - Center column: storefront iframe with `?theme-preview=<id>`.
 *  - Right column: page-builder RightSidebar — visible only when a block
 *    is selected (Shopify-style: settings appear when you pick a section).
 */
export function CustomizerShell({
  theme,
  pages,
  categoryTargets,
  sampleProductSlug,
  sampleCategorySlug,
  targetKey,
  editableSurface,
  initialBlocks,
  headerSections,
  footerSections,
  sectionCatalog,
}: Props) {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Plan 13 — left-panel view: "sections" (default zone list) or "tokens"
  // (theme-wide colors / fonts / scale). Tokens live in their own view
  // because they're a global concern, not a per-section concern, and they
  // batch-save on demand instead of autosaving each color tweak.
  const [panelView, setPanelView] = useState<"sections" | "tokens">("sections")

  // Plan 14 — editor key + save callback for the embedded blocks editor.
  // Differs by surface kind: pages persist via savePageBlocks, categories
  // via saveCategoryBlocks. The editor itself is surface-agnostic.
  const editorKey = editableSurface
    ? `${editableSurface.kind}-${editableSurface.id}`
    : null
  const saveBlocks = useCallback(
    async (next: EditorBlock[]) => {
      if (!editableSurface) return
      if (editableSurface.kind === "page") {
        await savePageBlocks(
          editableSurface.id,
          next.map((b) => ({
            id: b.id,
            type: b.type as Parameters<
              typeof savePageBlocks
            >[1][number]["type"],
            position: b.position,
            content: b.content,
          })),
        )
      } else {
        await saveCategoryBlocks(
          editableSurface.id,
          next.map((b) => ({
            id: b.id,
            type: b.type as Parameters<
              typeof saveCategoryBlocks
            >[1][number]["type"],
            position: b.position,
            content: b.content,
          })),
        )
      }
    },
    [editableSurface],
  )

  // ---------- Page-type selector ----------
  const targets = useMemo(
    () =>
      buildPageTargets({
        pages,
        categoryTargets,
        sampleProductSlug,
        sampleCategorySlug,
        homePageId: theme.homePageId,
        cartPageId: theme.cartPageId,
      }),
    [
      pages,
      categoryTargets,
      sampleProductSlug,
      sampleCategorySlug,
      theme.homePageId,
      theme.cartPageId,
    ],
  )
  const currentTarget =
    findTarget(targets, targetKey) ?? targets[0] ?? null

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!currentTarget) return
    const url = new URL(currentTarget.path, window.location.origin)
    url.searchParams.set("theme-preview", theme.id)
    setPreviewUrl(url.toString())
  }, [currentTarget, theme.id])

  const [device, setDevice] = useState<DeviceMode>("desktop")

  // Switching target reloads the page (server fetch of new blocks).
  const handleTargetChange = useCallback(
    (newKey: string) => {
      router.push(
        `/admin/personalizar/temas/${theme.id}/customize?target=${encodeURIComponent(newKey)}`,
      )
    },
    [router, theme.id],
  )

  // Iframe refresh after any save (blocks autosave or settings autosave).
  // Prefer a postMessage soft refresh — listened to by PreviewRefreshListener
  // in app/(shop)/layout.tsx and serviced via router.refresh() inside the
  // iframe — because it's ~10x faster than a full document reload (no asset
  // re-download, keeps scroll/focus, avoids a fresh Neon cold start). Falls
  // back to a hard reload if the iframe isn't reachable.
  const handleAnySaved = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    if (win) {
      try {
        win.postMessage(
          { type: "theme-preview-refresh" },
          window.location.origin,
        )
      } catch {
        win.location.reload()
      }
    }
    router.refresh()
  }, [router])

  // ---------- Plan 16 — theme-sections store hydration + autosave ----------
  const hydrateThemeSections = useThemeSectionsStore((s) => s.hydrate)
  useEffect(() => {
    hydrateThemeSections(theme.id, headerSections, footerSections)
  }, [hydrateThemeSections, theme.id, headerSections, footerSections])

  const headerDrafts = useThemeSectionsStore((s) => s.header)
  const footerDrafts = useThemeSectionsStore((s) => s.footer)
  const themeSectionsSelected = useThemeSectionsStore((s) => s.selected)

  useDebouncedSaveGroup(theme.id, "HEADER", headerDrafts, handleAnySaved)
  useDebouncedSaveGroup(theme.id, "FOOTER", footerDrafts, handleAnySaved)

  const handleExit = useCallback(() => {
    router.push("/admin/personalizar/temas")
  }, [router])

  // ---------- Auto-create home/cart page for empty targets ----------
  const [creatingPage, setCreatingPage] = useState(false)
  const handleCreateMissingPage = useCallback(async () => {
    if (creatingPage) return
    if (targetKey !== "home" && targetKey !== "cart") return
    setCreatingPage(true)
    try {
      const action =
        targetKey === "home"
          ? ensureHomePageForTheme
          : ensureCartPageForTheme
      await action(theme.id)
      toast.success(
        targetKey === "home"
          ? "Página de inicio creada"
          : "Página del carrito creada",
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear")
    } finally {
      setCreatingPage(false)
    }
  }, [creatingPage, targetKey, theme.id, router])

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <CustomizerToolbar
        themeName={theme.name}
        targets={targets}
        currentTargetKey={targetKey}
        onTargetChange={handleTargetChange}
        device={device}
        onDeviceChange={setDevice}
        onExit={handleExit}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left column: sections list OR tokens editor */}
        <div className="w-[340px] shrink-0 flex flex-col bg-card border-r overflow-hidden">
          {panelView === "sections" ? (
            <>
              <CustomizerHeaderRow
                themeName={theme.name}
                onExit={handleExit}
              />

              <div className="flex-1 min-h-0 overflow-y-auto">
                {editorKey ? (
                  <ZoneList
                    themeId={theme.id}
                    editorKey={editorKey}
                    initialBlocks={initialBlocks}
                    saveBlocks={saveBlocks}
                    targetLabel={currentTarget?.label ?? "Plantilla"}
                    onBlocksSaved={handleAnySaved}
                    sectionCatalog={sectionCatalog}
                  />
                ) : (
                  <BlocksUnavailable
                    targetKey={targetKey}
                    targetLabel={currentTarget?.label ?? "esta plantilla"}
                    onCreate={handleCreateMissingPage}
                    pending={creatingPage}
                  />
                )}
              </div>

              {/* Footer link to switch into the tokens editor. Mirrors
                  Shopify's "Theme settings" affordance at the bottom of
                  the customizer sidebar. */}
              <button
                type="button"
                onClick={() => setPanelView("tokens")}
                className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                  Configuración del tema
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </>
          ) : (
            <CustomizerTokensPanel
              theme={theme}
              onBack={() => setPanelView("sections")}
              onSaved={handleAnySaved}
            />
          )}
        </div>

        {/* Center column: iframe */}
        <main className="flex-1 min-w-0 bg-muted/30 flex items-stretch justify-center p-6">
          {previewUrl ? (
            <CustomizerPreview
              ref={iframeRef}
              src={previewUrl}
              device={device}
            />
          ) : (
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando vista previa…
            </div>
          )}
        </main>

        {/* Right column: block settings (only meaningful in sections
            view; the tokens view is full-bleed in the left panel).
            Plan 16: when a theme section / section-block is selected,
            we render ThemeSectionRightSidebar (it reads from the
            theme-sections store). Otherwise — and only when there's an
            editable page/category surface — we fall back to the
            page-builder RightSidebar, wrapped in ColorSchemesProvider
            so its StyleTab scheme picker can populate. */}
        {panelView === "sections" &&
          (themeSectionsSelected ? (
            <ThemeSectionRightSidebar />
          ) : editableSurface ? (
            <ColorSchemesProvider schemes={theme.colorSchemes}>
              <RightSidebar
                context={{
                  type: "page",
                  // RightSidebar's PageContext accepts both Page-bound
                  // and Category-bound surfaces — its current consumers
                  // only read id/title for breadcrumb display, so we
                  // forward whichever surface the customizer is editing
                  // without introducing a separate CategoryContext today.
                  page: {
                    id: editableSurface.id,
                    slug: editableSurface.title ?? "page",
                    title: editableSurface.title ?? "Plantilla",
                  },
                }}
              />
            </ColorSchemesProvider>
          ) : null)}
      </div>
    </div>
  )
}

/**
 * Debounced autosave for a HEADER or FOOTER theme-sections group. Fires
 * 250ms after the last edit, but only if any draft is dirty (so initial
 * hydration doesn't trigger a no-op save). 250ms is short enough that
 * structural changes (add / remove / reorder / toggle) feel near-instant
 * but long enough that rapid keystrokes in a text field still coalesce
 * into a single write. Keeps the call inside the Shell file because it
 * closes over saveThemeSectionGroup + the toast surface, and pulling it
 * out adds little value at one caller per group.
 */
function useDebouncedSaveGroup(
  themeId: string,
  group: "HEADER" | "FOOTER",
  drafts: SectionDraft[],
  onSaved: () => void,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const isDirty = drafts.some(
      (s) => s.dirty || s.blocks.some((b) => b.dirty),
    )
    if (!isDirty) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        await saveThemeSectionGroup(
          themeId,
          group,
          drafts.map((s) => ({
            id: s.id,
            type: s.type,
            position: s.position,
            content: s.content,
            enabled: s.enabled,
            blocks: s.blocks.map((b) => ({
              id: b.id,
              type: b.type,
              position: b.position,
              content: b.content,
              enabled: b.enabled,
            })),
          })),
        )
        onSaved()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    }, 250)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [drafts, themeId, group, onSaved])
}

function CustomizerHeaderRow({
  themeName,
  onExit,
}: {
  themeName: string
  onExit: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 -ml-2"
        onClick={onExit}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Temas
      </Button>
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate">{themeName}</span>
      </div>
    </div>
  )
}

interface BlocksUnavailableProps {
  targetKey: string
  targetLabel: string
  onCreate: () => void
  pending: boolean
}

function BlocksUnavailable({
  targetKey,
  targetLabel,
  onCreate,
  pending,
}: BlocksUnavailableProps) {
  const canCreate = targetKey === "home" || targetKey === "cart"

  return (
    <div className="p-4 space-y-3 text-sm">
      <p className="text-muted-foreground leading-relaxed">
        {canCreate ? (
          <>
            Aún no creaste la página para <strong>{targetLabel}</strong>. Al
            crearla, sus bloques se renderizan automáticamente en la URL
            correspondiente.
          </>
        ) : (
          <>
            La plantilla <strong>{targetLabel}</strong> no admite edición de
            bloques en esta versión. Cambiá a Inicio, Carrito o una página
            estática para editar bloques.
          </>
        )}
      </p>
      {canCreate && (
        <Button
          size="sm"
          className="w-full"
          onClick={onCreate}
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Creando…
            </>
          ) : (
            "Crear página y empezar a editar"
          )}
        </Button>
      )}
    </div>
  )
}
