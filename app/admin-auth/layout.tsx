import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - ShopGood Perú",
  description: "Panel de administración",
};

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout simple sin sidebar ni navegación
  return <>{children}</>;
}