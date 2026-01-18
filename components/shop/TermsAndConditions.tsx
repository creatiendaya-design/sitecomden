"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsAndConditionsProps {
  children: React.ReactNode;
}

export default function TermsAndConditions({ children }: TermsAndConditionsProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Términos y Condiciones</DialogTitle>
          <DialogDescription>
            Lee atentamente nuestros términos y condiciones antes de continuar con tu compra.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Aceptación de los Términos</h3>
              <p className="text-muted-foreground">
                Al realizar una compra en nuestra tienda, aceptas estos términos y condiciones
                en su totalidad. Si no estás de acuerdo con alguna parte de estos términos,
                no debes realizar la compra.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Productos y Precios</h3>
              <p className="text-muted-foreground">
                Nos esforzamos por mostrar los productos con la mayor precisión posible.
                Sin embargo, no garantizamos que las descripciones, colores o imágenes sean
                completamente precisas. Los precios están sujetos a cambios sin previo aviso.
                Todos los precios están expresados en Soles Peruanos (PEN) e incluyen IGV
                cuando corresponda.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. Disponibilidad y Stock</h3>
              <p className="text-muted-foreground">
                Los productos están sujetos a disponibilidad. Nos reservamos el derecho de
                limitar la cantidad de productos que ofrecemos. En caso de que un producto
                no esté disponible después de realizar tu pedido, te contactaremos para
                ofrecerte alternativas o un reembolso completo.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Proceso de Compra</h3>
              <p className="text-muted-foreground">
                Al completar tu pedido, recibirás un correo electrónico de confirmación.
                Esta confirmación no constituye la aceptación de tu pedido, sino simplemente
                una confirmación de que lo hemos recibido. La aceptación ocurre cuando
                verificamos el pago y confirmamos el envío.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Métodos de Pago</h3>
              <p className="text-muted-foreground">
                Aceptamos los siguientes métodos de pago:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 mt-2 space-y-1">
                <li>Yape y Plin (verificación manual requerida)</li>
                <li>Tarjetas de crédito y débito (Visa, Mastercard)</li>
                <li>PayPal</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Para pagos con Yape o Plin, debes subir el comprobante de pago. Tu pedido
                será procesado después de que verifiquemos el pago (generalmente dentro de
                2-4 horas hábiles).
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Envíos y Entregas</h3>
              <p className="text-muted-foreground">
                Los tiempos de entrega son estimados y pueden variar según la ubicación y
                disponibilidad del courier. No somos responsables por retrasos causados por
                el servicio de mensajería o circunstancias fuera de nuestro control. Los
                gastos de envío se calculan según el destino y se muestran antes de
                completar tu compra.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Devoluciones y Cambios</h3>
              <p className="text-muted-foreground">
                Aceptamos devoluciones dentro de los 7 días posteriores a la recepción del
                producto, siempre que el artículo esté sin usar, en su empaque original y
                con todas las etiquetas. Los gastos de envío de devolución corren por cuenta
                del cliente, excepto en casos de productos defectuosos o errores de envío.
                Para iniciar una devolución, contáctanos a través de WhatsApp o email.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Garantía de Productos</h3>
              <p className="text-muted-foreground">
                Los productos tienen la garantía del fabricante cuando aplique. En caso de
                productos defectuosos, debes contactarnos dentro de las 48 horas posteriores
                a la recepción para que podamos resolver el problema mediante cambio o
                reembolso.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">9. Privacidad y Datos Personales</h3>
              <p className="text-muted-foreground">
                Protegemos tu información personal de acuerdo con la Ley de Protección de
                Datos Personales del Perú (Ley N° 29733). Tus datos solo serán utilizados
                para procesar tu pedido y mejorar nuestros servicios. No compartimos tu
                información con terceros sin tu consentimiento, excepto cuando sea necesario
                para completar tu pedido (courier, pasarelas de pago).
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">10. Responsabilidad</h3>
              <p className="text-muted-foreground">
                No seremos responsables por daños indirectos, incidentales o consecuentes
                que puedan surgir del uso de nuestros productos o servicios. Nuestra
                responsabilidad está limitada al valor del producto adquirido.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">11. Modificaciones</h3>
              <p className="text-muted-foreground">
                Nos reservamos el derecho de modificar estos términos y condiciones en
                cualquier momento. Los cambios entrarán en vigencia inmediatamente después
                de su publicación en nuestro sitio web. Es tu responsabilidad revisar
                periódicamente estos términos.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">12. Ley Aplicable</h3>
              <p className="text-muted-foreground">
                Estos términos se rigen por las leyes de la República del Perú. Cualquier
                disputa será resuelta en los tribunales de Lima, Perú.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">13. Contacto</h3>
              <p className="text-muted-foreground">
                Si tienes alguna pregunta sobre estos términos y condiciones, puedes
                contactarnos a través de:
              </p>
              <ul className="list-none text-muted-foreground ml-4 mt-2 space-y-1">
                <li>Email: soporte@tutienda.com</li>
                <li>WhatsApp: +51 987 654 321</li>
              </ul>
            </section>

            <section className="pt-4 border-t">
              <p className="text-xs text-muted-foreground italic">
                Última actualización: Enero 2026
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}