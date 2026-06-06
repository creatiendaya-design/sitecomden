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
import { type PageRow } from "@/actions/pages"
import {
  saveThemeSectionGroupVersioned,
  saveProductSectionOverrides,
  type ThemeSectionRow,
} from "@/actions/theme-sections"
import type { ProductTemplateRow } from "@/actions/theme-product-templates"
import { savePageBlocksVersioned } from "@/actions/pages"
import { saveCategoryBlocksVersioned } from "@/actions/categories-blocks"
import { BatchConflictDialog } from "@/components/admin/concurrency/BatchConflictDialog"
import type { BatchConflictEntry } from "@/lib/concurrency/batch"
import type { SaveBlocksResult } from "@/components/admin/customizer/EmbeddedBlocksEditor"
import type {
  BlockInstance,
  LandingBlockType as LandingBlockTypeUnion,
} from "@/lib/blocks/types"
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
import { useBuilderStore } from "@/components/admin/page-builder/store"
import { useLivePreviewOverrides } from "./useLivePreviewOverrides"
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
  /** Plan 17 — server-fetched ordered PRODUCT theme sections (with blocks). */
  productSections: ThemeSectionRow[]
  /** Plan 19 — server-fetched ordered COLLECTION theme sections (with blocks). */
  collectionSections: ThemeSectionRow[]
  /** Plan 19 — all product templates of this theme (for the PRODUCT zone picker). */
  productTemplates: ProductTemplateRow[]
  /** Plan 19 — which product template the PRODUCT zone is currently editing.
   *  `productSections` above are scoped to this id. */
  activeProductTemplateId: string | null
  /** Plan 19 (Fase 3) — when set, the PRODUCT zone edits a single product's
   *  section OVERRIDES (not a shared template). `productSections` are then the
   *  merged inherited+detached rows for this product, and the iframe previews
   *  this product. */
  productOverride: { productId: string; productSlug: string } | null
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
  productSections,
  collectionSections,
  productTemplates,
  activeProductTemplateId,
  productOverride,
  sectionCatalog,
}: Props) {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Live-preview: push color overrides directly into the iframe DOM on
  // every Zustand mutation. Bypasses the autosave + server round-trip so
  // colors paint instantly (Shopify-style). Background autosave still
  // persists for reload survival. Receives the theme's color schemes so
  // scheme switching can rebind `--theme-*` custom properties inline
  // (more reliable than waiting for the per-theme CSS rule to win).
  useLivePreviewOverrides(iframeRef, theme.colorSchemes)

  // Plan 13 — left-panel view: "sections" (default zone list) or "tokens"
  // (theme-wide colors / fonts / scale). Tokens live in their own view
  // because they're a global concern, not a per-section concern, and they
  // batch-save on demand instead of autosaving each color tweak.
  const [panelView, setPanelView] = useState<"sections" | "tokens">("sections")

  // Plan 14 — editor key + save callback for the embedded blocks editor.
  // Differs by surface kind: pages persist via savePageBlocks, categories
  // via saveCategoryBlocks. The editor itself is surface-agnostic.
  //
  // Plan 18 — blocks conflict state. When the page/category batch save
  // reports per-row conflicts, surface a BatchConflictDialog so the user
  // picks Recargar / Forzar guardado for the whole batch.
  const [blocksConflict, setBlocksConflict] = useState<{
    sent: EditorBlock[]
    conflicts: {
      rowId: string
      serverVersion: number | null
      label: string
    }[]
  } | null>(null)

  // Plan 18 — bump on Recargar so EmbeddedBlocksEditor's `editorKey`
  // changes, which retriggers the store-hydration effect with the
  // freshly-fetched `initialBlocks`. Without this the Zustand store
  // would keep the conflicted local draft after refresh.
  const [blocksReloadGen, setBlocksReloadGen] = useState(0)

  const editorKey = editableSurface
    ? `${editableSurface.kind}-${editableSurface.id}-${blocksReloadGen}`
    : null
  const saveBlocks = useCallback(
    async (next: EditorBlock[]): Promise<SaveBlocksResult> => {
      if (!editableSurface)
        return { ok: false, reason: "error", message: "Sin superficie editable" }

      if (editableSurface.kind === "page") {
        const result = await savePageBlocksVersioned(
          editableSurface.id,
          next.map((b) => ({
            id: b.id,
            type: b.type as Parameters<
              typeof savePageBlocksVersioned
            >[1][number]["type"],
            position: b.position,
            content: b.content,
            version: b.version,
          })),
        )
        if (result.ok) {
          return {
            ok: true,
            persisted: result.data.blocks.map((b) => ({
              id: b.id,
              type: b.type as LandingBlockTypeUnion,
              position: b.position,
              content: b.content,
              version: b.version,
            })),
          }
        }
        if (result.reason === "conflict") {
          const conflicts = result.conflicts.map((c) => ({
            rowId: c.rowId,
            serverVersion: c.serverVersion,
            label: c.current
              ? `${c.current.type} (#${c.current.position + 1})`
              : `Bloque eliminado (${c.rowId.slice(-6)})`,
          }))
          setBlocksConflict({ sent: next, conflicts })
          return { ok: false, reason: "conflict", sent: next, conflicts }
        }
        return {
          ok: false,
          reason: "error",
          message:
            "message" in result
              ? result.message
              : result.reason === "unauthorized"
                ? "Sesión expirada"
                : "El recurso ya no existe",
        }
      }

      // Category surface
      const result = await saveCategoryBlocksVersioned(
        editableSurface.id,
        next.map((b) => ({
          id: b.id,
          type: b.type as Parameters<
            typeof saveCategoryBlocksVersioned
          >[1][number]["type"],
          position: b.position,
          content: b.content,
          version: b.version,
        })),
      )
      if (result.ok) {
        return {
          ok: true,
          persisted: result.data.blocks.map((b) => ({
            id: b.id,
            type: b.type as LandingBlockTypeUnion,
            position: b.position,
            content: b.content,
            version: b.version,
          })),
        }
      }
      if (result.reason === "conflict") {
        const conflicts = result.conflicts.map((c) => ({
          rowId: c.rowId,
          serverVersion: c.serverVersion,
          label: c.current
            ? `${c.current.type} (#${c.current.position + 1})`
            : `Bloque eliminado (${c.rowId.slice(-6)})`,
        }))
        setBlocksConflict({ sent: next, conflicts })
        return { ok: false, reason: "conflict", sent: next, conflicts }
      }
      return {
        ok: false,
        reason: "error",
        message:
          "message" in result
            ? result.message
            : result.reason === "unauthorized"
              ? "Sesión expirada"
              : "El recurso ya no existe",
      }
    },
    [editableSurface],
  )

  const handleBlocksReload = useCallback(() => {
    setBlocksConflict(null)
    useBuilderStore.getState().setSaveStatus({ status: "idle" })
    setBlocksReloadGen((g) => g + 1)
    router.refresh()
  }, [router])

  const handleBlocksForce = useCallback(async () => {
    if (!blocksConflict || !editableSurface) return
    const versionMap = new Map<string, number>()
    for (const c of blocksConflict.conflicts) {
      if (c.serverVersion !== null) versionMap.set(c.rowId, c.serverVersion)
    }
    const forced = blocksConflict.sent.map((b) => ({
      ...b,
      version: versionMap.get(b.id) ?? b.version,
    }))
    setBlocksConflict(null)
    await saveBlocks(forced)
  }, [blocksConflict, editableSurface, saveBlocks])

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
  // Plan 17/19 — drives the Plantilla zone's editor choice: when the admin
  // is previewing a product target, render the PRODUCT-group editor; when
  // previewing the products index, render the COLLECTION-group editor;
  // otherwise fall back to the page/category block editor.
  const templateMode: "product" | "collection" | "page-or-category" =
    currentTarget?.key === "product"
      ? "product"
      : currentTarget?.key === "products-index"
        ? "collection"
        : "page-or-category"

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!currentTarget) return
    // Fase 3 — in per-product override mode, preview the real product page
    // instead of the theme's sample product.
    const path = productOverride
      ? `/productos/${productOverride.productSlug}`
      : currentTarget.path
    const url = new URL(path, window.location.origin)
    url.searchParams.set("theme-preview", theme.id)
    // Plan 19 — when editing a (shared) product template, force the preview
    // to render THAT template, not whichever one the sample product is
    // assigned to. Skipped in override mode (the real product already shows
    // its own template + overrides).
    if (
      !productOverride &&
      templateMode === "product" &&
      activeProductTemplateId
    ) {
      url.searchParams.set("productTemplate", activeProductTemplateId)
    }
    setPreviewUrl(url.toString())
  }, [
    currentTarget,
    theme.id,
    productOverride,
    templateMode,
    activeProductTemplateId,
  ])

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
  //
  // We intentionally do NOT call `router.refresh()` on the parent here:
  // the customizer's local Zustand stores (page-builder + theme-sections)
  // are the source of truth while editing, and theme-sections autosave
  // already merges the persisted snapshot back into the store via
  // `replaceGroup`. Refreshing the parent server component on every save
  // would double the DB read latency AND reset the user's selected
  // sidebar target on each round-trip.
  const handleAnySaved = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    try {
      win.postMessage(
        { type: "theme-preview-refresh" },
        window.location.origin,
      )
    } catch {
      win.location.reload()
    }
  }, [])

  // ---------- Plan 16 — theme-sections store hydration + autosave ----------
  const hydrateThemeSections = useThemeSectionsStore((s) => s.hydrate)
  // Hydrate the store ONCE per theme.id. We intentionally exclude
  // headerSections / footerSections from the dep array: subsequent saves
  // already merge the persisted snapshot into the store via replaceGroup(),
  // and Next.js auto-refresh after server actions changes the prop array
  // references on every save. Re-running hydrate on those reference
  // changes would reset `selected` to null (right sidebar collapses to
  // "Plantilla") and discard any in-flight local edits.
  const hydratedThemeIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (hydratedThemeIdRef.current === theme.id) return
    hydratedThemeIdRef.current = theme.id
    hydrateThemeSections(theme.id, {
      header: headerSections,
      footer: footerSections,
      product: productSections,
      collection: collectionSections,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.id, hydrateThemeSections])

  // Plan 18 — re-hydration on Recargar. handleSectionsReload sets the
  // ref + state and calls router.refresh(). When the parent's
  // server-fetched headerSections / footerSections arrive (different
  // reference), the effect below detects the flag + ref change and
  // rehydrates the store with the freshly-fetched server state. Without
  // this, clicking Recargar cleared the dialog but the in-memory drafts
  // (the conflicted edits) survived — the canvas kept showing local
  // state and the next autosave conflicted again immediately.
  //
  // The `reloadPending` state is passed to `useDebouncedSaveGroup` to
  // keep autosaves frozen during the (async) refresh window. Without
  // freezing, the debounced autosave fires in the gap between conflict
  // clearance and props-arrival, immediately re-conflicting against the
  // newly advanced server version.
  const reloadExpectedRef = useRef(false)
  const [reloadPending, setReloadPending] = useState(false)
  useEffect(() => {
    if (!reloadExpectedRef.current) return
    reloadExpectedRef.current = false
    hydrateThemeSections(theme.id, {
      header: headerSections,
      footer: footerSections,
      product: productSections,
      collection: collectionSections,
    })
    selectThemeSection(null)
    setReloadPending(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerSections, footerSections, productSections, collectionSections])

  const headerDrafts = useThemeSectionsStore((s) => s.header)
  const footerDrafts = useThemeSectionsStore((s) => s.footer)
  const productDrafts = useThemeSectionsStore((s) => s.product)
  const collectionDrafts = useThemeSectionsStore((s) => s.collection)
  const headerDirty = useThemeSectionsStore((s) => s.headerDirty)
  const footerDirty = useThemeSectionsStore((s) => s.footerDirty)
  const productDirty = useThemeSectionsStore((s) => s.productDirty)
  const collectionDirty = useThemeSectionsStore((s) => s.collectionDirty)
  const themeSectionsSelected = useThemeSectionsStore((s) => s.selected)
  const selectThemeSection = useThemeSectionsStore((s) => s.select)
  const replaceThemeGroup = useThemeSectionsStore((s) => s.replaceGroup)

  // Plan 19 — re-hydrate ONLY the PRODUCT group (not header/footer) when its
  // server data changes, WITHOUT re-running the once-per-theme hydrate:
  //  - template switch (?productTemplate=<id>) → new scoped sections, or
  //  - Fase 3 override mode: detach/restore call router.refresh(), which
  //    delivers freshly-merged inherited+detached sections.
  // Seeded refs skip the first render so it only fires on a real change.
  const activeProductTemplateIdRef = useRef(activeProductTemplateId)
  const productSectionsRef = useRef(productSections)
  useEffect(() => {
    if (activeProductTemplateIdRef.current !== activeProductTemplateId) {
      activeProductTemplateIdRef.current = activeProductTemplateId
      productSectionsRef.current = productSections
      replaceThemeGroup("PRODUCT", productSections)
      return
    }
    if (productOverride && productSectionsRef.current !== productSections) {
      productSectionsRef.current = productSections
      replaceThemeGroup("PRODUCT", productSections)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProductTemplateId, productSections, productOverride, replaceThemeGroup])

  // Coordinate selection between the two zones so only ONE thing is selected
  // at a time. The right sidebar's conditional gives priority to theme-section
  // selections, so without this, clicking a Plantilla block while a header /
  // footer section is selected would silently keep showing the header/footer
  // form. Each effect only fires when ITS watched value transitions to truthy,
  // so they don't ping-pong: clearing the other side leaves it null, and the
  // other effect's `if (truthy)` guard keeps it dormant.
  const builderSelectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBuilderBlock = useBuilderStore((s) => s.selectBlock)
  useEffect(() => {
    if (builderSelectedBlockId) selectThemeSection(null)
  }, [builderSelectedBlockId, selectThemeSection])
  useEffect(() => {
    if (themeSectionsSelected) selectBuilderBlock(null)
  }, [themeSectionsSelected, selectBuilderBlock])

  const mergeSavedIds = useThemeSectionsStore((s) => s.mergeSavedIds)

  // Plan 18 — Batch conflict state for theme-sections autosave. When the
  // server reports a conflict, freeze autosave (so we don't keep firing
  // requests that will keep failing) and show the BatchConflictDialog.
  const [sectionsConflict, setSectionsConflict] = useState<{
    group: "HEADER" | "FOOTER" | "PRODUCT" | "COLLECTION"
    sent: SectionDraft[]
    conflicts: BatchConflictEntry<ThemeSectionRow>[]
  } | null>(null)

  const handleSectionsConflict = useCallback(
    (
      group: "HEADER" | "FOOTER" | "PRODUCT" | "COLLECTION",
      sent: SectionDraft[],
      conflicts: BatchConflictEntry<ThemeSectionRow>[],
    ) => {
      setSectionsConflict({ group, sent, conflicts })
    },
    [],
  )

  const handleSectionsReload = useCallback(() => {
    setSectionsConflict(null)
    // Flag the next prop refresh as a reload-driven rehydration. The
    // effect that watches headerSections / footerSections refs will pick
    // it up once router.refresh delivers the new RSC payload — that's
    // when we discard the local drafts and rehydrate from the server.
    reloadExpectedRef.current = true
    // Freeze autosave during the async refresh window so the debounced
    // save doesn't fire with the conflicted local drafts before
    // hydration replaces them.
    setReloadPending(true)
    router.refresh()
  }, [router])

  const handleSectionsForce = useCallback(async () => {
    if (!sectionsConflict) return
    // Build a fresh payload: for each row that conflicted, bump its
    // `version` to the server's current value so the conditional update
    // matches and our local edits overwrite the other admin's writes.
    const versionMap = new Map<string, number>()
    for (const c of sectionsConflict.conflicts) {
      if (c.serverVersion !== null) versionMap.set(c.rowId, c.serverVersion)
    }
    const forced = sectionsConflict.sent.map((s) => ({
      ...s,
      version: versionMap.get(s.id) ?? s.version,
      blocks: s.blocks.map((b) => ({
        ...b,
        version: versionMap.get(b.id) ?? b.version,
      })),
    }))
    setSectionsConflict(null)
    const overrideId =
      sectionsConflict.group === "PRODUCT"
        ? (productOverride?.productId ?? null)
        : null
    const forcedPayload = forced.map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      content: s.content,
      enabled: s.enabled,
      version: s.version,
      blocks: s.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        position: b.position,
        content: b.content,
        enabled: b.enabled,
        version: b.version,
      })),
    }))
    try {
      const result = overrideId
        ? await saveProductSectionOverrides(overrideId, forcedPayload)
        : await saveThemeSectionGroupVersioned(
            theme.id,
            sectionsConflict.group,
            forcedPayload,
            sectionsConflict.group === "PRODUCT" ? activeProductTemplateId : null,
          )
      if (result.ok) {
        mergeSavedIds(sectionsConflict.group, forced, result.data.sections)
        handleAnySaved()
      } else if (result.reason === "conflict") {
        // Another admin slipped a second write in between. Surface again.
        setSectionsConflict({
          group: sectionsConflict.group,
          sent: forced,
          conflicts: result.conflicts,
        })
      } else {
        const message =
          "message" in result ? result.message : "Error al forzar guardado"
        toast.error(message)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al forzar guardado")
    }
  }, [sectionsConflict, theme.id, mergeSavedIds, handleAnySaved, activeProductTemplateId, productOverride])

  useDebouncedSaveGroup(
    theme.id,
    "HEADER",
    headerDrafts,
    headerDirty,
    mergeSavedIds,
    handleAnySaved,
    handleSectionsConflict,
    sectionsConflict !== null || reloadPending,
  )
  useDebouncedSaveGroup(
    theme.id,
    "FOOTER",
    footerDrafts,
    footerDirty,
    mergeSavedIds,
    handleAnySaved,
    handleSectionsConflict,
    sectionsConflict !== null || reloadPending,
  )
  useDebouncedSaveGroup(
    theme.id,
    "PRODUCT",
    productDrafts,
    productDirty,
    mergeSavedIds,
    handleAnySaved,
    handleSectionsConflict,
    sectionsConflict !== null || reloadPending,
    activeProductTemplateId,
    productOverride?.productId ?? null,
  )
  useDebouncedSaveGroup(
    theme.id,
    "COLLECTION",
    collectionDrafts,
    collectionDirty,
    mergeSavedIds,
    handleAnySaved,
    handleSectionsConflict,
    sectionsConflict !== null || reloadPending,
  )

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
                {editorKey ||
                templateMode === "product" ||
                templateMode === "collection" ? (
                  <ZoneList
                    themeId={theme.id}
                    editorKey={editorKey}
                    initialBlocks={initialBlocks}
                    saveBlocks={saveBlocks}
                    targetLabel={currentTarget?.label ?? "Plantilla"}
                    onBlocksSaved={handleAnySaved}
                    sectionCatalog={sectionCatalog}
                    templateMode={templateMode}
                    productTemplates={productTemplates}
                    activeProductTemplateId={activeProductTemplateId}
                    productOverride={productOverride}
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
            // ColorSchemesProvider also wraps the theme-section sidebar so
            // its Estilo tab's ColorSchemeControl can list the theme's
            // schemes. Without it, the picker hides itself (it gates on
            // schemes.length < 2).
            <ColorSchemesProvider schemes={theme.colorSchemes}>
              <ThemeSectionRightSidebar />
            </ColorSchemesProvider>
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

      <BatchConflictDialog
        open={sectionsConflict !== null}
        onOpenChange={(next) => {
          if (!next) setSectionsConflict(null)
        }}
        conflicts={sectionsConflict?.conflicts ?? []}
        onReload={handleSectionsReload}
        onForce={handleSectionsForce}
        resourceLabel={
          sectionsConflict?.group === "HEADER"
            ? "el header del tema"
            : sectionsConflict?.group === "PRODUCT"
              ? "la plantilla de producto"
              : sectionsConflict?.group === "COLLECTION"
                ? "la plantilla de productos"
                : "el footer del tema"
        }
        formatLabel={(c) => {
          if (!c.current) return `Sección eliminada (${c.rowId.slice(-6)})`
          return `${c.current.type} (#${c.current.position + 1})`
        }}
      />

      <BatchConflictDialog
        open={blocksConflict !== null}
        onOpenChange={(next) => {
          if (!next) setBlocksConflict(null)
        }}
        conflicts={
          // Adapt our shape to the dialog's expected entry shape.
          blocksConflict?.conflicts.map((c) => ({
            rowId: c.rowId,
            current: { label: c.label } as { label: string },
            serverVersion: c.serverVersion,
          })) ?? []
        }
        onReload={handleBlocksReload}
        onForce={handleBlocksForce}
        resourceLabel={
          editableSurface?.kind === "category"
            ? "esta categoría"
            : "esta página"
        }
        formatLabel={(c) => c.current?.label ?? c.rowId}
      />
    </div>
  )
}

