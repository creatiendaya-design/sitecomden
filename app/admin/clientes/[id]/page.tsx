import Link from "next/link";
import { notFound } from "next/navigation";
import { protectRoute } from "@/lib/protect-route";
import { getCurrentUserId } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getCustomerById } from "@/actions/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft } from "lucide-react";
import { TierBadge } from "../_components/TierBadge";
import { CustomerActions } from "../_components/CustomerActions";

export const dynamic = "force-dynamic";

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Pagada", color: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "Procesando", color: "bg-indigo-100 text-indigo-700" },
  SHIPPED: { label: "Enviada", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Entregada", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelada", color: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Reembolsada", color: "bg-gray-100 text-gray-700" },
};

function formatCurrency(value: number): string {
  return `S/. ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDateInput(date: Date | string | null): string | null {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

interface AddressShape {
  line1?: string;
  line2?: string;
  reference?: string;
  department?: string;
  province?: string;
  district?: string;
  postalCode?: string;
}

function parseAddress(address: unknown): AddressShape | null {
  if (!address || typeof address !== "object") return null;
  return address as AddressShape;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await protectRoute("customers:view");
  const { id } = await params;

  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const userId = await getCurrentUserId();
  const [canEdit, canDelete, canManagePoints] = await Promise.all([
    hasPermission(userId, "customers:edit"),
    hasPermission(userId, "customers:delete"),
    hasPermission(userId, "loyalty:manage_points"),
  ]);

  const address = parseAddress(customer.address);
  const avgOrderValue =
    customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0">
            <Link href="/admin/clientes" aria-label="Volver">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {customer.name}
              </h1>
              <TierBadge tier={customer.loyaltyTier} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {customer.email} · Cliente desde {formatDate(customer.registeredAt)}
            </p>
            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {customer.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[11px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones */}
      <CustomerActions
        customer={{
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          dni: customer.dni,
          birthday: toDateInput(customer.birthday),
          points: customer.points,
          notes: customer.notes,
          tags: customer.tags,
          address: address,
        }}
        canEdit={canEdit}
        canDelete={canDelete}
        canManagePoints={canManagePoints}
      />

      {/* Resumen */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total gastado" value={formatCurrency(customer.totalSpent)} />
        <SummaryCard label="Órdenes" value={String(customer.totalOrders)} />
        <SummaryCard label="Valor promedio" value={formatCurrency(avgOrderValue)} />
        <SummaryCard label="Puntos" value={String(customer.points)} />
        <SummaryCard label="Última compra" value={formatDate(customer.lastPurchaseAt)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Columna principal: órdenes */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de órdenes</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:px-6 sm:pb-6">
              {customer.orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Orden</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.orders.map((o) => {
                        const st = ORDER_STATUS[o.status] ?? {
                          label: o.status,
                          color: "bg-gray-100 text-gray-700",
                        };
                        return (
                          <TableRow key={o.id}>
                            <TableCell>
                              <Link
                                href={`/admin/ordenes/${o.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                #{o.orderSeq}
                              </Link>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground tabular-nums">
                              {formatDate(o.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge className={st.color}>{st.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(o.total)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-6 pb-6 sm:px-0">
                  Este cliente aún no tiene órdenes.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Historial de puntos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimientos de puntos</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.pointsHistory.length > 0 ? (
                <ul className="space-y-2">
                  {customer.pointsHistory.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 text-sm border-b last:border-0 pb-2 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{p.description}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(p.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`font-semibold tabular-nums shrink-0 ${
                          p.points >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {p.points >= 0 ? "+" : ""}
                        {p.points}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sin movimientos.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna lateral: contacto + lealtad */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="Email" value={customer.email} />
              <Field label="Teléfono" value={customer.phone || "—"} />
              <Field label="DNI" value={customer.dni || "—"} />
              <Field label="Cumpleaños" value={formatDate(customer.birthday)} />
              <div>
                <p className="text-xs text-muted-foreground">Dirección</p>
                {address ? (
                  <p className="font-medium">
                    {[
                      address.line1,
                      address.district,
                      address.province,
                      address.department,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                    {address.reference ? (
                      <span className="block text-xs text-muted-foreground font-normal">
                        Ref: {address.reference}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="font-medium">—</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lealtad y referidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="Nivel" value="" >
                <TierBadge tier={customer.loyaltyTier} />
              </Field>
              <Field label="Código de referido" value={customer.referralCode} mono />
              <Field
                label="Referidos"
                value={`${customer._count.referrals}`}
              />
              {customer.referredBy && (
                <Field
                  label="Referido por"
                  value={customer.referredBy.name}
                />
              )}
              {customer.referrals.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Clientes referidos
                  </p>
                  <ul className="space-y-1">
                    {customer.referrals.slice(0, 10).map((r) => (
                      <li key={r.id} className="truncate">
                        <Link
                          href={`/admin/clientes/${r.id}`}
                          className="text-primary hover:underline"
                        >
                          {r.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 p-2.5 sm:pb-2 sm:p-4">
        <CardTitle className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2.5 pt-0 sm:p-4 sm:pt-0">
        <div className="text-base sm:text-xl font-bold tabular-nums truncate">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {children ?? (
        <p className={`font-medium break-words ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      )}
    </div>
  );
}
