import { prisma } from "@/lib/db";

async function checkProductImages() {
  try {
    // Buscar productos con "pant" en el nombre
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: "pant",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        images: true,
        slug: true,
      },
      take: 5,
    });

    console.log("\n=== PRODUCTOS ENCONTRADOS ===");
    products.forEach((product) => {
      console.log("\nProducto:", product.name);
      console.log("Slug:", product.slug);
      console.log("Images type:", typeof product.images);
      console.log("Is Array:", Array.isArray(product.images));
      console.log("Images:", JSON.stringify(product.images, null, 2));
      
      if (Array.isArray(product.images)) {
        console.log("Cantidad de imágenes:", product.images.length);
        product.images.forEach((img, idx) => {
          console.log(`  Imagen ${idx}:`, typeof img, img);
        });
      }
    });

    console.log("\n=== FIN ===\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductImages();