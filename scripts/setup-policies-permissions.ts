// Adds the 4 `policies:*` permissions and grants them to the admin role.
// Idempotent — re-running it doesn't duplicate.
//
// Run once after deploying Plan 5.6:
//   npx tsx scripts/setup-policies-permissions.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: "policies:view", name: "Ver políticas legales", action: "view" },
  { key: "policies:create", name: "Crear políticas legales", action: "create" },
  { key: "policies:update", name: "Editar políticas legales", action: "update" },
  { key: "policies:delete", name: "Eliminar políticas legales", action: "delete" },
]

async function main() {
  console.log("🚀 Configurando permisos de policies...")

  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: "policies",
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
