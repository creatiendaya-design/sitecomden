"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Settings, Eye, EyeOff, Trash2, LayoutTemplate } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  deleteLandingTemplate,
  toggleLandingTemplateActive,
  type TemplateRow,
} from "@/actions/landing-templates";

interface TemplateCardProps {
  template: TemplateRow;
  onMutate: () => void;
}

function categoryEmoji(category: string | null): string {
  if (!category) return "📄";
  const normalized = category.toLowerCase();
  if (normalized.includes("ropa") || normalized.includes("moda")) return "👕";
  if (normalized.includes("zapat") || normalized.includes("calzado")) return "👟";
  if (normalized.includes("electr") || normalized.includes("tech")) return "💻";
  if (normalized.includes("hogar") || normalized.includes("casa")) return "🏠";
  if (normalized.includes("deport")) return "⚽";
  if (normalized.includes("beller") || normalized.includes("belle")) return "💄";
  if (normalized.includes("comida") || normalized.includes("aliment")) return "🍽";
  if (normalized.includes("juguet")) return "🧸";
  return "📄";
}

export function TemplateCard({ template, onMutate }: TemplateCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const editorHref = `/admin/landing-plantillas/${template.id}`;
  const metadataHref = `/admin/landing-plantillas/${template.id}/editar`;

  function openEditor() {
    router.push(editorHref);
  }

  function handleToggleActive() {
    startTransition(async () => {
      try {
        await toggleLandingTemplateActive(template.id);
        toast.success(template.active ? "Plantilla desactivada" : "Plantilla activada");
        onMutate();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "No se pudo cambiar el estado";
        toast.error(msg);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteLandingTemplate(template.id);
        toast.success("Plantilla eliminada");
        setConfirmDeleteOpen(false);
        onMutate();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "No se pudo eliminar la plantilla";
        toast.error(msg);
      }
    });
  }

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md",
          !template.active && "opacity-60",
        )}
      >
        {/* Thumbnail */}
        <button
          type="button"
          onClick={openEditor}
          className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label={`Abrir editor de ${template.name}`}
        >
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            {/* Manual upload wins; otherwise auto-derived preview from the
                first visual block; otherwise a category-emoji placeholder. */}
            {template.thumbnail || template.previewImage ? (
              <Image
                src={template.thumbnail ?? template.previewImage!}
                alt={template.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <span className="text-4xl" aria-hidden>
                    {categoryEmoji(template.category)}
                  </span>
                  <LayoutTemplate className="h-5 w-5 opacity-60" aria-hidden />
                </div>
              </div>
            )}
            {!template.active && (
              <div className="absolute left-2 top-2">
                <Badge variant="secondary">Inactiva</Badge>
              </div>
            )}
          </div>
        </button>

        {/* Menu trigger */}
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isPending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm backdrop-blur hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                aria-label="Opciones de la plantilla"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => router.push(editorHref)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar contenido
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(metadataHref)}>
                <Settings className="mr-2 h-4 w-4" />
                Editar metadata
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggleActive} disabled={isPending}>
                {template.active ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Desactivar
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Activar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmDeleteOpen(true);
                }}
                className="text-destructive focus:text-destructive"
                disabled={isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Body */}
        <button
          type="button"
          onClick={openEditor}
          className="block w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
        >
          <h3 className="truncate font-semibold text-foreground">{template.name}</h3>
          {template.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {template.description}
            </p>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground/70">
              Sin descripción
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {template.blockCount} {template.blockCount === 1 ? "bloque" : "bloques"} ·{" "}
            {template.productCount}{" "}
            {template.productCount === 1 ? "producto" : "productos"}
            {template.category ? ` · ${template.category}` : ""}
          </p>
        </button>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Los productos vinculados perderán la asociación pero conservarán los
              bloques que tenían personalizados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
