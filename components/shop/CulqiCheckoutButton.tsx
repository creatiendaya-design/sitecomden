// components/shop/CulqiCheckoutButton.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, Shield, Lock } from 'lucide-react';

declare global {
  interface Window {
    Culqi?: {
      publicKey: string;
      options: (opts: Record<string, unknown>) => void;
      settings: (opts: Record<string, unknown>) => void;
      open: () => void;
      close: () => void;
      token?: { id: string };
      error?: { user_message?: string; merchant_message?: string };
    };
    culqi?: () => void;
  }
}

interface CulqiCheckoutButtonProps {
  amount: number;
  email: string;
  customerName: string;
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
  siteName?: string;
  siteLogo?: string;
}

export default function CulqiCheckoutButton({ 
  amount, 
  email,
  customerName,
  onSuccess,
  onError,
  disabled = false,
  className = '',
  siteName = 'nuejoy',
  siteLogo = '/logo.png'
}: CulqiCheckoutButtonProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scriptLoadedRef = useRef(false);

  const resetProcessingState = useCallback(() => {
    setIsProcessing(false);
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (scriptLoadedRef.current) {
      return;
    }

    const existingScript = document.querySelector('script[src*="checkout.culqi.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.culqi.com/js/v4';
    script.async = true;
    
    script.onload = () => {
      if (typeof window === 'undefined' || !window.Culqi) {
        setLoadError('Error al cargar el sistema de pagos');
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
      
      if (!publicKey) {
        setLoadError('Error de configuración');
        return;
      }

      try {
        window.Culqi.publicKey = publicKey;

        const logoUrl = siteLogo.startsWith('http') 
          ? siteLogo 
          : `${window.location.origin}${siteLogo}`;

        window.Culqi.options({
          lang: 'auto',
          installments: false,
          paymentMethods: {
            tarjeta: true,
            yape: true,
            bancaMovil: true,
            agente: true,
            billetera: true,
            cuotealo: true
          },
          style: {
            logo: logoUrl,
            bannerColor: '#005de7',
            buttonBackground: '#050505', 
            menuColor: '#003441',
            linksColor: '#00cea1',
            buttonText: 'Pagar',
            buttonTextColor: '#FFFFFF',
            priceColor: '#000000'
          }
        });

        window.culqi = () => {
          resetProcessingState();

          const culqi = window.Culqi;
          if (!culqi) return;

          if (culqi.token) {
            const token = culqi.token.id;

            try {
              culqi.close();
            } catch (e) {
              console.warn('Error cerrando popup:', e);
            }

            onSuccess(token);

          } else if (culqi.error) {
            const error = culqi.error;

            try {
              culqi.close();
            } catch (e) {
              console.warn('Error cerrando popup:', e);
            }

            onError(error?.user_message || error?.merchant_message || 'Error al procesar el pago');
          }
        };
        
        scriptLoadedRef.current = true;
        setIsLoaded(true);
        
      } catch {
        setLoadError('Error al configurar el sistema de pagos');
      }
    };
    
    script.onerror = () => {
      setLoadError('Error al cargar el sistema de pagos');
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [onSuccess, onError, resetProcessingState, siteLogo, siteName]);

  const openCulqiCheckout = () => {
    if (!isLoaded || !window.Culqi) {
      onError('Sistema de pagos no disponible');
      return;
    }
    
    processingTimeoutRef.current = setTimeout(() => {
      resetProcessingState();
    }, 30000);
    
    setIsProcessing(true);
    
    try {
      window.Culqi.settings({
        title: siteName,
        currency: 'PEN',
        description: `Pago de ${customerName}`,
        amount: amount
      });
      
      window.Culqi.open();
      
    } catch {
      resetProcessingState();
      onError('Error al abrir el formulario de pago');
    }
  };

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-destructive/10 p-2">
            <CreditCard className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">
              {loadError}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Por favor recarga la página o contacta con soporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Botón principal de pago */}
      <Button
        type="button"
        onClick={openCulqiCheckout}
        disabled={disabled || !isLoaded || !email || isProcessing}
        className={`relative overflow-hidden group ${className}`}
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Abriendo ventana segura...
          </>
        ) : !isLoaded ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-5 w-5" />
            Pagar con Tarjeta
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500" />
          </>
        )}
      </Button>

      {/* Indicadores de seguridad */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5 text-green-600" />
        <span>Pago procesado de forma segura por Culqi</span>
      </div>

    

      {/* Botón de cancelar si está procesando */}
      {isProcessing && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetProcessingState}
          className="w-full text-xs"
        >
          Cancelar
        </Button>
      )}
    </div>
  );
}