"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    const doSignOut = async () => {
      await signOut();
      setTimeout(() => {
        router.push("/");
      }, 1000);
    };
    
    doSignOut();
  }, [signOut, router]);

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh" 
    }}>
      <div style={{ textAlign: "center" }}>
        <h2>Cerrando sesión...</h2>
        <p>Redirigiendo...</p>
      </div>
    </div>
  );
}