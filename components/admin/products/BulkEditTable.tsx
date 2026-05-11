"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, GripVertical, Loader2, Save, Undo2, Layers } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl, getProductImageAlt } from "@/lib/image-utils";

interface CategoryOption {
  id: string;
  name: string;
}

interface LandingTemplateOption {
  id: string;
  name: string;
}

interface SizeGuideOption {
  id: string;
  name: string;
}

interface CustomizableTemplateOption {
  id: string;
  name: string;
}

export interface ProductRow {
  kind: "product";
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  images: unknown;
  hasVariants: boolean;
  basePrice: number;
  compareAtPrice: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  landingTemplateId: string | null;
  sizeGuideId: string | null;
  customizableTemplateId: string | null;
  categoryId: string | null;
  variantCount: number;
  variantStock: number;
  minVariantPrice: number | null;
  maxVariantPrice: number | null;
}

export interface VariantRow {
  kind: "variant";
  id: string;
  productId: string;
  productName: string;
  optionsLabel: string;
  image: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
}

export type BulkEditRow = ProductRow | VariantRow;

interface BulkEditTableProps {
  initialRows: BulkEditRow[];
  categories: CategoryOption[];
  landingTemplates: LandingTemplateOption[];
  sizeGuides: SizeGuideOption[];
  customizableTemplates: CustomizableTemplateOption[];
}

type DragField =
  | "price"
  | "compareAtPrice"
  | "stock"
  | "sku"
  | "active"
  | "featured"
  | "landingTemplateId"
  | "sizeGuideId"
  | "customizableTemplateId"
  | "categoryId";

interface DragState {
  field: DragField | null;
  startIndex: number | null;
  endIndex: number | null;
  value: string | null;
}

function rowsEqual(a: BulkEditRow, b: BulkEditRow): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "product" && b.kind === "product") {
    return (
      a.name === b.name &&
      a.sku === b.sku &&
      a.basePrice === b.basePrice &&
      a.compareAtPrice === b.compareAtPrice &&
      a.stock === b.stock &&
      a.active === b.active &&
      a.featured === b.featured &&
      a.landingTemplateId === b.landingTemplateId &&
      a.sizeGuideId === b.sizeGuideId &&
      a.customizableTemplateId === b.customizableTemplateId &&
      a.categoryId === b.categoryId
    );
  }
  if (a.kind === "variant" && b.kind === "variant") {
    return (
      a.sku === b.sku &&
      a.price === b.price &&
      a.compareAtPrice === b.compareAtPrice &&
      a.stock === b.stock
    );
  }
  return true;
}

type DirtyRow =
  | {
      kind: "product";
      id: string;
      name?: string;
      sku?: string | null;
      basePrice?: number;
      compareAtPrice?: number | null;
      stock?: number;
      active?: boolean;
      featured?: boolean;
      landingTemplateId?: string | null;
      sizeGuideId?: string | null;
      customizableTemplateId?: string | null;
      categoryId?: string | null;
    }
  | {
      kind: "variant";
      id: string;
      sku?: string | null;
      price?: number;
      compareAtPrice?: number | null;
      stock?: number;
    };

function diffRow(initial: BulkEditRow, current: BulkEditRow): DirtyRow | null {
  if (initial.kind === "product" && current.kind === "product") {
    const out: DirtyRow = { kind: "product", id: initial.id };
    let changed = false;
    if (initial.name !== current.name) {
      out.name = current.name;
      changed = true;
    }
    if (!current.hasVariants) {
      if (initial.sku !== current.sku) {
        out.sku = current.sku;
        changed = true;
      }
      if (initial.basePrice !== current.basePrice) {
        out.basePrice = current.basePrice;
        changed = true;
      }
      if (initial.compareAtPrice !== current.compareAtPrice) {
        out.compareAtPrice = current.compareAtPrice;
        changed = true;
      }
      if (initial.stock !== current.stock) {
        out.stock = current.stock;
        changed = true;
      }
    }
    if (initial.active !== current.active) {
      out.active = current.active;
      changed = true;
    }
    if (initial.featured !== current.featured) {
      out.featured = current.featured;
      changed = true;
    }
    if (initial.landingTemplateId !== current.landingTemplateId) {
      out.landingTemplateId = current.landingTemplateId;
      changed = true;
    }
    if (initial.sizeGuideId !== current.sizeGuideId) {
      out.sizeGuideId = current.sizeGuideId;
      changed = true;
    }
    if (initial.customizableTemplateId !== current.customizableTemplateId) {
      out.customizableTemplateId = current.customizableTemplateId;
      changed = true;
    }
    if (initial.categoryId !== current.categoryId) {
      out.categoryId = current.categoryId;
      changed = true;
    }
    return changed ? out : null;
  }
  if (initial.kind === "variant" && current.kind === "variant") {
    const out: DirtyRow = { kind: "variant", id: initial.id };
    let changed = false;
    if (initial.sku !== current.sku) {
      out.sku = current.sku;
      changed = true;
    }
    if (initial.price !== current.price) {
      out.price = current.price;
      changed = true;
    }
    if (initial.compareAtPrice !== current.compareAtPrice) {
      out.compareAtPrice = current.compareAtPrice;
      changed = true;
    }
    if (initial.stock !== current.stock) {
      out.stock = current.stock;
      changed = true;
    }
    return changed ? out : null;
  }
  return null;
}

