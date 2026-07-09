"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatBrPhone, maskBrInput } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  addDestinationAndSendCode,
  confirmCode,
  removeDestination,
  resendCode,
  toggleDestination,
} from "./delivery-actions";

export type Destination = {
  id: string;
  phone: string;
  label: string | null;
  kind: string;
  verified: boolean;
  active: boolean;
};

type Step = "channel" | "phone" | "code" | "done";

/**
 * Destinos de entrega no padrão wizard (decisão do Marcus): canal (email
 * desativado por enquanto) → número BR com máscara → código de verificação no
 * MESMO fluxo → verificado. Grupos não são mais aceitos pela UI.
 */
export function WhatsappDestinations({ destinations }: { destinations: Destination[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("channel");
  const [masked, setMasked] = useState("");
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [destId, setDestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const openWizard = () => {
    setStep("channel");
    setMasked("");
    setLabel("");
    setCode("");
    setDestId(null);
    setError(null);
    setNotice(null);
    setOpen(true);
  };

  /** Retomar verificação de um destino pendente: direto no passo do código. */
  const resumeVerification = (d: Destination) => {
    setStep("code");
    setMasked(formatBrPhone(d.phone));
    setDestId(d.id);
    setCode("");
    setError(null);
    setNotice(null);
    setOpen(true);
    start(async () => {
      const r = await resendCode(d.id);
      if (!r.ok) setError(r.error ?? "não foi possível enviar o código");
      else setNotice("Código enviado! Confira o WhatsApp.");
    });
  };

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await addDestinationAndSendCode(masked, label);
      if (!r.ok) {
        setError(r.error ?? "não foi possível adicionar");
        if (r.destinationId) setDestId(r.destinationId); // inseriu mas não enviou
        return;
      }
      setDestId(r.destinationId!);
      setNotice(null);
      setStep("code");
    });
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destId) return;
    setError(null);
    start(async () => {
      const r = await confirmCode(destId, code);
      if (!r.ok) {
        setError(r.error ?? "código incorreto");
        return;
      }
      setStep("done");
      router.refresh();
    });
  };

  const resend = () => {
    if (!destId) return;
    setError(null);
    start(async () => {
      const r = await resendCode(destId);
      if (!r.ok) setError(r.error ?? "não foi possível reenviar");
      else setNotice("Código reenviado! Confira o WhatsApp.");
    });
  };

  const spinner = (
    <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* lista: sempre com máscara BR + status verificado/ativo */}
      {destinations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum destino ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {destinations.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-medium tabular-nums">{formatBrPhone(d.phone)}</span>
                {d.label && <span className="text-xs text-muted-foreground">{d.label}</span>}
                {d.kind === "group" && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">
                    grupo
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px]",
                    d.verified
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                      : "border-amber-400/25 bg-amber-400/10 text-amber-300",
                  )}
                >
                  {d.verified ? "✓ verificado" : "pendente"}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px]",
                    d.active
                      ? "border-white/10 bg-white/5 text-foreground"
                      : "border-white/10 bg-white/5 text-muted-foreground",
                  )}
                >
                  {d.active ? "ativo" : "pausado"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {!d.verified && d.kind !== "group" && (
                  <Button size="sm" variant="outline" onClick={() => resumeVerification(d)}>
                    Verificar
                  </Button>
                )}
                {d.verified && (
                  <form action={toggleDestination}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="active" value={String(!d.active)} />
                    <SubmitButton size="sm" variant="ghost">
                      {d.active ? "Pausar" : "Reativar"}
                    </SubmitButton>
                  </form>
                )}
                <form action={removeDestination}>
                  <input type="hidden" name="id" value={d.id} />
                  <SubmitButton size="sm" variant="ghost" className="text-destructive">
                    Remover
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={openWizard} className="w-fit">
        + Adicionar destino
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Adicionar destino"
        description="O briefing chega em 2 mensagens por dia no destino verificado."
      >
        <div className="flex flex-col gap-5">
          {/* stepper */}
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className={step === "channel" ? "text-foreground" : ""}>1 canal</span>
            <span>·</span>
            <span className={step === "phone" ? "text-foreground" : ""}>2 número</span>
            <span>·</span>
            <span className={step === "code" || step === "done" ? "text-foreground" : ""}>
              3 verificação
            </span>
          </div>

          {step === "channel" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-white/20"
              >
                <span className="font-display text-base font-medium">💬 WhatsApp</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Digest + posts sugeridos, todo dia no seu número.
                </span>
              </button>
              <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.015] p-5 opacity-50">
                <span className="font-display text-base font-medium">✉️ Email</span>
                <span className="text-xs leading-relaxed text-muted-foreground">Em breve.</span>
              </div>
            </div>
          )}

          {step === "phone" && (
            <form onSubmit={submitPhone} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dest-phone">Número do WhatsApp</Label>
                <Input
                  id="dest-phone"
                  inputMode="tel"
                  autoFocus
                  required
                  placeholder="(85) 99999-0000"
                  value={masked}
                  onChange={(e) => setMasked(maskBrInput(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  DDD + número, com o 9. Enviaremos um código de 6 dígitos para confirmar.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dest-label">Apelido (opcional)</Label>
                <Input
                  id="dest-label"
                  placeholder="Meu número"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep("channel")} disabled={pending}>
                  Voltar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && spinner}
                  {pending ? "Enviando código…" : "Enviar código →"}
                </Button>
              </div>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={submitCode} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Enviamos um código de 6 dígitos para{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {masked.startsWith("+") ? masked : `+55 ${masked}`}
                </span>
                . Ele expira em 15 minutos.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="dest-code">Código de verificação</Label>
                <Input
                  id="dest-code"
                  inputMode="numeric"
                  autoFocus
                  required
                  maxLength={6}
                  placeholder="••••••"
                  className="max-w-40 text-center font-mono text-lg tracking-[0.35em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              {notice && !error && <p className="text-sm text-emerald-300">{notice}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={pending || code.length !== 6}>
                  {pending && spinner}
                  {pending ? "Confirmando…" : "Confirmar código"}
                </Button>
                <button
                  type="button"
                  onClick={resend}
                  disabled={pending}
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  reenviar código
                </button>
              </div>
            </form>
          )}

          {step === "done" && (
            <div className="flex flex-col items-start gap-4 py-2">
              <p className="text-sm text-emerald-300">
                ✓ Destino verificado! O próximo briefing chega em{" "}
                <span className="font-medium tabular-nums">
                  {masked.startsWith("+") ? masked : `+55 ${masked}`}
                </span>
                .
              </p>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
