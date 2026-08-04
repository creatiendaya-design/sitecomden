/**
 * 🏪 Provisionamiento de una tienda nueva (modelo multi-instancia).
 *
 * Sustituye los ~15 comandos manuales del Paso 4 de
 * `docs/instalacion-tienda-nueva.md` por un solo comando que, antes de
 * escribir nada:
 *
 *   1. Valida que estén TODAS las variables de entorno que el código consume.
 *      Las que faltaban en `.env.example` (CLERK_WEBHOOK_SECRET, CRON_SECRET,
 *      RESEND_FROM_EMAIL…) no rompen el build: rompen la tienda en silencio.
 *   2. Muestra el host y la base de datos destino y exige que escribas su
 *      nombre para continuar. Ese es el error caro de este flujo: sembrar la
 *      tienda nueva encima de la tienda que ya factura.
 *
 * Uso:
 *   npx tsx scripts/setup-tienda-nueva.ts              # interactivo
 *   npx tsx scripts/setup-tienda-nueva.ts --check      # solo valida, no escribe
 *   npx tsx scripts/setup-tienda-nueva.ts --with-optional
 *   npx tsx scripts/setup-tienda-nueva.ts --yes        # sin confirmación (CI)
 *   npx tsx scripts/setup-tienda-nueva.ts --skip-migrate
 */
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import "dotenv/config";

// ------------------------------------------------------------
// Definición de variables de entorno
// ------------------------------------------------------------

type Severity = "required" | "recommended" | "optional";

interface EnvVar {
  readonly name: string;
  readonly severity: Severity;
  readonly why: string;
  /** Devuelve un mensaje de error si el valor es inválido; null si está bien. */
  readonly validate?: (value: string) => string | null;
}

/** `--local` permite localhost para provisionar una BD de desarrollo. */
const ALLOW_LOCALHOST = process.argv.includes("--local");

const isAbsoluteUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "debe empezar por http:// o https://";
    }
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (isLocal && !ALLOW_LOCALHOST) {
      return "apunta a localhost — usa el dominio real de la tienda (o pasa --local si es una BD de desarrollo)";
    }
    return null;
  } catch {
    return "no es una URL válida";
  }
};

const ENV_VARS: readonly EnvVar[] = [
  {
    name: "DATABASE_URL",
    severity: "required",
    why: "Base de datos Neon de ESTA tienda",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    severity: "required",
    why: "URL canónica: sitemap, robots, correos y eventos de tracking",
    validate: isAbsoluteUrl,
  },
  {
    name: "SEED_ADMIN_EMAIL",
    severity: "required",
    why: "Super Admin inicial del panel",
    validate: (v) => (v.includes("@") ? null : "no parece un email"),
  },
  {
    name: "SEED_ADMIN_PASSWORD",
    severity: "required",
    why: "Contraseña del Super Admin inicial",
    validate: (v) => (v.length >= 8 ? null : "mínimo 8 caracteres"),
  },
  {
    name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    severity: "required",
    why: "Login de clientes",
  },
  { name: "CLERK_SECRET_KEY", severity: "required", why: "Login de clientes" },
  {
    name: "CLERK_WEBHOOK_SECRET",
    severity: "required",
    why: "Sin esto el webhook rechaza todo y NO se crea ningún Customer",
  },
  {
    name: "SUNAT_ENCRYPTION_KEY",
    severity: "required",
    why: "Cifrado AES-256 de credenciales de facturación",
    validate: (v) =>
      /^[0-9a-fA-F]{64}$/.test(v) ? null : "deben ser 64 chars hex (openssl rand -hex 32)",
  },
  {
    name: "RESEND_API_KEY",
    severity: "recommended",
    why: "Correos transaccionales (confirmación de pedido, etc.)",
  },
  {
    name: "RESEND_FROM_EMAIL",
    severity: "recommended",
    why: "Remitente de los correos. Sin esto salen con el remitente por defecto",
  },
  {
    name: "BLOB_READ_WRITE_TOKEN",
    severity: "recommended",
    why: "Subida de imágenes a Vercel Blob",
  },
  {
    name: "UPSTASH_REDIS_REST_URL",
    severity: "recommended",
    why: "Rate limiting (sin esto el checkout queda sin protección de abuso)",
  },
  { name: "UPSTASH_REDIS_REST_TOKEN", severity: "recommended", why: "Rate limiting" },
  {
    name: "CRON_SECRET",
    severity: "recommended",
    why: "Protege los endpoints de cron (warmup, liberación de reservas)",
  },
  {
    name: "NEXT_PUBLIC_CULQI_PUBLIC_KEY",
    severity: "optional",
    why: "Pagos con tarjeta vía Culqi",
  },
  { name: "CULQI_SECRET_KEY", severity: "optional", why: "Pagos con tarjeta vía Culqi" },
  {
    name: "ORDER_RESERVATION_MINUTES",
    severity: "optional",
    why: "Ventana de reserva de stock (por defecto usa el valor del código)",
  },
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    severity: "optional",
    why: "Error tracking en producción",
  },
  {
    name: "CLOUDFLARE_ACCOUNT_ID",
    severity: "optional",
    why: "Video vía Cloudflare Stream (si falta, el video cae a Vercel Blob)",
  },
  { name: "CLOUDFLARE_STREAM_API_TOKEN", severity: "optional", why: "Video vía Cloudflare Stream" },
];

