"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { StatusBadge, TierBadge } from "./status-badge";
import { PreviewCards } from "./preview-cards";
import {
  confirmWizardSource,
  probeWizardSource,
  verifyInstagramProfile,
  type InstagramCheckResult,
  type ProbeResult,
  type WizardPayload,
} from "./actions";

type Suggestion = {
  id: string;
  name: string;
  description: string | null;
  suggested_tier: number;
  country: string;
  requires_credential: boolean;
};

type Step = "pick" | "type" | "input" | "validate";

/**
 * Wizard de adição de fonte (decisão de UX do Marcus):
 * pick   → lista as fontes predefinidas + botão "fonte completamente nova"
 * type   → site ou Instagram (só para fonte nova)
 * input  → link do site OU link/@/usuario do Instagram
 * validate → coleta ao vivo das últimas 48h + relevância aos temas → confirmar
 * Fonte da biblioteca pula direto para validate.
 */
export function AddSourceWizard({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pick");
  const [payload, setPayload] = useState<WizardPayload | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [kind, setKind] = useState<"site" | "instagram">("site");
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [igProfile, setIgProfile] = useState<InstagramCheckResult | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [added, setAdded] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [probing, startProbe] = useTransition();
  const [confirming, startConfirm] = useTransition();

  const runProbe = (p: WizardPayload, label: string) => {
    setPayload(p);
    setSourceLabel(label);
    setProbe(null);
    setAdded(false);
    setConfirmError(null);
    setStep("validate");
    startProbe(async () => {
      setProbe(await probeWizardSource(p));
    });
  };

  const confirm = () => {
    if (!payload || !probe) return;
    startConfirm(async () => {
      const result = await confirmWizardSource(payload, probe);
      if (result.ok) {
        setAdded(true);
        router.refresh();
      } else {
        setConfirmError(result.error ?? "não foi possível adicionar");
      }
    });
  };

  const goBack = () => {
    if (step === "validate") {
      setProbe(null);
      setAdded(false);
      setConfirmError(null);
      setStep(payload?.kind === "library" ? "pick" : "input");
      return;
    }
    if (step === "input") {
      setInputError(null);
      setStep("type");
      return;
    }
    if (step === "type") setStep("pick");
  };

  const reset = () => {
    setStep("pick");
    setIgProfile(null);
    setInputError(null);
    setPayload(null);
    setProbe(null);
    setAdded(false);
    setConfirmError(null);
    setUrl("");
    setHandle("");
  };

  const relevantSet = new Set(probe?.relevant ?? []);

  return (
    <div className="flex flex-col gap-5">
      {/* stepper (só no fluxo de fonte nova) */}
      {step !== "pick" && (
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <button type="button" onClick={reset} className="hover:text-foreground">
            ← início
          </button>
          {payload?.kind !== "library" && (
            <>
              <span>·</span>
              <span className={step === "type" ? "text-foreground" : ""}>1 tipo</span>
              <span>·</span>
              <span className={step === "input" ? "text-foreground" : ""}>2 fonte</span>
              <span>·</span>
              <span className={step === "validate" ? "text-foreground" : ""}>3 validação</span>
            </>
          )}
          {payload?.kind === "library" && (
            <>
              <span>·</span>
              <span className="text-foreground">validação</span>
            </>
          )}
        </div>
      )}

      {/* PASSO: escolher da biblioteca ou fonte nova */}
      {step === "pick" && (
        <div className="flex flex-col gap-4">
          <Button onClick={() => setStep("type")} className="w-full justify-between">
            Adicionar uma fonte completamente nova
            <span className="flex size-8 items-center justify-center rounded-full bg-black/10">＋</span>
          </Button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-white/8" />
            ou escolha da biblioteca
            <span className="h-px flex-1 bg-white/8" />
          </div>

          <ul className="flex max-h-[46dvh] flex-col gap-2 overflow-y-auto pr-1">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => runProbe({ kind: "library", suggestedId: s.id }, s.name)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <TierBadge tier={s.suggested_tier} />
                      <span className="text-xs text-muted-foreground">{s.country}</span>
                      {s.requires_credential && (
                        <span className="text-xs text-amber-400">assinatura</span>
                      )}
                    </span>
                    {s.description && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {s.description}
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">→</span>
                </button>
              </li>
            ))}
            {suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Você já adicionou todas as fontes da biblioteca.
              </p>
            )}
          </ul>
        </div>
      )}

      {/* PASSO 1: tipo */}
      {step === "type" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { id: "site", title: "Site ou portal", desc: "Qualquer site de notícias ou blog — a gente descobre o feed sozinho." },
              { id: "instagram", title: "Perfil do Instagram", desc: "Posts das últimas 24h viram itens do briefing (planos com social)." },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setKind(opt.id);
                setStep("input");
              }}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border p-5 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5",
                "border-white/8 bg-white/[0.03] hover:border-white/20",
              )}
            >
              <span className="font-display text-base font-medium">
                {opt.id === "site" ? "🌐 " : "📸 "}
                {opt.title}
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* PASSO 2: link */}
      {step === "input" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setInputError(null);
            if (kind === "site") {
              const withProto = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
              runProbe({ kind: "site", url: withProto }, withProto);
              return;
            }
            // Instagram: 1º confere se o perfil existe (barato, ~1s) — errou o
            // @, falha aqui; só então gastamos a coleta de posts no provedor.
            startCheck(async () => {
              const check = await verifyInstagramProfile(handle);
              if (!check.ok) {
                setInputError(check.error ?? "perfil inválido");
                return;
              }
              setIgProfile(check);
              runProbe({ kind: "instagram", handle: check.handle! }, `@${check.handle}`);
            });
          }}
        >
          {kind === "site" ? (
            <div className="grid gap-2">
              <Label htmlFor="wiz-url">Endereço do site</Label>
              <Input
                id="wiz-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="exemplo.com.br"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Cole a home ou a URL do feed — validamos e descobrimos o resto.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="wiz-handle">Perfil do Instagram</Label>
              <Input
                id="wiz-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
                placeholder="link do perfil, @usuario ou usuario"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Aceitamos o link completo, @usuario ou só o nome do perfil.
              </p>
            </div>
          )}
          {inputError && <p className="text-sm text-destructive">{inputError}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep("type")} disabled={checking}>
              Voltar
            </Button>
            <Button type="submit" disabled={checking}>
              {checking && (
                <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
              )}
              {checking ? "Verificando perfil…" : "Validar fonte →"}
            </Button>
          </div>
        </form>
      )}

      {/* PASSO 3: validação com coleta ao vivo + relevância */}
      {step === "validate" && (
        <div className="flex flex-col gap-4">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{sourceLabel}</span>
            {igProfile?.ok && !igProfile.unverified && (
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[11px] text-amber-300">
                ✓ perfil encontrado{igProfile.fullName ? `: ${igProfile.fullName}` : ""}
                {typeof igProfile.followers === "number"
                  ? ` · ${new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(igProfile.followers)} seguidores`
                  : ""}
              </span>
            )}
          </p>

          {probing && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-6 text-sm text-muted-foreground">
              <span className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
              Coletando as últimas 48 horas e comparando com os seus temas…
            </div>
          )}

          {!probing && probe && (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge status={probe.status} label={probe.status} />
                <span className="text-muted-foreground">
                  {probe.itemCount > 0
                    ? `${probe.itemCount} itens coletados`
                    : (probe.error ?? "nada encontrado na janela")}
                </span>
                {probe.relevant !== null && probe.itemCount > 0 && (
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px]",
                      probe.relevant.length > 0
                        ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                        : "border-amber-400/25 bg-amber-400/10 text-amber-300",
                    )}
                  >
                    {probe.relevant.length > 0
                      ? `✦ ${probe.relevant.length} de ${probe.preview.length} têm a ver com seus temas`
                      : "nenhum item recente bate com seus temas"}
                  </span>
                )}
              </div>

              <PreviewCards
                items={probe.preview.map((p, i) => ({
                  ...p,
                  relevant: relevantSet.has(i),
                }))}
              />

              {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}

              {!added ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" onClick={goBack} disabled={confirming}>
                    Voltar
                  </Button>
                  {probe.ok && (
                    <Button type="button" onClick={confirm} disabled={confirming}>
                      {confirming && (
                        <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
                      )}
                      {confirming ? "Adicionando…" : "Confirmar e adicionar fonte"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-amber-300">✓ Fonte adicionada ao seu briefing!</p>
                  <Button type="button" variant="outline" size="sm" onClick={reset}>
                    Adicionar outra
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
