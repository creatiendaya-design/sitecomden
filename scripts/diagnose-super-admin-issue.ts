// scripts/diagnose-super-admin-issue.ts
/**
 * Diagnóstico completo del problema de Super Admin
 * 
 * Ejecutar: npx tsx scripts/diagnose-super-admin-issue.ts
 */

import { prisma } from "../lib/db";
import { hasPermission } from "../lib/permissions";

async function diagnose() {
  console.log("=" .repeat(60));
  console.log("🔍 DIAGNÓSTICO: Super Admin Sin Acceso");
  console.log("=".repeat(60));
  console.log();

  // ============================================
  // PASO 1: Verificar usuarios Super Admin
  // ============================================
  console.log("📋 PASO 1: Buscando usuarios Super Admin...\n");

  const superAdmins = await prisma.user.findMany({
    where: {
      role: {
        level: {
          gte: 100
        }
      }
    },
    include: {
      role: true
    }
  });

  if (superAdmins.length === 0) {
    console.log("❌ PROBLEMA ENCONTRADO:");
    console.log("   No hay usuarios con rol de nivel >= 100");
    console.log();
    console.log("🔧 SOLUCIÓN:");
    console.log("   1. Verificar que el rol 'Super Admin' tenga level = 100");
    console.log("   2. Asignar ese rol a tu usuario admin");
    console.log();
    
    // Mostrar todos los roles
    const allRoles = await prisma.role.findMany({
      orderBy: { level: 'desc' }
    });
    
    console.log("📊 Roles actuales en el sistema:");
    allRoles.forEach(role => {
      console.log(`   - ${role.name} (nivel: ${role.level})`);
    });
    console.log();
    
    return;
  }

  console.log(`✅ Encontrados ${superAdmins.length} Super Admin(s):\n`);
  superAdmins.forEach(user => {
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Nombre: ${user.name}`);
    console.log(`   🎭 Rol: ${user.role?.name} (nivel ${user.role?.level})`);
    console.log(`   🆔 ID: ${user.id}`);
    console.log();
  });

  // ============================================
  // PASO 2: Probar permisos específicos
  // ============================================
  console.log("📋 PASO 2: Probando permisos del Super Admin...\n");

  const testUser = superAdmins[0];
  
  const criticalPermissions = [
    "settings:view",
    "settings:configure",
    "payments:configure",
    "users:view",
    "users:create",
    "users:edit",
    "users:delete",
    "users:manage_roles",
    "products:view",
    "orders:view",
  ];

  let allPassed = true;
  const failedPermissions: string[] = [];

  for (const permission of criticalPermissions) {
    const hasAccess = await hasPermission(testUser.id, permission);
    const status = hasAccess ? "✅" : "❌";
    console.log(`   ${status} ${permission}`);
    
    if (!hasAccess) {
      allPassed = false;
      failedPermissions.push(permission);
    }
  }

  console.log();

  if (!allPassed) {
    console.log("❌ PROBLEMA ENCONTRADO:");
    console.log(`   Super Admin NO tiene acceso a ${failedPermissions.length} permiso(s):`);
    failedPermissions.forEach(p => console.log(`   - ${p}`));
    console.log();
    console.log("🔧 POSIBLES CAUSAS:");
    console.log("   1. El bypass en lib/permissions.ts no está funcionando");
    console.log("   2. El nivel del rol cambió después de cargar en memoria");
    console.log("   3. Hay un error de caché");
    console.log();
  }

  // ============================================
  // PASO 3: Verificar permisos en BD
  // ============================================
  console.log("📋 PASO 3: Verificando permisos en base de datos...\n");

  const permissionsInDB = await prisma.permission.findMany({
    where: {
      key: {
        in: failedPermissions.length > 0 ? failedPermissions : criticalPermissions
      }
    },
    select: {
      key: true,
      name: true
    }
  });

  if (failedPermissions.length > 0) {
    console.log("📊 Permisos que fallan existen en BD:");
    const missingPermissions = failedPermissions.filter(
      fp => !permissionsInDB.find(p => p.key === fp)
    );

    if (missingPermissions.length > 0) {
      console.log("\n❌ PROBLEMA ENCONTRADO:");
      console.log("   Estos permisos NO EXISTEN en la base de datos:");
      missingPermissions.forEach(p => console.log(`   - ${p}`));
      console.log("\n🔧 SOLUCIÓN:");
      console.log("   Estos permisos deben crearse en la BD");
    } else {
      permissionsInDB.forEach(p => {
        console.log(`   ✅ ${p.key} - ${p.name}`);
      });
    }
  } else {
    console.log("✅ Todos los permisos críticos existen en BD");
  }

  console.log();

  // ============================================
  // PASO 4: Verificar cookies/sesión
  // ============================================
  console.log("📋 PASO 4: Recomendaciones de sesión/caché...\n");
  
  console.log("🔄 Para resolver problemas de caché:");
  console.log("   1. Cerrar completamente el navegador");
  console.log("   2. Reiniciar el servidor (Ctrl+C y npm run dev)");
  console.log("   3. Abrir navegador en modo incógnito");
  console.log("   4. Hacer login nuevamente");
  console.log();

  // ============================================
  // RESUMEN FINAL
  // ============================================
  console.log("=".repeat(60));
  console.log("📊 RESUMEN");
  console.log("=".repeat(60));
  console.log();

  if (allPassed) {
    console.log("✅ BYPASS FUNCIONANDO CORRECTAMENTE");
    console.log("   Super Admin tiene acceso a todos los permisos probados");
    console.log();
    console.log("🎯 PRÓXIMOS PASOS:");
    console.log("   1. Reiniciar servidor: Ctrl+C y npm run dev");
    console.log("   2. Limpiar caché del navegador");
    console.log("   3. Hacer login en modo incógnito");
    console.log("   4. Intentar acceder a /admin/configuracion");
  } else {
    console.log("❌ BYPASS NO FUNCIONA CORRECTAMENTE");
    console.log(`   ${failedPermissions.length} permiso(s) fallando`);
    console.log();
    console.log("🔧 ACCIONES REQUERIDAS:");
    console.log("   1. Verificar que lib/permissions.ts tiene el bypass");
    console.log("   2. Reiniciar servidor completamente");
    console.log("   3. Verificar logs del servidor al intentar acceder");
  }

  console.log();
  console.log("=".repeat(60));
}

diagnose()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error durante diagnóstico:", error);
    process.exit(1);
  });