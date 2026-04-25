import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'landing_templates:view', name: 'Ver plantillas de landing', action: 'view' },
  { key: 'landing_templates:create', name: 'Crear plantillas de landing', action: 'create' },
  { key: 'landing_templates:update', name: 'Editar plantillas de landing', action: 'update' },
  { key: 'landing_templates:delete', name: 'Eliminar plantillas de landing', action: 'delete' },
];

async function main() {
  console.log('🚀 Configurando permisos de landing templates...');

  // 1. Upsert each permission
  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: 'landing_templates',
          action: p.action,
        },
      }),
    ),
  );
  console.log(`✅ ${created.length} permisos asegurados`);

  // 2. Find the admin role
  const adminRole = await prisma.role.findUnique({
    where: { slug: 'admin' },
  });

  if (!adminRole) {
    console.warn("⚠️  Rol 'admin' no encontrado — no se asignaron los permisos a ningún rol.");
    return;
  }

  // 3. Assign all 4 to admin (idempotent via upsert on the join table)
  await Promise.all(
    created.map((p) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      }),
    ),
  );
  console.log('✅ Permisos asignados al rol admin');
  console.log('');
  console.log('🎉 Setup completado');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
