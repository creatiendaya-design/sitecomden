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
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          name="search"
          placeholder="Buscar por nombre o SKU..."
          className="pl-9 pr-9"
          defaultValue={currentSearch}
        />
        {currentSearch && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <select
        className="rounded-md border px-4 py-2 text-sm sm:w-48"
        value={currentCategory}
        onChange={handleCategoryChange}
      >
        <option value="">Todas las categorías</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="default">
        Buscar
      </Button>
      {hasFilters && (
        <Button type="button" variant="ghost" onClick={handleClear}>
          Limpiar
        </Button>
      )}
    </form>
  );
}
