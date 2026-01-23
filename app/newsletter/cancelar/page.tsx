"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Mail, Loader2 } from "lucide-react";

// Componente que usa useSearchParams
function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  
  const [email, setEmail] = useState(emailParam || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Tu suscripción ha sido cancelada exitosamente");
      } else {
        setStatus("error");
        setMessage(data.error || "Hubo un error. Intenta de nuevo.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Hubo un error. Intenta de nuevo.");
    }
  };

  if (status === "success") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Suscripción Cancelada</CardTitle>
          <CardDescription>
            Lamentamos verte partir. Tu suscripción ha sido cancelada exitosamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Ya no recibirás emails de nuestro newsletter.
            <br />
            Si cambias de opinión, siempre puedes suscribirte nuevamente.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" asChild>
            <a href="/">Volver al inicio</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <Mail className="h-8 w-8 text-red-600" />
        </div>
        <CardTitle>Cancelar Suscripción</CardTitle>
        <CardDescription>
          ¿Estás seguro de que deseas cancelar tu suscripción a nuestro newsletter?
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleUnsubscribe}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Confirma tu correo electrónico
            </label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === "loading"}
            />
          </div>

          {message && status === "error" && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4" />
              {message}
            </div>
          )}

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium">Si cancelas tu suscripción:</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>• No recibirás ofertas exclusivas</li>
              <li>• No te enterarás de nuevos productos</li>
              <li>• Te perderás cupones de descuento</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            asChild
          >
            <a href="/">Mantener suscripción</a>
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="flex-1"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Cancelando..." : "Cancelar suscripción"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// Loading fallback
function LoadingState() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <CardTitle>Cargando...</CardTitle>
      </CardHeader>
    </Card>
  );
}

// Componente principal con Suspense
export default function UnsubscribePage() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-16">
      <Suspense fallback={<LoadingState />}>
        <UnsubscribeForm />
      </Suspense>
    </div>
  );
}