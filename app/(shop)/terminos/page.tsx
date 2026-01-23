import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";
import { FileText, AlertCircle } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: `Términos y Condiciones - ${settings.site_name}`,
    description: `Lee los términos y condiciones de uso de ${settings.site_name}.`,
  };
}

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const currentDate = new Date().toLocaleDateString('es-PE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Términos y Condiciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {currentDate}
        </p>
      </div>

      {/* Important Notice */}
      <div className="mb-8 p-6 rounded-lg border-2 border-primary/20 bg-primary/5">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">Importante</h3>
            <p className="text-sm text-muted-foreground">
              Al acceder y utilizar {settings.site_name}, aceptas automáticamente estos 
              términos y condiciones en su totalidad. Si no estás de acuerdo con alguna 
              parte de estos términos, te recomendamos no utilizar nuestros servicios.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none space-y-8">
        {/* 1. Definiciones */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Definiciones</h2>
          <div className="text-muted-foreground space-y-2">
            <p>
              <strong>"Sitio Web"</strong> se refiere a {settings.site_name} y todos sus subdominios.
            </p>
            <p>
              <strong>"Usuario"</strong> se refiere a cualquier persona que acceda o utilice el Sitio Web.
            </p>
            <p>
              <strong>"Productos"</strong> se refiere a los artículos ofrecidos para la venta en el Sitio Web.
            </p>
            <p>
              <strong>"Pedido"</strong> se refiere a la solicitud de compra de uno o más Productos.
            </p>
            <p>
              <strong>"Nosotros" o "Nuestro"</strong> se refiere a {settings.site_name}.
            </p>
          </div>
        </section>

        {/* 2. Aceptación de los Términos */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Aceptación de los Términos</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Al utilizar este Sitio Web, confirmas que:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Eres mayor de 18 años o tienes el permiso de tus padres o tutor legal.</li>
              <li>Proporcionarás información veraz, precisa y completa.</li>
              <li>Mantendrás actualizada tu información de cuenta.</li>
              <li>Cumplirás con todas las leyes aplicables en Perú.</li>
              <li>No utilizarás el sitio para actividades ilegales o no autorizadas.</li>
            </ul>
          </div>
        </section>

        {/* 3. Uso del Sitio Web */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Uso del Sitio Web</h2>
          <div className="text-muted-foreground space-y-3">
            <h3 className="text-lg font-medium text-foreground">3.1 Licencia de Uso</h3>
            <p>
              Te otorgamos una licencia limitada, no exclusiva, intransferible y revocable 
              para acceder y utilizar el Sitio Web para fines personales y no comerciales.
            </p>
            
            <h3 className="text-lg font-medium text-foreground mt-4">3.2 Restricciones</h3>
            <p>No puedes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Copiar, modificar o distribuir el contenido del sitio sin autorización.</li>
              <li>Utilizar sistemas automatizados para acceder al sitio (bots, scrapers).</li>
              <li>Intentar vulnerar la seguridad del sitio.</li>
              <li>Hacerse pasar por otra persona o entidad.</li>
              <li>Interferir con el funcionamiento normal del sitio.</li>
              <li>Utilizar el sitio para enviar spam o contenido malicioso.</li>
            </ul>
          </div>
        </section>

        {/* 4. Productos y Precios */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Productos y Precios</h2>
          <div className="text-muted-foreground space-y-3">
            <h3 className="text-lg font-medium text-foreground">4.1 Información de Productos</h3>
            <p>
              Hacemos todo lo posible para mostrar con precisión los colores, características 
              y detalles de nuestros productos. Sin embargo, no garantizamos que la visualización 
              sea exacta al 100% debido a las variaciones en monitores y dispositivos.
            </p>
            
            <h3 className="text-lg font-medium text-foreground mt-4">4.2 Precios</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Todos los precios están expresados en Soles Peruanos (PEN).</li>
              <li>Los precios pueden cambiar sin previo aviso.</li>
              <li>El precio aplicable es el vigente al momento de realizar el pedido.</li>
              <li>Nos reservamos el derecho de corregir errores de precios evidentes.</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4">4.3 Disponibilidad</h3>
            <p>
              Los productos están sujetos a disponibilidad. Nos reservamos el derecho de 
              limitar las cantidades de compra y descontinuar productos sin previo aviso.
            </p>
          </div>
        </section>

        {/* 5. Pedidos y Pagos */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Pedidos y Pagos</h2>
          <div className="text-muted-foreground space-y-3">
            <h3 className="text-lg font-medium text-foreground">5.1 Proceso de Pedido</h3>
            <p>
              Al realizar un pedido, estás haciendo una oferta de compra. Nos reservamos 
              el derecho de aceptar o rechazar cualquier pedido por cualquier motivo.
            </p>
            
            <h3 className="text-lg font-medium text-foreground mt-4">5.2 Confirmación</h3>
            <p>
              Enviaremos un email de confirmación una vez que tu pedido sea aceptado y 
              procesado. El contrato de venta se forma en ese momento.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4">5.3 Métodos de Pago</h3>
            <p>
              Aceptamos los siguientes métodos de pago:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Tarjetas de crédito y débito (Visa, Mastercard)</li>
              <li>Yape</li>
              <li>Plin</li>
              <li>PayPal</li>
              <li>Mercado Pago</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4">5.4 Seguridad de Pagos</h3>
            <p>
              Todos los pagos son procesados de forma segura a través de proveedores 
              certificados. No almacenamos información de tarjetas de crédito en nuestros servidores.
            </p>
          </div>
        </section>

        {/* 6. Envíos y Entregas */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Envíos y Entregas</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Los tiempos de entrega son estimados y pueden variar debido a factores 
              fuera de nuestro control. No somos responsables por retrasos causados 
              por el courier o eventos de fuerza mayor.
            </p>
            <p>
              Para más detalles, consulta nuestra{" "}
              <a href="/envios" className="text-primary hover:underline">
                Política de Envíos
              </a>.
            </p>
          </div>
        </section>

        {/* 7. Devoluciones y Reembolsos */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Devoluciones y Reembolsos</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Aceptamos devoluciones dentro de los 30 días posteriores a la recepción 
              del producto, sujeto a nuestras condiciones.
            </p>
            <p>
              Para más detalles, consulta nuestra{" "}
              <a href="/devoluciones" className="text-primary hover:underline">
                Política de Devoluciones
              </a>.
            </p>
          </div>
        </section>

        {/* 8. Propiedad Intelectual */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Propiedad Intelectual</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Todo el contenido del Sitio Web, incluyendo textos, gráficos, logos, 
              imágenes, videos, software y compilaciones de datos, es propiedad de{" "}
              {settings.site_name} o de sus proveedores y está protegido por las leyes 
              de propiedad intelectual del Perú y tratados internacionales.
            </p>
            <p>
              Las marcas, logos y marcas de servicio mostradas en el sitio son propiedad 
              de {settings.site_name} o de terceros. No está permitido su uso sin 
              autorización previa por escrito.
            </p>
          </div>
        </section>

        {/* 9. Limitación de Responsabilidad */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Limitación de Responsabilidad</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              En la medida máxima permitida por la ley peruana, {settings.site_name} no 
              será responsable por:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Daños indirectos, incidentales, especiales o consecuentes.</li>
              <li>Pérdida de beneficios, datos o uso del sitio.</li>
              <li>Interrupciones o errores en el servicio.</li>
              <li>Contenido de terceros o enlaces externos.</li>
              <li>Virus u otro material dañino.</li>
            </ul>
          </div>
        </section>

        {/* 10. Indemnización */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Indemnización</h2>
          <div className="text-muted-foreground">
            <p>
              Aceptas indemnizar, defender y mantener indemne a {settings.site_name}, 
              sus directores, empleados y agentes de cualquier reclamo, pérdida, 
              responsabilidad, daño o gasto (incluyendo honorarios de abogados) que 
              surja de tu uso del sitio o violación de estos términos.
            </p>
          </div>
        </section>

        {/* 11. Enlaces a Terceros */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Enlaces a Terceros</h2>
          <div className="text-muted-foreground">
            <p>
              Nuestro sitio puede contener enlaces a sitios web de terceros. No somos 
              responsables del contenido, políticas de privacidad o prácticas de estos 
              sitios. El acceso a sitios de terceros es bajo tu propio riesgo.
            </p>
          </div>
        </section>

        {/* 12. Modificaciones */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Modificaciones de los Términos</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. 
              Los cambios entrarán en vigor inmediatamente después de su publicación en 
              el sitio.
            </p>
            <p>
              Es tu responsabilidad revisar periódicamente estos términos. El uso 
              continuado del sitio después de cualquier modificación constituye tu 
              aceptación de los nuevos términos.
            </p>
          </div>
        </section>

        {/* 13. Terminación */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Terminación</h2>
          <div className="text-muted-foreground">
            <p>
              Podemos suspender o terminar tu acceso al sitio inmediatamente, sin previo 
              aviso ni responsabilidad, por cualquier motivo, incluyendo si incumples 
              estos términos.
            </p>
          </div>
        </section>

        {/* 14. Ley Aplicable */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">14. Ley Aplicable y Jurisdicción</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Estos términos se regirán e interpretarán de acuerdo con las leyes de la 
              República del Perú.
            </p>
            <p>
              Cualquier disputa derivada de estos términos estará sujeta a la jurisdicción 
              exclusiva de los tribunales de Lima, Perú.
            </p>
          </div>
        </section>

        {/* 15. Disposiciones Generales */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">15. Disposiciones Generales</h2>
          <div className="text-muted-foreground space-y-3">
            <h3 className="text-lg font-medium text-foreground">15.1 Acuerdo Completo</h3>
            <p>
              Estos términos constituyen el acuerdo completo entre tú y {settings.site_name} 
              con respecto al uso del sitio.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4">15.2 Divisibilidad</h3>
            <p>
              Si alguna disposición de estos términos se considera inválida o inaplicable, 
              las disposiciones restantes permanecerán en pleno vigor y efecto.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4">15.3 Renuncia</h3>
            <p>
              Ninguna renuncia a cualquier término será considerada como una renuncia 
              adicional o continua de dicho término o de cualquier otro término.
            </p>
          </div>
        </section>

        {/* 16. Contacto */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">16. Contacto</h2>
          <div className="text-muted-foreground">
            <p className="mb-3">
              Si tienes preguntas sobre estos Términos y Condiciones, puedes contactarnos a través de:
            </p>
            <ul className="space-y-2">
              {settings.contact_email && (
                <li>
                  <strong>Email:</strong>{" "}
                  <a href={`mailto:${settings.contact_email}`} className="text-primary hover:underline">
                    {settings.contact_email}
                  </a>
                </li>
              )}
              {settings.contact_phone && (
                <li>
                  <strong>Teléfono:</strong> {settings.contact_phone}
                </li>
              )}
              {settings.contact_address && (
                <li>
                  <strong>Dirección:</strong> {settings.contact_address}
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>

      {/* Footer Notice */}
      <div className="mt-12 p-6 rounded-lg bg-muted text-center">
        <p className="text-sm text-muted-foreground">
          Al continuar usando {settings.site_name}, aceptas estos Términos y Condiciones.
        </p>
      </div>
    </div>
  );
}