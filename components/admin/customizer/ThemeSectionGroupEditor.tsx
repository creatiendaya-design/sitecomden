"use client"

import { useMemo } from "react"
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useThemeSectionsStore,
  type SectionDraft,
  type BlockDraft,
} from "./theme-sections-store"
import { AddSectionPanel } from "./AddSectionPanel"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { registerExistingBlocks } from "@/lib/blocks/register-existing-blocks"
import type {
  ThemeSectionCatalog,
  ThemeSectionGroup,
} from "@/lib/theme-sections/types"
import type { LandingBlockType } from "@/lib/blocks/types"

// Module-level seed of the page-builder block registry. The PRODUCT-template
// editor exposes universal blocks via the LEGACY_BLOCK adapter; those
// definitions live in a side-effect module that EmbeddedBlocksEditor seeds
// via useEffect when it mounts. The PRODUCT path of the customizer bypasses
// that component, so we seed at import time here. `registerExistingBlocks`
// is idempotent — guarded by an internal `registered` flag — so duplicate
// calls across module boundaries are a no-op.
registerExistingBlocks()

interface Props {
  group: ThemeSectionGroup
  catalog: ThemeSectionCatalog
}

export function ThemeSectionGroupEditor({ group, catalog }: Props) {
  const sections = useThemeSectionsStore((s) =>
    group === "HEADER" ? s.header : group === "FOOTER" ? s.footer : s.product,
  )
  const reorderSections = useThemeSectionsStore((s) => s.reorderSections)
  const addSection = useThemeSectionsStore((s) => s.addSection)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of sections) map[s.type] = (map[s.type] ?? 0) + 1
    return map
  }, [sections])

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = sections.findIndex((s) => s.id === active.id)
    const newIdx = sections.findIndex((s) => s.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(sections, oldIdx, newIdx).map((s) => s.id)
    reorderSections(group, reordered)
  }

  function handleAdd(type: string, legacyBlockType?: string) {
    const def = getThemeSectionDefinition(type)
    if (!def) return

    // LEGACY_BLOCK path — the admin picked a universal page-builder block
    // from the "Bloques" arm of the dropdown. We seed the section's
    // content with the block's defaultContent (data/style/media zones)
    // plus a `blockType` discriminator that the storefront dispatcher and
    // right sidebar use to look the block back up in its own registry.
    if (type === "LEGACY_BLOCK" && legacyBlockType) {
      const blockDef = getBlockDefinition(legacyBlockType as LandingBlockType)
      if (!blockDef) return
      const seedContent: Record<string, unknown> = {
        blockType: legacyBlockType,
        data: blockDef.defaultContent.data,
        style: blockDef.defaultContent.style,
        media: blockDef.defaultContent.media,
      }
      addSection(group, type, seedContent)
      return
    }

    addSection(
      group,
      type,
      def.defaultContent as Record<string, unknown>,
      def.defaultBlocks?.map((b) => ({
        type: b.type,
        content: b.content as Record<string, unknown>,
      })),
    )
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableSectionRow key={section.id} section={section} />
          ))}
        </SortableContext>
      </DndContext>
      <AddSectionPanel
        group={group}
        catalog={catalog}
        counts={counts}
        onAdd={handleAdd}
      />
    </div>
  )
}

