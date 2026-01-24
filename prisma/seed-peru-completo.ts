import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface DepartmentData {
  id: number;
  departamento: string;
  ubigeo: string;
}

interface ProvinceData {
  id: number;
  provincia: string;
  ubigeo: string;
  departamento_id: number;
}

interface DistrictData {
  id: number;
  distrito: string;
  ubigeo: string;
  provincia_id: number;
  departamento_id: number;
}

async function main() {
  console.log("🇵🇪 SEED COMPLETO DE PERÚ - DATOS OFICIALES 2024");
  console.log("============================================================");
  console.log("📖 Leyendo archivos JSON locales...");
  console.log("");

  const startTime = Date.now();

  // Leer archivos JSON
  console.log("📂 Leyendo departamentos...");
  const departamentosRaw = fs.readFileSync(
    path.join(process.cwd(), "prisma", "data", "departamento.json"),
    "utf-8"
  );
  const departamentosJson = JSON.parse(departamentosRaw);
  const departamentos: DepartmentData[] = departamentosJson.ubigeo_departamentos;
  console.log(`✅ ${departamentos.length} departamentos`);

  console.log("📂 Leyendo provincias...");
  const provinciasRaw = fs.readFileSync(
    path.join(process.cwd(), "prisma", "data", "provincia.json"),
    "utf-8"
  );
  const provinciasJson = JSON.parse(provinciasRaw);
  const provincias: ProvinceData[] = provinciasJson.ubigeo_provincias;
  console.log(`✅ ${provincias.length} provincias`);

  console.log("📂 Leyendo distritos...");
  const distritosRaw = fs.readFileSync(
    path.join(process.cwd(), "prisma", "data", "distrito.json"),
    "utf-8"
  );
  const distritosJson = JSON.parse(distritosRaw);
  const distritos: DistrictData[] = distritosJson.ubigeo_distritos;
  console.log(`✅ ${distritos.length} distritos`);

  console.log("");
  console.log("💾 Guardando en base de datos...");
  console.log("⏱️  Esto tomará 3-5 minutos...");
  console.log("");

  // Crear un mapa para relacionar IDs
  const departmentMap = new Map<number, string>();
  const provinceMap = new Map<number, string>();

  // 1. Guardar Departamentos
  for (const dept of departamentos) {
    const department = await prisma.department.upsert({
      where: { code: dept.ubigeo },
      update: { name: dept.departamento },
      create: {
        code: dept.ubigeo,
        name: dept.departamento,
      },
    });
    departmentMap.set(dept.id, department.id);
    console.log(`📍 ${dept.departamento} (${dept.ubigeo})`);
  }

  console.log("");
  console.log("💾 Guardando provincias...");

  // 2. Guardar Provincias
  let provinceCount = 0;
  for (const prov of provincias) {
    const departmentId = departmentMap.get(prov.departamento_id);
    if (!departmentId) {
      console.warn(`⚠️  No se encontró departamento con ID ${prov.departamento_id} para provincia ${prov.provincia}`);
      continue;
    }

    const province = await prisma.province.upsert({
      where: { code: prov.ubigeo },
      update: {
        name: prov.provincia,
        departmentId: departmentId,
      },
      create: {
        code: prov.ubigeo,
        name: prov.provincia,
        departmentId: departmentId,
      },
    });
    provinceMap.set(prov.id, province.id);
    provinceCount++;

    if (provinceCount % 20 === 0) {
      console.log(`   ${provinceCount}/${provincias.length} provincias...`);
    }
  }
  console.log(`✅ ${provinceCount} provincias guardadas`);

  console.log("");
  console.log("💾 Guardando distritos (esto puede tomar unos minutos)...");

  // 3. Guardar Distritos
  let districtCount = 0;
  const totalDistricts = distritos.length;

  for (const dist of distritos) {
    const provinceId = provinceMap.get(dist.provincia_id);
    if (!provinceId) {
      console.warn(`⚠️  No se encontró provincia con ID ${dist.provincia_id} para distrito ${dist.distrito}`);
      continue;
    }

    await prisma.district.upsert({
      where: { code: dist.ubigeo },
      update: {
        name: dist.distrito,
        provinceId: provinceId,
      },
      create: {
        code: dist.ubigeo,
        name: dist.distrito,
        provinceId: provinceId,
      },
    });

    districtCount++;

    // Mostrar progreso cada 100 distritos
    if (districtCount % 100 === 0) {
      const percentage = ((districtCount / totalDistricts) * 100).toFixed(0);
      console.log(`   ${districtCount}/${totalDistricts} distritos (${percentage}%)`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  console.log("");
  console.log("============================================================");
  console.log("🎉 ¡CARGA COMPLETA EXITOSA!");
  console.log("============================================================");
  console.log(`✅ Departamentos: ${departamentos.length}/${departamentos.length}`);
  console.log(`✅ Provincias: ${provinceCount}/${provincias.length}`);
  console.log(`✅ Distritos: ${districtCount}/${totalDistricts}`);
  console.log(`⏱️  Tiempo total: ${duration}s`);
  console.log("============================================================");
  console.log("");
  console.log("📋 Próximos pasos:");
  console.log("1. Verifica en Prisma Studio:");
  console.log("   npx prisma studio");
  console.log("");
  console.log("2. Los datos están listos para usar en tu LocationSelector");
  console.log("");
}

main()
  .catch((e) => {
    console.error("");
    console.error("❌ ERROR:", e.message);
    console.error("");
    console.error("💡 Posibles soluciones:");
    console.error("   1. Verifica que los archivos JSON existan en 'prisma/data/'");
    console.error("   2. Verifica que la estructura de los JSON sea correcta");
    console.error("   3. Asegúrate de que Prisma esté configurado correctamente");
    console.error("");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });