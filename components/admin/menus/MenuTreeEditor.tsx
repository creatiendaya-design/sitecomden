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
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
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
        <h1 className="font-medium text-sm truncate flex-1">{menu.title}</h1>
        <div className="flex items-center gap-2">
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
                {roots.map((root) => (
                  <SortableMenuItem
                    key={root.id}
                    item={root}
                    onEdit={() => setEditing(root)}
                    onDelete={() => setConfirmDeleteId(root.id)}
                  >
                    <NestedChildren
                      parentId={root.id}
                      items={childrenOf(root.id)}
                      onReorder={reorderChildren(root.id)}
                      sensors={sensors}
                      onEdit={(it) => setEditing(it)}
                      onDelete={(id) => setConfirmDeleteId(id)}
                      onAddChild={() => addChild(root.id)}
                    />
                  </SortableMenuItem>
                ))}
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
  onEdit,
  onDelete,
  children,
}: {
  item: DraftItem
  onEdit: () => void
  onDelete: () => void
  children?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="rounded-lg border bg-card"
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.label}</p>
          <p className="text-[11px] text-muted-foreground">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {LINK_TYPE_LABEL[item.linkType] ?? item.linkType}
            </Badge>
          </p>
        </div>
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
  items,
  onReorder,
  sensors,
  onEdit,
  onDelete,
  onAddChild,
}: {
  parentId: string
  items: DraftItem[]
  onReorder: (e: DragEndEvent) => void
  sensors: ReturnType<typeof useSensors>
  onEdit: (item: DraftItem) => void
  onDelete: (id: string) => void
  onAddChild: () => void
}) {
  return (
    <div className="border-t pl-6 pr-3 pb-3 pt-2 space-y-2 bg-muted/30">
      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onReorder}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((child) => (
              <SortableMenuItem
                key={child.id}
                item={child}
                onEdit={() => onEdit(child)}
                onDelete={() => onDelete(child.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={onAddChild}
      >
        <Plus className="mr-1.5 h-3 w-3" />
        Agregar subitem
      </Button>
    </div>
  )
}
