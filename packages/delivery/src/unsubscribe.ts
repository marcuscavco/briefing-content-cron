import { createHmac, timingSafeEqual } from "node:crypto";

/** Token de unsubscribe one-click: HMAC-SHA256 do profile_id com segredo da plataforma. */
export function unsubscribeToken(profileId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(profileId).digest("hex").slice(0, 32);
  return `${profileId}.${sig}`;
}

export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const [profileId, sig] = token.split(".");
  if (!profileId || !sig) return null;
  const expected = createHmac("sha256", secret).update(profileId).digest("hex").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return profileId;
}
