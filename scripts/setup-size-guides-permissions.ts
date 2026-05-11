// Adds the 4 `size-guides:*` permissions and grants them to the admin role.
// Idempotent — re-running it doesn't duplicate.
//
// Run once after deploying the size-guides feature:
//   npx tsx scripts/setup-size-guides-permissions.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: "size-guides:view", name: "Ver guías de tallas", action: "view" },
  { key: "size-guides:create", name: "Crear guías de tallas", action: "create" },
  { key: "size-guides:update", name: "Editar guías de tallas", action: "update" },
  { key: "size-guides:delete", name: "Eliminar guías de tallas", action: "delete" },
]

async function main() {
  console.log("🚀 Configurando permisos de size-guides...")

  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: "size-guides",
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
