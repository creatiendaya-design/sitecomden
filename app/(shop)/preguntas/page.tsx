import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Package, CreditCard, Truck, RefreshCw, HelpCircle, Shield } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: `Preguntas Frecuentes - ${settings.site_name}`,
    description: `Encuentra respuestas a las preguntas más frecuentes sobre ${settings.site_name}, envíos, pagos y devoluciones.`,
  };
}

export default async function FAQPage() {
  const settings = await getSiteSettings();

  const faqCategories = [
    {
      icon: Package,
      title: "Pedidos",
      questions: [
        {
          q: "¿Cómo puedo realizar un pedido?",
          a: `Para realizar un pedido en ${settings.site_name}, simplemente navega por nuestro catálogo, agrega los productos que desees al carrito y sigue el proceso de checkout. Puedes pagar con tarjeta, Yape, Plin o PayPal.`,
        },
        {
          q: "¿Puedo modificar mi pedido después de realizarlo?",
          a: "Si necesitas modificar tu pedido, contáctanos lo antes posible. Si aún no ha sido procesado, haremos todo lo posible por actualizar tu pedido según tus necesidades.",
        },
        {
          q: "¿Cómo puedo rastrear mi pedido?",
          a: "Una vez que tu pedido sea enviado, recibirás un email con el número de seguimiento. También puedes revisar el estado de tu pedido en tu cuenta o contactarnos directamente.",
        },
        {
          q: "¿Puedo cancelar mi pedido?",
          a: "Puedes cancelar tu pedido antes de que sea procesado y enviado. Contáctanos inmediatamente si deseas cancelar tu pedido.",
        },
      ],
    },
    {
      icon: CreditCard,
      title: "Pagos",
      questions: [
        {
          q: "¿Qué métodos de pago aceptan?",
          a: "Aceptamos tarjetas de crédito/débito (Visa, Mastercard), Yape, Plin, PayPal y Mercado Pago. Todos los pagos son procesados de forma segura.",
        },
        {
          q: "¿Es seguro pagar en su sitio web?",
          a: "Sí, todos nuestros métodos de pago utilizan conexiones seguras (SSL) y trabajamos con procesadores de pago certificados. Tu información financiera está protegida.",
        },
        {
          q: "¿Cómo funciona el pago con Yape/Plin?",
          a: "Después de seleccionar Yape o Plin, te mostraremos un QR y número de teléfono para realizar la transferencia. Luego deberás subir la captura de pantalla del pago para que podamos verificarlo y confirmar tu pedido.",
        },
        {
          q: "¿Emiten boleta o factura?",
          a: "Sí, emitimos tanto boletas como facturas electrónicas. Durante el checkout podrás indicar qué tipo de comprobante necesitas.",
        },
      ],
    },
    {
      icon: Truck,
      title: "Envíos",
      questions: [
        {
          q: "¿Cuánto demora el envío?",
          a: "Los envíos a Lima metropolitana demoran 2-3 días hábiles. Para provincias, el tiempo varía entre 3-7 días hábiles dependiendo de la ubicación.",
        },
        {
          q: "¿Cuánto cuesta el envío?",
          a: "El costo de envío se calcula automáticamente según tu ubicación y el peso del pedido. Ofrecemos envío gratis en compras mayores a cierto monto (consulta nuestras promociones actuales).",
        },
        {
          q: "¿Hacen envíos a todo el Perú?",
          a: "Sí, realizamos envíos a todas las regiones del Perú a través de nuestros couriers de confianza (Olva Courier, Shalom, entre otros).",
        },
        {
          q: "¿Puedo recoger mi pedido en tienda?",
          a: "Actualmente no contamos con recojo en tienda, pero estamos trabajando para ofrecer este servicio pronto.",
        },
      ],
    },
    {
      icon: RefreshCw,
      title: "Devoluciones y Cambios",
      questions: [
        {
          q: "¿Cuál es su política de devoluciones?",
          a: "Aceptamos devoluciones dentro de los 30 días posteriores a la compra, siempre que el producto esté en su estado original, sin usar y con su empaque original.",
        },
        {
          q: "¿Cómo puedo devolver un producto?",
          a: "Contáctanos para iniciar el proceso de devolución. Te proporcionaremos las instrucciones y la dirección para enviar el producto de vuelta.",
        },
        {
          q: "¿Puedo cambiar un producto por otro?",
          a: "Sí, si prefieres cambiar un producto por otro (talla, color, modelo), contáctanos y te ayudaremos con el proceso de cambio.",
        },
        {
          q: "¿Cuándo recibiré mi reembolso?",
          a: "Una vez que recibamos y verifiquemos el producto devuelto, procesaremos tu reembolso en 5-10 días hábiles. El tiempo de acreditación depende de tu banco.",
        },
      ],
    },
    {
      icon: Shield,
      title: "Seguridad y Privacidad",
      questions: [
        {
          q: "¿Cómo protegen mi información personal?",
          a: "Tomamos muy en serio la seguridad de tus datos. Utilizamos encriptación SSL y cumplimos con las normativas de protección de datos. Nunca compartimos tu información con terceros sin tu consentimiento.",
        },
        {
          q: "¿Guardan mi información de pago?",
          a: "No almacenamos información de tarjetas de crédito en nuestros servidores. Todos los pagos son procesados directamente por nuestros procesadores certificados.",
        },
      ],
    },
    {
      icon: HelpCircle,
      title: "Otros",
      questions: [
        {
          q: "¿Los productos tienen garantía?",
          a: "Todos nuestros productos cuentan con garantía contra defectos de fabricación. El periodo de garantía varía según el producto (consulta la descripción de cada producto para más detalles).",
        },
        {
          q: "¿Puedo comprar al por mayor?",
          a: "Sí, ofrecemos descuentos especiales para compras al por mayor. Contáctanos directamente para obtener una cotización personalizada.",
        },
        {
          q: "¿Tienen tienda física?",
          a: "Actualmente somos una tienda 100% online, lo que nos permite ofrecer mejores precios al reducir costos operacionales.",
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Preguntas Frecuentes
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Encuentra respuestas a las preguntas más comunes sobre nuestros productos y servicios
        </p>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-8">
        {faqCategories.map((category, idx) => {
          const Icon = category.icon;
          return (
            <div key={idx} className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">{category.title}</h2>
              </div>

              <div className="p-4">
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((faq, qIdx) => (
                    <AccordionItem key={qIdx} value={`${idx}-${qIdx}`}>
                      <AccordionTrigger className="text-left">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact CTA */}
      <div className="mt-12 text-center p-6 rounded-lg bg-muted">
        <h3 className="text-lg font-semibold mb-2">
          ¿No encontraste lo que buscabas?
        </h3>
        <p className="text-muted-foreground mb-4">
          Estamos aquí para ayudarte. Contáctanos y te responderemos lo antes posible.
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