"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CuentaPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/iniciar-sesion");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Redirigiendo a inicio de sesión...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        ¡Hola, {user.firstName || user.primaryEmailAddress?.emailAddress}! 👋
      </h1>
      
      <div style={{ 
        backgroundColor: "#f5f5f5",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</p>
        <p><strong>Nombre:</strong> {user.firstName} {user.lastName}</p>
        <p><strong>ID:</strong> {user.id}</p>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <a 
          href="/"
          style={{
            padding: "10px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "5px",
            display: "inline-block"
          }}
        >
          Volver a la tienda
        </a>
        
        <a 
          href="/limpiar-sesion"
          style={{
            padding: "10px 20px",
            backgroundColor: "#ef4444",
            color: "white",
            textDecoration: "none",
            borderRadius: "5px",
            display: "inline-block"
          }}
        >
          Cerrar sesión
        </a>
      </div>

      <p style={{ marginTop: "30px", color: "#666", fontSize: "14px" }}>
        Nota: Esta es una versión simplificada. Una vez confirmado que funciona sin bucles, restauraremos tu panel completo con puntos VIP y lealtad.
      </p>
    </div>
  );
}