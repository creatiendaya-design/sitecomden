import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, History, Download } from "lucide-react";
import { getInventoryMovements } from "@/actions/inventory";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function InventoryMovementsPage() {
  const movementsResult = await getInventoryMovements({ limit: 100 });
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

  // Agrupar movimientos por tipo
  const groupedByType = movements.reduce((acc, movement) => {
    const type = movement.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(movement);
    return acc;
  }, {} as Record<string, typeof movements>);

  // Calcular totales
  const totalEntries = movements
    .filter((m) => m.quantity > 0)
    .reduce((sum, m) => sum + m.quantity, 0);
  const totalExits = movements
    .filter((m) => m.quantity < 0)
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/inventario">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Historial de Movimientos</h1>
            <p className="text-muted-foreground">
              Últimos {movements.length} movimientos
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Movimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movements.length}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 100 registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Entradas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{totalEntries}
            </div>
            <p className="text-xs text-muted-foreground">
              Compras, devoluciones, ajustes positivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Salidas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{totalExits}
            </div>
            <p className="text-xs text-muted-foreground">
              Ventas, daños, ajustes negativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Movements by Type */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groupedByType).map(([type, typeMovements]) => {
          const typeInfo = getMovementTypeLabel(type);
          const total = typeMovements.reduce(
            (sum, m) => sum + Math.abs(m.quantity),
            0
          );
          return (
            <Card key={type}>
              <CardHeader className="pb-2">
                <Badge className={`w-fit ${typeInfo.color}`}>
                  {typeInfo.label}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typeMovements.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total: {total} unidades
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Todos los Movimientos
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
                    className="flex items-start justify-between rounded-lg border p-4 hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        <span
                          className={`text-lg font-semibold ${
                            movement.quantity > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity}
                        </span>
                      </div>

                      {/* Product Info */}
                      {movement.product && (
                        <div className="mt-2">
                          <Link
                            href={`/admin/inventario/${movement.product.id}`}
                            className="font-medium hover:underline"
                          >
                            {movement.product.name}
                          </Link>
                          {movement.variant && (
                            <p className="text-sm text-muted-foreground">
                              Variante:{" "}
                              {Object.entries(
                                movement.variant.options as Record<
                                  string,
                                  string
                                >
                              )
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Reason & Reference */}
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
                    </div>

                    {/* Date */}
                    <div className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(movement.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                      <p className="text-xs">
                        {new Date(movement.createdAt).toLocaleDateString(
                          "es-PE"
                        )}
                      </p>
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