// ------------------------------------------------------------
// Pasos de siembra
// ------------------------------------------------------------

interface Step {
  readonly label: string;
  readonly command: string;
  readonly optional?: boolean;
}

const STEPS: readonly Step[] = [
  { label: "Cliente Prisma", command: "npx prisma generate" },
  { label: "Esquema (migraciones)", command: "npx prisma migrate deploy" },
  { label: "Permisos + Super Admin", command: "npx tsx prisma/seed-permissions.ts" },
  { label: "Catálogo completo de permisos", command: "npx tsx scripts/sync-all-permissions.ts" },
  { label: "Admin editable", command: "npx tsx scripts/make-admin-editable.ts" },
  { label: "Geografía de Perú", command: "npx tsx prisma/seed-peru-completo.ts" },
  { label: "Sistema de envíos", command: "npx tsx prisma/seed-shipping-system.ts" },
  { label: "Tema base", command: "npx tsx scripts/seed-themes.ts" },
  { label: "Menús", command: "npx tsx scripts/seed-menus.ts" },
  { label: "Página home", command: "npx tsx scripts/seed-home-page.ts" },
  { label: "Página carrito", command: "npx tsx scripts/seed-cart-page.ts" },
  { label: "Políticas legales", command: "npx tsx scripts/seed-policies.ts" },
  { label: "Páginas estáticas", command: "npx tsx scripts/seed-static-pages.ts" },
  { label: "Catálogo de footer", command: "npx tsx scripts/add-footer-peer-types-to-catalog.ts" },
  { label: "Config. Culqi", command: "npx tsx scripts/init-culqi-config.ts" },
  { label: "Config. reclamaciones", command: "npx tsx scripts/init-complaints-config.ts" },

  // Opcionales — solo con --with-optional
  { label: "Plantillas de landing", command: "npx tsx scripts/seed-landing-templates.ts", optional: true },
  { label: "Plantilla de ficha de producto", command: "npx tsx scripts/seed-product-template.ts", optional: true },
  { label: "Plantilla de colección", command: "npx tsx scripts/seed-collection-template.ts", optional: true },
  { label: "Formulario COD por defecto", command: "npx tsx scripts/seed-cod-form-default.ts", optional: true },
  { label: 'Sección "Comprados juntos"', command: "npx tsx scripts/seed-fbt-section.ts", optional: true },
];

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------

interface DbTarget {
  readonly host: string;
  readonly database: string;
}

/** Extrae host + nombre de BD del DATABASE_URL sin exponer credenciales. */
function parseDbTarget(databaseUrl: string): DbTarget | null {
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\//, "") || "(sin nombre)",
    };
  } catch {
    return null;
  }
}

interface ValidationResult {
  readonly blocking: readonly string[];
  readonly warnings: readonly string[];
}

function validateEnv(): ValidationResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  for (const spec of ENV_VARS) {
    const raw = process.env[spec.name];
    const value = typeof raw === "string" ? raw.trim() : "";
    const label = `${spec.name} — ${spec.why}`;

    if (value.length === 0) {
      if (spec.severity === "required") blocking.push(`FALTA  ${label}`);
      else if (spec.severity === "recommended") warnings.push(`falta  ${label}`);
      continue;
    }

    const error = spec.validate?.(value);
    if (error) {
      const message = `${spec.name} — ${error}`;
      if (spec.severity === "required") blocking.push(`INVÁLIDA  ${message}`);
      else warnings.push(`inválida  ${message}`);
    }
  }

  return { blocking, warnings };
}

