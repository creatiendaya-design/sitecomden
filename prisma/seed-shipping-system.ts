import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding sistema de envíos...");
  console.log("");

  // 1. ZONA: Lima Metropolitana
  console.log("📍 Creando zona: Lima Metropolitana");
  
  let zonaLima = await prisma.shippingZone.findFirst({
    where: { name: "Lima Metropolitana" },
  });

  if (!zonaLima) {
    zonaLima = await prisma.shippingZone.create({
      data: {
        name: "Lima Metropolitana",
        description: "Zona central de Lima con entregas rápidas",
        active: true,
      },
    });
  }

  // Asignar distritos principales de Lima
  const distritosLima = [
    "150101", // Lima
    "150122", // Miraflores
    "150131", // San Isidro
    "150130", // San Borja
    "150140", // Santiago de Surco
    "150108", // Jesús María
    "150114", // Lince
    "150117", // Magdalena del Mar
    "150127", // Pueblo Libre
    "150136", // San Miguel
    "150109", // La Molina
    "150141", // Surquillo
    "150104", // Barranco
    "150115", // Los Olivos
    "150110", // Comas
  ];

  const districtRecordsLima = await prisma.district.findMany({
    where: { code: { in: distritosLima } },
  });

  await prisma.shippingZoneDistrict.createMany({
    data: districtRecordsLima.map((d) => ({
      shippingZoneId: zonaLima.id,
      districtCode: d.code,
    })),
    skipDuplicates: true,
  });

  console.log(`   ✅ ${districtRecordsLima.length} distritos asignados`);

  // Grupo 1: Envíos Standard
  console.log("   📦 Grupo: Envíos Standard");
  
  let grupoStandard = await prisma.shippingRateGroup.findFirst({
    where: {
      zoneId: zonaLima.id,
      name: "Envíos Standard",
    },
  });

  if (!grupoStandard) {
    grupoStandard = await prisma.shippingRateGroup.create({
      data: {
        zoneId: zonaLima.id,
        name: "Envíos Standard",
        description: "Opciones de envío estándar y express",
        order: 1,
        active: true,
      },
    });

    const tarifasStandard = [
      {
        name: "Standard Diurno",
        description: "Entrega en horario de oficina (9am-6pm)",
        baseCost: 15.0,
        estimatedDays: "2 días",
        timeWindow: "9am-6pm",
        active: true,
        order: 1,
      },
      {
        name: "Standard Nocturno",
        description: "Entrega en horario nocturno (7pm-10pm)",
        baseCost: 15.0,
        estimatedDays: "2 días",
        timeWindow: "7pm-10pm",
        active: true,
        order: 2,
      },
      {
        name: "Express",
        description: "Entrega en 24 horas",
        baseCost: 25.0,
        estimatedDays: "24 horas",
        active: true,
        order: 3,
      },
      {
        name: "Standard Gratis",
        description: "Envío gratis en compras mayores",
        baseCost: 0.0,
        freeShippingMin: 699.0,
        estimatedDays: "3 días",
        active: true,
        order: 4,
      },
    ];

    for (const tarifa of tarifasStandard) {
      await prisma.shippingRate.create({
        data: {
          groupId: grupoStandard.id,
          ...tarifa,
        },
      });
    }
    console.log(`      ✅ ${tarifasStandard.length} tarifas creadas`);
  } else {
    console.log(`      ℹ️  Grupo ya existe, saltando...`);
  }

  // Grupo 2: Envíos por Courier
  console.log("   📦 Grupo: Envíos por Courier");
  
  let grupoCourier = await prisma.shippingRateGroup.findFirst({
    where: {
      zoneId: zonaLima.id,
      name: "Envíos por Courier",
    },
  });

  if (!grupoCourier) {
    grupoCourier = await prisma.shippingRateGroup.create({
      data: {
        zoneId: zonaLima.id,
        name: "Envíos por Courier",
        description: "Envíos con couriers reconocidos",
        order: 2,
        active: true,
      },
    });

    const tarifasCourier = [
      {
        name: "Cruz del Sur",
        description: "Courier nacional confiable",
        baseCost: 25.0,
        estimatedDays: "2 días",
        carrier: "Cruz del Sur",
        active: true,
        order: 1,
      },
      {
        name: "Shalom",
        description: "Envíos rápidos a nivel nacional",
        baseCost: 25.0,
        estimatedDays: "2 días",
        carrier: "Shalom",
        active: true,
        order: 2,
      },
      {
        name: "Olva",
        description: "Courier económico",
        baseCost: 20.0,
        estimatedDays: "3 días",
        carrier: "Olva",
        active: true,
        order: 3,
      },
      {
        name: "Gratis Cruz del Sur",
        description: "Envío gratis con Cruz del Sur",
        baseCost: 0.0,
        freeShippingMin: 699.0,
        estimatedDays: "3 días",
        carrier: "Cruz del Sur",
        active: true,
        order: 4,
      },
    ];

    for (const tarifa of tarifasCourier) {
      await prisma.shippingRate.create({
        data: {
          groupId: grupoCourier.id,
          ...tarifa,
        },
      });
    }
    console.log(`      ✅ ${tarifasCourier.length} tarifas creadas`);
  } else {
    console.log(`      ℹ️  Grupo ya existe, saltando...`);
  }

  console.log("");

  // 2. ZONA: Callao
  console.log("📍 Creando zona: Callao");
  
  let zonaCallao = await prisma.shippingZone.findFirst({
    where: { name: "Callao" },
  });

  if (!zonaCallao) {
    zonaCallao = await prisma.shippingZone.create({
      data: {
        name: "Callao",
        description: "Provincia Constitucional del Callao",
        active: true,
      },
    });
  }

  // Asignar distritos de Callao
  const distritosCallao = [
    "070101", // Callao
    "070102", // Bellavista
    "070103", // Carmen de la Legua Reynoso
    "070104", // La Perla
    "070105", // La Punta
    "070106", // Ventanilla
    "070107", // Mi Perú
  ];

  const districtRecordsCallao = await prisma.district.findMany({
    where: { code: { in: distritosCallao } },
  });

  await prisma.shippingZoneDistrict.createMany({
    data: districtRecordsCallao.map((d) => ({
      shippingZoneId: zonaCallao.id,
      districtCode: d.code,
    })),
    skipDuplicates: true,
  });

  console.log(`   ✅ ${districtRecordsCallao.length} distritos asignados`);

  // Grupo: Envíos Callao
  console.log("   📦 Grupo: Envíos Callao");
  
  let grupoCallao = await prisma.shippingRateGroup.findFirst({
    where: {
      zoneId: zonaCallao.id,
      name: "Envíos Callao",
    },
  });

  if (!grupoCallao) {
    grupoCallao = await prisma.shippingRateGroup.create({
      data: {
        zoneId: zonaCallao.id,
        name: "Envíos Callao",
        description: "Envíos dentro del Callao",
        order: 1,
        active: true,
      },
    });

    const tarifasCallao = [
      {
        name: "Express Callao",
        description: "Entrega en 24-48 horas",
        baseCost: 18.0,
        estimatedDays: "1-2 días",
        active: true,
        order: 1,
      },
      {
        name: "Standard Callao",
        description: "Entrega en 2-3 días",
        baseCost: 12.0,
        estimatedDays: "2-3 días",
        active: true,
        order: 2,
      },
      {
        name: "Gratis Callao",
        description: "Envío gratis en compras mayores",
        baseCost: 0.0,
        freeShippingMin: 500.0,
        estimatedDays: "3 días",
        active: true,
        order: 3,
      },
    ];

    for (const tarifa of tarifasCallao) {
      await prisma.shippingRate.create({
        data: {
          groupId: grupoCallao.id,
          ...tarifa,
        },
      });
    }
    console.log(`      ✅ ${tarifasCallao.length} tarifas creadas`);
  } else {
    console.log(`      ℹ️  Grupo ya existe, saltando...`);
  }

  console.log("");

  // 3. ZONA: Arequipa
  console.log("📍 Creando zona: Arequipa");
  
  let zonaArequipa = await prisma.shippingZone.findFirst({
    where: { name: "Arequipa" },
  });

  if (!zonaArequipa) {
    zonaArequipa = await prisma.shippingZone.create({
      data: {
        name: "Arequipa",
        description: "Región de Arequipa - Ciudad Blanca",
        active: true,
      },
    });
  }

  // Asignar distritos principales de Arequipa
  const distritosArequipa = [
    "040101", // Arequipa
    "040102", // Alto Selva Alegre
    "040103", // Cayma
    "040104", // Cerro Colorado
    "040105", // Characato
    "040106", // Chiguata
    "040107", // Jacobo Hunter
    "040108", // La Joya
    "040109", // Mariano Melgar
  ];

  const districtRecordsArequipa = await prisma.district.findMany({
    where: { code: { in: distritosArequipa } },
  });

  await prisma.shippingZoneDistrict.createMany({
    data: districtRecordsArequipa.map((d) => ({
      shippingZoneId: zonaArequipa.id,
      districtCode: d.code,
    })),
    skipDuplicates: true,
  });

  console.log(`   ✅ ${districtRecordsArequipa.length} distritos asignados`);

  // Grupo: Couriers Nacionales
  console.log("   📦 Grupo: Couriers Nacionales");
  
  let grupoArequipa = await prisma.shippingRateGroup.findFirst({
    where: {
      zoneId: zonaArequipa.id,
      name: "Couriers Nacionales",
    },
  });

  if (!grupoArequipa) {
    grupoArequipa = await prisma.shippingRateGroup.create({
      data: {
        zoneId: zonaArequipa.id,
        name: "Couriers Nacionales",
        description: "Envíos interprovinciales",
        order: 1,
        active: true,
      },
    });

    const tarifasArequipa = [
      {
        name: "Cruz del Sur",
        description: "Envío seguro a Arequipa",
        baseCost: 30.0,
        estimatedDays: "3 días",
        carrier: "Cruz del Sur",
        active: true,
        order: 1,
      },
      {
        name: "Shalom",
        description: "Courier rápido",
        baseCost: 30.0,
        estimatedDays: "3 días",
        carrier: "Shalom",
        active: true,
        order: 2,
      },
      {
        name: "Olva",
        description: "Opción económica",
        baseCost: 25.0,
        estimatedDays: "4 días",
        carrier: "Olva",
        active: true,
        order: 3,
      },
    ];

    for (const tarifa of tarifasArequipa) {
      await prisma.shippingRate.create({
        data: {
          groupId: grupoArequipa.id,
          ...tarifa,
        },
      });
    }
    console.log(`      ✅ ${tarifasArequipa.length} tarifas creadas`);
  } else {
    console.log(`      ℹ️  Grupo ya existe, saltando...`);
  }

  console.log("");
  console.log("============================================================");
  console.log("🎉 Seed completado exitosamente!");
  console.log("============================================================");
  console.log("✅ 3 zonas creadas");
  console.log("✅ 5 grupos de tarifas creados");
  console.log("✅ 14 tarifas creadas");
  console.log(`✅ ~${districtRecordsLima.length + districtRecordsCallao.length + districtRecordsArequipa.length} distritos asignados`);
  console.log("============================================================");
  console.log("");
  console.log("📋 Próximos pasos:");
  console.log("1. Verifica en Prisma Studio:");
  console.log("   npx prisma studio");
  console.log("");
  console.log("2. Ve al admin de envíos:");
  console.log("   http://localhost:3000/admin/envios/zonas");
  console.log("");
  console.log("3. Prueba el checkout:");
  console.log("   - Selecciona un distrito de Lima");
  console.log("   - Verás las opciones de envío disponibles");
  console.log("");
}

main()
  .catch((e) => {
    console.error("");
    console.error("❌ ERROR:", e.message);
    console.error("");
    console.error("💡 Posibles soluciones:");
    console.error("   1. Verifica que las tablas de envío existan (ejecuta la migración)");
    console.error("   2. Verifica que existan distritos en la base de datos");
    console.error("   3. Ejecuta primero: npx tsx prisma/seed-peru-completo.ts");
    console.error("");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });