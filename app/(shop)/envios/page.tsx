import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";
import { Truck, Clock, MapPin, Package, AlertCircle } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: `Política de Envíos - ${settings.site_name}`,
    description: `Información sobre tiempos de entrega, costos de envío y cobertura de ${settings.site_name}.`,
  };
}

export default async function ShippingPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Política de Envíos
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Información detallada sobre nuestros tiempos de entrega, costos y cobertura
        </p>
      </div>

      {/* Métodos de Envío */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Métodos de Envío</h2>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-lg mb-2">Envío Estándar</h3>
            <p className="text-muted-foreground mb-3">
              Trabajamos con couriers de confianza como Olva Courier y Shalom para garantizar 
              que tus productos lleguen en perfectas condiciones.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Lima Metropolitana: 2-3 días hábiles</li>
              <li>• Provincias: 3-7 días hábiles</li>
              <li>• Costo calculado según peso y destino</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-lg mb-2">Envío Express (Lima)</h3>
            <p className="text-muted-foreground mb-3">
              Para entregas urgentes dentro de Lima Metropolitana.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Entrega en 24 horas</li>
              <li>• Disponible para pedidos antes de las 2:00 PM</li>
              <li>• Costo adicional según distrito</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tiempos de Procesamiento */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Tiempos de Procesamiento</h2>
        </div>

        <div className="prose prose-gray max-w-none">
          <div className="p-6 rounded-lg border bg-card">
            <p className="text-muted-foreground mb-3">
              <strong>Tiempo de procesamiento:</strong> Una vez confirmado el pago, 
              procesamos tu pedido en un plazo de 1-2 días hábiles.
            </p>
            <p className="text-muted-foreground mb-3">
              <strong>Horario de procesamiento:</strong> De lunes a viernes de 9:00 AM a 6:00 PM. 
              Los pedidos realizados después de las 6:00 PM se procesan al siguiente día hábil.
            </p>
            <p className="text-muted-foreground mb-0">
              <strong>Fines de semana y feriados:</strong> Los pedidos realizados durante 
              fines de semana o feriados se procesan el siguiente día hábil.
            </p>
          </div>
        </div>
      </section>

      {/* Cobertura */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Cobertura</h2>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">Realizamos envíos a todo el Perú</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm mb-2 text-primary">Lima y Callao</h4>
              <p className="text-sm text-muted-foreground">
                Cobertura en todos los distritos de Lima Metropolitana y Callao con 
                tiempos de entrega de 2-3 días hábiles.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2 text-primary">Provincias</h4>
              <p className="text-sm text-muted-foreground">
                Enviamos a todas las regiones del Perú. Los tiempos varían según 
                la ubicación y accesibilidad de la zona.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Costos de Envío */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Costos de Envío</h2>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-3">Cálculo de Envío</h3>
            <p className="text-muted-foreground mb-3">
              El costo de envío se calcula automáticamente durante el checkout según:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Peso total del pedido</li>
              <li>• Destino (departamento, provincia y distrito)</li>
              <li>• Método de envío seleccionado</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg border bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-primary">🎉</span> Envío Gratis
            </h3>
            <p className="text-muted-foreground text-sm">
              Disfruta de <strong>envío gratis</strong> en compras mayores a <strong>S/. 150</strong> a 
              Lima Metropolitana y mayores a <strong>S/. 250</strong> a provincias. 
              (Oferta sujeta a disponibilidad)
            </p>
          </div>
        </div>
      </section>

      {/* Seguimiento */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Seguimiento de Pedidos</h2>
        <div className="p-6 rounded-lg border bg-card">
          <p className="text-muted-foreground mb-3">
            Una vez que tu pedido sea enviado, recibirás un email con:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Número de guía o tracking</li>
            <li>• Nombre del courier</li>
            <li>• Link de seguimiento (cuando esté disponible)</li>
            <li>• Tiempo estimado de entrega</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            También puedes revisar el estado de tu pedido en cualquier momento 
            contactándonos a través de nuestros canales de atención.
          </p>
        </div>
      </section>

      {/* Importante */}
      <section className="mb-12">
        <div className="p-6 rounded-lg border-2 border-amber-200 bg-amber-50/50">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2 text-amber-900">Información Importante</h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li>
                  • Asegúrate de proporcionar una dirección completa y correcta, 
                  incluyendo referencias que faciliten la ubicación.
                </li>
                <li>
                  • Los tiempos de entrega son estimados y pueden variar debido a 
                  factores fuera de nuestro control (clima, tráfico, disponibilidad del courier).
                </li>
                <li>
                  • Es responsabilidad del comprador estar disponible para recibir 
                  el pedido. Si no hay nadie disponible, el courier intentará la 
                  entrega nuevamente o dejará un aviso.
                </li>
                <li>
                  • Revisa tu pedido al recibirlo. En caso de daños o productos 
                  incorrectos, contáctanos inmediatamente.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <div className="text-center p-6 rounded-lg bg-muted">
        <h3 className="text-lg font-semibold mb-2">
          ¿Tienes dudas sobre tu envío?
        </h3>
        <p className="text-muted-foreground mb-4">
          Contáctanos y te ayudaremos con cualquier consulta sobre tu pedido.
        </p>
        <a
          href="/contacto"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Contáctanos
        </a>
      </div>
    </div>
  );
}