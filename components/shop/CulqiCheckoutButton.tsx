// components/shop/CulqiCheckoutButton.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';

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
    console.log('🔄 Reseteando estado');
    setIsProcessing(false);
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, []);

  // ✅ CARGAR SCRIPT MANUALMENTE
  useEffect(() => {
    if (scriptLoadedRef.current) {
      console.log('Script ya cargado anteriormente');
      return;
    }

    console.log('🚀 Iniciando carga de Culqi...');
    
    // Verificar si ya existe el script
    const existingScript = document.querySelector('script[src*="checkout.culqi.com"]');
    if (existingScript) {
      console.log('⚠️ Script de Culqi ya existe en el DOM');
      existingScript.remove();
    }

    // Crear script manualmente
    const script = document.createElement('script');
    script.src = 'https://checkout.culqi.com/js/v4';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ ========== SCRIPT CARGADO ==========');
      
      if (typeof window === 'undefined' || !(window as any).Culqi) {
        console.error('❌ Culqi no está disponible después de cargar el script');
        setLoadError('Error: Culqi no se cargó correctamente');
        return;
      }

      console.log('✅ Culqi disponible en window');

      // Verificar public key
      const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
      console.log('🔑 Public key:', publicKey ? `${publicKey.substring(0, 15)}...` : '❌ NO DEFINIDA');
      
      if (!publicKey) {
        console.error('❌ CRITICAL: Public key no definida');
        setLoadError('Error de configuración');
        return;
      }

      // Configurar Culqi
      try {
        (window as any).Culqi.publicKey = publicKey;
        console.log('✅ Public key asignada');

        const logoUrl = siteLogo.startsWith('http') 
          ? siteLogo 
          : `${window.location.origin}${siteLogo}`;
        
        console.log('🎨 Logo URL:', logoUrl);

        (window as any).Culqi.options({
          lang: 'auto',
          installments: false,
          paymentMethods: {
            tarjeta: true,
            yape: false,
            bancaMovil: false,
            agente: false,
            billetera: false,
            cuotealo: false
          },
          style: {
            logo: logoUrl,
            bannerColor: '#FF6B00',
            buttonBackground: '#FF6B00', 
            menuColor: '#FF6B00',
            linksColor: '#FF6B00',
            buttonText: 'Pagar',
            buttonTextColor: '#FFFFFF',
            priceColor: '#000000'
          }
        });
        
        console.log('✅ Opciones configuradas');

        // Configurar handler
        (window as any).culqi = () => {
          console.log('🎯 ========== HANDLER EJECUTADO ==========');
          
          resetProcessingState();
          
          if ((window as any).Culqi.token) {
            const token = (window as any).Culqi.token.id;
            console.log('✅ Token recibido:', token);
            
            try {
              (window as any).Culqi.close();
              console.log('✅ Popup cerrado');
            } catch (e) {
              console.warn('Error cerrando popup:', e);
            }
            
            onSuccess(token);
            
          } else if ((window as any).Culqi.error) {
            const error = (window as any).Culqi.error;
            console.error('❌ Error Culqi:', error);
            
            try {
              (window as any).Culqi.close();
            } catch (e) {
              console.warn('Error cerrando popup:', e);
            }
            
            onError(error?.user_message || error?.merchant_message || 'Error al procesar el pago');
          }
        };
        
        console.log('✅ Handler configurado');
        console.log('🟢 TODO LISTO - Cambiando isLoaded a TRUE');
        
        scriptLoadedRef.current = true;
        setIsLoaded(true);
        
      } catch (err) {
        console.error('❌ Error configurando Culqi:', err);
        setLoadError('Error al configurar el sistema de pagos');
      }
    };
    
    script.onerror = (error) => {
      console.error('❌ Error cargando script:', error);
      setLoadError('Error al cargar el sistema de pagos');
    };
    
    console.log('📦 Agregando script al DOM...');
    document.head.appendChild(script);
    
    return () => {
      console.log('🧹 Limpiando componente');
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [onSuccess, onError, resetProcessingState, siteLogo, siteName]);

  const openCulqiCheckout = () => {
    console.log('🚀 ========== ABRIENDO CHECKOUT ==========');
    console.log('Estado:', { isLoaded, isProcessing, email, amount });
    
    if (!isLoaded) {
      console.error('❌ No está cargado');
      return;
    }
    
    if (!(window as any).Culqi) {
      console.error('❌ Culqi no disponible');
      onError('Sistema de pagos no disponible');
      return;
    }
    
    processingTimeoutRef.current = setTimeout(() => {
      console.warn('⏱️ Timeout de 30 segundos');
      resetProcessingState();
    }, 30000);
    
    setIsProcessing(true);
    
    try {
      console.log('📝 Configurando settings...');
      (window as any).Culqi.settings({
        title: siteName,
        currency: 'PEN',
        description: `Pago de ${customerName}`,
        amount: amount
      });
      
      console.log('🎨 Abriendo Culqi.open()...');
      (window as any).Culqi.open();
      console.log('✅ Popup abierto');
      
    } catch (error) {
      console.error('❌ Error:', error);
      resetProcessingState();
      onError('Error al abrir el formulario de pago');
    }
  };

  if (loadError) {
    return (
      <div className="text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={openCulqiCheckout}
        disabled={disabled || !isLoaded || !email || isProcessing}
        className={className}
        variant="outline"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Procesando...
          </>
        ) : !isLoaded ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Ingresar datos de tarjeta
          </>
        )}
      </Button>
      
      {isProcessing && (
        <button
          type="button"
          onClick={resetProcessingState}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Cancelar
        </button>
      )}
      
      {!email && isLoaded && (
        <p className="text-xs text-destructive">
          Por favor completa tu email primero
        </p>
      )}
      
      <div className="text-xs text-muted-foreground">
        Debug: {isLoaded ? '✅ Listo' : '⏳ Cargando'} | 
        {isProcessing ? ' 🔄 Procesando' : ' ⚪ Esperando'}
      </div>
    </div>
  );
}