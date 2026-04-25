// Adds the 5 `themes:*` permissions and grants them to the admin role.
// Idempotent — re-running it doesn't duplicate.
//
// Run once after deploying Plan 4:
//   npx tsx scripts/setup-themes-permissions.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: "themes:view", name: "Ver temas", action: "view" },
  { key: "themes:create", name: "Crear temas", action: "create" },
  { key: "themes:update", name: "Editar temas", action: "update" },
  { key: "themes:delete", name: "Eliminar temas", action: "delete" },
  // Separate from `update` because activating a theme has wide blast radius
  // (affects every product without its own landingTemplateId).
  { key: "themes:activate", name: "Activar tema", action: "activate" },
]

async function main() {
  console.log("🚀 Configurando permisos de themes...")

  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: "themes",
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
  .finally(async () => {
    await prisma.$disconnect()
  })
