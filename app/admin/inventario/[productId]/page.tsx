import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Package, History } from "lucide-react";
import { prisma } from "@/lib/db";
import { getInventoryMovements } from "@/actions/inventory";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        where: { active: true },
        orderBy: { sku: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const movementsResult = await getInventoryMovements({ productId });
  const movements = movementsResult.success ? movementsResult.data : [];

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      PURCHASE: { label: "Compra", color: "bg-green-100 text-green-700" },
      SALE: { label: "Venta", color: "bg-blue-100 text-blue-700" },
      RETURN: { label: "Devolución", color: "bg-purple-100 text-purple-700" },
      ADJUSTMENT: { label: "Ajuste", color: "bg-amber-100 text-amber-700" },
      DAMAGE: { label: "Daño/Pérdida", color: "bg-red-100 text-red-700" },
    };
    return labels[type] || { label: type, color: "bg-slate-100 text-slate-700" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/inventario">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          {product.sku && (
            <p className="text-muted-foreground">SKU: {product.sku}</p>
          )}
        </div>
      </div>

      {/* Current Stock */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {product.hasVariants ? (
              <div className="space-y-3">
                {product.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{variant.sku}</p>
                      <p className="text-sm text-muted-foreground">
                        {Object.entries(variant.options as Record<string, string>)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{variant.stock}</p>
                      {variant.stock <= variant.lowStockAlert && (
                        <Badge variant="outline" className="text-amber-700">
                          Stock Bajo
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between">
                    <p className="font-semibold">Total:</p>
                    <p className="text-2xl font-bold">
                      {product.variants.reduce((sum, v) => sum + v.stock, 0)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-4xl font-bold">{product.stock}</p>
                <p className="text-muted-foreground">unidades</p>
                {product.stock <= 5 && (
                  <Badge variant="outline" className="mt-2 text-amber-700">
                    Stock Bajo
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full" variant="outline">
              <Link href={`/admin/inventario/nuevo?productId=${product.id}`}>
                <Package className="mr-2 h-4 w-4" />
                Registrar Compra
              </Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link href={`/admin/inventario/ajustar?productId=${product.id}`}>
                <History className="mr-2 h-4 w-4" />
                Ajustar Stock
              </Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link href={`/admin/productos/${product.id}`}>
                Editar Producto
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Movement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay movimientos registrados
            </p>
          ) : (
            <div className="space-y-3">
              {movements.map((movement) => {
                const typeInfo = getMovementTypeLabel(movement.type);
                return (
                  <div
                    key={movement.id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        <span
                          className={`font-semibold ${
                            movement.quantity > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity}
                        </span>
                      </div>
                      {movement.reason && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {movement.reason}
                        </p>
                      )}
                      {movement.reference && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Ref: {movement.reference}
                        </p>
                      )}
                      {movement.variant && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Variante:{" "}
                          {Object.entries(
                            movement.variant.options as Record<string, string>
                          )
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(movement.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}