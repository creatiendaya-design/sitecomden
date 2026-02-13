// components/shop/CulqiCheckoutButton.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
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
  const handlerConfigured = useRef(false);

  useEffect(() => {
    // ✅ Configurar el handler de Culqi SOLO UNA VEZ
    if (isLoaded && typeof window !== 'undefined' && !handlerConfigured.current) {
      console.log('⚙️ Configurando handler de Culqi...');
      
      (window as any).culqi = function() {
        console.log('🎯 Handler de Culqi ejecutado');
        
        if ((window as any).Culqi.token) {
          const token = (window as any).Culqi.token.id;
          console.log('✅ Token Culqi recibido:', token);
          
          // Cerrar popup
          try {
            (window as any).Culqi.close();
            console.log('✅ Popup cerrado');
          } catch (e) {
            console.warn('⚠️ No se pudo cerrar el popup:', e);
          }
          
          // ✅ RESETEAR ESTADO INMEDIATAMENTE
          setIsProcessing(false);
          console.log('✅ Estado isProcessing reseteado a false');
          
          // Llamar callback de éxito
          onSuccess(token);
          
        } else if ((window as any).Culqi.order) {
          const order = (window as any).Culqi.order;
          console.log('📦 Orden Culqi creada:', order);
          
          try {
            (window as any).Culqi.close();
          } catch (e) {
            console.warn('⚠️ No se pudo cerrar el popup:', e);
          }
          
          setIsProcessing(false);
          
        } else {
          // Error de Culqi
          const error = (window as any).Culqi.error;
          console.error('❌ Error Culqi:', error);
          
          try {
            (window as any).Culqi.close();
          } catch (e) {
            console.warn('⚠️ No se pudo cerrar el popup:', e);
          }
          
          setIsProcessing(false);
          onError(error?.user_message || error?.merchant_message || 'Error al procesar el pago');
        }
      };
      
      handlerConfigured.current = true;
      console.log('✅ Handler de Culqi configurado');
    }
  }, [isLoaded, onSuccess, onError]);

  const openCulqiCheckout = () => {
    console.log('🚀 openCulqiCheckout llamado');
    console.log('Estado actual - isLoaded:', isLoaded, 'isProcessing:', isProcessing);
    
    if (typeof window === 'undefined') {
      console.error('❌ Window no está definido');
      return;
    }
    
    if (!(window as any).Culqi) {
      console.error('❌ Culqi no está disponible en window');
      onError('El sistema de pagos no está disponible');
      return;
    }
    
    if (!isLoaded) {
      console.error('❌ Culqi no está cargado');
      onError('El sistema de pagos aún está cargando');
      return;
    }
    
    console.log('✅ Todas las validaciones pasadas, abriendo Culqi...');
    setIsProcessing(true);
    
    try {
      console.log('📋 Configurando settings:', {
        title: siteName,
        amount: amount,
        currency: 'PEN'
      });
      
      (window as any).Culqi.settings({
        title: siteName,
        currency: 'PEN',
        description: `Pago de ${customerName}`,
        amount: amount
      });
      
      console.log('🎨 Abriendo Culqi.open()...');
      (window as any).Culqi.open();
      console.log('✅ Culqi.open() ejecutado');
      
    } catch (error) {
      console.error('❌ Error al abrir Culqi:', error);
      setIsProcessing(false);
      onError('Error al abrir el formulario de pago');
    }
  };

  return (
    <>
      <Script
        src="https://checkout.culqi.com/js/v4"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('📦 Script de Culqi cargado');
          
          if (typeof window !== 'undefined') {
            // Configurar clave pública
            const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
            console.log('🔑 Configurando public key:', publicKey ? '✅ Presente' : '❌ Faltante');
            (window as any).Culqi.publicKey = publicKey;
            
            // Construir URL del logo
            const logoUrl = siteLogo.startsWith('http') 
              ? siteLogo 
              : `${window.location.origin}${siteLogo}`;
            
            console.log('🎨 Logo URL:', logoUrl);
            
            // Configurar opciones visuales
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
            
            console.log('✅ Opciones de Culqi configuradas');
            setIsLoaded(true);
          }
        }}
        onError={(e) => {
          console.error('❌ Error cargando script de Culqi:', e);
          onError('Error al cargar el sistema de pagos');
        }}
      />

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
            Cargando sistema de pago...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Ingresar datos de tarjeta
          </>
        )}
      </Button>

      {!email && isLoaded && (
        <p className="text-xs text-destructive mt-2">
          Por favor completa tu email primero
        </p>
      )}
      
      {!isLoaded && (
        <p className="text-xs text-muted-foreground mt-2">
          Cargando sistema de pagos seguro...
        </p>
      )}
    </>
  );
}