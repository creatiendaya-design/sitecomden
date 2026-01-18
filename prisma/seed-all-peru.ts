import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// API pública de ubigeos de Perú
const API_BASE = "https://api.apis.net.pe/v2/ubigeo";

interface Department {
  id: string;
  name: string;
}

interface Province {
  id: string;
  name: string;
  department_id: string;
}

interface District {
  id: string;
  name: string;
  province_id: string;
  department_id: string;
}

// Helper para hacer requests con reintentos
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.log(`  ⚠️  Error en intento ${i + 1}/${retries}: ${url}`);
      if (i === retries - 1) throw error;
      // Esperar 1 segundo antes de reintentar
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function loadAllPeru() {
  console.log("🌍 Iniciando carga completa de Perú desde API pública...\n");

  let totalDepts = 0;
  let totalProvs = 0;
  let totalDists = 0;

  try {
    // 1. CARGAR DEPARTAMENTOS
    console.log("📍 Paso 1/3: Cargando departamentos...");
    const departments: Department[] = await fetchWithRetry(
      `${API_BASE}/departamentos`
    );

    console.log(`   Encontrados: ${departments.length} departamentos\n`);

    for (const dept of departments) {
      // Crear departamento
      const createdDept = await prisma.department.upsert({
        where: { code: dept.id },
        update: { name: dept.name },
        create: {
          code: dept.id,
          name: dept.name,
        },
      });

      totalDepts++;
      console.log(`   ✅ ${dept.name} (${dept.id})`);

      // 2. CARGAR PROVINCIAS DE ESTE DEPARTAMENTO
      try {
        const provinces: Province[] = await fetchWithRetry(
          `${API_BASE}/departamento/${dept.id}/provincias`
        );

        for (const prov of provinces) {
          const createdProv = await prisma.province.upsert({
            where: { code: prov.id },
            update: { name: prov.name },
            create: {
              code: prov.id,
              name: prov.name,
              departmentId: createdDept.id,
            },
          });

          totalProvs++;

          // 3. CARGAR DISTRITOS DE ESTA PROVINCIA
          try {
            const districts: District[] = await fetchWithRetry(
              `${API_BASE}/provincia/${prov.id}/distritos`
            );

            for (const dist of districts) {
              await prisma.district.upsert({
                where: { code: dist.id },
                update: { name: dist.name },
                create: {
                  code: dist.id,
                  name: dist.name,
                  provinceId: createdProv.id,
                },
              });

              totalDists++;
            }

            console.log(
              `      └─ ${prov.name}: ${districts.length} distritos`
            );
          } catch (error) {
            console.error(
              `      ❌ Error cargando distritos de ${prov.name}:`,
              error
            );
          }
        }

        console.log(`      Total: ${provinces.length} provincias\n`);
      } catch (error) {
        console.error(`   ❌ Error cargando provincias de ${dept.name}:`, error);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 ¡Carga completada exitosamente!");
    console.log("=".repeat(60));
    console.log(`✅ Departamentos: ${totalDepts}`);
    console.log(`✅ Provincias: ${totalProvs}`);
    console.log(`✅ Distritos: ${totalDists}`);
    console.log("=".repeat(60) + "\n");

    console.log("📋 Próximos pasos:");
    console.log("1. Verifica los datos en Prisma Studio:");
    console.log("   npx prisma studio\n");
    console.log("2. Ahora puedes crear zonas de envío en el admin");
    console.log("3. Asigna distritos a cada zona según tu cobertura\n");
  } catch (error) {
    console.error("\n❌ Error crítico durante la carga:", error);
    console.log("\n💡 Consejos:");
    console.log("- Verifica tu conexión a internet");
    console.log("- La API podría estar temporalmente no disponible");
    console.log("- Intenta nuevamente en unos minutos");
    process.exit(1);
  }
}

async function main() {
  console.log("🚀 Script de Carga Completa de Perú");
  console.log("=".repeat(60));
  console.log("Este script cargará:");
  console.log("  • 25 Departamentos");
  console.log("  • ~196 Provincias");
  console.log("  • ~1,874 Distritos");
  console.log("=".repeat(60));
  console.log("\n⏱️  Tiempo estimado: 5-10 minutos\n");

  // Preguntar si quiere limpiar datos existentes
  console.log("ℹ️  Si ya tienes datos, serán actualizados (no duplicados)\n");

  await loadAllPeru();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
