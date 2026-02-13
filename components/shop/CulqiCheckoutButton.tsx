// components/shop/CulqiCheckoutButton.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';

interface CulqiCheckoutButtonProps {
  amount: number;          // En céntimos (50.00 soles = 5000)
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

  useEffect(() => {
    // Configurar el handler de Culqi cuando carga el script
    if (isLoaded && typeof window !== 'undefined') {
      (window as any).culqi = function() {
        if ((window as any).Culqi.token) {
          // ✅ Token creado exitosamente
          const token = (window as any).Culqi.token.id;
          console.log('✅ Token Culqi recibido:', token);
          
          // 🔴 CERRAR EL POPUP DE CULQI
          try {
            (window as any).Culqi.close();
            console.log('✅ Popup de Culqi cerrado');
          } catch (e) {
            console.warn('No se pudo cerrar el popup de Culqi:', e);
          }
          
          setIsProcessing(false);
          
          // ✅ Llamar al callback de éxito
          onSuccess(token);
          
        } else if ((window as any).Culqi.order) {
          // Orden creada (para otros métodos de pago)
          const order = (window as any).Culqi.order;
          console.log('Orden Culqi creada:', order);
          
          try {
            (window as any).Culqi.close();
          } catch (e) {
            console.warn('No se pudo cerrar el popup de Culqi:', e);
          }
          
          setIsProcessing(false);
          
        } else {
          // ❌ Error
          const error = (window as any).Culqi.error;
          console.error('❌ Error Culqi:', error);
          
          try {
            (window as any).Culqi.close();
          } catch (e) {
            console.warn('No se pudo cerrar el popup de Culqi:', e);
          }
          
          setIsProcessing(false);
          onError(error?.user_message || error?.merchant_message || 'Error al procesar el pago');
        }
      };
    }
  }, [isLoaded, onSuccess, onError]);

  const openCulqiCheckout = () => {
    if (typeof window !== 'undefined' && (window as any).Culqi && isLoaded) {
      setIsProcessing(true);
      
      try {
        console.log('🎯 Abriendo Culqi Checkout con:', {
          title: siteName,
          amount: amount,
          email: email,
          name: customerName
        });
        
        // ✅ CONFIGURACIÓN CORRECTA DE CULQI SETTINGS
        (window as any).Culqi.settings({
          title: siteName,
          currency: 'PEN',
          description: `Pago de ${customerName}`,
          amount: amount
        });
        
        // Abrir el checkout
        (window as any).Culqi.open();
        console.log('✅ Culqi checkout abierto');
        
      } catch (error) {
        console.error('❌ Error al abrir Culqi:', error);
        setIsProcessing(false);
        onError('Error al abrir el formulario de pago');
      }
    } else {
      console.error('❌ Culqi no está disponible');
      onError('El sistema de pagos no está disponible');
    }
  };

  return (
    <>
      {/* Cargar script de Culqi Checkout */}
      <Script
        src="https://checkout.culqi.com/js/v4"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            console.log('📦 Script de Culqi cargado');
            
            // Configurar Culqi con la clave pública
            (window as any).Culqi.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
            console.log('🔑 Public key configurada');
            
            // ✅ Construir URL completa del logo
            const logoUrl = siteLogo.startsWith('http') 
              ? siteLogo 
              : `${window.location.origin}${siteLogo}`;
            
            // Configurar opciones del checkout (personalización visual)
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
            
            console.log('🎨 Opciones de estilo configuradas');
            setIsLoaded(true);
          }
        }}
        onError={(e) => {
          console.error('❌ Error cargando Culqi:', e);
          onError('Error al cargar el sistema de pagos');
        }}
      />

      {/* Botón para abrir el checkout */}
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

      {!email && isLoaded && (
        <p className="text-xs text-destructive mt-2">
          Por favor completa tu email primero
        </p>
      )}
    </>
  );
}