// scripts/setup-cod-forms-permissions.ts
// Adds the 4 `cod-forms:*` permissions and grants them to the appropriate roles.
// Idempotent — re-running it doesn't duplicate.
//
// Run once after deploying:
//   npx tsx scripts/setup-cod-forms-permissions.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: "cod-forms:view", name: "Ver formularios COD", action: "view" },
  { key: "cod-forms:create", name: "Crear formularios COD", action: "create" },
  { key: "cod-forms:update", name: "Editar formularios COD", action: "update" },
  { key: "cod-forms:delete", name: "Eliminar formularios COD", action: "delete" },
]

const ROLE_GRANTS: Record<string, string[]> = {
  admin: ["cod-forms:view", "cod-forms:create", "cod-forms:update", "cod-forms:delete"],
  manager: ["cod-forms:view", "cod-forms:create", "cod-forms:update", "cod-forms:delete"],
  editor: ["cod-forms:view", "cod-forms:update"],
  staff: ["cod-forms:view"],
}

async function main() {
  console.log("Configurando permisos de cod-forms...")

  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: "cod-forms",
          action: p.action,
        },
      }),
    ),
  )
  console.log(`${created.length} permisos asegurados`)

  const byKey = Object.fromEntries(created.map((p) => [p.key, p]))

  for (const [roleSlug, permKeys] of Object.entries(ROLE_GRANTS)) {
    const role = await prisma.role.findUnique({ where: { slug: roleSlug } })
    if (!role) {
      console.warn(`Rol '${roleSlug}' no encontrado - saltando.`)
      continue
    }
    await Promise.all(
      permKeys.map((key) => {
        const permission = byKey[key]
        if (!permission) return Promise.resolve()
        return prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: permission.id },
          },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        })
      }),
    )
    console.log(`Permisos asignados a rol '${roleSlug}'`)
  }
  console.log("Setup completado")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
