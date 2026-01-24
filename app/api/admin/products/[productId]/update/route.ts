import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { updateProductSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeImagesForSave } from "@/lib/image-utils";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("products.update");
  if (authResponse) return authResponse;

  try {
    const { productId } = await params;
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = updateProductSchema.parse(data);

    // Normalizar imágenes automáticamente
    const normalizedImages = normalizeImagesForSave(validatedData.images);

    // ✅ Usar transacción para manejar producto + categorías + variantes de forma atómica
    const product = await prisma.$transaction(async (tx) => {
      // 1. Actualizar producto base
      const productUpdate: any = {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description || null,
        shortDescription: validatedData.shortDescription || null,
        basePrice: validatedData.basePrice,
        compareAtPrice: validatedData.compareAtPrice || null,
        images: normalizedImages,
        active: validatedData.active ?? true,
        featured: validatedData.featured ?? false,
        hasVariants: validatedData.hasVariants,
        metaTitle: validatedData.metaTitle || null,
        metaDescription: validatedData.metaDescription || null,
      };

      // Si no tiene variantes, actualizar stock y SKU del producto
      if (!validatedData.hasVariants) {
        productUpdate.stock = validatedData.stock;
        productUpdate.sku = validatedData.sku || null;
      } else {
        productUpdate.stock = 0;
        productUpdate.sku = null;
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: productUpdate,
      });

      // 2. Actualizar relación con categorías
      await tx.productCategory.deleteMany({
        where: { productId },
      });

      if (validatedData.categoryId) {
        await tx.productCategory.create({
          data: {
            productId,
            categoryId: validatedData.categoryId,
          },
        });
      }

      // 3. Si tiene variantes, gestionar opciones y variantes
      if (validatedData.hasVariants && data.options && data.variants) {
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

    console.log(`✅ Producto actualizado por usuario ${user.id}:`, product.name);

    // Revalidar rutas para actualizar caché en producción
    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${productId}`);
    revalidatePath(`/productos/${product.slug}`);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    
    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}