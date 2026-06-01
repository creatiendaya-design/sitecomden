"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, ArrowUpDown } from "lucide-react";

/**
 * Buscador + filtros de la lista de clientes. Escribe el estado en la URL
 * (searchParams) para que la página server-side haga el filtrado/paginación.
 */
export function CustomersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const tier = searchParams.get("tier") ?? "ALL";
  const sort = searchParams.get("sort") ?? "registeredAt";

  // Debounce de la búsqueda hacia la URL.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => {
      pushParams({ q: q || null, page: null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pushParams(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => {
      router.push(`/admin/clientes${sp.toString() ? `?${sp.toString()}` : ""}`);
    });
  }

  return (
    <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nombre, email, DNI, teléfono…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-9"
            data-pending={isPending ? "" : undefined}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:contents">
        <Select
          value={tier}
          onValueChange={(v) => pushParams({ tier: v === "ALL" ? null : v, page: null })}
        >
          <SelectTrigger className="h-9">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los niveles</SelectItem>
            <SelectItem value="BRONZE">🥉 Bronce</SelectItem>
            <SelectItem value="SILVER">🥈 Plata</SelectItem>
            <SelectItem value="GOLD">🥇 Oro</SelectItem>
            <SelectItem value="PLATINUM">💎 Platino</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(v) => pushParams({ sort: v, page: null })}
        >
          <SelectTrigger className="h-9">
            <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="registeredAt">Más recientes</SelectItem>
            <SelectItem value="lastPurchaseAt">Última compra</SelectItem>
            <SelectItem value="totalSpent">Total gastado</SelectItem>
            <SelectItem value="totalOrders">N° de órdenes</SelectItem>
            <SelectItem value="points">Puntos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
