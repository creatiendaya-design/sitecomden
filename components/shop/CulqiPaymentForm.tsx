"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Lock, Loader2 } from "lucide-react";

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
  const [processing, setProcessing] = useState(false);
  const [tokenGenerated, setTokenGenerated] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: "",
    cvv: "",
    expirationMonth: "",
    expirationYear: "",
    email: email,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

  // Validaciones
  const validateCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
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

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;

    if (field === 'cardNumber') {
      formattedValue = value.replace(/\D/g, '').slice(0, 19);
      formattedValue = formatCardNumber(formattedValue);
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    } else if (field === 'expirationMonth') {
      formattedValue = value.replace(/\D/g, '').slice(0, 2);
    } else if (field === 'expirationYear') {
      formattedValue = value.replace(/\D/g, '').slice(0, 2);
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));
    
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    setTokenGenerated(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validateCardNumber(formData.cardNumber)) {
      newErrors.cardNumber = 'Número de tarjeta inválido';
    }

    if (!validateCVV(formData.cvv)) {
      newErrors.cvv = 'CVV inválido (3-4 dígitos)';
    }

    if (!validateMonth(formData.expirationMonth)) {
      newErrors.expirationMonth = 'Mes inválido (01-12)';
    }

    if (!validateYear(formData.expirationYear)) {
      newErrors.expirationYear = 'Año inválido';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generar token llamando directamente a la API de Culqi
  const generateToken = async () => {
    if (!publicKey) {
      onError('Configuración incorrecta del sistema de pagos');
      return;
    }

    if (tokenGenerated) {
      return;
    }

    if (!validateForm()) {
      onError('Por favor completa correctamente todos los campos');
      return;
    }

    setProcessing(true);
    console.log('📤 Generando token con API de Culqi...');

    try {
      // Convertir año de 2 dígitos a 4 dígitos (28 → 2028)
      const fullYear = `20${formData.expirationYear}`;
      
      // Asegurar que el mes tenga 2 dígitos (9 → 09)
      const paddedMonth = formData.expirationMonth.padStart(2, '0');
      
      console.log('📤 Enviando a Culqi:', {
        card_number: `****${formData.cardNumber.slice(-4)}`,
        cvv: '***',
        expiration_month: paddedMonth,
        expiration_year: fullYear,
        email: formData.email
      });
      
      const response = await fetch('https://api.culqi.com/v2/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicKey}`,
        },
        body: JSON.stringify({
          card_number: formData.cardNumber.replace(/\s/g, ''),
          cvv: formData.cvv,
          expiration_month: paddedMonth,  // ← Con padding: "09" no "9"
          expiration_year: fullYear,      // ← 4 dígitos: "2028" no "28"
          email: formData.email,
        }),
      });

      const data = await response.json();

      console.log('📥 Respuesta de Culqi:', data);

      if (data.object === 'token') {
        console.log('✅ Token generado:', data.id);
        setTokenGenerated(true);
        setProcessing(false);
        onSuccess(data.id);
      } else if (data.object === 'error') {
        console.error('❌ Error de Culqi:', data);
        setProcessing(false);
        const errorMessage = data.user_message || data.merchant_message || 'Error al procesar la tarjeta';
        onError(errorMessage);
      } else {
        console.error('❌ Respuesta inesperada:', data);
        setProcessing(false);
        onError('Error inesperado al procesar la tarjeta');
      }
    } catch (error: any) {
      console.error('❌ Error de red:', error);
      setProcessing(false);
      onError('Error de conexión. Por favor intenta nuevamente.');
    }
  };

  // Auto-generar token cuando el formulario esté completo
  const handleBlur = () => {
    if (
      !tokenGenerated &&
      !processing &&
      formData.cardNumber.replace(/\s/g, '').length >= 13 &&
      formData.cvv.length >= 3 &&
      formData.expirationMonth.length === 2 &&
      formData.expirationYear.length === 2 &&
      formData.email
    ) {
      generateToken();
    }
  };

  if (!publicKey) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error: NEXT_PUBLIC_CULQI_PUBLIC_KEY no configurada
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        <span>Ingresa los datos de tu tarjeta</span>
        {processing && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
      </div>

      {/* Número de Tarjeta */}
      <div>
        <Label htmlFor="cardNumber">Número de Tarjeta *</Label>
        <Input
          id="cardNumber"
          type="text"
          placeholder="4111 1111 1111 1111"
          value={formData.cardNumber}
          onChange={(e) => handleInputChange('cardNumber', e.target.value)}
          onBlur={handleBlur}
          disabled={processing || tokenGenerated}
          className={errors.cardNumber ? 'border-red-500' : ''}
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
          onChange={(e) => handleInputChange('email', e.target.value)}
          disabled={processing || tokenGenerated}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email}</p>
        )}
      </div>

      {/* Fecha y CVV */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="expirationMonth">Mes *</Label>
          <Input
            id="expirationMonth"
            type="text"
            placeholder="MM"
            maxLength={2}
            value={formData.expirationMonth}
            onChange={(e) => handleInputChange('expirationMonth', e.target.value)}
            onBlur={handleBlur}
            disabled={processing || tokenGenerated}
            className={errors.expirationMonth ? 'border-red-500' : ''}
          />
          {errors.expirationMonth && (
            <p className="text-xs text-red-500 mt-1">{errors.expirationMonth}</p>
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
            onChange={(e) => handleInputChange('expirationYear', e.target.value)}
            onBlur={handleBlur}
            disabled={processing || tokenGenerated}
            className={errors.expirationYear ? 'border-red-500' : ''}
          />
          {errors.expirationYear && (
            <p className="text-xs text-red-500 mt-1">{errors.expirationYear}</p>
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
            onChange={(e) => handleInputChange('cvv', e.target.value)}
            onBlur={handleBlur}
            disabled={processing || tokenGenerated}
            className={errors.cvv ? 'border-red-500' : ''}
          />
          {errors.cvv && (
            <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>
          )}
        </div>
      </div>

      {/* Status */}
      {processing && (
        <Alert className="border-blue-500 bg-blue-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="text-blue-700 text-sm">
            Validando tarjeta...
          </AlertDescription>
        </Alert>
      )}

      {tokenGenerated && (
        <Alert className="border-green-500 bg-green-50">
          <AlertDescription className="text-green-700 text-sm">
            ✅ Tarjeta validada correctamente
          </AlertDescription>
        </Alert>
      )}

      {/* Seguridad */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Pago 100% seguro. No almacenamos datos de tu tarjeta.
        </AlertDescription>
      </Alert>

      {/* Tarjetas de Prueba */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm font-semibold text-blue-900 mb-2">
          🧪 Tarjetas de Prueba
        </p>
        <div className="space-y-2 text-xs text-blue-800">
          <div>
            <strong>✅ Pago Exitoso:</strong>
            <div className="font-mono bg-white p-2 rounded mt-1">
              4111 1111 1111 1111<br />
              CVV: 123<br />
              Mes: 12 (Diciembre)<br />
              Año: 28 (2028)
            </div>
          </div>
          <div className="mt-2">
            <strong>❌ Pago Rechazado:</strong>
            <div className="font-mono bg-white p-2 rounded mt-1">
              4000 0000 0000 0002<br />
              CVV: 123<br />
              Mes: 12 (Diciembre)<br />
              Año: 28 (2028)
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-2 italic">
            * Ingresa solo 2 dígitos para el año (28 = 2028)
          </p>
        </div>
      </div>
    </div>
  );
}