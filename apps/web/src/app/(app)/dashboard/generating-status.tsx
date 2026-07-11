"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Tarja de status quando há job de briefing na fila/rodando. Fica logo abaixo
 * do canal conectado e recarrega os dados a cada 15s até o briefing chegar.
 */
export function GeneratingStatus({ label }: { label: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <span className="size-4 shrink-0 animate-spin rounded-full border-[1.5px] border-amber-400/80 border-t-transparent" />
      <span className="font-medium text-amber-200">{label}</span>
    </div>
  );
}
