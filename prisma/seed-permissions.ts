import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================
// DEFINICIÓN DE PERMISOS
// ============================================================

const PERMISSIONS = [
  // 📦 PRODUCTOS
  { key: "products:view", name: "Ver Productos", module: "products", action: "view", description: "Ver listado de productos" },
  { key: "products:create", name: "Crear Productos", module: "products", action: "create", description: "Crear nuevos productos" },
  { key: "products:edit", name: "Editar Productos", module: "products", action: "edit", description: "Modificar productos existentes" },
  { key: "products:delete", name: "Eliminar Productos", module: "products", action: "delete", description: "Eliminar productos del catálogo" },
  { key: "products:manage_inventory", name: "Gestionar Inventario", module: "products", action: "manage_inventory", description: "Ajustar stock de productos" },

  // 📂 CATEGORÍAS
  { key: "categories:view", name: "Ver Categorías", module: "categories", action: "view", description: "Ver categorías y colecciones" },
  { key: "categories:create", name: "Crear Categorías", module: "categories", action: "create", description: "Crear nuevas categorías" },
  { key: "categories:edit", name: "Editar Categorías", module: "categories", action: "edit", description: "Modificar categorías existentes" },
  { key: "categories:delete", name: "Eliminar Categorías", module: "categories", action: "delete", description: "Eliminar categorías" },

  // 🛒 ÓRDENES
  { key: "orders:view", name: "Ver Órdenes", module: "orders", action: "view", description: "Ver listado de órdenes" },
  { key: "orders:create", name: "Crear Órdenes", module: "orders", action: "create", description: "Crear órdenes manualmente" },
  { key: "orders:edit", name: "Editar Órdenes", module: "orders", action: "edit", description: "Modificar órdenes existentes" },
  { key: "orders:cancel", name: "Cancelar Órdenes", module: "orders", action: "cancel", description: "Cancelar órdenes pendientes" },
  { key: "orders:refund", name: "Reembolsar Órdenes", module: "orders", action: "refund", description: "Procesar reembolsos" },
  { key: "orders:update_status", name: "Actualizar Estado", module: "orders", action: "update_status", description: "Cambiar estado de órdenes" },

  // 👥 CLIENTES
  { key: "customers:view", name: "Ver Clientes", module: "customers", action: "view", description: "Ver datos básicos de clientes" },
  { key: "customers:edit", name: "Editar Clientes", module: "customers", action: "edit", description: "Modificar información de clientes" },
  { key: "customers:delete", name: "Eliminar Clientes", module: "customers", action: "delete", description: "Eliminar clientes del sistema" },
  { key: "customers:view_sensitive", name: "Ver Datos Sensibles", module: "customers", action: "view_sensitive", description: "Ver DNI, teléfono, dirección completa" },

  // 🎟️ CUPONES
  { key: "coupons:view", name: "Ver Cupones", module: "coupons", action: "view", description: "Ver cupones de descuento" },
  { key: "coupons:create", name: "Crear Cupones", module: "coupons", action: "create", description: "Crear nuevos cupones" },
  { key: "coupons:edit", name: "Editar Cupones", module: "coupons", action: "edit", description: "Modificar cupones existentes" },
  { key: "coupons:delete", name: "Eliminar Cupones", module: "coupons", action: "delete", description: "Eliminar cupones" },

  // ⭐ LEALTAD
  { key: "loyalty:view", name: "Ver Programa de Lealtad", module: "loyalty", action: "view", description: "Ver programa de puntos y recompensas" },
  { key: "loyalty:manage_points", name: "Gestionar Puntos", module: "loyalty", action: "manage_points", description: "Ajustar puntos de clientes" },
  { key: "loyalty:manage_rewards", name: "Gestionar Recompensas", module: "loyalty", action: "manage_rewards", description: "Crear y editar recompensas" },
  { key: "loyalty:configure", name: "Configurar Programa", module: "loyalty", action: "configure", description: "Cambiar configuración del programa VIP" },

  // 💳 PAGOS
  { key: "payments:view", name: "Ver Pagos", module: "payments", action: "view", description: "Ver pagos pendientes y completados" },
  { key: "payments:verify", name: "Verificar Pagos", module: "payments", action: "verify", description: "Aprobar pagos manuales (Yape/Plin)" },
  { key: "payments:reject", name: "Rechazar Pagos", module: "payments", action: "reject", description: "Rechazar pagos sospechosos" },

  // 📧 NEWSLETTER
  { key: "newsletter:view", name: "Ver Suscriptores", module: "newsletter", action: "view", description: "Ver lista de suscriptores" },
  { key: "newsletter:export", name: "Exportar Suscriptores", module: "newsletter", action: "export", description: "Descargar CSV de suscriptores" },
  { key: "newsletter:delete", name: "Eliminar Suscriptores", module: "newsletter", action: "delete", description: "Remover suscriptores" },

  // ⚙️ CONFIGURACIÓN
  { key: "settings:view", name: "Ver Configuración", module: "settings", action: "view", description: "Ver configuración del sitio" },
  { key: "settings:edit_general", name: "Editar Config. General", module: "settings", action: "edit_general", description: "Cambiar nombre, logo, SEO" },
  { key: "settings:edit_payments", name: "Editar Config. Pagos", module: "settings", action: "edit_payments", description: "Configurar Culqi, Yape, etc." },
  { key: "settings:edit_emails", name: "Editar Config. Emails", module: "settings", action: "edit_emails", description: "Configurar Resend, templates" },
  { key: "settings:edit_shipping", name: "Editar Config. Envíos", module: "settings", action: "edit_shipping", description: "Gestionar zonas y tarifas de envío" },

  // 👤 USUARIOS (ADMIN)
  { key: "users:view", name: "Ver Usuarios", module: "users", action: "view", description: "Ver lista de usuarios admin" },
  { key: "users:create", name: "Crear Usuarios", module: "users", action: "create", description: "Crear nuevos usuarios admin" },
  { key: "users:edit", name: "Editar Usuarios", module: "users", action: "edit", description: "Modificar usuarios existentes" },
  { key: "users:delete", name: "Eliminar Usuarios", module: "users", action: "delete", description: "Eliminar usuarios del sistema" },
  { key: "users:manage_roles", name: "Gestionar Roles", module: "users", action: "manage_roles", description: "Asignar y modificar roles" },
  { key: "users:manage_permissions", name: "Gestionar Permisos", module: "users", action: "manage_permissions", description: "Asignar permisos personalizados" },

  // 📊 REPORTES
  { key: "reports:view_sales", name: "Ver Reportes de Ventas", module: "reports", action: "view_sales", description: "Ver estadísticas de ventas" },
  { key: "reports:view_inventory", name: "Ver Reportes de Inventario", module: "reports", action: "view_inventory", description: "Ver movimientos de stock" },
  { key: "reports:view_customers", name: "Ver Reportes de Clientes", module: "reports", action: "view_customers", description: "Ver análisis de clientes" },
  { key: "reports:export", name: "Exportar Reportes", module: "reports", action: "export", description: "Descargar reportes en CSV/Excel" },

  // 📝 LIBRO DE RECLAMACIONES
  { key: "complaints:view", name: "Ver Reclamaciones", module: "complaints", action: "view", description: "Ver reclamaciones recibidas" },
  { key: "complaints:respond", name: "Responder Reclamaciones", module: "complaints", action: "respond", description: "Responder a reclamaciones" },
  { key: "complaints:configure", name: "Configurar Formulario", module: "complaints", action: "configure", description: "Editar campos del formulario" },
];

// ============================================================
// DEFINICIÓN DE ROLES
// ============================================================

const ROLES = [
  {
    name: "Super Admin",
    slug: "super-admin",
    description: "Acceso total al sistema sin restricciones",
    level: 100,
    color: "#dc2626", // Rojo
    isSystem: true,
    permissions: "ALL", // Todos los permisos
  },
  {
    name: "Admin",
    slug: "admin",
    description: "Administrador general con acceso amplio",
    level: 80,
    color: "#7c3aed", // Púrpura
    isSystem: true,
    permissions: [
      // Productos
      "products:view", "products:create", "products:edit", "products:delete", "products:manage_inventory",
      // Categorías
      "categories:view", "categories:create", "categories:edit", "categories:delete",
      // Órdenes
      "orders:view", "orders:create", "orders:edit", "orders:cancel", "orders:refund", "orders:update_status",
      // Clientes
      "customers:view", "customers:edit", // SIN delete y view_sensitive
      // Cupones
      "coupons:view", "coupons:create", "coupons:edit", "coupons:delete",
      // Lealtad
      "loyalty:view", "loyalty:manage_points", "loyalty:manage_rewards", "loyalty:configure",
      // Pagos
      "payments:view", "payments:verify", "payments:reject",
      // Newsletter
      "newsletter:view", "newsletter:export", "newsletter:delete",
      // Configuración
      "settings:view", "settings:edit_general", "settings:edit_emails", "settings:edit_shipping",
      // Reportes
      "reports:view_sales", "reports:view_inventory", "reports:view_customers", "reports:export",
      // Reclamaciones
      "complaints:view", "complaints:respond", "complaints:configure",
    ],
  },
  {
    name: "Vendedor",
    slug: "staff",
    description: "Personal de ventas con acceso limitado",
    level: 50,
    color: "#3b82f6", // Azul
    isSystem: false,
    permissions: [
      // Productos (solo ver)
      "products:view",
      // Órdenes (crear, ver, editar)
      "orders:view", "orders:create", "orders:edit", "orders:update_status",
      // Clientes (solo ver básico)
      "customers:view",
      // Cupones (solo aplicar, no crear)
      "coupons:view",
      // Pagos (solo ver)
      "payments:view",
    ],
  },
  {
    name: "Inventory Manager",
    slug: "inventory-manager",
    description: "Encargado de inventario y productos",
    level: 60,
    color: "#10b981", // Verde
    isSystem: false,
    permissions: [
      // Productos (todo)
      "products:view", "products:create", "products:edit", "products:delete", "products:manage_inventory",
      // Categorías (todo)
      "categories:view", "categories:create", "categories:edit", "categories:delete",
      // Órdenes (solo ver para revisar stock)
      "orders:view",
      // Reportes de inventario
      "reports:view_inventory", "reports:export",
    ],
  },
  {
    name: "Marketing",
    slug: "marketing",
    description: "Equipo de marketing y promociones",
    level: 40,
    color: "#f59e0b", // Naranja
    isSystem: false,
    permissions: [
      // Productos (solo ver)
      "products:view",
      // Categorías (solo ver)
      "categories:view",
      // Cupones (todo)
      "coupons:view", "coupons:create", "coupons:edit", "coupons:delete",
      // Newsletter (todo)
      "newsletter:view", "newsletter:export", "newsletter:delete",
      // Clientes (ver para segmentación)
      "customers:view",
      // Reportes de ventas
      "reports:view_sales", "reports:view_customers", "reports:export",
    ],
  },
  {
    name: "Soporte",
    slug: "support",
    description: "Atención al cliente y soporte",
    level: 30,
    color: "#6366f1", // Indigo
    isSystem: false,
    permissions: [
      // Productos (solo ver)
      "products:view",
      // Órdenes (ver y editar)
      "orders:view", "orders:edit", "orders:update_status",
      // Clientes (ver básico)
      "customers:view",
      // Reclamaciones (ver y responder)
      "complaints:view", "complaints:respond",
      // Cupones (solo ver para aplicar)
      "coupons:view",
    ],
  },
];

// ============================================================
// FUNCIONES DE SEED
// ============================================================

async function createPermissions() {
  console.log("📝 Creando permisos...");

  const permissionsCreated = [];

  for (const perm of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
    permissionsCreated.push(permission);
  }

  console.log(`✅ ${permissionsCreated.length} permisos creados`);
  return permissionsCreated;
}

async function createRoles(allPermissions: any[]) {
  console.log("👥 Creando roles...");

  const rolesCreated = [];

  for (const roleData of ROLES) {
    const { permissions, ...roleInfo } = roleData;

    // Crear rol
    const role = await prisma.role.upsert({
      where: { slug: roleInfo.slug },
      update: {},
      create: roleInfo,
    });

    // Asignar permisos
    if (permissions === "ALL") {
      // Super Admin tiene todos los permisos
      for (const perm of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    } else if (Array.isArray(permissions)) {
      // Otros roles tienen permisos específicos
      for (const permKey of permissions) {
        const perm = allPermissions.find((p) => p.key === permKey);
        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: perm.id,
            },
          });
        }
      }
    }

    rolesCreated.push(role);
  }

  console.log(`✅ ${rolesCreated.length} roles creados con permisos asignados`);
  return rolesCreated;
}

async function createSuperAdmin(roles: any[]) {
  console.log("👑 Creando Super Admin...");

  const superAdminRole = roles.find((r) => r.slug === "super-admin");

  if (!superAdminRole) {
    console.error("❌ No se encontró el rol Super Admin");
    return;
  }

  // La contraseña del super admin NUNCA debe estar hardcodeada en el repo.
  // Se toma de SEED_ADMIN_PASSWORD; si falta, abortamos el seed del admin
  // en vez de crear una cuenta con contraseña trivial conocida públicamente.
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@shopgood.pe";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    console.warn(
      "⚠️  SEED_ADMIN_PASSWORD no definida (mín. 8 caracteres). " +
        "Se omite la creación del Super Admin. Defínela y vuelve a correr el seed."
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: "Super Admin",
      roleId: superAdminRole.id,
      active: true,
    },
  });

  console.log("✅ Super Admin creado:");
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: (definida vía SEED_ADMIN_PASSWORD)`);
  console.log(`   Role: ${superAdminRole.name}`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🌱 Iniciando seed de sistema de permisos...\n");

  try {
    // 1. Crear permisos
    const permissions = await createPermissions();

    // 2. Crear roles con permisos
    const roles = await createRoles(permissions);

    // 3. Crear Super Admin
    await createSuperAdmin(roles);

    console.log("\n✅ ¡Seed completado exitosamente!");
    console.log("\n📊 Resumen:");
    console.log(`   - ${permissions.length} permisos creados`);
    console.log(`   - ${roles.length} roles creados`);
    console.log(`   - Super Admin (si SEED_ADMIN_PASSWORD estaba definida)`);
    console.log("\n🔐 Acceso: usa el email y la contraseña que definiste en SEED_ADMIN_PASSWORD.");
  } catch (error) {
    console.error("❌ Error durante el seed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });