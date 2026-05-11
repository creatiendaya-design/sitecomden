"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  MapPin,
  Pencil,
  Plus,
  Search,
  ChevronRight,
  X,
  Trash2,
} from "lucide-react";
import { DeleteZoneButton } from "@/components/admin/DeleteZoneButton";

interface ZoneCard {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  districtCount: number;
  rateCount: number;
}

interface Props {
  zones: ZoneCard[];
}

export function ZonesGrid({ zones }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const counts = useMemo(() => {
    return {
      all: zones.length,
      active: zones.filter((z) => z.active).length,
      inactive: zones.filter((z) => !z.active).length,
    };
  }, [zones]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return zones.filter((z) => {
      if (statusFilter === "active" && !z.active) return false;
      if (statusFilter === "inactive" && z.active) return false;
      if (!q) return true;
      return (
        z.name.toLowerCase().includes(q) ||
        (z.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [zones, query, statusFilter]);

  if (zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <MapPin className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-1">Sin zonas configuradas</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
          Las zonas son la base del sistema de envíos. Cada zona agrupa distritos con tarifas similares.
        </p>
        <Button asChild>
          <Link href="/admin/envios/zonas/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Crear primera zona
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search + filter chips */}
      <div className="space-y-2 sm:space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar zona..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 h-10 sm:h-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible -mx-1 px-1">
          {(["all", "active", "inactive"] as const).map((s) => {
            const isActive = statusFilter === s;
            const label = s === "all" ? "Todas" : s === "active" ? "Activas" : "Inactivas";
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {label}
                <span
                  className={`tabular-nums text-[10px] sm:text-xs rounded-full px-1.5 py-0.5 ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {counts[s]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center px-4">
          <Search className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sin coincidencias para los filtros actuales.
          </p>
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setQuery("")}
            >
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: compact list */}
          <div className="sm:hidden space-y-2">
            {filtered.map((zone) => (
              <ZoneListItem key={zone.id} zone={zone} />
            ))}
          </div>

          {/* Desktop: card grid */}
          <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((zone) => (
              <Card key={zone.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/envios/zonas/${zone.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <CardTitle className="text-lg truncate">{zone.name}</CardTitle>
                      </Link>
                      {zone.description && (
                        <CardDescription className="text-sm line-clamp-2 mt-1">
                          {zone.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge
                      variant={zone.active ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {zone.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat icon={<MapPin className="h-3.5 w-3.5" />} value={zone.districtCount} label="distritos" />
                    <Stat icon={<Layers className="h-3.5 w-3.5" />} value={zone.rateCount} label="tarifas" />
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="default" size="sm" asChild className="flex-1">
                      <Link href={`/admin/envios/zonas/${zone.id}`}>Gestionar</Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild aria-label={`Editar ${zone.name}`}>
                      <Link href={`/admin/envios/zonas/${zone.id}/editar`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DeleteZoneButton
                      zone={{
                        id: zone.id,
                        name: zone.name,
                        districtCount: zone.districtCount,
                        rateCount: zone.rateCount,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ZoneListItem({ zone }: { zone: ZoneCard }) {
  const needsAttention = zone.districtCount === 0 || zone.rateCount === 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Link
        href={`/admin/envios/zonas/${zone.id}`}
        className="flex items-center gap-3 p-3 active:bg-accent/50 transition-colors"
      >
        <div
          className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${
            zone.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm truncate">{zone.name}</p>
            {!zone.active && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="tabular-nums">{zone.districtCount}</span> distritos
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span className="tabular-nums">{zone.rateCount}</span> tarifas
            </span>
          </div>
          {needsAttention && (
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
              {zone.districtCount === 0 && zone.rateCount === 0
                ? "⚠ Sin distritos ni tarifas"
                : zone.districtCount === 0
                  ? "⚠ Sin distritos asignados"
                  : "⚠ Sin tarifas configuradas"}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>
      <div className="flex items-stretch border-t bg-muted/30">
        <Link
          href={`/admin/envios/zonas/${zone.id}/editar`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
        <div className="w-px bg-border" />
        <DeleteZoneButton
          zone={{
            id: zone.id,
            name: zone.name,
            districtCount: zone.districtCount,
            rateCount: zone.rateCount,
          }}
          trigger={
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
              aria-label={`Eliminar ${zone.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          }
        />
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="font-medium text-foreground tabular-nums">{value}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
