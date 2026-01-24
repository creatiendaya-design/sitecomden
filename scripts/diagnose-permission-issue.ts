// scripts/diagnose-permission-issue.ts
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

async function diagnosePermissionIssue() {
  console.log("============================================================");
  console.log("🔍 DIAGNÓSTICO: Problema de Permisos del Rol Admin");
  console.log("============================================================\n");

  try {
    // PASO 1: Encontrar el usuario que intenta acceder
    console.log("📋 PASO 1: Buscando usuario con rol Admin...");
    const usersWithAdminRole = await prisma.user.findMany({
      where: {
        role: {
          name: {
            contains: "Admin",
            mode: "insensitive",
          },
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        customPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (usersWithAdminRole.length === 0) {
      console.log("❌ No se encontraron usuarios con rol Admin");
      
      // Buscar todos los usuarios
      const allUsers = await prisma.user.findMany({
        include: {
          role: true,
        },
      });
      
      console.log("\n📋 Usuarios existentes:");
      allUsers.forEach((user) => {
        console.log(`   - ${user.name} (${user.email})`);
        console.log(`     Rol: ${user.role?.name || "SIN ROL"} (nivel ${user.role?.level || "N/A"})`);
      });
      
      return;
    }

    console.log(`✅ Encontrados ${usersWithAdminRole.length} usuario(s) con rol Admin:\n`);

    for (const user of usersWithAdminRole) {
      console.log(`👤 Usuario: ${user.name} (${user.email})`);
      console.log(`   Rol: ${user.role?.name} (nivel ${user.role?.level})`);
      console.log(`   Activo: ${user.active ? "✅ Sí" : "❌ No"}`);
      console.log(`   Permisos del rol: ${user.role?.permissions.length || 0}`);
      console.log(`   Permisos personalizados: ${user.customPermissions.length}`);

      // PASO 2: Verificar permisos del rol
      console.log("\n📋 PASO 2: Permisos asignados al rol...");
      
      if (!user.role) {
        console.log("❌ El usuario NO tiene rol asignado");
        continue;
      }

      if (user.role.permissions.length === 0) {
        console.log("❌ El rol NO tiene permisos asignados");
        console.log("   ⚠️  PROBLEMA: El rol existe pero no tiene permisos en RolePermission");
      } else {
        console.log("✅ Permisos del rol en la base de datos:");
        user.role.permissions.forEach((rp) => {
          console.log(`   - ${rp.permission.key}: ${rp.permission.name}`);
        });
      }

      // PASO 3: Probar permisos críticos
      console.log("\n📋 PASO 3: Probando permisos críticos...");
      
      const criticalPermissions = [
        "settings:view",
        "settings:configure",
        "payments:configure",
        "shipping:manage",
      ];

      for (const permKey of criticalPermissions) {
        const hasAccess = await hasPermission(user.id, permKey);
        console.log(`   ${hasAccess ? "✅" : "❌"} ${permKey}`);
      }

      // PASO 4: Verificar si los permisos existen en la tabla Permission
      console.log("\n📋 PASO 4: Verificando permisos en tabla Permission...");
      
      const existingPermissions = await prisma.permission.findMany({
        where: {
          key: {
            in: criticalPermissions,
          },
        },
      });

      console.log(`✅ Permisos encontrados: ${existingPermissions.length}/${criticalPermissions.length}`);
      
      if (existingPermissions.length < criticalPermissions.length) {
        console.log("❌ PROBLEMA: Faltan permisos en la tabla Permission");
        const foundKeys = existingPermissions.map((p) => p.key);
        const missingKeys = criticalPermissions.filter((k) => !foundKeys.includes(k));
        console.log("   Permisos faltantes:");
        missingKeys.forEach((key) => console.log(`   - ${key}`));
      }

      // PASO 5: Verificar RolePermission
      console.log("\n📋 PASO 5: Verificando tabla RolePermission...");
      
      if (user.role) {
        const rolePermissions = await prisma.rolePermission.findMany({
          where: {
            roleId: user.role.id,
          },
          include: {
            permission: true,
          },
        });

        console.log(`✅ Total de registros en RolePermission: ${rolePermissions.length}`);
        
        if (rolePermissions.length === 0) {
          console.log("❌ PROBLEMA CRÍTICO: No hay registros en RolePermission para este rol");
          console.log("   Esto significa que aunque la UI muestra permisos seleccionados,");
          console.log("   NO se guardaron en la base de datos.");
        }
      }

      console.log("\n" + "=".repeat(60));
    }

    // PASO 6: Resumen y soluciones
    console.log("\n📊 RESUMEN Y DIAGNÓSTICO\n");
    console.log("============================================================\n");

    const user = usersWithAdminRole[0];
    
    if (!user.role) {
      console.log("❌ PROBLEMA: Usuario sin rol asignado");
      console.log("\n🔧 SOLUCIÓN:");
      console.log("   1. Ir a /admin/configuracion/usuarios");
      console.log("   2. Editar el usuario");
      console.log("   3. Asignar el rol Admin");
      return;
    }

    if (user.role.permissions.length === 0) {
      console.log("❌ PROBLEMA PRINCIPAL: El rol tiene 0 permisos en la BD");
      console.log("\n🔧 SOLUCIÓN:");
      console.log("   1. Ir a /admin/configuracion/roles");
      console.log("   2. Editar el rol Admin");
      console.log("   3. Volver a seleccionar TODOS los permisos");
      console.log("   4. Hacer clic en 'Guardar Cambios'");
      console.log("   5. Verificar que aparece mensaje de éxito");
      return;
    }

    if (!user.active) {
      console.log("❌ PROBLEMA: Usuario desactivado");
      console.log("\n🔧 SOLUCIÓN:");
      console.log("   1. Ir a /admin/configuracion/usuarios");
      console.log("   2. Editar el usuario");
      console.log("   3. Activar el switch 'Usuario Activo'");
      return;
    }

    console.log("✅ El rol y permisos parecen correctos");
    console.log("\n🔧 POSIBLES CAUSAS DEL PROBLEMA:");
    console.log("   1. Caché de sesión desactualizado");
    console.log("   2. El usuario está logueado con otra cuenta");
    console.log("   3. Hay un middleware bloqueando el acceso");
    console.log("\n🔧 SOLUCIONES:");
    console.log("   1. Cerrar sesión completamente");
    console.log("   2. Limpiar cookies del navegador");
    console.log("   3. Reiniciar servidor (Ctrl+C y npm run dev)");
    console.log("   4. Login nuevamente en modo incógnito");

  } catch (error) {
    console.error("❌ Error durante diagnóstico:", error);
  }

  console.log("\n============================================================");
}

diagnosePermissionIssue()
  .then(() => {
    console.log("\n✅ Diagnóstico completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });