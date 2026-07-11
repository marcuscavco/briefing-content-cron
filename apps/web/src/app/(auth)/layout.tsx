/**
 * Auth: mesma casca do onboarding (tela cheia, coluna centrada), porque o
 * signup É o passo 1 do wizard. Cada página controla a própria largura.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col justify-center px-5 py-16 md:px-8">
      {children}
    </main>
  );
}
