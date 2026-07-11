import { BRAND } from "@briefing/config/brand";
import { createClient } from "@briefing/db/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowBubble } from "@/components/ui/arrow-bubble";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { WhatsappMock } from "@/components/landing/whatsapp-mock";

export const metadata: Metadata = {
  title: `${BRAND.productName} — seu briefing diário no WhatsApp, curado por IA`,
  description:
    "Escolha seus temas e suas fontes. Todo dia às 7h, a IA lê tudo por você e entrega só o que importa no seu WhatsApp — sem repetição, com sugestões de post prontas. 7 dias grátis, sem cartão.",
};

const STEPS = [
  {
    n: "01",
    title: "Escolha seus temas",
    desc: "Categorias e subcategorias fechadas — pegue todo o Jurídico num clique ou refine até só Direito Tributário. O briefing inteiro passa a enxergar o mundo pelos seus temas.",
  },
  {
    n: "02",
    title: "Monte seu universo de fontes",
    desc: "Portais, blogs e perfis de Instagram que VOCÊ escolhe — da nossa biblioteca curada ou os seus. Validamos cada fonte na hora, mostrando o que ela publicou nas últimas 48h. A IA nunca inventa fonte: se não está na sua lista, não entra.",
  },
  {
    n: "03",
    title: "A IA cura de madrugada",
    desc: "Enquanto você dorme, o motor lê tudo que suas fontes publicaram, agrupa o que é o mesmo assunto, dá nota de relevância empresarial (💼) e técnica (💻) e consulta a memória: assunto repetido sem novidade é cortado; com novidade, volta marcado como “Atualização” com o que mudou.",
  },
  {
    n: "04",
    title: "Chega no WhatsApp às 7h",
    desc: "Até 3 mensagens no seu número verificado: 🔥 os must-reads do dia, 🗞️ os outros assuntos e 📱 sugestões de post prontas para suas redes. Com link para ver tudo no painel — hoje e qualquer dia do arquivo.",
  },
];

const FEATURES = [
  {
    title: "Memória que não repete",
    desc: "A dor nº 1 de toda newsletter: ler a mesma notícia duas vezes. Nossa memória semântica lembra de tudo que você já recebeu — repetição sem novidade é suprimida, e novidade real volta como “Atualização: o que mudou”.",
    emoji: "🧠",
  },
  {
    title: "Nota de relevância dupla",
    desc: "Cada assunto recebe 💼 relevância empresarial e 💻 relevância técnica (0 a 3) + Heat Score de cobertura. Você bate o olho e sabe se vale seu tempo.",
    emoji: "🌡️",
  },
  {
    title: "Posts prontos para o Instagram",
    desc: "Dos assuntos com relevância empresarial alta, a IA sugere posts com formato, ângulo, hook e estrutura slide a slide. E quando o dia não rende post útil, ela pula — de propósito.",
    emoji: "📱",
  },
  {
    title: "Fontes com saúde monitorada",
    desc: "Cada fonte mostra status ao vivo, última checagem e preview do que foi coletado. Portal fora do ar não derruba seu briefing — e você fica sabendo.",
    emoji: "🩺",
  },
  {
    title: "Silêncio honesto",
    desc: "Dia fraco é dia fraco. Se não houver nada relevante no seu universo, o briefing diz isso em uma linha — nunca infla assunto ruim para parecer cheio.",
    emoji: "🤫",
  },
  {
    title: "Arquivo e linha do tempo",
    desc: "Todo briefing fica no seu painel. Cada assunto tem linha do tempo: quando apareceu, o que mudou em cada atualização, de qual fonte veio.",
    emoji: "🗂️",
  },
];

