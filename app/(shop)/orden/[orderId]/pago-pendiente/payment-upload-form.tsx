"use client";

import { useState } from "react";
import { uploadPaymentProof } from "@/actions/pending-payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import Image from "next/image";

interface PaymentUploadFormProps {
  orderId: string;
}

export default function PaymentUploadForm({ orderId }: PaymentUploadFormProps) {
  const [reference, setReference] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen válida");
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen debe ser menor a 5MB");
      return;
    }

    setImageFile(file);
    setError(null);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!reference.trim()) {
      setError("Ingresa el número de operación");
      return;
    }

    if (!imageFile) {
      setError("Selecciona una imagen del comprobante");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("reference", reference);
      formData.append("proofImage", imageFile);

      const result = await uploadPaymentProof(formData);

      if (result.success) {
        setSuccess(true);
        // Recargar página después de 2 segundos para mostrar estado actualizado
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(result.error || "Error al subir el comprobante");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Error al subir el comprobante. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          <strong>¡Comprobante recibido correctamente!</strong>
          <p className="mt-1">Estamos verificando tu pago...</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Número de Operación */}
      <div className="space-y-2">
        <Label htmlFor="reference">
          Número de Operación <span className="text-red-500">*</span>
        </Label>
        <Input
          id="reference"
          type="text"
          placeholder="Ej: 123456789"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          disabled={loading}
          required
        />
        <p className="text-xs text-muted-foreground">
          El número que aparece en tu comprobante de Yape/Plin
        </p>
      </div>

      {/* Upload de Imagen */}
      <div className="space-y-2">
        <Label htmlFor="proofImage">
          Foto del Comprobante <span className="text-red-500">*</span>
        </Label>

        {imagePreview ? (
          <div className="relative">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-dashed">
              <Image
                src={imagePreview}
                alt="Preview del comprobante"
                fill
                className="object-contain"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4 mr-1" />
              Quitar
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="proofImage"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-10 w-10 text-gray-400 mb-3" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click para subir</span> o arrastra
                  aquí
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG o WEBP (MAX. 5MB)
                </p>
              </div>
              <input
                id="proofImage"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading}
              />
            </label>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Asegúrate de que se vea claramente el monto y número de operación
        </p>
      </div>

      {/* Botón de Envío */}
      <Button type="submit" disabled={loading || !reference || !imageFile} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Subiendo comprobante...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Enviar Comprobante
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Al enviar confirmas que realizaste el pago del monto exacto
      </p>
    </form>
  );
}