function SortableSectionRow({ section }: { section: SectionDraft }) {
  // Plan 17 — PRODUCT_MAIN is the obligatory backbone of the product
  // template. We lock it against drag-reorder and deletion so the admin
  // can't end up with a product page that has no main section at all.
  const isLocked = section.type === "PRODUCT_MAIN"

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id, disabled: isLocked })

  const def = getThemeSectionDefinition(section.type)
  const select = useThemeSectionsStore((s) => s.select)
  const selected = useThemeSectionsStore((s) => s.selected)
  const toggleEnabled = useThemeSectionsStore((s) => s.toggleSectionEnabled)
  const removeSection = useThemeSectionsStore((s) => s.removeSection)
  const isSelected =
    selected?.kind === "section" && selected.sectionId === section.id

  // LEGACY_BLOCK adapter rows display the wrapped block's label/icon
  // instead of the generic "Bloque" so the list looks like a unified
  // Shopify-style sections list (HERO / FRIENDLY / Testimonios / ...).
  const legacyBlockType =
    section.type === "LEGACY_BLOCK"
      ? (section.content.blockType as LandingBlockType | undefined)
      : undefined
  const legacyBlockDef = legacyBlockType
    ? getBlockDefinition(legacyBlockType)
    : undefined
  const displayLabel = legacyBlockDef?.label ?? def?.label ?? section.type

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const acceptsBlocks =
    def?.acceptedBlockTypes && def.acceptedBlockTypes.length > 0

  return (
    <div ref={setNodeRef} style={style} className="border-b">
      <div
        className={`flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer ${
          isSelected ? "bg-muted/50" : "hover:bg-muted/30"
        } ${section.enabled ? "" : "opacity-60"}`}
        onClick={() => select({ kind: "section", sectionId: section.id })}
      >
        <button
          {...attributes}
          {...listeners}
          disabled={isLocked}
          className={`text-muted-foreground ${
            isLocked
              ? "opacity-30 cursor-not-allowed"
              : "hover:text-foreground cursor-grab"
          }`}
          aria-label={isLocked ? "Sección fija" : "Arrastrar"}
          title={isLocked ? "La sección principal no se puede mover" : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex-1 text-sm truncate">
          {displayLabel}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleEnabled(section.id)
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label={section.enabled ? "Ocultar" : "Mostrar"}
        >
          {section.enabled ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          disabled={isLocked}
          onClick={(e) => {
            e.stopPropagation()
            if (isLocked) return
            if (
              window.confirm(
                `¿Eliminar la sección "${displayLabel}"?`,
              )
            ) {
              removeSection(section.id)
            }
          }}
          className={`text-muted-foreground ${
            isLocked ? "opacity-30 cursor-not-allowed" : "hover:text-destructive"
          }`}
          aria-label="Eliminar"
          title={
            isLocked
              ? "La sección principal no se puede eliminar"
              : undefined
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {acceptsBlocks && <SectionBlocksList section={section} />}
    </div>
  )
}

function SectionBlocksList({ section }: { section: SectionDraft }) {
  const reorderBlocks = useThemeSectionsStore((s) => s.reorderBlocks)
  const addBlock = useThemeSectionsStore((s) => s.addBlock)
  const def = getThemeSectionDefinition(section.type)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = section.blocks.findIndex((b) => b.id === active.id)
    const newIdx = section.blocks.findIndex((b) => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(section.blocks, oldIdx, newIdx).map((b) => b.id)
    reorderBlocks(section.id, reordered)
  }

  // Plan 17 — Shopify-style: hide the "+ Agregar" button for any sub-block
  // type that has already reached `maxPerSection`. Keeps the add panel
  // clean and prevents users from creating duplicates the server would
  // otherwise have to reject. Types without `maxPerSection` remain
  // available indefinitely.
  const blockCounts: Record<string, number> = {}
  for (const b of section.blocks) {
    blockCounts[b.type] = (blockCounts[b.type] ?? 0) + 1
  }
  const availableBlockTypes = (def?.acceptedBlockTypes ?? []).filter((bt) => {
    if (bt.maxPerSection === undefined) return true
    return (blockCounts[bt.type] ?? 0) < bt.maxPerSection
  })

  return (
    <div className="pl-6 bg-muted/20">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={section.blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {section.blocks.map((block) => (
            <SortableBlockRow
              key={block.id}
              parentSectionType={section.type}
              sectionId={section.id}
              block={block}
            />
          ))}
        </SortableContext>
      </DndContext>
      {availableBlockTypes.length > 0 && (
        <div className="px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-full justify-start text-xs text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Agregar bloque
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {availableBlockTypes.map((bt) => {
                const Icon = bt.icon
                return (
                  <DropdownMenuItem
                    key={bt.type}
                    onSelect={() =>
                      addBlock(
                        section.id,
                        bt.type,
                        bt.defaultContent as Record<string, unknown>,
                      )
                    }
                  >
                    <Icon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <span className="text-sm">{bt.label}</span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

interface SortableBlockRowProps {
  parentSectionType: string
  sectionId: string
  block: BlockDraft
}

function SortableBlockRow({
  parentSectionType,
  sectionId,
  block,
}: SortableBlockRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.id })
  const select = useThemeSectionsStore((s) => s.select)
  const selected = useThemeSectionsStore((s) => s.selected)
  const removeBlock = useThemeSectionsStore((s) => s.removeBlock)
  const toggleEnabled = useThemeSectionsStore((s) => s.toggleBlockEnabled)
  const isSelected =
    selected?.kind === "section-block" && selected.blockId === block.id

  const def = getSectionBlockDefinition(parentSectionType, block.type)

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
        isSelected ? "bg-muted/60" : "hover:bg-muted/40"
      } ${block.enabled ? "" : "opacity-60"}`}
      onClick={() =>
        select({ kind: "section-block", sectionId, blockId: block.id })
      }
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab"
        aria-label="Arrastrar"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="flex-1 text-xs truncate">
        {def?.block.label ?? block.type}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleEnabled(block.id)
        }}
        className="text-muted-foreground hover:text-foreground"
        aria-label={block.enabled ? "Ocultar" : "Mostrar"}
      >
        {block.enabled ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          removeBlock(block.id)
        }}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Eliminar"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}
