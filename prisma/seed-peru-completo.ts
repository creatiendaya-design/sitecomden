import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface UbigeoItem {
  id: number;
  distrito: string;
  ubigeo: string;
  provincia_id: number;
  departamento_id: number;
}

interface ProvinciaItem {
  id: number;
  provincia: string;
  ubigeo: string;
  departamento_id: number;
}

interface DepartamentoItem {
  id: number;
  departamento: string;
  ubigeo: string;
}

// Interfaces para el JSON con wrapper
interface DepartamentosJSON {
  ubigeo_departamentos: DepartamentoItem[];
}

interface ProvinciasJSON {
  ubigeo_provincias: ProvinciaItem[];
}

interface DistritosJSON {
  ubigeo_distritos: UbigeoItem[];
}

async function main() {
  console.log("🇵🇪 SEED COMPLETO DE PERÚ - DATOS OFICIALES 2024");
  console.log("============================================================");
  console.log("📖 Leyendo archivos JSON locales...");
  console.log("");
  
  const startTime = Date.now();
  const dataDir = path.join(__dirname, "data");
  
  // Verificar que existan los archivos
  const deptFile = path.join(dataDir, "departamentos.json");
  const provFile = path.join(dataDir, "provincias.json");
  const distFile = path.join(dataDir, "distritos.json");
  
  if (!fs.existsSync(deptFile)) {
    console.error("❌ ERROR: No se encontró prisma/data/departamentos.json");
    console.log("");
    console.log("📥 Por favor descarga los archivos desde:");
    console.log("   https://github.com/RitchieRD/ubigeos-peru-data/tree/main/json");
    console.log("");
    process.exit(1);
  }
  
  try {
    // Leer archivos JSON
    console.log("📂 Leyendo departamentos...");
    const deptJSON: DepartamentosJSON = JSON.parse(
      fs.readFileSync(deptFile, "utf-8")
    );
    const departamentos = deptJSON.ubigeo_departamentos;
    console.log(`✅ ${departamentos.length} departamentos`);
    
    console.log("📂 Leyendo provincias...");
    const provJSON: ProvinciasJSON = JSON.parse(
      fs.readFileSync(provFile, "utf-8")
    );
    const provincias = provJSON.ubigeo_provincias;
    console.log(`✅ ${provincias.length} provincias`);
    
    console.log("📂 Leyendo distritos...");
    const distJSON: DistritosJSON = JSON.parse(
      fs.readFileSync(distFile, "utf-8")
    );
    const distritos = distJSON.ubigeo_distritos;
    console.log(`✅ ${distritos.length} distritos`);
    console.log("");
    
    let departmentCount = 0;
    let provinceCount = 0;
    let districtCount = 0;
    
    console.log("💾 Guardando en base de datos...");
    console.log("⏱️  Esto tomará 3-5 minutos...");
    console.log("");
    
    // Guardar en base de datos
    await prisma.$transaction(
      async (tx) => {
        // Mapeo de IDs del JSON a IDs de Prisma
        const deptMap = new Map<number, string>();
        const provMap = new Map<number, string>();
        
        // 1. Insertar departamentos
        for (const dept of departamentos) {
          const department = await tx.department.upsert({
            where: { code: dept.ubigeo },
            update: { name: dept.departamento },
            create: {
              code: dept.ubigeo,
              name: dept.departamento,
            },
          });
          deptMap.set(dept.id, department.id);
          departmentCount++;
          console.log(`📍 ${dept.departamento} (${dept.ubigeo})`);
        }
        
        console.log("");
        
        // 2. Insertar provincias
        console.log("💾 Guardando provincias...");
        for (const prov of provincias) {
          const departmentId = deptMap.get(prov.departamento_id);
          if (!departmentId) {
            console.warn(`⚠️  Provincia sin departamento: ${prov.provincia}`);
            continue;
          }
          
          const province = await tx.province.upsert({
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
          provMap.set(prov.id, province.id);
          provinceCount++;
          
          // Mostrar progreso cada 20 provincias
          if (provinceCount % 20 === 0) {
            console.log(`   ${provinceCount}/${provincias.length} provincias...`);
          }
        }
        
        console.log(`✅ ${provinceCount} provincias guardadas`);
        console.log("");
        console.log("💾 Guardando distritos (esto puede tomar unos minutos)...");
        
        // 3. Insertar distritos en lotes de 100
        const batchSize = 100;
        for (let i = 0; i < distritos.length; i += batchSize) {
          const batch = distritos.slice(i, i + batchSize);
          
          const districtData = batch
            .map((dist) => {
              const provinceId = provMap.get(dist.provincia_id);
              if (!provinceId) return null;
              
              return {
                code: dist.ubigeo,
                name: dist.distrito,
                provinceId: provinceId,
              };
            })
            .filter((d): d is NonNullable<typeof d> => d !== null);
          
          await tx.district.createMany({
            data: districtData,
            skipDuplicates: true,
          });
          
          districtCount += districtData.length;
          
          // Mostrar progreso
          const progress = Math.round((districtCount / distritos.length) * 100);
          console.log(`   ${districtCount}/${distritos.length} distritos (${progress}%)`);
        }
      },
      {
        timeout: 600000, // 10 minutos
        maxWait: 300000, // 5 minutos
      }
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("");
    console.log("============================================================");
    console.log("🎉 ¡CARGA COMPLETA EXITOSA!");
    console.log("============================================================");
    console.log(`✅ Departamentos: ${departmentCount}/25`);
    console.log(`✅ Provincias: ${provinceCount}/196`);
    console.log(`✅ Distritos: ${districtCount}/1,874`);
    console.log(`⏱️  Tiempo total: ${duration}s`);
    console.log("============================================================");
    console.log("");
    console.log("📋 Verificación:");
    console.log("   npx prisma studio");
    console.log("");
    console.log("🎯 Ahora tienes TODOS los distritos de Perú ✅");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("❌ ERROR:", error instanceof Error ? error.message : error);
    console.error("");
    console.error("Stack:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });