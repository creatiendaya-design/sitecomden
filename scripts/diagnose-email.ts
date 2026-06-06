// DIAGNÓSTICO DE CONFIGURACIÓN DE EMAIL
// Ejecutar: npx tsx scripts/diagnose-email.ts
//
// Lee la config de remitente (email_settings) y reporta si está usando el
// dominio de pruebas de Resend (onboarding@resend.dev), que SOLO permite enviar
// a la cuenta dueña de la API key — nunca a clientes reales.

import { prisma } from "@/lib/db";

const DEFAULT_FROM = "onboarding@resend.dev";

async function main() {
  console.log("🔍 DIAGNÓSTICO DE EMAIL\n");

  console.log(`RESEND_API_KEY presente: ${process.env.RESEND_API_KEY ? "✅ sí" : "❌ NO"}`);

  const setting = await prisma.setting.findUnique({
    where: { key: "email_settings" },
  });

  if (!setting || !setting.value) {
    console.log("\n⚠️  No hay email_settings en la BD → se usan los DEFAULTS:");
    console.log(`   fromEmail = ${DEFAULT_FROM}  (dominio de pruebas de Resend)`);
    console.log("\n❌ CAUSA PROBABLE: con onboarding@resend.dev, Resend solo entrega");
    console.log("   correos a la dirección dueña de la cuenta. Los clientes NO los reciben.");
    console.log("\n👉 SOLUCIÓN: en /admin/configuracion/emails pon un fromEmail con TU dominio");
    console.log("   verificado en Resend (ej. pedidos@tudominio.com).");
    await prisma.$disconnect();
    return;
  }

  const value = setting.value as Record<string, unknown>;
  const fromEmail = String(value.fromEmail ?? "");
  const fromName = String(value.fromName ?? "");
  const replyTo = String(value.replyToEmail ?? "");
  const adminEmail = String(value.adminEmail ?? "");

  console.log("\n📧 Configuración actual (email_settings):");
  console.log(`   fromName   = ${fromName}`);
  console.log(`   fromEmail  = ${fromEmail}`);
  console.log(`   replyTo    = ${replyTo}`);
  console.log(`   adminEmail = ${adminEmail}`);
  console.log(`   → remitente final: "${fromName} <${fromEmail}>"`);

  const domain = fromEmail.split("@")[1] ?? "";
  console.log("\n🔎 Análisis:");
  if (fromEmail === DEFAULT_FROM || domain === "resend.dev") {
    console.log("   ❌ Usa el dominio de pruebas de Resend (resend.dev).");
    console.log("      Solo entrega a la cuenta dueña de la API key, no a clientes.");
    console.log("   👉 Configura un fromEmail con TU dominio verificado en Resend.");
  } else if (domain.includes("mitienda.com")) {
    console.log("   ❌ Usa el dominio placeholder 'mitienda.com' (no es real).");
    console.log("   👉 Cámbialo por tu dominio verificado en Resend.");
  } else {
    console.log(`   ℹ️  Dominio del remitente: ${domain}`);
    console.log("      Verifica en https://resend.com/domains que ESTE dominio esté");
    console.log("      'Verified'. Si está pendiente/no verificado, Resend rechaza el envío.");
  }

  console.log("\n📊 Revisa también https://resend.com/emails — ahí ves cada envío y si");
  console.log("   quedó 'delivered', 'bounced' o con error.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
