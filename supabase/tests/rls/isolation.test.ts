import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminClient, anonClient, createUserWithSession } from "./helpers";

/**
 * Prova de aceite da Fase 0: RLS isola accounts entre si.
 * Roda contra o stack local (`supabase start`) com as migrações aplicadas.
 */

const runId = Math.random().toString(36).slice(2, 10);
const emailA = `rls-a-${runId}@test.local`;
const emailB = `rls-b-${runId}@test.local`;
const PASSWORD = "senha-de-teste-123";

let admin: SupabaseClient;
let userA: User;
let userB: User;
let clientA: SupabaseClient;
let clientB: SupabaseClient;
let accountA: { id: string; name: string };
let accountB: { id: string; name: string };

async function accountIdOf(user: User): Promise<string> {
  const { data, error } = await admin
    .from("memberships")
    .select("account_id")
    .eq("user_id", user.id)
    .single();
  if (error) throw new Error(`membership de ${user.email} não encontrada: ${error.message}`);
  return data.account_id as string;
}

beforeAll(async () => {
  admin = adminClient();

  ({ user: userA, client: clientA } = await createUserWithSession(
    admin,
    emailA,
    PASSWORD,
    "Usuária A",
  ));
  ({ user: userB, client: clientB } = await createUserWithSession(admin, emailB, PASSWORD));

  const idA = await accountIdOf(userA);
  const idB = await accountIdOf(userB);

  const { data: accounts, error } = await admin
    .from("accounts")
    .select("id, name")
    .in("id", [idA, idB]);
  if (error || !accounts || accounts.length !== 2) {
    throw new Error(`accounts não criadas pelo trigger: ${error?.message}`);
  }
  accountA = accounts.find((a) => a.id === idA)!;
  accountB = accounts.find((a) => a.id === idB)!;
});

afterAll(async () => {
  // Apaga os usuários; accounts caem via trigger? Não — só memberships (FK cascade).
  // Accounts órfãs de teste são inofensivas no stack local, mas limpamos mesmo assim.
  for (const u of [userA, userB]) {
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
  for (const acc of [accountA, accountB]) {
    if (acc) await admin.from("accounts").delete().eq("id", acc.id);
  }
});

describe("signup trigger", () => {
  it("cria account + membership owner automaticamente", async () => {
    expect(accountA.id).not.toEqual(accountB.id);
    // Nome da account vem do full_name quando presente, senão do prefixo do email.
    expect(accountA.name).toBe("Usuária A");
    expect(accountB.name).toBe(emailB.split("@")[0]);

    const { data: membership } = await admin
      .from("memberships")
      .select("role")
      .eq("user_id", userA.id)
      .single();
    expect(membership?.role).toBe("owner");
  });
});

describe("isolamento entre accounts (RLS)", () => {
  it("cada usuário vê exatamente a própria account", async () => {
    const { data: aSees, error: errA } = await clientA.from("accounts").select("id, name");
    expect(errA).toBeNull();
    expect(aSees?.map((a) => a.id)).toEqual([accountA.id]);

    const { data: bSees } = await clientB.from("accounts").select("id, name");
    expect(bSees?.map((a) => a.id)).toEqual([accountB.id]);
  });

  it("select direto na account do outro retorna 0 linhas (filtrado, não erro)", async () => {
    const { data, error } = await clientA.from("accounts").select().eq("id", accountB.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("update na account do outro não afeta linhas", async () => {
    const { data, error } = await clientA
      .from("accounts")
      .update({ name: "hacked" })
      .eq("id", accountB.id)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: check } = await admin
      .from("accounts")
      .select("name")
      .eq("id", accountB.id)
      .single();
    expect(check?.name).toBe(accountB.name);
  });

  it("owner consegue renomear a própria account", async () => {
    const { data, error } = await clientA
      .from("accounts")
      .update({ name: "Workspace da A" })
      .eq("id", accountA.id)
      .select();
    expect(error).toBeNull();
    expect(data?.[0]?.name).toBe("Workspace da A");
  });

  it("não dá para se inserir na account do outro", async () => {
    const { data, error } = await clientA
      .from("memberships")
      .insert({ account_id: accountB.id, user_id: userA.id, role: "owner" })
      .select();
    // Sem policy de INSERT em memberships: RLS nega.
    expect(error).not.toBeNull();
    expect(data).toBeNull();

    const { data: check } = await admin
      .from("memberships")
      .select("user_id")
      .eq("account_id", accountB.id);
    expect(check?.map((m) => m.user_id)).toEqual([userB.id]);
  });

  it("memberships visíveis são só as da própria account", async () => {
    const { data } = await clientA.from("memberships").select("account_id, user_id");
    expect(data).toHaveLength(1);
    expect(data?.[0]?.account_id).toBe(accountA.id);
  });
});

describe("client anônimo e tabelas de plataforma", () => {
  it("anon não tem acesso algum (permission denied, sem grant)", async () => {
    const anon = anonClient();
    const { data: accounts, error: errAccounts } = await anon.from("accounts").select();
    expect(errAccounts).not.toBeNull();
    expect(accounts).toBeNull();

    const { data: memberships, error: errMemberships } = await anon.from("memberships").select();
    expect(errMemberships).not.toBeNull();
    expect(memberships).toBeNull();
  });

  it("platform_admins e app_config são inacessíveis para usuários autenticados", async () => {
    // Sem grant para authenticated: negado antes mesmo de RLS.
    const { data: admins, error: errAdmins } = await clientA.from("platform_admins").select();
    expect(errAdmins).not.toBeNull();
    expect(admins).toBeNull();

    const { data: config, error: errConfig } = await clientA.from("app_config").select();
    expect(errConfig).not.toBeNull();
    expect(config).toBeNull();

    const { error: writeError } = await clientA
      .from("app_config")
      .insert({ key: `hack-${runId}`, value: {} });
    expect(writeError).not.toBeNull();
  });

  it("service role acessa tabelas de plataforma (rotas server)", async () => {
    const { error } = await admin.from("app_config").select().limit(1);
    expect(error).toBeNull();
  });
});
