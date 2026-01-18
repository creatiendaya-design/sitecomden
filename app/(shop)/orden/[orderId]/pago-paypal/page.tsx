import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreditCard } from "lucide-react";

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function PaymentPayPalPage({ params }: PageProps) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Pago con PayPal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-center text-sm text-blue-900">
                <strong>Orden #{order.orderNumber}</strong>
              </p>
              <p className="mt-2 text-center text-2xl font-bold text-blue-900">
                {formatPrice(Number(order.total))}
              </p>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-muted-foreground">
                La integración con PayPal está en desarrollo.
              </p>
              <p className="text-sm text-muted-foreground">
                Tu orden ha sido registrada como <strong>Pendiente de Pago</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <Button asChild className="w-full" size="lg">
                <Link href="/">Volver al Inicio</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/productos">Seguir Comprando</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}