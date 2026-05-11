"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  DollarSign,
  Edit3,
  Folder,
  Gift,
  Mail,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
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
import {
  promotionTypeLabels,
  type PromotionData,
  type VolumeConfig,
  type SubscriptionConfig,
  type FreeGiftConfig,
  type BundleConfig,
} from "@/lib/promotions/types";
import {
  deletePromotion,
  setPromotionActive,
} from "@/actions/promotions";
import type { ProductPromotionType } from "@prisma/client";
import PromotionsDrawer, {
  type DrawerMode,
} from "@/components/admin/products/promotions/PromotionsDrawer";

interface PromotionsListClientProps {
  initialPromotions: PromotionData[];
}

const TYPE_ICONS: Record<ProductPromotionType, React.ComponentType<{ className?: string }>> = {
  VOLUME: Trophy,
  SUBSCRIPTION: Mail,
  FREE_GIFT: Gift,
  BUNDLE: Package,
};

export default function PromotionsListClient({
  initialPromotions,
}: PromotionsListClientProps) {
  const [promotions, setPromotions] = useState<PromotionData[]>(initialPromotions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ProductPromotionType>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED" | "SCHEDULED"
  >("ALL");

  const promotionStatus = (p: PromotionData) => {
    const now = Date.now();
    if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return "EXPIRED" as const;
    if (p.startsAt && new Date(p.startsAt).getTime() > now) return "SCHEDULED" as const;
    return p.active ? "ACTIVE" : "INACTIVE";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return promotions.filter((p) => {
      if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && promotionStatus(p) !== statusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [promotions, search, typeFilter, statusFilter]);

  // Aggregate stats over ALL promotions (not filtered) so the headline
  // metrics stay stable while the admin slices the list.
  const stats = useMemo(() => {
    const totalUsage = promotions.reduce((s, p) => s + p.usageCount, 0);
    const totalSaved = promotions.reduce((s, p) => s + (p.totalDiscountApplied ?? 0), 0);
    const activeCount = promotions.filter(
      (p) => promotionStatus(p) === "ACTIVE"
    ).length;
    return { totalUsage, totalSaved, activeCount, total: promotions.length };
  }, [promotions]);

  const handleCreate = (type: ProductPromotionType) => {
    setDrawerMode({ kind: "create", type });
    setDrawerOpen(true);
  };

  const handleEdit = (promo: PromotionData) => {
    setDrawerMode({ kind: "edit", promotion: promo });
    setDrawerOpen(true);
  };

  const handleSaved = (saved: PromotionData) => {
    setPromotions((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };

  const handleToggle = async (promo: PromotionData, next: boolean) => {
    setBusyId(promo.id);
    try {
      const result = await setPromotionActive(promo.id, next);
      handleSaved(result.promotion);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deletePromotion(deleteTarget.id);
      setPromotions((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const createMenu = (
    <DropdownMenuContent align="end" className="w-[280px]">
      <DropdownMenuItem onClick={() => handleCreate("VOLUME")}>
        <Trophy className="mr-2 h-4 w-4 text-amber-500" />
        <div>
          <div className="text-sm font-medium">Descuento por volumen</div>
          <div className="text-xs text-muted-foreground">Tiers por cantidad</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleCreate("SUBSCRIPTION")}>
        <Mail className="mr-2 h-4 w-4 text-blue-500" />
        <div>
          <div className="text-sm font-medium">Descuento por suscripción</div>
          <div className="text-xs text-muted-foreground">Newsletter checkbox</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleCreate("FREE_GIFT")}>
        <Gift className="mr-2 h-4 w-4 text-pink-500" />
        <div>
          <div className="text-sm font-medium">Regalo gratis</div>
          <div className="text-xs text-muted-foreground">Al alcanzar un monto</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleCreate("BUNDLE")}>
        <Package className="mr-2 h-4 w-4 text-purple-500" />
        <div>
          <div className="text-sm font-medium">Combo / Bundle</div>
          <div className="text-xs text-muted-foreground">Compra X + Y con descuento</div>
        </div>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold">
            <Tag className="h-5 w-5 sm:h-7 sm:w-7 shrink-0" />
            Promociones
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Reglas automáticas de descuento en la página del producto.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="hidden sm:inline-flex">
              <Plus className="mr-2 h-4 w-4" />
              Nueva promoción
            </Button>
          </DropdownMenuTrigger>
          {createMenu}
        </DropdownMenu>
      </div>

      {/* Mobile primary CTA */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="sm:hidden w-full">
            <Plus className="mr-2 h-4 w-4" />
            Nueva promoción
          </Button>
        </DropdownMenuTrigger>
        {createMenu}
      </DropdownMenu>

      {/* Aggregate stats — 2 cols mobile */}
      {promotions.length > 0 && (
        <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={<Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            label="Total"
            value={stats.total.toString()}
          />
          <StatTile
            icon={<Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />}
            label="Activas"
            value={stats.activeCount.toString()}
          />
          <StatTile
            icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />}
            label="Usos"
            value={stats.totalUsage.toLocaleString("es-PE")}
          />
          <StatTile
            icon={<DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />}
            label="Ahorrado"
            value={`S/ ${stats.totalSaved.toFixed(2)}`}
          />
        </div>
      )}

      {/* Filters */}
      {promotions.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              className="h-9 pl-8"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="h-9 sm:w-[220px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="VOLUME">Volumen</SelectItem>
              <SelectItem value="SUBSCRIPTION">Suscripción</SelectItem>
              <SelectItem value="FREE_GIFT">Regalo gratis</SelectItem>
              <SelectItem value="BUNDLE">Combo / Bundle</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 sm:w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="ACTIVE">Activas</SelectItem>
              <SelectItem value="INACTIVE">Inactivas</SelectItem>
              <SelectItem value="EXPIRED">Expiradas</SelectItem>
              <SelectItem value="SCHEDULED">Programadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-1 text-lg font-medium">Aún no hay promociones</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Crea tu primera promoción para incentivar compras.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ninguna promoción coincide con los filtros actuales.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:gap-3">
          {filtered.map((promo) => {
            const Icon = TYPE_ICONS[promo.type];
            const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
            const isNotStarted = promo.startsAt && new Date(promo.startsAt) > new Date();
            const productCount = promo.targets?.products.length ?? 0;
            const categoryCount = promo.targets?.categories.length ?? 0;

            // Build a compact one-line metadata summary used only on mobile
            const formatShort = (d: string | Date) =>
              new Date(d).toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              });
            const mobileMetaParts: string[] = [];
            mobileMetaParts.push(
              productCount === 0
                ? "sin productos"
                : `${productCount} prod`
            );
            if (categoryCount > 0) {
              mobileMetaParts.push(`${categoryCount} cat`);
            }
            mobileMetaParts.push(`${promo.usageCount} uso${promo.usageCount !== 1 ? "s" : ""}`);
            if (promo.startsAt || promo.expiresAt) {
              const dates = [
                promo.startsAt ? formatShort(promo.startsAt) : null,
                promo.expiresAt ? formatShort(promo.expiresAt) : null,
              ]
                .filter(Boolean)
                .join("—");
              mobileMetaParts.push(dates);
            } else {
              mobileMetaParts.push("sin límite");
            }
            if (promo.totalDiscountApplied > 0) {
              mobileMetaParts.push(
                `S/ ${promo.totalDiscountApplied.toFixed(2)} ahorr.`
              );
            }
            const mobileMetaSummary = mobileMetaParts.join(" · ");

            return (
              <Card key={promo.id} className="overflow-hidden">
                <CardHeader className="px-3 py-3 sm:px-6 sm:pb-3 sm:pt-6">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md ${
                          promo.active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <CardTitle className="text-sm sm:text-lg leading-tight truncate">
                            {promo.name}
                          </CardTitle>
                          {!promo.active && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 leading-none">
                              Inactiva
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="destructive" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 leading-none">
                              Expirada
                            </Badge>
                          )}
                          {isNotStarted && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 leading-none">
                              Programada
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                          {promotionTypeLabels[promo.type]} · {summarize(promo)}
                        </p>
                        {/* Mobile-only condensed metadata (replaces body grid) */}
                        <p className="text-[11px] text-muted-foreground line-clamp-2 sm:hidden">
                          {mobileMetaSummary}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <Switch
                        checked={promo.active}
                        disabled={busyId === promo.id}
                        onCheckedChange={(next) => handleToggle(promo, next)}
                      />

                      {/* Desktop: separate Edit + Delete buttons */}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(promo)}
                        className="hidden sm:inline-flex"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="hidden sm:inline-flex text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(promo)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      {/* Mobile: combined dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:hidden"
                            aria-label="Más acciones"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(promo)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(promo)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="hidden sm:block px-6 pb-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">
                        Productos
                      </p>
                      <p className="font-semibold tabular-nums">
                        {productCount === 0
                          ? "—"
                          : `${productCount} producto${productCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">
                        Categorías
                      </p>
                      {categoryCount > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {promo.targets!.categories.slice(0, 3).map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                            >
                              <Folder className="h-2.5 w-2.5" />
                              {c.name}
                            </span>
                          ))}
                          {categoryCount > 3 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{categoryCount - 3} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="font-semibold">—</p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">
                        Usos
                      </p>
                      <p className="font-semibold tabular-nums">
                        {promo.usageCount}
                      </p>
                      {promo.totalDiscountApplied > 0 && (
                        <p className="text-[11px] text-rose-600 tabular-nums">
                          S/ {promo.totalDiscountApplied.toFixed(2)} ahorrado
                        </p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">
                        Vigencia
                      </p>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate tabular-nums">
                          {promo.startsAt && new Date(promo.startsAt).toLocaleDateString("es-PE")}
                          {promo.startsAt && promo.expiresAt && " · "}
                          {promo.expiresAt && new Date(promo.expiresAt).toLocaleDateString("es-PE")}
                          {!promo.startsAt && !promo.expiresAt && (
                            <span className="text-muted-foreground">Sin límite</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PromotionsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar promoción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La promoción dejará de aplicar en
              todos los productos y categorías vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function summarize(promo: PromotionData): string {
  switch (promo.type) {
    case "VOLUME": {
      const cfg = promo.config as VolumeConfig;
      const parts = cfg.tiers
        .map(
          (t) =>
            `${t.minQty}u → ${
              t.discountType === "PERCENT"
                ? `${t.discountValue}%`
                : `S/ ${t.discountValue.toFixed(2)}`
            }`
        )
        .join(" · ");
      return `${cfg.tiers.length} tier${cfg.tiers.length === 1 ? "" : "s"}: ${parts}`;
    }
    case "SUBSCRIPTION": {
      const cfg = promo.config as SubscriptionConfig;
      return cfg.discountType === "PERCENT"
        ? `${cfg.discountValue}% al suscribirse`
        : `S/ ${cfg.discountValue.toFixed(2)} al suscribirse`;
    }
    case "FREE_GIFT": {
      const cfg = promo.config as FreeGiftConfig;
      return cfg.giftProductId
        ? `Regalo desde S/ ${cfg.minSubtotal.toFixed(2)}`
        : "Regalo sin asignar";
    }
    case "BUNDLE": {
      const cfg = promo.config as BundleConfig;
      const count = cfg.partnerProductIds.length;
      const value =
        cfg.discountType === "PERCENT"
          ? `${cfg.discountValue}%`
          : `S/ ${cfg.discountValue.toFixed(2)}`;
      return `Combo con ${count} producto${count === 1 ? "" : "s"} · ${value}`;
    }
  }
}

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatTile({ icon, label, value }: StatTileProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4">
        <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-sm sm:text-lg font-bold leading-tight tabular-nums">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
