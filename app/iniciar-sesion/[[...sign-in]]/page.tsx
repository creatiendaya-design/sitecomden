"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si ya está logueado, redirigir manualmente
    if (isLoaded && isSignedIn) {
      router.replace("/cuenta");
    }
  }, [isLoaded, isSignedIn, router]);

  // Si está cargando
  if (!isLoaded) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        backgroundColor: "#f0f4f8"
      }}>
        <p>Cargando...</p>
      </div>
    );
  }

  // Si ya está logueado (mientras redirige)
  if (isSignedIn) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        backgroundColor: "#f0f4f8"
      }}>
        <p>Redirigiendo a tu cuenta...</p>
      </div>
    );
  }

  // Mostrar formulario solo si NO está logueado
  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "100vh",
      backgroundColor: "#f0f4f8",
      padding: "20px"
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ 
          textAlign: "center", 
          marginBottom: "30px" 
        }}>
          <h1 style={{ 
            fontSize: "28px", 
            fontWeight: "bold",
            marginBottom: "10px"
          }}>
            ShopGood Perú
          </h1>
          <p style={{ color: "#666" }}>Inicia sesión en tu cuenta</p>
        </div>
        
        <SignIn 
         appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none border",
            headerTitle: "text-2xl font-bold",
            headerSubtitle: "text-gray-600",
            socialButtonsBlockButton: "border hover:bg-gray-50",
            formButtonPrimary: "bg-primary hover:bg-primary/90",
            footerActionLink: "text-primary hover:text-primary/90",
            // 👇 Ocultar branding de Clerk
            footer: "hidden",
          },
        }}
          afterSignInUrl="/cuenta"
          afterSignUpUrl="/cuenta"
        />
        
        <div style={{ 
          marginTop: "20px", 
          textAlign: "center" 
        }}>
          <a 
            href="/" 
            style={{ 
              color: "#666", 
              textDecoration: "none",
              fontSize: "14px"
            }}
          >
            ← Volver a la tienda
          </a>
        </div>
      </div>
    </div>
  );
}