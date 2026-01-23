"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Lock } from "lucide-react";
import Script from "next/script";

// Declaración global de Culqi
declare global {
  interface Window {
    Culqi: any;
    culqiResponseHandler?: (response: any) => void;
  }
}

interface CulqiPaymentFormProps {
  amount: number;
  email: string;
  orderId: string;
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
}

export default function CulqiPaymentForm({
  amount,
  email,
  orderId,
  onSuccess,
  onError,
}: CulqiPaymentFormProps) {
  const [culqiLoaded, setCulqiLoaded] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: "",
    cvv: "",
    expirationMonth: "",
    expirationYear: "",
    email: email,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

  // Configurar Culqi cuando se carga el script
  useEffect(() => {
    if (window.Culqi && publicKey) {
      window.Culqi.publicKey = publicKey;
      
      // Configurar settings
      window.Culqi.settings({
        title: "Pago Seguro",
        currency: "PEN",
        amount: Math.round(amount * 100), // Convertir a centavos
      });

      setCulqiLoaded(true);
      console.log("✅ Culqi configurado correctamente");
    }
  }, [publicKey, amount]);

  // Configurar el response handler
  useEffect(() => {
    if (culqiLoaded) {
      window.culqiResponseHandler = function (response: any) {
        console.log("📥 Respuesta de Culqi:", response);

        if (response.object === "token") {
          console.log("✅ Token generado:", response.id);
          onSuccess(response.id);
        } else if (response.object === "error") {
          console.error("❌ Error de Culqi:", response);
          onError(response.user_message || "Error al procesar la tarjeta");
        }
      };
    }

    return () => {
      if (window.culqiResponseHandler) {
        delete window.culqiResponseHandler;
      }
    };
  }, [culqiLoaded, onSuccess, onError]);

  const handleCulqiLoad = () => {
    console.log("📦 Script de Culqi cargado");
  };

  // Validaciones
  const validateCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, "");
    return /^\d{13,19}$/.test(cleaned);
  };

  const validateCVV = (cvv: string) => {
    return /^\d{3,4}$/.test(cvv);
  };

  const validateMonth = (month: string) => {
    const m = parseInt(month);
    return m >= 1 && m <= 12;
  };

  const validateYear = (year: string) => {
    const currentYear = new Date().getFullYear() % 100;
    const y = parseInt(year);
    return y >= currentYear && y <= currentYear + 20;
  };

  // Formatear número de tarjeta con espacios
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  // Manejar cambios en inputs
  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;

    if (field === "cardNumber") {
      formattedValue = value.replace(/\D/g, "").slice(0, 19);
      formattedValue = formatCardNumber(formattedValue);
    } else if (field === "cvv") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    } else if (field === "expirationMonth") {
      formattedValue = value.replace(/\D/g, "").slice(0, 2);
    } else if (field === "expirationYear") {
      formattedValue = value.replace(/\D/g, "").slice(0, 2);
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));
    
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validar formulario completo
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validateCardNumber(formData.cardNumber)) {
      newErrors.cardNumber = "Número de tarjeta inválido";
    }

    if (!validateCVV(formData.cvv)) {
      newErrors.cvv = "CVV inválido";
    }

    if (!validateMonth(formData.expirationMonth)) {
      newErrors.expirationMonth = "Mes inválido (01-12)";
    }

    if (!validateYear(formData.expirationYear)) {
      newErrors.expirationYear = "Año inválido";
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar generación de token cuando el formulario está completo
  const handleGenerateToken = () => {
    if (!culqiLoaded || !window.Culqi) {
      onError("Culqi no está cargado. Por favor recarga la página.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    console.log("📤 Generando token con Culqi...");

    try {
      // Asignar valores al objeto Culqi
      window.Culqi.token = {
        email: formData.email,
        card_number: formData.cardNumber.replace(/\s/g, ""),
        cvv: formData.cvv,
        expiration_month: formData.expirationMonth,
        expiration_year: formData.expirationYear,
      };

      // Crear el token
      window.Culqi.createToken();
    } catch (error) {
      console.error("❌ Error al crear token:", error);
      onError("Error al procesar los datos de la tarjeta");
    }
  };

  // Generar token automáticamente cuando todos los campos estén llenos
  useEffect(() => {
    if (
      formData.cardNumber.replace(/\s/g, "").length >= 13 &&
      formData.cvv.length >= 3 &&
      formData.expirationMonth.length === 2 &&
      formData.expirationYear.length === 2 &&
      formData.email
    ) {
      // Pequeño delay para dar tiempo al usuario
      const timer = setTimeout(() => {
        handleGenerateToken();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData]);

  if (!publicKey) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error de configuración: La clave pública de Culqi no está configurada.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Cargar script de Culqi */}
      <Script
        src="https://checkout.culqi.com/js/v4"
        onLoad={handleCulqiLoad}
        strategy="afterInteractive"
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span>Ingresa los datos de tu tarjeta</span>
        </div>

        {/* Número de Tarjeta */}
        <div>
          <Label htmlFor="cardNumber">Número de Tarjeta *</Label>
          <Input
            id="cardNumber"
            type="text"
            placeholder="1234 5678 9012 3456"
            value={formData.cardNumber}
            onChange={(e) => handleInputChange("cardNumber", e.target.value)}
            className={errors.cardNumber ? "border-red-500" : ""}
            data-culqi="card[number]"
          />
          {errors.cardNumber && (
            <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className={errors.email ? "border-red-500" : ""}
            data-culqi="card[email]"
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Fecha de Expiración y CVV */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="expirationMonth">Mes *</Label>
            <Input
              id="expirationMonth"
              type="text"
              placeholder="MM"
              maxLength={2}
              value={formData.expirationMonth}
              onChange={(e) => handleInputChange("expirationMonth", e.target.value)}
              className={errors.expirationMonth ? "border-red-500" : ""}
              data-culqi="card[exp_month]"
            />
            {errors.expirationMonth && (
              <p className="text-sm text-red-500 mt-1">{errors.expirationMonth}</p>
            )}
          </div>

          <div>
            <Label htmlFor="expirationYear">Año *</Label>
            <Input
              id="expirationYear"
              type="text"
              placeholder="AA"
              maxLength={2}
              value={formData.expirationYear}
              onChange={(e) => handleInputChange("expirationYear", e.target.value)}
              className={errors.expirationYear ? "border-red-500" : ""}
              data-culqi="card[exp_year]"
            />
            {errors.expirationYear && (
              <p className="text-sm text-red-500 mt-1">{errors.expirationYear}</p>
            )}
          </div>

          <div>
            <Label htmlFor="cvv">CVV *</Label>
            <Input
              id="cvv"
              type="text"
              placeholder="123"
              maxLength={4}
              value={formData.cvv}
              onChange={(e) => handleInputChange("cvv", e.target.value)}
              className={errors.cvv ? "border-red-500" : ""}
              data-culqi="card[cvv]"
            />
            {errors.cvv && (
              <p className="text-sm text-red-500 mt-1">{errors.cvv}</p>
            )}
          </div>
        </div>

        {/* Información de Seguridad */}
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Tu información está protegida con encriptación SSL. No almacenamos los datos de tu tarjeta.
          </AlertDescription>
        </Alert>

        {!culqiLoaded && (
          <p className="text-sm text-muted-foreground text-center">
            Cargando módulo de pagos seguros...
          </p>
        )}

        {/* Tarjetas de Prueba */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            🧪 Tarjetas de Prueba (Modo Test)
          </p>
          <div className="space-y-2 text-xs text-blue-800">
            <div>
              <strong>✅ Pago Exitoso:</strong>
              <div className="font-mono bg-white p-2 rounded mt-1">
                4111 1111 1111 1111<br />
                CVV: 123 | Fecha: 12/25
              </div>
            </div>
            <div className="mt-2">
              <strong>❌ Pago Rechazado:</strong>
              <div className="font-mono bg-white p-2 rounded mt-1">
                4000 0000 0000 0002<br />
                CVV: 123 | Fecha: 12/25
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}