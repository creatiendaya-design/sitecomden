"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Tag,
  Truck,
  Percent,
  ChevronLeft,
  Check,
  X,
} from "lucide-react";
import { 
  getAvailableRewards, 
  createReward, 
  updateReward, 
  deleteReward 
} from "@/actions/loyalty";
import { toast } from "sonner";

type RewardType = "DISCOUNT" | "PERCENTAGE" | "FREE_SHIPPING" | "PRODUCT";

export default function RecompensasAdminPage() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    pointsCost: "",
    rewardType: "DISCOUNT" as RewardType,
    rewardValue: "",
    minPurchase: "",
    maxUses: "",
    active: true,
  });

  useEffect(() => {
    loadRewards();
  }, []);

  async function loadRewards() {
    setLoading(true);
    try {
      const data = await getAvailableRewards();
      setRewards(data);
    } catch (error) {
      console.error("Error cargando recompensas:", error);
      toast.error("Error cargando recompensas");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      image: "",
      pointsCost: "",
      rewardType: "DISCOUNT",
      rewardValue: "",
      minPurchase: "",
      maxUses: "",
      active: true,
    });
  }

  async function handleCreate() {
    if (!formData.name || !formData.pointsCost || !formData.rewardValue) {
      toast.error("Completa los campos requeridos");
      return;
    }

    try {
      const result = await createReward({
        name: formData.name,
        description: formData.description || undefined,
        image: formData.image || undefined,
        pointsCost: parseInt(formData.pointsCost),
        rewardType: formData.rewardType,
        rewardValue: parseFloat(formData.rewardValue),
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
      });

      if (result.success) {
        toast.success("Recompensa creada exitosamente");
        setShowCreateModal(false);
        resetForm();
        loadRewards();
      } else {
        toast.error(result.error || "Error al crear recompensa");
      }
    } catch (error) {
      console.error("Error creando recompensa:", error);
      toast.error("Error al crear recompensa");
    }
  }

  async function handleUpdate() {
    if (!editingReward) return;

    try {
      const result = await updateReward(editingReward.id, {
        name: formData.name,
        description: formData.description || undefined,
        image: formData.image || undefined,
        pointsCost: parseInt(formData.pointsCost),
        rewardType: formData.rewardType,
        rewardValue: parseFloat(formData.rewardValue),
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        active: formData.active,
      });

      if (result.success) {
        toast.success("Recompensa actualizada");
        setShowEditModal(false);
        setEditingReward(null);
        resetForm();
        loadRewards();
      } else {
        toast.error(result.error || "Error al actualizar");
      }
    } catch (error) {
      console.error("Error actualizando:", error);
      toast.error("Error al actualizar recompensa");
    }
  }

  async function handleDelete(rewardId: string) {
    if (!confirm("¿Estás seguro de eliminar esta recompensa?")) return;

    try {
      const result = await deleteReward(rewardId);
      
      if (result.success) {
        toast.success("Recompensa eliminada");
        loadRewards();
      } else {
        toast.error(result.error || "Error al eliminar");
      }
    } catch (error) {
      console.error("Error eliminando:", error);
      toast.error("Error al eliminar recompensa");
    }
  }

  function openEditModal(reward: any) {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || "",
      image: reward.image || "",
      pointsCost: reward.pointsCost.toString(),
      rewardType: reward.rewardType,
      rewardValue: reward.rewardValue.toString(),
      minPurchase: reward.minPurchase?.toString() || "",
      maxUses: reward.maxUses?.toString() || "",
      active: reward.active,
    });
    setShowEditModal(true);
  }

  async function toggleRewardStatus(rewardId: string, currentStatus: boolean) {
    try {
      const result = await updateReward(rewardId, { active: !currentStatus });
      
      if (result.success) {
        toast.success(`Recompensa ${!currentStatus ? "activada" : "desactivada"}`);
        loadRewards();
      }
    } catch (error) {
      console.error("Error cambiando estado:", error);
      toast.error("Error al cambiar estado");
    }
  }

  const activeRewards = rewards.filter((r) => r.active);
  const inactiveRewards = rewards.filter((r) => !r.active);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Recompensas</h1>
          <p className="text-xs sm:text-base text-muted-foreground tabular-nums">
            {rewards.length} recompensas · {activeRewards.length} activas
          </p>
        </div>
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <Button variant="outline" asChild size="icon" className="h-9 w-9 sm:hidden">
            <Link href="/admin/lealtad" aria-label="Volver">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="hidden sm:inline-flex">
            <Link href="/admin/lealtad">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/admin/lealtad/recompensas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Recompensa
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile primary CTA */}
      <Button asChild className="sm:hidden w-full">
        <Link href="/admin/lealtad/recompensas/nueva">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Recompensa
        </Link>
      </Button>

      {/* Recompensas Activas */}
      <div className="space-y-3">
        <h2 className="text-base sm:text-xl font-semibold">Recompensas Activas</h2>
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </CardContent>
          </Card>
        ) : activeRewards.length > 0 ? (
          <div className="grid gap-2 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {activeRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                onEdit={() => openEditModal(reward)}
                onDelete={() => handleDelete(reward.id)}
                onToggleStatus={() => toggleRewardStatus(reward.id, reward.active)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No hay recompensas activas</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recompensas Inactivas */}
      {inactiveRewards.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base sm:text-xl font-semibold">Recompensas Inactivas</h2>
          <div className="grid gap-2 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {inactiveRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                onEdit={() => openEditModal(reward)}
                onDelete={() => handleDelete(reward.id)}
                onToggleStatus={() => toggleRewardStatus(reward.id, reward.active)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal: Crear Recompensa */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Recompensa</DialogTitle>
            <DialogDescription>
              Define los detalles de la recompensa que los clientes podrán canjear
            </DialogDescription>
          </DialogHeader>
          <RewardForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Crear Recompensa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Recompensa */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Recompensa</DialogTitle>
            <DialogDescription>
              Actualiza los detalles de la recompensa
            </DialogDescription>
          </DialogHeader>
          <RewardForm formData={formData} setFormData={setFormData} isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditModal(false);
              setEditingReward(null);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>Actualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente: Tarjeta de Recompensa
function RewardCard({ 
  reward, 
  onEdit, 
  onDelete, 
  onToggleStatus 
}: { 
  reward: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <Card className={!reward.active ? "opacity-60" : ""}>
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <RewardIcon type={reward.rewardType} />
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-lg leading-tight truncate">
                {reward.name}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm line-clamp-1">
                {reward.description || "Sin descripción"}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={reward.active ? "default" : "secondary"}
            className="text-[10px] sm:text-xs h-5 px-1.5 shrink-0"
          >
            {reward.active ? "Activa" : "Inactiva"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 sm:px-6 sm:pb-6 space-y-2 sm:space-y-3">
        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
          <div className="rounded-md bg-muted/40 px-2 py-1.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Costo</p>
            <p className="text-sm sm:text-lg font-bold text-primary tabular-nums">
              {reward.pointsCost} pts
            </p>
          </div>
          <div className="rounded-md bg-muted/40 px-2 py-1.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Valor</p>
            <p className="text-sm sm:text-base font-semibold tabular-nums truncate">
              {getRewardValueDisplay(reward)}
            </p>
          </div>
          {reward.minPurchase && (
            <div className="rounded-md bg-muted/40 px-2 py-1.5">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                <span className="hidden sm:inline">Compra mínima</span>
                <span className="sm:hidden">Mín. compra</span>
              </p>
              <p className="text-sm sm:text-base font-semibold tabular-nums">
                S/. {reward.minPurchase}
              </p>
            </div>
          )}
          {reward.maxUses && (
            <div className="rounded-md bg-muted/40 px-2 py-1.5">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Disponibles
              </p>
              <p className="text-sm sm:text-base font-semibold tabular-nums">
                {reward.maxUses - reward.usageCount}/{reward.maxUses}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t">
          <span className="text-[11px] sm:text-sm text-muted-foreground">
            Canjeados
          </span>
          <Badge variant="outline" className="text-[10px] sm:text-xs h-5 px-1.5 tabular-nums">
            {reward.usageCount}
          </Badge>
        </div>

        <div className="flex gap-1.5 sm:gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 sm:h-9"
            onClick={onEdit}
          >
            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Editar</span>
            <span className="sm:hidden ml-1.5 text-xs">Editar</span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onToggleStatus}
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            aria-label={reward.active ? "Desactivar" : "Activar"}
          >
            {reward.active ? <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onDelete}
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            aria-label="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente: Formulario de Recompensa
function RewardForm({ 
  formData, 
  setFormData,
  isEdit = false 
}: { 
  formData: any;
  setFormData: any;
  isEdit?: boolean;
}) {
  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          placeholder="Ej: S/. 10 de descuento"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Descripción de la recompensa"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pointsCost">Costo en Puntos *</Label>
          <Input
            id="pointsCost"
            type="number"
            placeholder="100"
            value={formData.pointsCost}
            onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="rewardType">Tipo de Recompensa *</Label>
          <Select
            value={formData.rewardType}
            onValueChange={(value) => setFormData({ ...formData, rewardType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DISCOUNT">💵 Descuento Fijo (S/.)</SelectItem>
              <SelectItem value="PERCENTAGE">📊 Descuento Porcentaje (%)</SelectItem>
              <SelectItem value="FREE_SHIPPING">🚚 Envío Gratis</SelectItem>
              <SelectItem value="PRODUCT">🎁 Producto Gratis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="rewardValue">
          Valor *
          {formData.rewardType === "PERCENTAGE" && " (%)"}
          {formData.rewardType === "DISCOUNT" && " (S/.)"}
        </Label>
        <Input
          id="rewardValue"
          type="number"
          step="0.01"
          placeholder={formData.rewardType === "PERCENTAGE" ? "10" : "50"}
          value={formData.rewardValue}
          onChange={(e) => setFormData({ ...formData, rewardValue: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {formData.rewardType === "FREE_SHIPPING" && "Deja en 0 para envío gratis"}
          {formData.rewardType === "DISCOUNT" && "Cantidad en soles a descontar"}
          {formData.rewardType === "PERCENTAGE" && "Porcentaje de descuento"}
          {formData.rewardType === "PRODUCT" && "ID del producto gratis"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minPurchase">Compra Mínima (S/.)</Label>
          <Input
            id="minPurchase"
            type="number"
            step="0.01"
            placeholder="0"
            value={formData.minPurchase}
            onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="maxUses">Usos Máximos</Label>
          <Input
            id="maxUses"
            type="number"
            placeholder="Ilimitado"
            value={formData.maxUses}
            onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="image">URL de Imagen (opcional)</Label>
        <Input
          id="image"
          placeholder="https://..."
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
        />
      </div>

      {isEdit && (
        <div className="flex items-center space-x-2">
          <Switch
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
          />
          <Label htmlFor="active">Recompensa activa</Label>
        </div>
      )}
    </div>
  );
}

// Utilidades
function RewardIcon({ type, size = 48 }: { type: string; size?: number }) {
  if (type === "FREE_SHIPPING") {
    return (
      <div className="p-3 bg-blue-100 rounded-lg">
        <Truck size={size} className="text-blue-600" />
      </div>
    );
  }
  if (type === "PERCENTAGE") {
    return (
      <div className="p-3 bg-green-100 rounded-lg">
        <Percent size={size} className="text-green-600" />
      </div>
    );
  }
  if (type === "DISCOUNT") {
    return (
      <div className="p-3 bg-purple-100 rounded-lg">
        <Tag size={size} className="text-purple-600" />
      </div>
    );
  }
  return (
    <div className="p-3 bg-orange-100 rounded-lg">
      <Gift size={size} className="text-orange-600" />
    </div>
  );
}

function getRewardValueDisplay(reward: any): string {
  if (reward.rewardType === "DISCOUNT") {
    return `S/. ${reward.rewardValue}`;
  }
  if (reward.rewardType === "PERCENTAGE") {
    return `${reward.rewardValue}%`;
  }
  if (reward.rewardType === "FREE_SHIPPING") {
    return "Envío gratis";
  }
  return "Producto gratis";
}