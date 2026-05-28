/**
 * llms.txt — emerging standard (llmstxt.org) that gives generative engines
 * a hand-curated, markdown-formatted index of the most important content
 * on the site. Faster + cleaner to ingest than crawling the full sitemap.
 *
 * Served as plain text under Content-Type: text/plain; charset=utf-8 at
 * https://<site>/llms.txt.
 */

import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1h — index is cheap to refresh.

function escape(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

export async function GET(): Promise<Response> {
  const settings = await getSiteSettings();
  const baseUrl = settings.site_url.replace(/\/$/, "");

  // Load top-level public collections + active static pages + policies +
  // a sample of active products. We cap each list so the file stays small
  // (LLM crawlers truncate very long files); the full catalog is still
  // available via sitemap.xml referenced at the bottom.
  const [categories, pages, policies, productCount] = await Promise.all([
    prisma.category.findMany({
      where: { active: true, parentId: null },
      select: { slug: true, name: true, description: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.page.findMany({
      where: { active: true, noIndex: false },
      select: { slug: true, title: true, description: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.policy.findMany({
      where: { active: true, noIndex: false },
      select: { slug: true, title: true, seoDescription: true },
      orderBy: { title: "asc" },
    }),
    prisma.product.count({ where: { active: true } }),
  ]);

  const lines: string[] = [];

  // Header — title + blurb. Required by the spec.
  lines.push(`# ${settings.site_name}`);
  lines.push("");
  lines.push(`> ${escape(settings.seo_home_description)}`);
  lines.push("");
  lines.push(
    `Tienda online peruana con ${productCount} productos activos. ` +
      `Envío a todo el Perú con Yape, Plin, tarjeta (Culqi), PayPal y contra entrega. ` +
      `Comprobantes electrónicos SUNAT (boleta / factura).`,
  );
  lines.push("");

  // Key entry points.
  lines.push("## Páginas principales");
  lines.push("");
  lines.push(`- [Inicio](${baseUrl}/): catálogo y ofertas destacadas`);
  lines.push(`- [Todos los productos](${baseUrl}/productos): catálogo completo`);
  lines.push(`- [Contacto](${baseUrl}/contacto): soporte al cliente`);
  lines.push(
    `- [Libro de reclamaciones](${baseUrl}/libro-reclamaciones): registro oficial PE`,
  );
  lines.push("");

  if (categories.length > 0) {
    lines.push("## Categorías");
    lines.push("");
    for (const cat of categories) {
      const desc = escape(cat.description);
      const suffix = desc ? `: ${desc}` : "";
      lines.push(`- [${cat.name}](${baseUrl}/categoria/${cat.slug})${suffix}`);
    }
    lines.push("");
  }

  if (pages.length > 0) {
    lines.push("## Información");
    lines.push("");
    for (const page of pages) {
      const desc = escape(page.description);
      const suffix = desc ? `: ${desc}` : "";
      lines.push(`- [${page.title}](${baseUrl}/${page.slug})${suffix}`);
    }
    lines.push("");
  }

  if (policies.length > 0) {
    lines.push("## Políticas");
    lines.push("");
    for (const policy of policies) {
      const desc = escape(policy.seoDescription);
      const suffix = desc ? `: ${desc}` : "";
      lines.push(
        `- [${policy.title}](${baseUrl}/politicas/${policy.slug})${suffix}`,
      );
    }
    lines.push("");
  }

  // Optional — additional resources block per spec.
  lines.push("## Optional");
  lines.push("");
  lines.push(
    `- [Catálogo completo en markdown](${baseUrl}/llms-full.txt): ` +
      `lista de los productos activos con precio, stock y enlace a su .md`,
  );
  lines.push(
    `- Cada producto está disponible en markdown en ` +
      `\`${baseUrl}/productos/<slug>.md\``,
  );
  lines.push(`- [Sitemap completo](${baseUrl}/sitemap.xml)`);
  lines.push(`- [robots.txt](${baseUrl}/robots.txt)`);
  if (settings.contact_email) {
    lines.push(`- Contacto: ${settings.contact_email}`);
  }
  lines.push("");

  const body = lines.join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Cache for an hour at the edge; bots re-fetch periodically.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
