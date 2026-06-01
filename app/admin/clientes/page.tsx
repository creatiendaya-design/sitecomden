import Link from "next/link";
import { protectRoute } from "@/lib/protect-route";
import { getCustomers, getCustomerStats } from "@/actions/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { CustomersFilters } from "./_components/CustomersFilters";
import { TierBadge } from "./_components/TierBadge";

export const dynamic = "force-dynamic";

interface ClientesPageProps {
  searchParams: Promise<{
    q?: string;
    tier?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

function formatCurrency(value: number): string {
  return `S/. ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function locationOf(address: unknown): string {
  if (!address || typeof address !== "object") return "—";
  const a = address as Record<string, unknown>;
  const parts = [a.district, a.province, a.department]
    .filter((p): p is string => typeof p === "string" && p.trim() !== "");
  return parts.length ? parts.join(", ") : "—";
}

export default async function AdminClientesPage({
  searchParams,
}: ClientesPageProps) {
  await protectRoute("customers:view");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [stats, result] = await Promise.all([
    getCustomerStats(),
    getCustomers({
      q: params.q,
      tier: params.tier,
      sortBy: params.sort,
      order: params.order === "asc" ? "asc" : "desc",
      page,
    }),
  ]);

  const { customers, total, totalPages, perPage } = result;

  const buildHref = (target: number): string => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v == null) continue;
      sp.set(k, v);
    }
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return `/admin/clientes${qs ? `?${qs}` : ""}`;
  };

  const startIndex = (page - 1) * perPage;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Clientes</h1>
          <p className="text-xs sm:text-base text-muted-foreground tabular-nums">
            {total} {total === 1 ? "cliente" : "clientes"}
          </p>
        </div>
      </div>

      {/* Stats por tier */}
      <div className="grid gap-2 sm:gap-4 grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Bronce" value={stats.byTier.BRONZE} color="text-orange-600" />
        <StatCard label="Plata" value={stats.byTier.SILVER} color="text-gray-400" />
        <StatCard
          label="Oro+"
          value={stats.byTier.GOLD + stats.byTier.PLATINUM}
          color="text-yellow-500"
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 sm:p-6 sm:pt-6">
          <CustomersFilters />
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardContent className="p-0 sm:pt-6 sm:px-6 sm:pb-6">
          {customers.length > 0 ? (
            <>
              {/* MOBILE: cards */}
              <div className="divide-y sm:hidden">
                {customers.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/clientes/${c.id}`}
                    className="block px-3 py-3 active:bg-muted/50"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate max-w-[180px]">
                        {c.name}
                      </span>
                      <TierBadge tier={c.loyaltyTier} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {c.email}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 tabular-nums">
                      {c.totalOrders} ord · {formatCurrency(c.totalSpent)} ·{" "}
                      {c.points} pts · últ. {formatDate(c.lastPurchaseAt)}
                    </p>
                  </Link>
                ))}
              </div>

              {/* DESKTOP: tabla */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead className="text-right">Órdenes</TableHead>
                      <TableHead className="text-right">Total gastado</TableHead>
                      <TableHead>Última compra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <Link href={`/admin/clientes/${c.id}`} className="block">
                            <p className="font-medium">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{c.email}</p>
                            {c.phone && (
                              <p className="text-xs text-muted-foreground">{c.phone}</p>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {locationOf(c.address)}
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={c.loyaltyTier} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.totalOrders}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(c.totalSpent)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatDate(c.lastPurchaseAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-3 sm:px-0 sm:mt-6 sm:py-0 border-t sm:border-0">
                  <p className="text-[11px] sm:text-sm text-muted-foreground tabular-nums">
                    {startIndex + 1}–{Math.min(startIndex + perPage, total)} de {total}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      asChild={page > 1}
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                    >
                      {page > 1 ? (
                        <Link href={buildHref(page - 1)} aria-label="Anterior">
                          <ChevronLeft className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span>
                          <ChevronLeft className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                    <span className="px-2 py-1 text-xs sm:text-sm tabular-nums">
                      Pág. {page}/{totalPages}
                    </span>
                    <Button
                      asChild={page < totalPages}
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                    >
                      {page < totalPages ? (
                        <Link href={buildHref(page + 1)} aria-label="Siguiente">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span>
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No se encontraron clientes
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1 p-2.5 sm:pb-3 sm:p-6">
        <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2.5 pt-0 sm:p-6 sm:pt-0">
        <div className={`text-lg sm:text-2xl font-bold tabular-nums ${color ?? ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
