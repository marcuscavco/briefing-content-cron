"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { THEME_TAXONOMY } from "@/lib/themes";
import { maskBrInput } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  addDestinationAndSendCode,
  confirmCode,
  resendCode,
} from "@/app/(app)/settings/delivery-actions";
import {
  confirmSources,
  finishOnboarding,
  sampleHeadlines,
  saveBriefingName,
  saveThemes,
  type SampleSource,
} from "./actions";

type Suggestion = {
  id: string;
  name: string;
  description: string | null;
  suggested_tier: number;
  category: string;
  country: string;
  is_free: boolean;
};

type Step = "name" | "cats" | "subs" | "sources" | "phone" | "code" | "review";

/** Mapa tema → categorias do catálogo de fontes. */
const SOURCE_CATEGORY_MAP: Record<string, string[]> = {
  tecnologia: ["tecnologia"],
  negocios: ["negocios"],
  economia: ["economia"],
  marketing: ["negocios"],
  juridico: ["economia", "geral"],
  politica: ["geral", "economia"],
  ciencia: ["geral", "tecnologia"],
};

// O passo 1 é a criação de conta (mesmo fluxo, pré-sessão); o wizard continua do 2.
const STEP_NUMBER: Partial<Record<Step, number>> = {
  name: 2,
  cats: 3,
  subs: 4,
  sources: 5,
  phone: 6,
  code: 6,
  review: 7,
};
const TOTAL_STEPS = 7;

const CATEGORY_EMOJI: Record<string, string> = {
  tecnologia: "💻",
  negocios: "📈",
  economia: "🏦",
  marketing: "📣",
  juridico: "⚖️",
  politica: "🏛️",
  ciencia: "🔬",
};

const SECTIONS_PREVIEW = [
  { label: "🔥 Must-read", explain: "O que realmente merece sua leitura: leia isto e você está por dentro." },
  { label: "📌 Relevante", explain: "Vale saber que aconteceu; aprofunde só se tocar o seu negócio." },
  { label: "📎 No radar", explain: "Sinais e movimentos para acompanhar de longe." },
  { label: "📱 Posts sugeridos", explain: "Ideias prontas de conteúdo para suas redes, no seu tom." },
];

const spinner = (
  <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
);

export function OnboardingWizard({
  firstName,
  initialName,
  initialThemes,
  sourcesCount,
  verifiedMasked,
  suggestions,
}: {
  firstName: string;
  initialName: string;
  initialThemes: string[];
  sourcesCount: number;
  verifiedMasked: string | null;
  suggestions: Suggestion[];
}) {
  const router = useRouter();

  // Retomada: quem abandonou volta para o primeiro passo incompleto.
  const initialStep: Step = verifiedMasked
    ? "review"
    : sourcesCount > 0
      ? "phone"
      : initialThemes.length > 0
        ? "sources"
        : "name";

  const [step, setStep] = useState<Step>(initialStep);
  const [name, setName] = useState(initialName);
  const [cats, setCats] = useState<Set<string>>(() => {
    const chosen = THEME_TAXONOMY.filter((c) => c.subs.some((s) => initialThemes.includes(s)));
    return new Set(chosen.map((c) => c.id));
  });
  const [subs, setSubs] = useState<Set<string>>(new Set(initialThemes));
  const [pickedSources, setPickedSources] = useState<Set<string>>(new Set());
  const [confirmedSources, setConfirmedSources] = useState(sourcesCount);
  const [masked, setMasked] = useState(verifiedMasked ?? "");
  const [verified, setVerified] = useState<string | null>(verifiedMasked);
  const [destId, setDestId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sample, setSample] = useState<SampleSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Amostra real: começa a buscar em paralelo enquanto a pessoa verifica o número.
  const sampleRequested = useRef(false);
  useEffect(() => {
    if ((step === "phone" || step === "code" || step === "review") && !sampleRequested.current) {
      sampleRequested.current = true;
      sampleHeadlines()
        .then(setSample)
        .catch(() => setSample([]));
    }
  }, [step]);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  /** Fontes sugeridas para as categorias escolhidas (BR primeiro, máx 6). */
  const suggestedForThemes = (): Suggestion[] => {
    const wanted = new Set([...cats].flatMap((c) => SOURCE_CATEGORY_MAP[c] ?? []));
    const matches = suggestions.filter((s) => wanted.has(s.category));
    const br = matches.filter((s) => s.country === "BR");
    const rest = matches.filter((s) => s.country !== "BR");
    const list = [...br, ...rest];
    // garante um mínimo saudável mesmo para temas com pouco catálogo
    for (const s of suggestions.filter((x) => x.country === "BR")) {
      if (list.length >= 6) break;
      if (!list.includes(s)) list.push(s);
    }
    return list.slice(0, 6);
  };

  const [sourceOptions, setSourceOptions] = useState<Suggestion[]>([]);

  const openSourcesStep = () => {
    const opts = suggestedForThemes();
    setSourceOptions(opts);
    setPickedSources(new Set(opts.map((o) => o.id)));
    go("sources");
  };

  const progress = STEP_NUMBER[step];

  return (
    <div className="flex flex-col gap-10">
      {/* progresso discreto */}
      {progress && (
        <div className="rise flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>
            passo {progress} de {TOTAL_STEPS}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 w-6 rounded-full transition-colors duration-500",
                  i < progress ? "bg-amber-400/70" : "bg-white/10",
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 1. Nome ────────────────────────────────────────────────────── */}
      {step === "name" && (
        <section key="name" className="rise flex flex-col gap-8">
          <h1 className="font-display text-3xl font-medium leading-[1.08] tracking-tight md:text-5xl">
            {firstName ? `${firstName}, como` : "Como"} vai se chamar o seu briefing?
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            É só um apelido. Aparece no painel e pode mudar quando quiser.
          </p>
          <form
            className="flex max-w-md flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await saveBriefingName(name);
                if (!r.ok) setError(r.error ?? "tente de novo");
                else go("cats");
              });
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="h-14 rounded-3xl text-lg"
              placeholder="Ex.: Radar do dia, Meu briefing…"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit sm:px-12">
              {pending && spinner}
              Continuar →
            </Button>
          </form>
        </section>
      )}

      {/* ── 2. Temas: categorias ───────────────────────────────────────── */}
      {step === "cats" && (
        <section key="cats" className="rise flex flex-col gap-8">
          <h1 className="font-display text-3xl font-medium leading-[1.08] tracking-tight md:text-5xl">
            Sobre o que você quer ficar por dentro?
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Marque quantas áreas quiser. Dá para refinar no próximo passo.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEME_TAXONOMY.map((cat) => {
              const on = cats.has(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setCats((prev) => {
                      const next = new Set(prev);
                      if (next.has(cat.id)) {
                        next.delete(cat.id);
                        setSubs((ps) => {
                          const ns = new Set(ps);
                          for (const s of cat.subs) ns.delete(s);
                          return ns;
                        });
                      } else {
                        next.add(cat.id);
                        setSubs((ps) => new Set([...ps, ...cat.subs]));
                      }
                      return next;
                    });
                  }}
                  className={cn(
                    "flex min-h-28 flex-col items-start justify-between gap-2 rounded-3xl border p-5 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                    on
                      ? "border-amber-400/40 bg-amber-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
                  )}
                >
                  <span className="text-2xl">{CATEGORY_EMOJI[cat.id] ?? "•"}</span>
                  <span className="font-display text-sm font-medium leading-tight">
                    {cat.label}
                  </span>
                  <span className={cn("text-[11px]", on ? "text-amber-300" : "text-muted-foreground")}>
                    {on ? "✓ selecionado" : `${cat.subs.length} subtemas`}
                  </span>
                </button>
              );
            })}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => go("name")}>
              Voltar
            </Button>
            <Button
              size="lg"
              className="px-12"
              disabled={cats.size === 0}
              onClick={() => go("subs")}
            >
              Continuar →
            </Button>
          </div>
        </section>
      )}

      {/* ── 3. Temas: refinar ──────────────────────────────────────────── */}
      {step === "subs" && (
        <section key="subs" className="rise flex flex-col gap-8">
          <h1 className="font-display text-3xl font-medium leading-[1.08] tracking-tight md:text-5xl">
            Quer refinar?
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Deixamos tudo marcado: desmarque o que <em>não</em> interessa. Ou siga direto.
          </p>
          <div className="flex flex-col gap-3">
            {THEME_TAXONOMY.filter((c) => cats.has(c.id)).map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <p className="font-display mb-2.5 text-sm font-medium">
                  {CATEGORY_EMOJI[cat.id]} {cat.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.subs.map((sub) => {
                    const on = subs.has(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setSubs((prev) => {
                            const next = new Set(prev);
                            if (next.has(sub)) next.delete(sub);
                            else next.add(sub);
                            return next;
                          })
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]",
                          on
                            ? "border-amber-400/30 bg-amber-400/15 text-amber-200"
                            : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => go("cats")} disabled={pending}>
              Voltar
            </Button>
            <Button
              size="lg"
              className="px-12"
              disabled={pending || subs.size === 0}
              onClick={() =>
                start(async () => {
                  const r = await saveThemes([...subs]);
                  if (!r.ok) setError(r.error ?? "tente de novo");
                  else openSourcesStep();
                })
              }
            >
              {pending && spinner}
              {subs.size === [...cats].reduce((n, c) => n + (THEME_TAXONOMY.find((x) => x.id === c)?.subs.length ?? 0), 0)
                ? "Manter tudo e continuar →"
                : "Continuar →"}
            </Button>
          </div>
        </section>
      )}

      {/* ── 4. Fontes sugeridas ────────────────────────────────────────── */}
      {step === "sources" && (
        <section key="sources" className="rise flex flex-col gap-8">
          <h1 className="font-display text-3xl font-medium leading-[1.08] tracking-tight md:text-5xl">
            Escolhemos estas fontes para você.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Portais confiáveis e gratuitos que casam com seus temas. Dá para adicionar, trocar e
            remover depois, na área de Fontes.
          </p>
          <ul className="flex flex-col gap-2">
            {sourceOptions.map((s) => {
              const on = pickedSources.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setPickedSources((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      })
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      on
                        ? "border-amber-400/30 bg-amber-400/[0.07]"
                        : "border-white/8 bg-white/[0.02] opacity-60 hover:opacity-100",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{s.name}</span>
                      {s.description && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {s.description}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                        on
                          ? "border-amber-400/40 bg-amber-400/20 text-amber-200"
                          : "border-white/15 text-transparent",
                      )}
                    >
                      ✓
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => go("subs")} disabled={pending}>
              Voltar
            </Button>
            <Button
              size="lg"
              className="px-12"
              disabled={pending || pickedSources.size === 0}
              onClick={() =>
                start(async () => {
                  const r = await confirmSources([...pickedSources]);
                  if (!r.ok) setError(r.error ?? "tente de novo");
                  else {
                    setConfirmedSources(r.added + confirmedSources);
                    go("phone");
                  }
                })
              }
            >
              {pending && spinner}
              Usar estas fontes →
            </Button>
          </div>
        </section>
      )}

      {/* ── 5a. WhatsApp: número ───────────────────────────────────────── */}
      {step === "phone" && (
        <section key="phone" className="rise flex flex-col gap-8">
          <h1 className="font-display text-3xl font-medium leading-[1.08] tracking-tight md:text-5xl">
            Onde o briefing te encontra?
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Seu briefing chega todo dia às 7h neste WhatsApp. Enviaremos um código de 6 dígitos
            para confirmar que é você.
          </p>
          <form
            className="flex max-w-md flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await addDestinationAndSendCode(masked);
                if (!r.ok) {
                  setError(r.error ?? "não foi possível enviar o código");
                  if (r.destinationId) setDestId(r.destinationId);
                  return;
                }
                setDestId(r.destinationId!);
                setNotice(null);
                go("code");
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="ob-phone">Seu número (com DDD)</Label>
              <Input
                id="ob-phone"
                inputMode="tel"
                autoFocus
                required
                className="h-14 rounded-3xl text-lg tabular-nums"
                placeholder="(85) 99999-0000"
                value={masked}
                onChange={(e) => setMasked(maskBrInput(e.target.value))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={() => go("sources")} disabled={pending}>
                Voltar
              </Button>
              <Button type="submit" size="lg" className="px-12" disabled={pending}>
                {pending && spinner}
                {pending ? "Enviando código…" : "Enviar código →"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* ── 5b. WhatsApp: código ───────────────────────────────────────── */}
      {step === "code" && (
        <section key="code" className="rise flex flex-col gap-8">
          <h1 className="font-display text-3xl font-medium leading-[1.08] tracking-tight md:text-5xl">
            Digite o código que chegou.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Enviamos 6 dígitos para <span className="tabular-nums text-foreground">+55 {masked}</span>.
            Expira em 15 minutos.
          </p>
          <form
            className="flex max-w-md flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!destId) return;
              start(async () => {
                const r = await confirmCode(destId, code);
                if (!r.ok) {
                  setError(r.error ?? "código incorreto");
                  return;
                }
                setVerified(`+55 ${masked}`);
                go("review");
              });
            }}
          >
            <Input
              inputMode="numeric"
              autoFocus
              required
              maxLength={6}
              placeholder="••••••"
              className="h-16 max-w-56 rounded-3xl text-center font-mono text-2xl tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {notice && !error && <p className="text-sm text-amber-300">{notice}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="ghost" onClick={() => go("phone")} disabled={pending}>
                Trocar número
              </Button>
              <Button type="submit" size="lg" className="px-12" disabled={pending || code.length !== 6}>
                {pending && spinner}
                {pending ? "Confirmando…" : "Confirmar"}
              </Button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  destId &&
                  start(async () => {
                    const r = await resendCode(destId);
                    if (!r.ok) setError(r.error ?? "não foi possível reenviar");
                    else {
                      setError(null);
                      setNotice("Código reenviado!");
                    }
                  })
                }
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                reenviar código
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── 6. Revisão + celebração ────────────────────────────────────── */}
      {step === "review" && (
        <section key="review" className="relative flex flex-col gap-10">
          <Confetti />
          <div className="rise flex flex-col gap-4">
            <span className="eyebrow w-max">tudo pronto</span>
            <h1 className="font-display text-4xl font-medium leading-[1.03] tracking-tight md:text-6xl">
              🎉 Parabéns{firstName ? `, ${firstName}` : ""}!
              <br />
              <span className="text-muted-foreground">Seu briefing está de pé.</span>
            </h1>
          </div>

          {/* resumo */}
          <div className="bezel rise rise-1">
            <div className="bezel-core grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">briefing</p>
                <p className="font-display mt-1 text-lg font-medium">{name}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">entrega</p>
                <p className="mt-1 text-sm">
                  💬 <span className="tabular-nums">{verified}</span> · todo dia às 07:00
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">temas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subs.size > 0 ? `${subs.size} temas escolhidos` : "todos os assuntos das fontes"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">fontes</p>
                <p className="mt-1 text-sm text-muted-foreground">{confirmedSources} portais monitorados</p>
              </div>
            </div>
          </div>

          {/* como será */}
          <div className="rise rise-2 flex flex-col gap-3">
            <h2 className="font-display text-xl font-medium">Assim será o seu briefing</h2>
            <div className="flex flex-col gap-2.5">
              {SECTIONS_PREVIEW.map((s, i) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5"
                >
                  <p className="font-display text-sm font-medium">{s.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.explain}</p>

                  {/* amostra real dentro do Must-read */}
                  {i === 0 && sample && sample.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-white/6 pt-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                        amostra real das suas fontes, agora
                      </p>
                      {sample.map((src) =>
                        src.items.slice(0, 2).map((item) => (
                          <a
                            key={item.url}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col gap-0.5 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/15"
                          >
                            <span className="line-clamp-2 text-[13px] font-medium leading-snug">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {src.portal} ↗
                            </span>
                          </a>
                        )),
                      )}
                    </div>
                  )}
                  {i === 0 && sample !== null && sample.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Suas fontes serão lidas na primeira coleta, em instantes.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* o momento */}
          <div className="rise rise-3 flex flex-col items-center gap-4 py-4 text-center">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await finishOnboarding();
                  if (!r.ok) {
                    setError(r.error ?? "tente de novo");
                    return;
                  }
                  // 1º briefing de verdade, agora (fire-and-forget; o dashboard acompanha)
                  fetch("/api/jobs/run-now", { method: "POST" }).catch(() => {});
                  router.push("/dashboard");
                })
              }
              className="h-16 w-full max-w-md rounded-full px-10 text-lg shadow-[0_0_50px_-10px_rgba(52,211,153,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]"
            >
              {pending && spinner}
              {pending ? "Preparando…" : "Gerar meu primeiro briefing →"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Fica pronto em poucos minutos, e amanhã às 7h chega sozinho no seu WhatsApp.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

/** Confete leve em CSS puro (respeita prefers-reduced-motion via .confetti). */
function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: (i % 9) * 0.22,
    duration: 2.6 + (i % 5) * 0.5,
    color: ["#34d399", "#a78bfa", "#fbbf24", "#f9fafb", "#60a5fa"][i % 5],
    size: 5 + (i % 3) * 3,
  }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-0">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size * 0.45,
          }}
        />
      ))}
    </div>
  );
}
