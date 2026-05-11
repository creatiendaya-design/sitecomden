"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createShippingRate } from "@/actions/shipping-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";

interface Props {
  zoneId: string;
  defaultCategory?: string | null;
  trigger?: React.ReactNode;
}

export function QuickRateDialog({ zoneId, defaultCategory, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [advanced, setAdvanced] = useState(false);

  const [name, setName] = useState("");
  const [baseCost, setBaseCost] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [carrier, setCarrier] = useState("");
  const [freeShippingMin, setFreeShippingMin] = useState("");
  const [category, setCategory] = useState(defaultCategory || "");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxOrderAmount, setMaxOrderAmount] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [active, setActive] = useState(true);

  const reset = () => {
    setName("");
    setBaseCost("");
    setEstimatedDays("");
    setCarrier("");
    setFreeShippingMin("");
    setCategory(defaultCategory || "");
    setMinOrderAmount("");
    setMaxOrderAmount("");
    setTimeWindow("");
    setActive(true);
    setAdvanced(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cost = parseFloat(baseCost);
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Ingresa un costo válido");
      return;
    }

    const parseOpt = (v: string) => {
      if (!v.trim()) return null;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };

    startTransition(async () => {
      const res = await createShippingRate({
        zoneId,
        rate: {
          name,
          baseCost: cost,
          category: category.trim() || null,
          estimatedDays: estimatedDays || null,
          carrier: carrier || null,
          freeShippingMin: parseOpt(freeShippingMin),
          minOrderAmount: parseOpt(minOrderAmount),
          maxOrderAmount: parseOpt(maxOrderAmount),
          timeWindow: timeWindow || null,
          active,
        },
      });

      if (res.success) {
        toast.success("Tarifa creada");
        reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Error al crear tarifa");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!pending) {
          setOpen(o);
          if (!o) reset();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva tarifa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Nueva tarifa de envío</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Configura el costo y los detalles del envío.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="rate-name" className="text-sm">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rate-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Standard, Express AM"
                  required
                  autoFocus
                  disabled={pending}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="rate-cost" className="text-sm">
                  Costo (S/) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rate-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseCost}
                  onChange={(e) => setBaseCost(e.target.value)}
                  placeholder="15.00"
                  required
                  disabled={pending}
                  className="h-9"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="rate-days" className="text-sm">Tiempo estimado</Label>
                <Input
                  id="rate-days"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                  placeholder="2-3 días"
                  disabled={pending}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="rate-carrier" className="text-sm">Courier</Label>
                <Input
                  id="rate-carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Olva, Shalom..."
                  disabled={pending}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="rate-free" className="text-sm">Envío gratis desde (opcional)</Label>
              <Input
                id="rate-free"
                type="number"
                step="0.01"
                min="0"
                value={freeShippingMin}
                onChange={(e) => setFreeShippingMin(e.target.value)}
                placeholder="100.00"
                disabled={pending}
                className="h-9"
                inputMode="decimal"
              />
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Si el subtotal alcanza este monto, el envío es gratis.
              </p>
            </div>

            <Separator />

            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {advanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Opciones avanzadas
            </button>

            {advanced && (
              <div className="space-y-3 border-l-2 border-muted ml-1.5 pl-3 sm:pl-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="rate-category" className="text-sm">Categoría visual (opcional)</Label>
                  <Input
                    id="rate-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ej: Express, Recojo en tienda"
                    disabled={pending}
                    className="h-9"
                  />
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Las tarifas con la misma categoría se agrupan en checkout.
                  </p>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="rate-min" className="text-sm">Pedido mín. (S/)</Label>
                    <Input
                      id="rate-min"
                      type="number"
                      step="0.01"
                      min="0"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      placeholder="0"
                      disabled={pending}
                      className="h-9"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="rate-max" className="text-sm">Pedido máx. (S/)</Label>
                    <Input
                      id="rate-max"
                      type="number"
                      step="0.01"
                      min="0"
                      value={maxOrderAmount}
                      onChange={(e) => setMaxOrderAmount(e.target.value)}
                      placeholder="Sin límite"
                      disabled={pending}
                      className="h-9"
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Esta tarifa solo aplica a pedidos dentro del rango.
                </p>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="rate-window" className="text-sm">Ventana horaria (opcional)</Label>
                  <Input
                    id="rate-window"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                    placeholder="9:00 a.m. - 6:00 p.m."
                    disabled={pending}
                    className="h-9"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3 gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <Label htmlFor="rate-active" className="text-sm">Tarifa activa</Label>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      Las inactivas no se muestran en checkout.
                    </p>
                  </div>
                  <Switch
                    id="rate-active"
                    checked={active}
                    onCheckedChange={setActive}
                    disabled={pending}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !name.trim() || !baseCost} className="flex-1 sm:flex-initial">
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear tarifa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
