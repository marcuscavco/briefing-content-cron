import type { WhatsappSender } from "./types";

/**
 * Z-API direto da Vercel (decisão da Fase 3: o Worker proxy existia só pela
 * allowlist do sandbox CCR; segue servindo o cron legado até a Fase 7).
 * REGRA PORTADA DO LEGADO: `phone` é enviado LITERAL — match exato, sem
 * normalização; grupos usam sufixo `-group`, nunca `@g.us`.
 */
export class ZapiClient implements WhatsappSender {
  constructor(
    private readonly instanceId = process.env.ZAPI_INSTANCE_ID,
    private readonly token = process.env.ZAPI_TOKEN,
    private readonly clientToken = process.env.ZAPI_CLIENT_TOKEN,
  ) {
    if (!this.instanceId || !this.token) {
      throw new Error("ZAPI_INSTANCE_ID/ZAPI_TOKEN não configurados");
    }
  }

  async sendText(phone: string, message: string): Promise<{ ok: boolean; response: unknown }> {
    const url = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.clientToken ? { "Client-Token": this.clientToken } : {}),
      },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.json().catch(() => ({ raw: "unparseable" }));
    return { ok: res.ok, response: body };
  }
}
