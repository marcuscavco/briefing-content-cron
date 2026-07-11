/**
 * Tipos do schema, gerados a partir do banco local:
 *   pnpm exec supabase gen types typescript --local > packages/db/src/types.gen.ts
 * Regenerar a cada migração nova. Este arquivo só reexporta + adiciona aliases.
 */
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from "./types.gen";
export { Constants } from "./types.gen";

import type { Enums } from "./types.gen";
export type MembershipRole = Enums<"membership_role">;
