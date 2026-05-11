"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Edit3,
  ExternalLink,
  Folder,
  Gift,
  Link2,
  Mail,
  Package,
  Plus,
  Tag,
  Trash2,
  Trophy,
  Unlink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import {
  promotionTypeLabels,
  type PromotionData,
  type ProductScopedPromotion,
  type VolumeConfig,
  type SubscriptionConfig,
  type FreeGiftConfig,
  type BundleConfig,
} from "@/lib/promotions/types";
import {
  deletePromotion,
  getPromotion,
  linkProductToPromotion,
  listPromotionsForProduct,
  setPromotionActive,
  unlinkProductFromPromotion,
} from "@/actions/promotions";
import type { ProductPromotionType } from "@prisma/client";
import PromotionsDrawer, { type DrawerMode } from "./promotions/PromotionsDrawer";
import LinkPromotionDialog from "./promotions/LinkPromotionDialog";

interface ProductPromotionsCardProps {
  productId: string;
  productName: string;
  initialPromotions?: ProductScopedPromotion[];
}

const TYPE_ICONS: Record<ProductPromotionType, React.ComponentType<{ className?: string }>> = {
  VOLUME: Trophy,
  SUBSCRIPTION: Mail,
  FREE_GIFT: Gift,
  BUNDLE: Package,
};

export default function ProductPromotionsCard({
  productId,
  productName,
  initialPromotions = [],
}: ProductPromotionsCardProps) {
  const [promotions, setPromotions] = useState<ProductScopedPromotion[]>(initialPromotions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductScopedPromotion | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<ProductScopedPromotion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPromotions.length === 0) {
      listPromotionsForProduct(productId).then(setPromotions).catch(() => {});
    }
  }, [productId, initialPromotions.length]);

  const subscriptionExists = useMemo(
    () => promotions.some((p) => p.type === "SUBSCRIPTION"),
    [promotions]
  );

  const reload = async () => {
    const fresh = await listPromotionsForProduct(productId);
    setPromotions(fresh);
  };

  const handleCreate = (type: ProductPromotionType) => {
    setDrawerMode({ kind: "create", type });
    setDrawerOpen(true);
  };

  const handleEdit = async (promo: ProductScopedPromotion) => {
    const fresh = await getPromotion(promo.id);
    setDrawerMode({ kind: "edit", promotion: fresh });
    setDrawerOpen(true);
  };

  const handleSaved = () => {
    reload();
  };

  const handleToggle = async (promo: ProductScopedPromotion, next: boolean) => {
    setBusyId(promo.id);
    try {
      await setPromotionActive(promo.id, next);
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deletePromotion(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    setBusyId(unlinkTarget.id);
    try {
      await unlinkProductFromPromotion(unlinkTarget.id, productId);
      setUnlinkTarget(null);
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const handleLinkExisting = async (promotionId: string) => {
    await linkProductToPromotion(promotionId, productId);
    setLinkDialogOpen(false);
    await reload();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-4 w-4" />
          Promociones
        </CardTitle>
        <Link
          href="/admin/promociones"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Ver todas
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {promotions.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No hay promociones que apliquen a este producto.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crea una nueva o vincula una existente.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {promotions.map((promo) => {
              const Icon = TYPE_ICONS[promo.type];
              const isCategoryMatch = promo.matchSource === "CATEGORY";
              return (
                <li
                  key={promo.id}
                  className="flex items-center gap-2 rounded-md border bg-card p-2"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      promo.active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium leading-tight">
                      <span className="truncate">{promo.name}</span>
                      {isCategoryMatch && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-normal text-blue-700">
                          <Folder className="h-2.5 w-2.5" />
                          {promo.matchedCategoryName ?? "categoría"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {promotionTypeLabels[promo.type]} · {summarize(promo)}
                    </div>
                  </div>
                  <Switch
                    checked={promo.active}
                    disabled={busyId === promo.id}
                    onCheckedChange={(next) => handleToggle(promo, next)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(promo)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  {isCategoryMatch ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      title="Aplica vía categoría — no se puede desvincular desde aquí"
                      disabled
                    >
                      <Folder className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setUnlinkTarget(promo)}
                      disabled={busyId === promo.id}
                      title="Desvincular de este producto"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(promo)}
                    disabled={busyId === promo.id}
                    title="Eliminar promoción (afecta a todos sus targets)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setLinkDialogOpen(true)}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Vincular existente
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Crear nueva
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[260px]">
              <DropdownMenuItem onClick={() => handleCreate("VOLUME")}>
                <Trophy className="mr-2 h-4 w-4 text-amber-500" />
                <div>
                  <div className="text-sm font-medium">Descuento por volumen</div>
                  <div className="text-xs text-muted-foreground">
                    Buy 2 / Buy 3+ con descuento
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCreate("SUBSCRIPTION")}
                disabled={subscriptionExists}
              >
                <Mail className="mr-2 h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">
                    Descuento por suscripción
                    {subscriptionExists && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (ya configurada)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Newsletter checkbox
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreate("FREE_GIFT")}>
                <Gift className="mr-2 h-4 w-4 text-pink-500" />
                <div>
                  <div className="text-sm font-medium">Regalo gratis</div>
                  <div className="text-xs text-muted-foreground">
                    Al alcanzar un monto
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreate("BUNDLE")}>
                <Package className="mr-2 h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-sm font-medium">Combo / Bundle</div>
                  <div className="text-xs text-muted-foreground">
                    Compra X + Y con descuento
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/promociones"
                  className="flex w-full items-center"
                >
                  <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Ir al gestor global</div>
                    <div className="text-xs text-muted-foreground">
                      Lista completa con filtros
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>

      <PromotionsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        scopedProductId={productId}
        scopedProductName={productName}
        onSaved={handleSaved}
      />

      <LinkPromotionDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        productId={productId}
        onLink={handleLinkExisting}
      />

      <AlertDialog
        open={!!unlinkTarget}
        onOpenChange={(open) => !open && setUnlinkTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular de este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              La promoción seguirá existiendo y aplicando a sus otros targets,
              pero dejará de afectar a <strong>{productName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>Desvincular</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar promoción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La promoción dejará de aplicar
              a <strong>todos sus targets</strong>, no solo a este producto. Si solo
              quieres quitarla de este producto, usa <em>Desvincular</em>.
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
    </Card>
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
