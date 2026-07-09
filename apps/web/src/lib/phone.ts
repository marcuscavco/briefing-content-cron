/**
 * Máscara de telefone brasileiro. O banco guarda o phone LITERAL da Z-API
 * (55 + DDD + número, ex.: 5585997993333) — a máscara é só apresentação.
 */

/** Dígitos nacionais (DDD+número) → "(85) 99799-3333" enquanto digita. */
export function maskBrInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Valor armazenado ("5585997993333") → "+55 (85) 99799-3333". */
export function formatBrPhone(stored: string): string {
  if (stored.endsWith("-group")) return stored; // JID de grupo (legado) — sem máscara
  let d = stored.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return stored;
  return `+55 ${maskBrInput(d)}`;
}
