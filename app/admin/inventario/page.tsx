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

export default async function InventoryPage() {
  const [summaryResult, inventoryResult, lowStockResult] = await Promise.all([
    getInventorySummary(),
    getInventoryList(),
    getLowStockProducts(),
  ]);

  const summary = summaryResult.success ? summaryResult.data : null;
  const inventory = inventoryResult.success ? inventoryResult.data : [];
  const lowStockProducts = lowStockResult.success ? lowStockResult.data : [];

  return (
    <div className="space-y-4 sm:space-y-8 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventario</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona el stock y movimientos de productos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/inventario/movimientos">
              <History className="mr-2 h-4 w-4" />
              Ver Movimientos
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/inventario/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards - Grid responsive: 1 col móvil, 2 cols tablet, 4 cols desktop */}
      {summary && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stock Total */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl font-bold">{summary.totalStock}</div>
              <p className="text-xs text-muted-foreground">
                Unidades en inventario
              </p>
            </CardContent>
          </Card>

          {/* Stock Bajo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-sm font-medium">
                Stock Bajo
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl font-bold text-amber-600">
                {summary.lowStockItems}
              </div>
              <p className="text-xs text-muted-foreground">
                Productos con stock bajo
              </p>
            </CardContent>
          </Card>

          {/* Sin Stock */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl font-bold text-red-600">
                {summary.outOfStockItems}
              </div>
              <p className="text-xs text-muted-foreground">
                Productos agotados
              </p>
            </CardContent>
          </Card>

          {/* Movimientos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-sm font-medium">
                Movimientos (30d)
              </CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl font-bold">
                {summary.recentMovements}
              </div>
              <p className="text-xs text-muted-foreground">
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Lista de Inventario</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {inventory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">
                No hay productos en el inventario
              </p>
            ) : (
              <div className="space-y-2 sm:space-y-2">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4 hover:bg-slate-50"
                  >
                    {/* Info del producto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <p className="font-medium text-sm sm:text-base line-clamp-1">
                          {item.name}
                        </p>
                        {item.isLowStock && (
                          <Badge variant="outline" className="text-amber-700 text-xs w-fit">
                            Stock Bajo
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-1">
                        {item.sku && (
                          <span>SKU: {item.sku}</span>
                        )}
                        {item.hasVariants && item.variants && (
                          <span>
                            {item.variants.length} variante(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock y acciones */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0">
                      {/* Stock counter */}
                      <div className="text-left sm:text-right">
                        <p className="text-xl sm:text-2xl font-bold">
                          {item.currentStock}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          unidades
                        </p>
                      </div>

                      {/* Botón */}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/inventario/${item.id}`}>
                          <span className="hidden sm:inline">Ver Detalles</span>
                          <span className="sm:hidden">Ver</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}