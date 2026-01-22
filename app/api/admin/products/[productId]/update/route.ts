import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

    // ✅ Usar transacción para manejar producto + categorías + variantes de forma atómica
    const product = await prisma.$transaction(async (tx) => {
      // 1. Actualizar producto base
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

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: productUpdate,
      });

      // 2. ✅ NUEVO: Actualizar relación con categorías
      // Eliminar relaciones existentes
      await tx.productCategory.deleteMany({
        where: { productId },
      });

      // Crear nueva relación si hay categoryId
      if (data.categoryId) {
        await tx.productCategory.create({
          data: {
            productId,
            categoryId: data.categoryId,
          },
        });
      }

      // 3. Si tiene variantes, gestionar opciones y variantes
      if (data.hasVariants && data.options && data.variants) {
        // Eliminar opciones y variantes existentes
        await tx.productVariant.deleteMany({
          where: { productId },
        });
        await tx.productOptionValue.deleteMany({
          where: {
            option: {
              productId,
            },
          },
        });
        await tx.productOption.deleteMany({
          where: { productId },
        });

        // Crear nuevas opciones
        for (let i = 0; i < data.options.length; i++) {
          const option = data.options[i];
          await tx.productOption.create({
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
          await tx.productVariant.create({
            data: {
              productId,
              sku: variant.sku || `${updatedProduct.slug}-${Date.now()}`,
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

      return updatedProduct;
    });

    // ✅ NUEVO: Revalidar rutas para actualizar caché en producción
    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${productId}`);
    revalidatePath(`/productos/${product.slug}`);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}