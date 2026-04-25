import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: "menus:view", name: "Ver menús", action: "view" },
  { key: "menus:create", name: "Crear menús", action: "create" },
  { key: "menus:update", name: "Editar menús", action: "update" },
  { key: "menus:delete", name: "Eliminar menús", action: "delete" },
]

async function main() {
  console.log("🚀 Configurando permisos de menus...")
  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: "menus",
          action: p.action,
        },
      }),
    ),
  )
  console.log(`✅ ${created.length} permisos asegurados`)

  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } })
  if (!adminRole) {
    console.warn("⚠️  Rol 'admin' no encontrado.")
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
}

main()
  .catch((e) => {
    console.error("❌ Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
