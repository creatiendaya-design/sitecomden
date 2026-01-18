"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  getShippingZoneById,
  getZoneDistrictsWithDetails,
  addDistrictToZone,
  removeDistrictFromZone,
} from "@/actions/shipping-edit";
import { getDistrictsByProvince, getProvincesByDepartment, getDepartments } from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Loader2, AlertTriangle, Search } from "lucide-react";
import Link from "next/link";

interface DistrictAssignment {
  id: string;
  districtCode: string;
  districtName: string;
  provinceName: string;
  departmentName: string;
}

export default function ManageDistrictsPage() {
  const router = useRouter();
  const params = useParams();
  const zoneId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [zoneName, setZoneName] = useState("");
  const [districts, setDistricts] = useState<DistrictAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Para agregar distrito
  const [adding, setAdding] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [districtCode, setDistrictCode] = useState("");

  const [departments, setDepartments] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadZoneAndDistricts();
    loadDepartments();
  }, [zoneId]);

  useEffect(() => {
    if (departmentId) {
      loadProvinces(departmentId);
    } else {
      setProvinces([]);
      setAvailableDistricts([]);
    }
  }, [departmentId]);

  useEffect(() => {
    if (provinceId) {
      loadDistricts(provinceId);
    } else {
      setAvailableDistricts([]);
    }
  }, [provinceId]);

  const loadZoneAndDistricts = async () => {
    setLoading(true);
    
    const zoneResult = await getShippingZoneById(zoneId);
    if (zoneResult.success && zoneResult.data) {
      setZoneName(zoneResult.data.name);
    }

    const districtsResult = await getZoneDistrictsWithDetails(zoneId);
    if (districtsResult.success) {
      setDistricts(districtsResult.data);
    }

    setLoading(false);
  };

  const loadDepartments = async () => {
    const result = await getDepartments();
    if (result.success) {
      setDepartments(result.data);
    }
  };

  const loadProvinces = async (deptId: string) => {
    const result = await getProvincesByDepartment(deptId);
    if (result.success) {
      setProvinces(result.data);
    }
  };

  const loadDistricts = async (provId: string) => {
    const result = await getDistrictsByProvince(provId);
    if (result.success) {
      setAvailableDistricts(result.data);
    }
  };

  const handleAddDistrict = async () => {
    if (!districtCode) {
      setError("Selecciona un distrito");
      return;
    }

    setAdding(true);
    setError(null);
    setSuccess(null);

    const result = await addDistrictToZone(zoneId, districtCode);

    if (result.success) {
      setSuccess("Distrito agregado correctamente");
      setDistrictCode("");
      setProvinceId("");
      setDepartmentId("");
      await loadZoneAndDistricts();
    } else {
      setError(result.error || "Error al agregar distrito");
    }

    setAdding(false);
  };

  const handleRemoveDistrict = async (assignmentId: string) => {
    const result = await removeDistrictFromZone(assignmentId, zoneId);

    if (result.success) {
      setSuccess("Distrito removido correctamente");
      await loadZoneAndDistricts();
    } else {
      setError(result.error || "Error al remover distrito");
    }
  };

  const filteredDistricts = districts.filter((d) =>
    d.districtName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.provinceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.departmentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/envios/zonas/`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Gestionar Distritos</h1>
          <p className="text-muted-foreground">Zona: {zoneName}</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-900">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Agregar Distrito */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Distrito
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Departamento */}
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provincia */}
            <div className="space-y-2">
              <Label>Provincia</Label>
              <Select
                value={provinceId}
                onValueChange={setProvinceId}
                disabled={!departmentId || provinces.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!departmentId ? "Primero depto." : "Selecciona"} />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((prov) => (
                    <SelectItem key={prov.id} value={prov.id}>
                      {prov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Distrito */}
            <div className="space-y-2">
              <Label>Distrito</Label>
              <Select
                value={districtCode}
                onValueChange={setDistrictCode}
                disabled={!provinceId || availableDistricts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!provinceId ? "Primero prov." : "Selecciona"} />
                </SelectTrigger>
                <SelectContent>
                  {availableDistricts.map((dist) => (
                    <SelectItem key={dist.id} value={dist.code}>
                      {dist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botón */}
            <div className="flex items-end">
              <Button
                onClick={handleAddDistrict}
                disabled={!districtCode || adding}
                className="w-full"
              >
                {adding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Distritos */}
      <Card>
        <CardHeader>
          <CardTitle>Distritos Asignados ({districts.length})</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar distrito..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredDistricts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm
                ? "No se encontraron distritos con ese criterio"
                : "No hay distritos asignados a esta zona aún"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Provincia</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Código UBIGEO</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDistricts.map((district) => (
                  <TableRow key={district.id}>
                    <TableCell className="font-medium">
                      {district.districtName}
                    </TableCell>
                    <TableCell>{district.provinceName}</TableCell>
                    <TableCell>{district.departmentName}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {district.districtCode}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Remover distrito?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se quitará <strong>{district.districtName}</strong> de la zona{" "}
                              <strong>{zoneName}</strong>. Los clientes de este distrito ya no
                              podrán seleccionar esta zona en checkout.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveDistrict(district.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}