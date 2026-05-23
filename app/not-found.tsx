import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Error 404
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Página no encontrada
      </h1>
      <p className="mt-3 text-muted-foreground">
        La página que buscas no existe o fue movida.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/productos">Ver productos</Link>
        </Button>
      </div>
    </div>
  );
}
