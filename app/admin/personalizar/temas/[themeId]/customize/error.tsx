"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

/**
 * Plan 13 — error boundary for the Customizer route.
 *
 * Most failures here come from Neon cold starts (free-tier branches sleep
 * after ~5 min of inactivity and the first request errors out before the
 * branch finishes spinning up). Showing a clear retry CTA is friendlier
 * than the framework crash overlay and lets the admin recover with one
 * click instead of opening DevTools.
 */
export default function CustomizerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surfaced for debugging in dev. In production, errors with digests
    // are forwarded by Next to the configured logger.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("Customizer error:", error)
    }
  }, [error])

  const isDbUnreachable = /can't reach database server|p1001/i.test(
    error.message ?? "",
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold">No se pudo cargar el editor</h1>
          <p className="text-sm text-muted-foreground">
            {isDbUnreachable ? (
              <>
                La base de datos tardó demasiado en responder. En Neon
                free-tier el branch suele despertarse después del primer
                intento — tocá <strong>Reintentar</strong>.
              </>
            ) : (
              <>Hubo un problema cargando el theme customizer.</>
            )}
          </p>
          {error.digest && (
            <p className="text-[11px] text-muted-foreground/70">
              Código: <code>{error.digest}</code>
            </p>
          )}
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="ghost" asChild>
            <Link href="/admin/personalizar/temas">Volver a temas</Link>
          </Button>
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  )
}
