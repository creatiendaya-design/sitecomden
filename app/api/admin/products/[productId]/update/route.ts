import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeImagesForSave } from "@/lib/image-utils";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const data = await request.json();

    // Normalizar imágenes automáticamente
    const normalizedImages = normalizeImagesForSave(data.images);

    // Actualizar producto base
    const productUpdate: any = {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      shortDescription: data.shortDescription || null,
      basePrice: data.basePrice,
      compareAtPrice: data.compareAtPrice || null,
      images: normalizedImages,
      active: data.active ?? true,
      featured: data.featured ?? false,
      hasVariants: data.hasVariants,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
    };

    // Si no tiene variantes, actualizar stock y SKU del producto
    if (!data.hasVariants) {
      productUpdate.stock = data.stock;
      productUpdate.sku = data.sku || null;
    } else {
      productUpdate.stock = 0;
      productUpdate.sku = null;
    }

    // Actualizar producto
    const product = await prisma.product.update({
      where: { id: productId },
      data: productUpdate,
    });

    // Si tiene variantes, gestionar opciones y variantes
    if (data.hasVariants && data.options && data.variants) {
      // Eliminar opciones y variantes existentes
      await prisma.productVariant.deleteMany({
        where: { productId },
      });
      await prisma.productOptionValue.deleteMany({
        where: {
          option: {
            productId,
          },
        },
      });
      await prisma.productOption.deleteMany({
        where: { productId },
      });

      // Crear nuevas opciones
      for (let i = 0; i < data.options.length; i++) {
        const option = data.options[i];
        await prisma.productOption.create({
          data: {
            productId,
            name: option.name,
            position: i,
            values: {
              create: option.values.map((value: string, j: number) => ({
                value,
                position: j,
              })),
            },
          },
        });
      }

      // Crear nuevas variantes
      for (const variant of data.variants) {
        await prisma.productVariant.create({
          data: {
            productId,
            sku: variant.sku || `${product.slug}-${Date.now()}`,
            options: variant.options,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice || null,
            stock: variant.stock,
            image: variant.image || null,
            active: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}