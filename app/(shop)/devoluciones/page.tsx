import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";
import { RefreshCw, PackageX, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: `Política de Devoluciones - ${settings.site_name}`,
    description: `Información sobre devoluciones, cambios y reembolsos en ${settings.site_name}.`,
  };
}

export default async function ReturnsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Política de Devoluciones
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Tu satisfacción es nuestra prioridad. Conoce nuestra política de devoluciones y cambios
        </p>
      </div>

      {/* Resumen Destacado */}
      <div className="mb-12 p-6 rounded-lg bg-primary/5 border-2 border-primary/20">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-primary" />
          Garantía de Satisfacción
        </h2>
        <p className="text-muted-foreground mb-3">
          Tienes <strong>30 días</strong> desde la recepción de tu pedido para realizar 
          devoluciones o cambios, siempre que el producto cumpla con nuestras condiciones.
        </p>
        <p className="text-sm text-muted-foreground">
          Queremos que estés 100% satisfecho con tu compra. Si algo no es lo que esperabas, 
          estamos aquí para ayudarte.
        </p>
      </div>

      {/* Condiciones para Devolución */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <PackageX className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Condiciones para Devolución</h2>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-3">El producto debe estar:</h3>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Sin usar, en perfectas condiciones</span>
              </li>
              <li className="flex gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Con su empaque y etiquetas originales</span>
              </li>
              <li className="flex gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Incluir todos los accesorios y documentación original</span>
              </li>
              <li className="flex gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Sin señales de uso, manchas o daños</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-lg border border-amber-200 bg-amber-50/50">
            <h3 className="font-semibold mb-2 text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Productos NO Retornables
            </h3>
            <p className="text-sm text-amber-800 mb-2">
              Por razones de higiene y seguridad, NO aceptamos devoluciones de:
            </p>
            <ul className="space-y-1 text-sm text-amber-800">
              <li>• Productos de higiene personal (si fueron abiertos)</li>
              <li>• Productos personalizados o hechos a pedido</li>
              <li>• Productos en oferta final o liquidación (salvo defectos de fábrica)</li>
              <li>• Productos perecibles</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Proceso de Devolución */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Proceso de Devolución</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Contáctanos",
              description: `Envía un email a ${settings.contact_email || "soporte@ejemplo.com"} o llámanos al ${settings.contact_phone || "+51 987 654 321"} indicando tu número de orden y el motivo de la devolución.`,
            },
            {
              step: "2",
              title: "Espera Confirmación",
              description: "Te responderemos en un plazo máximo de 24-48 horas con las instrucciones para enviar el producto y la dirección de retorno.",
            },
            {
              step: "3",
              title: "Envía el Producto",
              description: "Empaca cuidadosamente el producto con todos sus accesorios y envíalo a la dirección que te proporcionaremos. Guarda el comprobante de envío.",
            },
            {
              step: "4",
              title: "Verificación",
              description: "Una vez recibido el producto, verificaremos que cumple con las condiciones de devolución (1-2 días hábiles).",
            },
            {
              step: "5",
              title: "Reembolso o Cambio",
              description: "Si todo está correcto, procesaremos tu reembolso o cambio en un plazo de 5-10 días hábiles.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {item.step}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cambios */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Cambios de Producto</h2>
        <div className="p-6 rounded-lg border bg-card">
          <p className="text-muted-foreground mb-4">
            Si deseas cambiar un producto por otro (diferente talla, color o modelo), 
            el proceso es similar al de devolución:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
              <span>Contáctanos indicando el producto que deseas recibir en su lugar</span>
            </li>
            <li className="flex gap-2">
              <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
              <span>Si hay diferencia de precio, te indicaremos cómo realizar el pago adicional o el reembolso de la diferencia</span>
            </li>
            <li className="flex gap-2">
              <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
              <span>El cambio está sujeto a disponibilidad de stock</span>
            </li>
            <li className="flex gap-2">
              <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
              <span>El envío del nuevo producto corre por nuestra cuenta si el cambio es por defecto del producto</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Reembolsos */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Reembolsos</h2>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">Métodos de Reembolso</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1">Tarjeta de Crédito/Débito</h4>
              <p className="text-sm text-muted-foreground">
                El reembolso se realizará a la misma tarjeta utilizada para la compra. 
                Puede tardar de 5-10 días hábiles en reflejarse según tu banco.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Yape / Plin</h4>
              <p className="text-sm text-muted-foreground">
                Te solicitaremos tu número de teléfono para realizar la transferencia. 
                El reembolso se procesa en 1-2 días hábiles.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">PayPal / Mercado Pago</h4>
              <p className="text-sm text-muted-foreground">
                El reembolso se procesa automáticamente a través de la plataforma. 
                Puede tardar 3-5 días hábiles.
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">
              <strong>Nota importante:</strong> Los costos de envío original no son reembolsables, 
              excepto en casos de productos defectuosos o error en el envío por nuestra parte.
            </p>
          </div>
        </div>
      </section>

      {/* Productos Defectuosos */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Productos Defectuosos o Incorrectos</h2>
        <div className="p-6 rounded-lg border-2 border-red-200 bg-red-50/50">
          <p className="text-sm text-red-900 mb-3">
            Si recibes un producto defectuoso, dañado o incorrecto:
          </p>
          <ul className="space-y-2 text-sm text-red-900">
            <li>• Contáctanos inmediatamente (máximo 48 horas después de recibir el pedido)</li>
            <li>• Envíanos fotos del producto y del empaque</li>
            <li>• Te proporcionaremos una solución inmediata: cambio o reembolso completo</li>
            <li>• Cubriremos el 100% de los costos de envío de devolución y reenvío</li>
          </ul>
        </div>
      </section>

      {/* Costos de Envío para Devoluciones */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Costos de Envío para Devoluciones</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2 text-green-600">Gratis</h3>
            <p className="text-sm text-muted-foreground">
              Si el producto es defectuoso, incorrecto o si cometimos un error, 
              nosotros cubrimos todos los costos de envío.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">A cargo del cliente</h3>
            <p className="text-sm text-muted-foreground">
              Si la devolución es por cambio de opinión o preferencia personal, 
              el costo de envío de devolución corre por cuenta del cliente.
            </p>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <div className="text-center p-6 rounded-lg bg-muted">
        <h3 className="text-lg font-semibold mb-2">
          ¿Necesitas hacer una devolución?
        </h3>
        <p className="text-muted-foreground mb-4">
          Contáctanos y te guiaremos en el proceso paso a paso.
        </p>
        <a
          href="/contacto"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Contáctanos Ahora
        </a>
      </div>
    </div>
  );
}