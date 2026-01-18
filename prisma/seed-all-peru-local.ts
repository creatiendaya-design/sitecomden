import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Datos completos de Perú con nombres reales
const PERU_DATA = {
  departments: [
    {
      code: "01",
      name: "Amazonas",
      provinces: [
        {
          code: "0101",
          name: "Chachapoyas",
          districts: [
            { code: "010101", name: "Chachapoyas" },
            { code: "010102", name: "Asunción" },
            { code: "010103", name: "Balsas" },
          ],
        },
      ],
    },
    {
      code: "02",
      name: "Áncash",
      provinces: [
        {
          code: "0201",
          name: "Huaraz",
          districts: [
            { code: "020101", name: "Huaraz" },
            { code: "020102", name: "Cochabamba" },
            { code: "020103", name: "Colcabamba" },
          ],
        },
      ],
    },
    {
      code: "03",
      name: "Apurímac",
      provinces: [
        {
          code: "0301",
          name: "Abancay",
          districts: [
            { code: "030101", name: "Abancay" },
            { code: "030102", name: "Chacoche" },
          ],
        },
      ],
    },
    {
      code: "04",
      name: "Arequipa",
      provinces: [
        {
          code: "0401",
          name: "Arequipa",
          districts: [
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
          ],
        },
      ],
    },
    {
      code: "05",
      name: "Ayacucho",
      provinces: [
        {
          code: "0501",
          name: "Huamanga",
          districts: [
            { code: "050101", name: "Ayacucho" },
            { code: "050102", name: "Acocro" },
          ],
        },
      ],
    },
    {
      code: "06",
      name: "Cajamarca",
      provinces: [
        {
          code: "0601",
          name: "Cajamarca",
          districts: [
            { code: "060101", name: "Cajamarca" },
            { code: "060102", name: "Asunción" },
          ],
        },
      ],
    },
    {
      code: "07",
      name: "Callao",
      provinces: [
        {
          code: "0701",
          name: "Callao",
          districts: [
            { code: "070101", name: "Callao" },
            { code: "070102", name: "Bellavista" },
            { code: "070103", name: "Carmen de la Legua Reynoso" },
            { code: "070104", name: "La Perla" },
            { code: "070105", name: "La Punta" },
            { code: "070106", name: "Ventanilla" },
            { code: "070107", name: "Mi Perú" },
          ],
        },
      ],
    },
    {
      code: "08",
      name: "Cusco",
      provinces: [
        {
          code: "0801",
          name: "Cusco",
          districts: [
            { code: "080101", name: "Cusco" },
            { code: "080102", name: "Ccorca" },
            { code: "080103", name: "Poroy" },
            { code: "080104", name: "San Jerónimo" },
            { code: "080105", name: "San Sebastián" },
            { code: "080106", name: "Santiago" },
            { code: "080107", name: "Saylla" },
            { code: "080108", name: "Wanchaq" },
          ],
        },
      ],
    },
    {
      code: "09",
      name: "Huancavelica",
      provinces: [
        {
          code: "0901",
          name: "Huancavelica",
          districts: [
            { code: "090101", name: "Huancavelica" },
            { code: "090102", name: "Acobambilla" },
          ],
        },
      ],
    },
    {
      code: "10",
      name: "Huánuco",
      provinces: [
        {
          code: "1001",
          name: "Huánuco",
          districts: [
            { code: "100101", name: "Huánuco" },
            { code: "100102", name: "Amarilis" },
          ],
        },
      ],
    },
    {
      code: "11",
      name: "Ica",
      provinces: [
        {
          code: "1101",
          name: "Ica",
          districts: [
            { code: "110101", name: "Ica" },
            { code: "110102", name: "La Tinguiña" },
            { code: "110103", name: "Los Aquijes" },
          ],
        },
      ],
    },
    {
      code: "12",
      name: "Junín",
      provinces: [
        {
          code: "1201",
          name: "Huancayo",
          districts: [
            { code: "120101", name: "Huancayo" },
            { code: "120104", name: "El Tambo" },
            { code: "120105", name: "Hualhuas" },
            { code: "120106", name: "Huancan" },
            { code: "120107", name: "Huasicancha" },
            { code: "120108", name: "Huayucachi" },
            { code: "120109", name: "Ingenio" },
          ],
        },
        {
          code: "1202",
          name: "Concepción",
          districts: [
            { code: "120201", name: "Concepción" },
            { code: "120202", name: "Aco" },
          ],
        },
      ],
    },
    {
      code: "13",
      name: "La Libertad",
      provinces: [
        {
          code: "1301",
          name: "Trujillo",
          districts: [
            { code: "130101", name: "Trujillo" },
            { code: "130102", name: "El Porvenir" },
            { code: "130103", name: "Florencia de Mora" },
            { code: "130104", name: "Huanchaco" },
            { code: "130105", name: "La Esperanza" },
            { code: "130106", name: "Laredo" },
            { code: "130107", name: "Moche" },
            { code: "130108", name: "Poroto" },
            { code: "130109", name: "Salaverry" },
            { code: "130110", name: "Simbal" },
            { code: "130111", name: "Victor Larco Herrera" },
          ],
        },
      ],
    },
    {
      code: "14",
      name: "Lambayeque",
      provinces: [
        {
          code: "1401",
          name: "Chiclayo",
          districts: [
            { code: "140101", name: "Chiclayo" },
            { code: "140102", name: "Chongoyape" },
            { code: "140103", name: "Eten" },
            { code: "140104", name: "Eten Puerto" },
            { code: "140105", name: "José Leonardo Ortiz" },
            { code: "140106", name: "La Victoria" },
          ],
        },
      ],
    },
    {
      code: "15",
      name: "Lima",
      provinces: [
        {
          code: "1501",
          name: "Lima",
          districts: [
            { code: "150101", name: "Lima" },
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
          ],
        },
        {
          code: "1505",
          name: "Cañete",
          districts: [
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
          ],
        },
      ],
    },
    {
      code: "16",
      name: "Loreto",
      provinces: [
        {
          code: "1601",
          name: "Maynas",
          districts: [
            { code: "160101", name: "Iquitos" },
            { code: "160102", name: "Alto Nanay" },
            { code: "160103", name: "Fernando Lores" },
          ],
        },
      ],
    },
    {
      code: "17",
      name: "Madre de Dios",
      provinces: [
        {
          code: "1701",
          name: "Tambopata",
          districts: [
            { code: "170101", name: "Tambopata" },
            { code: "170102", name: "Inambari" },
          ],
        },
      ],
    },
    {
      code: "18",
      name: "Moquegua",
      provinces: [
        {
          code: "1801",
          name: "Mariscal Nieto",
          districts: [
            { code: "180101", name: "Moquegua" },
            { code: "180102", name: "Carumas" },
          ],
        },
      ],
    },
    {
      code: "19",
      name: "Pasco",
      provinces: [
        {
          code: "1901",
          name: "Pasco",
          districts: [
            { code: "190101", name: "Chaupimarca" },
            { code: "190102", name: "Huachon" },
          ],
        },
      ],
    },
    {
      code: "20",
      name: "Piura",
      provinces: [
        {
          code: "2001",
          name: "Piura",
          districts: [
            { code: "200101", name: "Piura" },
            { code: "200102", name: "Castilla" },
            { code: "200103", name: "Catacaos" },
            { code: "200104", name: "Cura Mori" },
            { code: "200105", name: "El Tallán" },
          ],
        },
      ],
    },
    {
      code: "21",
      name: "Puno",
      provinces: [
        {
          code: "2101",
          name: "Puno",
          districts: [
            { code: "210101", name: "Puno" },
            { code: "210102", name: "Acora" },
            { code: "210103", name: "Amantani" },
          ],
        },
      ],
    },
    {
      code: "22",
      name: "San Martín",
      provinces: [
        {
          code: "2201",
          name: "Moyobamba",
          districts: [
            { code: "220101", name: "Moyobamba" },
            { code: "220102", name: "Calzada" },
          ],
        },
      ],
    },
    {
      code: "23",
      name: "Tacna",
      provinces: [
        {
          code: "2301",
          name: "Tacna",
          districts: [
            { code: "230101", name: "Tacna" },
            { code: "230102", name: "Alto de la Alianza" },
            { code: "230103", name: "Calana" },
            { code: "230104", name: "Ciudad Nueva" },
          ],
        },
      ],
    },
    {
      code: "24",
      name: "Tumbes",
      provinces: [
        {
          code: "2401",
          name: "Tumbes",
          districts: [
            { code: "240101", name: "Tumbes" },
            { code: "240102", name: "Corrales" },
          ],
        },
      ],
    },
    {
      code: "25",
      name: "Ucayali",
      provinces: [
        {
          code: "2501",
          name: "Coronel Portillo",
          districts: [
            { code: "250101", name: "Calleria" },
            { code: "250102", name: "Campoverde" },
          ],
        },
      ],
    },
  ],
};

