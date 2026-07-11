import { SignupFlow } from "./signup-flow";

/** Início do onboarding: boas-vindas → criar conta (passo 1 de 7). */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <SignupFlow hasError={Boolean(error)} />;
}
