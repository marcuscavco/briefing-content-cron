"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Landing pública (rota /) no tema "amanhecer". Estilos em app/landing.css,
 * tudo escopado sob .lp. Interações imperativas (reveal, contadores, chat do
 * WhatsApp, estrelas) rodam num único effect sobre o root ref, espelhando a
 * versão estática validada em landing/index.html.
 */

const NAV_LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#briefing", label: "O briefing" },
  { href: "#fontes", label: "Fontes" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
];

const MARQUEE: Array<{ name: string; em?: boolean }> = [
  { name: "Valor Econômico", em: true },
  { name: "Exame" },
  { name: "G1" },
  { name: "InfoMoney" },
  { name: "JOTA", em: true },
  { name: "Conjur" },
  { name: "Migalhas" },
  { name: "Poder360" },
  { name: "Brazil Journal" },
  { name: "NeoFeed" },
  { name: "The Economist", em: true },
  { name: "Bloomberg" },
  { name: "Financial Times" },
  { name: "The Information", em: true },
  { name: "MIT Tech Review" },
  { name: "TechCrunch" },
  { name: "Folha de S.Paulo" },
  { name: "Estadão" },
  { name: "CNN Brasil" },
  { name: "Meio & Mensagem" },
  { name: "Mobile Time" },
  { name: "Tecnoblog" },
];

const THEME_CHIPS = [
  { label: "Negócios & Gestão", on: true },
  { label: "Economia & Mercado", on: true },
  { label: "Jurídico", on: true },
  { label: "Política & Regulação", on: false },
  { label: "Tecnologia", on: false },
  { label: "Marketing & Mídia", on: false },
  { label: "Ciência & Saúde", on: false },
];

const FAQ_ITEMS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Como eu recebo o briefing?",
    a: "Direto no seu WhatsApp, como uma mensagem normal, todo dia cedo, às 7h (horário de Brasília). Não precisa instalar nada, entrar em grupo nem baixar app: você cadastra seu número, verifica com um código e o briefing chega na conversa.",
  },
  {
    q: "Isso é só sobre tecnologia?",
    a: (
      <>
        Não. O Briefing Nerd cobre a área que <em>você</em> escolher: Negócios &amp; Gestão,
        Economia &amp; Mercado, Jurídico, Política &amp; Regulação, Marketing &amp; Mídia, Ciência
        &amp; Saúde e também Tecnologia. É uma ferramenta de trabalho pra empresários e executivos
        acompanharem a própria área, não uma plataforma de entretenimento.
      </>
    ),
  },
  {
    q: "Como eu escolho os temas?",
    a: "Por categorias e subcategorias: dá pra marcar uma área inteira num clique (todo o Jurídico, por exemplo) ou refinar subtema a subtema (só Direito Tributário e LGPD). O briefing passa a enxergar o noticiário pelos seus temas, e você muda quando quiser no dashboard. A mudança vale já no briefing seguinte.",
  },
  {
    q: "De onde vem o conteúdo?",
    a: "Exclusivamente das fontes que você escolher, o que a gente chama de universo fechado. Você monta sua lista com veículos da biblioteca curada (Valor, JOTA, Exame, G1, InfoMoney, The Information e outros, de todas as áreas) ou adiciona os seus. A curadoria nunca busca fora da sua lista e todo item traz o link da fonte original. Nada é publicado sem origem verificável.",
  },
  {
    q: "O que significam Heat, 💼 e 💻?",
    a: "Heat conta quantas fontes independentes estão cobrindo o mesmo assunto: é o termômetro objetivo de relevância. 💼 (0 a 3) mede o impacto pra quem toca negócio: custo, operação, concorrência. 💻 (0 a 3) mede a profundidade técnica pra quem é especialista. As notas aparecem em cada item, então você sempre sabe por que aquilo entrou no seu briefing.",
  },
  {
    q: "Isso é feito por IA? Posso confiar?",
    a: "A curadoria é automatizada, com critérios editoriais fixos e transparentes, os mesmos todo dia. O que garante a confiança é o desenho: o briefing só resume o que as suas fontes publicaram, todo item carrega o link do artigo original e nada entra sem estar sendo coberto por redações reais. Se um dia o noticiário for fraco, o briefing vem menor. A gente não inventa relevância.",
  },
  {
    q: "Preciso de cartão pra testar?",
    a: "Não. O teste de 7 dias é grátis e não pede cartão. Se você não assinar ao final, o briefing simplesmente para de chegar, sem cobrança surpresa e sem precisar cancelar nada.",
  },
  {
    q: "Como eu cancelo?",
    a: "Mandando uma mensagem ou com um clique no dashboard. Sem fidelidade, sem multa, sem ligação de retenção. No plano anual, você ainda tem 30 dias de garantia com devolução integral.",
  },
  {
    q: "Funciona pra minha equipe?",
    a: "Funciona: o briefing pode ser entregue num grupo de WhatsApp, e todo mundo acorda com o mesmo contexto. Pra times maiores com temas diferentes por área (o jurídico recebendo regulação, o comercial recebendo mercado), fala com a gente que montamos um formato sob medida.",
  },
  {
    q: "E se num dia não tiver nada relevante?",
    a: "Você recebe um briefing menor, e isso é proposital. Silêncio honesto faz parte do critério: a gente não infla assunto morno pra parecer que o dia rendeu. Quando o briefing vier cheio, você sabe que é porque o dia foi cheio de verdade.",
  },
];

