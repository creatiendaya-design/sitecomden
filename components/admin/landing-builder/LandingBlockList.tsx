"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AddBlockMenu from "./AddBlockMenu";
import HeroBlockForm from "./block-forms/HeroBlockForm";
import GalleryBlockForm from "./block-forms/GalleryBlockForm";
import TestimonialsBlockForm from "./block-forms/TestimonialsBlockForm";
import VideoBlockForm from "./block-forms/VideoBlockForm";
import ColorsBlockForm from "./block-forms/ColorsBlockForm";
import TickerBlockForm from "./block-forms/TickerBlockForm";
import {
  createLandingBlock,
  updateLandingBlock,
  deleteLandingBlock,
  reorderLandingBlocks,
} from "@/actions/landing-blocks";
import {
  BLOCK_TYPE_LABELS,
  BLOCK_DEFAULT_CONTENT,
  type LandingBlock,
  type LandingBlockType,
  type BlockContent,
} from "@/lib/types/landing-blocks";

const BLOCK_COLORS: Record<LandingBlockType, string> = {
  HERO: "border-l-purple-500",
  GALLERY: "border-l-blue-500", TESTIMONIALS: "border-l-blue-400",
  VIDEO: "border-l-red-500", COLORS: "border-l-yellow-500", TICKER: "border-l-amber-500",
  TRUST_BADGES: "border-l-teal-500",
  RICH_TEXT: "border-l-indigo-500",
  FAQ: "border-l-sky-500",
  IMAGE_TEXT: "border-l-fuchsia-500",
  ICON_TEXT: "border-l-cyan-500",
  RELATED_PRODUCTS: "border-l-orange-500",
  PRODUCT_GRID: "border-l-emerald-500",
  COMPARISON: "border-l-rose-500",
  FRIENDLY: "border-l-red-600",
  CAROUSEL: "border-l-pink-500",
  BANNER_TOP_TEXT: "border-l-violet-500",
  PORCENTAJE_UNO: "border-l-slate-500",
};

interface SortableBlockItemProps {
  block: LandingBlock;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onContentChange: (content: BlockContent) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function SortableBlockItem({
  block, isEditing, onToggleEdit, onDelete, onContentChange,
  onMoveUp, onMoveDown,
}: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderForm = () => {
    const c = block.content as any;
    switch (block.type) {
      case "HERO":         return <HeroBlockForm content={c} onChange={onContentChange} />;
      case "GALLERY":      return <GalleryBlockForm content={c} onChange={onContentChange} />;
      case "TESTIMONIALS": return <TestimonialsBlockForm content={c} onChange={onContentChange} />;
      case "VIDEO":        return <VideoBlockForm content={c} onChange={onContentChange} />;
      case "COLORS":       return <ColorsBlockForm content={c} onChange={onContentChange} />;
      case "TICKER":       return <TickerBlockForm content={c} onChange={onContentChange} />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`border rounded-lg bg-card border-l-4 ${BLOCK_COLORS[block.type]}`}>
      <div className="flex items-center gap-2 p-3">
        {/* Desktop: drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="hidden sm:flex cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        {/* Mobile: up/down arrows */}
        <div className="flex sm:hidden flex-col gap-0.5">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} type="button">
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} type="button">
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{BLOCK_TYPE_LABELS[block.type]}</div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleEdit} type="button">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} type="button">
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      {isEditing && (
        <div className="px-3 pb-3 border-t pt-3">
          {renderForm()}
          <Button size="sm" className="mt-3 w-full" onClick={onToggleEdit} type="button">
            Guardar bloque
          </Button>
        </div>
      )}
    </div>
  );
}

interface LandingBlockListProps {
  productId: string;
  initialBlocks: LandingBlock[];
}

export default function LandingBlockList({ productId, initialBlocks }: LandingBlockListProps) {
  const [blocks, setBlocks] = useState<LandingBlock[]>(
    [...initialBlocks].sort((a, b) => a.position - b.position)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<Record<string, BlockContent>>({});
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
    setBlocks(reordered);

    startTransition(async () => {
      await reorderLandingBlocks(reordered.map(({ id, position }) => ({ id, position })));
    });
  };

  const handleAdd = (type: LandingBlockType) => {
    startTransition(async () => {
      const defaultContent = BLOCK_DEFAULT_CONTENT[type];
      const result = await createLandingBlock(productId, type, defaultContent);
      if (result.success) {
        const newBlock: LandingBlock = {
          ...result.block,
          type: result.block.type as LandingBlockType,
          content: defaultContent,
          createdAt: new Date(result.block.createdAt),
          updatedAt: new Date(result.block.updatedAt),
        };
        setBlocks((prev) => [...prev, newBlock]);
        setEditingId(newBlock.id);
        toast.success("Sección agregada");
      }
    });
  };

  const handleDelete = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    startTransition(async () => {
      await deleteLandingBlock(id);
      toast.success("Sección eliminada");
    });
  };

  const handleSave = (id: string) => {
    const content = pendingContent[id];
    if (!content) { setEditingId(null); return; }

    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
    setEditingId(null);

    startTransition(async () => {
      const result = await updateLandingBlock(id, content);
      if (result.success) toast.success("Sección guardada");
    });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const reordered = arrayMove(blocks, index, newIndex).map((b, i) => ({ ...b, position: i }));
    setBlocks(reordered);
    startTransition(async () => {
      await reorderLandingBlocks(reordered.map(({ id, position }) => ({ id, position })));
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-medium">Secciones de la Landing</p>
          <p className="text-xs text-muted-foreground hidden sm:block">Arrastra para reordenar. Haz clic en el lápiz para editar.</p>
          <p className="text-xs text-muted-foreground sm:hidden">Usa las flechas para reordenar. Haz clic en el lápiz para editar.</p>
        </div>
        <AddBlockMenu onAdd={handleAdd} disabled={isPending} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <SortableBlockItem
                key={block.id}
                block={
                  editingId === block.id && pendingContent[block.id]
                    ? { ...block, content: pendingContent[block.id] }
                    : block
                }
                isEditing={editingId === block.id}
                onToggleEdit={() => {
                  if (editingId === block.id) {
                    handleSave(block.id);
                  } else {
                    setEditingId(block.id);
                    setPendingContent((prev) => ({ ...prev, [block.id]: block.content }));
                  }
                }}
                onDelete={() => handleDelete(block.id)}
                onContentChange={(content) =>
                  setPendingContent((prev) => ({ ...prev, [block.id]: content }))
                }
                onMoveUp={() => moveBlock(index, "up")}
                onMoveDown={() => moveBlock(index, "down")}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
          Sin secciones. Haz clic en &quot;Agregar sección&quot; para comenzar.
        </div>
      )}
    </div>
  );
}
