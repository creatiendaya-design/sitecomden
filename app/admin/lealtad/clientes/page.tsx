"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Trophy, 
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  Gift,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAllCustomers, adjustCustomerPoints, getCustomerStats } from "@/actions/loyalty";
import { toast } from "sonner";

type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
type SortField = "points" | "totalSpent" | "registeredAt";

export default function ClientesLealtadPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState<LoyaltyTier | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortField>("registeredAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Modales
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchTerm, tierFilter, sortBy, sortOrder]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await getAllCustomers({ sortBy, order: sortOrder });
      setCustomers(data);
    } catch (error) {
      console.error("Error cargando clientes:", error);
      toast.error("Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }

  function filterAndSortCustomers() {
    let filtered = [...customers];

    // Filtrar por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.dni?.includes(search) ||
          c.referralCode.toLowerCase().includes(search)
      );
    }

    // Filtrar por tier
    if (tierFilter !== "ALL") {
      filtered = filtered.filter((c) => c.loyaltyTier === tierFilter);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === "registeredAt") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }

  async function handleAdjustPoints() {
    if (!selectedCustomer || !adjustPoints) return;

    const points = parseInt(adjustPoints);
    if (isNaN(points)) {
      toast.error("Ingresa un número válido");
      return;
    }

    try {
      const result = await adjustCustomerPoints(
        selectedCustomer.id,
        points,
        adjustReason || "Ajuste manual del administrador"
      );

      if (result.success) {
        toast.success(`Puntos ${points > 0 ? "agregados" : "deducidos"} correctamente`);
        setShowAdjustModal(false);
        setAdjustPoints("");
        setAdjustReason("");
        loadCustomers();
      } else {
        toast.error(result.error || "Error al ajustar puntos");
      }
    } catch (error) {
      console.error("Error ajustando puntos:", error);
      toast.error("Error al ajustar puntos");
    }
  }

  async function viewCustomerDetails(customer: any) {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  }

  function openAdjustModal(customer: any) {
    setSelectedCustomer(customer);
    setShowAdjustModal(true);
  }

  // Paginación
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Gestión de Clientes</h1>
          <p className="text-xs sm:text-base text-muted-foreground tabular-nums">
            {filteredCustomers.length} clientes en el programa
          </p>
        </div>
        <Button asChild variant="outline" size="icon" className="h-9 w-9 sm:hidden shrink-0">
          <Link href="/admin/lealtad" aria-label="Volver">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/admin/lealtad">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      {/* Stats Rápidas - 4 cols mobile compactas */}
      <div className="grid gap-2 sm:gap-4 grid-cols-4">
        <Card>
          <CardHeader className="pb-1 p-2.5 sm:pb-3 sm:p-6">
            <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tabular-nums">
              {customers.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 p-2.5 sm:pb-3 sm:p-6">
            <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
              Bronce
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-orange-600 tabular-nums">
              {customers.filter((c) => c.loyaltyTier === "BRONZE").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 p-2.5 sm:pb-3 sm:p-6">
            <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
              Plata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-gray-400 tabular-nums">
              {customers.filter((c) => c.loyaltyTier === "SILVER").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 p-2.5 sm:pb-3 sm:p-6">
            <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
              <span className="hidden sm:inline">Oro/Platino</span>
              <span className="sm:hidden">Oro+</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-yellow-500 tabular-nums">
              {customers.filter((c) =>
                c.loyaltyTier === "GOLD" || c.loyaltyTier === "PLATINUM"
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 sm:p-6 sm:pt-6">
          <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-4">
            {/* Búsqueda */}
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nombre, email, DNI…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Filtro por Tier + Ordenar */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:contents">
              <Select
                value={tierFilter}
                onValueChange={(value: any) => setTierFilter(value)}
              >
                <SelectTrigger className="h-9">
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="BRONZE">🥉 Bronce</SelectItem>
                  <SelectItem value="SILVER">🥈 Plata</SelectItem>
                  <SelectItem value="GOLD">🥇 Oro</SelectItem>
                  <SelectItem value="PLATINUM">💎 Platino</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="h-9">
                  <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registeredAt">Fecha registro</SelectItem>
                  <SelectItem value="points">Puntos</SelectItem>
                  <SelectItem value="totalSpent">Total gastado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardContent className="p-0 sm:pt-6 sm:px-6 sm:pb-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Cargando clientes...</p>
            </div>
          ) : currentCustomers.length > 0 ? (
            <>
              {/* ============ MOBILE: card list ============ */}
              <div className="divide-y sm:hidden">
                {currentCustomers.map((customer) => (
                  <div key={customer.id} className="px-3 py-3 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => viewCustomerDetails(customer)}
                      className="flex-1 min-w-0 text-left active:opacity-70"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm truncate max-w-[180px]">
                          {customer.name}
                        </span>
                        <TierBadge tier={customer.loyaltyTier} />
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {customer.email}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 tabular-nums">
                        {customer.points} pts · {customer._count?.orders || 0} ord ·{" "}
                        S/. {Number(customer.totalSpent).toFixed(0)} ·{" "}
                        {customer.referralCount} ref
                      </p>
                    </button>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => viewCustomerDetails(customer)}
                        aria-label="Ver detalles"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openAdjustModal(customer)}
                        aria-label="Ajustar puntos"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ============ DESKTOP: original table ============ */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Puntos</TableHead>
                      <TableHead>Órdenes</TableHead>
                      <TableHead>Referidos</TableHead>
                      <TableHead>Total Gastado</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Código: {customer.referralCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={customer.loyaltyTier} />
                        </TableCell>
                        <TableCell>
                          <p className="font-bold">{customer.points}</p>
                          <p className="text-xs text-muted-foreground">
                            +{customer.totalPointsEarned} total
                          </p>
                        </TableCell>
                        <TableCell>{customer._count?.orders || 0}</TableCell>
                        <TableCell>{customer.referralCount}</TableCell>
                        <TableCell>
                          S/. {Number(customer.totalSpent).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(customer.registeredAt).toLocaleDateString("es-PE")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewCustomerDetails(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAdjustModal(customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
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
                    {startIndex + 1}–{Math.min(endIndex, filteredCustomers.length)} de{" "}
                    {filteredCustomers.length}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2 py-1 text-xs sm:text-sm tabular-nums">
                      Pág. {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Detalles del Cliente */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedCustomer.email}</p>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <p className="font-medium">{selectedCustomer.phone || "N/A"}</p>
                </div>
                <div>
                  <Label>DNI</Label>
                  <p className="font-medium">{selectedCustomer.dni || "N/A"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Programa de Lealtad</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nivel VIP</Label>
                    <TierBadge tier={selectedCustomer.loyaltyTier} />
                  </div>
                  <div>
                    <Label>Código de Referido</Label>
                    <p className="font-mono font-bold">{selectedCustomer.referralCode}</p>
                  </div>
                  <div>
                    <Label>Puntos Actuales</Label>
                    <p className="text-2xl font-bold">{selectedCustomer.points}</p>
                  </div>
                  <div>
                    <Label>Total Ganado</Label>
                    <p className="text-2xl font-bold text-green-600">
                      +{selectedCustomer.totalPointsEarned}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Estadísticas</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Órdenes</Label>
                    <p className="text-xl font-bold">{selectedCustomer.totalOrders}</p>
                  </div>
                  <div>
                    <Label>Total Gastado</Label>
                    <p className="text-xl font-bold">
                      S/. {Number(selectedCustomer.totalSpent).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label>Referidos</Label>
                    <p className="text-xl font-bold">{selectedCustomer.referralCount}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Registrado</Label>
                <p>{new Date(selectedCustomer.registeredAt).toLocaleString("es-PE")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Ajustar Puntos */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Puntos</DialogTitle>
            <DialogDescription>
              Agregar o quitar puntos manualmente al cliente
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Cliente</Label>
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-muted-foreground">
                  Puntos actuales: {selectedCustomer.points}
                </p>
              </div>

              <div>
                <Label htmlFor="points">Puntos</Label>
                <Input
                  id="points"
                  type="number"
                  placeholder="Ej: 100 o -50"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usa número positivo para agregar, negativo para quitar
                </p>
              </div>

              <div>
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Input
                  id="reason"
                  placeholder="Ej: Compensación por error"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdjustModal(false);
                setAdjustPoints("");
                setAdjustReason("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAdjustPoints}>Ajustar Puntos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente auxiliar
function TierBadge({ tier }: { tier: string }) {
  const config: Record<string, { label: string; color: string }> = {
    BRONZE: { label: "🥉 Bronce", color: "bg-orange-100 text-orange-700" },
    SILVER: { label: "🥈 Plata", color: "bg-gray-100 text-gray-700" },
    GOLD: { label: "🥇 Oro", color: "bg-yellow-100 text-yellow-700" },
    PLATINUM: { label: "💎 Platino", color: "bg-purple-100 text-purple-700" },
  };

  const { label, color } = config[tier] || config.BRONZE;

  return <Badge className={color}>{label}</Badge>;
}