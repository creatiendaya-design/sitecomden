"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/i18n/format";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Pencil, Layers, DollarSign, Clock, Truck, MapPin } from "lucide-react";

interface RateRow {
  id: string;
  name: string;
  category: string | null;
  baseCost: number;
  estimatedDays: string | null;
  carrier: string | null;
  freeShippingMin: number | null;
  active: boolean;
  zoneId: string;
  zoneName: string;
  zoneActive: boolean;
}

interface Props {
  rates: RateRow[];
}

export function GlobalRatesTable({ rates }: Props) {
  const [query, setQuery] = useState("");
  const [zoneId, setZoneId] = useState<string>("all");
  const [carrier, setCarrier] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const zones = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rates) map.set(r.zoneId, r.zoneName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rates]);

  const carriers = useMemo(() => {
    const set = new Set<string>();
    for (const r of rates) if (r.carrier) set.add(r.carrier);
    return Array.from(set).sort();
  }, [rates]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rates.filter((r) => {
      if (zoneId !== "all" && r.zoneId !== zoneId) return false;
      if (carrier !== "all" && r.carrier !== carrier) return false;
      if (statusFilter === "active" && (!r.active || !r.zoneActive)) return false;
      if (statusFilter === "inactive" && r.active && r.zoneActive) return false;
      if (q) {
        const haystack = [
          r.name,
          r.zoneName,
          r.category ?? "",
          r.carrier ?? "",
          r.estimatedDays ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rates, query, zoneId, carrier, statusFilter]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar tarifa, zona, courier..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <Select value={zoneId} onValueChange={setZoneId}>
            <SelectTrigger className="h-9 sm:w-48 text-xs sm:text-sm">
              <SelectValue placeholder="Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las zonas</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {carriers.length > 0 && (
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger className="h-9 sm:w-44 text-xs sm:text-sm">
                <SelectValue placeholder="Courier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los couriers</SelectItem>
                {carriers.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 sm:w-40 text-xs sm:text-sm col-span-2 sm:col-span-1">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground">
        {filtered.length} de {rates.length} tarifas
      </p>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-md border py-10 sm:py-12 text-center px-4">
          <Layers className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1 text-sm sm:text-base">Sin tarifas</p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {rates.length === 0
              ? "Aún no hay tarifas configuradas. Empieza creando una zona."
              : "Ningún resultado coincide con los filtros actuales."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filtered.map((r) => {
              const isInactive = !r.active || !r.zoneActive;
              return (
                <div
                  key={r.id}
                  className="rounded-md border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm truncate">{r.name}</span>
                        {r.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {r.category}
                          </Badge>
                        )}
                        {isInactive ? (
                          <Badge variant="secondary" className="text-[10px]">Inactiva</Badge>
                        ) : (
                          <Badge className="text-[10px]">Activa</Badge>
                        )}
                      </div>
                      <Link
                        href={`/admin/envios/zonas/${r.zoneId}`}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-0.5"
                      >
                        <MapPin className="h-3 w-3" />
                        {r.zoneName}
                      </Link>
                    </div>
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
                      <Link href={`/admin/envios/tarifas/${r.id}/editar`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground tabular-nums">
                      <DollarSign className="h-3 w-3" />
                      {formatPrice(r.baseCost)}
                    </span>
                    {r.estimatedDays && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.estimatedDays}
                      </span>
                    )}
                    {r.carrier && (
                      <span className="flex items-center gap-1 truncate">
                        <Truck className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.carrier}</span>
                      </span>
                    )}
                    {r.freeShippingMin && (
                      <span className="text-green-700 dark:text-green-400">
                        Gratis ≥ {formatPrice(r.freeShippingMin)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarifa</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead>Tiempo</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Envío gratis</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const isInactive = !r.active || !r.zoneActive;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/envios/zonas/${r.zoneId}`}
                          className="hover:underline text-muted-foreground"
                        >
                          {r.zoneName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {r.category ? (
                          <Badge variant="outline" className="text-xs">
                            {r.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatPrice(r.baseCost)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.estimatedDays || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.carrier || "—"}
                      </TableCell>
                      <TableCell>
                        {r.freeShippingMin ? (
                          <span className="text-green-700 dark:text-green-400 text-sm">
                            {formatPrice(r.freeShippingMin)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isInactive ? (
                          <Badge variant="secondary">Inactiva</Badge>
                        ) : (
                          <Badge>Activa</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/envios/tarifas/${r.id}/editar`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
