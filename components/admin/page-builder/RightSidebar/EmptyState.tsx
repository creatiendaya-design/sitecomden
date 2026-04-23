"use client"

import { MousePointer2 } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <MousePointer2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">Selecciona un bloque</p>
        <p className="text-xs text-muted-foreground mb-6 max-w-[240px]">
          Haz click en cualquier sección del canvas para editarla, o agrega una nueva con el botón de la izquierda.
        </p>
        <div className="text-left text-xs text-muted-foreground space-y-1.5 border rounded-md p-3 bg-muted/40">
          <div className="font-semibold uppercase tracking-wide text-[10px] mb-1">Atajos</div>
          <div className="flex justify-between"><span>Clic en bloque</span><span className="font-mono">Seleccionar</span></div>
          <div className="flex justify-between"><span>Esc</span><span className="font-mono">Deseleccionar</span></div>
          <div className="flex justify-between"><span>Del</span><span className="font-mono">Eliminar</span></div>
          <div className="flex justify-between"><span>Ctrl+D</span><span className="font-mono">Duplicar</span></div>
        </div>
      </div>
    </div>
  )
}
