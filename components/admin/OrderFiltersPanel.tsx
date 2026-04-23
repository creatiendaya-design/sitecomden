"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, X, Download } from "lucide-react";
import { ALL_DISTRICTS } from "@/lib/districts-peru";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface OrderFiltersPanelProps {
  categories: Category[];
}

const ORDER_STATUSES = [
  { value: "PENDING", label: "Pendiente" },
  { value: "PROCESSING", label: "Procesando" },
  { value: "SHIPPED", label: "Enviado" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const PAYMENT_METHODS = [
  { value: "CARD", label: "Tarjeta" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "COD", label: "COD" },
  { value: "BANK_TRANSFER", label: "Transferencia" },
];

const departments = [
  ...new Set(ALL_DISTRICTS.map((d) => d.department)),
].sort();

export default function OrderFiltersPanel({
  categories,
}: OrderFiltersPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");
  const [statuses, setStatuses] = useState<string[]>(
    searchParams.getAll("status")
  );
  const [methods, setMethods] = useState<string[]>(
    searchParams.getAll("payment")
  );
  const [productSearch, setProductSearch] = useState("");
  const [productId, setProductId] = useState(
    searchParams.get("productId") ?? ""
  );
  const [productName, setProductName] = useState(
    searchParams.get("productName") ?? ""
  );
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") ?? ""
  );
  const [department, setDepartment] = useState(
    searchParams.get("department") ?? ""
  );
  const [province, setProvince] = useState(
    searchParams.get("province") ?? ""
  );
  const [district, setDistrict] = useState(
    searchParams.get("district") ?? ""
  );
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [montoMin, setMontoMin] = useState(
    searchParams.get("montoMin") ?? ""
  );
  const [montoMax, setMontoMax] = useState(
    searchParams.get("montoMax") ?? ""
  );
  const [productResults, setProductResults] = useState<Product[]>([]);

  const provinces = [
    ...new Set(
      ALL_DISTRICTS.filter((d) => d.department === department).map(
        (d) => d.province
      )
    ),
  ].sort();
  const districts = ALL_DISTRICTS.filter(
    (d) => d.department === department && d.province === province
  ).sort((a, b) => a.name.localeCompare(b.name));

  async function searchProducts(query: string) {
    setProductSearch(query);
    if (query.length < 2) {
      setProductResults([]);
      return;
    }
    const res = await fetch(
      `/api/admin/products/search?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    setProductResults(data.products ?? []);
  }

  function toggleCheckbox(
    list: string[],
    setList: (v: string[]) => void,
    value: string
  ) {
    setList(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value]
    );
  }

  function buildParams() {
    const p = new URLSearchParams();
    if (desde) p.set("desde", desde);
    if (hasta) p.set("hasta", hasta);
    statuses.forEach((s) => p.append("status", s));
    methods.forEach((m) => p.append("payment", m));
    if (productId) {
      p.set("productId", productId);
      p.set("productName", productName);
    }
    if (categoryId) p.set("categoryId", categoryId);
    if (department) p.set("department", department);
    if (province) p.set("province", province);
    if (district) p.set("district", district);
    if (q) p.set("q", q);
    if (montoMin) p.set("montoMin", montoMin);
    if (montoMax) p.set("montoMax", montoMax);
    return p;
  }

  function handleApply() {
    router.push(`/admin/ordenes?${buildParams().toString()}`);
    setOpen(false);
  }

  function handleClear() {
    setDesde("");
    setHasta("");
    setStatuses([]);
    setMethods([]);
    setProductId("");
    setProductName("");
    setProductSearch("");
    setProductResults([]);
    setCategoryId("");
    setDepartment("");
    setProvince("");
    setDistrict("");
    setQ("");
    setMontoMin("");
    setMontoMax("");
    router.push("/admin/ordenes");
    setOpen(false);
  }

  function handleExport() {
    const url = `/api/admin/orders/export?${searchParams.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  const hasFilters = searchParams.size > 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={open ? "default" : "outline"}
          size="sm"
          onClick={() => setOpen(!open)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtros
          {hasFilters && (
            <span className="ml-2 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
              {searchParams.size}
            </span>
          )}
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="mr-1 h-3 w-3" /> Limpiar
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {open && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Hasta</Label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Estado de orden</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ORDER_STATUSES.map((s) => (
                  <label
                    key={s.value}
                    className="flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={statuses.includes(s.value)}
                      onChange={() =>
                        toggleCheckbox(statuses, setStatuses, s.value)
                      }
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Método de pago</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.value}
                    className="flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={methods.includes(m.value)}
                      onChange={() =>
                        toggleCheckbox(methods, setMethods, m.value)
                      }
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Producto</Label>
              <div className="relative">
                <Input
                  value={productId ? productName : productSearch}
                  onChange={(e) => {
                    setProductId("");
                    searchProducts(e.target.value);
                  }}
                  placeholder="Buscar producto..."
                  className="h-8 text-sm"
                />
                {productResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-md shadow mt-1 max-h-40 overflow-y-auto">
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                        onClick={() => {
                          setProductId(p.id);
                          setProductName(p.name);
                          setProductSearch("");
                          setProductResults([]);
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">Categoría</Label>
              <select
                className="w-full rounded-md border px-2 py-1 text-sm h-8"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Departamento</Label>
                <select
                  className="w-full rounded-md border px-2 py-1 text-sm h-8"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setProvince("");
                    setDistrict("");
                  }}
                >
                  <option value="">Todos</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Provincia</Label>
                <select
                  className="w-full rounded-md border px-2 py-1 text-sm h-8"
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setDistrict("");
                  }}
                  disabled={!department}
                >
                  <option value="">Todas</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Distrito</Label>
                <select
                  className="w-full rounded-md border px-2 py-1 text-sm h-8"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={!province}
                >
                  <option value="">Todos</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">
                Buscar cliente (nombre, email o teléfono)
              </Label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ej: juan, juan@email.com, 987654321"
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto mínimo (S/.)</Label>
                <Input
                  type="number"
                  value={montoMin}
                  onChange={(e) => setMontoMin(e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Monto máximo (S/.)</Label>
                <Input
                  type="number"
                  value={montoMax}
                  onChange={(e) => setMontoMax(e.target.value)}
                  placeholder="9999"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleApply} className="flex-1">
                Aplicar filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
