import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { response: authResponse } = await requirePermission("newsletter:view");
  if (authResponse) return authResponse;

  try {
    // `take` es un tope de seguridad: la UI busca/filtra sobre la lista
    // completa en el cliente (no pagina server-side todavía), así que sin
    // límite esta ruta podría traer toda la tabla de suscriptores en cada
    // carga de /admin/newsletter a medida que la lista crece sin límite.
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: "desc" },
      take: 2000,
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        subscribedAt: true,
        unsubscribedAt: true,
      },
    });

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error("Error fetching newsletter subscribers:", error);
    return NextResponse.json(
      { error: "Error al obtener suscriptores" },
      { status: 500 }
    );
  }
}
