"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowLeft,
  ChevronDown,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { saveMenuItems, type MenuItemRow } from "@/actions/menus"
import { MenuItemSheet, type DraftItem } from "./MenuItemSheet"
import { MAX_MENU_DEPTH } from "@/lib/menus/constants"

interface PageOption {
  id: string
  title: string
  slug: string
}
interface CategoryOption {
  id: string
  name: string
  slug: string
}

interface Props {
  menu: { id: string; title: string; slug: string }
  initialItems: MenuItemRow[]
  pages: PageOption[]
  categories: CategoryOption[]
}

const LINK_TYPE_LABEL: Record<string, string> = {
  HOME: "Inicio",
  PRODUCTS_INDEX: "Todos los productos",
  COLLECTIONS_INDEX: "Todas las categorías",
  PAGE: "Página",
  PRODUCT: "Producto",
  CATEGORY: "Categoría",
  EXTERNAL_URL: "URL externa",
}

function newId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function MenuTreeEditor({
  menu,
  initialItems,
  pages,
  categories,
}: Props) {
  const router = useRouter()
  const [items, setItems] = useState<DraftItem[]>(() =>
    initialItems.map((i) => ({ ...i })),
  )
  const originalRef = useRef(JSON.stringify(initialItems))
  const dirty = useMemo(
    () => JSON.stringify(items) !== originalRef.current,
    [items],
  )

  const [editing, setEditing] = useState<DraftItem | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  // Local UI state — collapse/expand per item id (not persisted).
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.parentId === null).map((i) => i.id)),
  )
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const expandAll = () =>
    setExpanded(new Set(items.map((i) => i.id)))
  const collapseAll = () => setExpanded(new Set())

  const roots = items
    .filter((i) => i.parentId === null)
    .sort((a, b) => a.position - b.position)

  const childrenOf = (parentId: string): DraftItem[] =>
    items
      .filter((i) => i.parentId === parentId)
      .sort((a, b) => a.position - b.position)

  const addRoot = () => {
    setItems((prev) => [
      ...prev,
      {
        id: newId(),
        parentId: null,
        position: roots.length,
        label: "Nuevo item",
        linkType: "HOME",
        targetId: null,
        externalUrl: null,
        openInNewTab: false,
      },
    ])
  }

  const addChild = (parentId: string) => {
    const siblings = items.filter((i) => i.parentId === parentId)
    setItems((prev) => [
      ...prev,
      {
        id: newId(),
        parentId,
        position: siblings.length,
        label: "Nuevo subitem",
        linkType: "HOME",
        targetId: null,
        externalUrl: null,
        openInNewTab: false,
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id && i.parentId !== id))
    setConfirmDeleteId(null)
  }

  const updateItem = (next: DraftItem) => {
    setItems((prev) => prev.map((i) => (i.id === next.id ? next : i)))
    setEditing(null)
  }

  const reorderRoots = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIdx = roots.findIndex((i) => i.id === active.id)
    const toIdx = roots.findIndex((i) => i.id === over.id)
    if (fromIdx < 0 || toIdx < 0) return
    const moved = arrayMove(roots, fromIdx, toIdx).map((it, idx) => ({
      ...it,
      position: idx,
    }))
    setItems((prev) => [...moved, ...prev.filter((i) => i.parentId !== null)])
  }

  const reorderChildren = (parentId: string) => (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const siblings = childrenOf(parentId)
    const fromIdx = siblings.findIndex((i) => i.id === active.id)
    const toIdx = siblings.findIndex((i) => i.id === over.id)
    if (fromIdx < 0 || toIdx < 0) return
    const moved = arrayMove(siblings, fromIdx, toIdx).map((it, idx) => ({
      ...it,
      position: idx,
    }))
    setItems((prev) => [
      ...prev.filter((i) => i.parentId !== parentId),
      ...moved,
    ])
  }

  const handleSave = () => {
    if (!dirty || pending) return
    startTransition(async () => {
      try {
        await saveMenuItems(
          menu.id,
          items.map((i) => ({
            id: i.id,
            parentId: i.parentId,
            position: i.position,
            label: i.label,
            linkType: i.linkType,
            targetId: i.targetId,
            externalUrl: i.externalUrl,
            openInNewTab: i.openInNewTab,
          })),
        )
        toast.success("Menú guardado")
        // Reset dirty tracking by replacing the original snapshot.
        originalRef.current = JSON.stringify(items)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  const handleDiscard = () => {
    setItems(initialItems.map((i) => ({ ...i })))
    originalRef.current = JSON.stringify(initialItems)
  }

  return (
    <div className="h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="h-14 flex items-center gap-3 px-4 border-b bg-background shrink-0">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/menus" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-medium text-sm truncate leading-tight">{menu.title}</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Identificador:{" "}
            <code className="text-[11px]">{menu.slug}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={expanded.size > 0 ? collapseAll : expandAll}
            className="text-xs"
          >
            {expanded.size > 0 ? "Colapsar todo" : "Expandir todo"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            disabled={!dirty || pending}
          >
            Descartar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {roots.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Este menú está vacío.
              </p>
              <Button onClick={addRoot}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar primer item
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={reorderRoots}
            >
              <SortableContext
                items={roots.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {roots.map((root) => {
                  const children = childrenOf(root.id)
                  const isExpanded = expanded.has(root.id)
                  return (
                    <SortableMenuItem
                      key={root.id}
                      item={root}
                      depth={0}
                      hasChildren={children.length > 0}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleExpand(root.id)}
                      onEdit={() => setEditing(root)}
                      onDelete={() => setConfirmDeleteId(root.id)}
                      onAddChild={() => addChild(root.id)}
                    >
                      {isExpanded && (
                        <NestedChildren
                          parentId={root.id}
                          items={children}
                          childrenOf={childrenOf}
                          onReorder={reorderChildren}
                          sensors={sensors}
                          onEdit={(it) => setEditing(it)}
                          onDelete={(id) => setConfirmDeleteId(id)}
                          onAddChild={(pid) => addChild(pid)}
                          depth={1}
                          expanded={expanded}
                          toggleExpand={toggleExpand}
                        />
                      )}
                    </SortableMenuItem>
                  )
                })}
              </SortableContext>
            </DndContext>
          )}

          {roots.length > 0 && (
            <Button variant="outline" className="w-full" onClick={addRoot}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar item
            </Button>
          )}
        </div>
      </main>

      {editing && (
        <MenuItemSheet
          item={editing}
          pages={pages}
          categories={categories}
          onSave={updateItem}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar item</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción también elimina los subitems si los tiene. Recordá
              guardar para que los cambios persistan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && removeItem(confirmDeleteId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SortableMenuItem({
  item,
  depth,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddChild,
  children,
}: {
  item: DraftItem
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onAddChild?: () => void
  children?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const levelLabel = `L${depth + 1}`
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="rounded-lg border bg-card group/item"
    >
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground"
          aria-label="Arrastrar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isExpanded ? "Colapsar" : "Expandir"}
            aria-expanded={isExpanded}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                isExpanded ? "rotate-0" : "-rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-3.5" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.label}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-[10px] font-normal h-4 px-1">
              {levelLabel}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-normal h-4 px-1.5">
              {LINK_TYPE_LABEL[item.linkType] ?? item.linkType}
            </Badge>
          </p>
        </div>
        {onAddChild && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover/item:opacity-100 transition-opacity"
            onClick={onAddChild}
            aria-label="Agregar subitem"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {children}
    </div>
  )
}

function NestedChildren({
  parentId,
  items,
  childrenOf,
  onReorder,
  sensors,
  onEdit,
  onDelete,
  onAddChild,
  depth,
  expanded,
  toggleExpand,
}: {
  parentId: string
  items: DraftItem[]
  childrenOf: (id: string) => DraftItem[]
  onReorder: (parentId: string) => (e: DragEndEvent) => void
  sensors: ReturnType<typeof useSensors>
  onEdit: (item: DraftItem) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  depth: number
  expanded: Set<string>
  toggleExpand: (id: string) => void
}) {
  const canAddDeeper = depth < MAX_MENU_DEPTH - 1
  const indent = depth === 1 ? "pl-6" : "pl-12"
  const bg = depth === 1 ? "bg-muted/30" : "bg-muted/50"
  const borderColor = depth === 1 ? "border-primary/30" : "border-primary/50"

  return (
    <div className={`border-t ${indent} pr-3 pb-3 pt-2 space-y-2 ${bg} border-l-2 ${borderColor}`}>
      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onReorder(parentId)}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((child) => {
              const grandchildren = childrenOf(child.id)
              const isExpanded = expanded.has(child.id)
              return (
                <SortableMenuItem
                  key={child.id}
                  item={child}
                  depth={depth}
                  hasChildren={grandchildren.length > 0}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleExpand(child.id)}
                  onEdit={() => onEdit(child)}
                  onDelete={() => onDelete(child.id)}
                  onAddChild={
                    canAddDeeper ? () => onAddChild(child.id) : undefined
                  }
                >
                  {isExpanded && canAddDeeper && (
                    <NestedChildren
                      parentId={child.id}
                      items={grandchildren}
                      childrenOf={childrenOf}
                      onReorder={onReorder}
                      sensors={sensors}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddChild={onAddChild}
                      depth={depth + 1}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                    />
                  )}
                </SortableMenuItem>
              )
            })}
          </SortableContext>
        </DndContext>
      ) : null}
      {canAddDeeper && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onAddChild(parentId)}
        >
          <Plus className="mr-1.5 h-3 w-3" />
          Agregar subitem
        </Button>
      )}
    </div>
  )
}
