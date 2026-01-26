// scripts/setup-permissions.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Configurando permisos...');

  // 1. Crear permiso
  const permission = await prisma.permission.upsert({
    where: { key: 'settings.update' },
    update: {},
    create: {
      key: 'settings.update',
      name: 'Actualizar Configuración',
      description: 'Permite modificar la configuración del sistema',
      module: 'settings',
      action: 'update',
    },
  });

  console.log('✅ Permiso creado:', permission.key);

  // 2. Buscar rol admin
  const adminRole = await prisma.role.findUnique({
    where: { slug: 'admin' },
  });

  if (!adminRole) {
    console.error('❌ Error: No existe el rol "admin"');
    return;
  }

  // 3. Asignar permiso al rol
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    },
    update: {},
    create: {
      roleId: adminRole.id,
      permissionId: permission.id,
    },
  });

  console.log('✅ Permiso asignado al rol admin');

  // 4. Crear configuración de métodos de pago
  await prisma.setting.upsert({
    where: { key: 'payment_methods' },
    update: {},
    create: {
      key: 'payment_methods',
      value: {
        yape: {
          enabled: true,
          phoneNumber: '987654321',
          qrImageUrl: '',
          accountName: 'Tu Tienda Perú',
        },
        plin: {
          enabled: true,
          phoneNumber: '987654321',
          qrImageUrl: '',
          accountName: 'Tu Tienda Perú',
        },
        card: {
          enabled: true,
          description: 'Acepta Visa, Mastercard y otras tarjetas',
        },
        paypal: {
          enabled: false,
          description: 'Pagos internacionales con PayPal',
        },
        mercadopago: {
          enabled: false,
          description: 'Alternativa para LATAM',
        },
      },
      category: 'payment',
      description: 'Configuración de métodos de pago',
    },
  });

  console.log('✅ Configuración de métodos de pago creada');
  console.log('');
  console.log('🎉 ¡Setup completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });