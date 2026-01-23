import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

export default async function Footer() {
  const settings = await getSiteSettings();

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
  ].filter((link) => link.href);

  return (
    <footer className="border-t border-gray-800 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">{settings.site_name}</h3>
            <p className="text-sm text-gray-400">
              {settings.seo_home_description}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/productos" className="text-gray-400 hover:text-white transition-colors">
                  Productos
                </Link>
              </li>
              <li>
                <Link href="/nosotros" className="text-gray-400 hover:text-white transition-colors">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-gray-400 hover:text-white transition-colors">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Ayuda</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/preguntas" className="text-gray-400 hover:text-white transition-colors">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link href="/envios" className="text-gray-400 hover:text-white transition-colors">
                  Envíos
                </Link>
              </li>
              <li>
                <Link href="/devoluciones" className="text-gray-400 hover:text-white transition-colors">
                  Devoluciones
                </Link>
              </li>
              <li>
                <Link href="/libro-reclamaciones" className="text-gray-400 hover:text-white transition-colors">
                  Libro de reclamaciones
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Síguenos</h3>
            {socialLinks.length > 0 ? (
              <div className="flex space-x-4">
                {socialLinks.map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Próximamente en redes sociales
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} {settings.site_name}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}