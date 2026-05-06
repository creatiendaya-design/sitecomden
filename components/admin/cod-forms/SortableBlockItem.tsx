"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Type,
  ShoppingCart,
  Truck,
  Receipt,
  CheckCircle,
  User,
  Phone,
  Mail,
  IdCard,
  MapPin,
  Building,
  Map,
  StickyNote,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CodFormBlock, CodFormBlockType } from "@/lib/cod-forms/types"

const ICONS: Record<CodFormBlockType, LucideIcon> = {
  HEADER: Type,
  CART_ITEMS: ShoppingCart,
  SHIPPING_OPTIONS: Truck,
  ORDER_SUMMARY: Receipt,
  SUBMIT_BUTTON: CheckCircle,
  FIELD_NAME: User,
  FIELD_PHONE: Phone,
  FIELD_EMAIL: Mail,
  FIELD_DNI: IdCard,
  FIELD_ADDRESS: MapPin,
  FIELD_ADDRESS_2: MapPin,
  FIELD_PROVINCE: Map,
  FIELD_CITY: Building,
  FIELD_REFERENCE: StickyNote,
  FIELD_NOTES: StickyNote,
}

const LABELS: Record<CodFormBlockType, string> = {
  HEADER: "Encabezado",
  CART_ITEMS: "Contenido del carrito",
  SHIPPING_OPTIONS: "Opciones de envío",
  ORDER_SUMMARY: "Resumen del pedido",
  SUBMIT_BUTTON: "Botón de compra",
  FIELD_NAME: "Nombre",
  FIELD_PHONE: "Teléfono",
  FIELD_EMAIL: "Email",
  FIELD_DNI: "DNI",
  FIELD_ADDRESS: "Dirección",
  FIELD_ADDRESS_2: "Dirección 2",
  FIELD_PROVINCE: "Provincia",
  FIELD_CITY: "Distrito",
  FIELD_REFERENCE: "Referencia",
  FIELD_NOTES: "Notas",
}

export function blockTypeLabel(t: CodFormBlockType): string {
  return LABELS[t]
}

export default function SortableBlockItem({
  block,
  onEdit,
  onToggleVisible,
  onDelete,
}: {
  block: CodFormBlock
  onEdit: () => void
  onToggleVisible: () => void
  onDelete: () => void
}) {
  const Icon = ICONS[block.type]
  const isSubmit = block.type === "SUBMIT_BUTTON"
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border rounded text-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Arrastrar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate">{LABELS[block.type]}</span>
      {!isSubmit && (
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onToggleVisible}>
        {block.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={isSubmit}
        aria-label="Eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
