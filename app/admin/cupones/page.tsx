import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import DeleteCouponButton from "@/components/admin/DeleteCouponButton";

export default async function CouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cupones de Descuento</h1>
          <p className="text-muted-foreground">
            Gestiona los cupones de descuento para tus clientes
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/cupones/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cupón
          </Link>
        </Button>
      </div>

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="mb-4 text-muted-foreground">
              No hay cupones creados todavía
            </p>
            <Button asChild>
              <Link href="/admin/cupones/nuevo">Crear Primer Cupón</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => {
            const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
            const isNotStarted = coupon.startsAt && new Date(coupon.startsAt) > new Date();
            const isLimitReached = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;

            return (
              <Card key={coupon.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="font-mono text-2xl">
                          {coupon.code}
                        </CardTitle>
                        {!coupon.active && (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                        {isExpired && <Badge variant="destructive">Expirado</Badge>}
                        {isNotStarted && <Badge variant="secondary">Programado</Badge>}
                        {isLimitReached && <Badge variant="destructive">Límite alcanzado</Badge>}
                        {coupon.active && !isExpired && !isNotStarted && !isLimitReached && (
                          <Badge variant="default">Activo</Badge>
                        )}
                      </div>
                      {coupon.description && (
                        <p className="text-sm text-muted-foreground">
                          {coupon.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/admin/cupones/${coupon.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteCouponButton couponId={coupon.id} couponCode={coupon.code} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Tipo y Valor */}
                    <div>
                      <p className="text-sm text-muted-foreground">Descuento</p>
                      <p className="font-semibold">
                        {coupon.type === "PERCENTAGE" && `${coupon.value}%`}
                        {coupon.type === "FIXED_AMOUNT" && `S/ ${Number(coupon.value).toFixed(2)}`}
                        {coupon.type === "FREE_SHIPPING" && "Envío Gratis"}
                      </p>
                    </div>

                    {/* Usos */}
                    <div>
                      <p className="text-sm text-muted-foreground">Usos</p>
                      <p className="font-semibold">
                        {coupon.usageCount}
                        {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                        {!coupon.usageLimit && " / ∞"}
                      </p>
                    </div>

                    {/* Compra mínima */}
                    {coupon.minPurchase && (
                      <div>
                        <p className="text-sm text-muted-foreground">Compra mínima</p>
                        <p className="font-semibold">
                          S/ {Number(coupon.minPurchase).toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Fechas */}
                    <div>
                      <p className="text-sm text-muted-foreground">Vigencia</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {coupon.startsAt && (
                          <span>
                            {new Date(coupon.startsAt).toLocaleDateString("es-PE")}
                          </span>
                        )}
                        {coupon.startsAt && coupon.expiresAt && " - "}
                        {coupon.expiresAt && (
                          <span>
                            {new Date(coupon.expiresAt).toLocaleDateString("es-PE")}
                          </span>
                        )}
                        {!coupon.startsAt && !coupon.expiresAt && "Sin límite"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}