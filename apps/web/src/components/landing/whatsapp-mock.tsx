/**
 * Mockup de WhatsApp em CSS puro (nítido em qualquer densidade de tela),
 * com o conteúdo REAL das 3 mensagens do produto.
 */
function Bubble({ children, time }: { children: React.ReactNode; time: string }) {
  return (
    <div className="max-w-[92%] rounded-2xl rounded-tl-md bg-[#1f2c34] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#e9edef] shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      {children}
      <span className="mt-1 block text-right text-[10px] text-[#8696a0]">{time}</span>
    </div>
  );
}

export function WhatsappMock() {
  return (
    <div className="bezel w-full max-w-90">
      <div className="bezel-core overflow-hidden">
        {/* topo do chat */}
        <div className="flex items-center gap-3 border-b border-white/5 bg-[#1f2c34] px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-400/20 text-sm">📰</div>
          <div>
            <p className="text-[13px] font-semibold text-[#e9edef]">Briefing</p>
            <p className="text-[11px] text-[#8696a0]">online</p>
          </div>
        </div>

        {/* conversa */}
        <div className="flex flex-col gap-2.5 bg-[#0b141a] p-3.5">
          <div className="mx-auto rounded-md bg-[#182229] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#8696a0]">
            hoje, 07:00
          </div>

          <Bubble time="07:00">
            <p>📰 <b>Briefing 10/07</b> — 🔥 <b>Must-read</b></p>
            <p className="mt-2">
              1. ✨ Anthropic lança modelo com janela de 10M tokens
              <br />💼 3/3 · 💻 3/3 · Heat 8
              <br />📖 The Information: theinformation.com/…
              <br />💡 Muda o custo de análise de documentos longos — contratos e
              due diligence inteiros num prompt.
            </p>
            <p className="mt-2">
              2. 🔁 Datacenter no Ceará: obra 50% menor
              <br />💼 3/3 · 💻 2/3 · Heat 6
              <br />🔁 Escopo revisado para metade do anunciado.
            </p>
            <p className="mt-2">🤫 4 assuntos já tratados sem novidade — suprimidos.</p>
            <p className="mt-2 text-[#53bdeb]">🔗 Ver no painel: briefing.app/b/71a0…</p>
          </Bubble>

          <Bubble time="07:00">
            <p>🗞️ <b>Outros assuntos 10/07</b></p>
            <p className="mt-2">
              📌 <b>Relevante</b>
              <br />1. Fintech brasileira anuncia série B de R$ 200 mi
              <br />💼 3/3 · 💻 1/3
            </p>
            <p className="mt-2">
              📎 <b>No radar</b>
              <br />• Rumor de aquisição no setor de pagamentos · 💼 2 · 💻 1
            </p>
          </Bubble>

          <Bubble time="07:01">
            <p>📱 <b>Posts sugeridos</b> — filtro: relevância empresarial</p>
            <p className="mt-2">
              1. O Ceará vai virar a capital dos datacenters?
              <br />🎠 Carrossel
              <br />🎯 Ângulo: tradução pro empresário
              <br />📣 Hook: &quot;Você viu o que aconteceu com o mercado de IA hoje?&quot;
            </p>
          </Bubble>
        </div>
      </div>
    </div>
  );
}
