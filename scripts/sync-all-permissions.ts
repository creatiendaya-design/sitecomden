/**
 * Sincroniza el catálogo de permisos en DB con TODOS los keys que el código
 * actualmente usa (legacy `:edit` + canónico `:update` + módulos modernos
 * como themes, pages, menus, policies, landing_templates, customizables,
 * cod-forms, size-guides, audit, etc.).
 *
 * Es idempotente: usa upserts y nunca borra permisos existentes.
 *
 * Además: para cada rol existente que tenga la versión legacy (ej.
 * `products:edit`), también le concede la nueva (`products:update`). Esto
 * complementa el alias en `lib/permissions-check.ts` para que la UI
 * (PermissionSelector) muestre la nueva key marcada cuando se edite el rol.
 *
 * Uso:
 *   npx tsx scripts/sync-all-permissions.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PermDef {
  key: string;
  name: string;
  description: string;
  module: string;
  action: string;
}

// ------------------------------------------------------------
// Catálogo COMPLETO (legacy + canónico + módulos nuevos)
// ------------------------------------------------------------
const PERMISSIONS: PermDef[] = [
  // Productos
  { key: "products:view", name: "Ver Productos", module: "products", action: "view", description: "Ver listado de productos" },
  { key: "products:create", name: "Crear Productos", module: "products", action: "create", description: "Crear nuevos productos" },
  { key: "products:edit", name: "Editar Productos (legacy)", module: "products", action: "edit", description: "Alias legacy de products:update" },
  { key: "products:update", name: "Editar Productos", module: "products", action: "update", description: "Modificar productos existentes" },
  { key: "products:delete", name: "Eliminar Productos", module: "products", action: "delete", description: "Eliminar productos del catálogo" },
  { key: "products:manage_inventory", name: "Gestionar Inventario", module: "products", action: "manage_inventory", description: "Ajustar stock de productos" },

  // Categorías
  { key: "categories:view", name: "Ver Categorías", module: "categories", action: "view", description: "Ver categorías y colecciones" },
  { key: "categories:create", name: "Crear Categorías", module: "categories", action: "create", description: "Crear nuevas categorías" },
  { key: "categories:edit", name: "Editar Categorías (legacy)", module: "categories", action: "edit", description: "Alias legacy de categories:update" },
  { key: "categories:update", name: "Editar Categorías", module: "categories", action: "update", description: "Modificar categorías existentes" },
  { key: "categories:delete", name: "Eliminar Categorías", module: "categories", action: "delete", description: "Eliminar categorías" },

  // Órdenes
  { key: "orders:view", name: "Ver Órdenes", module: "orders", action: "view", description: "Ver listado de órdenes" },
  { key: "orders:create", name: "Crear Órdenes", module: "orders", action: "create", description: "Crear órdenes manualmente" },
  { key: "orders:edit", name: "Editar Órdenes (legacy)", module: "orders", action: "edit", description: "Alias legacy de orders:update" },
  { key: "orders:update", name: "Editar Órdenes", module: "orders", action: "update", description: "Modificar órdenes existentes" },
  { key: "orders:cancel", name: "Cancelar Órdenes", module: "orders", action: "cancel", description: "Cancelar órdenes pendientes" },
  { key: "orders:refund", name: "Reembolsar Órdenes", module: "orders", action: "refund", description: "Procesar reembolsos" },
  { key: "orders:update_status", name: "Actualizar Estado", module: "orders", action: "update_status", description: "Cambiar estado de órdenes" },

  // Clientes
  { key: "customers:view", name: "Ver Clientes", module: "customers", action: "view", description: "Ver datos básicos de clientes" },
  { key: "customers:edit", name: "Editar Clientes (legacy)", module: "customers", action: "edit", description: "Alias legacy de customers:update" },
  { key: "customers:update", name: "Editar Clientes", module: "customers", action: "update", description: "Modificar información de clientes" },
  { key: "customers:delete", name: "Eliminar Clientes", module: "customers", action: "delete", description: "Eliminar clientes del sistema" },
  { key: "customers:view_sensitive", name: "Ver Datos Sensibles", module: "customers", action: "view_sensitive", description: "Ver DNI, teléfono, dirección completa" },

  // Cupones
  { key: "coupons:view", name: "Ver Cupones", module: "coupons", action: "view", description: "Ver cupones de descuento" },
  { key: "coupons:create", name: "Crear Cupones", module: "coupons", action: "create", description: "Crear nuevos cupones" },
  { key: "coupons:edit", name: "Editar Cupones (legacy)", module: "coupons", action: "edit", description: "Alias legacy de coupons:update" },
  { key: "coupons:update", name: "Editar Cupones", module: "coupons", action: "update", description: "Modificar cupones existentes" },
  { key: "coupons:delete", name: "Eliminar Cupones", module: "coupons", action: "delete", description: "Eliminar cupones" },

  // Lealtad
  { key: "loyalty:view", name: "Ver Programa de Lealtad", module: "loyalty", action: "view", description: "Ver programa de puntos y recompensas" },
  { key: "loyalty:manage_points", name: "Gestionar Puntos", module: "loyalty", action: "manage_points", description: "Ajustar puntos de clientes" },
  { key: "loyalty:manage_rewards", name: "Gestionar Recompensas", module: "loyalty", action: "manage_rewards", description: "Crear y editar recompensas" },
  { key: "loyalty:configure", name: "Configurar Programa", module: "loyalty", action: "configure", description: "Cambiar configuración del programa VIP" },

  // Pagos
  { key: "payments:view", name: "Ver Pagos", module: "payments", action: "view", description: "Ver pagos pendientes y completados" },
  { key: "payments:verify", name: "Verificar Pagos", module: "payments", action: "verify", description: "Aprobar pagos manuales (Yape/Plin)" },
  { key: "payments:reject", name: "Rechazar Pagos", module: "payments", action: "reject", description: "Rechazar pagos sospechosos" },

  // Newsletter
  { key: "newsletter:view", name: "Ver Suscriptores", module: "newsletter", action: "view", description: "Ver lista de suscriptores" },
  { key: "newsletter:export", name: "Exportar Suscriptores", module: "newsletter", action: "export", description: "Descargar CSV de suscriptores" },
  { key: "newsletter:delete", name: "Eliminar Suscriptores", module: "newsletter", action: "delete", description: "Remover suscriptores" },

  // Configuración
  { key: "settings:view", name: "Ver Configuración", module: "settings", action: "view", description: "Ver configuración del sitio" },
  { key: "settings:edit", name: "Editar Configuración", module: "settings", action: "edit", description: "Editar configuración general (SUNAT, etc.)" },
  { key: "settings:update", name: "Actualizar Configuración", module: "settings", action: "update", description: "Actualizar parámetros del sistema" },
  { key: "settings:edit_general", name: "Editar Config. General", module: "settings", action: "edit_general", description: "Cambiar nombre, logo, SEO" },
  { key: "settings:edit_payments", name: "Editar Config. Pagos", module: "settings", action: "edit_payments", description: "Configurar Culqi, Yape, etc." },
  { key: "settings:edit_emails", name: "Editar Config. Emails", module: "settings", action: "edit_emails", description: "Configurar Resend, templates" },
  { key: "settings:edit_shipping", name: "Editar Config. Envíos", module: "settings", action: "edit_shipping", description: "Gestionar zonas y tarifas de envío" },

  // Usuarios admin
  { key: "users:view", name: "Ver Usuarios", module: "users", action: "view", description: "Ver lista de usuarios admin" },
  { key: "users:create", name: "Crear Usuarios", module: "users", action: "create", description: "Crear nuevos usuarios admin" },
  { key: "users:edit", name: "Editar Usuarios", module: "users", action: "edit", description: "Modificar usuarios existentes" },
  { key: "users:delete", name: "Eliminar Usuarios", module: "users", action: "delete", description: "Eliminar usuarios del sistema" },
  { key: "users:manage_roles", name: "Gestionar Roles", module: "users", action: "manage_roles", description: "Crear, editar y eliminar roles" },
  { key: "users:manage_permissions", name: "Gestionar Permisos", module: "users", action: "manage_permissions", description: "Asignar permisos personalizados a usuarios" },

  // Reportes
  { key: "reports:view_sales", name: "Ver Reportes de Ventas", module: "reports", action: "view_sales", description: "Ver estadísticas de ventas" },
  { key: "reports:view_inventory", name: "Ver Reportes de Inventario", module: "reports", action: "view_inventory", description: "Ver movimientos de stock" },
  { key: "reports:view_customers", name: "Ver Reportes de Clientes", module: "reports", action: "view_customers", description: "Ver análisis de clientes" },
  { key: "reports:export", name: "Exportar Reportes", module: "reports", action: "export", description: "Descargar reportes en CSV/Excel" },

  // Reclamaciones
  { key: "complaints:view", name: "Ver Reclamaciones", module: "complaints", action: "view", description: "Ver reclamaciones recibidas" },
  { key: "complaints:respond", name: "Responder Reclamaciones", module: "complaints", action: "respond", description: "Responder a reclamaciones" },
  { key: "complaints:configure", name: "Configurar Formulario", module: "complaints", action: "configure", description: "Editar campos del formulario" },

  // Temas (Plan 4+)
  { key: "themes:view", name: "Ver Temas", module: "themes", action: "view", description: "Ver lista de temas" },
  { key: "themes:create", name: "Crear Temas", module: "themes", action: "create", description: "Crear nuevos temas" },
  { key: "themes:update", name: "Editar Temas", module: "themes", action: "update", description: "Modificar tema (tokens, secciones, blocks)" },
  { key: "themes:delete", name: "Eliminar Temas", module: "themes", action: "delete", description: "Eliminar temas" },
  { key: "themes:activate", name: "Activar Tema", module: "themes", action: "activate", description: "Cambiar el tema activo de la tienda" },

  // Páginas estáticas (Plan 5)
  { key: "pages:view", name: "Ver Páginas Estáticas", module: "pages", action: "view", description: "Ver páginas estáticas" },
  { key: "pages:create", name: "Crear Páginas", module: "pages", action: "create", description: "Crear nuevas páginas estáticas" },
  { key: "pages:update", name: "Editar Páginas", module: "pages", action: "update", description: "Modificar páginas estáticas" },
  { key: "pages:delete", name: "Eliminar Páginas", module: "pages", action: "delete", description: "Eliminar páginas estáticas" },

  // Menús (Plan 5.5)
  { key: "menus:view", name: "Ver Menús", module: "menus", action: "view", description: "Ver menús de navegación" },
  { key: "menus:create", name: "Crear Menús", module: "menus", action: "create", description: "Crear nuevos menús" },
  { key: "menus:update", name: "Editar Menús", module: "menus", action: "update", description: "Modificar menús" },
  { key: "menus:delete", name: "Eliminar Menús", module: "menus", action: "delete", description: "Eliminar menús" },

  // Políticas legales (Plan 5.6)
  { key: "policies:view", name: "Ver Políticas", module: "policies", action: "view", description: "Ver políticas legales" },
  { key: "policies:create", name: "Crear Políticas", module: "policies", action: "create", description: "Crear nuevas políticas" },
  { key: "policies:update", name: "Editar Políticas", module: "policies", action: "update", description: "Modificar políticas legales" },
  { key: "policies:delete", name: "Eliminar Políticas", module: "policies", action: "delete", description: "Eliminar políticas" },

  // Plantillas de landing
  { key: "landing_templates:view", name: "Ver Plantillas Landing", module: "landing_templates", action: "view", description: "Ver plantillas de landing" },
  { key: "landing_templates:create", name: "Crear Plantillas Landing", module: "landing_templates", action: "create", description: "Crear plantillas reutilizables" },
  { key: "landing_templates:update", name: "Editar Plantillas Landing", module: "landing_templates", action: "update", description: "Modificar plantillas existentes" },
  { key: "landing_templates:delete", name: "Eliminar Plantillas Landing", module: "landing_templates", action: "delete", description: "Eliminar plantillas" },

  // Personalizables (customizer)
  { key: "customizables:view", name: "Ver Personalizables", module: "customizables", action: "view", description: "Ver plantillas personalizables" },
  { key: "customizables:create", name: "Crear Personalizables", module: "customizables", action: "create", description: "Crear plantillas personalizables" },
  { key: "customizables:update", name: "Editar Personalizables", module: "customizables", action: "update", description: "Modificar plantillas personalizables" },
  { key: "customizables:delete", name: "Eliminar Personalizables", module: "customizables", action: "delete", description: "Eliminar plantillas personalizables" },

  // Formularios COD
  { key: "cod-forms:view", name: "Ver Formularios COD", module: "cod-forms", action: "view", description: "Ver formularios contra entrega" },
  { key: "cod-forms:create", name: "Crear Formularios COD", module: "cod-forms", action: "create", description: "Crear formularios contra entrega" },
  { key: "cod-forms:update", name: "Editar Formularios COD", module: "cod-forms", action: "update", description: "Modificar formularios COD" },
  { key: "cod-forms:delete", name: "Eliminar Formularios COD", module: "cod-forms", action: "delete", description: "Eliminar formularios COD" },

  // Guías de tallas
  { key: "size-guides:view", name: "Ver Guías de Tallas", module: "size-guides", action: "view", description: "Ver guías de tallas" },
  { key: "size-guides:create", name: "Crear Guías de Tallas", module: "size-guides", action: "create", description: "Crear guías de tallas" },
  { key: "size-guides:update", name: "Editar Guías de Tallas", module: "size-guides", action: "update", description: "Modificar guías de tallas" },
  { key: "size-guides:delete", name: "Eliminar Guías de Tallas", module: "size-guides", action: "delete", description: "Eliminar guías de tallas" },
];

// ------------------------------------------------------------
// Mapeo de equivalencias para auto-conceder los nuevos a roles
// que tienen los legacy. Se aplica en ambos sentidos.
// ------------------------------------------------------------
const EQUIVALENCE_PAIRS: Array<[string, string]> = [
  ["products:edit", "products:update"],
  ["categories:edit", "categories:update"],
  ["coupons:edit", "coupons:update"],
  ["orders:edit", "orders:update"],
  ["customers:edit", "customers:update"],
  // Settings: cualquiera de los granulares cuenta como `settings:update`
  ["settings:edit_general", "settings:update"],
  ["settings:edit_payments", "settings:update"],
  ["settings:edit_emails", "settings:update"],
  ["settings:edit_shipping", "settings:update"],
  ["settings:edit_general", "settings:edit"],
  ["settings:edit_payments", "settings:edit"],
  ["settings:edit_emails", "settings:edit"],
  ["settings:edit_shipping", "settings:edit"],
];

async function main() {
  console.log("🚀 Sincronizando catálogo de permisos...\n");

  // 1) Upsert de todos los permisos
  let created = 0;
  let kept = 0;
  for (const perm of PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { key: perm.key } });
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, description: perm.description, module: perm.module, action: perm.action },
      create: perm,
    });
    if (existing) kept++;
    else created++;
  }
  console.log(`✅ Permisos: ${created} creados, ${kept} actualizados`);

  // 2) Auto-conceder los pares equivalentes
  console.log("\n🔄 Propagando equivalencias a roles existentes...");
  const all = await prisma.permission.findMany();
  const byKey = new Map(all.map((p) => [p.key, p]));

  let grantsAdded = 0;
  for (const role of await prisma.role.findMany({ include: { permissions: true } })) {
    const heldKeys = new Set(
      role.permissions.map((rp) => all.find((p) => p.id === rp.permissionId)?.key).filter(Boolean) as string[],
    );

    for (const [a, b] of EQUIVALENCE_PAIRS) {
      // Si tiene `a` pero no `b`, concedemos `b`
      if (heldKeys.has(a) && !heldKeys.has(b)) {
        const target = byKey.get(b);
        if (!target) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: target.id } },
          update: {},
          create: { roleId: role.id, permissionId: target.id },
        });
        heldKeys.add(b);
        grantsAdded++;
      }
      // Y viceversa
      if (heldKeys.has(b) && !heldKeys.has(a)) {
        const target = byKey.get(a);
        if (!target) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: target.id } },
          update: {},
          create: { roleId: role.id, permissionId: target.id },
        });
        heldKeys.add(a);
        grantsAdded++;
      }
    }
  }
  console.log(`✅ ${grantsAdded} permisos equivalentes propagados`);

  // 3) Resumen
  const finalCount = await prisma.permission.count();
  const roleCount = await prisma.role.count();
  console.log(`\n📊 Estado final: ${finalCount} permisos en catálogo, ${roleCount} roles`);
  console.log("\n🎉 Sincronización completada");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
