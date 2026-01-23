"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Gift, Loader2 } from "lucide-react";

// Componente que usa useSearchParams (debe estar dentro de Suspense)
function ConfirmationContent() {
  const searchParams = useSearchParams();
  const coupon = searchParams.get("coupon");

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <CardTitle className="text-3xl">¡Bienvenido a nuestra comunidad!</CardTitle>
        <CardDescription className="text-base">
          Gracias por suscribirte a nuestro newsletter
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mensaje de email */}
        <div className="rounded-lg border bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">
                Revisa tu correo electrónico
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Te hemos enviado un email de bienvenida con toda la información
                {coupon && " y tu cupón de descuento"}.
              </p>
            </div>
          </div>
        </div>

        {/* Cupón si existe */}
        {coupon && (
          <div className="rounded-lg border-2 border-dashed border-primary bg-primary/5 p-6 text-center">
            <Gift className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h3 className="mb-2 text-xl font-bold">¡Regalo de Bienvenida!</h3>
            <p className="mb-4 text-muted-foreground">
              Tu cupón de 10% de descuento:
            </p>
            <div className="mx-auto max-w-xs rounded-lg bg-white p-4">
              <p className="font-mono text-2xl font-bold text-primary">
                {coupon}
              </p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Válido para compras mayores a S/. 100 por 30 días
            </p>
          </div>
        )}

        {/* Beneficios */}
        <div>
          <h3 className="mb-4 font-semibold">¿Qué recibirás en tu bandeja?</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="font-medium">Ofertas Exclusivas</p>
                <p className="text-sm text-muted-foreground">
                  Descuentos especiales solo para suscriptores
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <span className="text-2xl">🆕</span>
              <div>
                <p className="font-medium">Nuevos Productos</p>
                <p className="text-sm text-muted-foreground">
                  Entérate antes que nadie
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-medium">Consejos y Guías</p>
                <p className="text-sm text-muted-foreground">
                  Tips de decoración y estilo
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-medium">Sorteos</p>
                <p className="text-sm text-muted-foreground">
                  Participa en concursos exclusivos
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1" asChild>
          <a href="/productos">Explorar Productos</a>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <a href="/">Volver al Inicio</a>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Loading fallback
function LoadingState() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <CardTitle>Cargando...</CardTitle>
      </CardHeader>
    </Card>
  );
}

// Componente principal con Suspense
export default function NewsletterConfirmationPage() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-16">
      <Suspense fallback={<LoadingState />}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}