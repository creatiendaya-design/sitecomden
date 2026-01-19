import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando configuración de reclamaciones...');

  const existing = await prisma.setting.findUnique({
    where: { key: 'complaints_config' },
  });

  if (!existing) {
    console.log('📝 Creando configuración inicial...');

    await prisma.setting.create({
      data: {
        key: 'complaints_config',
        value: {
          prefix: 'REC',
          emailSubject: 'Reclamación Recibida',
          emailMessage:
            'Hemos recibido su reclamación y será atendida a la brevedad. Nuestro equipo revisará su caso y se pondrá en contacto con usted en un plazo máximo de 15 días hábiles.',
          successMessage:
            'Su reclamación ha sido registrada exitosamente. Recibirá un email de confirmación con el número de reclamación para dar seguimiento a su caso.',
          requireEmail: true,
        },
        category: 'complaints',
        description: 'Configuración del sistema de reclamaciones y libro de reclamaciones',
      },
    });

    console.log('✅ Configuración creada exitosamente');
    console.log('   Prefijo: REC');
    console.log('   Email configurado: ✓');
    console.log('   Mensajes configurados: ✓');
  } else {
    console.log('ℹ️  La configuración ya existe');
    
    // ⭐ FIX: Type assertion para JsonValue
    const config = existing.value as {
      prefix?: string;
      emailSubject?: string;
      emailMessage?: string;
      successMessage?: string;
      requireEmail?: boolean;
    } | undefined;
    
    console.log('   Prefijo actual:', config?.prefix || 'REC');
    
    // Mostrar configuración actual
    console.log('\n📋 Configuración actual:');
    console.log('   Key:', existing.key);
    console.log('   Prefijo:', config?.prefix || 'REC');
    console.log('   Email Subject:', config?.emailSubject || 'N/A');
    console.log('   Require Email:', config?.requireEmail !== false ? 'Sí' : 'No');
  }

  console.log('\n🎉 Listo para usar');
  console.log('   Puedes cambiar la configuración desde: /admin/complaints/config');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });