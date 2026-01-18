import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedLocations() {
  console.log("🌍 Seeding ubicaciones de Perú...");

  // ============================================
  // DEPARTAMENTOS PRINCIPALES
  // ============================================
  const limaDepto = await prisma.department.upsert({
    where: { code: "15" },
    update: {},
    create: {
      code: "15",
      name: "Lima",
    },
  });

  const callaoDepto = await prisma.department.upsert({
    where: { code: "07" },
    update: {},
    create: {
      code: "07",
      name: "Callao",
    },
  });

  const arequipaDepto = await prisma.department.upsert({
    where: { code: "04" },
    update: {},
    create: {
      code: "04",
      name: "Arequipa",
    },
  });

  const cuscoDepto = await prisma.department.upsert({
    where: { code: "08" },
    update: {},
    create: {
      code: "08",
      name: "Cusco",
    },
  });

  const laLibertadDepto = await prisma.department.upsert({
    where: { code: "13" },
    update: {},
    create: {
      code: "13",
      name: "La Libertad",
    },
  });

  console.log("✅ Departamentos creados");

  // ============================================
  // PROVINCIAS - LIMA
  // ============================================
  const limaProv = await prisma.province.upsert({
    where: { code: "1501" },
    update: {},
    create: {
      code: "1501",
      name: "Lima",
      departmentId: limaDepto.id,
    },
  });

  const caneteProvi = await prisma.province.upsert({
    where: { code: "1505" },
    update: {},
    create: {
      code: "1505",
      name: "Cañete",
      departmentId: limaDepto.id,
    },
  });

  const huaralProv = await prisma.province.upsert({
    where: { code: "1506" },
    update: {},
    create: {
      code: "1506",
      name: "Huaral",
      departmentId: limaDepto.id,
    },
  });

  // PROVINCIAS - CALLAO
  const callaoProv = await prisma.province.upsert({
    where: { code: "0701" },
    update: {},
    create: {
      code: "0701",
      name: "Callao",
      departmentId: callaoDepto.id,
    },
  });

  // PROVINCIAS - AREQUIPA
  const arequipaProv = await prisma.province.upsert({
    where: { code: "0401" },
    update: {},
    create: {
      code: "0401",
      name: "Arequipa",
      departmentId: arequipaDepto.id,
    },
  });

  console.log("✅ Provincias creadas");

  // ============================================
  // DISTRITOS - LIMA METROPOLITANA
  // ============================================
  const limaDistrictsData = [
    { code: "150101", name: "Lima (Cercado)" },
    { code: "150102", name: "Ancón" },
    { code: "150103", name: "Ate" },
    { code: "150104", name: "Barranco" },
    { code: "150105", name: "Breña" },
    { code: "150106", name: "Carabayllo" },
    { code: "150107", name: "Chaclacayo" },
    { code: "150108", name: "Chorrillos" },
    { code: "150109", name: "Cieneguilla" },
    { code: "150110", name: "Comas" },
    { code: "150111", name: "El Agustino" },
    { code: "150112", name: "Independencia" },
    { code: "150113", name: "Jesús María" },
    { code: "150114", name: "La Molina" },
    { code: "150115", name: "La Victoria" },
    { code: "150116", name: "Lince" },
    { code: "150117", name: "Los Olivos" },
    { code: "150118", name: "Lurigancho" },
    { code: "150119", name: "Lurín" },
    { code: "150120", name: "Magdalena del Mar" },
    { code: "150121", name: "Pueblo Libre" },
    { code: "150122", name: "Miraflores" },
    { code: "150123", name: "Pachacamac" },
    { code: "150124", name: "Pucusana" },
    { code: "150125", name: "Puente Piedra" },
    { code: "150126", name: "Punta Hermosa" },
    { code: "150127", name: "Punta Negra" },
    { code: "150128", name: "Rímac" },
    { code: "150129", name: "San Bartolo" },
    { code: "150130", name: "San Borja" },
    { code: "150131", name: "San Isidro" },
    { code: "150132", name: "San Juan de Lurigancho" },
    { code: "150133", name: "San Juan de Miraflores" },
    { code: "150134", name: "San Luis" },
    { code: "150135", name: "San Martín de Porres" },
    { code: "150136", name: "San Miguel" },
    { code: "150137", name: "Santa Anita" },
    { code: "150138", name: "Santa María del Mar" },
    { code: "150139", name: "Santa Rosa" },
    { code: "150140", name: "Santiago de Surco" },
    { code: "150141", name: "Surquillo" },
    { code: "150142", name: "Villa El Salvador" },
    { code: "150143", name: "Villa María del Triunfo" },
  ];

  for (const district of limaDistrictsData) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: {},
      create: {
        code: district.code,
        name: district.name,
        provinceId: limaProv.id,
      },
    });
  }

  // ============================================
  // DISTRITOS - CALLAO
  // ============================================
  const callaoDistrictsData = [
    { code: "070101", name: "Callao" },
    { code: "070102", name: "Bellavista" },
    { code: "070103", name: "Carmen de la Legua Reynoso" },
    { code: "070104", name: "La Perla" },
    { code: "070105", name: "La Punta" },
    { code: "070106", name: "Ventanilla" },
    { code: "070107", name: "Mi Perú" },
  ];

  for (const district of callaoDistrictsData) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: {},
      create: {
        code: district.code,
        name: district.name,
        provinceId: callaoProv.id,
      },
    });
  }

  // ============================================
  // DISTRITOS - CAÑETE (ejemplo de provincia)
  // ============================================
  const caneteDistrictsData = [
    { code: "150501", name: "San Vicente de Cañete" },
    { code: "150502", name: "Asia" },
    { code: "150503", name: "Calango" },
    { code: "150504", name: "Cerro Azul" },
    { code: "150505", name: "Chilca" },
    { code: "150506", name: "Coayllo" },
    { code: "150507", name: "Imperial" },
    { code: "150508", name: "Lunahuaná" },
    { code: "150509", name: "Mala" },
    { code: "150510", name: "Nuevo Imperial" },
    { code: "150511", name: "Pacarán" },
    { code: "150512", name: "Quilmaná" },
    { code: "150513", name: "San Antonio" },
    { code: "150514", name: "San Luis" },
    { code: "150515", name: "Santa Cruz de Flores" },
    { code: "150516", name: "Zúñiga" },
  ];

  for (const district of caneteDistrictsData) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: {},
      create: {
        code: district.code,
        name: district.name,
        provinceId: caneteProvi.id,
      },
    });
  }

  // ============================================
  // DISTRITOS - AREQUIPA
  // ============================================
  const arequipaDistrictsData = [
    { code: "040101", name: "Arequipa" },
    { code: "040102", name: "Alto Selva Alegre" },
    { code: "040103", name: "Cayma" },
    { code: "040104", name: "Cerro Colorado" },
    { code: "040105", name: "Characato" },
    { code: "040106", name: "Chiguata" },
    { code: "040107", name: "Jacobo Hunter" },
    { code: "040108", name: "José Luis Bustamante y Rivero" },
    { code: "040109", name: "La Joya" },
    { code: "040110", name: "Mariano Melgar" },
    { code: "040111", name: "Miraflores" },
    { code: "040112", name: "Mollebaya" },
    { code: "040113", name: "Paucarpata" },
    { code: "040114", name: "Pocsi" },
    { code: "040115", name: "Polobaya" },
    { code: "040116", name: "Quequeña" },
    { code: "040117", name: "Sabandia" },
    { code: "040118", name: "Sachaca" },
    { code: "040119", name: "San Juan de Siguas" },
    { code: "040120", name: "San Juan de Tarucani" },
    { code: "040121", name: "Santa Isabel de Siguas" },
    { code: "040122", name: "Santa Rita de Siguas" },
    { code: "040123", name: "Socabaya" },
    { code: "040124", name: "Tiabaya" },
    { code: "040125", name: "Uchumayo" },
    { code: "040126", name: "Vitor" },
    { code: "040127", name: "Yanahuara" },
    { code: "040128", name: "Yarabamba" },
    { code: "040129", name: "Yura" },
  ];

  for (const district of arequipaDistrictsData) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: {},
      create: {
        code: district.code,
        name: district.name,
        provinceId: arequipaProv.id,
      },
    });
  }

  console.log("✅ Distritos creados");

  // ============================================
  // ZONAS DE ENVÍO
  // ============================================
  
  // Zona 1: Lima Metropolitana (distritos principales)
  const limaMetroZone = await prisma.shippingZone.upsert({
    where: { id: "zone-lima-metro" },
    update: {},
    create: {
      id: "zone-lima-metro",
      name: "Lima Metropolitana",
      description: "Distritos principales de Lima",
      baseCost: 10,
      freeShippingMin: 150,
      estimatedDays: "1-2 días",
      active: true,
    },
  });

  // Agregar distritos principales a Lima Metro
  const limaMetroDistricts = [
    "150122", // Miraflores
    "150131", // San Isidro
    "150130", // San Borja
    "150140", // Surco
    "150114", // La Molina
    "150113", // Jesús María
    "150120", // Magdalena
    "150121", // Pueblo Libre
    "150136", // San Miguel
    "150116", // Lince
    "150141", // Surquillo
    "150104", // Barranco
    "150108", // Chorrillos
  ];

  for (const districtCode of limaMetroDistricts) {
    await prisma.shippingZoneDistrict.upsert({
      where: {
        shippingZoneId_districtCode: {
          shippingZoneId: limaMetroZone.id,
          districtCode,
        },
      },
      update: {},
      create: {
        shippingZoneId: limaMetroZone.id,
        districtCode,
      },
    });
  }

  // Zona 2: Callao
  const callaoZone = await prisma.shippingZone.upsert({
    where: { id: "zone-callao" },
    update: {},
    create: {
      id: "zone-callao",
      name: "Callao",
      description: "Provincia Constitucional del Callao",
      baseCost: 12,
      freeShippingMin: 150,
      estimatedDays: "1-2 días",
      active: true,
    },
  });

  const callaoDistricts = ["070101", "070102", "070103", "070104", "070105"];

  for (const districtCode of callaoDistricts) {
    await prisma.shippingZoneDistrict.upsert({
      where: {
        shippingZoneId_districtCode: {
          shippingZoneId: callaoZone.id,
          districtCode,
        },
      },
      update: {},
      create: {
        shippingZoneId: callaoZone.id,
        districtCode,
      },
    });
  }

  // Zona 3: Lima Norte
  const limaNorteZone = await prisma.shippingZone.upsert({
    where: { id: "zone-lima-norte" },
    update: {},
    create: {
      id: "zone-lima-norte",
      name: "Lima Norte",
      description: "Distritos de Lima Norte",
      baseCost: 12,
      freeShippingMin: 200,
      estimatedDays: "2-3 días",
      active: true,
    },
  });

  const limaNorteDistricts = [
    "150110", // Comas
    "150112", // Independencia
    "150117", // Los Olivos
    "150135", // San Martín de Porres
    "150125", // Puente Piedra
    "150106", // Carabayllo
  ];

  for (const districtCode of limaNorteDistricts) {
    await prisma.shippingZoneDistrict.upsert({
      where: {
        shippingZoneId_districtCode: {
          shippingZoneId: limaNorteZone.id,
          districtCode,
        },
      },
      update: {},
      create: {
        shippingZoneId: limaNorteZone.id,
        districtCode,
      },
    });
  }

  // Zona 4: Lima Sur
  const limaSurZone = await prisma.shippingZone.upsert({
    where: { id: "zone-lima-sur" },
    update: {},
    create: {
      id: "zone-lima-sur",
      name: "Lima Sur",
      description: "Distritos de Lima Sur",
      baseCost: 15,
      freeShippingMin: 200,
      estimatedDays: "2-3 días",
      active: true,
    },
  });

  const limaSurDistricts = [
    "150133", // San Juan de Miraflores
    "150142", // Villa El Salvador
    "150143", // Villa María del Triunfo
    "150119", // Lurín
    "150123", // Pachacamac
    "150124", // Pucusana
  ];

  for (const districtCode of limaSurDistricts) {
    await prisma.shippingZoneDistrict.upsert({
      where: {
        shippingZoneId_districtCode: {
          shippingZoneId: limaSurZone.id,
          districtCode,
        },
      },
      update: {},
      create: {
        shippingZoneId: limaSurZone.id,
        districtCode,
      },
    });
  }

  // Zona 5: Provincias de Lima
  const provinciasZone = await prisma.shippingZone.upsert({
    where: { id: "zone-provincias-lima" },
    update: {},
    create: {
      id: "zone-provincias-lima",
      name: "Provincias de Lima",
      description: "Cañete, Huaral, etc.",
      baseCost: 20,
      freeShippingMin: 300,
      estimatedDays: "3-5 días",
      active: true,
    },
  });

  console.log("✅ Zonas de envío creadas");

  console.log("🎉 Seed de ubicaciones completado!");
}

export default seedLocations;

// Si ejecutas este archivo directamente
if (require.main === module) {
  seedLocations()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
