import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";
import { Shield, Lock, Eye, UserCheck, Database, AlertCircle } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: `Política de Privacidad - ${settings.site_name}`,
    description: `Lee nuestra política de privacidad y cómo protegemos tus datos personales en ${settings.site_name}.`,
  };
}

export default async function PrivacyPage() {
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
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Política de Privacidad
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {currentDate}
        </p>
      </div>

      {/* Important Notice */}
      <div className="mb-8 p-6 rounded-lg border-2 border-primary/20 bg-primary/5">
        <div className="flex gap-3">
          <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">Tu Privacidad es Importante</h3>
            <p className="text-sm text-muted-foreground">
              En {settings.site_name} nos tomamos muy en serio la protección de tus datos 
              personales. Esta política explica cómo recopilamos, usamos, almacenamos y 
              protegemos tu información, en cumplimiento con la Ley N° 29733 - Ley de 
              Protección de Datos Personales del Perú.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none space-y-8">
        {/* 1. Introducción */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              {settings.site_name} ("nosotros", "nuestro" o "nos") se compromete a 
              proteger tu privacidad. Esta Política de Privacidad describe:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Qué información personal recopilamos</li>
              <li>Cómo utilizamos esa información</li>
              <li>Con quién la compartimos</li>
              <li>Cómo la protegemos</li>
              <li>Cuáles son tus derechos respecto a tus datos</li>
            </ul>
            <p>
              Al utilizar nuestro sitio web y servicios, aceptas las prácticas descritas 
              en esta política.
            </p>
          </div>
        </section>

        {/* 2. Información que Recopilamos */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">2. Información que Recopilamos</h2>
          </div>

          <div className="text-muted-foreground space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                2.1 Información que Proporcionas Directamente
              </h3>
              <p className="mb-2">Recopilamos información que nos proporcionas cuando:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Creas una cuenta</li>
                <li>Realizas una compra</li>
                <li>Te suscribes a nuestro newsletter</li>
                <li>Contactas con nuestro servicio al cliente</li>
                <li>Participas en encuestas o promociones</li>
              </ul>
              <p className="mt-3">Esta información puede incluir:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Nombre completo</li>
                <li>Documento de identidad (DNI/RUC)</li>
                <li>Dirección de email</li>
                <li>Número de teléfono</li>
                <li>Dirección de envío y facturación</li>
                <li>Información de pago (procesada de forma segura por terceros)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                2.2 Información Recopilada Automáticamente
              </h3>
              <p className="mb-2">Cuando visitas nuestro sitio, recopilamos automáticamente:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Dirección IP</li>
                <li>Tipo de navegador y dispositivo</li>
                <li>Sistema operativo</li>
                <li>Páginas visitadas y tiempo de navegación</li>
                <li>Fuente de referencia (cómo llegaste a nuestro sitio)</li>
                <li>Cookies y tecnologías similares</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                2.3 Información de Terceros
              </h3>
              <p>
                Podemos recibir información adicional de servicios de terceros como 
                procesadores de pago, servicios de análisis y plataformas de redes sociales 
                (si decides conectar tu cuenta).
              </p>
            </div>
          </div>
        </section>

        {/* 3. Cómo Utilizamos tu Información */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">3. Cómo Utilizamos tu Información</h2>
          </div>

          <div className="text-muted-foreground space-y-3">
            <p>Utilizamos tu información personal para:</p>
            
            <div className="space-y-3">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Procesar Pedidos</h4>
                <p className="text-sm">
                  Gestionar y procesar tus compras, pagos, envíos y devoluciones.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Comunicación</h4>
                <p className="text-sm">
                  Enviarte confirmaciones de pedido, actualizaciones de envío, responder 
                  tus consultas y proporcionar soporte al cliente.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Mejorar Nuestros Servicios</h4>
                <p className="text-sm">
                  Analizar el uso del sitio para mejorar la experiencia del usuario, 
                  desarrollar nuevas funcionalidades y optimizar nuestros servicios.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Marketing (con tu consentimiento)</h4>
                <p className="text-sm">
                  Enviarte información sobre productos, ofertas especiales y promociones. 
                  Puedes darte de baja en cualquier momento.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Seguridad y Prevención de Fraude</h4>
                <p className="text-sm">
                  Proteger nuestro sitio y usuarios de actividades fraudulentas o ilegales.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Cumplimiento Legal</h4>
                <p className="text-sm">
                  Cumplir con obligaciones legales y regulatorias aplicables en Perú.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Base Legal */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Base Legal para el Procesamiento</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Procesamos tus datos personales bajo las siguientes bases legales:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Consentimiento:</strong> Cuando nos das tu permiso explícito para 
                procesar tus datos (ej. suscripción al newsletter).
              </li>
              <li>
                <strong>Ejecución de Contrato:</strong> Para procesar y entregar tus pedidos.
              </li>
              <li>
                <strong>Interés Legítimo:</strong> Para mejorar nuestros servicios, 
                prevenir fraude y mantener la seguridad.
              </li>
              <li>
                <strong>Obligación Legal:</strong> Para cumplir con la legislación peruana 
                (ej. facturación electrónica).
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Compartir Información */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Cómo Compartimos tu Información</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              No vendemos tu información personal a terceros. Compartimos tu información 
              solo en las siguientes circunstancias:
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Proveedores de Servicios</h4>
                <p className="text-sm">
                  Compartimos información con proveedores que nos ayudan a operar nuestro 
                  negocio (procesadores de pago, couriers, servicios de email, hosting).
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Cumplimiento Legal</h4>
                <p className="text-sm">
                  Cuando sea requerido por ley, orden judicial o autoridad gubernamental 
                  competente.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Protección de Derechos</h4>
                <p className="text-sm">
                  Para proteger nuestros derechos, propiedad o seguridad, así como los de 
                  nuestros usuarios.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Transferencia de Negocio</h4>
                <p className="text-sm">
                  En caso de fusión, adquisición o venta de activos, tu información puede 
                  ser transferida (te notificaremos previamente).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Seguridad */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">6. Seguridad de tus Datos</h2>
          </div>

          <div className="text-muted-foreground space-y-3">
            <p>
              Implementamos medidas de seguridad técnicas, administrativas y físicas 
              apropiadas para proteger tu información personal contra acceso no autorizado, 
              pérdida, alteración o destrucción:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encriptación SSL/TLS para todas las comunicaciones</li>
              <li>Almacenamiento seguro de datos en servidores protegidos</li>
              <li>No almacenamos información de tarjetas de crédito en nuestros servidores</li>
              <li>Acceso restringido a datos personales solo para personal autorizado</li>
              <li>Revisiones y actualizaciones regulares de seguridad</li>
            </ul>
            <p className="mt-3 text-sm italic">
              Sin embargo, ningún método de transmisión por Internet o almacenamiento 
              electrónico es 100% seguro. Aunque nos esforzamos por proteger tu información, 
              no podemos garantizar su seguridad absoluta.
            </p>
          </div>
        </section>

        {/* 7. Retención de Datos */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Retención de Datos</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Conservamos tu información personal durante el tiempo necesario para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar nuestros servicios</li>
              <li>Cumplir con obligaciones legales (ej. registros contables por 5 años)</li>
              <li>Resolver disputas</li>
              <li>Hacer cumplir nuestros acuerdos</li>
            </ul>
            <p>
              Una vez que ya no necesitemos tus datos, los eliminaremos o anonimizaremos 
              de forma segura.
            </p>
          </div>
        </section>

        {/* 8. Tus Derechos */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">8. Tus Derechos</h2>
          </div>

          <div className="text-muted-foreground space-y-3">
            <p>
              De acuerdo con la Ley de Protección de Datos Personales del Perú, tienes 
              los siguientes derechos:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Acceso</h4>
                <p className="text-sm">
                  Solicitar una copia de los datos personales que tenemos sobre ti.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Rectificación</h4>
                <p className="text-sm">
                  Solicitar la corrección de datos inexactos o incompletos.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Cancelación</h4>
                <p className="text-sm">
                  Solicitar la eliminación de tus datos personales.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Oposición</h4>
                <p className="text-sm">
                  Oponerte al procesamiento de tus datos personales.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Revocación</h4>
                <p className="text-sm">
                  Revocar el consentimiento previamente otorgado.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-foreground mb-1">Portabilidad</h4>
                <p className="text-sm">
                  Solicitar tus datos en un formato estructurado y portable.
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-muted">
              <p className="text-sm">
                <strong>Cómo ejercer tus derechos:</strong> Envía un email a{" "}
                <a 
                  href={`mailto:${settings.contact_email || "privacidad@ejemplo.com"}`}
                  className="text-primary hover:underline"
                >
                  {settings.contact_email || "privacidad@ejemplo.com"}
                </a>{" "}
                con tu solicitud. Responderemos en un plazo máximo de 10 días hábiles.
              </p>
            </div>
          </div>
        </section>

        {/* 9. Cookies */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Cookies y Tecnologías Similares</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Utilizamos cookies y tecnologías similares para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mantener tu sesión activa</li>
              <li>Recordar tus preferencias</li>
              <li>Analizar el tráfico del sitio</li>
              <li>Personalizar tu experiencia</li>
              <li>Mostrar anuncios relevantes</li>
            </ul>
            <p>
              Puedes configurar tu navegador para rechazar cookies, pero esto puede 
              afectar la funcionalidad del sitio.
            </p>
          </div>
        </section>

        {/* 10. Menores de Edad */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Privacidad de Menores</h2>
          <div className="text-muted-foreground">
            <p>
              Nuestros servicios están dirigidos a personas mayores de 18 años. No 
              recopilamos intencionalmente información de menores de edad. Si descubres 
              que un menor ha proporcionado información personal, contáctanos inmediatamente 
              para que podamos eliminarla.
            </p>
          </div>
        </section>

        {/* 11. Transferencias Internacionales */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Transferencias Internacionales de Datos</h2>
          <div className="text-muted-foreground">
            <p>
              Algunos de nuestros proveedores de servicios pueden estar ubicados fuera de 
              Perú. Cuando transferimos datos internacionalmente, nos aseguramos de que 
              existan salvaguardas apropiadas para proteger tu información conforme a la 
              legislación peruana.
            </p>
          </div>
        </section>

        {/* 12. Cambios */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Cambios a esta Política</h2>
          <div className="text-muted-foreground">
            <p>
              Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos 
              sobre cambios significativos mediante un aviso en nuestro sitio web o por 
              email. La fecha de la última actualización siempre se mostrará en la parte 
              superior de esta página.
            </p>
          </div>
        </section>

        {/* 13. Contacto */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Contacto</h2>
          <div className="text-muted-foreground">
            <p className="mb-3">
              Si tienes preguntas o inquietudes sobre esta Política de Privacidad o sobre 
              cómo manejamos tu información personal, contáctanos:
            </p>
            <ul className="space-y-2">
              {settings.contact_email && (
                <li>
                  <strong>Email:</strong>{" "}
                  <a 
                    href={`mailto:${settings.contact_email}`} 
                    className="text-primary hover:underline"
                  >
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

        {/* 14. Autoridad de Control */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">14. Autoridad de Protección de Datos</h2>
          <div className="text-muted-foreground">
            <p>
              Si consideras que tus derechos de protección de datos han sido vulnerados, 
              tienes derecho a presentar una reclamación ante la Autoridad Nacional de 
              Protección de Datos Personales del Perú.
            </p>
          </div>
        </section>
      </div>

      {/* Footer Notice */}
      <div className="mt-12 p-6 rounded-lg border-2 border-primary/20 bg-primary/5">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">Consentimiento</h3>
            <p className="text-sm text-muted-foreground">
              Al utilizar {settings.site_name}, confirmas que has leído, comprendido y 
              aceptado esta Política de Privacidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}