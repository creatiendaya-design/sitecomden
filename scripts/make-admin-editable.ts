import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdminEditable() {
  try {
    const role = await prisma.role.update({
      where: { name: "Admin" },
      data: { isSystem: false }
    });

    console.log('✅ Rol "Admin" ahora es editable');
    console.log('   Puedes editarlo desde: http://localhost:3000/admin/configuracion/roles');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdminEditable();