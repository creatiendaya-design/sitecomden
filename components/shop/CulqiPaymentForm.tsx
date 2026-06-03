"use client";

import { useState, useEffect, useCallback } from "react";
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
  amount: _amount,
  email,
  orderId: _orderId,
  onSuccess,
  onError,
}: CulqiPaymentFormProps) {
  const [processing, setProcessing] = useState(false);
  const [tokenGenerated, setTokenGenerated] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [formData, setFormData] = useState({
    cardNumber: "",
    cvv: "",
    expirationDate: "",  // Formato: MM/AA
    email: email,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadPublicKey = useCallback(async () => {
    try {
      setLoadingKey(true);
      const response = await fetch('/api/culqi/public-key');
      const data = await response.json();
      
      if (data.success && data.publicKey) {
        setPublicKey(data.publicKey);
      } else {
        onError('Error al cargar la configuración de pagos');
      }
    } catch (error) {
      console.error('Error loading Culqi public key:', error);
      onError('Error al cargar la configuración de pagos');
    } finally {
      setLoadingKey(false);
    }
  }, [onError]);

  // Cargar la clave pública al montar el componente
  useEffect(() => {
    loadPublicKey();
  }, [loadPublicKey]);

  // Validaciones
  const validateCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    return /^\d{13,19}$/.test(cleaned);
  };

  const validateCVV = (cvv: string) => {
    return /^\d{3,4}$/.test(cvv);
  };

  const validateExpirationDate = (date: string) => {
    // Formato: MM/AA
    if (!/^\d{2}\/\d{2}$/.test(date)) return false;
    
    const [month, year] = date.split('/');
    const m = parseInt(month);
    const currentYear = new Date().getFullYear() % 100;
    const y = parseInt(year);
    
    return m >= 1 && m <= 12 && y >= currentYear && y <= currentYear + 20;
  };

  // Formatear número de tarjeta
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  // Formatear fecha de expiración MM/AA
  const formatExpirationDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;

    if (field === 'cardNumber') {
      formattedValue = value.replace(/\D/g, '').slice(0, 19);
      formattedValue = formatCardNumber(formattedValue);
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    } else if (field === 'expirationDate') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
      formattedValue = formatExpirationDate(formattedValue);
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

    if (!validateExpirationDate(formData.expirationDate)) {
      newErrors.expirationDate = 'Fecha inválida (MM/AA)';
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
      // Extraer mes y año del campo combinado
      const [month, year] = formData.expirationDate.split('/');
      
      // Convertir año de 2 dígitos a 4 dígitos (28 → 2028)
      const fullYear = `20${year}`;
      
      // Asegurar que el mes tenga 2 dígitos (9 → 09)
      const paddedMonth = month.padStart(2, '0');
      
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
          expiration_month: paddedMonth,
          expiration_year: fullYear,
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
    } catch (error) {
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
      formData.expirationDate.length === 5 &&
      formData.email
    ) {
      generateToken();
    }
  };

  if (loadingKey) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Cargando configuración de pagos...
        </span>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error: El sistema de pagos no está configurado correctamente. 
          Contacta al administrador.
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
        <Label htmlFor="cardNumber" className="mb-2">Número de Tarjeta *</Label>
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

      {/* Fecha de Expiración y CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expirationDate" className="mb-2">Fecha de Expiración *</Label>
          <Input
            id="expirationDate"
            type="text"
            placeholder="MM/AA"
            maxLength={5}
            value={formData.expirationDate}
            onChange={(e) => handleInputChange('expirationDate', e.target.value)}
            onBlur={handleBlur}
            disabled={processing || tokenGenerated}
            className={errors.expirationDate ? 'border-red-500' : ''}
          />
          {errors.expirationDate && (
            <p className="text-xs text-red-500 mt-1">{errors.expirationDate}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Ejemplo: 12/28</p>
        </div>

        <div>
          <Label htmlFor="cvv" className="mb-2">CVV *</Label>
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
          <p className="text-xs text-muted-foreground mt-1">3-4 dígitos</p>
        </div>
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email" className="mb-2">Correo Electrónico *</Label>
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

    
    </div>
  );
}