"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkSubscriptionEligibility } from "@/actions/subscription-eligibility";
import {
  sendSubscriptionVerificationCode,
  verifySubscriptionCode,
} from "@/actions/subscription-verification";
import type { SubscriptionConfig } from "@/lib/promotions/types";

interface SubscriptionOptInProps {
  config: SubscriptionConfig;
  unitPrice: number;
  optedIn: boolean;
  email: string;
  onToggle: (next: boolean) => void;
  onEmailChange: (email: string) => void;
  /** Called with `true` only when the email is eligible AND verified. */
  onVerifiedChange: (verified: boolean) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Stage = "idle" | "eligible" | "code-sent" | "verified";
type EligibilityError =
  | "RATE_LIMITED"
  | "INVALID_EMAIL"
  | "DISPOSABLE"
  | "ALREADY_SUBSCRIBED"
  | null;

export default function SubscriptionOptIn({
  config,
  unitPrice,
  optedIn,
  email,
  onToggle,
  onEmailChange,
  onVerifiedChange,
}: SubscriptionOptInProps) {
  const isPercent = config.discountType === "PERCENT";
  const trimmed = email.trim();
  const isEmailValid = EMAIL_RE.test(trimmed);
  const ctaLabel =
    config.ctaLabel?.trim() ||
    (isPercent
      ? `Suscríbete y obtén ${config.discountValue}% de descuento`
      : `Suscríbete y obtén S/ ${config.discountValue.toFixed(2)} de descuento`);
  const discountPreview = isPercent
    ? `${config.discountValue}% off`
    : `S/ ${Math.min(config.discountValue, unitPrice).toFixed(2)} off`;

  const [stage, setStage] = useState<Stage>("idle");
  const [eligibilityError, setEligibilityError] = useState<EligibilityError>(null);
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Debounced eligibility probe — soft check that informs UX but does NOT
  // gate the discount; the discount is gated by `verified` below.
  useEffect(() => {
    if (!optedIn || !isEmailValid) {
      setStage("idle");
      setEligibilityError(null);
      onVerifiedChange(false);
      return;
    }
    let cancelled = false;
    const handler = setTimeout(async () => {
      try {
        const { eligible, reason } = await checkSubscriptionEligibility(trimmed);
        if (cancelled) return;
        if (!eligible) {
          setStage("idle");
          setEligibilityError(
            (reason === "RATE_LIMITED" ||
              reason === "INVALID_EMAIL" ||
              reason === "DISPOSABLE" ||
              reason === "ALREADY_SUBSCRIBED")
              ? reason
              : null
          );
          onVerifiedChange(false);
        } else {
          // Only move to "eligible" if not already past it (e.g. user edited
          // email after sending a code — we don't auto-rollback that flow).
          setEligibilityError(null);
          setStage((prev) =>
            prev === "idle" || prev === "eligible" ? "eligible" : prev
          );
        }
      } catch {
        if (!cancelled) {
          setStage("idle");
          setEligibilityError(null);
          onVerifiedChange(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optedIn, trimmed, isEmailValid]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // If the user changes their email after sending/verifying, reset state.
  useEffect(() => {
    if (stage === "code-sent" || stage === "verified") {
      setStage(isEmailValid ? "eligible" : "idle");
      setCode("");
      setCodeError(null);
      onVerifiedChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  const handleSendCode = async () => {
    setCodeError(null);
    setSendingCode(true);
    try {
      const result = await sendSubscriptionVerificationCode(trimmed);
      if (!result.success) {
        const msg =
          result.error === "RATE_LIMITED"
            ? "Demasiados intentos. Espera unos minutos."
            : result.error === "ALREADY_SUBSCRIBED"
              ? "Este correo ya está suscrito."
              : result.error === "DISPOSABLE"
                ? "No aceptamos correos desechables."
                : result.error === "INVALID_EMAIL"
                  ? "Correo inválido."
                  : "No pudimos enviar el código. Intenta de nuevo.";
        setCodeError(msg);
        return;
      }
      setStage("code-sent");
      setResendCooldown(45);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setCodeError("El código tiene 6 dígitos.");
      return;
    }
    setCodeError(null);
    setVerifyingCode(true);
    try {
      const result = await verifySubscriptionCode(trimmed, code);
      if (!result.success) {
        const msg =
          result.error === "RATE_LIMITED"
            ? "Demasiados intentos. Espera unos minutos."
            : result.error === "CODE_EXPIRED"
              ? "El código expiró. Solicita uno nuevo."
              : result.error === "MAX_ATTEMPTS"
                ? "Máximo de intentos. Solicita un código nuevo."
                : result.error === "NO_CODE_REQUESTED"
                  ? "Solicita un código primero."
                  : "Código incorrecto.";
        setCodeError(msg);
        return;
      }
      setStage("verified");
      onVerifiedChange(true);
    } finally {
      setVerifyingCode(false);
    }
  };

  const eligibilityNote = (() => {
    if (!optedIn || !isEmailValid) return null;
    switch (eligibilityError) {
      case "ALREADY_SUBSCRIBED":
        return "Este correo ya está suscrito. El descuento solo aplica para nuevos suscriptores.";
      case "DISPOSABLE":
        return "No aceptamos correos desechables para este descuento.";
      case "RATE_LIMITED":
        return "Demasiados intentos. Espera un momento e inténtalo otra vez.";
      case "INVALID_EMAIL":
        return "Correo inválido.";
      default:
        return null;
    }
  })();

  return (
    <div
      className={cn(
        "rounded-xl border-2 transition-colors",
        stage === "verified"
          ? "border-emerald-400 bg-emerald-50/50"
          : optedIn
            ? "border-blue-400 bg-blue-50/50"
            : "border-slate-200 bg-white"
      )}
    >
      <label className="flex cursor-pointer items-start gap-3 p-3">
        <input
          type="checkbox"
          checked={optedIn}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Mail className="h-4 w-4 text-blue-600" />
            <span>{ctaLabel}</span>
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {discountPreview}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifica tu correo para aplicar el descuento. Te inscribiremos al
            newsletter al confirmar el pedido.
          </p>
        </div>
      </label>

      {optedIn && (
        <div className="space-y-2 border-t border-blue-200 px-3 py-2">
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="tu@correo.com"
            disabled={stage === "verified"}
            className={cn(
              "h-9 w-full rounded-md border bg-white px-3 text-sm outline-none transition-colors disabled:opacity-60",
              email.length > 0 && !isEmailValid
                ? "border-rose-400 focus:border-rose-500"
                : eligibilityError
                  ? "border-amber-400 focus:border-amber-500"
                  : "border-slate-300 focus:border-blue-500"
            )}
            autoComplete="email"
            inputMode="email"
          />

          {email.length > 0 && !isEmailValid && (
            <p className="text-[11px] text-rose-600">
              Ingresa un correo válido.
            </p>
          )}

          {eligibilityNote && (
            <p className="text-[11px] text-amber-700">{eligibilityNote}</p>
          )}

          {stage === "eligible" && isEmailValid && !eligibilityError && (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {sendingCode && <Loader2 className="h-3 w-3 animate-spin" />}
              Enviar código de verificación
            </button>
          )}

          {(stage === "code-sent" || stage === "verified") && (
            <div className="space-y-1.5">
              <label className="block text-[11px] text-muted-foreground">
                Te enviamos un código a {trimmed}. Ingrésalo aquí:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={stage === "verified"}
                  placeholder="000000"
                  className={cn(
                    "h-9 flex-1 rounded-md border bg-white px-3 text-center font-mono text-base tracking-[0.4em] outline-none transition-colors disabled:opacity-60",
                    codeError
                      ? "border-rose-400 focus:border-rose-500"
                      : stage === "verified"
                        ? "border-emerald-400"
                        : "border-slate-300 focus:border-blue-500"
                  )}
                />
                {stage !== "verified" && (
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || code.length !== 6}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {verifyingCode && <Loader2 className="h-3 w-3 animate-spin" />}
                    Verificar
                  </button>
                )}
              </div>

              {codeError && (
                <p className="text-[11px] text-rose-600">{codeError}</p>
              )}

              {stage === "code-sent" && !codeError && (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || resendCooldown > 0}
                  className="text-[11px] text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? `Reenviar código (${resendCooldown}s)`
                    : "Reenviar código"}
                </button>
              )}

              {stage === "verified" && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Correo verificado. Descuento aplicado.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
