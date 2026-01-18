import { auth } from "@clerk/nextjs/server";

export default async function TestSimplePage() {
  let userId = "ERROR";
  let error = null;

  try {
    const authResult = auth();
    userId = authResult.userId || "NULL";
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div style={{ padding: "50px", fontFamily: "monospace" }}>
      <h1>Test de Clerk</h1>
      <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#f0f0f0" }}>
        <div><strong>UserID:</strong> {userId}</div>
        {error && <div style={{ color: "red" }}><strong>Error:</strong> {error}</div>}
        <div style={{ marginTop: "20px" }}>
          <strong>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:</strong><br/>
          {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 30) || "NO EXISTE"}
        </div>
        <div style={{ marginTop: "10px" }}>
          <strong>CLERK_SECRET_KEY existe:</strong> {process.env.CLERK_SECRET_KEY ? "✅ SI" : "❌ NO"}
        </div>
      </div>
    </div>
  );
}