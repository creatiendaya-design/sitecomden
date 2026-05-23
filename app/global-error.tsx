"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#fafafa",
          color: "#111",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.75rem" }}>
            Error inesperado
          </h1>
          <p style={{ color: "#555", margin: "0 0 1.5rem" }}>
            Ocurrió un problema cargando la aplicación. Intenta recargar la
            página.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "0.75rem",
                color: "#888",
                margin: "0 0 1.5rem",
              }}
            >
              ID: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              padding: "0.625rem 1.25rem",
              borderRadius: 8,
              fontSize: "0.875rem",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
