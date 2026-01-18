import * as fs from "fs";
import * as path from "path";

console.log("🔍 DIAGNÓSTICO DE ARCHIVOS JSON");
console.log("============================================================");
console.log("");

const dataDir = path.join(__dirname, "data");
const files = [
  "departamentos.json",
  "provincias.json",
  "distritos.json"
];

for (const file of files) {
  const filePath = path.join(dataDir, file);
  
  console.log(`📄 Archivo: ${file}`);
  console.log(`   Ruta: ${filePath}`);
  
  // Verificar si existe
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ NO EXISTE`);
    console.log("");
    continue;
  }
  
  // Ver tamaño
  const stats = fs.statSync(filePath);
  console.log(`   ✅ Existe`);
  console.log(`   📊 Tamaño: ${stats.size} bytes`);
  
  // Leer contenido raw
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    console.log(`   📖 Primeros 200 caracteres:`);
    console.log(`   "${content.substring(0, 200)}"`);
    
    // Intentar parsear
    try {
      const parsed = JSON.parse(content);
      console.log(`   ✅ JSON válido`);
      console.log(`   📊 Tipo: ${typeof parsed}`);
      
      if (Array.isArray(parsed)) {
        console.log(`   📊 Es un array con ${parsed.length} elementos`);
        if (parsed.length > 0) {
          console.log(`   📋 Primer elemento:`);
          console.log(`   ${JSON.stringify(parsed[0], null, 2)}`);
        }
      } else {
        console.log(`   ⚠️  NO es un array, es un: ${typeof parsed}`);
        console.log(`   📋 Contenido:`);
        console.log(`   ${JSON.stringify(parsed, null, 2)}`);
      }
    } catch (parseError) {
      console.log(`   ❌ ERROR al parsear JSON:`);
      console.log(`   ${parseError}`);
    }
  } catch (readError) {
    console.log(`   ❌ ERROR al leer archivo:`);
    console.log(`   ${readError}`);
  }
  
  console.log("");
}

console.log("============================================================");
console.log("💡 Si los archivos están vacíos o muestran HTML,");
console.log("   significa que no se descargaron correctamente.");
console.log("");
console.log("🔗 Links correctos para descargar:");
console.log("");
console.log("Departamentos:");
console.log("https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/1_ubigeo_departamentos.json");
console.log("");
console.log("Provincias:");
console.log("https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/2_ubigeo_provincias.json");
console.log("");
console.log("Distritos:");
console.log("https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/3_ubigeo_distritos.json");