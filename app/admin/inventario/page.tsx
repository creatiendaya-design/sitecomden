export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  History,
  Plus,
} from "lucide-react";
import {
  getInventorySummary,
  getInventoryList,
  getLowStockProducts,
} from "@/actions/inventory";
import { Badge } from "@/components/ui/badge";
import BulkDeleteZeroStockButton from "@/components/admin/BulkDeleteZeroStockButton";

export default async function InventoryPage() {
  const [summaryResult, inventoryResult, lowStockResult] = await Promise.all([
    getInventorySummary(),
    getInventoryList(),
    getLowStockProducts(),
  ]);

  const summary = summaryResult.success ? summaryResult.data : null;
  const inventory = inventoryResult.success ? inventoryResult.data : [];
  const lowStockProducts = lowStockResult.success ? lowStockResult.data : [];

  const zeroStockCount = inventory.filter((item) => item.currentStock <= 0).length;

  return (
    <div className="space-y-4 sm:space-y-8 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Inventario</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona el stock y movimientos de productos
          </p>
        </div>

        {/* Mobile: icon-only history button */}
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 sm:hidden shrink-0">
          <Link href="/admin/inventario/movimientos" aria-label="Ver Movimientos">
            <History className="h-4 w-4" />
          </Link>
        </Button>

        {/* Desktop: full button row */}
        <div className="hidden sm:flex sm:flex-wrap gap-2">
          <BulkDeleteZeroStockButton zeroStockCount={zeroStockCount} />
          <Button asChild variant="outline">
            <Link href="/admin/inventario/movimientos">
              <History className="mr-2 h-4 w-4" />
              Ver Movimientos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/inventario/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile primary CTA + bulk action */}
      <div className="sm:hidden space-y-2">
        <Button asChild className="w-full">
          <Link href="/admin/inventario/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Movimiento
          </Link>
        </Button>
        {zeroStockCount > 0 && (
          <div className="flex justify-center">
            <BulkDeleteZeroStockButton zeroStockCount={zeroStockCount} />
          </div>
        )}
      </div>

      {/* Summary Cards - 2 cols on mobile to keep all 4 visible in one screen */}
      {summary && (
        <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Stock Total */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:pb-2 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Stock Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{summary.totalStock}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                Unidades en inventario
              </p>
            </CardContent>
          </Card>

          {/* Stock Bajo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:pb-2 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Stock Bajo
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-amber-600">
                {summary.lowStockItems}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                Con stock bajo
              </p>
            </CardContent>
          </Card>

          {/* Sin Stock */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:pb-2 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Sin Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {summary.outOfStockItems}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                Agotados
              </p>
            </CardContent>
          </Card>

          {/* Movimientos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:pb-2 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Movimientos
              </CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">
                {summary.recentMovements}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                Últimos 30 días
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900 text-base sm:text-lg">
                Alertas de Stock Bajo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 rounded-lg border border-amber-200 bg-white p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base line-clamp-1">
                      {product.name}
                    </p>
                    {product.hasVariants && product.variants.length > 0 && (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {product.variants.length} variante(s) con stock bajo
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-amber-700 w-fit whitespace-nowrap">
                    {product.hasVariants
                      ? `${product.variants.reduce((sum, v) => sum + v.stock, 0)} unidades`
                      : `${product.stock} unidades`}
                  </Badge>
                </div>
              ))}
              {lowStockProducts.length > 5 && (
                <Button variant="link" className="w-full text-sm" asChild>
                  <Link href="/admin/inventario?filter=low-stock">
                    Ver todos ({lowStockProducts.length})
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory List */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Lista de Inventario</CardTitle>
            {inventory.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {inventory.length}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {inventory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No hay productos en el inventario
            </p>
          ) : (
            <div className="divide-y sm:divide-y-0 sm:space-y-2">
              {inventory.map((item) => {
                const outOfStock = item.currentStock <= 0;
                const stockColor = outOfStock
                  ? "text-red-600"
                  : item.isLowStock
                  ? "text-amber-600"
                  : "";
                return (
                  <div key={item.id}>
                    {/* ============ MOBILE: compact row ============ */}
                    <Link
                      href={`/admin/inventario/${item.id}`}
                      className="sm:hidden flex items-center gap-3 px-3 py-2.5 active:bg-muted/40"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm leading-snug truncate">
                            {item.name}
                          </span>
                          {item.isLowStock && !outOfStock && (
                            <Badge variant="outline" className="text-amber-700 text-[10px] h-4 px-1.5 leading-none shrink-0">
                              Bajo
                            </Badge>
                          )}
                          {outOfStock && (
                            <Badge variant="outline" className="text-red-700 border-red-300 text-[10px] h-4 px-1.5 leading-none shrink-0">
                              Agotado
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground truncate">
                          {item.sku && <span>SKU: {item.sku}</span>}
                          {item.sku && item.hasVariants && item.variants && " · "}
                          {item.hasVariants && item.variants && (
                            <span>{item.variants.length} var</span>
                          )}
                          {!item.sku && !item.hasVariants && <span>—</span>}
                        </div>
                      </div>
                      <div className={`text-right shrink-0 ${stockColor}`}>
                        <p className="text-lg font-bold tabular-nums leading-none">
                          {item.currentStock}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          unidades
                        </p>
                      </div>
                    </Link>

                    {/* ============ DESKTOP: original ============ */}
                    <div className="hidden sm:flex sm:items-center sm:justify-between gap-4 rounded-lg border p-4 hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium line-clamp-1">{item.name}</p>
                          {item.isLowStock && (
                            <Badge variant="outline" className="text-amber-700 text-xs">
                              Stock Bajo
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                          {item.sku && <span>SKU: {item.sku}</span>}
                          {item.hasVariants && item.variants && (
                            <span>{item.variants.length} variante(s)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${stockColor}`}>
                            {item.currentStock}
                          </p>
                          <p className="text-xs text-muted-foreground">unidades</p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/inventario/${item.id}`}>
                            Ver Detalles
                          </Link>
                        </Button>
                      </div>
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