"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  images: string[]; // Array de URLs (strings)
  category: {
    name: string;
    slug: string;
  } | null;
}

interface SearchBarProps {
  onResultClick?: () => void;
  autoFocus?: boolean;
}

export default function SearchBar({ onResultClick, autoFocus = false }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Auto focus si se especifica
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscar cuando cambia el query debounced
  useEffect(() => {
    async function searchProducts() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        const data = await response.json();
        setResults(data.products || []);
        setShowResults(true);
      } catch (error) {
        console.error("Error searching:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    searchProducts();
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/productos?search=${encodeURIComponent(query.trim())}`);
      setShowResults(false);
      setQuery("");
      onResultClick?.();
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const handleResultClick = () => {
    setShowResults(false);
    setQuery("");
    onResultClick?.();
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Buscar productos..."
            className="pl-9 pr-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowResults(true);
            }}
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!loading && query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-lg border bg-background shadow-lg z-50 max-h-[400px] overflow-y-auto">
          <div className="p-2">
            {results.map((product) => {
              const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
              
              return (
                <Link
                  key={product.id}
                  href={`/productos/${product.slug}`}
                  onClick={handleResultClick}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors"
                >
                  {/* Image */}
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border bg-slate-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    {product.category && (
                      <p className="text-xs text-muted-foreground">
                        {product.category.name}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      S/ {product.basePrice.toFixed(2)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Ver todos los resultados */}
          {results.length > 0 && (
            <div className="border-t p-2">
              <Link
                href={`/productos?search=${encodeURIComponent(query)}`}
                onClick={handleResultClick}
                className="block w-full rounded-lg p-2 text-center text-sm font-medium text-primary hover:bg-muted transition-colors"
              >
                Ver todos los resultados ({results.length})
              </Link>
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {showResults && results.length === 0 && debouncedQuery.length >= 2 && !loading && (
        <div className="absolute top-full mt-2 w-full rounded-lg border bg-background shadow-lg z-50 p-4">
          <p className="text-center text-sm text-muted-foreground">
            No se encontraron productos para "{debouncedQuery}"
          </p>
        </div>
      )}
    </div>
  );
}