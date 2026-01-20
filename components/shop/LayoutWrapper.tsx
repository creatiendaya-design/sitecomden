"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/shop/Header";
import Footer from "@/components/shop/Footer";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Detectar si estamos en checkout o páginas relacionadas
  const isCheckout = pathname.startsWith("/checkout") || 
                     pathname.startsWith("/orden/");  // También para páginas de orden

  if (isCheckout) {
    // En checkout, no mostrar Header/Footer normales
    // (el layout de checkout tiene sus propios header/footer)
    return <>{children}</>;
  }

  // En otras páginas, mostrar Header y Footer normales
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}