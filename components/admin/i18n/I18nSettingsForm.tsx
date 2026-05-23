"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CURRENCY_LABEL,
  LOCALE_LABEL,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  type SupportedCurrency,
  type SupportedLocale,
} from "@/lib/i18n/types";
import { formatPrice } from "@/lib/i18n/format";
import { updateI18nSettings } from "@/actions/i18n-settings";

interface I18nSettingsFormProps {
  initial: {
    defaultLocale: SupportedLocale;
    defaultCurrency: SupportedCurrency;
  };
}

const PREVIEW_AMOUNT = 1234.5;

export default function I18nSettingsForm({ initial }: I18nSettingsFormProps) {
  const [locale, setLocale] = useState<SupportedLocale>(initial.defaultLocale);
  const [currency, setCurrency] = useState<SupportedCurrency>(
    initial.defaultCurrency,
  );
  const [isPending, startTransition] = useTransition();

  const preview = formatPrice(PREVIEW_AMOUNT, { locale, currency });

  function handleSave() {
    startTransition(async () => {
      const result = await updateI18nSettings({
        defaultLocale: locale,
        defaultCurrency: currency,
      });
      if (result.success) {
        toast.success("Configuración de idioma guardada");
      } else {
        toast.error(result.error ?? "Error al guardar");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="locale">Idioma por defecto</Label>
          <Select
            value={locale}
            onValueChange={(v) => setLocale(v as SupportedLocale)}
          >
            <SelectTrigger id="locale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((l) => (
                <SelectItem key={l} value={l}>
                  {LOCALE_LABEL[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define el formato de fechas, números y precios del storefront.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Moneda por defecto</Label>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as SupportedCurrency)}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CURRENCY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Símbolo y código de moneda usados en precios. Los importes en BD
            no se convierten — sólo cambia el formato visual.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="text-sm font-medium text-muted-foreground">
          Vista previa
        </p>
        <p className="mt-1 font-mono text-lg">{preview}</p>
        <p className="text-xs text-muted-foreground">
          {LOCALE_LABEL[locale]} · {CURRENCY_LABEL[currency]}
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