export default function BulkEditTable({
  initialRows,
  categories,
  landingTemplates,
  sizeGuides,
  customizableTemplates,
}: BulkEditTableProps) {
  const router = useRouter();
  const initialRef = useRef<BulkEditRow[]>(initialRows.map((r) => ({ ...r })));
  const [rows, setRows] = useState<BulkEditRow[]>(initialRows.map((r) => ({ ...r })));
  const [saving, setSaving] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    field: null,
    startIndex: null,
    endIndex: null,
    value: null,
  });

  const dirtyCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      if (!rowsEqual(initialRef.current[i], rows[i])) count++;
    }
    return count;
  }, [rows]);

  const updateRow = (index: number, partial: Partial<ProductRow> | Partial<VariantRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial } as BulkEditRow;
      return next;
    });
  };

  const isFieldDirty = (index: number, field: string): boolean => {
    const a = initialRef.current[index] as unknown as Record<string, unknown>;
    const b = rows[index] as unknown as Record<string, unknown>;
    return a?.[field] !== b?.[field];
  };

  const handleDragStart = (field: DragField, index: number, value: string) => {
    setDragState({ field, startIndex: index, endIndex: index, value });
  };

  const handleDragEnter = (index: number) => {
    if (dragState.startIndex !== null) {
      setDragState((prev) => ({ ...prev, endIndex: index }));
    }
  };

  const handleDragEnd = () => {
    const { field, startIndex, endIndex, value } = dragState;
    if (field !== null && startIndex !== null && endIndex !== null && value !== null) {
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      setRows((prev) => {
        const next = [...prev];
        for (let i = start; i <= end; i++) {
          const row = next[i];
          if (row.kind === "product") {
            const productLockedFields =
              row.hasVariants && (field === "sku" || field === "price" || field === "compareAtPrice" || field === "stock");
            if (productLockedFields) continue;
            if (field === "sku") next[i] = { ...row, sku: value || null };
            else if (field === "price") {
              const num = parseFloat(value);
              if (!Number.isNaN(num)) next[i] = { ...row, basePrice: num };
            } else if (field === "compareAtPrice") {
              const num = parseFloat(value);
              next[i] = { ...row, compareAtPrice: Number.isNaN(num) ? null : num };
            } else if (field === "stock") {
              const num = parseInt(value, 10);
              if (!Number.isNaN(num)) next[i] = { ...row, stock: num };
            } else if (field === "active") next[i] = { ...row, active: value === "true" };
            else if (field === "featured") next[i] = { ...row, featured: value === "true" };
            else if (field === "landingTemplateId")
              next[i] = { ...row, landingTemplateId: value === "" ? null : value };
            else if (field === "sizeGuideId")
              next[i] = { ...row, sizeGuideId: value === "" ? null : value };
            else if (field === "customizableTemplateId")
              next[i] = { ...row, customizableTemplateId: value === "" ? null : value };
            else if (field === "categoryId")
              next[i] = { ...row, categoryId: value === "" ? null : value };
          } else {
            // variant — solo aplican sku/price/compareAtPrice/stock
            if (field === "sku") next[i] = { ...row, sku: value || null };
            else if (field === "price") {
              const num = parseFloat(value);
              if (!Number.isNaN(num)) next[i] = { ...row, price: num };
            } else if (field === "compareAtPrice") {
              const num = parseFloat(value);
              next[i] = { ...row, compareAtPrice: Number.isNaN(num) ? null : num };
            } else if (field === "stock") {
              const num = parseInt(value, 10);
              if (!Number.isNaN(num)) next[i] = { ...row, stock: num };
            }
          }
        }
        return next;
      });
    }
    setDragState({ field: null, startIndex: null, endIndex: null, value: null });
  };

  const isCellInDragRange = (index: number, field: DragField): boolean => {
    if (dragState.field !== field) return false;
    if (dragState.startIndex === null || dragState.endIndex === null) return false;
    const start = Math.min(dragState.startIndex, dragState.endIndex);
    const end = Math.max(dragState.startIndex, dragState.endIndex);
    return index >= start && index <= end;
  };

  const handleResetRow = (index: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...initialRef.current[index] };
      return next;
    });
  };

  const handleResetAll = () => {
    if (dirtyCount === 0) return;
    if (!confirm(`Descartar ${dirtyCount} cambio(s) sin guardar?`)) return;
    setRows(initialRef.current.map((r) => ({ ...r })));
  };

  const handleSave = async () => {
    const dirtyRows = rows
      .map((r, i) => diffRow(initialRef.current[i], r))
      .filter((r): r is DirtyRow => r !== null);

    if (dirtyRows.length === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/bulk-edit-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: dirtyRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }
      const summary = [];
      if (data.updatedProducts > 0) summary.push(`${data.updatedProducts} producto(s)`);
      if (data.updatedVariants > 0) summary.push(`${data.updatedVariants} variante(s)`);
      toast.success(`Actualizado: ${summary.join(", ") || "sin cambios"}`);
      initialRef.current = rows.map((r) => ({ ...r }));
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const productCount = rows.filter((r) => r.kind === "product").length;

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/productos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">
              Editor masivo · {productCount} producto{productCount !== 1 ? "s" : ""}
              {rows.length !== productCount && ` · ${rows.length - productCount} variantes`}
            </h1>
            <p className="text-xs text-muted-foreground">
              Productos con variantes se expanden. Edita cualquier celda y arrastra{" "}
              <GripVertical className="inline h-3 w-3" /> para rellenar varias filas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirtyCount > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-900 text-xs font-medium px-2.5 py-1 border border-amber-200">
              {dirtyCount} sin guardar
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            disabled={saving || dirtyCount === 0}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Descartar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || dirtyCount === 0}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar {dirtyCount > 0 ? `(${dirtyCount})` : ""}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
            <tr className="text-left">
              <Th className="sticky left-0 z-10 bg-slate-50 w-[340px] min-w-[340px] border-r">
                Producto / Variante
              </Th>
              <Th className="w-[110px]">Estado</Th>
              <Th className="w-[110px]">Destacado</Th>
              <Th className="w-[180px]">SKU</Th>
              <Th className="w-[150px]">Precio</Th>
              <Th className="w-[150px]">Precio anterior</Th>
              <Th className="w-[120px]">Stock</Th>
              <Th className="w-[160px]">Plantilla landing</Th>
              <Th className="w-[160px]">Guía de tallas</Th>
              <Th className="w-[160px]">Personalización</Th>
              <Th className="w-[200px]">Categoría</Th>
              <Th className="w-[80px] text-right pr-4">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, index) => {
              const initial = initialRef.current[index];
              const rowDirty = !rowsEqual(initial, row);
              if (row.kind === "product") {
                return renderProductRow({
                  row,
                  index,
                  rowDirty,
                  categories,
                  landingTemplates,
                  sizeGuides,
                  customizableTemplates,
                  isFieldDirty,
                  isCellInDragRange,
                  handleDragStart,
                  handleDragEnter,
                  handleDragEnd,
                  updateRow,
                  handleResetRow,
                });
              }
              return renderVariantRow({
                row,
                index,
                rowDirty,
                isFieldDirty,
                isCellInDragRange,
                handleDragStart,
                handleDragEnter,
                handleDragEnd,
                updateRow,
                handleResetRow,
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RenderRowDeps {
  index: number;
  rowDirty: boolean;
  isFieldDirty: (index: number, field: string) => boolean;
  isCellInDragRange: (index: number, field: DragField) => boolean;
  handleDragStart: (field: DragField, index: number, value: string) => void;
  handleDragEnter: (index: number) => void;
  handleDragEnd: () => void;
  updateRow: (index: number, partial: Partial<ProductRow> | Partial<VariantRow>) => void;
  handleResetRow: (index: number) => void;
}

interface RenderProductRowProps extends RenderRowDeps {
  row: ProductRow;
  categories: CategoryOption[];
  landingTemplates: LandingTemplateOption[];
  sizeGuides: SizeGuideOption[];
  customizableTemplates: CustomizableTemplateOption[];
}

function renderProductRow({
  row,
  index,
  rowDirty,
  categories,
  landingTemplates,
  sizeGuides,
  customizableTemplates,
  isFieldDirty,
  isCellInDragRange,
  handleDragStart,
  handleDragEnter,
  handleDragEnd,
  updateRow,
  handleResetRow,
}: RenderProductRowProps) {
  const variantPriceLabel =
    row.hasVariants && row.minVariantPrice !== null && row.maxVariantPrice !== null
      ? row.minVariantPrice === row.maxVariantPrice
        ? formatPrice(row.minVariantPrice)
        : `${formatPrice(row.minVariantPrice)}–${formatPrice(row.maxVariantPrice)}`
      : "—";

  return (
    <tr key={`product:${row.id}`} className="group/row">
      {/* Producto */}
      <td
        className={`sticky left-0 z-[5] border-r p-2 ${
          rowDirty ? "bg-amber-50" : "bg-white"
        } group-hover/row:bg-slate-50`}
      >
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100 border">
            {getProductImageUrl(row.images) ? (
              <Image
                src={getProductImageUrl(row.images)!}
                alt={getProductImageAlt(row.images, row.name)}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                —
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(index, { name: e.target.value })}
              className={`w-full bg-transparent border-0 outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-1 py-0.5 text-sm font-medium ${
                isFieldDirty(index, "name") ? "text-amber-900" : ""
              }`}
            />
            {row.hasVariants && (
              <p className="text-[11px] text-muted-foreground px-1 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {row.variantCount} variantes
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Estado */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "active")}
          onDragStart={() => handleDragStart("active", index, row.active ? "true" : "false")}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <CellSelect
            value={row.active ? "true" : "false"}
            onChange={(v) => updateRow(index, { active: v === "true" })}
            dirty={isFieldDirty(index, "active")}
            options={[
              { value: "true", label: "Activo" },
              { value: "false", label: "Inactivo" },
            ]}
          />
        </DragFillCell>
      </Td>

      {/* Destacado */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "featured")}
          onDragStart={() => handleDragStart("featured", index, row.featured ? "true" : "false")}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <CellSelect
            value={row.featured ? "true" : "false"}
            onChange={(v) => updateRow(index, { featured: v === "true" })}
            dirty={isFieldDirty(index, "featured")}
            options={[
              { value: "false", label: "No" },
              { value: "true", label: "Sí" },
            ]}
          />
        </DragFillCell>
      </Td>

      {/* SKU */}
      <Td>
        {row.hasVariants ? (
          <DisabledCell>—</DisabledCell>
        ) : (
          <DragFillCell
            inDragRange={isCellInDragRange(index, "sku")}
            onDragStart={() => handleDragStart("sku", index, row.sku ?? "")}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
          >
            <input
              type="text"
              value={row.sku ?? ""}
              onChange={(e) => updateRow(index, { sku: e.target.value || null })}
              placeholder="—"
              className={cellInputClass(isFieldDirty(index, "sku"))}
            />
          </DragFillCell>
        )}
      </Td>

      {/* Precio */}
      <Td>
        {row.hasVariants ? (
          <DisabledCell>{variantPriceLabel}</DisabledCell>
        ) : (
          <DragFillCell
            inDragRange={isCellInDragRange(index, "price")}
            onDragStart={() => handleDragStart("price", index, String(row.basePrice))}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              value={row.basePrice}
              onChange={(e) =>
                updateRow(index, { basePrice: parseFloat(e.target.value) || 0 })
              }
              className={cellInputClass(isFieldDirty(index, "basePrice"))}
            />
          </DragFillCell>
        )}
      </Td>

      {/* Precio anterior */}
      <Td>
        {row.hasVariants ? (
          <DisabledCell>—</DisabledCell>
        ) : (
          <DragFillCell
            inDragRange={isCellInDragRange(index, "compareAtPrice")}
            onDragStart={() =>
              handleDragStart(
                "compareAtPrice",
                index,
                row.compareAtPrice == null ? "" : String(row.compareAtPrice)
              )
            }
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              value={row.compareAtPrice ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                updateRow(index, {
                  compareAtPrice: val === "" ? null : parseFloat(val) || 0,
                });
              }}
              placeholder="—"
              className={cellInputClass(isFieldDirty(index, "compareAtPrice"))}
            />
          </DragFillCell>
        )}
      </Td>

      {/* Stock */}
      <Td>
        {row.hasVariants ? (
          <DisabledCell>{row.variantStock}</DisabledCell>
        ) : (
          <DragFillCell
            inDragRange={isCellInDragRange(index, "stock")}
            onDragStart={() => handleDragStart("stock", index, String(row.stock))}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
          >
            <input
              type="number"
              step="1"
              min="0"
              value={row.stock}
              onChange={(e) =>
                updateRow(index, { stock: parseInt(e.target.value, 10) || 0 })
              }
              className={cellInputClass(isFieldDirty(index, "stock"))}
            />
          </DragFillCell>
        )}
      </Td>

      {/* Plantilla landing */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "landingTemplateId")}
          onDragStart={() =>
            handleDragStart("landingTemplateId", index, row.landingTemplateId ?? "")
          }
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <CellSelect
            value={row.landingTemplateId ?? ""}
            onChange={(v) => updateRow(index, { landingTemplateId: v === "" ? null : v })}
            dirty={isFieldDirty(index, "landingTemplateId")}
            options={[
              { value: "", label: "Sin plantilla" },
              ...landingTemplates.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
        </DragFillCell>
      </Td>

      {/* Guía de tallas */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "sizeGuideId")}
          onDragStart={() => handleDragStart("sizeGuideId", index, row.sizeGuideId ?? "")}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <CellSelect
            value={row.sizeGuideId ?? ""}
            onChange={(v) => updateRow(index, { sizeGuideId: v === "" ? null : v })}
            dirty={isFieldDirty(index, "sizeGuideId")}
            options={[
              { value: "", label: "Sin guía" },
              ...sizeGuides.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        </DragFillCell>
      </Td>

      {/* Personalización */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "customizableTemplateId")}
          onDragStart={() =>
            handleDragStart("customizableTemplateId", index, row.customizableTemplateId ?? "")
          }
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <CellSelect
            value={row.customizableTemplateId ?? ""}
            onChange={(v) =>
              updateRow(index, { customizableTemplateId: v === "" ? null : v })
            }
            dirty={isFieldDirty(index, "customizableTemplateId")}
            options={[
              { value: "", label: "Sin personalización" },
              ...customizableTemplates.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
        </DragFillCell>
      </Td>

      {/* Categoría */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "categoryId")}
          onDragStart={() => handleDragStart("categoryId", index, row.categoryId ?? "")}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <CellSelect
            value={row.categoryId ?? ""}
            onChange={(v) => updateRow(index, { categoryId: v === "" ? null : v })}
            dirty={isFieldDirty(index, "categoryId")}
            options={[
              { value: "", label: "Sin categoría" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </DragFillCell>
      </Td>

      {/* Acciones */}
      <Td className="text-right pr-4">
        <div className="flex items-center justify-end gap-1">
          {rowDirty && (
            <button
              onClick={() => handleResetRow(index)}
              className="p-1.5 hover:bg-slate-100 rounded text-muted-foreground hover:text-foreground"
              title="Descartar cambios de esta fila"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          )}
          <Link
            href={`/admin/productos/${row.id}`}
            className="p-1.5 hover:bg-slate-100 rounded text-muted-foreground hover:text-foreground"
            title="Abrir editor completo"
            target="_blank"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </Td>
    </tr>
  );
}

interface RenderVariantRowProps extends RenderRowDeps {
  row: VariantRow;
}

function renderVariantRow({
  row,
  index,
  rowDirty,
  isFieldDirty,
  isCellInDragRange,
  handleDragStart,
  handleDragEnter,
  handleDragEnd,
  updateRow,
  handleResetRow,
}: RenderVariantRowProps) {
  return (
    <tr key={`variant:${row.id}`} className="group/row bg-slate-50/30">
      {/* Producto / Variante */}
      <td
        className={`sticky left-0 z-[5] border-r p-2 pl-8 ${
          rowDirty ? "bg-amber-50" : "bg-slate-50"
        } group-hover/row:bg-slate-100`}
      >
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-slate-100 border">
            {row.image ? (
              <Image src={row.image} alt={row.optionsLabel} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                —
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-700 truncate">
              {row.optionsLabel || "Variante"}
            </p>
            <p className="text-[11px] text-muted-foreground">de {row.productName}</p>
          </div>
        </div>
      </td>

      {/* Estado / Destacado: no aplican a variante */}
      <Td>
        <DisabledCell>—</DisabledCell>
      </Td>
      <Td>
        <DisabledCell>—</DisabledCell>
      </Td>

      {/* SKU */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "sku")}
          onDragStart={() => handleDragStart("sku", index, row.sku ?? "")}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <input
            type="text"
            value={row.sku ?? ""}
            onChange={(e) => updateRow(index, { sku: e.target.value || null })}
            placeholder="—"
            className={cellInputClass(isFieldDirty(index, "sku"))}
          />
        </DragFillCell>
      </Td>

      {/* Precio */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "price")}
          onDragStart={() => handleDragStart("price", index, String(row.price))}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <input
            type="number"
            step="0.01"
            min="0"
            value={row.price}
            onChange={(e) => updateRow(index, { price: parseFloat(e.target.value) || 0 })}
            className={cellInputClass(isFieldDirty(index, "price"))}
          />
        </DragFillCell>
      </Td>

      {/* Precio anterior */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "compareAtPrice")}
          onDragStart={() =>
            handleDragStart(
              "compareAtPrice",
              index,
              row.compareAtPrice == null ? "" : String(row.compareAtPrice)
            )
          }
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <input
            type="number"
            step="0.01"
            min="0"
            value={row.compareAtPrice ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              updateRow(index, {
                compareAtPrice: val === "" ? null : parseFloat(val) || 0,
              });
            }}
            placeholder="—"
            className={cellInputClass(isFieldDirty(index, "compareAtPrice"))}
          />
        </DragFillCell>
      </Td>

      {/* Stock */}
      <Td>
        <DragFillCell
          inDragRange={isCellInDragRange(index, "stock")}
          onDragStart={() => handleDragStart("stock", index, String(row.stock))}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
        >
          <input
            type="number"
            step="1"
            min="0"
            value={row.stock}
            onChange={(e) => updateRow(index, { stock: parseInt(e.target.value, 10) || 0 })}
            className={cellInputClass(isFieldDirty(index, "stock"))}
          />
        </DragFillCell>
      </Td>

      {/* Plantilla / Guía / Personalización / Categoría: no aplican a variante */}
      <Td>
        <DisabledCell>—</DisabledCell>
      </Td>
      <Td>
        <DisabledCell>—</DisabledCell>
      </Td>
      <Td>
        <DisabledCell>—</DisabledCell>
      </Td>
      <Td>
        <DisabledCell>—</DisabledCell>
      </Td>

      {/* Acciones */}
      <Td className="text-right pr-4">
        <div className="flex items-center justify-end gap-1">
          {rowDirty && (
            <button
              onClick={() => handleResetRow(index)}
              className="p-1.5 hover:bg-slate-100 rounded text-muted-foreground hover:text-foreground"
              title="Descartar cambios de esta fila"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </Td>
    </tr>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase tracking-wide ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-2 align-middle ${className}`}>{children}</td>;
}

function cellInputClass(dirty: boolean): string {
  return `w-full h-9 px-2 rounded border bg-white text-sm outline-none focus:ring-2 focus:ring-blue-400 ${
    dirty ? "border-amber-400 bg-amber-50" : "border-slate-200"
  }`;
}

interface CellSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  dirty: boolean;
}

function CellSelect({ value, onChange, options, dirty }: CellSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-9 px-2 rounded border bg-white text-sm outline-none focus:ring-2 focus:ring-blue-400 ${
        dirty ? "border-amber-400 bg-amber-50" : "border-slate-200"
      }`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function DisabledCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-9 px-2 flex items-center text-xs text-muted-foreground bg-slate-50 border border-dashed border-slate-200 rounded">
      {children}
    </div>
  );
}

interface DragFillCellProps {
  inDragRange: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

function DragFillCell({
  inDragRange,
  onDragStart,
  onDragEnter,
  onDragEnd,
  children,
}: DragFillCellProps) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      className={`flex items-center gap-1 group rounded ${inDragRange ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}
    >
      <div className="flex-1 min-w-0">{children}</div>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded shrink-0"
        title="Arrastra para rellenar las filas siguientes"
      >
        <GripVertical className="h-3.5 w-3.5 text-slate-500" />
      </div>
    </div>
  );
}
