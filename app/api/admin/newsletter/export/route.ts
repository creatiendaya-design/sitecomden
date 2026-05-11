import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const { response: authResponse } = await requirePermission("newsletter:export");
  if (authResponse) return authResponse;

  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: "desc" },
      select: {
        email: true,
        name: true,
        active: true,
        subscribedAt: true,
        unsubscribedAt: true,
      },
    });

    const headers = [
      "Email",
      "Nombre",
      "Estado",
      "Fecha Suscripción",
      "Fecha Desuscripción",
    ];

    const rows = subscribers.map((s) => [
      escapeCsvField(s.email),
      escapeCsvField(s.name),
      s.active ? "Activo" : "Inactivo",
      s.subscribedAt.toISOString(),
      s.unsubscribedAt ? s.unsubscribedAt.toISOString() : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const date = new Date().toISOString().split("T")[0];
    const filename = `newsletter-subscribers-${date}.csv`;
    const BOM = "﻿";

    return new NextResponse(BOM + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting newsletter subscribers:", error);
    return NextResponse.json(
      { error: "Error al exportar suscriptores" },
      { status: 500 }
    );
  }
}
