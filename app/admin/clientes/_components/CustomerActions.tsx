"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Gift, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateCustomer, deleteCustomer } from "@/actions/customers";
import { adjustCustomerPoints } from "@/actions/loyalty";

interface CustomerAddress {
  line1?: string;
  line2?: string;
  reference?: string;
  department?: string;
  province?: string;
  district?: string;
  postalCode?: string;
}

export interface CustomerActionsData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dni: string | null;
  birthday: string | null; // ISO yyyy-mm-dd
  points: number;
  notes: string | null;
  tags: string[];
  address: CustomerAddress | null;
}

interface CustomerActionsProps {
  customer: CustomerActionsData;
  canEdit: boolean;
  canDelete: boolean;
  canManagePoints: boolean;
}

export function CustomerActions({
  customer,
  canEdit,
  canDelete,
  canManagePoints,
}: CustomerActionsProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form editar
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [dni, setDni] = useState(customer.dni ?? "");
  const [birthday, setBirthday] = useState(customer.birthday ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [tags, setTags] = useState((customer.tags ?? []).join(", "));
  const [addr, setAddr] = useState<CustomerAddress>(customer.address ?? {});

  // Ajustar puntos
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateCustomer(customer.id, {
        name,
        phone,
        dni,
        birthday,
        notes,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        address: addr,
      });
      if (result.success) {
        toast.success("Cliente actualizado");
        setShowEdit(false);
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar");
      }
    } catch {
      toast.error("Error al actualizar cliente");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjust() {
    const points = parseInt(adjustPoints, 10);
    if (isNaN(points) || points === 0) {
      toast.error("Ingresa un número válido distinto de cero");
      return;
    }
    setSaving(true);
    try {
      const result = await adjustCustomerPoints(
        customer.id,
        points,
        adjustReason || "Ajuste manual del administrador"
      );
      if (result.success) {
        toast.success(`Puntos ${points > 0 ? "agregados" : "deducidos"}`);
        setShowAdjust(false);
        setAdjustPoints("");
        setAdjustReason("");
        router.refresh();
      } else {
        toast.error(result.error || "Error al ajustar puntos");
      }
    } catch {
      toast.error("Error al ajustar puntos");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const result = await deleteCustomer(customer.id);
      if (result.success) {
        toast.success("Cliente eliminado");
        router.push("/admin/clientes");
      } else {
        toast.error(result.error || "Error al eliminar");
        setSaving(false);
      }
    } catch {
      toast.error("Error al eliminar cliente");
      setSaving(false);
    }
  }

  function setAddrField(key: keyof CustomerAddress, value: string) {
    setAddr((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canManagePoints && (
          <Button variant="outline" size="sm" onClick={() => setShowAdjust(true)}>
            <Gift className="mr-2 h-4 w-4" />
            Ajustar puntos
          </Button>
        )}
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>

      {/* Editar */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>{customer.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="c-name">Nombre</Label>
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-phone">Teléfono</Label>
                <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-dni">DNI</Label>
                <Input id="c-dni" value={dni} onChange={(e) => setDni(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-birthday">Cumpleaños</Label>
                <Input
                  id="c-birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="c-tags">Etiquetas (separadas por coma)</Label>
              <Input
                id="c-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="mayorista, VIP, recurrente"
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold">Dirección</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="a-line1">Dirección</Label>
                  <Input
                    id="a-line1"
                    value={addr.line1 ?? ""}
                    onChange={(e) => setAddrField("line1", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="a-dep">Departamento</Label>
                  <Input
                    id="a-dep"
                    value={addr.department ?? ""}
                    onChange={(e) => setAddrField("department", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="a-prov">Provincia</Label>
                  <Input
                    id="a-prov"
                    value={addr.province ?? ""}
                    onChange={(e) => setAddrField("province", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="a-dist">Distrito</Label>
                  <Input
                    id="a-dist"
                    value={addr.district ?? ""}
                    onChange={(e) => setAddrField("district", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="a-ref">Referencia</Label>
                  <Input
                    id="a-ref"
                    value={addr.reference ?? ""}
                    onChange={(e) => setAddrField("reference", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="c-notes">Notas internas</Label>
              <Textarea
                id="c-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas visibles solo para administradores"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ajustar puntos */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar puntos</DialogTitle>
            <DialogDescription>
              Agregar o quitar puntos manualmente · Saldo actual: {customer.points}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="adj-points">Puntos</Label>
              <Input
                id="adj-points"
                type="number"
                placeholder="Ej: 100 o -50"
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Positivo para agregar, negativo para quitar
              </p>
            </div>
            <div>
              <Label htmlFor="adj-reason">Motivo</Label>
              <Input
                id="adj-reason"
                placeholder="Ej: Compensación por error"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjust(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleAdjust} disabled={saving}>
              {saving ? "Aplicando…" : "Ajustar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente <strong>{customer.name}</strong> se ocultará del panel. Sus
              órdenes e historial se conservan. Esta acción se puede revertir desde la
              base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={saving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {saving ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
