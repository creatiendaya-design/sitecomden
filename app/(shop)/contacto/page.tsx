import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";
import ContactForm from "@/components/shop/ContactForm";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: `Contacto - ${settings.site_name}`,
    description: `Ponte en contacto con ${settings.site_name}. Estamos aquí para ayudarte.`,
  };
}

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Contáctanos
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          ¿Tienes alguna pregunta o sugerencia? Estamos aquí para ayudarte
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Información de Contacto */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Información de Contacto
            </h2>
            <div className="space-y-4">
              {/* Email */}
              {settings.contact_email && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Email</h3>
                    <a
                      href={`mailto:${settings.contact_email}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {settings.contact_email}
                    </a>
                  </div>
                </div>
              )}

              {/* Teléfono */}
              {settings.contact_phone && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Teléfono</h3>
                    <a
                      href={`tel:${settings.contact_phone}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {settings.contact_phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Dirección */}
              {settings.contact_address && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Dirección</h3>
                    <p className="text-muted-foreground">
                      {settings.contact_address}
                    </p>
                  </div>
                </div>
              )}

              {/* Horario de Atención */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Horario de Atención</h3>
                  <p className="text-muted-foreground">
                    Lunes a Viernes: 9:00 AM - 6:00 PM<br />
                    Sábados: 9:00 AM - 1:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Métodos de Contacto Adicionales */}
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-3">Otras Formas de Contacto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• WhatsApp: Envíanos un mensaje al {settings.contact_phone || "número de contacto"}</li>
              <li>• Chat en vivo: Disponible en nuestra web de lunes a viernes</li>
              <li>• Redes Sociales: Síguenos en nuestras redes para respuestas rápidas</li>
            </ul>
          </div>
        </div>

        {/* Formulario de Contacto */}
        <div>
          <div className="p-6 rounded-lg border bg-card">
            <h2 className="text-2xl font-semibold mb-6">
              Envíanos un Mensaje
            </h2>
            <ContactForm />
          </div>
        </div>
      </div>

      {/* FAQ Link */}
      <div className="mt-12 text-center p-6 rounded-lg bg-muted">
        <h3 className="text-lg font-semibold mb-2">
          ¿Buscas respuestas rápidas?
        </h3>
        <p className="text-muted-foreground mb-4">
          Revisa nuestra sección de preguntas frecuentes
        </p>
        <a
          href="/preguntas"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ver Preguntas Frecuentes
        </a>
      </div>
    </div>
  );
}