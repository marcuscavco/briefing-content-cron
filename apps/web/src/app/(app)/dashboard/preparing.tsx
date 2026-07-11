"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Primeiro briefing sendo gerado: recarrega os dados a cada 15s até chegar. */
export function PreparingBriefing() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="bezel rise rise-3">
      <div className="bezel-core flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span className="size-6 animate-spin rounded-full border-2 border-amber-400/70 border-t-transparent" />
        <p className="font-display text-lg font-medium">Seu primeiro briefing está sendo preparado…</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Estamos lendo suas fontes, agrupando os assuntos e escrevendo o resumo. Leva uns 3-5
          minutos — esta página atualiza sozinha.
        </p>
      </div>
    </div>
  );
}
