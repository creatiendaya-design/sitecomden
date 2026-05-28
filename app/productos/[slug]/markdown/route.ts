/**
 * Product page rendered as plain markdown for LLM crawlers.
 *
 * Lives at /productos/[slug]/markdown internally and is also exposed under
 * the LLM-friendly URL /productos/[slug].md via a rewrite in next.config.ts.
 * The HTML product page links to it with
 *   <link rel="alternate" type="text/markdown" href="…">
 * so bots that honor alternates (GPTBot, ClaudeBot, PerplexityBot) discover it.
 */

import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { htmlToMarkdown } from "@/lib/seo/html-to-markdown";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min — cheap, refreshes quickly on edits.

interface RouteParams {
  params: Promise<{ slug: string }>;
}

function formatPriceLine(
  price: number,
  comparePrice: number | null,
  currency: string,
): string {
  const base = `${currency} ${price.toFixed(2)}`;
  if (comparePrice !== null && comparePrice > price) {
    const discount = Math.round((1 - price / comparePrice) * 100);
    return `${base} (antes ${currency} ${comparePrice.toFixed(2)}, -${discount}%)`;
  }
  return base;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;

  const [product, settings] = await Promise.all([
    prisma.product.findUnique({
      where: { slug, active: true },
      include: {
        categories: { include: { category: true } },
        variants: {
          where: { active: true },
          orderBy: { price: "asc" },
        },
        reviews: {
          where: { approved: true },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            customerName: true,
            rating: true,
            title: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    }),
    getSiteSettings(),
  ]);

  if (!product) {
    return new Response("Producto no encontrado", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const baseUrl = settings.site_url.replace(/\/$/, "");
  const currency = settings.default_currency || "PEN";

  const basePrice = Number(product.basePrice);
  const compareAtPrice = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;

  // Stock + price summary takes variants into account.
  let displayPrice = basePrice;
  let displayCompare = compareAtPrice;
  if (product.hasVariants && product.variants.length > 0) {
    const cheapest = product.variants[0];
    displayPrice = Number(cheapest.price);
    displayCompare = cheapest.compareAtPrice
      ? Number(cheapest.compareAtPrice)
      : null;
  }

  const totalStock = product.hasVariants
    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;

  const stockLine =
    totalStock > 0
      ? `En stock${totalStock < 50 ? ` (${totalStock} disponibles)` : ""}`
      : "Agotado";

  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────
  lines.push(`# ${product.name}`);
  lines.push("");
  lines.push(`URL: ${baseUrl}/productos/${product.slug}`);
  lines.push(`Precio: ${formatPriceLine(displayPrice, displayCompare, currency)}`);
  lines.push(`Disponibilidad: ${stockLine}`);
  if (product.sku) lines.push(`SKU: ${product.sku}`);

  const categories = product.categories.map((pc) => pc.category.name);
  if (categories.length > 0) {
    lines.push(`Categorías: ${categories.join(", ")}`);
  }

  lines.push("");

  // ── Short description ────────────────────────────────────────────────
  if (product.shortDescription) {
    lines.push(product.shortDescription);
    lines.push("");
  }

  // ── Long description (HTML → markdown) ───────────────────────────────
  const longMd = htmlToMarkdown(product.description);
  if (longMd) {
    lines.push("## Descripción");
    lines.push("");
    lines.push(longMd);
    lines.push("");
  }

  // ── Variants ─────────────────────────────────────────────────────────
  if (product.hasVariants && product.variants.length > 0) {
    lines.push("## Variantes");
    lines.push("");
    for (const v of product.variants) {
      const label = Object.entries((v.options as Record<string, string>) ?? {})
        .map(([k, val]) => `${k}: ${val}`)
        .join(", ");
      const price = Number(v.price).toFixed(2);
      const stock = v.stock > 0 ? `${v.stock} en stock` : "agotada";
      const skuPart = v.sku ? ` — SKU: ${v.sku}` : "";
      lines.push(`- ${label || "(sin opciones)"} — ${currency} ${price} — ${stock}${skuPart}`);
    }
    lines.push("");
  }

  // ── Images ───────────────────────────────────────────────────────────
  const images = Array.isArray(product.images)
    ? (product.images as string[]).filter(Boolean)
    : [];
  if (images.length > 0) {
    lines.push("## Imágenes");
    lines.push("");
    for (const url of images.slice(0, 8)) {
      lines.push(`- ${url}`);
    }
    lines.push("");
  }

  // ── Reviews ──────────────────────────────────────────────────────────
  if (product.reviews.length > 0) {
    const avg =
      product.reviews.reduce((s, r) => s + r.rating, 0) /
      product.reviews.length;
    lines.push("## Reseñas");
    lines.push("");
    lines.push(
      `Promedio: ${avg.toFixed(1)} / 5 (${product.reviews.length} reseñas mostradas)`,
    );
    lines.push("");
    for (const r of product.reviews) {
      const titlePart = r.title ? `**${r.title}** — ` : "";
      const body = r.comment ? ` ${r.comment.replace(/\s+/g, " ").trim()}` : "";
      lines.push(
        `- ${titlePart}${r.rating}/5 por ${r.customerName}:${body}`,
      );
    }
    lines.push("");
  }

  // ── Commerce metadata (helps Copilot Shopping / Perplexity comparisons) ─
  lines.push("## Información de compra");
  lines.push("");
  lines.push(`- Tienda: ${settings.site_name} (${baseUrl})`);
  lines.push(`- Moneda: ${currency}`);
  lines.push(
    "- Métodos de pago: Visa, Mastercard, American Express, Yape, Plin, PayPal, Contra entrega",
  );
  lines.push("- Envío: a todo el Perú");
  lines.push("- Devoluciones: 7 días desde la entrega");
  if (settings.contact_email) {
    lines.push(`- Contacto: ${settings.contact_email}`);
  }
  lines.push("");

  const body = lines.join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      // Helps bots understand this is the canonical text representation.
      Link: `<${baseUrl}/productos/${product.slug}>; rel="canonical"`,
    },
  });
}
