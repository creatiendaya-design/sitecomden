import Link from "next/link";
import Image from "next/image";
import { Phone, ShieldCheck } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

export default async function CheckoutHeader() {
  const settings = await getSiteSettings();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          {settings.site_logo ? (
            <div className="relative h-10 w-auto">
              <Image
                src={settings.site_logo}
                alt={settings.site_name}
                width={150}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
          ) : (
            <span className="text-xl font-bold">{settings.site_name}</span>
          )}
        </Link>

        {/* Info de confianza */}
        <div className="flex items-center gap-6">
          {/* Teléfono/WhatsApp */}
          {settings.contact_phone && (
            <a
              href={`tel:${settings.contact_phone}`}
              className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-primary sm:flex"
            >
              <Phone className="h-4 w-4" />
              <span>{settings.contact_phone}</span>
            </a>
          )}

          {/* Indicador de seguridad */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="hidden sm:inline">Compra Segura</span>
          </div>
        </div>
      </div>
    </header>
  );
}