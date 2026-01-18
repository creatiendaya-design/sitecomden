import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Mis Pedidos",
};

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

const statusLabels = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  PROCESSING: "Procesando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export default async function OrdenesPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Obtener email del usuario desde Clerk
  const { sessionClaims } = auth();
  const userEmail = sessionClaims?.email as string;

  // Obtener pedidos del usuario
  const orders = await prisma.order.findMany({
    where: {
      customerEmail: userEmail,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShoppingBag className="h-24 w-24 text-muted-foreground/50" />
        <h2 className="mt-6 text-2xl font-bold">No tienes pedidos</h2>
        <p className="mt-2 text-muted-foreground">
          Cuando realices una compra, tus pedidos aparecerán aquí
        </p>
        <Link href="/productos">
          <Button className="mt-6">Explorar productos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Mis Pedidos</h2>
        <p className="text-muted-foreground">
          {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} en total
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Pedido #{order.orderNumber}
                  </CardTitle>
                  <CardDescription>
                    {formatDistanceToNow(new Date(order.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </CardDescription>
                </div>
                <Badge
                  className={statusColors[order.status]}
                  variant="secondary"
                >
                  {statusLabels[order.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  {order.items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        {item.variantName && (
                          <p className="text-muted-foreground">
                            {item.variantName}
                          </p>
                        )}
                      </div>
                      <p className="font-medium">x{item.quantity}</p>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-sm text-muted-foreground">
                      +{order.items.length - 2} productos más
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">
                      S/. {Number(order.total).toFixed(2)}
                    </p>
                  </div>
                  <Link href={`/cuenta/ordenes/${order.id}`}>
                    <Button variant="outline">
                      Ver detalles
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}