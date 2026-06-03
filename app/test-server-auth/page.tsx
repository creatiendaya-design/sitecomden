import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function TestServerAuth() {
  // ⭐ CLERK v5+: auth() ahora es asíncrono, necesita await
  const { userId } = await auth();
  const user = await currentUser();

  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>🔍 Test Server-Side Auth</h1>
      
      <div style={{ 
        backgroundColor: "#f5f5f5",
        padding: "20px",
        borderRadius: "8px",
        marginTop: "20px"
      }}>
        <h2>Resultado en Server Component:</h2>
        <p><strong>userId:</strong> {userId || "❌ NULL"}</p>
        <p><strong>user exists:</strong> {user ? "✅ SÍ" : "❌ NO"}</p>
        {user && (
          <div>
            <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</p>
            <p><strong>Nombre:</strong> {user.firstName} {user.lastName}</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <Link href="/diagnostico" style={{ color: "blue", textDecoration: "underline" }}>
          Ir a diagnóstico (client-side)
        </Link>
      </div>
    </div>
  );
}