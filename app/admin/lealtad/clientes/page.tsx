import { redirect } from "next/navigation";

// La gestión de clientes se unificó en /admin/clientes (CRM estilo Shopify:
// datos + lealtad + historial de órdenes). Mantenemos esta URL viva con un
// redirect para no romper enlaces existentes.
export default function ClientesLealtadRedirect() {
  redirect("/admin/clientes");
}
