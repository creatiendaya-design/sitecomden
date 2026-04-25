import { Facebook, Instagram, Twitter } from "lucide-react"
import { getSiteSettings } from "@/lib/site-settings"
import { getMenuBySlug } from "@/lib/menus/get-menu-by-slug"
import { resolveMenuItemHref } from "@/lib/menus/resolve-link"
import Link from "next/link"

export default async function Footer() {
  const [settings, menu] = await Promise.all([
    getSiteSettings(),
    getMenuBySlug("footer"),
  ])

  // Each root item with children becomes a link column. Root items WITHOUT
  // children are skipped here (they would only have a single link, not enough
  // to fill a column header — admins should put those under a parent).
  const linkColumns = (menu?.items ?? []).filter(
    (root) => root.children.length > 0,
  )

  const socialLinks = [
    { href: settings.social_facebook, Icon: Facebook, label: "Facebook" },
    { href: settings.social_instagram, Icon: Instagram, label: "Instagram" },
    { href: settings.social_twitter, Icon: Twitter, label: "Twitter" },
  ].filter((link) => link.href)

  // Total columns: about + N footer-menu columns + social. Cap layout at 5
  // grid columns so wider footers still wrap nicely.
  const columnsClass =
    linkColumns.length >= 3
      ? "lg:grid-cols-5"
      : linkColumns.length === 2
        ? "lg:grid-cols-4"
        : linkColumns.length === 1
          ? "lg:grid-cols-3"
          : "lg:grid-cols-2"

  return (
    <footer className="border-t border-gray-800 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className={`grid gap-8 sm:grid-cols-2 ${columnsClass}`}>
          {/* About */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="mb-4 text-lg font-semibold text-white">
              {settings.site_name}
            </h3>
            <p className="text-sm text-gray-400">
              {settings.seo_home_description}
            </p>
          </div>

          {/* Dynamic columns from the "footer" menu. Each root with children
              becomes a column. */}
          {linkColumns.map((column) => (
            <div key={column.id}>
              <h3 className="mb-4 text-lg font-semibold text-white">
                {column.label}
              </h3>
              <ul className="space-y-2 text-sm">
                {column.children.map((child) => {
                  const href = resolveMenuItemHref(child)
                  if (!href) return null
                  const isExternal = child.linkType === "EXTERNAL_URL"
                  const className =
                    "text-gray-400 hover:text-white transition-colors"

                  return (
                    <li key={child.id}>
                      {isExternal ? (
                        <a
                          href={href}
                          target={child.openInNewTab ? "_blank" : undefined}
                          rel={
                            child.openInNewTab
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className={className}
                        >
                          {child.label}
                        </a>
                      ) : (
                        <Link
                          href={href}
                          target={child.openInNewTab ? "_blank" : undefined}
                          className={className}
                        >
                          {child.label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          {/* Social */}
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
          <p>
            © {new Date().getFullYear()} {settings.site_name}. Todos los
            derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
