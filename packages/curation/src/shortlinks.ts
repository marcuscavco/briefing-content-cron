import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Encurtador bnrd.me: cria códigos curtos para as URLs entregues no WhatsApp
 * (limite duro de 1500 chars — URLs de portal comem 100+ chars cada). O clique
 * é registrado pela rota /r/[code] (302 imediato, sem página visível).
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // sem 0/O/1/l/I
const CODE_LENGTH = 7;

export function generateShortCode(length = CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return code;
}

export interface ShortLinkInput {
  url: string;
  kind: "news" | "panel";
}

/**
 * Cria (ou reusa, na retomada pós-crash do estágio deliver) códigos para as
 * URLs de um briefing. Retorna mapa URL original → URL curta. Nunca lança:
 * link encurtado é otimização — em falha, a entrega segue com URLs longas.
 */
export async function createShortLinks(
  db: SupabaseClient,
  base: string,
  accountId: string,
  briefingId: string,
  inputs: ShortLinkInput[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Map(inputs.filter((i) => i.url).map((i) => [i.url, i])).values()];
  if (unique.length === 0) return map;

  try {
    // idempotência: retomada do estágio reusa os códigos já criados do briefing
    const { data: existing } = await db
      .from("short_links")
      .select("code, target_url")
      .eq("briefing_id", briefingId);
    for (const row of existing ?? []) {
      map.set(row.target_url, `${base}/${row.code}`);
    }

    const missing = unique.filter((i) => !map.has(i.url));
    for (const input of missing) {
      // colisão de código é ~impossível (58^7); 3 tentativas cobrem o azar
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateShortCode();
        const { error } = await db.from("short_links").insert({
          code,
          target_url: input.url,
          kind: input.kind,
          account_id: accountId,
          briefing_id: briefingId,
        });
        if (!error) {
          map.set(input.url, `${base}/${code}`);
          break;
        }
        if (error.code !== "23505") {
          console.error(`short_link ${input.url}: ${error.message}`);
          break;
        }
      }
    }
  } catch (e) {
    console.error(`createShortLinks: ${e}`);
  }
  return map;
}