const FAQ = [
  {
    q: "Como o briefing chega até mim?",
    a: "Pelo WhatsApp, todo dia de manhã cedo (por padrão às 7h, no seu fuso horário — você pode mudar o horário nas configurações). São até 3 mensagens: os must-reads do dia, os outros assuntos e as sugestões de post. Antes de receber, você verifica seu número com um código de 6 dígitos — só destino verificado recebe. Tudo também fica disponível no painel, na área logada.",
  },
  {
    q: "De onde vêm as notícias?",
    a: "Exclusivamente das fontes que VOCÊ escolher — esse é um princípio inegociável do produto (chamamos de universo fechado). Você monta sua lista com portais da nossa biblioteca curada (G1, InfoMoney, Tecnoblog, Exame, The Information e outros) ou adiciona qualquer site, blog ou perfil de Instagram. A IA nunca busca em fontes fora da sua lista, nunca inventa link.",
  },
  {
    q: "Como escolho os assuntos que me interessam?",
    a: "Nas configurações você seleciona temas por categorias e subcategorias: Tecnologia (IA, SaaS, Startups…), Negócios & Gestão, Economia & Mercado, Marketing & Mídia, Jurídico (Direito Tributário, Trabalhista, Empresarial, LGPD…), Política & Regulação e Ciência & Saúde. Dá para pegar uma categoria inteira num clique ou refinar subtema a subtema — e a curadoria passa a priorizar o que bate com seus temas.",
  },
  {
    q: "O que significa “Must-read”?",
    a: "É a primeira seção do briefing: o que realmente merece sua leitura hoje — leia isso e você está por dentro. Depois vêm “Relevante” (vale saber que aconteceu), “No radar” (sinais para acompanhar) e “Sinal sem fonte” (assunto esquentando fora das suas fontes de leitura — mostramos como sinal, sem link recomendado).",
  },
  {
    q: "Por que o briefing não repete notícia?",
    a: "Cada assunto entregue vira uma memória. No dia seguinte, antes de incluir qualquer coisa, a IA compara com tudo que você já recebeu: se é o mesmo assunto sem nenhum fato novo, ela suprime (e avisa quantos suprimiu). Se houve desdobramento de verdade, o assunto volta marcado como “🔁 Atualização”, dizendo exatamente o que mudou desde a última vez.",
  },
  {
    q: "Posso acompanhar perfis de Instagram?",
    a: "Sim, nos planos com social. Você cola o link do perfil (ou @usuario) e os posts das últimas 24 horas viram itens do briefing — legenda, link e mídia. Verificamos se o perfil existe antes de adicionar, e perfis privados não são suportados.",
  },
  {
    q: "O que são as sugestões de post?",
    a: "A terceira mensagem do dia. Dos assuntos com relevância empresarial alta (💼 2+), a IA monta sugestões de conteúdo para suas redes: formato (Reels, Carrossel, Post longo…), ângulo, hook de abertura e estrutura slide a slide. É um rascunho forte para você gravar ou escrever em minutos.",
  },
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. O teste é de 7 dias, grátis, sem cartão. Você cria a conta, escolhe temas e fontes, verifica seu WhatsApp e o primeiro briefing é gerado na hora.",
  },
  {
    q: "E se um dia não tiver nada relevante?",
    a: "O briefing te conta, em uma linha: “Sem cobertura relevante no universo monitorado hoje.” Silêncio honesto é regra — a IA nunca infla um dia fraco para parecer produtiva.",
  },
  {
    q: "Meus dados e fontes ficam privados?",
    a: "Sim. Suas fontes, temas, briefings e memória são exclusivos da sua conta, com isolamento por linha no banco (RLS). Nenhuma outra conta vê nada seu, e você pode remover destinos e dados quando quiser.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Abrir meu painel" : "Começar grátis por 7 dias";

  return (
    <div className="min-h-[100dvh]">
      {/* nav pill flutuante */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4">
        <div className="pointer-events-auto mt-6 flex w-max max-w-full items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1.5 pl-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <span className="font-display mr-3 text-sm font-semibold tracking-tight">
            {BRAND.productName}
          </span>
          <nav className="hidden items-center gap-0.5 sm:flex">
            <a href="#como-funciona" className="rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
              Como funciona
            </a>
            <a href="#recursos" className="rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
              Recursos
            </a>
            <a href="#faq" className="rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <Link href={user ? "/dashboard" : "/login"} className="ml-1">
            <Button size="sm">{user ? "Painel" : "Entrar"}</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 md:px-8">
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="flex min-h-[100dvh] flex-col items-center gap-14 pb-24 pt-36 md:flex-row md:gap-10 md:pt-40">
          <div className="rise flex w-full flex-col gap-6 md:w-[55%]">
            <span className="eyebrow w-max">Curadoria diária com IA · 7h no seu WhatsApp</span>
            <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
              Acorde já sabendo{" "}
              <span className="bg-gradient-to-br from-emerald-200 via-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                o que importa
              </span>
              .
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              O {BRAND.productName} lê de madrugada tudo que <em className="not-italic text-foreground">as suas</em>{" "}
              fontes publicaram — portais, blogs e Instagram que você escolher —, corta o
              ruído e a repetição, e entrega o essencial no seu WhatsApp às 7h. Com
              sugestões de post prontas para suas redes.
            </p>
            <div className="flex flex-col gap-3">
              <Link href={primaryHref} className="group w-max">
                <Button size="lg" className="gap-3 pr-2">
                  {primaryLabel}
                  <ArrowBubble dark />
                </Button>
              </Link>
              {!user && (
                <p className="text-xs text-muted-foreground">
                  7 dias grátis · <span className="text-foreground">sem cartão de crédito</span> · cancele quando quiser
                </p>
              )}
            </div>
          </div>
          <div className="rise rise-2 flex w-full justify-center md:w-[45%]">
            <WhatsappMock />
          </div>
        </section>

        {/* ── PRINT DO DASHBOARD ───────────────────────────────────────────── */}
        <Reveal>
          <section className="pb-28">
            <div className="bezel overflow-hidden">
              <div className="bezel-core overflow-hidden">
                <Image
                  src="/landing/dashboard-home.png"
                  alt="Painel do Briefing: big numbers do dia, canal conectado e atalhos"
                  width={1440}
                  height={900}
                  className="w-full"
                  priority={false}
                />
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Seu painel: must-reads do dia, memória trabalhando, saúde das fontes e o canal conectado.
            </p>
          </section>
        </Reveal>

        {/* ── COMO FUNCIONA ────────────────────────────────────────────────── */}
        <section id="como-funciona" className="scroll-mt-28 pb-28">
          <Reveal>
            <span className="eyebrow">Como funciona</span>
            <h2 className="font-display mt-4 max-w-2xl text-3xl font-medium tracking-tight md:text-5xl">
              Do caos das notícias ao essencial, em 4 passos.
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="bezel h-full">
                  <div className="bezel-core flex h-full flex-col gap-4 p-7">
                    <span className="big-number text-5xl font-medium text-white/15">{s.n}</span>
                    <h3 className="font-display text-xl font-medium">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── RECURSOS (bento) ─────────────────────────────────────────────── */}
        <section id="recursos" className="scroll-mt-28 pb-28">
          <Reveal>
            <span className="eyebrow">Recursos</span>
            <h2 className="font-display mt-4 max-w-2xl text-3xl font-medium tracking-tight md:text-5xl">
              Curadoria de gente grande, no piloto automático.
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <div className="bezel h-full">
                  <div className="bezel-core flex h-full flex-col gap-3 p-6">
                    <span className="text-2xl">{f.emoji}</span>
                    <h3 className="font-display text-lg font-medium">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── PRINT: BRIEFING POR SEÇÕES ───────────────────────────────────── */}
        <Reveal>
          <section className="pb-28">
            <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <span className="eyebrow w-max">O briefing, por dentro</span>
                <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
                  Cada seção explica a si mesma.
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  🔥 Must-read é o que merece sua leitura. 📌 Relevante vale saber que
                  aconteceu. 📎 No radar são sinais para acompanhar. E a memória mostra o
                  que foi suprimido por repetição — com a contagem na cara, para você
                  confiar no corte.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Clique em qualquer assunto e veja a linha do tempo dele: quando
                  apareceu pela primeira vez, o que mudou em cada atualização.
                </p>
              </div>
              <div className="bezel overflow-hidden">
                <div className="bezel-core overflow-hidden">
                  <Image
                    src="/landing/dashboard-briefing.png"
                    alt="Briefing no painel, separado por seções explicadas"
                    width={1440}
                    height={1000}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section id="faq" className="scroll-mt-28 pb-28">
          <Reveal>
            <span className="eyebrow">Perguntas frequentes</span>
            <h2 className="font-display mt-4 max-w-2xl text-3xl font-medium tracking-tight md:text-5xl">
              Todo o processo, explicadinho.
            </h2>
          </Reveal>
          <div className="mt-12 flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={Math.min(i, 4) * 60}>
                <details className="group rounded-2xl border border-white/8 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-[15px] font-medium">{item.q}</span>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-45">
                      ＋
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
        <Reveal>
          <section className="pb-24">
            <div className="bezel">
              <div className="bezel-core flex flex-col items-center gap-6 px-6 py-16 text-center md:py-24">
                <span className="eyebrow">Comece hoje</span>
                <h2 className="font-display max-w-2xl text-3xl font-medium tracking-tight md:text-5xl">
                  Seu briefing de amanhã já pode chegar às 7h.
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Crie a conta, escolha temas e fontes, verifique seu WhatsApp — o
                  primeiro briefing é gerado na hora.
                </p>
                <Link href={primaryHref} className="group">
                  <Button size="lg" className="gap-3 pr-2">
                    {primaryLabel}
                    <ArrowBubble dark />
                  </Button>
                </Link>
                {!user && (
                  <p className="text-xs text-muted-foreground">
                    7 dias grátis · sem cartão de crédito
                  </p>
                )}
              </div>
            </div>
          </section>
        </Reveal>

        <footer className="flex flex-col items-center gap-2 border-t border-white/5 py-10 text-center text-xs text-muted-foreground">
          <span className="font-display text-sm font-semibold text-foreground">{BRAND.productName}</span>
          <p>{BRAND.tagline}</p>
          <p>© {new Date().getFullYear()} · Feito no Brasil</p>
        </footer>
      </main>
    </div>
  );
}
