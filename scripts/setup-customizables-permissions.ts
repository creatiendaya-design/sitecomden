// scripts/setup-customizables-permissions.ts
//
// Adds the 4 `customizables:*` permissions and grants them to the admin role.
// Idempotent — re-running it doesn't duplicate.
//
// Run once after deploying the customizer feature:
//   npx tsx scripts/setup-customizables-permissions.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: "customizables:view", name: "Ver plantillas personalizables", action: "view" },
  { key: "customizables:create", name: "Crear plantillas personalizables", action: "create" },
  { key: "customizables:update", name: "Editar plantillas personalizables", action: "update" },
  { key: "customizables:delete", name: "Eliminar plantillas personalizables", action: "delete" },
]

async function main() {
  console.log("🚀 Configurando permisos de customizables...")

  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: "customizables",
          action: p.action,
        },
      }),
    ),
  )
  console.log(`✅ ${created.length} permisos asegurados`)

  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } })
  if (!adminRole) {
    console.warn("⚠️  Rol 'admin' no encontrado — no se asignaron los permisos a ningún rol.")
    return
  }

  await Promise.all(
    created.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: p.id },
      }),
    ),
  )
  console.log("✅ Permisos asignados al rol admin")
  console.log("🎉 Setup completado")
}

main()
  .catch((e) => {
    console.error("❌ Error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
