"use client";

import { useState } from "react";
import { sendContactEmail } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await sendContactEmail(formData);
      
      if (result.success) {
        toast.success("Mensaje enviado correctamente", {
          description: "Te responderemos lo antes posible.",
        });
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error("Error al enviar mensaje", {
          description: result.error || "Por favor, intenta de nuevo.",
        });
      }
    } catch (error) {
      toast.error("Error al enviar mensaje", {
        description: "Por favor, intenta de nuevo más tarde.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre Completo *</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Juan Pérez"
          required
          disabled={isSubmitting}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="juan@example.com"
          required
          disabled={isSubmitting}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+51 987 654 321"
          disabled={isSubmitting}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="subject">Asunto *</Label>
        <Input
          id="subject"
          name="subject"
          type="text"
          placeholder="¿En qué podemos ayudarte?"
          required
          disabled={isSubmitting}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="message">Mensaje *</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Escribe tu mensaje aquí..."
          rows={5}
          required
          disabled={isSubmitting}
          className="mt-1.5 resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar Mensaje"
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        * Campos obligatorios
      </p>
    </form>
  );
}