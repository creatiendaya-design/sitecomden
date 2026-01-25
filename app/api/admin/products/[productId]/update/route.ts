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

    console.log("📝 Actualizando producto:", {
      productId,
      hasVariants: data.hasVariants,
      variantsCount: data.variants?.length || 0,
      optionsCount: data.options?.length || 0, // 🆕
      imagesReceived: data.images?.length || 0,
      categoryId: data.categoryId,
    });

    // ✅ NORMALIZAR IMÁGENES
    let normalizedImages: string[] = [];
    if (data.images && Array.isArray(data.images)) {
      normalizedImages = data.images.map((img: any) => {
        if (typeof img === "object" && img.url) {
          return img.url;
        }
        if (typeof img === "string") {
          return img;
        }
        return "";
      }).filter((url: string) => url !== "");
    }

    console.log("✅ Imágenes normalizadas para validación:", normalizedImages.length);

    // ✅ NORMALIZAR DATOS
    const normalizedData = {
      ...data,
      images: normalizedImages,
      basePrice: data.hasVariants ? 0 : (parseFloat(data.basePrice) || 0),
      stock: data.hasVariants ? 0 : (parseInt(data.stock) || 0),
      sku: data.hasVariants ? null : (data.sku || null),
      categoryId: data.categoryId && data.categoryId.trim() !== "" ? data.categoryId : null,
    };

    console.log("✅ Datos normalizados:", {
      categoryId: normalizedData.categoryId,
      hasVariants: normalizedData.hasVariants,
    });

    // ✅ VALIDACIÓN
    const validatedData = updateProductSchema.parse(normalizedData);

    // ✅ Normalizar imágenes para guardar
    const imagesToSave = normalizeImagesForSave(validatedData.images || []);

    // ✅ Usar transacción
    const product = await prisma.$transaction(async (tx) => {
      // 1. Actualizar producto base
      const productUpdate: any = {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description || null,
        shortDescription: validatedData.shortDescription || null,
        basePrice: validatedData.basePrice,
        compareAtPrice: validatedData.compareAtPrice || null,
        images: imagesToSave as any,
        active: validatedData.active ?? true,
        featured: validatedData.featured ?? false,
        hasVariants: validatedData.hasVariants,
        metaTitle: validatedData.metaTitle || null,
        metaDescription: validatedData.metaDescription || null,
        weight: validatedData.weight || null,
      };

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

      // 3. 🆕 Si tiene variantes, gestionar opciones CON SWATCHES y variantes
      if (validatedData.hasVariants && data.options && data.variants) {
        console.log("🔄 Actualizando opciones con swatches y variantes...");

        // ✅ OBTENER VARIANTES EXISTENTES
        const existingVariants = await tx.productVariant.findMany({
          where: { productId },
          select: {
            id: true,
            options: true,
            price: true,
            compareAtPrice: true,
            stock: true,
            sku: true,
            image: true,
            weight: true,
          },
        });

        console.log(`📦 Variantes existentes: ${existingVariants.length}`);

        // ✅ FUNCIÓN AUXILIAR: Generar clave única de opciones
        const getVariantKey = (options: any) => {
          return JSON.stringify(
            Object.keys(options)
              .sort()
              .reduce((acc, key) => {
                acc[key] = options[key];
                return acc;
              }, {} as any)
          );
        };

        // ✅ CREAR MAPA DE VARIANTES EXISTENTES
        const existingVariantsMap = new Map(
          existingVariants.map((v) => [
            getVariantKey(v.options),
            v,
          ])
        );

        // 🆕 ELIMINAR OPCIONES Y VALORES ANTIGUOS
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

        // 🆕 CREAR NUEVAS OPCIONES CON SWATCHES
        for (let i = 0; i < data.options.length; i++) {
          const option = data.options[i];
          
          const createdOption = await tx.productOption.create({
            data: {
              productId,
              name: option.name,
              displayStyle: option.displayStyle || "DROPDOWN", // 🆕 SWATCHES, BUTTONS, DROPDOWN
              position: i,
            },
          });

          // 🆕 Crear valores con swatches
          if (option.values && option.values.length > 0) {
            await tx.productOptionValue.createMany({
              data: option.values.map((value: any, j: number) => ({
                optionId: createdOption.id,
                value: typeof value === 'string' ? value : value.value,
                position: j,
                swatchType: value.swatchType || "NONE", // 🆕 NONE, COLOR, IMAGE
                colorHex: value.colorHex || null, // 🆕 #FF0000
                swatchImage: value.swatchImage || null, // 🆕 URL de imagen
              }))
            });
          }
        }

        // ✅ CREAR CONJUNTO DE VARIANTES NUEVAS
        const newVariantKeys = new Set(
          data.variants.map((v: any) => getVariantKey(v.options))
        );

        // ✅ ELIMINAR VARIANTES QUE YA NO EXISTEN
        const variantsToDelete = existingVariants
          .filter((v) => !newVariantKeys.has(getVariantKey(v.options)))
          .map((v) => v.id);

        if (variantsToDelete.length > 0) {
          console.log(`🗑️ Eliminando ${variantsToDelete.length} variantes obsoletas`);
          await tx.productVariant.deleteMany({
            where: {
              id: { in: variantsToDelete },
            },
          });
        }

        // ✅ ACTUALIZAR O CREAR VARIANTES
        let updatedCount = 0;
        let createdCount = 0;

        for (const newVariant of data.variants) {
          const variantKey = getVariantKey(newVariant.options);
          const existingVariant = existingVariantsMap.get(variantKey);

          const variantPrice = parseFloat(newVariant.price);
          const variantStock = parseInt(newVariant.stock) || 0;

          if (!variantPrice || variantPrice <= 0) {
            console.error("❌ Variante sin precio válido:", newVariant);
            throw new Error(
              `Variante ${JSON.stringify(newVariant.options)} debe tener un precio mayor a 0`
            );
          }

          const variantData = {
            options: newVariant.options as any,
            price: variantPrice,
            compareAtPrice: newVariant.compareAtPrice
              ? parseFloat(newVariant.compareAtPrice)
              : null,
            stock: variantStock,
            weight: newVariant.weight ? parseFloat(newVariant.weight) : null,
            image: newVariant.image || null,
            active: true,
          };

          if (existingVariant) {
            // ACTUALIZAR VARIANTE EXISTENTE
            console.log(`  🔄 Actualizando variante existente: ${JSON.stringify(newVariant.options)}`);
            
            await tx.productVariant.update({
              where: { id: existingVariant.id },
              data: {
                ...variantData,
                sku: newVariant.sku || existingVariant.sku,
              },
            });
            updatedCount++;
          } else {
            // CREAR VARIANTE NUEVA
            console.log(`  ➕ Creando variante nueva: ${JSON.stringify(newVariant.options)}`);

            const sku =
              newVariant.sku ||
              (() => {
                const optionValues = Object.values(newVariant.options).join("-");
                return `${updatedProduct.slug}-${optionValues}`
                  .toUpperCase()
                  .replace(/\s+/g, "-");
              })();

            await tx.productVariant.create({
              data: {
                productId,
                sku,
                ...variantData,
              },
            });
            createdCount++;
          }
        }

        console.log(`✅ Variantes procesadas:`);
        console.log(`   - Actualizadas: ${updatedCount}`);
        console.log(`   - Creadas: ${createdCount}`);
        console.log(`   - Eliminadas: ${variantsToDelete.length}`);
      } else if (!validatedData.hasVariants) {
        // Si hasVariants es false, eliminar todas las opciones y variantes
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
        await tx.productVariant.deleteMany({
          where: { productId },
        });
      }

      return updatedProduct;
    });

    console.log(`✅ Producto actualizado exitosamente por usuario ${user.id}:`, product.name);

    // Revalidar rutas
    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${productId}`);
    revalidatePath(`/productos/${product.slug}`);

    // Obtener producto completo
    const completeProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        options: {
          include: {
            values: {
              orderBy: { position: "asc" },
            },
          },
          orderBy: { position: "asc" },
        },
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, product: completeProduct });
  } catch (error) {
    console.error("❌ Error al actualizar producto:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: JSON.parse(error.message),
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}