async function seedAllPeru() {
  console.log("🌍 Cargando todos los departamentos de Perú...\n");

  let totalDepts = 0;
  let totalProvs = 0;
  let totalDists = 0;

  for (const dept of PERU_DATA.departments) {
    // Crear departamento
    const createdDept = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: {
        code: dept.code,
        name: dept.name,
      },
    });

    totalDepts++;
    console.log(`✅ ${dept.name} (${dept.code})`);

    // Crear provincias
    for (const prov of dept.provinces) {
      const createdProv = await prisma.province.upsert({
        where: { code: prov.code },
        update: { name: prov.name },
        create: {
          code: prov.code,
          name: prov.name,
          departmentId: createdDept.id,
        },
      });

      totalProvs++;

      // Crear distritos
      for (const dist of prov.districts) {
        await prisma.district.upsert({
          where: { code: dist.code },
          update: { name: dist.name },
          create: {
            code: dist.code,
            name: dist.name,
            provinceId: createdProv.id,
          },
        });

        totalDists++;
      }

      console.log(`   └─ ${prov.name}: ${prov.districts.length} distritos`);
    }

    console.log();
  }

  console.log("=".repeat(60));
  console.log("🎉 ¡Carga completada exitosamente!");
  console.log("=".repeat(60));
  console.log(`✅ Departamentos: ${totalDepts}`);
  console.log(`✅ Provincias: ${totalProvs}`);
  console.log(`✅ Distritos: ${totalDists}`);
  console.log("=".repeat(60) + "\n");
}

async function main() {
  console.log("🚀 Seed de Departamentos de Perú");
  console.log("=".repeat(60));
  console.log("Este script cargará:");
  console.log("  • 25 Departamentos");
  console.log("  • Provincias principales");
  console.log("  • Distritos principales de cada región");
  console.log("=".repeat(60));
  console.log("\n⏱️  Tiempo estimado: 1-2 minutos\n");

  await seedAllPeru();

  console.log("📋 Próximos pasos:");
  console.log("1. Verifica en Prisma Studio:");
  console.log("   npx prisma studio\n");
  console.log("2. Ahora puedes ir al checkout y seleccionar Junín ✅");
  console.log("3. Crea zonas de envío en /admin/envios/zonas\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
