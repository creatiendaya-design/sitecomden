"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface NewsletterSectionProps {
  title: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
  layout?: "inline" | "stacked" | "card";
  showBenefits?: boolean;
  className?: string;
}

export function NewsletterSection({
  title,
  subtitle,
  placeholder = "Tu correo electrónico",
  buttonText = "Suscribirse",
  layout = "inline",
  showBenefits = true,
  className = "",
}: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus("success");
        setMessage("¡Gracias por suscribirte! Revisa tu correo.");
        setEmail("");
      } else {
        const data = await response.json();
        setStatus("error");
        setMessage(data.error || "Hubo un error. Intenta de nuevo.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Hubo un error. Intenta de nuevo.");
    }

    // Reset status después de 5 segundos
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 5000);
  };

  const benefits = [
    "Ofertas exclusivas para suscriptores",
    "Nuevos productos antes que nadie",
    "Consejos de decoración gratuitos",
    "Cupones de descuento especiales",
  ];

  if (layout === "card") {
    return (
      <section className={`py-16 md:py-24 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl">
            <div className="grid md:grid-cols-2">
              {/* Izquierda - Información */}
              <div className="p-8 text-white md:p-12">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Mail className="h-6 w-6" />
                </div>
                <h2 className="mb-4 text-3xl font-bold">{title}</h2>
                {subtitle && <p className="mb-6 text-white/90">{subtitle}</p>}
                
                {showBenefits && (
                  <ul className="space-y-3">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <span className="text-white/90">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Derecha - Formulario */}
              <div className="bg-white p-8 md:p-12">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder={placeholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={status === "loading" || status === "success"}
                      className="h-12"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={status === "loading" || status === "success"}
                    className="h-12 w-full"
                  >
                    {status === "loading" ? "Suscribiendo..." : buttonText}
                  </Button>

                  {/* Mensaje de estado */}
                  {message && (
                    <div
                      className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                        status === "success"
                          ? "bg-green-50 text-green-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
                      {status === "success" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {message}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Al suscribirte, aceptas recibir emails de marketing. Puedes
                    cancelar en cualquier momento.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (layout === "stacked") {
    return (
      <section className={`bg-muted/40 py-16 md:py-24 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-8 w-8" />
            </div>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{title}</h2>
            {subtitle && (
              <p className="mb-8 text-lg text-muted-foreground">{subtitle}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder={placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading" || status === "success"}
                  className="h-12 flex-1"
                />
                <Button
                  type="submit"
                  disabled={status === "loading" || status === "success"}
                  size="lg"
                  className="h-12 sm:w-auto"
                >
                  {status === "loading" ? "Enviando..." : buttonText}
                </Button>
              </div>

              {message && (
                <div
                  className={`flex items-center justify-center gap-2 rounded-lg p-3 text-sm ${
                    status === "success"
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {status === "success" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {message}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Únete a más de 10,000 suscriptores. Sin spam, solo contenido de
                valor.
              </p>
            </form>
          </div>
        </div>
      </section>
    );
  }

  // Layout inline (por defecto)
  return (
    <section className={`border-y py-12 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="mb-2 text-2xl font-bold">{title}</h3>
            {subtitle && (
              <p className="text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-md">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading" || status === "success"}
                className="h-11"
              />
              <Button
                type="submit"
                disabled={status === "loading" || status === "success"}
              >
                {status === "loading" ? "..." : buttonText}
              </Button>
            </div>
            {message && (
              <p
                className={`mt-2 text-sm ${
                  status === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}