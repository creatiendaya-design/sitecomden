"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPromotionsForLinking } from "@/actions/promotions";
import { promotionTypeLabels } from "@/lib/promotions/types";
import type { ProductPromotionType } from "@prisma/client";

type LinkablePromotion = {
  id: string;
  name: string;
  type: ProductPromotionType;
  active: boolean;
};

interface LinkPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onLink: (promotionId: string) => void | Promise<void>;
}

export default function LinkPromotionDialog({
  open,
  onOpenChange,
  productId,
  onLink,
}: LinkPromotionDialogProps) {
  const [items, setItems] = useState<LinkablePromotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listPromotionsForLinking(productId)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [open, productId]);

  const filtered = items.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleLink = async (promotionId: string) => {
    setLinkingId(promotionId);
    try {
      await onLink(promotionId);
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular promoción existente</DialogTitle>
          <DialogDescription>
            Selecciona una promoción del catálogo global para que aplique también a este producto.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-8"
          />
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-md border p-2">
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Cargando…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? "No hay promociones disponibles para vincular."
                : "Ninguna promoción coincide con la búsqueda."}
            </div>
          )}
          {!loading &&
            filtered.map((promo) => (
              <div
                key={promo.id}
                className="flex items-center gap-2 rounded-md border bg-card p-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium leading-tight">
                    <span className="truncate">{promo.name}</span>
                    {!promo.active && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        inactiva
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {promotionTypeLabels[promo.type]}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleLink(promo.id)}
                  disabled={linkingId !== null}
                >
                  {linkingId === promo.id && (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  )}
                  Vincular
                </Button>
              </div>
            ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
