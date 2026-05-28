/**
 * llms-full.txt — the "expanded" companion to llms.txt (llmstxt.org spec).
 *
 * Instead of just listing URLs, this endpoint lists every active product
 * with name, price, stock summary and a deep-link to its markdown variant
 * (/productos/[slug].md). Lets LLM crawlers prime their index in one shot
 * without crawling product-by-product.
 *
 * Capped at 2000 products to keep the file under typical bot read limits
 * (~5 MB). Beyond that, the sitemap is still authoritative.
 */

import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1h.

const MAX_PRODUCTS = 2000;

export async function GET(): Promise<Response> {
  const settings = await getSiteSettings();
  const baseUrl = settings.site_url.replace(/\/$/, "");
  const currency = settings.default_currency || "PEN";

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        shortDescription: true,
        basePrice: true,
        compareAtPrice: true,
        stock: true,
        sku: true,
        hasVariants: true,
        variants: {
          where: { active: true },
          select: { price: true, stock: true },
          orderBy: { price: "asc" },
        },
        categories: {
          select: { category: { select: { slug: true, name: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_PRODUCTS,
    }),
  ]);

  const lines: string[] = [];

  lines.push(`# ${settings.site_name} — catálogo completo`);
  lines.push("");
  lines.push(`> ${settings.seo_home_description}`);
  lines.push("");
  lines.push(
    `Listado de ${products.length} productos activos (límite ${MAX_PRODUCTS}). ` +
      `Cada entrada enlaza a la ficha en markdown (.md) y a la URL canónica HTML.`,
  );
  lines.push("");
  lines.push(`- Moneda: ${currency}`);
  lines.push(`- Envío: a todo el Perú`);
  lines.push(
    `- Pagos: Visa, Mastercard, Amex, Yape, Plin, PayPal, Contra entrega`,
  );
  lines.push("");

  // Group products by primary category so the file reads like a catalog.
  const byCategory = new Map<string, typeof products>();
  const UNCATEGORIZED = "__uncategorized__";
  for (const p of products) {
    const key = p.categories[0]?.category.slug ?? UNCATEGORIZED;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }

  for (const cat of categories) {
    const group = byCategory.get(cat.slug);
    if (!group || group.length === 0) continue;

    lines.push(`## ${cat.name}`);
    lines.push("");
    if (cat.description) {
      lines.push(`> ${cat.description.replace(/\s+/g, " ").trim()}`);
      lines.push("");
    }
    lines.push(`Categoría: ${baseUrl}/categoria/${cat.slug}`);
    lines.push("");

    for (const p of group) {
      lines.push(formatProductLine(p, baseUrl, currency));
    }
    lines.push("");
  }

  // Trailing bucket for products without a category.
  const orphans = byCategory.get(UNCATEGORIZED);
  if (orphans && orphans.length > 0) {
    lines.push(`## Otros`);
    lines.push("");
    for (const p of orphans) {
      lines.push(formatProductLine(p, baseUrl, currency));
    }
    lines.push("");
  }

  lines.push("## Optional");
  lines.push("");
  lines.push(`- [Índice corto](${baseUrl}/llms.txt)`);
  lines.push(`- [Sitemap XML](${baseUrl}/sitemap.xml)`);
  lines.push("");

  const body = lines.join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

type ProductRow = {
  slug: string;
  name: string;
  shortDescription: string | null;
  basePrice: unknown;
  compareAtPrice: unknown;
  stock: number;
  sku: string | null;
  hasVariants: boolean;
  variants: Array<{ price: unknown; stock: number }>;
};

function formatProductLine(
  product: ProductRow,
  baseUrl: string,
  currency: string,
): string {
  const base = Number(product.basePrice);
  let price = base;
  let stock = product.stock;
  if (product.hasVariants && product.variants.length > 0) {
    price = Number(product.variants[0].price);
    stock = product.variants.reduce((s, v) => s + v.stock, 0);
  }
  const priceLabel = `${currency} ${price.toFixed(2)}`;
  const stockLabel = stock > 0 ? "En stock" : "Agotado";
  const desc = (product.shortDescription ?? "").replace(/\s+/g, " ").trim();
  const skuPart = product.sku ? ` · SKU ${product.sku}` : "";

  return (
    `- [${product.name}](${baseUrl}/productos/${product.slug}.md) ` +
    `(${baseUrl}/productos/${product.slug}) — ${priceLabel} · ${stockLabel}${skuPart}` +
    (desc ? `\n  ${desc}` : "")
  );
}
