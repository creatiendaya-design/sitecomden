import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { response: authResponse } = await requirePermission("newsletter:view");
  if (authResponse) return authResponse;

  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: "desc" },
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
