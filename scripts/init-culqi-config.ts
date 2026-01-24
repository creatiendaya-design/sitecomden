/**
 * Script para inicializar la configuración de Culqi en la base de datos
 * 
 * Ejecutar con: npx tsx scripts/init-culqi-config.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function initCulqiConfig() {
  console.log("🔧 Inicializando configuración de Culqi...\n");

  try {
    // Verificar si ya existe configuración
    const existingConfig = await prisma.setting.findUnique({
      where: { key: "culqi_config" },
    });

    if (existingConfig) {
      console.log("ℹ️  La configuración de Culqi ya existe en la base de datos.");
      console.log("📊 Configuración actual:\n");
      console.log(JSON.stringify(existingConfig.value, null, 2));
      console.log("\n✅ No se realizaron cambios.");
      console.log("💡 Para actualizar, usa el panel de administración: /admin/configuracion/culqi\n");
      return;
    }

    // Crear configuración por defecto
    const defaultConfig = {
      mode: "test",
      test: {
        publicKey: "",
        secretKey: "",
      },
      production: {
        publicKey: "",
        secretKey: "",
      },
    };

    const newConfig = await prisma.setting.create({
      data: {
        key: "culqi_config",
        value: defaultConfig as any,
        category: "payment",
        description: "Configuración de Culqi (claves y modo de operación)",
      },
    });

    console.log("✅ Configuración de Culqi creada exitosamente!\n");
    console.log("📊 Configuración inicial:\n");
    console.log(JSON.stringify(newConfig.value, null, 2));
    console.log("\n📝 Próximos pasos:");
    console.log("1. Accede al panel de administración");
    console.log("2. Ve a: /admin/configuracion/culqi");
    console.log("3. Ingresa tus claves de Culqi (test y/o production)");
    console.log("4. Guarda los cambios");
    console.log("\n💡 Obtén tus claves en: https://panel.culqi.com\n");
  } catch (error) {
    console.error("❌ Error al inicializar configuración:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
initCulqiConfig()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });