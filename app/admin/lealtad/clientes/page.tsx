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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de Clientes</h1>
          <p className="text-muted-foreground">
            {filteredCustomers.length} clientes en el programa de lealtad
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/lealtad">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
      </div>

      {/* Stats Rápidas */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bronce</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {customers.filter((c) => c.loyaltyTier === "BRONZE").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Plata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {customers.filter((c) => c.loyaltyTier === "SILVER").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Oro/Platino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {customers.filter((c) => 
                c.loyaltyTier === "GOLD" || c.loyaltyTier === "PLATINUM"
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Búsqueda */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email, DNI o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filtro por Tier */}
            <div>
              <Select
                value={tierFilter}
                onValueChange={(value: any) => setTierFilter(value)}
              >
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar por nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los niveles</SelectItem>
                  <SelectItem value="BRONZE">🥉 Bronce</SelectItem>
                  <SelectItem value="SILVER">🥈 Plata</SelectItem>
                  <SelectItem value="GOLD">🥇 Oro</SelectItem>
                  <SelectItem value="PLATINUM">💎 Platino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenar */}
            <div>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registeredAt">Fecha de registro</SelectItem>
                  <SelectItem value="points">Puntos</SelectItem>
                  <SelectItem value="totalSpent">Total gastado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Clientes */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando clientes...</p>
            </div>
          ) : currentCustomers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
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
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredCustomers.length)} de{" "}
                    {filteredCustomers.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Página {currentPage} de {totalPages}
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
              <p className="text-muted-foreground">No se encontraron clientes</p>
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