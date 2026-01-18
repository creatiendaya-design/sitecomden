"use client";

import { useAuth, useUser } from "@clerk/nextjs";

export default function DiagnosticoClerk() {
  const { userId, isLoaded, isSignedIn, sessionId } = useAuth();
  const { user } = useUser();

  return (
    <div style={{ 
      padding: "40px",
      maxWidth: "800px",
      margin: "0 auto",
      fontFamily: "monospace"
    }}>
      <h1 style={{ fontSize: "24px", marginBottom: "30px" }}>
        🔍 Diagnóstico de Clerk
      </h1>

      <div style={{ 
        backgroundColor: "#f5f5f5",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <h2 style={{ marginBottom: "15px" }}>Estado de Autenticación:</h2>
        <p><strong>isLoaded:</strong> {isLoaded ? "✅ SÍ" : "❌ NO"}</p>
        <p><strong>isSignedIn:</strong> {isSignedIn ? "✅ SÍ" : "❌ NO"}</p>
        <p><strong>userId:</strong> {userId || "❌ NULL"}</p>
        <p><strong>sessionId:</strong> {sessionId || "❌ NULL"}</p>
      </div>

      {user && (
        <div style={{ 
          backgroundColor: "#fff3cd",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "2px solid #ffc107"
        }}>
          <h2 style={{ marginBottom: "15px", color: "#856404" }}>
            ⚠️ ¡HAY UNA SESIÓN ACTIVA!
          </h2>
          <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</p>
          <p><strong>Nombre:</strong> {user.firstName} {user.lastName}</p>
          <p><strong>ID:</strong> {user.id}</p>
        </div>
      )}

      <div style={{ 
        backgroundColor: "#d1ecf1",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <h2 style={{ marginBottom: "15px" }}>Variables de Entorno:</h2>
        <p><strong>SIGN_IN_URL:</strong> {process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}</p>
        <p><strong>SIGN_UP_URL:</strong> {process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}</p>
        <p><strong>AFTER_SIGN_IN:</strong> {process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "❌ No definido"}</p>
        <p><strong>AFTER_SIGN_UP:</strong> {process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "❌ No definido"}</p>
      </div>

      <div style={{ marginTop: "30px" }}>
        <h2 style={{ marginBottom: "15px" }}>Acciones:</h2>
        <button 
          onClick={() => {
            document.cookie.split(";").forEach(c => {
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            window.location.reload();
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginRight: "10px"
          }}
        >
          🍪 Borrar TODAS las cookies + Recargar
        </button>

        <button 
          onClick={() => window.location.href = "/cerrar-sesion"}
          style={{
            padding: "10px 20px",
            backgroundColor: "#ffc107",
            color: "black",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          🚪 Ir a Cerrar Sesión
        </button>
      </div>
    </div>
  );
}