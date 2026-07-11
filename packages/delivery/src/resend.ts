import { Resend } from "resend";
import type { EmailSender } from "./types";

export class ResendEmailSender implements EmailSender {
  private client: Resend;
  private from: string;

  constructor(apiKey = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM) {
    if (!apiKey) throw new Error("RESEND_API_KEY não configurada");
    this.client = new Resend(apiKey);
    // Sem domínio verificado, o Resend só entrega de onboarding@resend.dev
    // (e apenas para o email da conta Resend) — bom para teste.
    this.from = from ?? "onboarding@resend.dev";
  }

  async send(to: string, subject: string, html: string): Promise<{ ok: boolean; response: unknown }> {
    const { data, error } = await this.client.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });
    return { ok: !error, response: error ?? data };
  }
}
