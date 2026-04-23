import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateGenericCsv } from "@/lib/csv-generic";
import { generateShopifyCsv } from "@/lib/csv-shopify";

export async function GET(request: Request) {
  const { response: authResponse } = await requirePermission("products:view");
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "generic";
  const estado = searchParams.get("estado") ?? "all";
  const categoryId = searchParams.get("categoryId") ?? "";

  const where: Record<string, unknown> = {};
  if (estado === "active") where.active = true;
  if (estado === "draft") where.active = false;
  if (categoryId) where.categories = { some: { categoryId } };

  const products = await prisma.product.findMany({
    where,
    include: {
      categories: { include: { category: { select: { slug: true } } } },
      variants: { where: { active: true } },
      options: { include: { values: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const csvString = format === "shopify"
    ? generateShopifyCsv(products)
    : generateGenericCsv(products);

  const date = new Date().toISOString().split("T")[0];
  const filename = `productos-${date}.csv`;
  const BOM = "﻿";

  return new NextResponse(BOM + csvString, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
