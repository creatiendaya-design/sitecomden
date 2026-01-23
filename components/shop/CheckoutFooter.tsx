import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";
import Image from "next/image";
import { 
  VisaIcon, 
  MastercardIcon, 
  YapeIcon, 
  PlinIcon, 
  PayPalIcon 
} from "@/components/payment-icons";

export default async function CheckoutFooter() {
  const settings = await getSiteSettings();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-8">
        {/* Métodos de pago */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">Métodos de pago:</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex h-10 items-center justify-center rounded-lg border bg-white px-4 shadow-sm hover:shadow-md transition-shadow">
              <VisaIcon width={40} height={26} />
            </div>
            <div className="flex h-10 items-center justify-center rounded-lg border bg-white px-4 shadow-sm hover:shadow-md transition-shadow">
              <MastercardIcon width={34} height={22} />
            </div>
            <div className="flex h-10 items-center justify-center rounded-lg border bg-white px-4 shadow-sm hover:shadow-md transition-shadow">
              <YapeIcon width={32} height={32} />
            </div>
            <div className="flex h-10 items-center justify-center rounded-lg border bg-white px-4 shadow-sm hover:shadow-md transition-shadow">
              <PlinIcon width={32} height={32} />
            </div>
            <div className="flex h-10 items-center justify-center rounded-lg border bg-white px-4 shadow-sm hover:shadow-md transition-shadow">
              <PayPalIcon width={34} height={22} />
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="mb-6 border-t" />

        {/* Links legales y copyright */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/terminos"
              className="text-muted-foreground hover:text-primary"
            >
              Términos y Condiciones
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/privacidad"
              className="text-muted-foreground hover:text-primary"
            >
              Política de Privacidad
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/devoluciones"
              className="text-muted-foreground hover:text-primary"
            >
              Cambios y Devoluciones
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/libro-de-reclamaciones"
              className="text-muted-foreground hover:text-primary"
            >
              Libro de Reclamaciones
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            © {currentYear} {settings.site_name}. Todos los derechos reservados.
          </p>

          {/* Sellos de seguridad */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Compra 100% segura</span>
            <span className="mx-2">•</span>
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Datos protegidos SSL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}