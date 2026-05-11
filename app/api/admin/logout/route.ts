import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revokeAdminSession } from "@/lib/admin-session";

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");

  if (session?.value) {
    await revokeAdminSession(session.value);
  }

  cookieStore.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  redirect("/admin-auth/login");
}
