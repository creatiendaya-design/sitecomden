"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Check,
  Share2,
  Users,
  Gift,
  TrendingUp,
  Facebook,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { getCustomerByEmail, getLoyaltySettings } from "@/actions/loyalty";
import { toast } from "sonner";

const CUSTOMER_EMAIL = "cliente@example.com";

export default function ReferidosPage() {
  const [customer, setCustomer] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const customerData = await getCustomerByEmail(CUSTOMER_EMAIL);
      const settingsData = await getLoyaltySettings();
      
      if (customerData) setCustomer(customerData);
      if (settingsData) setSettings(settingsData);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error cargando información");
    } finally {
      setLoading(false);
    }
  }

  function copyReferralCode() {
    if (!customer) return;
    
    navigator.clipboard.writeText(customer.referralCode);
    setCopied(true);
    toast.success("Código copiado al portapapeles");
    
    setTimeout(() => setCopied(false), 2000);
  }

  function shareReferralLink(platform: string) {
    if (!customer) return;
    
    const url = `${window.location.origin}/registro?ref=${customer.referralCode}`;
    const text = `¡Únete a ShopGood Perú con mi código de referido y obtén ${settings?.referredBonus} puntos de bienvenida! 🎁`;

    let shareUrl = "";
    
    if (platform === "whatsapp") {
      shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
    } else if (platform === "facebook") {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === "twitter") {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!customer || !settings) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se pudo cargar la información</p>
        </div>
      </div>
    );
  }

  const referralUrl = `${window.location.origin}/registro?ref=${customer.referralCode}`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Refiere y Gana</h1>
        <p className="text-muted-foreground">
          Comparte tu código y ambos ganan puntos 🎉
        </p>
      </div>

      {/* Beneficios del Programa */}
      <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3 text-center">
            <div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">1. Comparte</h3>
              <p className="text-sm text-muted-foreground">
                Envía tu código de referido a tus amigos
              </p>
            </div>
            <div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">2. Se registran</h3>
              <p className="text-sm text-muted-foreground">
                Tus amigos se registran con tu código
              </p>
            </div>
            <div>
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">3. Ambos ganan</h3>
              <p className="text-sm text-muted-foreground">
                ¡Tú ganas {settings.referralBonus} pts, ellos {settings.referredBonus} pts!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tu Código de Referido */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tu Código de Referido</CardTitle>
          <CardDescription>
            Comparte este código con tus amigos para que ganen puntos al registrarse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={customer.referralCode}
              readOnly
              className="font-mono text-xl text-center font-bold"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyReferralCode}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Link de referido:</p>
            <div className="flex gap-2">
              <Input
                value={referralUrl}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(referralUrl);
                  toast.success("Link copiado");
                }}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Botones para compartir */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Compartir en:</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => shareReferralLink("whatsapp")}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => shareReferralLink("facebook")}
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => shareReferralLink("twitter")}
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Amigos Referidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customer.referralCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Puntos Ganados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              +{customer.referralCount * settings.referralBonus}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Por Referido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {settings.referralBonus} pts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Referidos */}
      <Card>
        <CardHeader>
          <CardTitle>Tus Referidos</CardTitle>
          <CardDescription>
            Personas que se han registrado con tu código
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customer.referrals && customer.referrals.length > 0 ? (
            <div className="space-y-4">
              {customer.referrals.map((referral: any, index: number) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{referral.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {referral.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      +{settings.referralBonus} pts
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(referral.registeredAt).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Aún no has referido a nadie
              </p>
              <p className="text-sm text-muted-foreground">
                ¡Comparte tu código y empieza a ganar puntos!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips para Referir */}
      <Card className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="text-amber-600" />
            Tips para Maximizar tus Referidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>Comparte tu código en grupos de WhatsApp familiares y de amigos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>Publica tu código en tus redes sociales</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>Menciona los beneficios: {settings.referredBonus} puntos de bienvenida gratis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>Comparte productos específicos que te gustaron</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}