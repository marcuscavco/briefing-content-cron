const STYLES: Record<string, string> = {
  ok: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  partial: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  blocked: "border-red-400/20 bg-red-400/10 text-red-300",
  error: "border-red-400/20 bg-red-400/10 text-red-300",
  pending: "border-white/10 bg-white/5 text-muted-foreground",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${STYLES[status] ?? STYLES.pending}`}
    >
      {label}
    </span>
  );
}

export function TierBadge({ tier }: { tier: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      Tier {tier}
    </span>
  );
}
