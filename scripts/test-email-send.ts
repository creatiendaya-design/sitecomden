// TEST DE ENVÍO REAL CON RESEND
// Ejecutar: npx tsx scripts/test-email-send.ts [destino@correo.com]
//
// Envía un email de prueba usando el remitente configurado (email_settings) y
// muestra la respuesta cruda de Resend. Si el dominio no está verificado, el
// error de Resend lo dirá explícitamente.

import { prisma } from "@/lib/db";
import { Resend } from "resend";

async function main() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("❌ RESEND_API_KEY no disponible.");
    process.exit(1);
  }

  const setting = await prisma.setting.findUnique({ where: { key: "email_settings" } });
  const value = (setting?.value ?? {}) as Record<string, unknown>;
  const fromName = String(value.fromName ?? "Mi Tienda");
  const fromEmail = String(value.fromEmail ?? "onboarding@resend.dev");
  const adminEmail = String(value.adminEmail ?? "");
  const from = `${fromName} <${fromEmail}>`;

  const to = process.argv[2] || adminEmail;
  if (!to) {
    console.log("❌ No hay destino. Pásalo como argumento: npx tsx scripts/test-email-send.ts tu@correo.com");
    process.exit(1);
  }

  console.log(`📤 Enviando prueba...\n   from: ${from}\n   to:   ${to}\n`);

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "Prueba de envío — diagnóstico",
    html: "<p>Si recibes este correo, el remitente y el dominio funcionan correctamente.</p>",
  });

  if (error) {
    console.log("❌ Resend devolvió ERROR:");
    console.log(JSON.stringify(error, null, 2));
    console.log("\nSi dice 'domain is not verified', ese es el problema: verifica el");
    console.log("dominio en https://resend.com/domains o usa uno ya verificado.");
  } else {
    console.log("✅ Resend aceptó el envío. id:", data?.id);
    console.log("   Revisa la bandeja (y spam) de", to);
    console.log("   y https://resend.com/emails para ver si quedó 'delivered'.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
