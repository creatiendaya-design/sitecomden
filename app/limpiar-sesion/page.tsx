"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function LimpiarSesionPage() {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      color: "white",
      padding: "20px"
    }}>
      <div style={{ 
        textAlign: "center",
        backgroundColor: "#2a2a2a",
        padding: "40px",
        borderRadius: "12px",
        maxWidth: "500px"
      }}>
        <h1 style={{ 
          fontSize: "28px", 
          fontWeight: "bold",
          marginBottom: "20px",
          color: "#ef4444"
        }}>
          🔥 LIMPIEZA TOTAL
        </h1>
        
        <p style={{ 
          color: "#ccc",
          marginBottom: "30px",
          lineHeight: "1.6",
          fontSize: "16px"
        }}>
          Esta página va a cerrar tu sesión completamente<br />
          usando el método oficial de Clerk.<br /><br />
          Después podrás ver el formulario de inicio de sesión.
        </p>

        <div style={{ marginBottom: "30px" }}>
          <SignOutButton redirectUrl="/iniciar-sesion">
            <button style={{
              padding: "15px 40px",
              fontSize: "18px",
              fontWeight: "700",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#ef4444";
              e.currentTarget.style.transform = "scale(1)";
            }}
            >
              🚪 CERRAR SESIÓN AHORA
            </button>
          </SignOutButton>
        </div>

        <div style={{ 
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#333",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#aaa"
        }}>
          <p style={{ marginBottom: "10px", fontWeight: "bold", color: "#fff" }}>
            ℹ️ Qué va a pasar:
          </p>
          <ol style={{ 
            textAlign: "left", 
            paddingLeft: "20px",
            lineHeight: "1.8"
          }}>
            <li>Clerk cerrará tu sesión</li>
            <li>Borrará todas las cookies</li>
            <li>Te redirigirá a /iniciar-sesion</li>
            <li>Verás el formulario de login ✅</li>
          </ol>
        </div>
      </div>
    </div>
  );
}