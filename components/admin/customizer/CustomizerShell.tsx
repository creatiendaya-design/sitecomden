"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  Eye,
  Layers,
  Loader2,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ensureCartPageForTheme,
  ensureHomePageForTheme,
  updateThemeMetadata,
  type ThemeRow,
} from "@/actions/themes"
import type { TemplateRow } from "@/actions/landing-templates"
import type { PageRow } from "@/actions/pages"
import type { MenuRow } from "@/actions/menus"
import type { BlockInstance } from "@/lib/blocks/types"
import {
  CustomizerToolbar,
  type DeviceMode,
} from "./CustomizerToolbar"
import { CustomizerPreview } from "./CustomizerPreview"
import { EmbeddedBlocksEditor } from "./EmbeddedBlocksEditor"
import { ThemeSettingsPanel } from "./ThemeSettingsPanel"
import { RightSidebar } from "@/components/admin/page-builder/RightSidebar/RightSidebar"
import {
  buildPageTargets,
  findTarget,
} from "./page-targets"

interface Props {
  theme: ThemeRow
  landingTemplates: TemplateRow[]
  pages: PageRow[]
  menus: MenuRow[]
  sampleProductSlug: string | null
  sampleCategorySlug: string | null
  targetKey: string
  editablePageId: string | null
  editablePageTitle: string | null
  initialBlocks: BlockInstance[]
}

type LeftTab = "blocks" | "settings"

/**
 * Plan 13 — Customizer split-screen shell (Shopify-style).
 *
 * Layout:
 *  - Toolbar (top): page picker, device toggle, Save (theme settings)
 *  - Left column: tabs Bloques / Tema
 *      · Bloques: page-builder LeftSidebar (block list, drag, add) wired
 *        to the active page's blocks via EmbeddedBlocksEditor
 *      · Tema: pickers for Header menu, Footer menu, Producto template
 *  - Center column: storefront iframe with `?theme-preview=<id>` so the
 *    iframe always renders THIS theme regardless of which is active
 *  - Right column: page-builder RightSidebar — visible only when a block
 *    is selected (Shopify-style: settings appear when you pick a section)
 */
export function CustomizerShell({
  theme,
  landingTemplates,
  pages,
  menus,
  sampleProductSlug,
  sampleCategorySlug,
  targetKey,
  editablePageId,
  editablePageTitle,
  initialBlocks,
}: Props) {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // ---------- Theme settings draft (manual save) ----------
  const [draft, setDraft] = useState({
    headerMenuId: theme.headerMenuId,
    footerMenuId: theme.footerMenuId,
    defaultProductLandingTemplateId: theme.defaultProductLandingTemplateId,
  })
  const [pendingSave, setPendingSave] = useState(false)

  const isThemeDirty =
    draft.headerMenuId !== theme.headerMenuId ||
    draft.footerMenuId !== theme.footerMenuId ||
    draft.defaultProductLandingTemplateId !==
      theme.defaultProductLandingTemplateId

  // ---------- Page-type selector ----------
  const targets = useMemo(
    () =>
      buildPageTargets({
        pages,
        sampleProductSlug,
        sampleCategorySlug,
      }),
    [pages, sampleProductSlug, sampleCategorySlug],
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

  // ---------- Save flow (theme settings only — blocks autosave) ----------
  const handleSave = useCallback(async () => {
    if (pendingSave || !isThemeDirty) return
    setPendingSave(true)
    try {
      await updateThemeMetadata(theme.id, draft)
      toast.success("Tema guardado")
      iframeRef.current?.contentWindow?.location.reload()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setPendingSave(false)
    }
  }, [draft, isThemeDirty, pendingSave, router, theme.id])

  const handleExit = useCallback(() => {
    if (isThemeDirty) {
      const confirmed = window.confirm(
        "Tenés cambios del tema sin guardar. ¿Salir igual?",
      )
      if (!confirmed) return
    }
    router.push("/admin/personalizar/temas")
  }, [isThemeDirty, router])

  // Iframe refresh on block autosave
  const handleBlocksSaved = useCallback(() => {
    iframeRef.current?.contentWindow?.location.reload()
  }, [])

  // ---------- Auto-create home/cart page when admin lands on an empty target ----------
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

  // ---------- Left-panel tab ----------
  const [leftTab, setLeftTab] = useState<LeftTab>("blocks")

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <CustomizerToolbar
        themeName={theme.name}
        targets={targets}
        currentTargetKey={targetKey}
        onTargetChange={handleTargetChange}
        device={device}
        onDeviceChange={setDevice}
        isDirty={isThemeDirty}
        pending={pendingSave}
        onSave={handleSave}
        onExit={handleExit}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left column: tabs + content */}
        <div className="w-[340px] shrink-0 flex flex-col bg-card border-r overflow-hidden">
          <CustomizerHeaderRow
            themeName={theme.name}
            onExit={handleExit}
          />
          <LeftTabs
            current={leftTab}
            onChange={setLeftTab}
            targetLabel={currentTarget?.label ?? "Tienda"}
          />

          {leftTab === "blocks" && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {editablePageId ? (
                <EmbeddedBlocksEditor
                  pageId={editablePageId}
                  initialBlocks={initialBlocks}
                  onSaved={handleBlocksSaved}
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
          )}

          {leftTab === "settings" && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ThemeSettingsPanel
                draft={draft}
                onDraftChange={setDraft}
                landingTemplates={landingTemplates}
                menus={menus}
              />
            </div>
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

        {/* Right column: block settings (only meaningful in Bloques tab) */}
        {leftTab === "blocks" && editablePageId && (
          <RightSidebar
            context={{
              type: "page",
              page: {
                id: editablePageId,
                slug: editablePageTitle ?? "page",
                title: editablePageTitle ?? "Página",
              },
            }}
          />
        )}
      </div>
    </div>
  )
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

interface LeftTabsProps {
  current: LeftTab
  onChange: (tab: LeftTab) => void
  targetLabel: string
}

function LeftTabs({ current, onChange, targetLabel }: LeftTabsProps) {
  const tabs: { key: LeftTab; label: string; icon: typeof Layers }[] = [
    { key: "blocks", label: "Bloques", icon: Layers },
    { key: "settings", label: "Tema", icon: Settings },
  ]
  return (
    <div className="border-b">
      <div className="flex">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = current === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>
      {current === "blocks" && (
        <div className="px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-t bg-muted/30">
          Editando: <span className="font-semibold normal-case text-foreground">{targetLabel}</span>
        </div>
      )}
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
