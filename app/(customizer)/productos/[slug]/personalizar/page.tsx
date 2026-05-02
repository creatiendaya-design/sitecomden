// app/(customizer)/productos/[slug]/personalizar/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCustomizableTemplate } from "@/actions/customizer";
import { CustomizerLayout } from "@/components/customizer/CustomizerLayout";
import { getAllProductImages } from "@/lib/image-utils";
import type { MockupOverrides } from "@/lib/customizer/types";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variantId?: string; cartItemId?: string; preview?: string }>;
}

export const dynamic = "force-dynamic";

export default async function PersonalizarPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { variantId, cartItemId, preview } = await searchParams;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: { where: { active: true } },
      options: {
        include: {
          values: { orderBy: { position: "asc" } },
        },
        orderBy: { position: "asc" },
      },
      reviews: { select: { rating: true } },
    },
  });

  if (!product) notFound();
  if (!product.customizableTemplateId) {
    redirect(`/productos/${slug}`);
  }

  const template = await getCustomizableTemplate(product.customizableTemplateId);
  if (!template) notFound();

  return (
    <CustomizerLayout
      product={{
        id: product.id,
        slug: product.slug,
        name: product.name,
        basePrice: Number(product.basePrice),
        images: getAllProductImages(product.images).map((img) => img.url),
        options: product.options.map((o) => ({
          id: o.id,
          name: o.name,
          displayStyle: o.displayStyle as "DROPDOWN" | "BUTTONS" | "SWATCHES",
          values: o.values.map((v) => ({
            id: v.id,
            value: v.value,
            swatchType: v.swatchType as "NONE" | "COLOR" | "IMAGE",
            colorHex: v.colorHex ?? null,
            swatchImage: v.swatchImage ?? null,
          })),
        })),
        variants: product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          stock: v.stock,
          price: Number(v.price ?? product.basePrice),
          options: (v.options as Record<string, string>) ?? {},
        })),
        reviewsCount: product.reviews.length,
        reviewsAvg:
          product.reviews.length > 0
            ? product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length
            : 0,
        mockupOverrides: (product.customizableMockupOverrides as MockupOverrides | null) ?? null,
      }}
      template={template}
      initialVariantId={variantId ?? null}
      cartItemId={cartItemId ?? null}
      previewMode={preview === "admin"}
    />
  );
}
