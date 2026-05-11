import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { response: authResponse } = await requirePermission("newsletter:view");
  if (authResponse) return authResponse;

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, inactive, today, thisWeek, thisMonth] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { active: true } }),
      prisma.newsletterSubscriber.count({ where: { active: false } }),
      prisma.newsletterSubscriber.count({
        where: { subscribedAt: { gte: startOfToday } },
      }),
      prisma.newsletterSubscriber.count({
        where: { subscribedAt: { gte: startOfWeek } },
      }),
      prisma.newsletterSubscriber.count({
        where: { subscribedAt: { gte: startOfMonth } },
      }),
    ]);

    return NextResponse.json({
      stats: { total, active, inactive, today, thisWeek, thisMonth },
    });
  } catch (error) {
    console.error("Error fetching newsletter stats:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
