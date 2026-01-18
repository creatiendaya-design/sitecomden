import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, Home } from "lucide-react";

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string }>;
}) {
  const { number } = await searchParams;

  return (
    <div className="container py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">
            ¡Reclamación Registrada Exitosamente!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Su reclamación ha sido registrada correctamente.
            </p>
            {number && (
              <div className="bg-slate-50 rounded-lg p-4 my-4">
                <p className="text-sm text-muted-foreground">
                  Número de Reclamación:
                </p>
                <p className="text-2xl font-bold text-primary">{number}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Hemos enviado un correo de confirmación a su email.
              <br />
              Por favor conserve el número de reclamación para dar seguimiento
              a su caso.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Volver al Inicio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}