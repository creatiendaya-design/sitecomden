/**
 * Etiquetas amigables (es-PE) para módulos y acciones de permisos.
 *
 * Centralizado para que `PermissionSelector` (form de roles) y
 * `CustomPermissionsManager` (form de usuarios) se mantengan
 * sincronizados. Cuando se añade un módulo nuevo (themes, pages,
 * menus, customizables, etc.), basta con extender este archivo.
 */

export interface ModuleInfo {
  name: string;
  icon: string;
}

export const MODULE_NAMES: Record<string, ModuleInfo> = {
  products: { name: "Productos", icon: "📦" },
  categories: { name: "Categorías", icon: "📂" },
  orders: { name: "Órdenes", icon: "🛒" },
  customers: { name: "Clientes", icon: "👥" },
  coupons: { name: "Cupones", icon: "🎟️" },
  loyalty: { name: "Lealtad", icon: "⭐" },
  payments: { name: "Pagos", icon: "💳" },
  newsletter: { name: "Newsletter", icon: "📧" },
  settings: { name: "Configuración", icon: "⚙️" },
  users: { name: "Usuarios", icon: "👤" },
  reports: { name: "Reportes", icon: "📊" },
  complaints: { name: "Reclamaciones", icon: "📝" },
  themes: { name: "Temas", icon: "🎨" },
  pages: { name: "Páginas", icon: "📄" },
  menus: { name: "Menús", icon: "🗂️" },
  policies: { name: "Políticas Legales", icon: "📜" },
  landing_templates: { name: "Plantillas Landing", icon: "🧩" },
  customizables: { name: "Personalizables", icon: "🎛️" },
  "cod-forms": { name: "Formularios COD", icon: "📋" },
  "size-guides": { name: "Guías de Tallas", icon: "📐" },
  inventory: { name: "Inventario", icon: "📦" },
  promotions: { name: "Promociones", icon: "🏷️" },
  audit: { name: "Auditoría", icon: "🔍" },
};

export const ACTION_NAMES: Record<string, string> = {
  view: "Ver",
  create: "Crear",
  edit: "Editar",
  update: "Editar",
  delete: "Eliminar",
  manage: "Gestionar",
  manage_inventory: "Gestionar Inventario",
  manage_points: "Gestionar Puntos",
  manage_rewards: "Gestionar Recompensas",
  manage_roles: "Gestionar Roles",
  manage_permissions: "Gestionar Permisos",
  configure: "Configurar",
  verify: "Verificar",
  reject: "Rechazar",
  export: "Exportar",
  cancel: "Cancelar",
  refund: "Reembolsar",
  update_status: "Actualizar Estado",
  view_sensitive: "Ver Datos Sensibles",
  edit_general: "Editar General",
  edit_payments: "Editar Pagos",
  edit_emails: "Editar Emails",
  edit_shipping: "Editar Envíos",
  view_sales: "Ver Ventas",
  view_inventory: "Ver Inventario",
  view_customers: "Ver Clientes",
  respond: "Responder",
  activate: "Activar",
  assign: "Asignar",
  approve: "Aprobar",
};

export function getModuleInfo(moduleKey: string): ModuleInfo {
  return MODULE_NAMES[moduleKey] ?? { name: moduleKey, icon: "📌" };
}

export function getActionLabel(actionKey: string): string {
  return ACTION_NAMES[actionKey] ?? actionKey;
}
