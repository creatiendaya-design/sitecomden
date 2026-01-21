import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

export default async function Footer() {
  // Obtener settings usando tu sistema existente
  const settings = await getSiteSettings();

  // Filtrar solo las redes sociales que tienen URL
  const socialLinks = [
    { 
      href: settings.social_facebook, 
      Icon: Facebook, 
      label: "Facebook" 
    },
    { 
      href: settings.social_instagram, 
      Icon: Instagram, 
      label: "Instagram" 
    },
    { 
      href: settings.social_twitter, 
      Icon: Twitter, 
      label: "Twitter" 
    },
  ].filter((link) => link.href); // Solo mostrar las que tienen URL

  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* About - Ahora usa settings.site_name */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">{settings.site_name}</h3>
            <p className="text-sm text-muted-foreground">
              {settings.seo_home_description}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/productos"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Productos
                </Link>
              </li>
              <li>
                <Link
                  href="/nosotros"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Nosotros
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Ayuda</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/preguntas"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link
                  href="/envios"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Envíos
                </Link>
              </li>
              <li>
                <Link
                  href="/devoluciones"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Devoluciones
                </Link>
              </li>
              <li>
                <Link
                  href="/libro-reclamaciones"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Libro de reclamaciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Social - Dinámico con tus settings */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Síguenos</h3>
            {socialLinks.length > 0 ? (
              <div className="flex space-x-4">
                {socialLinks.map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Próximamente en redes sociales
              </p>
            )}
          </div>
        </div>

        {/* Copyright - Dinámico con settings.site_name */}
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings.site_name}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}