import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function AdminRootPage() {
  // Verificar si hay sesión
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");

  if (adminSession) {
    // Si hay sesión → ir a dashboard
    redirect("/admin/dashboard");
  } else {
    // Si no hay sesión → ir a login
    redirect("/admin-auth/login");
  }
}