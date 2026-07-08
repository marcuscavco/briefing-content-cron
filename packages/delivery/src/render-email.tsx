import { BRAND } from "@briefing/config/brand";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  render,
  Section,
  Text,
} from "@react-email/components";
import type { DeliveryBriefing, DeliveryCluster, DeliveryPost } from "./types";

/** Email do briefing (Resend + React Email). PT-BR, responsivo, digest completo. */

const CATEGORIA_LABEL: Record<string, string> = {
  must_read: "🔥 Must-read",
  relevante: "📌 Relevante",
  no_radar: "📎 No radar",
  sinal_sem_fonte: "⚠️ Sinal sem fonte canônica",
};

interface EmailProps {
  briefing: DeliveryBriefing;
  clusters: DeliveryCluster[];
  posts: DeliveryPost[];
  dashboardUrl: string;
  unsubscribeUrl: string;
}

function BriefingEmail({ briefing, clusters, posts, dashboardUrl, unsubscribeUrl }: EmailProps) {
  const inDigest = clusters.filter((c) =>
    ["must_read", "relevante", "no_radar", "sinal_sem_fonte"].includes(c.categoria),
  );
  const publicaveis = posts.filter((p) => !p.skip);
  const [y = "", m = "", d = ""] = briefing.run_date.split("-");

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{`Seu briefing de ${d}/${m}: ${briefing.n_must_read} must-read, ${briefing.n_relevante} relevantes`}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "0 auto", padding: "24px", maxWidth: "600px" }}>
          <Heading as="h1" style={{ fontSize: "20px" }}>
            📰 {BRAND.productName} — {d}/{m}/{y}
          </Heading>
          <Text style={{ color: "#555", fontSize: "13px" }}>
            {briefing.n_must_read} must-read · {briefing.n_relevante} relevantes ·{" "}
            {briefing.n_no_radar} no radar
            {briefing.n_suppressed > 0 &&
              ` · ${briefing.n_suppressed} sem novidade (suprimidos pela memória)`}
          </Text>

          {inDigest.length === 0 && (
            <Text>Sem cobertura relevante no seu universo de fontes hoje — silêncio honesto.</Text>
          )}

          {inDigest.map((c, i) => (
            <Section key={i} style={{ marginBottom: "16px" }}>
              <Text style={{ fontSize: "11px", color: "#888", margin: "0" }}>
                {CATEGORIA_LABEL[c.categoria]}
                {c.is_curator_pick && " · ✨ Curator's Pick"}
                {c.is_fallback && " · 🟡 Fallback Tier 2"}
                {c.is_update && " · 🔁 Atualização"}
              </Text>
              <Text style={{ fontSize: "15px", fontWeight: "bold", margin: "2px 0" }}>{c.titulo}</Text>
              <Text style={{ fontSize: "12px", color: "#555", margin: "0" }}>
                💼 {c.relevancia_empresarial ?? 0}/3 · 💻 {c.relevancia_tecnica ?? 0}/3 · Heat{" "}
                {c.heat_score}
                {c.fonte && c.url && (
                  <>
                    {" · "}
                    <Link href={c.url}>{c.fonte}</Link>
                  </>
                )}
              </Text>
              {c.resumo && (
                <Text style={{ fontSize: "13px", margin: "4px 0 0" }}>💡 {c.resumo}</Text>
              )}
              {c.is_update && c.update_resumo && (
                <Text style={{ fontSize: "13px", margin: "4px 0 0" }}>
                  🔁 <strong>O que mudou:</strong> {c.update_resumo}
                </Text>
              )}
            </Section>
          ))}

          {publicaveis.length > 0 && (
            <>
              <Hr />
              <Heading as="h2" style={{ fontSize: "16px" }}>
                📱 Posts sugeridos
              </Heading>
              {publicaveis.map((p, i) => (
                <Section key={i} style={{ marginBottom: "12px" }}>
                  <Text style={{ fontSize: "14px", fontWeight: "bold", margin: "0" }}>
                    {p.formato} — {p.titulo ?? ""}
                  </Text>
                  {p.gancho && (
                    <Text style={{ fontSize: "13px", margin: "2px 0" }}>📣 “{p.gancho}”</Text>
                  )}
                  {p.angulo_tipo && (
                    <Text style={{ fontSize: "12px", color: "#555", margin: "0" }}>
                      🎯 {p.angulo_tipo} — {p.angulo_descricao}
                    </Text>
                  )}
                </Section>
              ))}
            </>
          )}

          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button
              href={dashboardUrl}
              style={{ backgroundColor: "#111", color: "#fff", padding: "10px 20px", borderRadius: "6px" }}
            >
              Abrir no dashboard
            </Button>
          </Section>

          <Hr />
          <Text style={{ fontSize: "11px", color: "#999" }}>
            Você recebe este email porque ativou o canal de email no {BRAND.productName}.{" "}
            <Link href={`${dashboardUrl.replace(/\/dashboard$/, "")}/settings`}>Gerenciar preferências</Link> ·{" "}
            <Link href={unsubscribeUrl}>Cancelar emails</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderBriefingEmail(props: EmailProps): Promise<{ subject: string; html: string }> {
  const [, m = "", d = ""] = props.briefing.run_date.split("-");
  const subject = `📰 Briefing ${d}/${m} — ${props.briefing.n_must_read} must-read, ${props.briefing.n_relevante} relevantes`;
  const html = await render(<BriefingEmail {...props} />);
  return { subject, html };
}
