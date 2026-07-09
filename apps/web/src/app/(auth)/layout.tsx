import { BRAND } from "@briefing/config/brand";

/** Editorial Split: marca + manifesto à esquerda, formulário de vidro à direita. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center justify-center gap-12 px-4 py-16 md:flex-row md:gap-20 md:px-8">
      <div className="rise flex w-full flex-col gap-6 md:w-1/2">
        <span className="eyebrow w-max">{BRAND.tagline ?? "Curadoria diária com IA"}</span>
        <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
          {BRAND.productName}
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          O que importa do dia, curado pelo seu próprio universo de fontes —
          entregue às 7h, sem repetição, sem ruído.
        </p>
      </div>
      <div className="rise rise-2 w-full max-w-md md:w-1/2">{children}</div>
    </div>
  );
}
