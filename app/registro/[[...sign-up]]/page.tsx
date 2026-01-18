import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
          <p style={{ color: "#666" }}>Crea tu cuenta</p>
        </div>
        
        <SignUp
          path="/registro"
          routing="path"
          signInUrl="/iniciar-sesion"
          fallbackRedirectUrl="/cuenta"
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