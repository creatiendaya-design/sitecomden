// scripts/migrate-customizable-size-guides.ts
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface LegacyColumn {
  key: string;
  label: string;
}
interface LegacyRow {
  size: string;
  values: Record<string, number>;
}
interface LegacySizeGuide {
  unit: "cm" | "in";
  columns: LegacyColumn[];
  rows: LegacyRow[];
  notes?: string;
}

async function main() {
  // Some installations no longer have the legacy column. Tolerate that.
  let templates: Array<{
    id: string;
    name: string;
    sizeGuide: Prisma.JsonValue | null;
    products: { id: string }[];
  }>;
  try {
    templates = await prisma.$queryRaw<typeof templates>`
      SELECT t.id, t.name, t."sizeGuide",
        COALESCE(json_agg(json_build_object('id', p.id))
          FILTER (WHERE p.id IS NOT NULL), '[]')::jsonb AS products
      FROM "CustomizableTemplate" t
      LEFT JOIN "Product" p ON p."customizableTemplateId" = t.id
      WHERE t."sizeGuide" IS NOT NULL
      GROUP BY t.id;
    `;
  } catch {
    console.warn(
      "⚠ CustomizableTemplate.sizeGuide column not found — migration already ran (or column was dropped). Nothing to do.",
    );
    return;
  }

  if (templates.length === 0) {
    console.log("✓ No legacy size guides found — nothing to migrate.");
    return;
  }

  let createdCount = 0;
  let assignedCount = 0;

  for (const tpl of templates) {
    const legacy = tpl.sizeGuide as unknown as LegacySizeGuide;
    if (!legacy || !Array.isArray(legacy.rows)) continue;

    const tabs =
      legacy.notes && legacy.notes.trim()
        ? [
            {
              id: crypto.randomUUID(),
              title: "Notas",
              imageUrl: null,
              intro: legacy.notes,
              markers: [],
            },
          ]
        : [];

    const created = await prisma.sizeGuide.create({
      data: {
        name: `Guía de ${tpl.name}`,
        unit: legacy.unit === "in" ? "IN" : "CM",
        tabs: tabs as unknown as Prisma.InputJsonValue,
        table: {
          columns: legacy.columns ?? [],
          rows: (legacy.rows ?? []).map((r) => ({
            size: r.size,
            values: r.values,
          })),
        } as unknown as Prisma.InputJsonValue,
        active: true,
      },
    });
    createdCount++;

    if (tpl.products.length > 0) {
      const updated = await prisma.product.updateMany({
        where: {
          id: { in: tpl.products.map((p) => p.id) },
          sizeGuideId: null,
        },
        data: { sizeGuideId: created.id },
      });
      assignedCount += updated.count;
      console.log(
        `✓ ${tpl.name} → ${created.id} (${updated.count}/${tpl.products.length} products linked)`,
      );
    } else {
      console.log(`✓ ${tpl.name} → ${created.id} (no products linked)`);
    }
  }

  console.log(
    `\nDone. Created ${createdCount} size guide(s), assigned ${assignedCount} product link(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
