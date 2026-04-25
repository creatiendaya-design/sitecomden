// Adds the 4 `pages:*` permissions and grants them to the admin role.
// Idempotent — re-running it doesn't duplicate.
//
// Run once after deploying Plan 5:
//   npx tsx scripts/setup-pages-permissions.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: "pages:view", name: "Ver páginas estáticas", action: "view" },
  { key: "pages:create", name: "Crear páginas estáticas", action: "create" },
  { key: "pages:update", name: "Editar páginas estáticas", action: "update" },
  { key: "pages:delete", name: "Eliminar páginas estáticas", action: "delete" },
]

async function main() {
  console.log("🚀 Configurando permisos de pages...")

  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: "pages",
          action: p.action,
        },
      }),
    ),
  )
  console.log(`✅ ${created.length} permisos asegurados`)

  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } })
  if (!adminRole) {
    console.warn("⚠️  Rol 'admin' no encontrado — no se asignaron los permisos.")
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
  .finally(async () => {
    await prisma.$disconnect()
  })
