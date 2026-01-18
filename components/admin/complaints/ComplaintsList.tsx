"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { getComplaints } from "@/actions/complaints";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Complaint {
  id: string;
  complaintNumber: string;
  customerName?: string;
  customerEmail?: string;
  status: string;
  createdAt: Date;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  IN_REVIEW: { label: "En Revisión", color: "bg-blue-100 text-blue-700" },
  RESOLVED: { label: "Resuelto", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Cerrado", color: "bg-slate-100 text-slate-700" },
};

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadComplaints();
  }, [statusFilter]);

  const loadComplaints = async () => {
    setLoading(true);
    const result = await getComplaints({
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 100,
    });

    if (result.success) {
      setComplaints(result.data as any);
    }
    setLoading(false);
  };

  const filteredComplaints = complaints.filter((complaint) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      complaint.complaintNumber.toLowerCase().includes(searchLower) ||
      complaint.customerName?.toLowerCase().includes(searchLower) ||
      complaint.customerEmail?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Reclamaciones Recibidas</h2>
        <p className="text-muted-foreground">
          Gestiona las reclamaciones de los clientes
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="IN_REVIEW">En Revisión</SelectItem>
                <SelectItem value="RESOLVED">Resuelto</SelectItem>
                <SelectItem value="CLOSED">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {complaints.filter((c) => c.status === "PENDING").length}
            </div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {complaints.filter((c) => c.status === "IN_REVIEW").length}
            </div>
            <p className="text-xs text-muted-foreground">En Revisión</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {complaints.filter((c) => c.status === "RESOLVED").length}
            </div>
            <p className="text-xs text-muted-foreground">Resueltos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{complaints.length}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Reclamaciones ({filteredComplaints.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">
                No hay reclamaciones
              </p>
              <p className="text-muted-foreground">
                {search
                  ? "No se encontraron resultados"
                  : "Aún no se han recibido reclamaciones"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.map((complaint) => {
                    const statusInfo = statusLabels[complaint.status] || {
                      label: complaint.status,
                      color: "bg-slate-100 text-slate-700",
                    };

                    return (
                      <TableRow key={complaint.id}>
                        <TableCell>
                          <span className="font-mono font-medium">
                            {complaint.complaintNumber}
                          </span>
                        </TableCell>
                        <TableCell>
                          {complaint.customerName || "-"}
                        </TableCell>
                        <TableCell>
                          {complaint.customerEmail || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(complaint.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/admin/libro-reclamaciones/reclamaciones/${complaint.id}`}
                            >
                              Ver Detalle
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}