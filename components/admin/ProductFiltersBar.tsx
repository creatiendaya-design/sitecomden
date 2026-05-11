"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersBarProps {
  categories: Category[];
}

export default function ProductFiltersBar({ categories }: ProductFiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSearch = searchParams.get("search") ?? "";
  const currentCategory = searchParams.get("category") ?? "";

  function apply(search: string, category: string) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    router.push(`/admin/productos?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply(inputRef.current?.value ?? "", currentCategory);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    apply(inputRef.current?.value ?? currentSearch, e.target.value);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    router.push("/admin/productos");
  }

  const hasFilters = currentSearch || currentCategory;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          name="search"
          placeholder="Buscar por nombre o SKU…"
          className="pl-9 pr-9 h-10 sm:h-9"
          defaultValue={currentSearch}
        />
        {currentSearch && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <select
        className="rounded-md border bg-background px-3 text-sm h-10 sm:h-9 sm:w-48"
        value={currentCategory}
        onChange={handleCategoryChange}
      >
        <option value="">Todas las categorías</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="self-start sm:self-auto -mt-1 sm:mt-0"
        >
          <X className="mr-1 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
      <button type="submit" className="sr-only" aria-hidden="true">
        Buscar
      </button>
    </form>
  );
}
