"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  bulkAssignDistrictsToZone,
  searchDistrictsForZone,
  getProvinceDistrictsForZone,
} from "@/actions/shipping-system";
import { removeDistrictFromZone } from "@/actions/shipping-edit";
import {
  getDepartments,
  getProvincesByDepartment,
} from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Check,
} from "lucide-react";

interface AssignedDistrict {
  id: string;
  districtCode: string;
  districtName: string;
  provinceName: string;
  departmentName: string;
}

interface SearchResult {
  code: string;
  name: string;
  province: string;
  department: string;
  assignedZoneId: string | null;
  assignedZoneName: string | null;
  assignedHere: boolean;
}

interface ProvinceDistrict {
  code: string;
  name: string;
  assignedZoneId: string | null;
  assignedZoneName: string | null;
  assignedHere: boolean;
}

interface Props {
  zoneId: string;
  zoneName: string;
  initialDistricts: AssignedDistrict[];
}

export function ZoneDistrictsManager({ zoneId, zoneName, initialDistricts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [districts, setDistricts] = useState<AssignedDistrict[]>(initialDistricts);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setDistricts(initialDistricts);
  }, [initialDistricts]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return districts;
    return districts.filter(
      (d) =>
        d.districtName.toLowerCase().includes(q) ||
        d.provinceName.toLowerCase().includes(q) ||
        d.departmentName.toLowerCase().includes(q) ||
        d.districtCode.includes(q),
    );
  }, [filter, districts]);

  const handleRemove = (assignmentId: string, name: string) => {
    startTransition(async () => {
      const res = await removeDistrictFromZone(assignmentId, zoneId);
      if (res.success) {
        toast.success(`${name} removido de la zona`);
        router.refresh();
      } else {
        toast.error(res.error || "Error al remover distrito");
      }
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Agregar distritos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Busca por nombre o agrega toda una provincia de una vez
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:max-w-md">
              <TabsTrigger value="search" className="text-xs sm:text-sm">
                <Search className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Buscar por nombre</span>
                <span className="sm:hidden">Buscar</span>
              </TabsTrigger>
              <TabsTrigger value="province" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Por departamento/provincia</span>
                <span className="sm:hidden">Por provincia</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="mt-3 sm:mt-4">
              <DistrictSearch zoneId={zoneId} onChange={() => router.refresh()} />
            </TabsContent>
            <TabsContent value="province" className="mt-3 sm:mt-4">
              <ProvinceBulkPicker zoneId={zoneId} onChange={() => router.refresh()} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">
                Distritos asignados ({districts.length})
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Distritos cubiertos por &ldquo;{zoneName}&rdquo;
              </CardDescription>
            </div>
            {districts.length > 0 && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
          {districts.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground px-4">
              <p className="font-medium mb-1 text-sm sm:text-base">No hay distritos asignados</p>
              <p className="text-xs sm:text-sm">Usa el panel de arriba para agregar los primeros distritos.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs sm:text-sm">
              No se encontraron distritos con &ldquo;{filter}&rdquo;
            </div>
          ) : (
            <>
              {/* Mobile list */}
              <div className="sm:hidden space-y-2">
                {filtered.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{d.districtName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {d.provinceName}, {d.departmentName}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {d.districtCode}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={pending} className="h-8 w-8 shrink-0">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Remover distrito?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se quitará <strong>{d.districtName}</strong> de la zona{" "}
                            <strong>{zoneName}</strong>. Los clientes ya no podrán
                            seleccionar esta zona en checkout para este distrito.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(d.id, d.districtName)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Distrito</TableHead>
                      <TableHead>Provincia</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="font-mono">UBIGEO</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.districtName}</TableCell>
                        <TableCell>{d.provinceName}</TableCell>
                        <TableCell>{d.departmentName}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {d.districtCode}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={pending}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Remover distrito?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se quitará <strong>{d.districtName}</strong> de la zona{" "}
                                  <strong>{zoneName}</strong>. Los clientes ya no podrán
                                  seleccionar esta zona en checkout para este distrito.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemove(d.id, d.districtName)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DistrictSearch({
  zoneId,
  onChange,
}: {
  zoneId: string;
  onChange: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchDistrictsForZone(zoneId, debounced).then((res) => {
      if (cancelled) return;
      setResults(res.success ? res.data : []);
      setSearching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, zoneId]);

  const available = results.filter((r) => !r.assignedZoneId);
  const allSelected = available.length > 0 && available.every((r) => selected.has(r.code));

  const toggleAll = () => {
    const codes = available.map((r) => r.code);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        codes.forEach((c) => next.delete(c));
      } else {
        codes.forEach((c) => next.add(c));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    const codes = Array.from(selected);
    startTransition(async () => {
      const res = await bulkAssignDistrictsToZone(zoneId, codes);
      if (!res.success) {
        toast.error(res.error || "Error al asignar distritos");
        return;
      }
      const { added, conflicts } = res.data;
      if (added > 0) toast.success(`${added} distrito(s) agregado(s)`);
      if (conflicts.length > 0) {
        toast.warning(`${conflicts.length} ya estaban en otra zona`, {
          description: conflicts
            .slice(0, 3)
            .map((c) => `${c.code} → ${c.zone}`)
            .join(", "),
        });
      }
      setQuery("");
      setSelected(new Set());
      setResults([]);
      onChange();
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="district-search" className="text-sm">Buscar por nombre o UBIGEO</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="district-search"
            placeholder="Ej: Miraflores, San Isidro, 150122..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground">
          Mínimo 2 caracteres. Los resultados ya asignados a otra zona no se pueden seleccionar.
        </p>
      </div>

      {searching && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Buscando...
        </div>
      )}

      {!searching && debounced.length >= 2 && results.length === 0 && (
        <p className="text-xs sm:text-sm text-muted-foreground py-4">
          Sin resultados para &ldquo;{debounced}&rdquo;
        </p>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs sm:text-sm">
          <span className="font-medium">
            {selected.size} distrito(s) seleccionado(s) en total
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={pending}
            className="h-7 px-2 text-xs"
          >
            Limpiar
          </Button>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="rounded-md border">
          <div className="flex items-center justify-between p-2 border-b bg-muted/50 gap-2 sticky top-0 z-10">
            <div className="flex items-center gap-2 px-1.5 sm:px-2 min-w-0">
              {available.length > 0 && (
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  id="select-all"
                />
              )}
              <Label htmlFor="select-all" className="text-xs sm:text-sm cursor-pointer truncate">
                {`${available.filter((r) => selected.has(r.code)).length} de ${available.length} disp. en resultados`}
              </Label>
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={selected.size === 0 || pending}
              className="shrink-0 h-8"
            >
              {pending ? (
                <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="sm:mr-2 h-4 w-4" />
              )}
              <span className="hidden sm:inline">Agregar {selected.size > 0 ? `(${selected.size})` : ""}</span>
              <span className="sm:hidden ml-1">{selected.size > 0 ? `(${selected.size})` : ""}</span>
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {results.map((r) => {
              const blocked = !!r.assignedZoneId;
              const isHere = r.assignedHere;
              return (
                <label
                  key={r.code}
                  className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 text-xs sm:text-sm ${
                    blocked ? "opacity-60" : "hover:bg-accent cursor-pointer"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(r.code)}
                    onCheckedChange={() => !blocked && toggle(r.code)}
                    disabled={blocked}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {r.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        — {r.province}, {r.department}
                      </span>
                    </p>
                    <p className="text-[10px] sm:text-xs font-mono text-muted-foreground">{r.code}</p>
                  </div>
                  {isHere && (
                    <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                      <Check className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Ya en esta zona</span>
                    </Badge>
                  )}
                  {blocked && !isHere && (
                    <Badge variant="outline" className="shrink-0 text-amber-700 border-amber-300 text-[10px] sm:text-xs">
                      <X className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">En {r.assignedZoneName}</span>
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProvinceBulkPicker({
  zoneId,
  onChange,
}: {
  zoneId: string;
  onChange: () => void;
}) {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<ProvinceDistrict[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const visitedProvincesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    getDepartments().then((res) => {
      if (res.success) setDepartments(res.data);
    });
  }, []);

  useEffect(() => {
    setProvinceId("");
    setDistricts([]);
    if (!departmentId) {
      setProvinces([]);
      return;
    }
    getProvincesByDepartment(departmentId).then((res) => {
      if (res.success) setProvinces(res.data);
    });
  }, [departmentId]);

  useEffect(() => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    setLoading(true);
    getProvinceDistrictsForZone(zoneId, provinceId).then((res) => {
      if (res.success) {
        setDistricts(res.data);
        if (!visitedProvincesRef.current.has(provinceId)) {
          visitedProvincesRef.current.add(provinceId);
          const autoCodes = res.data
            .filter((d) => !d.assignedZoneId)
            .map((d) => d.code);
          if (autoCodes.length > 0) {
            setSelected((prev) => {
              const next = new Set(prev);
              autoCodes.forEach((c) => next.add(c));
              return next;
            });
          }
        }
      }
      setLoading(false);
    });
  }, [provinceId, zoneId]);

  const available = districts.filter((d) => !d.assignedZoneId);
  const allSelected = available.length > 0 && available.every((d) => selected.has(d.code));

  const toggleAll = () => {
    const codes = available.map((d) => d.code);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        codes.forEach((c) => next.delete(c));
      } else {
        codes.forEach((c) => next.add(c));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    const codes = Array.from(selected);
    startTransition(async () => {
      const res = await bulkAssignDistrictsToZone(zoneId, codes);
      if (!res.success) {
        toast.error(res.error || "Error al asignar distritos");
        return;
      }
      const { added, conflicts } = res.data;
      if (added > 0) toast.success(`${added} distrito(s) agregado(s)`);
      if (conflicts.length > 0) {
        toast.warning(`${conflicts.length} ya estaban en otra zona`);
      }
      setProvinceId("");
      setDepartmentId("");
      setDistricts([]);
      setSelected(new Set());
      visitedProvincesRef.current = new Set();
      onChange();
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-sm">Departamento</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-sm">Provincia</Label>
          <Select
            value={provinceId}
            onValueChange={setProvinceId}
            disabled={!departmentId || provinces.length === 0}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={!departmentId ? "Primero el departamento" : "Selecciona..."}
              />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando distritos...
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs sm:text-sm">
          <span className="font-medium">
            {selected.size} distrito(s) seleccionado(s) en total
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={pending}
            className="h-7 px-2 text-xs"
          >
            Limpiar
          </Button>
        </div>
      )}

      {!loading && provinceId && districts.length > 0 && (
        <div className="rounded-md border">
          <div className="flex items-center justify-between p-2 border-b bg-muted/50 gap-2 sticky top-0 z-10">
            <div className="flex items-center gap-2 px-1.5 sm:px-2 min-w-0">
              {available.length > 0 && (
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  id="select-all-prov"
                />
              )}
              <Label htmlFor="select-all-prov" className="text-xs sm:text-sm cursor-pointer truncate">
                {`${available.filter((d) => selected.has(d.code)).length} de ${available.length} disp. en esta provincia`}
              </Label>
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={selected.size === 0 || pending}
              className="shrink-0 h-8"
            >
              {pending ? (
                <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="sm:mr-2 h-4 w-4" />
              )}
              <span className="hidden sm:inline">Agregar {selected.size > 0 ? `(${selected.size})` : ""}</span>
              <span className="sm:hidden ml-1">{selected.size > 0 ? `(${selected.size})` : ""}</span>
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {districts.map((d) => {
              const blocked = !!d.assignedZoneId;
              return (
                <label
                  key={d.code}
                  className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 text-xs sm:text-sm ${
                    blocked ? "opacity-60" : "hover:bg-accent cursor-pointer"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(d.code)}
                    onCheckedChange={() => !blocked && toggle(d.code)}
                    disabled={blocked}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{d.name}</span>
                    <span className="ml-2 text-[10px] sm:text-xs font-mono text-muted-foreground">
                      {d.code}
                    </span>
                  </div>
                  {d.assignedHere && (
                    <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                      <Check className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Aquí</span>
                    </Badge>
                  )}
                  {blocked && !d.assignedHere && (
                    <Badge variant="outline" className="shrink-0 text-amber-700 border-amber-300 text-[10px] sm:text-xs">
                      <span className="hidden sm:inline">En </span>{d.assignedZoneName}
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {!loading && provinceId && districts.length === 0 && (
        <div className="rounded-md border p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Esta provincia no tiene distritos registrados.
        </div>
      )}
    </div>
  );
}
