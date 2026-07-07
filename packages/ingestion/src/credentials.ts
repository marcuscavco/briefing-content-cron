/**
 * Cifra de credenciais de fonte (ex.: URL de feed de assinante com token).
 * AES-256-GCM via WebCrypto; chave da plataforma em CREDENTIALS_ENCRYPTION_KEY
 * (32 bytes em base64, server-only). Formato: base64(iv || ciphertext).
 */

/** Cópia ArrayBuffer-backed (Buffer usa pool/ArrayBufferLike, que o WebCrypto tipa fora). */
function toBytes(base64: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(base64, "base64");
  const bytes = new Uint8Array(buf.byteLength);
  bytes.set(buf);
  return bytes;
}

function getKeyBytes(): Uint8Array<ArrayBuffer> {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("CREDENTIALS_ENCRYPTION_KEY não configurada");
  const bytes = toBytes(raw);
  if (bytes.length !== 32) throw new Error("CREDENTIALS_ENCRYPTION_KEY deve ter 32 bytes (base64)");
  return bytes;
}

async function importKey() {
  return crypto.subtle.importKey("raw", getKeyBytes(), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptCredential(plain: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  const out = new Uint8Array(iv.length + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), iv.length);
  return Buffer.from(out).toString("base64");
}

export async function decryptCredential(encoded: string): Promise<string> {
  const key = await importKey();
  const bytes = toBytes(encoded);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12) },
    key,
    bytes.slice(12),
  );
  return new TextDecoder().decode(plain);
}
