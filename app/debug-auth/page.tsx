import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export default async function DebugAuthPage() {
  const { userId, sessionClaims } = auth();
  const user = await currentUser();
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Debug de Autenticación</h1>
      
      <div className="space-y-6">
        {/* Auth Status */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">1. Estado de auth()</h2>
          <div className="space-y-2">
            <div>
              <strong>userId:</strong> 
              <span className={userId ? "text-green-600" : "text-red-600"}>
                {userId || "❌ NULL - NO AUTENTICADO"}
              </span>
            </div>
            
            <div>
              <strong>sessionClaims:</strong>
              <pre className="text-xs bg-white p-2 rounded mt-1">
                {JSON.stringify(sessionClaims, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Current User */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">2. currentUser()</h2>
          <div>
            <strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress || "❌ NULL"}
          </div>
          <div>
            <strong>Nombre:</strong> {user?.firstName} {user?.lastName}
          </div>
          <div>
            <strong>ID:</strong> {user?.id || "❌ NULL"}
          </div>
        </div>

        {/* Cookies */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">3. Cookies de Clerk</h2>
          <div className="space-y-1 text-xs">
            {allCookies
              .filter(c => c.name.includes('clerk') || c.name.includes('session'))
              .map(cookie => (
                <div key={cookie.name}>
                  <strong>{cookie.name}:</strong> {cookie.value.substring(0, 50)}...
                </div>
              ))}
          </div>
        </div>

        {/* Variables de entorno */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">4. Variables de Entorno</h2>
          <div className="space-y-1 text-xs">
            <div>
              <strong>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:</strong>{" "}
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20)}...
            </div>
            <div>
              <strong>CLERK_SECRET_KEY existe:</strong>{" "}
              {process.env.CLERK_SECRET_KEY ? "✅ Sí" : "❌ No"}
            </div>
            <div>
              <strong>NEXT_PUBLIC_CLERK_SIGN_IN_URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "No configurado"}
            </div>
          </div>
        </div>

        {/* Links de prueba */}
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-bold mb-2">5. Probar rutas</h2>
          <div className="space-y-2">
            <div>
              <a href="/cuenta" className="text-blue-600 underline">
                → Ir a /cuenta
              </a>
            </div>
            <div>
              <a href="/iniciar-sesion" className="text-blue-600 underline">
                → Ir a /iniciar-sesion
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}