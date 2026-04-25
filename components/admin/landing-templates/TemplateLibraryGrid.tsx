"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { listLandingTemplates, type TemplateRow } from "@/actions/landing-templates";
import { TemplateCard } from "./TemplateCard";
import { CreateTemplateDialog } from "./CreateTemplateDialog";

type ActiveFilter = "all" | "active" | "inactive";

interface TemplateLibraryGridProps {
  initialTemplates: TemplateRow[];
}

export function TemplateLibraryGrid({ initialTemplates }: TemplateLibraryGridProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [, startRefreshTransition] = useTransition();

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (t.category && t.category.trim()) set.add(t.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [templates]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((t) => {
      if (activeFilter === "active" && !t.active) return false;
      if (activeFilter === "inactive" && t.active) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, searchQuery, activeFilter, categoryFilter]);

  async function refreshTemplates() {
    try {
      const fresh = await listLandingTemplates();
      setTemplates(fresh);
    } catch {
      // If refresh fails, fall back to Next router refresh so server re-fetches.
      router.refresh();
    }
  }

  function handleMutate() {
    startRefreshTransition(() => {
      void refreshTemplates();
    });
  }

  function handleCreated(id: string) {
    setCreateOpen(false);
    // Optimistically add a minimal row (will be replaced by refresh).
    router.push(`/admin/landing-plantillas/${id}`);
  }

  const hasAnyTemplates = templates.length > 0;
  const showEmptyState = !hasAnyTemplates;
  const showNoResults = hasAnyTemplates && filtered.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Plantillas de Landing</h1>
            <p className="text-muted-foreground">
              Crea y gestiona plantillas reutilizables para tus landings de producto.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva plantilla
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="inline-flex rounded-md border bg-background p-1 text-sm">
          {(
            [
              { key: "all", label: "Todas" },
              { key: "active", label: "Activas" },
              { key: "inactive", label: "Inactivas" },
            ] as { key: ActiveFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveFilter(opt.key)}
              className={cn(
                "rounded-sm px-3 py-1 transition-colors",
                activeFilter === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={activeFilter === opt.key}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-between gap-2">
              <span>
                {categoryFilter ? `Categoría: ${categoryFilter}` : "Todas las categorías"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filtrar por categoría</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={categoryFilter === null}
              onCheckedChange={() => setCategoryFilter(null)}
            >
              Todas las categorías
            </DropdownMenuCheckboxItem>
            {categories.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Sin categorías aún
              </div>
            ) : (
              categories.map((cat) => (
                <DropdownMenuCheckboxItem
                  key={cat}
                  checked={categoryFilter === cat}
                  onCheckedChange={() =>
                    setCategoryFilter(categoryFilter === cat ? null : cat)
                  }
                >
                  {cat}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="text-sm text-muted-foreground md:ml-auto">
          {filtered.length} {filtered.length === 1 ? "plantilla" : "plantillas"}
        </div>
      </div>

      {/* Grid / empty states */}
      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <p className="mb-4 max-w-md text-muted-foreground">
            Aún no tienes plantillas. Crea la primera para reutilizarla en varios
            productos.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primera plantilla
          </Button>
        </div>
      ) : showNoResults ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            Ninguna plantilla coincide con los filtros actuales.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onMutate={handleMutate}
            />
          ))}
        </div>
      )}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
