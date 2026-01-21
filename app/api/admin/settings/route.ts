import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        OR: [
          { category: "seo" },
          { category: "general" },
          { category: "contact" },
          { category: "social" },
        ],
      },
    });

    // Convertir array a objeto para facilitar acceso
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ settings: settingsObject });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // ✅ KEYS QUE SE MANEJAN POR SEPARADO (no actualizar aquí)
    const excludedKeys = [
      'site_logo',
      'site_favicon', 
      'seo_home_og_image'
    ];

    // Actualizar o crear cada setting (excepto las imágenes)
    const updates = Object.entries(data)
      .filter(([key]) => !excludedKeys.includes(key)) // ✅ Filtrar keys excluidas
      .map(([key, value]) => {
        const category = getCategoryFromKey(key);
        
        return prisma.setting.upsert({
          where: { key },
          update: {
            value: value as any,
            category,
          },
          create: {
            key,
            value: value as any,
            category,
          },
        });
      });

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}

// Determinar categoría según el key
function getCategoryFromKey(key: string): string {
  if (key.startsWith("seo_")) return "seo";
  if (key.startsWith("social_")) return "social";
  if (key.startsWith("contact_")) return "contact";
  return "general";
}