import { cn } from "@/lib/utils";

/**
 * "Button-in-button" (skill high-end): a seta de um CTA nunca fica solta —
 * vive num círculo próprio que desliza na diagonal no hover do grupo.
 */
export function ArrowBubble({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/button:-translate-y-[1px] group-hover/button:translate-x-1 group-hover/button:scale-105 group-hover:-translate-y-[1px] group-hover:translate-x-1",
        dark ? "bg-black/10 text-primary-foreground" : "bg-white/10 text-foreground",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17L17 7M17 7H8M17 7v9" />
      </svg>
    </span>
  );
}
