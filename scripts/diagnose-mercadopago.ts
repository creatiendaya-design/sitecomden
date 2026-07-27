/**
 * Diagnóstico de MercadoPago — imprime la causa REAL de un fallo de integración.
 *
 *   npx tsx scripts/diagnose-mercadopago.ts
 *   npx tsx scripts/diagnose-mercadopago.ts https://mitienda.pe   # forzar baseUrl
 *
 * Qué comprueba, en orden (se detiene en el primer fallo bloqueante):
 *  1. Config guardada en BD: modo activo, qué credenciales existen, prefijo del
 *     token (TEST-/APP_USR-) y si el modo casa con el prefijo.
 *  2. baseUrl pública: MercadoPago RECHAZA la preferencia si `notification_url`
 *     no es https público (error `invalid_notification_url`), y rechaza
 *     `auto_return` sin back_urls https.
 *  3. /users/me con el access token → confirma que el token es válido, a qué
 *     cuenta pertenece, site_id (debe ser MPE para Perú) y el email del vendedor.
 *  4. Creación de una preferencia real de S/ 1.00 → imprime el JSON de error
 *     COMPLETO que devuelve MercadoPago (esto es lo que el checkout oculta
 *     detrás de "Error al iniciar el pago").
 *
 * No modifica nada. La preferencia de prueba no cobra a nadie: solo existe
 * hasta que alguien la abre y paga.
 */

import { readMercadoPagoSettings, MERCADOPAGO_CURRENCY } from "../lib/mercadopago/config";

const MP_API = "https://api.mercadopago.com";

function mask(token: string): string {
  if (!token) return "(vacío)";
  if (token.length <= 14) return `${token.slice(0, 6)}…`;
  return `${token.slice(0, 12)}…${token.slice(-4)}`;
}

function line(char = "─"): void {
  console.log(char.repeat(72));
}

function ok(msg: string): void {
  console.log(`  ✅ ${msg}`);
}

function bad(msg: string): void {
  console.log(`  ❌ ${msg}`);
}

function warn(msg: string): void {
  console.log(`  ⚠️  ${msg}`);
}

