/**
 * Cambia la contraseña de un usuario admin.
 *
 * Uso (PowerShell):
 *   $env:ADMIN_EMAIL="tu@correo.com"; $env:NEW_PASSWORD="TuNuevaClaveSegura"; npx tsx scripts/change-admin-password.ts
 *
 * Uso (bash):
 *   ADMIN_EMAIL="tu@correo.com" NEW_PASSWORD="TuNuevaClaveSegura" npx tsx scripts/change-admin-password.ts
 *
 * La contraseña se pasa por variable de entorno a propósito: no queda en el
 * código ni se imprime en pantalla. Usa el mismo hashing (bcryptjs) que el login.
 */

import { prisma } from "../lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const newPassword = process.env.NEW_PASSWORD;

  if (!email) {
    console.error("❌ Falta ADMIN_EMAIL (el email del admin a actualizar).");
    process.exit(1);
  }
  if (!newPassword || newPassword.length < 8) {
    console.error("❌ Falta NEW_PASSWORD o es muy corta (mínimo 8 caracteres).");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ No existe ningún usuario con email: ${email}`);
    console.error("   Tip: revisa el email exacto en /admin/configuracion/usuarios");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  console.log(`✅ Contraseña actualizada para: ${email}`);
  console.log("   Ya puedes iniciar sesión con la nueva contraseña.");
}

main()
  .catch((err) => {
    console.error("❌ Error al cambiar la contraseña:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
