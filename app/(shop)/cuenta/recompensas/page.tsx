"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gift, 
  Tag, 
  Truck, 
  Sparkles, 
  Check,
  AlertCircle 
} from "lucide-react";
import { 
  getAvailableRewards, 
  redeemReward,
  getCustomerByEmail,
  getCustomerRedemptions 
} from "@/actions/loyalty";
import { toast } from "sonner";

const CUSTOMER_EMAIL = "cliente@example.com";

export default function RecompensasPage() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const customerData = await getCustomerByEmail(CUSTOMER_EMAIL);
      if (customerData) {
        setCustomer(customerData);
        const rewardsData = await getAvailableRewards(customerData.id);
        setRewards(rewardsData);
        const redemptionsData = await getCustomerRedemptions(customerData.id);
        setRedemptions(redemptionsData);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error cargando recompensas");
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    if (!selectedReward || !customer) return;

    setIsRedeeming(true);
    try {
      const result = await redeemReward(customer.id, selectedReward.id);
      
      if (result.success) {
        toast.success("¡Recompensa canjeada exitosamente!", {
          description: `Tu cupón es: ${result.couponCode}`,
          duration: 5000,
        });
        setSelectedReward(null);
        loadData(); // Recargar datos
      } else {
        toast.error(result.error || "Error al canjear recompensa");
      }
    } catch (error) {
      console.error("Error canjeando:", error);
      toast.error("Error al canjear recompensa");
    } finally {
      setIsRedeeming(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando recompensas...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se pudo cargar la información</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Recompensas</h1>
        <p className="text-muted-foreground">
          Canjea tus puntos por descuentos y beneficios
        </p>
      </div>

      {/* Puntos Disponibles */}
      <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Tus puntos disponibles
              </p>
              <p className="text-4xl font-bold flex items-center gap-2">
                <Sparkles className="text-yellow-500" size={32} />
                {customer.points.toLocaleString()} puntos
              </p>
            </div>
            <Button asChild>
              <a href="/cuenta">Ver mi cuenta</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="disponibles" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="disponibles">
            Disponibles ({rewards.length})
          </TabsTrigger>
          <TabsTrigger value="canjeadas">
            Mis canjes ({redemptions.length})
          </TabsTrigger>
        </TabsList>

        {/* Recompensas Disponibles */}
        <TabsContent value="disponibles" className="space-y-4">
          {rewards.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => (
                <Card
                  key={reward.id}
                  className={`relative ${
                    reward.canAfford
                      ? "border-2 border-primary"
                      : "opacity-60"
                  }`}
                >
                  {reward.canAfford && (
                    <Badge className="absolute top-4 right-4 bg-green-500">
                      Disponible
                    </Badge>
                  )}
                  
                  <CardHeader>
                    <div className="mb-4 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                      {reward.image ? (
                        <img
                          src={reward.image}
                          alt={reward.name}
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <RewardIcon type={reward.rewardType} size={64} />
                      )}
                    </div>
                    <CardTitle className="text-xl">{reward.name}</CardTitle>
                    <CardDescription>
                      {reward.description || getRewardDescription(reward)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Costo</span>
                      <span className="text-2xl font-bold text-primary">
                        {reward.pointsCost} pts
                      </span>
                    </div>

                    {reward.minPurchase && (
                      <p className="text-xs text-muted-foreground">
                        Compra mínima: S/. {reward.minPurchase}
                      </p>
                    )}

                    {reward.maxUses && (
                      <p className="text-xs text-muted-foreground">
                        Disponibles: {reward.maxUses - reward.usageCount}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      disabled={!reward.canAfford}
                      onClick={() => setSelectedReward(reward)}
                    >
                      {reward.canAfford ? "Canjear ahora" : "Puntos insuficientes"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hay recompensas disponibles en este momento
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recompensas Canjeadas */}
        <TabsContent value="canjeadas" className="space-y-4">
          {redemptions.length > 0 ? (
            <div className="space-y-4">
              {redemptions.map((redemption) => (
                <Card key={redemption.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {redemption.reward.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Canjeado el{" "}
                          {new Date(redemption.createdAt).toLocaleDateString("es-PE")}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={redemption.status === "PENDING" ? "default" : "secondary"}>
                            {getStatusText(redemption.status)}
                          </Badge>
                          {redemption.status === "PENDING" && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {redemption.couponCode}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">
                          -{redemption.pointsSpent} pts
                        </p>
                        {redemption.status === "PENDING" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expira:{" "}
                            {new Date(redemption.expiresAt).toLocaleDateString("es-PE")}
                          </p>
                        )}
                      </div>
                    </div>

                    {redemption.status === "PENDING" && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle size={16} className="text-blue-600" />
                          Usa el código en el checkout:
                        </p>
                        <p className="text-lg font-mono font-bold text-blue-600 mt-1">
                          {redemption.couponCode}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Check className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Aún no has canjeado ninguna recompensa
                </p>
                <Button className="mt-4" asChild>
                  <a href="#disponibles">Ver recompensas disponibles</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmación */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Canje</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas canjear esta recompensa?
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedReward.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Costo</span>
                <span className="text-xl font-bold text-primary">
                  {selectedReward.pointsCost} puntos
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Puntos restantes
                </span>
                <span className="text-lg font-semibold">
                  {customer.points - selectedReward.pointsCost} puntos
                </span>
              </div>

              {selectedReward.minPurchase && (
                <p className="text-sm text-muted-foreground">
                  * Compra mínima de S/. {selectedReward.minPurchase}
                </p>
              )}

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Importante:</strong> Recibirás un código de cupón que
                  podrás usar en tu próxima compra. El código expira en 30 días.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedReward(null)}
              disabled={isRedeeming}
            >
              Cancelar
            </Button>
            <Button onClick={handleRedeem} disabled={isRedeeming}>
              {isRedeeming ? "Canjeando..." : "Confirmar Canje"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componentes auxiliares
function RewardIcon({ type, size = 48 }: { type: string; size?: number }) {
  if (type === "FREE_SHIPPING") {
    return <Truck size={size} className="text-blue-500" />;
  }
  if (type === "PERCENTAGE" || type === "DISCOUNT") {
    return <Tag size={size} className="text-green-500" />;
  }
  return <Gift size={size} className="text-purple-500" />;
}

function getRewardDescription(reward: any): string {
  if (reward.rewardType === "DISCOUNT") {
    return `S/. ${reward.rewardValue} de descuento en tu compra`;
  }
  if (reward.rewardType === "PERCENTAGE") {
    return `${reward.rewardValue}% de descuento en tu compra`;
  }
  if (reward.rewardType === "FREE_SHIPPING") {
    return `Envío gratis en tu próximo pedido`;
  }
  return "Recompensa especial";
}

function getStatusText(status: string): string {
  const statuses: Record<string, string> = {
    PENDING: "Disponible",
    USED: "Usado",
    EXPIRED: "Expirado",
    CANCELLED: "Cancelado",
  };
  return statuses[status] || status;
}