async function main(): Promise<void> {
  const baseUrl = (
    process.argv[2] ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  line("═");
  console.log("  DIAGNÓSTICO MERCADOPAGO");
  line("═");

  // ---------------------------------------------------------------- 1. Config
  console.log("\n[1] Configuración guardada en base de datos");
  const settings = await readMercadoPagoSettings();

  console.log(`  Modo activo (el que usa el checkout): ${settings.mode.toUpperCase()}`);
  console.log(`  Credenciales TEST       → accessToken: ${mask(settings.test.accessToken)} | publicKey: ${mask(settings.test.publicKey)}`);
  console.log(`  Credenciales PRODUCCIÓN → accessToken: ${mask(settings.production.accessToken)} | publicKey: ${mask(settings.production.publicKey)}`);
  console.log(`  Webhook secret: ${settings.webhookSecret ? "configurado" : "(vacío — no se valida firma)"}`);

  const active = settings.mode === "production" ? settings.production : settings.test;

  if (!active.accessToken) {
    bad(
      `El modo activo es "${settings.mode}" pero ESE access token está vacío. ` +
        `El checkout responderá "MercadoPago no está configurado".`
    );
    console.log(
      `\n  → Arreglo: en /admin/configuracion/mercadopago, pega las credenciales en la ` +
        `pestaña "${settings.mode}" O cambia el modo al que sí tiene credenciales.`
    );
    return;
  }
  ok("Hay access token para el modo activo.");

  // Coherencia modo ↔ prefijo del token.
  const isTestToken = active.accessToken.startsWith("TEST-");
  const isProdToken = active.accessToken.startsWith("APP_USR-");
  if (settings.mode === "production" && isTestToken) {
    bad(
      "Modo PRODUCCIÓN pero el token empieza con TEST-. Estás cobrando contra el " +
        "entorno de pruebas: ningún pago real se acredita."
    );
  } else if (settings.mode === "test" && isProdToken) {
    warn("Modo TEST pero el token es de producción (APP_USR-). Los pagos serán REALES.");
  } else if (!isTestToken && !isProdToken) {
    warn(
      `El token no empieza ni con TEST- ni con APP_USR- (empieza con "${active.accessToken.slice(0, 8)}"). ` +
        "Puede que hayas pegado la Public Key en el campo del Access Token, o que esté recortado."
    );
  } else {
    ok(`Prefijo del token coherente con el modo (${isProdToken ? "APP_USR-" : "TEST-"}).`);
  }

  if (active.publicKey && active.publicKey.startsWith("APP_USR-") !== isProdToken) {
    warn("La Public Key y el Access Token parecen ser de entornos distintos (uno TEST, otro producción).");
  }

  // --------------------------------------------------------------- 2. baseUrl
  console.log("\n[2] URL pública usada para back_urls / notification_url");
  console.log(`  baseUrl = ${baseUrl}`);
  const isHttps = baseUrl.startsWith("https://");
  const isLocal = /localhost|127\.0\.0\.1/.test(baseUrl);

  if (isLocal) {
    bad(
      "Es localhost. MercadoPago no puede alcanzar el notification_url ni volver a " +
        "las back_urls. En producción NEXT_PUBLIC_APP_URL debe ser el dominio https real."
    );
    warn(
      "Si estás corriendo este script en tu PC, esto es esperable: pásalo como argumento " +
        "→ npx tsx scripts/diagnose-mercadopago.ts https://tudominio.pe"
    );
  } else if (!isHttps) {
    bad("No es https. MercadoPago exige https para notification_url y auto_return.");
  } else {
    ok("URL pública https.");
  }
  console.log(`  notification_url → ${baseUrl}/api/webhooks/mercadopago`);
  console.log(`  auto_return      → ${isHttps ? '"approved" (se envía)' : "(se omite, no es https)"}`);

  // -------------------------------------------------------------- 3. users/me
  console.log("\n[3] Validez del token — GET /users/me");
  let sellerEmail: string | null = null;
  try {
    const res = await fetch(`${MP_API}/users/me`, {
      headers: { Authorization: `Bearer ${active.accessToken}` },
    });
    const body = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      bad(`HTTP ${res.status} — el token fue RECHAZADO por MercadoPago.`);
      console.log("  Respuesta:", JSON.stringify(body, null, 2));
      if (res.status === 401) {
        console.log(
          "\n  → Causa típica: token inválido/revocado, o credenciales de producción " +
            "no habilitadas todavía en la cuenta (Tus integraciones → tu app → " +
            "Credenciales de producción → 'Activar credenciales')."
        );
      }
      return;
    }

    sellerEmail = typeof body.email === "string" ? body.email : null;
    const siteId = body.site_id;
    ok(`Token válido. Cuenta: ${body.nickname ?? "?"} (id ${body.id ?? "?"})`);
    console.log(`  Email del vendedor: ${sellerEmail ?? "?"}`);
    console.log(`  site_id: ${siteId ?? "?"}  |  país: ${body.country_id ?? "?"}`);
    console.log(`  tipo de usuario: ${JSON.stringify(body.user_type ?? body.tags ?? "?")}`);

    if (siteId !== "MPE") {
      bad(
        `site_id es "${String(siteId)}" pero el checkout crea preferencias en ${MERCADOPAGO_CURRENCY} (Perú = MPE). ` +
          "Moneda y cuenta no coinciden → la preferencia falla o el pago se rechaza."
      );
    } else {
      ok(`Cuenta peruana (MPE), coherente con currency_id ${MERCADOPAGO_CURRENCY}.`);
    }
  } catch (error) {
    bad(`No se pudo llamar a /users/me: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  // ------------------------------------------------------------ 4. preference
  console.log("\n[4] Creación de una preferencia real (S/ 1.00, no cobra nada)");
  const fakeOrderId = `diagnostico-${Date.now()}`;
  const preferenceBody = {
    items: [
      {
        id: fakeOrderId,
        title: "Diagnóstico de integración",
        quantity: 1,
        unit_price: 1,
        currency_id: MERCADOPAGO_CURRENCY,
      },
    ],
    payer: { name: "Diagnostico", email: "test_user_diagnostico@testuser.com" },
    back_urls: {
      success: `${baseUrl}/orden/${fakeOrderId}/confirmacion`,
      pending: `${baseUrl}/orden/${fakeOrderId}/confirmacion`,
      failure: `${baseUrl}/orden/${fakeOrderId}/pago-mercadopago`,
    },
    ...(isHttps ? { auto_return: "approved" } : {}),
    notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    external_reference: fakeOrderId,
    statement_descriptor: "TIENDA",
  };

  try {
    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${active.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });
    const body = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      bad(`HTTP ${res.status} — MercadoPago rechazó la preferencia.`);
      console.log("\n  ===== RESPUESTA COMPLETA DE MERCADOPAGO =====");
      console.log(JSON.stringify(body, null, 2));
      console.log("  =============================================");
      console.log(
        "\n  → Este JSON es la causa real del error genérico " +
          '"Error al iniciar el pago con MercadoPago" que ve el cliente.'
      );
      return;
    }

    ok("Preferencia creada correctamente. La integración server-side FUNCIONA.");
    console.log(`  preference id: ${body.id}`);
    console.log(`  init_point:    ${body.init_point}`);
    console.log(
      "\n  → Abre ese init_point en una ventana de incógnito para ver el checkout real."
    );
    if (sellerEmail) {
      console.log(
        `  → IMPORTANTE: NO pagues con la cuenta del vendedor (${sellerEmail}). ` +
          "MercadoPago bloquea pagarte a ti mismo y el checkout falla sin explicar por qué."
      );
    }
  } catch (error) {
    bad(`Fallo de red al crear la preferencia: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");
  line("═");
}

main()
  .catch((error) => {
    console.error("\nDiagnóstico abortado:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../lib/db");
    await prisma.$disconnect();
  });
