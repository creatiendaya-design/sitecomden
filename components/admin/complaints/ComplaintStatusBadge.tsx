import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Estados de una reclamación con su etiqueta y estilo asociado.
 * Fuente única de verdad — evita duplicar el mapa de colores en cada vista.
 */
export const COMPLAINT_STATUS: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: { label: "Pendiente", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  IN_REVIEW: { label: "En Revisión", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  RESOLVED: { label: "Resuelto", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  CLOSED: { label: "Cerrado", className: "bg-slate-100 text-slate-700 hover:bg-slate-100" },
};

const FALLBACK = { label: "Desconocido", className: "bg-slate-100 text-slate-700" };

export function getComplaintStatusInfo(status: string) {
  return COMPLAINT_STATUS[status] ?? { ...FALLBACK, label: status };
}

interface ComplaintStatusBadgeProps {
  status: string;
  className?: string;
}

export default function ComplaintStatusBadge({
  status,
  className,
}: ComplaintStatusBadgeProps) {
  const info = getComplaintStatusInfo(status);
  return <Badge className={cn(info.className, className)}>{info.label}</Badge>;
}
