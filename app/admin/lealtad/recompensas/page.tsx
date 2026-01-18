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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Recompensas</h1>
          <p className="text-muted-foreground">
            {rewards.length} recompensas ({activeRewards.length} activas)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/lealtad">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/lealtad/recompensas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Recompensa
            </Link>
          </Button>
        </div>
      </div>

      {/* Recompensas Activas */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recompensas Activas</h2>
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Cargando...</p>
            </CardContent>
          </Card>
        ) : activeRewards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <p className="text-muted-foreground">No hay recompensas activas</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recompensas Inactivas */}
      {inactiveRewards.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recompensas Inactivas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      <CardHeader>
        <div className="flex items-start justify-between">
          <RewardIcon type={reward.rewardType} />
          <Badge variant={reward.active ? "default" : "secondary"}>
            {reward.active ? "Activa" : "Inactiva"}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-3">{reward.name}</CardTitle>
        <CardDescription>{reward.description || "Sin descripción"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Costo</span>
          <span className="text-xl font-bold text-primary">
            {reward.pointsCost} pts
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Valor</span>
          <span className="font-semibold">
            {getRewardValueDisplay(reward)}
          </span>
        </div>

        {reward.minPurchase && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Compra mínima</span>
            <span className="font-semibold">S/. {reward.minPurchase}</span>
          </div>
        )}

        {reward.maxUses && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Disponibles</span>
            <span className="font-semibold">
              {reward.maxUses - reward.usageCount} / {reward.maxUses}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Canjeados</span>
          <Badge variant="outline">{reward.usageCount}</Badge>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleStatus}
          >
            {reward.active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
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