async function confirmTarget(target: DbTarget): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log(
      `\n⚠️  Vas a ESCRIBIR en esta base de datos:\n` +
        `      host: ${target.host}\n` +
        `      base: ${target.database}\n\n` +
        `   Si no es la tienda nueva, cancela ahora (Ctrl+C).`,
    );
    const answer = await rl.question(
      `\n   Escribe el nombre de la base para confirmar: `,
    );
    return answer.trim() === target.database;
  } finally {
    rl.close();
  }
}

function runStep(step: Step, index: number, total: number): void {
  console.log(`\n[${index}/${total}] ${step.label}`);
  console.log(`        $ ${step.command}`);
  execSync(step.command, { stdio: "inherit" });
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has("--check");
  const skipConfirm = args.has("--yes");
  const withOptional = args.has("--with-optional");
  const skipMigrate = args.has("--skip-migrate");

  console.log("🏪 Provisionamiento de tienda nueva\n");
  console.log("── Validando variables de entorno ──");

  const { blocking, warnings } = validateEnv();

  for (const warning of warnings) console.log(`   ⚠️  ${warning}`);
  for (const problem of blocking) console.log(`   ❌ ${problem}`);

  if (blocking.length > 0) {
    console.error(
      `\n❌ ${blocking.length} variable(s) obligatoria(s) sin resolver. ` +
        `Complétalas en .env (o en las Environment Variables del proyecto de ` +
        `Vercel) y vuelve a ejecutar.\n` +
        `   Referencia: .env.example y docs/instalacion-tienda-nueva.md (Paso 3).`,
    );
    process.exit(1);
  }

  console.log(
    warnings.length > 0
      ? `\n✅ Obligatorias OK (${warnings.length} recomendada(s) sin definir — la tienda arranca, pero revisa la lista).`
      : "\n✅ Todas las variables verificadas.",
  );

  const target = parseDbTarget(process.env.DATABASE_URL ?? "");
  if (!target) {
    console.error("\n❌ DATABASE_URL no se pudo interpretar como URL de conexión.");
    process.exit(1);
  }

  if (checkOnly) {
    console.log(
      `\n🔍 --check: no se escribió nada. Destino que se habría usado: ` +
        `${target.host}/${target.database}`,
    );
    return;
  }

  if (!skipConfirm) {
    const confirmed = await confirmTarget(target);
    if (!confirmed) {
      console.error("\n🛑 El nombre no coincide. Cancelado sin escribir nada.");
      process.exit(1);
    }
  }

  const steps = STEPS.filter((step) => {
    if (step.optional && !withOptional) return false;
    if (skipMigrate && step.command.includes("migrate deploy")) return false;
    return true;
  });

  console.log(`\n── Sembrando ${target.host}/${target.database} ──`);

  steps.forEach((step, i) => runStep(step, i + 1, steps.length));

  console.log(
    `\n🎉 Tienda provisionada en ${target.host}/${target.database}\n\n` +
      `Siguientes pasos manuales:\n` +
      `  1. Vercel → Settings → Domains: asigna el dominio de la tienda.\n` +
      `  2. Clerk dashboard → webhook a ${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/clerk\n` +
      `  3. Culqi dashboard → webhook a ${process.env.NEXT_PUBLIC_APP_URL}/api/webhook\n` +
      `  4. Entra a /admin-auth con ${process.env.SEED_ADMIN_EMAIL}\n` +
      `  5. ⚠️  Restaura tu .env local a la BD de desarrollo.\n\n` +
      `Checklist completo: docs/instalacion-tienda-nueva.md`,
  );
}

main().catch((error: unknown) => {
  console.error(
    "\n❌ Setup interrumpido:",
    error instanceof Error ? error.message : error,
  );
  console.error(
    "   Los pasos son idempotentes: corrige la causa y vuelve a ejecutar " +
      "(puedes usar --skip-migrate si el esquema ya está aplicado).",
  );
  process.exit(1);
});
