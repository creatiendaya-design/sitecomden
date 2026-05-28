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
  useThemeSectionsStore,
  type SectionDraft,
  type BlockDraft,
} from "./theme-sections-store"
import { AddSectionPanel } from "./AddSectionPanel"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"
import type {
  ThemeSectionCatalog,
  ThemeSectionGroup,
} from "@/lib/theme-sections/types"

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

  function handleAdd(type: string) {
    const def = getThemeSectionDefinition(type)
    if (!def) return
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
          {def?.label ?? section.type}
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
                `¿Eliminar la sección "${def?.label ?? section.type}"?`,
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
      <div className="flex flex-wrap gap-2 px-3 py-2">
        {def?.acceptedBlockTypes?.map((bt) => (
          <Button
            key={bt.type}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              addBlock(section.id, bt.type, bt.defaultContent as Record<string, unknown>)
            }
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {bt.label}
          </Button>
        ))}
      </div>
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
