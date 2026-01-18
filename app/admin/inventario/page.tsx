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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">
            Gestiona el stock y movimientos de productos
          </p>
        </div>
        <div className="flex gap-2">
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalStock}</div>
              <p className="text-xs text-muted-foreground">
                Unidades en inventario
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stock Bajo
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {summary.lowStockItems}
              </div>
              <p className="text-xs text-muted-foreground">
                Productos con stock bajo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary.outOfStockItems}
              </div>
              <p className="text-xs text-muted-foreground">
                Productos agotados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Movimientos (30d)
              </CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
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
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">
                Alertas de Stock Bajo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.hasVariants && product.variants.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {product.variants.length} variante(s) con stock bajo
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-amber-700">
                    {product.hasVariants
                      ? `${product.variants.reduce((sum, v) => sum + v.stock, 0)} unidades`
                      : `${product.stock} unidades`}
                  </Badge>
                </div>
              ))}
              {lowStockProducts.length > 5 && (
                <Button variant="link" className="w-full" asChild>
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
        <CardHeader>
          <CardTitle>Lista de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay productos en el inventario
              </p>
            ) : (
              <div className="space-y-2">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        {item.isLowStock && (
                          <Badge variant="outline" className="text-amber-700">
                            Stock Bajo
                          </Badge>
                        )}
                      </div>
                      {item.sku && (
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.sku}
                        </p>
                      )}
                      {item.hasVariants && item.variants && (
                        <p className="text-sm text-muted-foreground">
                          {item.variants.length} variante(s)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {item.currentStock}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          unidades
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/inventario/${item.id}`}>
                          Ver Detalles
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