/**
 * Debounced autosave for a HEADER or FOOTER theme-sections group. Fires
 * 250ms after the last edit, but only if any draft is dirty (so initial
 * hydration doesn't trigger a no-op save).
 *
 * Two correctness guarantees beyond simple debouncing:
 *
 *  1. Non-destructive merge — `mergeSavedIds` only remaps tmp-ids to
 *     persisted ids. The in-memory store is the canonical CURRENT state
 *     and stays put; the server response is the canonical SAVED state
 *     and we only borrow ids from it. This is the fix for the "edits
 *     revert mid-typing" bug: when the admin keeps editing during the
 *     300-800ms server roundtrip, those edits used to be clobbered by
 *     `replaceGroup`. Now they survive.
 *
 *  2. Serialized saves — only one save is in flight per group at a time.
 *     A `savingRef` flag blocks new fires until the current one resolves.
 *     If the group became dirty again during the save (admin kept
 *     editing), we re-arm the timer right after, so nothing is lost.
 *     Without this, two concurrent saves could race and reorder writes
 *     against the server.
 */
/**
 * Plan 18 — versioned variant. The autosave debounce stays as before; the
 * only changes are:
 *   1. We call `saveThemeSectionGroupVersioned` and send each row's
 *      `version` so the server can reject stale writes.
 *   2. On `{ ok: false, reason: "conflict" }` we hand the conflicts off to
 *      the parent via `onConflict`, which surfaces the BatchConflictDialog
 *      and freezes autosave until the user resolves.
 */
