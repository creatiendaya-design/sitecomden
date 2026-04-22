import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function FacturacionPage() {
  await protectRoute("orders:view");

  const documents = await prisma.electronicDocument.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          total: true,
          id: true,
        },
      },
    },
  });

  const statusLabel: Record<string, { label: string; className: string }> = {
    ISSUED: { label: "Emitido", className: "bg-green-100 text-green-700" },
    PENDING: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
    ERROR: { label: "Error", className: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Anulado", className: "bg-gray-100 text-gray-700" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Facturación Electrónica
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprobantes emitidos — {documents.length} documentos
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {["Fecha", "Número", "Tipo", "Cliente", "Total", "Estado", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No hay comprobantes emitidos todavía
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const st = statusLabel[doc.status] ?? statusLabel.PENDING;
                    return (
                      <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {doc.createdAt.toLocaleDateString("es-PE")}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">{doc.fullNumber}</td>
                        <td className="px-4 py-3">
                          {doc.type === "BOLETA" ? "Boleta" : "Factura"}
                        </td>
                        <td className="px-4 py-3">{doc.order.customerName}</td>
                        <td className="px-4 py-3">{formatPrice(Number(doc.order.total))}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${st.className}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {doc.pdfUrl && (
                              <a
                                href={doc.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs"
                              >
                                PDF
                              </a>
                            )}
                            <Link
                              href={`/admin/ordenes/${doc.order.id}`}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Orden
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
