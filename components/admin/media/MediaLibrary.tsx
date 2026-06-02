"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import MediaThumbnail from "./MediaThumbnail";
import MediaUploadButton from "./MediaUploadButton";
import MediaDetailDialog from "./MediaDetailDialog";
import { formatBytes } from "@/lib/media/format";
import type { MediaItem, MediaTypeFilter } from "./types";

interface MediaLibraryProps {
  items: MediaItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  search: string;
  type: MediaTypeFilter;
  canEdit: boolean;
  canDelete: boolean;
  videoProvider: "cloudflare" | "vercel";
}

const TYPE_TABS: { value: MediaTypeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "image", label: "Imágenes" },
  { value: "file", label: "Otros archivos" },
];

export default function MediaLibrary({
  items,
  totalCount,
  page,
  totalPages,
  search,
  type,
  canEdit,
  canDelete,
  videoProvider,
}: MediaLibraryProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pushQuery = (next: { search?: string; type?: MediaTypeFilter; page?: number }) => {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? searchValue;
    const nextType = next.type ?? type;
    const nextPage = next.page ?? 1;

    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextType !== "all") params.set("type", nextType);
    if (nextPage > 1) params.set("page", String(nextPage));

    const qs = params.toString();
    startTransition(() => {
      router.push(`/admin/contenido/archivos${qs ? `?${qs}` : ""}`);
    });
  };

  // Debounce the search box so we don't navigate on every keystroke.
  useEffect(() => {
    if (searchValue === search) return;
    const t = setTimeout(() => pushQuery({ search: searchValue, page: 1 }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const openItem = (item: MediaItem) => {
    setSelected(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Archivos</h1>
          <p className="text-muted-foreground">
            Todas las imágenes y archivos de tu tienda. {totalCount} en total.
          </p>
        </div>
        <MediaUploadButton videoProvider={videoProvider} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar por nombre o ALT..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => pushQuery({ type: tab.value, page: 1 })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                type === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <ImageOff className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-1 font-medium">No se encontraron archivos</p>
          <p className="text-sm text-muted-foreground">
            {search || type !== "all"
              ? "Prueba con otros filtros."
              : "Sube tu primer archivo para comenzar."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => openItem(item)}
              className="group overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
              title={item.displayName || item.filename}
            >
              <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900">
                <MediaThumbnail item={item} />
                {item.isImage && !item.alt && (
                  <Badge
                    variant="secondary"
                    className="absolute right-1.5 top-1.5 bg-amber-100 text-[10px] text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                  >
                    Sin ALT
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5 p-2">
                <p className="truncate text-xs font-medium">
                  {item.displayName || item.filename}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(item.size)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => pushQuery({ page: page - 1 })}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => pushQuery({ page: page + 1 })}
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      <MediaDetailDialog
        item={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