function useDebouncedSaveGroup(
  themeId: string,
  group: "HEADER" | "FOOTER" | "PRODUCT" | "COLLECTION",
  drafts: SectionDraft[],
  groupDirty: boolean,
  mergeSavedIds: (
    group: "HEADER" | "FOOTER" | "PRODUCT" | "COLLECTION",
    sent: SectionDraft[],
    saved: ThemeSectionRow[],
  ) => void,
  onSaved: () => void,
  onConflict: (
    group: "HEADER" | "FOOTER" | "PRODUCT" | "COLLECTION",
    sent: SectionDraft[],
    conflicts: BatchConflictEntry<ThemeSectionRow>[],
  ) => void,
  /** When the parent is showing a conflict dialog, freeze autosaves until
   *  the user clicks Recargar (which refetches + resets) or Forzar (which
   *  retries via the parent). */
  frozen: boolean,
  /** Plan 19 — for the PRODUCT group, the template the edits belong to.
   *  Ignored for other groups. */
  productTemplateId?: string | null,
  /** Plan 19 (Fase 3) — for the PRODUCT group in per-product override mode,
   *  the product whose overrides are being saved. When set, only `detached`
   *  drafts are persisted (via saveProductSectionOverrides). */
  overrideProductId?: string | null,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const draftsRef = useRef(drafts)
  const dirtyRef = useRef(groupDirty)
  const frozenRef = useRef(frozen)
  const productTemplateIdRef = useRef(productTemplateId)
  const overrideProductIdRef = useRef(overrideProductId)
  draftsRef.current = drafts
  dirtyRef.current = groupDirty
  frozenRef.current = frozen
  productTemplateIdRef.current = productTemplateId
  overrideProductIdRef.current = overrideProductId

  useEffect(() => {
    if (!groupDirty) return
    if (frozen) return
    if (savingRef.current) return
    if (timer.current) clearTimeout(timer.current)

    const fire = async () => {
      savingRef.current = true
      // Fase 3 — in override mode persist ONLY this product's detached
      // overrides; inherited rows stay shared with the template.
      const overrideId =
        group === "PRODUCT" ? overrideProductIdRef.current : null
      const allDrafts = draftsRef.current
      const sent = overrideId
        ? allDrafts.filter((s) => s.origin === "detached")
        : allDrafts
      const payload = sent.map((s) => ({
        id: s.id,
        type: s.type,
        position: s.position,
        content: s.content,
        enabled: s.enabled,
        version: s.version,
        blocks: s.blocks.map((b) => ({
          id: b.id,
          type: b.type,
          position: b.position,
          content: b.content,
          enabled: b.enabled,
          version: b.version,
        })),
      }))
      try {
        const result = overrideId
          ? await saveProductSectionOverrides(overrideId, payload)
          : await saveThemeSectionGroupVersioned(
              themeId,
              group,
              payload,
              productTemplateIdRef.current,
            )
        if (result.ok) {
          mergeSavedIds(group, sent, result.data.sections)
          onSaved()
        } else if (result.reason === "conflict") {
          onConflict(group, sent, result.conflicts)
        } else {
          const message =
            "message" in result
              ? result.message
              : result.reason === "unauthorized"
                ? "Sesión expirada"
                : result.reason === "not_found"
                  ? "El recurso ya no existe"
                  : "Error al guardar"
          toast.error(message)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      } finally {
        savingRef.current = false
        if (dirtyRef.current && !frozenRef.current) {
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(fire, 250)
        }
      }
    }

    timer.current = setTimeout(fire, 250)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [themeId, group, groupDirty, frozen, mergeSavedIds, onSaved, onConflict])
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
