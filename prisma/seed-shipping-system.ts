import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RateSeed {
  name: string;
  description?: string;
  category?: string;
  baseCost: number;
  estimatedDays?: string;
  timeWindow?: string;
  carrier?: string;
  freeShippingMin?: number;
  active?: boolean;
}

async function ensureZone(name: string, description: string) {
  let zone = await prisma.shippingZone.findFirst({ where: { name } });
  if (!zone) {
    zone = await prisma.shippingZone.create({
      data: { name, description, active: true },
    });
  }
  return zone;
}

async function assignDistricts(zoneId: string, codes: string[]) {
  const districts = await prisma.district.findMany({
    where: { code: { in: codes } },
  });
  await prisma.shippingZoneDistrict.createMany({
    data: districts.map((d) => ({
      shippingZoneId: zoneId,
      districtCode: d.code,
    })),
    skipDuplicates: true,
  });
  return districts.length;
}

async function seedRates(zoneId: string, rates: RateSeed[]) {
  const existingCount = await prisma.shippingRate.count({ where: { zoneId } });
  if (existingCount > 0) {
    console.log(`      ℹ️  Ya hay ${existingCount} tarifas, saltando seed`);
    return 0;
  }

  for (let i = 0; i < rates.length; i++) {
    const rate = rates[i];
    await prisma.shippingRate.create({
      data: {
        zoneId,
        name: rate.name,
        description: rate.description ?? null,
        category: rate.category ?? null,
        baseCost: rate.baseCost,
        estimatedDays: rate.estimatedDays ?? null,
        timeWindow: rate.timeWindow ?? null,
        carrier: rate.carrier ?? null,
        freeShippingMin: rate.freeShippingMin ?? null,
        active: rate.active ?? true,
        order: i,
      },
    });
  }
  return rates.length;
}

async function main() {
  console.log("🚀 Seeding sistema de envíos...\n");

  // 1. Lima Metropolitana
  console.log("📍 Lima Metropolitana");
  const zonaLima = await ensureZone(
    "Lima Metropolitana",
    "Zona central de Lima con entregas rápidas",
  );

  const distritosLima = [
    "150101", "150122", "150131", "150130", "150140", "150108",
    "150114", "150117", "150127", "150136", "150109", "150141",
    "150104", "150115", "150110",
  ];
  const limaCount = await assignDistricts(zonaLima.id, distritosLima);
  console.log(`   ✅ ${limaCount} distritos asignados`);

  const limaRates = await seedRates(zonaLima.id, [
    { name: "Standard Diurno", description: "Entrega en horario de oficina", baseCost: 15, estimatedDays: "2 días", timeWindow: "9am-6pm" },
    { name: "Standard Nocturno", description: "Entrega en horario nocturno", baseCost: 15, estimatedDays: "2 días", timeWindow: "7pm-10pm" },
    { name: "Express", description: "Entrega en 24 horas", baseCost: 25, estimatedDays: "24 horas", category: "Express" },
    { name: "Standard Gratis", description: "Envío gratis en compras mayores", baseCost: 0, freeShippingMin: 699, estimatedDays: "3 días" },
    { name: "Cruz del Sur", description: "Courier nacional confiable", baseCost: 25, estimatedDays: "2 días", carrier: "Cruz del Sur", category: "Couriers" },
    { name: "Shalom", description: "Envíos rápidos a nivel nacional", baseCost: 25, estimatedDays: "2 días", carrier: "Shalom", category: "Couriers" },
    { name: "Olva", description: "Courier económico", baseCost: 20, estimatedDays: "3 días", carrier: "Olva", category: "Couriers" },
  ]);
  console.log(`   ✅ ${limaRates} tarifas creadas\n`);

  // 2. Callao
  console.log("📍 Callao");
  const zonaCallao = await ensureZone(
    "Callao",
    "Provincia Constitucional del Callao",
  );

  const distritosCallao = [
    "070101", "070102", "070103", "070104", "070105", "070106", "070107",
  ];
  const callaoCount = await assignDistricts(zonaCallao.id, distritosCallao);
  console.log(`   ✅ ${callaoCount} distritos asignados`);

  const callaoRates = await seedRates(zonaCallao.id, [
    { name: "Express Callao", description: "Entrega en 24-48 horas", baseCost: 18, estimatedDays: "1-2 días" },
    { name: "Standard Callao", description: "Entrega en 2-3 días", baseCost: 12, estimatedDays: "2-3 días" },
    { name: "Gratis Callao", description: "Envío gratis en compras mayores", baseCost: 0, freeShippingMin: 500, estimatedDays: "3 días" },
  ]);
  console.log(`   ✅ ${callaoRates} tarifas creadas\n`);

  // 3. Arequipa
  console.log("📍 Arequipa");
  const zonaArequipa = await ensureZone(
    "Arequipa",
    "Región de Arequipa - Ciudad Blanca",
  );

  const distritosArequipa = [
    "040101", "040102", "040103", "040104", "040105",
    "040106", "040107", "040108", "040109",
  ];
  const arqCount = await assignDistricts(zonaArequipa.id, distritosArequipa);
  console.log(`   ✅ ${arqCount} distritos asignados`);

  const arqRates = await seedRates(zonaArequipa.id, [
    { name: "Cruz del Sur", description: "Envío seguro a Arequipa", baseCost: 30, estimatedDays: "3 días", carrier: "Cruz del Sur" },
    { name: "Shalom", description: "Courier rápido", baseCost: 30, estimatedDays: "3 días", carrier: "Shalom" },
    { name: "Olva", description: "Opción económica", baseCost: 25, estimatedDays: "4 días", carrier: "Olva" },
  ]);
  console.log(`   ✅ ${arqRates} tarifas creadas\n`);

  console.log("============================================================");
  console.log("🎉 Seed completado exitosamente");
  console.log("============================================================");
}

main()
  .catch((e) => {
    console.error("\n❌ ERROR:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
