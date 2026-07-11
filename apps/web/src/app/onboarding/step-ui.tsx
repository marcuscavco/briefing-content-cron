"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * UI compartilhada dos passos do onboarding.
 * - Barra de ações fixa no rodapé no mobile (botão grande + voltar redondo).
 * - Loading sem "pular linha": a seta e o spinner ocupam o MESMO slot de
 *   tamanho fixo, então trocar um pelo outro não desloca o texto.
 */

function IconRight() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconLeft() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
    />
  );
}

/** Slot fixo à direita do label: seta quando ocioso, spinner quando pendente. */
function TrailSlot({ pending, showArrow }: { pending: boolean; showArrow: boolean }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center">
      {pending ? <Spinner /> : showArrow ? <IconRight /> : null}
    </span>
  );
}

const primaryCls = "w-full justify-center gap-2 md:w-auto md:min-w-52 md:px-10";

/** Botão primário com pending controlado (fluxos com useTransition). */
export function ActionPrimary({
  pending = false,
  showArrow = true,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: boolean; showArrow?: boolean }) {
  return (
    <Button
      size="lg"
      {...props}
      disabled={props.disabled || pending}
      className={cn(primaryCls, className)}
    >
      <span>{children}</span>
      <TrailSlot pending={pending} showArrow={showArrow} />
    </Button>
  );
}

/** Botão de submit de server action (usa useFormStatus para o loading real). */
export function SubmitPrimary({
  showArrow = true,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { showArrow?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      {...props}
      disabled={props.disabled || pending}
      className={cn(primaryCls, className)}
    >
      <span>{children}</span>
      <TrailSlot pending={pending} showArrow={showArrow} />
    </Button>
  );
}

/** Botão redondo de voltar (setinha), usado na barra fixa. */
export function BackButton({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Voltar"
      className="grid size-12 shrink-0 place-items-center rounded-full border border-white/12 bg-white/5 text-foreground transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 active:scale-95 disabled:opacity-40 md:size-11"
    >
      <IconLeft />
    </button>
  );
}

/**
 * Barra de ações: fixa no rodapé no mobile (vidro, sempre visível), estática
 * no desktop. O conteúdo pai deve ter padding-bottom no mobile (pb-28) para
 * não ficar escondido atrás dela.
 */
export function StepActions({
  onBack,
  backDisabled,
  children,
}: {
  onBack?: () => void;
  backDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-3xl items-center gap-3 border-t border-white/10 bg-[#0b0a08]/90 px-5 py-3.5 backdrop-blur-xl md:relative md:z-auto md:mx-0 md:max-w-none md:flex-wrap md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
      {onBack && <BackButton onClick={onBack} disabled={backDisabled} />}
      <div className="min-w-0 flex-1 md:flex-none">{children}</div>
    </div>
  );
}