function SunMark({ size = 30, radius = 10 }: { size?: number; radius?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size, borderRadius: radius }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#221200" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" fill="#221200" stroke="none" />
        <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" />
      </svg>
    </span>
  );
}

function ArrowIc() {
  return (
    <span className="ic" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </span>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  );
}

function PlusIc() {
  return (
    <span className="ic">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M12 4v16M4 12h16" />
      </svg>
    </span>
  );
}

export function Lp({
  loggedIn,
  primaryHref,
  primaryLabel,
}: {
  loggedIn: boolean;
  primaryHref: string;
  primaryLabel: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chips, setChips] = useState(THEME_CHIPS);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    // Reveal on-scroll (blur fade-up)
    const revealObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealObs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    root.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));
    cleanups.push(() => revealObs.disconnect());

    // Contadores animados
    const animateCount = (el: Element) => {
      const target = parseInt(el.getAttribute("data-count") ?? "0", 10);
      if (reduce) {
        el.textContent = String(target);
        return;
      }
      let start: number | null = null;
      const dur = 900;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const countObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            animateCount(e.target);
            countObs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.5 },
    );
    root.querySelectorAll("[data-count]").forEach((el) => countObs.observe(el));
    cleanups.push(() => countObs.disconnect());

    // Sequência do chat do WhatsApp
    const chat = root.querySelector<HTMLElement>(".wa-chat");
    const typing = root.querySelector<HTMLElement>(".typing");
    const phone = root.querySelector<HTMLElement>(".phone-wrap");
    if (chat && typing && phone) {
      const msgs = Array.from(chat.querySelectorAll<HTMLElement>(".msg"));
      const timers: number[] = [];
      const scrollChat = () => {
        chat.scrollTop = chat.scrollHeight;
      };
      const playChat = () => {
        if (reduce) {
          msgs.forEach((m) => m.classList.add("show"));
          scrollChat();
          return;
        }
        let i = 0;
        const next = () => {
          if (i >= msgs.length) {
            typing.classList.remove("show");
            return;
          }
          typing.classList.add("show");
          chat.appendChild(typing);
          scrollChat();
          timers.push(
            window.setTimeout(
              () => {
                typing.classList.remove("show");
                msgs[i].classList.add("show");
                scrollChat();
                i++;
                timers.push(window.setTimeout(next, 650));
              },
              i === 0 ? 900 : 1300,
            ),
          );
        };
        next();
      };
      const chatObs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              playChat();
              chatObs.unobserve(e.target);
            }
          }
        },
        { threshold: 0.35 },
      );
      chatObs.observe(phone);
      cleanups.push(() => {
        chatObs.disconnect();
        timers.forEach((t) => clearTimeout(t));
      });
    }

    // Estrelas do hero
    const canvas = root.querySelector<HTMLCanvasElement>(".stars");
    if (canvas && !reduce) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        let stars: Array<{ x: number; y: number; r: number; p: number; s: number }> = [];
        let raf = 0;
        const sizeCanvas = () => {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
          stars = [];
          const n = Math.floor((canvas.width * canvas.height) / 16000);
          for (let i = 0; i < n; i++) {
            stars.push({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height * 0.8,
              r: Math.random() * 1.1 + 0.3,
              p: Math.random() * Math.PI * 2,
              s: 0.4 + Math.random() * 0.9,
            });
          }
        };
        sizeCanvas();
        window.addEventListener("resize", sizeCanvas);
        const draw = (ts: number) => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (const st of stars) {
            ctx.globalAlpha = 0.14 + 0.45 * Math.abs(Math.sin(st.p + ts * 0.0004 * st.s));
            ctx.fillStyle = "#F5EDDE";
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        cleanups.push(() => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", sizeCanvas);
        });
      }
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const chipsOn = chips.filter((c) => c.on);
  const marquee = [...MARQUEE, ...MARQUEE];

  return (
    <div ref={rootRef} className={`lp${menuOpen ? " menu-open" : ""}`}>
      {/* ============ NAV (fluid island) ============ */}
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <a className="logo" href="#topo" aria-label="Briefing Nerd, início">
          <SunMark />
          Briefing Nerd
        </a>
        <nav className="nav-links" aria-label="Seções da página">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          {!loggedIn && <Link href="/login">Entrar</Link>}
        </nav>
        <Link className="btn btn-primary" href={loggedIn ? "/dashboard" : "/onboarding"}>
          {loggedIn ? "Painel" : "Testar grátis"}
          <ArrowIc />
        </Link>
        <button
          className="burger"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="lp-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <i></i>
          <i></i>
          <i></i>
        </button>
      </header>

      {/* Menu de vidro em tela cheia (mobile) */}
      <nav className="menu" id="lp-menu" aria-label="Menu">
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
            {l.label}
          </a>
        ))}
        {!loggedIn && (
          <Link href="/login" onClick={() => setMenuOpen(false)}>
            Entrar
          </Link>
        )}
        <Link className="mini" href={loggedIn ? "/dashboard" : "/onboarding"} onClick={() => setMenuOpen(false)}>
          {loggedIn ? "Abrir meu painel ↗" : "Testar grátis ↗"}
        </Link>
      </nav>

      {/* ============ HERO (Editorial Split) ============ */}
      <section className="hero" id="topo">
        <span className="orb orb-sun orb-1" aria-hidden="true"></span>
        <span className="orb orb-ember orb-2" aria-hidden="true"></span>
        <span className="orb orb-dawn orb-3" aria-hidden="true"></span>
        <canvas className="stars" aria-hidden="true"></canvas>
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-badge">
              <span className="dot"></span> 7 dias grátis · sem cartão de crédito
            </span>
            <h1>
              Enquanto você dormia, <span className="wa">a gente leu tudo</span>.
            </h1>
            <p className="hero-sub">
              O Briefing Nerd lê de madrugada as fontes <strong>da sua área</strong>: negócios,
              jurídico, política, economia, tecnologia, o que você escolher. Corta o ruído e a
              repetição e entrega um resumo de 2 minutos{" "}
              <strong>no seu WhatsApp, todo dia às 7h</strong>. Feito pra empresários e executivos
              que precisam chegar na primeira reunião já sabendo o que aconteceu.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" href={primaryHref}>
                {primaryLabel}
                <ArrowIc />
              </Link>
              <a className="btn btn-ghost" href="#como-funciona">
                Ver como funciona
                <span className="ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </span>
              </a>
            </div>
            <div className="hero-assure">
              <span>
                <Check /> Sem cartão no teste
              </span>
              <span>
                <Check /> Sem app pra instalar
              </span>
              <span>
                <Check /> Cancela com uma mensagem
              </span>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <b>
                  <span className="num" data-count="7">
                    0
                  </span>{" "}
                  áreas
                </b>
                <span>de negócios a jurídico, você escolhe</span>
              </div>
              <div className="hero-stat">
                <b>7:00</b>
                <span>na sua tela, todo dia</span>
              </div>
              <div className="hero-stat">
                <b>~2 min</b>
                <span>de leitura</span>
              </div>
            </div>
          </div>
          <div className="phone-wrap" aria-label="Demonstração do briefing chegando no WhatsApp">
            <div className="phone">
              <div className="phone-screen">
                <div className="wa-header">
                  <div className="wa-avatar" aria-hidden="true">
                    ☀️
                  </div>
                  <div className="wa-title">
                    <b>Briefing Nerd</b>
                    <span>online</span>
                  </div>
                </div>
                <div className="wa-chat">
                  <span className="wa-day">HOJE</span>
                  <div className="msg">
                    ☀️ <b>Bom dia!</b> Seu briefing de sexta, 11/07 tá pronto 👇
                    <span className="meta">07:00</span>
                  </div>
                  <div className="msg">
                    {"📰 "}
                    <b>Digest 11/07</b>
                    {" · 7 assuntos\n\n🔥 "}
                    <b>Must-read</b>
                    {"\n\n1. Reforma tributária: regras do split payment são publicadas\n💼 3/3 · 💻 1/3 · Heat 9\n📖 "}
                    <span className="lnk">valor.globo.com/…</span>
                    {"\n💡 Muda o fluxo de caixa de quem emite nota. Vale mapear o impacto com seu contador ainda este mês."}
                    <span className="meta">07:00</span>
                  </div>
                  <div className="msg">
                    {"📌 "}
                    <b>Relevante</b>
                    {"\n\n2. Anthropic libera agentes que operam o navegador sozinhos\n💼 2/3 · 💻 3/3 · Heat 7\n📖 "}
                    <span className="lnk">theinformation.com/…</span>
                    {"\n💡 Tarefa repetitiva de back-office vira automação sem depender de API."}
                    <span className="meta">07:01</span>
                  </div>
                  <div className="msg">
                    {"📎 "}
                    <b>No radar</b>
                    {"\n"}
                    <span className="dim">
                      {"• Senado pauta marco legal da IA pra agosto · 💼 2\n• BC sinaliza pausa no ciclo de juros · 💼 2"}
                    </span>
                    {"\n\n➡️ Bom dia de trabalho! Amanhã, 7h, tem mais."}
                    <span className="meta">07:01</span>
                  </div>
                  <div className="typing" aria-hidden="true">
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>
                </div>
                <div className="wa-input" aria-hidden="true">
                  <div className="field">Mensagem</div>
                  <div className="mic">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 1 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.94V22h2v-2.56A8 8 0 0 0 20 11.5h-2Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container sources-strip">
          <p className="sources-label">
            Curadoria sobre as fontes que você escolhe, com biblioteca de veículos de todas as áreas
          </p>
          <div className="marquee" aria-hidden="true">
            <div className="marquee-track">
              {marquee.map((s, i) => (
                <span key={`${s.name}-${i}`}>{s.em ? <em>{s.name}</em> : s.name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section className="section" id="como-funciona">
        <span className="orb orb-ember" style={{ width: 560, height: 560, top: -160, right: -300 }} aria-hidden="true"></span>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Como funciona</span>
            <h2>Sua manhã começa antes de você acordar.</h2>
            <p>
              Não é uma newsletter genérica. É um motor de curadoria que trabalha de madrugada em
              cima da sua área, com critério fixo e transparente, e entrega só o que passa no
              corte.
            </p>
          </div>
          <div className="timeline">
            <div className="tl-item reveal">
              <div className="tl-time">
                1x<small>só no início</small>
              </div>
              <div className="tl-axis">
                <span className="tl-dot"></span>
                <span className="tl-line"></span>
              </div>
              <div className="tl-body">
                <h3>Você escolhe a sua área</h3>
                <p>
                  No cadastro, você marca os temas do seu trabalho: Negócios &amp; Gestão, Jurídico,
                  Economia &amp; Mercado, Política &amp; Regulação, Tecnologia, Marketing, Ciência
                  &amp; Saúde. Dá pra pegar a categoria inteira num clique ou refinar subtema a
                  subtema (só Direito Tributário, por exemplo). O briefing é montado só em cima
                  disso.
                </p>
              </div>
            </div>
            <div className="tl-item reveal">
              <div className="tl-time">
                05:30<small>madrugada</small>
              </div>
              <div className="tl-axis">
                <span className="tl-dot"></span>
                <span className="tl-line"></span>
              </div>
              <div className="tl-body">
                <h3>A varredura</h3>
                <p>
                  As fontes do seu universo (portais, blogs e perfis que você escolheu) são lidas de
                  ponta a ponta. Notícias sobre o mesmo assunto são agrupadas: 8 veículos cobrindo a
                  mesma história viram um assunto só, não oito manchetes repetidas.
                </p>
              </div>
            </div>
            <div className="tl-item reveal">
              <div className="tl-time">
                06:40<small>quase lá</small>
              </div>
              <div className="tl-axis">
                <span className="tl-dot"></span>
                <span className="tl-line"></span>
              </div>
              <div className="tl-body">
                <h3>A pontuação</h3>
                <p>
                  Cada assunto ganha um <strong>Heat</strong> (quantas fontes independentes estão
                  cobrindo) e duas notas de 0 a 3: impacto no negócio 💼 e profundidade técnica 💻.
                  O que não passa no corte fica de fora, sem encher linguiça.
                </p>
              </div>
            </div>
            <div className="tl-item reveal">
              <div className="tl-time">
                07:00<small>em ponto</small>
              </div>
              <div className="tl-axis">
                <span className="tl-dot"></span>
                <span className="tl-line"></span>
              </div>
              <div className="tl-body">
                <h3>Chega no seu WhatsApp</h3>
                <p>
                  Uma mensagem, uns 2 minutos de leitura, com link da fonte original pra quem quiser
                  ir fundo. Sem app novo, sem mais um e-mail perdido no inbox. Todo dia, cedo, no
                  lugar que você já olha primeiro.
                </p>
              </div>
            </div>
          </div>

          <div className="picker bez reveal" aria-label="Demonstração da escolha de temas">
            <div className="bez-in">
              <h3>Experimenta: monte o seu</h3>
              <p>
                Toque nas áreas pra ligar e desligar. É assim que funciona no cadastro, e dentro de
                cada uma dá pra refinar por subtema.
              </p>
              <div className="chips">
                {chips.map((c, i) => (
                  <button
                    key={c.label}
                    className="chip"
                    aria-pressed={c.on}
                    onClick={() =>
                      setChips((prev) => prev.map((p, j) => (j === i ? { ...p, on: !p.on } : p)))
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="picker-out">
                {chipsOn.length > 0 ? (
                  <>
                    Seu briefing de amanhã cobriria:{" "}
                    {chipsOn.map((c, i) => (
                      <span key={c.label}>
                        {i > 0 && " · "}
                        <b>{c.label}</b>
                      </span>
                    ))}
                  </>
                ) : (
                  <>Nenhuma área ligada. Assim o briefing não tem o que te contar 😉</>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ANATOMIA DO BRIEFING ============ */}
      <section className="section" id="briefing">
        <span className="orb orb-dawn" style={{ width: 520, height: 520, top: "20%", left: -300 }} aria-hidden="true"></span>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">O briefing por dentro</span>
            <h2>Cada linha tem um porquê.</h2>
            <p>
              Nada de &quot;confira as principais notícias&quot;. Cada item do briefing carrega os
              números que explicam por que ele entrou, e o que ele significa pra você.
            </p>
          </div>
          <div className="anatomy">
            <div className="digest-sticky reveal">
              <div className="bez" aria-label="Exemplo de mensagem do briefing com marcações">
                <div className="bez-in digest-card">
                  <div className="row">
                    📰 <b>Digest 11/07</b> · 7 assuntos
                  </div>
                  <br />
                  <div className="row">
                    🔥 <b>Must-read</b> <span className="ann">6</span>
                  </div>
                  <br />
                  <div className="row">1. Reforma tributária: regras do split payment são publicadas</div>
                  <div className="row">
                    💼 3/3 <span className="ann">2</span> · 💻 1/3 <span className="ann">3</span> · Heat 9{" "}
                    <span className="ann">1</span>
                  </div>
                  <div className="row">
                    📖 <span className="lnk">valor.globo.com/legislacao/…</span> <span className="ann">4</span>
                  </div>
                  <div className="row">
                    💡 Muda o fluxo de caixa de quem emite nota. Vale mapear o impacto com seu contador.{" "}
                    <span className="ann">5</span>
                  </div>
                  <br />
                  <div className="row">
                    📌 <b>Relevante</b>
                  </div>
                  <br />
                  <div className="row">2. Anthropic libera agentes que operam o navegador sozinhos</div>
                  <div className="row">💼 2/3 · 💻 3/3 · Heat 7</div>
                  <div className="row">
                    📖 <span className="lnk">theinformation.com/articles/…</span>
                  </div>
                  <div className="row">💡 Tarefa repetitiva de back-office vira automação sem depender de API.</div>
                  <br />
                  <div className="row">
                    📎 <b>No radar</b> <span className="dim">(só títulos)</span>
                  </div>
                  <div className="row">
                    <span className="dim">• Senado pauta marco legal da IA pra agosto · 💼 2</span>
                  </div>
                  <div className="row">
                    <span className="dim">• BC sinaliza pausa no ciclo de juros · 💼 2</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ann-list">
              <div className="ann-item reveal">
                <span className="ann">1</span>
                <div>
                  <h3>Heat: o quanto o assunto está quente</h3>
                  <p>
                    Conta quantas fontes independentes estão cobrindo a mesma história. Heat 9 = o
                    mundo inteiro tá falando disso. É sinal objetivo, não opinião.
                  </p>
                </div>
              </div>
              <div className="ann-item reveal">
                <span className="ann">2</span>
                <div>
                  <h3>💼 Impacto no negócio (0 a 3)</h3>
                  <p>
                    A nota que responde: isso muda alguma coisa pra quem toca empresa no Brasil? 3/3
                    = mexe com custo, operação ou concorrência. É ela que decide se você precisa
                    agir ou só saber.
                  </p>
                </div>
              </div>
              <div className="ann-item reveal">
                <span className="ann">3</span>
                <div>
                  <h3>💻 Profundidade técnica (0 a 3)</h3>
                  <p>
                    Quanto o assunto exige de quem é especialista na área: detalhe de norma, de
                    tecnologia, de mercado. Separada da nota de negócio de propósito, porque as duas
                    coisas nem sempre andam juntas.
                  </p>
                </div>
              </div>
              <div className="ann-item reveal">
                <span className="ann">4</span>
                <div>
                  <h3>📖 Fonte original, link limpo</h3>
                  <p>
                    Todo item aponta pro artigo original na melhor fonte cobrindo, sempre uma fonte
                    da sua lista, nunca inventada. Você lê o resumo; se quiser ir fundo, o caminho
                    tá ali.
                  </p>
                </div>
              </div>
              <div className="ann-item reveal">
                <span className="ann">5</span>
                <div>
                  <h3>💡 O que muda pra você</h3>
                  <p>
                    Uma frase de tradução: não o que aconteceu, mas o que isso significa pro seu
                    negócio ou pra sua atuação. Sem hype, sem &quot;revolução&quot;. Se for
                    irrelevante pra você, nem entrava.
                  </p>
                </div>
              </div>
              <div className="ann-item reveal">
                <span className="ann">6</span>
                <div>
                  <h3>Silêncio honesto</h3>
                  <p>
                    Dia fraco de notícia = briefing menor. A gente não infla assunto morno pra
                    parecer que o dia rendeu. Se só duas coisas importam, você recebe duas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ DASHBOARD ============ */}
      <section className="section" id="dashboard">
        <span className="orb orb-sun" style={{ width: 600, height: 600, bottom: -260, right: -320 }} aria-hidden="true"></span>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Dashboard</span>
            <h2>O WhatsApp é a entrega. O dashboard é a memória.</h2>
            <p>
              Todo briefing fica guardado: histórico completo, os temas que você acompanha, o que
              você salvou pra ler depois. Perdeu o dia? Tá lá.
            </p>
          </div>
          <div className="bez reveal" aria-label="Prévia do dashboard do Briefing Nerd">
            <div className="bez-in browser-core">
              <div className="browser-bar">
                <i></i>
                <i></i>
                <i></i>
                <span className="browser-url">app.briefingnerd.com.br/painel</span>
              </div>
              <div className="dash">
                <div className="dash-side">
                  <span className="dlogo">
                    <SunMark size={24} radius={8} />
                    Briefing Nerd
                  </span>
                  <a href="#dashboard" className="active">
                    Hoje
                  </a>
                  <a href="#dashboard">Histórico</a>
                  <a href="#dashboard">Meus temas</a>
                  <a href="#dashboard">Salvos</a>
                </div>
                <div className="dash-main">
                  <div className="dash-greet">
                    <h3>Bom dia 👋</h3>
                    <span>sexta, 11 de julho</span>
                  </div>
                  <div className="tiles">
                    <div className="tile">
                      <b className="num" data-count="22">
                        0
                      </b>
                      <span>briefings no mês</span> <span className="up">100% dos dias</span>
                    </div>
                    <div className="tile">
                      <b className="num" data-count="148">
                        0
                      </b>
                      <span>assuntos cobertos</span>
                    </div>
                    <div className="tile">
                      <b className="num" data-count="9">
                        0
                      </b>
                      <span>salvos pra ler</span>
                    </div>
                  </div>
                  <div className="dash-cols">
                    <div className="panel">
                      <h4>Últimos briefings</h4>
                      <div className="brief-row">
                        <span className="d">11/07</span>
                        <span className="t">Split payment · Agentes de IA no navegador…</span>
                        <span className="n">7</span>
                      </div>
                      <div className="brief-row">
                        <span className="d">10/07</span>
                        <span className="t">M&amp;A no varejo · Marco da IA no Senado…</span>
                        <span className="n">6</span>
                      </div>
                      <div className="brief-row">
                        <span className="d">09/07</span>
                        <span className="t">Juros em pausa · LGPD na saúde…</span>
                        <span className="n">8</span>
                      </div>
                      <div className="brief-row">
                        <span className="d">08/07</span>
                        <span className="t">Dia fraco: 3 assuntos, sem must-read</span>
                        <span className="n">3</span>
                      </div>
                    </div>
                    <div className="panel">
                      <h4>Heat da semana</h4>
                      <div className="bars" aria-hidden="true">
                        <div className="bar">
                          <i style={{ height: "45%" }}></i>
                          <span>seg</span>
                        </div>
                        <div className="bar">
                          <i style={{ height: "62%" }}></i>
                          <span>ter</span>
                        </div>
                        <div className="bar">
                          <i style={{ height: "38%" }}></i>
                          <span>qua</span>
                        </div>
                        <div className="bar">
                          <i style={{ height: "70%" }}></i>
                          <span>qui</span>
                        </div>
                        <div className="bar hot">
                          <i style={{ height: "92%" }}></i>
                          <span>sex</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="panel">
                    <h4>Meus temas</h4>
                    <div className="dash-temas">
                      <span className="on">Negócios &amp; Gestão</span>
                      <span className="on">Economia &amp; Mercado</span>
                      <span className="on">Jurídico</span>
                      <span>Política &amp; Regulação</span>
                      <span>Tecnologia</span>
                      <span>Marketing &amp; Mídia</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FONTES ============ */}
      <section className="section" id="fontes">
        <span className="orb orb-dawn" style={{ width: 500, height: 500, top: -140, right: -260 }} aria-hidden="true"></span>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Fontes</span>
            <h2>Suas fontes. Seu universo fechado.</h2>
            <p>
              Você monta a lista: pega da nossa biblioteca curada, com veículos de todas as áreas,
              ou adiciona os seus. A curadoria nunca busca fora dela e nunca inventa link.
            </p>
          </div>
          <div className="tier1-grid">
            {[
              { name: "Valor Econômico", desc: "Economia, M&A e mercado BR" },
              { name: "JOTA", desc: "Jurídico, tributário e regulação" },
              { name: "Exame", desc: "Negócios e gestão no Brasil" },
              { name: "Poder360", desc: "Política Brasil e regulação" },
              { name: "The Information", desc: "Tecnologia, IA e venture capital" },
            ].map((s) => (
              <div className="src-card bez reveal" key={s.name}>
                <div className="bez-in">
                  <span className="tag">Biblioteca curada</span>
                  <b>{s.name}</b>
                  <span>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="reveal">
            <h3 style={{ marginBottom: 14, fontSize: "1.35rem", fontWeight: 600 }}>
              + dezenas de veículos, de todas as áreas
            </h3>
            <p style={{ color: "var(--lp-ink-2)", maxWidth: "40em", marginBottom: 22 }}>
              Eles também servem pra medir o quanto cada assunto está quente: é daí que sai o Heat.
              Quando várias redações independentes cobrem a mesma história, isso é sinal, não
              coincidência. E se a sua fonte de confiança não estiver na biblioteca, é só adicionar.
            </p>
            <div className="signal-cloud">
              {[
                "G1", "Folha de S.Paulo", "Estadão", "InfoMoney", "Brazil Journal", "NeoFeed",
                "Conjur", "Migalhas", "CNN Brasil", "Bloomberg", "Financial Times", "The Economist",
                "Meio & Mensagem", "MIT Tech Review", "TechCrunch", "Tecnoblog", "Mobile Time",
                "Agência Brasil", "Reuters", "Exame Invest",
              ].map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
          <div className="fontes-note bez reveal">
            <div className="bez-in">
              <span className="ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5Z" />
                </svg>
              </span>
              <div>
                <h3>Todo dia cedo, no seu WhatsApp, só sobre o que você escolheu.</h3>
                <p>
                  Você define área e fontes uma vez e ajusta quando quiser. Às 7h, o briefing chega
                  pronto na conversa: sem abrir 30 abas, sem newsletter acumulando, sem depender de
                  algoritmo de feed. A informação da sua profissão vai até você, filtrada, pontuada
                  e com fonte.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PLANOS ============ */}
      <section className="section" id="planos">
        <span className="orb orb-sun" style={{ width: 640, height: 640, top: -100, left: -340 }} aria-hidden="true"></span>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Planos</span>
            <h2>Custa menos que a assinatura de um único jornal.</h2>
            <p>
              A assinatura de um grande veículo de negócios passa fácil de R$ 100 por mês, e cobre
              uma área só. O briefing inteiro da sua área custa isso aqui:
            </p>
          </div>
          <span className="price-note reveal">Valores provisórios de lançamento, podem mudar</span>
          <div className="plans">
            <div className="plan bez reveal">
              <div className="bez-in">
                <h3>Mensal</h3>
                <div className="price">
                  <b>R$ 49,90</b>
                  <span>/mês</span>
                </div>
                <p className="bill">Cobrança mensal, cancela quando quiser.</p>
                <ul>
                  <li>
                    <Check />
                    Briefing todo dia às 7h no WhatsApp
                  </li>
                  <li>
                    <Check />
                    Temas por área, com refino por subtema
                  </li>
                  <li>
                    <Check />
                    Dashboard com histórico completo
                  </li>
                  <li>
                    <Check />
                    Biblioteca curada + fontes que você adicionar
                  </li>
                </ul>
                <Link className="btn btn-primary" href={primaryHref}>
                  {primaryLabel}
                  <ArrowIc />
                </Link>
                <p className="micro">Sem cartão. O teste não vira cobrança sozinho.</p>
              </div>
            </div>
            <div className="plan featured bez reveal">
              <span className="flag">Mais escolhido</span>
              <div className="bez-in">
                <h3>Anual</h3>
                <div className="price">
                  <b>R$ 39,90</b>
                  <span>/mês</span>
                </div>
                <p className="bill">R$ 478,80 cobrados uma vez ao ano, 20% menos que o mensal.</p>
                <ul>
                  <li>
                    <Check />
                    Tudo do plano mensal
                  </li>
                  <li>
                    <Check />
                    Preço travado por 12 meses
                  </li>
                  <li>
                    <Check />
                    Acesso antecipado a recursos novos
                  </li>
                  <li>
                    <Check />
                    Garantia de 30 dias com devolução integral
                  </li>
                </ul>
                <Link className="btn btn-primary" href={primaryHref}>
                  {primaryLabel}
                  <ArrowIc />
                </Link>
                <p className="micro">Sem cartão. O teste não vira cobrança sozinho.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="section" id="faq">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Perguntas frequentes</span>
            <h2>Tudo que você perguntaria antes de assinar.</h2>
          </div>
          <div className="faq">
            {FAQ_ITEMS.map((item, i) => (
              <div className={`faq-item reveal${openFaq === i ? " open" : ""}`} key={item.q}>
                <button
                  className="faq-q"
                  aria-expanded={openFaq === i}
                  onClick={() => setOpenFaq((v) => (v === i ? null : i))}
                >
                  {item.q}
                  <PlusIc />
                </button>
                <div className="faq-a">
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="final" id="comecar">
        <span className="orb orb-sun orb-1" aria-hidden="true"></span>
        <span className="orb orb-ember orb-2" aria-hidden="true"></span>
        <div className="container final-inner">
          <span className="clock num reveal">AMANHÃ · 07:00</span>
          <h2 className="reveal">Amanhã às 7h você pode acordar na frente.</h2>
          <p className="reveal">
            7 dias grátis pra sentir o que é começar o dia já sabendo o que aconteceu na sua área.
            Sem cartão, sem compromisso. Se não for pra você, é só deixar o teste acabar.
          </p>
          <Link className="btn btn-primary reveal" href={primaryHref}>
            {primaryLabel}
            <ArrowIc />
          </Link>
          <div className="hero-assure reveal">
            <span>
              <Check /> Sem cartão de crédito
            </span>
            <span>
              <Check /> Cancela com uma mensagem
            </span>
          </div>
        </div>
      </section>

      <footer>
        <div className="container foot">
          <a className="logo" href="#topo" aria-label="Briefing Nerd, início">
            <SunMark />
            Briefing Nerd
          </a>
          <nav aria-label="Rodapé">
            <a href="#como-funciona">Como funciona</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </nav>
          <span>
            © 2026 Briefing Nerd · um produto <a href="https://oempresarionerd.com">O Empresário Nerd</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
